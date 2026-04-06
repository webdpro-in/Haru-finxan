/**
 * Lesson Plan Generator Service
 * Task 23.2: Implement classroom context analysis
 * 
 * REQ-4.3.1: System SHALL generate lesson plans using Gemini API
 * REQ-4.3.2: System SHALL include: objectives, prerequisites, activities, assessments, differentiation
 * REQ-4.3.3: System SHALL consider classroom average mastery
 */

import { supabase } from '../config/supabase.js';

/**
 * Classroom context for lesson plan generation
 */
export interface ClassroomContext {
  classroomId: string;
  averageMastery: number;
  masteryDistribution: {
    low: number;      // 0-40%
    medium: number;   // 41-70%
    high: number;     // 71-100%
  };
  weakConcepts: Array<{
    conceptName: string;
    averageMastery: number;
    studentCount: number;
  }>;
  strongConcepts: Array<{
    conceptName: string;
    averageMastery: number;
    studentCount: number;
  }>;
  studentsNeedingDifferentiation: Array<{
    studentId: string;
    studentName: string;
    reason: 'struggling' | 'advanced';
    masteryLevel: number;
  }>;
  totalStudents: number;
  activeStudents: number;
}

/**
 * Analyzes classroom context to inform lesson plan generation
 * 
 * @param classroomId - The classroom to analyze
 * @returns Structured context for lesson plan generation
 */
export async function analyzeClassroomContext(
  classroomId: string
): Promise<ClassroomContext> {
  // Step 1: Query classroom data (students, mastery levels)
  const { data: students, error: studentsError } = await supabase
    .from('students')
    .select('student_id, name, last_active_at')
    .eq('classroom_id', classroomId)
    .is('deleted_at', null);

  if (studentsError) {
    throw new Error(`Failed to fetch students: ${studentsError.message}`);
  }

  if (!students || students.length === 0) {
    // Return empty context for empty classroom
    return {
      classroomId,
      averageMastery: 0,
      masteryDistribution: { low: 0, medium: 0, high: 0 },
      weakConcepts: [],
      strongConcepts: [],
      studentsNeedingDifferentiation: [],
      totalStudents: 0,
      activeStudents: 0
    };
  }

  const studentIds = students.map(s => s.student_id);

  // Step 2: Query mastery levels for all students
  const { data: masteries, error: masteriesError } = await supabase
    .from('concept_masteries')
    .select('student_id, concept_id, concept_name, mastery_level')
    .in('student_id', studentIds);

  if (masteriesError) {
    throw new Error(`Failed to fetch masteries: ${masteriesError.message}`);
  }

  // Step 3: Calculate classroom statistics
  const stats = calculateClassroomStatistics(students, masteries || []);

  // Step 4: Identify students needing differentiation
  const studentsNeedingDiff = identifyDifferentiationNeeds(
    students,
    masteries || [],
    stats.averageMastery
  );

  return {
    classroomId,
    averageMastery: stats.averageMastery,
    masteryDistribution: stats.masteryDistribution,
    weakConcepts: stats.weakConcepts,
    strongConcepts: stats.strongConcepts,
    studentsNeedingDifferentiation: studentsNeedingDiff,
    totalStudents: students.length,
    activeStudents: stats.activeStudents
  };
}

/**
 * Calculate classroom statistics from student mastery data
 */
function calculateClassroomStatistics(
  students: any[],
  masteries: any[]
): {
  averageMastery: number;
  masteryDistribution: { low: number; medium: number; high: number };
  weakConcepts: Array<{ conceptName: string; averageMastery: number; studentCount: number }>;
  strongConcepts: Array<{ conceptName: string; averageMastery: number; studentCount: number }>;
  activeStudents: number;
} {
  // Calculate average mastery across all students and concepts
  const totalMastery = masteries.reduce((sum, m) => sum + (m.mastery_level || 0), 0);
  const averageMastery = masteries.length > 0 ? totalMastery / masteries.length : 0;

  // Calculate mastery distribution
  const distribution = { low: 0, medium: 0, high: 0 };
  masteries.forEach(m => {
    const level = m.mastery_level || 0;
    if (level <= 40) distribution.low++;
    else if (level <= 70) distribution.medium++;
    else distribution.high++;
  });

  // Group masteries by concept
  const conceptMap = new Map<string, { total: number; count: number; name: string }>();
  masteries.forEach(m => {
    const existing = conceptMap.get(m.concept_id) || { total: 0, count: 0, name: m.concept_name };
    existing.total += m.mastery_level || 0;
    existing.count++;
    conceptMap.set(m.concept_id, existing);
  });

  // Calculate average mastery per concept
  const conceptAverages = Array.from(conceptMap.entries()).map(([conceptId, data]) => ({
    conceptId,
    conceptName: data.name,
    averageMastery: data.total / data.count,
    studentCount: data.count
  }));

  // Sort by average mastery
  conceptAverages.sort((a, b) => a.averageMastery - b.averageMastery);

  // Identify weak concepts (bottom 5, mastery < 60%)
  const weakConcepts = conceptAverages
    .filter(c => c.averageMastery < 60)
    .slice(0, 5)
    .map(c => ({
      conceptName: c.conceptName,
      averageMastery: Math.round(c.averageMastery),
      studentCount: c.studentCount
    }));

  // Identify strong concepts (top 5, mastery >= 75%)
  const strongConcepts = conceptAverages
    .filter(c => c.averageMastery >= 75)
    .slice(-5)
    .reverse()
    .map(c => ({
      conceptName: c.conceptName,
      averageMastery: Math.round(c.averageMastery),
      studentCount: c.studentCount
    }));

  // Count active students (active in last 7 days)
  const sevenDaysAgo = new Date();
  sevenDaysAgo.setDate(sevenDaysAgo.getDate() - 7);
  const activeStudents = students.filter(s => {
    const lastActive = s.last_active_at ? new Date(s.last_active_at) : null;
    return lastActive && lastActive > sevenDaysAgo;
  }).length;

  return {
    averageMastery: Math.round(averageMastery),
    masteryDistribution: distribution,
    weakConcepts,
    strongConcepts,
    activeStudents
  };
}

/**
 * Identify students needing differentiation (struggling or advanced)
 */
function identifyDifferentiationNeeds(
  students: any[],
  masteries: any[],
  classroomAverage: number
): Array<{
  studentId: string;
  studentName: string;
  reason: 'struggling' | 'advanced';
  masteryLevel: number;
}> {
  // Calculate average mastery per student
  const studentMasteryMap = new Map<string, { total: number; count: number; name: string }>();
  
  masteries.forEach(m => {
    const existing = studentMasteryMap.get(m.student_id) || { 
      total: 0, 
      count: 0, 
      name: students.find(s => s.student_id === m.student_id)?.name || 'Unknown'
    };
    existing.total += m.mastery_level || 0;
    existing.count++;
    studentMasteryMap.set(m.student_id, existing);
  });

  const studentsNeedingDiff: Array<{
    studentId: string;
    studentName: string;
    reason: 'struggling' | 'advanced';
    masteryLevel: number;
  }> = [];

  // Identify students significantly below or above classroom average
  const threshold = 15; // 15% difference from average

  studentMasteryMap.forEach((data, studentId) => {
    const avgMastery = data.count > 0 ? data.total / data.count : 0;
    
    if (avgMastery < classroomAverage - threshold) {
      // Student is struggling
      studentsNeedingDiff.push({
        studentId,
        studentName: data.name,
        reason: 'struggling',
        masteryLevel: Math.round(avgMastery)
      });
    } else if (avgMastery > classroomAverage + threshold) {
      // Student is advanced
      studentsNeedingDiff.push({
        studentId,
        studentName: data.name,
        reason: 'advanced',
        masteryLevel: Math.round(avgMastery)
      });
    }
  });

  // Sort by mastery level (struggling first, then advanced)
  studentsNeedingDiff.sort((a, b) => {
    if (a.reason === b.reason) {
      return a.reason === 'struggling' 
        ? a.masteryLevel - b.masteryLevel  // Lowest first for struggling
        : b.masteryLevel - a.masteryLevel; // Highest first for advanced
    }
    return a.reason === 'struggling' ? -1 : 1;
  });

  return studentsNeedingDiff;
}

/**
 * Lesson plan structure
 * REQ-4.3.2: System SHALL include: objectives, prerequisites, activities, assessments, differentiation
 */
export interface LessonPlan {
  lessonId: string;
  title: string;
  subject: string;
  grade: number;
  duration: number;
  objectives: string[];
  prerequisites: string[];
  activities: LessonActivity[];
  assessments: Assessment[];
  differentiation: DifferentiationStrategy;
  generatedBy: 'ai' | 'teacher';
  teacherApproved: boolean;
  classroomId: string;
  createdAt: Date;
}

export interface LessonActivity {
  activityId: string;
  type: 'lecture' | 'discussion' | 'practice' | 'assessment' | 'group_work';
  duration: number; // minutes
  description: string;
  materials: string[];
}

export interface Assessment {
  assessmentId: string;
  type: 'formative' | 'summative' | 'quiz' | 'project';
  description: string;
  rubric?: string;
}

export interface DifferentiationStrategy {
  forStruggling: string[];
  forAdvanced: string[];
  generalStrategies: string[];
}

/**
 * Generate lesson plan prompt for Gemini API
 * Task 23.1: Implement lesson plan prompt generation
 * REQ-4.3.1: System SHALL generate lesson plans using Gemini API
 * REQ-4.3.3: System SHALL consider classroom average mastery
 * REQ-4.3.4: System SHALL provide timing breakdown for activities
 */
export function generateLessonPlanPrompt(
  subject: string,
  topic: string,
  duration: number,
  grade: number,
  context: ClassroomContext
): string {
  const weakConceptsList = context.weakConcepts.length > 0
    ? context.weakConcepts.map(c => `${c.conceptName} (${c.averageMastery}%)`).join(', ')
    : 'None identified';

  const strongConceptsList = context.strongConcepts.length > 0
    ? context.strongConcepts.map(c => `${c.conceptName} (${c.averageMastery}%)`).join(', ')
    : 'None identified';

  const strugglingStudents = context.studentsNeedingDifferentiation
    .filter(s => s.reason === 'struggling').length;
  
  const advancedStudents = context.studentsNeedingDifferentiation
    .filter(s => s.reason === 'advanced').length;

  return `You are an expert educator creating a detailed lesson plan. Generate a comprehensive lesson plan with the following specifications:

**Subject:** ${subject}
**Topic:** ${topic}
**Grade Level:** ${grade}
**Duration:** ${duration} minutes
**Class Size:** ${context.totalStudents} students (${context.activeStudents} active)

**Classroom Context:**
- Average Mastery Level: ${context.averageMastery}%
- Mastery Distribution: ${context.masteryDistribution.low} low (0-40%), ${context.masteryDistribution.medium} medium (41-70%), ${context.masteryDistribution.high} high (71-100%)
- Weak Concepts: ${weakConceptsList}
- Strong Concepts: ${strongConceptsList}
- Students Needing Support: ${strugglingStudents} struggling, ${advancedStudents} advanced

**Required Components:**

1. **Title:** Create an engaging lesson title

2. **Learning Objectives:** List 3-5 specific, measurable learning objectives (use Bloom's taxonomy)

3. **Prerequisites:** List prerequisite concepts students should know before this lesson

4. **Activities:** Design ${Math.floor(duration / 15)} to ${Math.ceil(duration / 10)} activities with:
   - Activity type (lecture, discussion, practice, assessment, group_work)
   - Duration in minutes (must sum to ${duration} minutes total)
   - Detailed description
   - Required materials

5. **Assessments:** Include 2-3 assessment methods:
   - Type (formative, summative, quiz, project)
   - Description
   - Optional rubric

6. **Differentiation Strategies:**
   - Specific strategies for struggling students (${strugglingStudents} students)
   - Specific strategies for advanced students (${advancedStudents} students)
   - General inclusive teaching strategies

**Important Guidelines:**
- Consider the classroom's average mastery of ${context.averageMastery}% when setting difficulty
- Address weak concepts: ${weakConceptsList}
- Build on strong concepts: ${strongConceptsList}
- Ensure activities total exactly ${duration} minutes
- Make it practical and immediately usable by a teacher
- Use age-appropriate language and examples for grade ${grade}

**Output Format:** Return ONLY a valid JSON object with this exact structure:
{
  "title": "string",
  "objectives": ["string", "string", ...],
  "prerequisites": ["string", "string", ...],
  "activities": [
    {
      "type": "lecture|discussion|practice|assessment|group_work",
      "duration": number,
      "description": "string",
      "materials": ["string", ...]
    }
  ],
  "assessments": [
    {
      "type": "formative|summative|quiz|project",
      "description": "string",
      "rubric": "string (optional)"
    }
  ],
  "differentiation": {
    "forStruggling": ["string", ...],
    "forAdvanced": ["string", ...],
    "generalStrategies": ["string", ...]
  }
}`;
}

/**
 * Generate lesson plan using Gemini API
 * Task 23.3: Implement POST /api/teacher/lesson-plan/generate endpoint
 * REQ-4.3.1: System SHALL generate lesson plans using Gemini API
 * REQ-4.3.5: System SHALL require teacher approval before use
 */
export async function generateLessonPlan(
  classroomId: string,
  subject: string,
  topic: string,
  duration: number,
  grade: number
): Promise<LessonPlan> {
  // Step 1: Analyze classroom context
  const context = await analyzeClassroomContext(classroomId);

  // Step 2: Generate prompt
  const prompt = generateLessonPlanPrompt(subject, topic, duration, grade, context);

  // Step 3: Call Gemini API
  const { GeminiClient } = await import('./GeminiClient.js');
  const gemini = new GeminiClient({
    apiKey: process.env.GEMINI_API_KEY || '',
    model: 'gemini-1.5-flash',
    maxRetries: 3
  });

  const response = await gemini.generateResponse(
    prompt,
    'You are an expert educator. Generate lesson plans in valid JSON format only.',
    []
  );

  // Step 4: Parse response
  let lessonPlanData: any;
  try {
    // Extract JSON from response (handle markdown code blocks)
    let jsonText = response.text.trim();
    if (jsonText.startsWith('```json')) {
      jsonText = jsonText.replace(/```json\n?/g, '').replace(/```\n?$/g, '');
    } else if (jsonText.startsWith('```')) {
      jsonText = jsonText.replace(/```\n?/g, '').replace(/```\n?$/g, '');
    }
    lessonPlanData = JSON.parse(jsonText);
  } catch (error) {
    throw new Error(`Failed to parse lesson plan JSON: ${error instanceof Error ? error.message : 'Unknown error'}`);
  }

  // Step 5: Validate and structure the lesson plan
  if (!lessonPlanData.title || !lessonPlanData.objectives || !lessonPlanData.activities) {
    throw new Error('Invalid lesson plan structure: missing required fields');
  }

  // Generate unique IDs for activities and assessments
  const { randomUUID } = await import('crypto');
  const activities: LessonActivity[] = lessonPlanData.activities.map((a: any) => ({
    activityId: randomUUID(),
    type: a.type || 'lecture',
    duration: a.duration || 0,
    description: a.description || '',
    materials: a.materials || []
  }));

  const assessments: Assessment[] = (lessonPlanData.assessments || []).map((a: any) => ({
    assessmentId: randomUUID(),
    type: a.type || 'formative',
    description: a.description || '',
    rubric: a.rubric
  }));

  const differentiation: DifferentiationStrategy = {
    forStruggling: lessonPlanData.differentiation?.forStruggling || [],
    forAdvanced: lessonPlanData.differentiation?.forAdvanced || [],
    generalStrategies: lessonPlanData.differentiation?.generalStrategies || []
  };

  // Step 6: Store in database
  const lessonId = randomUUID();
  const { error } = await supabase
    .from('lesson_plans')
    .insert({
      lesson_id: lessonId,
      title: lessonPlanData.title,
      subject,
      grade,
      duration,
      objectives: lessonPlanData.objectives,
      prerequisites: lessonPlanData.prerequisites || [],
      activities: activities,
      assessments: assessments,
      generated_by: 'ai',
      teacher_approved: false,
      classroom_id: classroomId
    });

  if (error) {
    throw new Error(`Failed to store lesson plan: ${error.message}`);
  }

  // Step 7: Return complete lesson plan
  return {
    lessonId,
    title: lessonPlanData.title,
    subject,
    grade,
    duration,
    objectives: lessonPlanData.objectives,
    prerequisites: lessonPlanData.prerequisites || [],
    activities,
    assessments,
    differentiation,
    generatedBy: 'ai',
    teacherApproved: false,
    classroomId,
    createdAt: new Date()
  };
}

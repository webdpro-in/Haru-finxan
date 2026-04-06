/**
 * Parent Voice Bridge Service
 * Generates daily reports and mood summaries for parents
 * REQ-6.1.1, REQ-6.1.2, REQ-6.1.3, REQ-6.1.4
 */

import { supabase } from '../config/supabase.js';

export interface DailyReport {
  date: Date;
  studentId: string;
  sessionsCompleted: number;
  totalLearningTime: number; // in seconds
  topicsCovered: string[];
  masteryGained: Record<string, number>;
  confusionEvents: number;
  moodSummary: string;
  teacherNotes?: string;
}

export interface WeeklyProgress {
  weekStart: Date;
  weekEnd: Date;
  totalSessions: number;
  totalTime: number; // in seconds
  conceptsMastered: number;
  averageMood: number; // 1-5 scale
  streakMaintained: boolean;
}

export interface ChildSummary {
  studentId: string;
  name: string;
  grade: number;
  currentStreak: number;
  weeklyProgress: WeeklyProgress;
  recentAchievements: Achievement[];
  areasOfConcern: string[];
}

export interface Achievement {
  achievementId: string;
  title: string;
  description: string;
  earnedAt: Date;
  icon: string;
}

export interface ParentDashboard {
  parentId: string;
  children: ChildSummary[];
  dailyReports: DailyReport[];
  whatsappEnabled: boolean;
}

/**
 * Generate daily report for a student
 * REQ-6.1.1: System SHALL generate daily reports for each child
 * REQ-6.1.2: System SHALL aggregate session data: duration, topics, mastery gains
 */
export async function generateDailyReport(
  studentId: string,
  date: Date
): Promise<DailyReport> {
  // Set date boundaries for the day
  const startOfDay = new Date(date);
  startOfDay.setHours(0, 0, 0, 0);
  
  const endOfDay = new Date(date);
  endOfDay.setHours(23, 59, 59, 999);

  // Get all sessions for the day
  const { data: sessions, error: sessionsError } = await supabase
    .from('sessions')
    .select('*')
    .eq('student_id', studentId)
    .gte('started_at', startOfDay.toISOString())
    .lte('started_at', endOfDay.toISOString());

  if (sessionsError) {
    throw new Error(`Failed to fetch sessions: ${sessionsError.message}`);
  }

  const sessionsData = sessions || [];

  // Aggregate session data
  const totalLearningTime = sessionsData.reduce((sum, s) => sum + (s.duration || 0), 0);
  const topicsCovered = [...new Set(sessionsData.flatMap(s => s.topics_covered || []))];
  const confusionEvents = sessionsData.reduce((sum, s) => sum + (s.confusion_count || 0), 0);

  // Calculate mastery gains
  const masteryGained: Record<string, number> = {};
  for (const session of sessionsData) {
    const gains = session.mastery_gained || {};
    for (const [concept, gain] of Object.entries(gains)) {
      masteryGained[concept] = (masteryGained[concept] || 0) + (gain as number);
    }
  }

  // Get mood summary
  const moodSummary = await getMoodSummary(studentId, date);

  // Get teacher notes (if available)
  const teacherNotes = await getTeacherNotes(studentId, date);

  return {
    date,
    studentId,
    sessionsCompleted: sessionsData.length,
    totalLearningTime,
    topicsCovered,
    masteryGained,
    confusionEvents,
    moodSummary,
    teacherNotes
  };
}

/**
 * Get mood summary for a student on a specific date
 * REQ-6.1.3: System SHALL summarize mood check-ins
 */
export async function getMoodSummary(studentId: string, date: Date): Promise<string> {
  const startOfDay = new Date(date);
  startOfDay.setHours(0, 0, 0, 0);
  
  const endOfDay = new Date(date);
  endOfDay.setHours(23, 59, 59, 999);

  const { data: moods, error } = await supabase
    .from('mood_checkins')
    .select('mood, energy_level')
    .eq('student_id', studentId)
    .gte('timestamp', startOfDay.toISOString())
    .lte('timestamp', endOfDay.toISOString());

  if (error) {
    throw new Error(`Failed to fetch mood check-ins: ${error.message}`);
  }

  if (!moods || moods.length === 0) {
    return 'No mood check-ins today';
  }

  // Count mood occurrences
  const moodCounts: Record<string, number> = {};
  let totalEnergy = 0;

  for (const mood of moods) {
    moodCounts[mood.mood] = (moodCounts[mood.mood] || 0) + 1;
    totalEnergy += mood.energy_level || 3;
  }

  // Find dominant mood
  const sortedMoods = Object.entries(moodCounts).sort((a, b) => b[1] - a[1]);
  const dominantMood = sortedMoods[0][0];
  const avgEnergy = (totalEnergy / moods.length).toFixed(1);

  return `Mostly ${dominantMood} (energy: ${avgEnergy}/5)`;
}

/**
 * Get teacher notes for a student on a specific date
 * REQ-6.1.4: System SHALL include teacher notes when available
 */
async function getTeacherNotes(studentId: string, date: Date): Promise<string | undefined> {
  const startOfDay = new Date(date);
  startOfDay.setHours(0, 0, 0, 0);
  
  const endOfDay = new Date(date);
  endOfDay.setHours(23, 59, 59, 999);

  // Check student_insights table for teacher notes
  const { data: insights, error } = await supabase
    .from('student_insights')
    .select('finding, recommendation')
    .eq('student_id', studentId)
    .gte('generated_at', startOfDay.toISOString())
    .lte('generated_at', endOfDay.toISOString())
    .order('generated_at', { ascending: false })
    .limit(1);

  if (error || !insights || insights.length === 0) {
    return undefined;
  }

  const insight = insights[0];
  return `${insight.finding} - ${insight.recommendation}`;
}

/**
 * Generate weekly progress summary
 * REQ-6.1.6: System SHALL provide parent dashboard with weekly progress
 */
export async function generateWeeklyProgress(
  studentId: string,
  weekStart: Date
): Promise<WeeklyProgress> {
  const weekEnd = new Date(weekStart);
  weekEnd.setDate(weekEnd.getDate() + 6);
  weekEnd.setHours(23, 59, 59, 999);

  // Get all sessions for the week
  const { data: sessions, error: sessionsError } = await supabase
    .from('sessions')
    .select('*')
    .eq('student_id', studentId)
    .gte('started_at', weekStart.toISOString())
    .lte('started_at', weekEnd.toISOString());

  if (sessionsError) {
    throw new Error(`Failed to fetch weekly sessions: ${sessionsError.message}`);
  }

  const sessionsData = sessions || [];
  const totalTime = sessionsData.reduce((sum, s) => sum + (s.duration || 0), 0);

  // Count concepts mastered (mastery >= 80)
  const { data: masteries, error: masteriesError } = await supabase
    .from('concept_masteries')
    .select('mastery_level')
    .eq('student_id', studentId)
    .gte('mastery_level', 80)
    .gte('last_practiced', weekStart.toISOString())
    .lte('last_practiced', weekEnd.toISOString());

  if (masteriesError) {
    throw new Error(`Failed to fetch masteries: ${masteriesError.message}`);
  }

  const conceptsMastered = masteries?.length || 0;

  // Get mood data for the week
  const { data: moods, error: moodsError } = await supabase
    .from('mood_checkins')
    .select('energy_level')
    .eq('student_id', studentId)
    .gte('timestamp', weekStart.toISOString())
    .lte('timestamp', weekEnd.toISOString());

  if (moodsError) {
    throw new Error(`Failed to fetch weekly moods: ${moodsError.message}`);
  }

  const moodsData = moods || [];
  const averageMood = moodsData.length > 0
    ? moodsData.reduce((sum, m) => sum + (m.energy_level || 3), 0) / moodsData.length
    : 3;

  // Check streak maintenance
  const { data: student, error: studentError } = await supabase
    .from('students')
    .select('streak_days')
    .eq('student_id', studentId)
    .single();

  if (studentError) {
    throw new Error(`Failed to fetch student: ${studentError.message}`);
  }

  const streakMaintained = (student?.streak_days || 0) >= 7;

  return {
    weekStart,
    weekEnd,
    totalSessions: sessionsData.length,
    totalTime,
    conceptsMastered,
    averageMood,
    streakMaintained
  };
}

/**
 * Get parent dashboard data
 * REQ-6.1.6: System SHALL provide parent dashboard with weekly progress
 */
export async function getParentDashboard(parentId: string): Promise<ParentDashboard> {
  // Get parent info
  const { data: parent, error: parentError } = await supabase
    .from('parents')
    .select('whatsapp_enabled')
    .eq('parent_id', parentId)
    .single();

  if (parentError) {
    throw new Error(`Failed to fetch parent: ${parentError.message}`);
  }

  // Get children
  const { data: students, error: studentsError } = await supabase
    .from('students')
    .select('student_id, name, grade, streak_days')
    .eq('parent_id', parentId);

  if (studentsError) {
    throw new Error(`Failed to fetch students: ${studentsError.message}`);
  }

  const studentsData = students || [];

  // Build child summaries
  const children: ChildSummary[] = [];
  const dailyReports: DailyReport[] = [];
  const today = new Date();
  const weekStart = new Date(today);
  weekStart.setDate(today.getDate() - today.getDay()); // Start of week (Sunday)

  for (const student of studentsData) {
    const weeklyProgress = await generateWeeklyProgress(student.student_id, weekStart);
    const dailyReport = await generateDailyReport(student.student_id, today);
    
    dailyReports.push(dailyReport);

    // Identify areas of concern
    const areasOfConcern: string[] = [];
    if (dailyReport.confusionEvents > 3) {
      areasOfConcern.push('High confusion detected');
    }
    if (weeklyProgress.totalSessions < 3) {
      areasOfConcern.push('Low engagement this week');
    }
    if (weeklyProgress.averageMood < 2.5) {
      areasOfConcern.push('Low energy levels');
    }

    // Generate achievements (simplified for now)
    const recentAchievements: Achievement[] = [];
    if (student.streak_days >= 7) {
      recentAchievements.push({
        achievementId: `streak-${student.student_id}`,
        title: '7-Day Streak',
        description: 'Maintained learning streak for a week!',
        earnedAt: today,
        icon: '🔥'
      });
    }
    if (weeklyProgress.conceptsMastered >= 5) {
      recentAchievements.push({
        achievementId: `mastery-${student.student_id}`,
        title: 'Concept Master',
        description: `Mastered ${weeklyProgress.conceptsMastered} concepts this week!`,
        earnedAt: today,
        icon: '⭐'
      });
    }

    children.push({
      studentId: student.student_id,
      name: student.name,
      grade: student.grade,
      currentStreak: student.streak_days,
      weeklyProgress,
      recentAchievements,
      areasOfConcern
    });
  }

  return {
    parentId,
    children,
    dailyReports,
    whatsappEnabled: parent?.whatsapp_enabled || false
  };
}

/**
 * Example usage of Anonymous Mode utilities
 * 
 * This file demonstrates how to use the student ID hashing functions
 * for implementing anonymous question submission.
 * 
 * Task 16.1: Implement student ID hashing
 */

import { hashStudentId, verifyStudentIdHash, createAnonymousIdentifier } from './anonymousMode';

// ============================================================================
// EXAMPLE 1: Anonymous Question Submission
// ============================================================================

function submitAnonymousQuestion(studentId: string, question: string, classroomId: string) {
  // Hash the student ID for storage (one-way, cannot be reversed)
  const studentIdHash = hashStudentId(studentId);
  
  // Create a display identifier for the UI
  const displayId = createAnonymousIdentifier(studentId);
  
  // Store in database
  const anonymousQuestion = {
    questionId: 'generated-uuid',
    studentIdHash, // Store hash, not actual ID
    classroomId,
    question,
    displayId, // For UI display (e.g., "anon-a3f2b1c4")
    timestamp: new Date(),
    answered: false,
  };
  
  console.log('Anonymous question submitted:');
  console.log('Display ID:', displayId); // Teacher sees: "anon-a3f2b1c4"
  console.log('Hash:', studentIdHash); // Stored for analytics
  console.log('Original student ID is NOT stored or revealed');
  
  return anonymousQuestion;
}

// ============================================================================
// EXAMPLE 2: Analytics Without Revealing Identity
// ============================================================================

function analyzeAnonymousQuestions(questions: any[], studentId: string) {
  // Count how many anonymous questions this student has asked
  // without revealing their identity to the teacher
  
  const studentHash = hashStudentId(studentId);
  
  const studentQuestionCount = questions.filter(q => 
    q.studentIdHash === studentHash
  ).length;
  
  console.log(`Student has asked ${studentQuestionCount} anonymous questions`);
  console.log('Teacher cannot see which questions belong to which student');
  
  return studentQuestionCount;
}

// ============================================================================
// EXAMPLE 3: Verification for Internal Systems
// ============================================================================

function verifyAnonymousQuestionOwnership(
  questionHash: string,
  claimedStudentId: string
): boolean {
  // Verify if a student owns an anonymous question
  // Useful for internal systems, not exposed to teachers
  
  const isOwner = verifyStudentIdHash(claimedStudentId, questionHash);
  
  if (isOwner) {
    console.log('Student owns this anonymous question');
  } else {
    console.log('Student does not own this anonymous question');
  }
  
  return isOwner;
}

// ============================================================================
// EXAMPLE 4: Teacher Dashboard Display
// ============================================================================

function displayAnonymousQuestionsForTeacher(questions: any[]) {
  // Teacher sees anonymous questions with display IDs
  // Cannot determine which student asked which question
  
  console.log('Anonymous Questions:');
  questions.forEach(q => {
    console.log(`- ${q.displayId}: ${q.question}`);
    // Output: "- anon-a3f2b1c4: Can you explain photosynthesis?"
    // Teacher cannot identify the student
  });
}

// ============================================================================
// EXAMPLE 5: Classroom Analytics
// ============================================================================

function generateClassroomAnonymousStats(classroomId: string, questions: any[]) {
  // Generate statistics without revealing individual identities
  
  const anonymousQuestions = questions.filter(q => q.classroomId === classroomId);
  
  // Count unique students (using hashes)
  const uniqueStudentHashes = new Set(anonymousQuestions.map(q => q.studentIdHash));
  
  const stats = {
    totalAnonymousQuestions: anonymousQuestions.length,
    uniqueStudentsAsking: uniqueStudentHashes.size,
    averageQuestionsPerStudent: anonymousQuestions.length / uniqueStudentHashes.size,
  };
  
  console.log('Classroom Anonymous Question Stats:');
  console.log(`Total questions: ${stats.totalAnonymousQuestions}`);
  console.log(`Unique students: ${stats.uniqueStudentsAsking}`);
  console.log(`Average per student: ${stats.averageQuestionsPerStudent.toFixed(1)}`);
  console.log('Individual student identities remain anonymous');
  
  return stats;
}

// ============================================================================
// SECURITY NOTES
// ============================================================================

/*
 * IMPORTANT SECURITY CONSIDERATIONS:
 * 
 * 1. ONE-WAY HASHING: The hash cannot be reversed to reveal the student ID.
 *    Even if the database is compromised, student identities remain protected.
 * 
 * 2. SALT PROTECTION: The SALT environment variable must be kept secret.
 *    If the salt is compromised, hashes can be brute-forced.
 * 
 * 3. CONSISTENT HASHING: Same student ID always produces the same hash,
 *    allowing analytics while maintaining anonymity.
 * 
 * 4. DISPLAY IDENTIFIERS: The "anon-XXXXXXXX" format provides a user-friendly
 *    way to reference anonymous questions without revealing identity.
 * 
 * 5. TEACHER ISOLATION: Teachers should NEVER have access to the mapping
 *    between student IDs and hashes. This ensures true anonymity.
 * 
 * 6. DATABASE DESIGN: Store only the hash, never the original student ID
 *    in the anonymous_questions table.
 */

// ============================================================================
// EXAMPLE API ENDPOINT USAGE
// ============================================================================

/*
 * POST /api/student/anonymous-question
 * 
 * Request body:
 * {
 *   "studentId": "student-123",  // From authenticated session
 *   "classroomId": "classroom-456",
 *   "question": "Can you explain photosynthesis?"
 * }
 * 
 * Implementation:
 * 
 * app.post('/api/student/anonymous-question', async (req, res) => {
 *   const { studentId, classroomId, question } = req.body;
 *   
 *   // Hash the student ID
 *   const studentIdHash = hashStudentId(studentId);
 *   const displayId = createAnonymousIdentifier(studentId);
 *   
 *   // Store in database (without revealing student ID)
 *   const result = await supabase
 *     .from('anonymous_questions')
 *     .insert({
 *       student_id_hash: studentIdHash,  // NOT the actual student ID
 *       classroom_id: classroomId,
 *       question: question,
 *       display_id: displayId,
 *       timestamp: new Date(),
 *       answered: false,
 *     });
 *   
 *   // Notify teacher via Socket.io (without revealing identity)
 *   io.to(`classroom:${classroomId}`).emit('teacher:anonymous_question', {
 *     displayId: displayId,  // Teacher sees "anon-a3f2b1c4"
 *     question: question,
 *     timestamp: new Date(),
 *   });
 *   
 *   res.json({
 *     questionId: result.data.id,
 *     acknowledged: true,
 *     displayId: displayId,
 *   });
 * });
 */

export {
  submitAnonymousQuestion,
  analyzeAnonymousQuestions,
  verifyAnonymousQuestionOwnership,
  displayAnonymousQuestionsForTeacher,
  generateClassroomAnonymousStats,
};

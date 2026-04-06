/**
 * Example usage of MetacognitionCoach
 * Demonstrates how to integrate the metacognition coach into the application
 */

import { MetacognitionCoach } from './MetacognitionCoach';
import { StudentProfileManager } from '../models/StudentProfile';

/**
 * Example 1: Generate reflection after a learning session
 */
export async function generatePostSessionReflection(studentId: string) {
  // Load student profile
  const profile = await StudentProfileManager.loadFromDatabase(studentId);
  
  if (!profile || profile.recentSessions.length === 0) {
    console.log('No sessions found for student');
    return;
  }

  // Get the most recent session
  const lastSession = profile.recentSessions[0];

  // Generate reflection
  const reflection = MetacognitionCoach.generateReflection(lastSession, profile);

  console.log('\n=== Your Learning Reflection ===\n');
  
  console.log('🌟 What Went Well:');
  reflection.whatWentWell.forEach(item => console.log(`  ${item}`));
  
  console.log('\n💡 Areas to Improve:');
  reflection.areasToImprove.forEach(item => console.log(`  ${item}`));
  
  console.log('\n🔍 Patterns Discovered:');
  reflection.patternsDiscovered.forEach(item => console.log(`  ${item}`));
  
  console.log('\n📋 Next Steps:');
  reflection.nextSteps.forEach(item => console.log(`  ${item}`));
  
  console.log(`\n${reflection.motivationalMessage}\n`);

  return reflection;
}

/**
 * Example 2: Analyze learning patterns over time
 */
export async function analyzeLearningPatterns(studentId: string) {
  const profile = await StudentProfileManager.loadFromDatabase(studentId);
  
  if (!profile) {
    console.log('Student not found');
    return;
  }

  // Analyze recent sessions
  const analysis = MetacognitionCoach.analyzeRecentSessions(profile, 10);

  console.log('\n=== Learning Analytics ===\n');
  console.log(`Session Quality Score: ${analysis.sessionQuality}/100`);
  console.log(`Engagement Score: ${analysis.engagementScore}/100`);
  console.log(`Confusion Rate: ${(analysis.confusionRate * 100).toFixed(1)}%`);
  console.log(`Total Mastery Gained: ${analysis.masteryGainTotal.toFixed(1)} points`);
  console.log(`Average Session Duration: ${Math.round(analysis.averageDuration / 60)} minutes`);
  
  if (analysis.optimalTimeOfDay) {
    console.log(`Optimal Learning Time: ${analysis.optimalTimeOfDay}`);
  }

  // Identify patterns
  const patterns = MetacognitionCoach.identifyPatterns(profile, analysis);

  console.log('\n=== Learning Patterns ===\n');
  patterns.forEach(pattern => {
    console.log(`${pattern.type.toUpperCase()}`);
    console.log(`  Description: ${pattern.description}`);
    console.log(`  Confidence: ${(pattern.confidence * 100).toFixed(0)}%`);
    console.log(`  Recommendation: ${pattern.recommendation}\n`);
  });

  return { analysis, patterns };
}

/**
 * Example 3: Generate AI-powered personalized reflection
 */
export async function generateAIReflection(studentId: string) {
  const profile = await StudentProfileManager.loadFromDatabase(studentId);
  
  if (!profile || profile.recentSessions.length === 0) {
    console.log('No sessions found for student');
    return;
  }

  const lastSession = profile.recentSessions[0];

  console.log('Generating AI-powered reflection...\n');

  try {
    // Generate AI reflection (requires Gemini API key)
    const reflection = await MetacognitionCoach.generateAIReflection(lastSession, profile);

    console.log('\n=== AI-Powered Reflection ===\n');
    
    console.log('🌟 What Went Well:');
    reflection.whatWentWell.forEach(item => console.log(`  ${item}`));
    
    console.log('\n💡 Areas to Improve:');
    reflection.areasToImprove.forEach(item => console.log(`  ${item}`));
    
    console.log('\n🔍 Patterns Discovered:');
    reflection.patternsDiscovered.forEach(item => console.log(`  ${item}`));
    
    console.log('\n📋 Next Steps:');
    reflection.nextSteps.forEach(item => console.log(`  ${item}`));
    
    console.log(`\n${reflection.motivationalMessage}\n`);

    return reflection;
  } catch (error) {
    console.error('Error generating AI reflection:', error);
    console.log('Falling back to rule-based reflection...');
    return MetacognitionCoach.generateReflection(lastSession, profile);
  }
}

/**
 * Example 4: Weekly learning summary
 */
export async function generateWeeklySummary(studentId: string) {
  const profile = await StudentProfileManager.loadFromDatabase(studentId);
  
  if (!profile) {
    console.log('Student not found');
    return;
  }

  // Get sessions from last 7 days
  const oneWeekAgo = Date.now() - 7 * 24 * 60 * 60 * 1000;
  const weeklySessions = profile.recentSessions.filter(
    s => s.timestamp.getTime() > oneWeekAgo
  );

  console.log('\n=== Weekly Learning Summary ===\n');
  console.log(`Sessions Completed: ${weeklySessions.length}`);
  
  const totalTime = weeklySessions.reduce((sum, s) => sum + s.duration, 0);
  console.log(`Total Learning Time: ${Math.round(totalTime / 60)} minutes`);
  
  const totalQuestions = weeklySessions.reduce((sum, s) => sum + s.questionsAsked, 0);
  console.log(`Questions Asked: ${totalQuestions}`);
  
  const confusedSessions = weeklySessions.filter(s => s.confusionDetected).length;
  console.log(`Confusion Rate: ${((confusedSessions / weeklySessions.length) * 100).toFixed(1)}%`);

  // Analyze patterns
  const analysis = MetacognitionCoach.analyzeRecentSessions(profile, weeklySessions.length);
  const patterns = MetacognitionCoach.identifyPatterns(profile, analysis);

  console.log('\n=== Key Insights ===\n');
  patterns.forEach(pattern => {
    if (pattern.confidence > 0.7) {
      console.log(`• ${pattern.description}`);
    }
  });

  console.log('\n=== Recommendations ===\n');
  patterns.forEach(pattern => {
    if (pattern.confidence > 0.7) {
      console.log(`• ${pattern.recommendation}`);
    }
  });

  return { weeklySessions, analysis, patterns };
}

/**
 * Example 5: Integration with Express route
 */
export function setupMetacognitionRoutes(app: any) {
  // POST /api/student/:studentId/reflection
  app.post('/api/student/:studentId/reflection', async (req: any, res: any) => {
    try {
      const { studentId } = req.params;
      const { useAI } = req.body;

      const profile = await StudentProfileManager.loadFromDatabase(studentId);
      
      if (!profile || profile.recentSessions.length === 0) {
        return res.status(404).json({ error: 'No sessions found' });
      }

      const lastSession = profile.recentSessions[0];
      
      let reflection;
      if (useAI) {
        reflection = await MetacognitionCoach.generateAIReflection(lastSession, profile);
      } else {
        reflection = MetacognitionCoach.generateReflection(lastSession, profile);
      }

      res.json({ reflection });
    } catch (error) {
      console.error('Error generating reflection:', error);
      res.status(500).json({ error: 'Failed to generate reflection' });
    }
  });

  // GET /api/student/:studentId/patterns
  app.get('/api/student/:studentId/patterns', async (req: any, res: any) => {
    try {
      const { studentId } = req.params;
      const { sessionCount = 10 } = req.query;

      const profile = await StudentProfileManager.loadFromDatabase(studentId);
      
      if (!profile) {
        return res.status(404).json({ error: 'Student not found' });
      }

      const analysis = MetacognitionCoach.analyzeRecentSessions(profile, parseInt(sessionCount));
      const patterns = MetacognitionCoach.identifyPatterns(profile, analysis);

      res.json({ analysis, patterns });
    } catch (error) {
      console.error('Error analyzing patterns:', error);
      res.status(500).json({ error: 'Failed to analyze patterns' });
    }
  });

  // GET /api/student/:studentId/weekly-summary
  app.get('/api/student/:studentId/weekly-summary', async (req: any, res: any) => {
    try {
      const { studentId } = req.params;
      const summary = await generateWeeklySummary(studentId);
      res.json(summary);
    } catch (error) {
      console.error('Error generating weekly summary:', error);
      res.status(500).json({ error: 'Failed to generate summary' });
    }
  });
}

// Example usage in main application
if (require.main === module) {
  const studentId = 'student_123';
  
  console.log('Running MetacognitionCoach examples...\n');
  
  // Example 1: Post-session reflection
  generatePostSessionReflection(studentId)
    .then(() => console.log('Example 1 complete\n'))
    .catch(console.error);
  
  // Example 2: Learning patterns
  setTimeout(() => {
    analyzeLearningPatterns(studentId)
      .then(() => console.log('Example 2 complete\n'))
      .catch(console.error);
  }, 1000);
  
  // Example 3: AI reflection
  setTimeout(() => {
    generateAIReflection(studentId)
      .then(() => console.log('Example 3 complete\n'))
      .catch(console.error);
  }, 2000);
  
  // Example 4: Weekly summary
  setTimeout(() => {
    generateWeeklySummary(studentId)
      .then(() => console.log('Example 4 complete\n'))
      .catch(console.error);
  }, 3000);
}

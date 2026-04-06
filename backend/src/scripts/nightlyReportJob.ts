/**
 * Nightly Report Job
 * Generates and sends daily reports to all parents
 * REQ-6.1.5: System SHALL send reports via WhatsApp when enabled
 */

import { createClient } from '@supabase/supabase-js';
import { generateDailyReport } from '../services/ParentVoiceBridge';

const supabaseUrl = process.env.SUPABASE_URL || '';
const supabaseKey = process.env.SUPABASE_SERVICE_KEY || '';
const supabase = createClient(supabaseUrl, supabaseKey);

/**
 * Format daily report for WhatsApp message
 */
function formatReportForWhatsApp(report: any, studentName: string): string {
  const { 
    date, 
    sessionsCompleted, 
    totalLearningTime, 
    topicsCovered, 
    masteryGained, 
    confusionEvents, 
    moodSummary,
    teacherNotes 
  } = report;

  const learningMinutes = Math.floor(totalLearningTime / 60);
  const dateStr = new Date(date).toLocaleDateString('en-IN', { 
    weekday: 'long', 
    year: 'numeric', 
    month: 'long', 
    day: 'numeric' 
  });

  let message = `📚 *Daily Learning Report for ${studentName}*\n`;
  message += `📅 ${dateStr}\n\n`;
  
  message += `✅ *Sessions Completed:* ${sessionsCompleted}\n`;
  message += `⏱️ *Learning Time:* ${learningMinutes} minutes\n\n`;
  
  if (topicsCovered.length > 0) {
    message += `📖 *Topics Covered:*\n`;
    topicsCovered.slice(0, 5).forEach((topic: string) => {
      message += `  • ${topic}\n`;
    });
    if (topicsCovered.length > 5) {
      message += `  ... and ${topicsCovered.length - 5} more\n`;
    }
    message += '\n';
  }
  
  const masteryEntries = Object.entries(masteryGained);
  if (masteryEntries.length > 0) {
    message += `⭐ *Mastery Gains:*\n`;
    masteryEntries.slice(0, 3).forEach(([concept, gain]) => {
      message += `  • ${concept}: +${gain}%\n`;
    });
    if (masteryEntries.length > 3) {
      message += `  ... and ${masteryEntries.length - 3} more\n`;
    }
    message += '\n';
  }
  
  message += `😊 *Mood:* ${moodSummary}\n`;
  
  if (confusionEvents > 0) {
    message += `🤔 *Confusion Events:* ${confusionEvents}\n`;
  }
  
  if (teacherNotes) {
    message += `\n👩‍🏫 *Teacher Note:*\n${teacherNotes}\n`;
  }
  
  message += `\n💡 Keep up the great work! 🎉`;
  
  return message;
}

/**
 * Send WhatsApp message via Twilio (placeholder)
 * REQ-6.1.5: System SHALL send reports via WhatsApp when enabled
 */
async function sendWhatsAppMessage(phoneNumber: string, message: string): Promise<boolean> {
  // TODO: Integrate with Twilio WhatsApp API
  // For now, just log the message
  console.log(`📱 WhatsApp message to ${phoneNumber}:`);
  console.log(message);
  console.log('---');
  
  // In production, this would use Twilio:
  /*
  const accountSid = process.env.TWILIO_ACCOUNT_SID;
  const authToken = process.env.TWILIO_AUTH_TOKEN;
  const client = require('twilio')(accountSid, authToken);
  
  try {
    await client.messages.create({
      body: message,
      from: `whatsapp:${process.env.TWILIO_WHATSAPP_NUMBER}`,
      to: `whatsapp:${phoneNumber}`
    });
    return true;
  } catch (error) {
    console.error('Failed to send WhatsApp message:', error);
    return false;
  }
  */
  
  return true; // Simulate success
}

/**
 * Run nightly report generation and sending
 * REQ-6.1.1: System SHALL generate daily reports for each child
 * REQ-6.1.5: System SHALL send reports via WhatsApp when enabled
 */
export async function runNightlyReports(): Promise<void> {
  console.log('🌙 Starting nightly report generation...');
  
  try {
    // Get all parents with WhatsApp enabled
    const { data: parents, error: parentsError } = await supabase
      .from('parents')
      .select('parent_id, name, phone, whatsapp_enabled')
      .eq('whatsapp_enabled', true);

    if (parentsError) {
      throw new Error(`Failed to fetch parents: ${parentsError.message}`);
    }

    if (!parents || parents.length === 0) {
      console.log('ℹ️  No parents with WhatsApp enabled');
      return;
    }

    console.log(`📊 Processing reports for ${parents.length} parents...`);

    const today = new Date();
    let reportsSent = 0;
    let reportsSkipped = 0;

    for (const parent of parents) {
      // Get all children for this parent
      const { data: students, error: studentsError } = await supabase
        .from('students')
        .select('student_id, name')
        .eq('parent_id', parent.parent_id);

      if (studentsError) {
        console.error(`❌ Failed to fetch students for parent ${parent.parent_id}:`, studentsError);
        continue;
      }

      if (!students || students.length === 0) {
        console.log(`ℹ️  No students found for parent ${parent.name}`);
        continue;
      }

      // Generate and send report for each child
      for (const student of students) {
        try {
          const report = await generateDailyReport(student.student_id, today);

          // Only send report if student had activity today
          if (report.sessionsCompleted > 0) {
            const message = formatReportForWhatsApp(report, student.name);
            const sent = await sendWhatsAppMessage(parent.phone, message);

            if (sent) {
              reportsSent++;
              console.log(`✅ Report sent for ${student.name} to ${parent.name}`);
            } else {
              console.error(`❌ Failed to send report for ${student.name}`);
            }
          } else {
            reportsSkipped++;
            console.log(`⏭️  Skipped report for ${student.name} (no activity today)`);
          }
        } catch (error) {
          console.error(`❌ Error generating report for student ${student.student_id}:`, error);
        }
      }
    }

    console.log(`\n📈 Nightly report summary:`);
    console.log(`   ✅ Reports sent: ${reportsSent}`);
    console.log(`   ⏭️  Reports skipped: ${reportsSkipped}`);
    console.log(`✅ Nightly report generation complete\n`);

  } catch (error) {
    console.error('❌ Nightly report job failed:', error);
    throw error;
  }
}

// Allow running as standalone script
if (require.main === module) {
  runNightlyReports()
    .then(() => {
      console.log('✅ Script completed successfully');
      process.exit(0);
    })
    .catch((error) => {
      console.error('❌ Script failed:', error);
      process.exit(1);
    });
}

/**
 * WhatsApp Bridge Service
 * Integrates with Twilio WhatsApp API for parent communication
 * REQ-5.2.1: System SHALL integrate with Twilio WhatsApp API
 * REQ-5.2.6: System SHALL verify parent phone numbers
 */

import twilio from 'twilio';
import type { Twilio } from 'twilio';
import { supabase } from '../config/supabase.js';
import type { DailyReport } from './ParentVoiceBridge.js';

export interface WhatsAppConfig {
  accountSid: string;
  authToken: string;
  whatsappNumber: string;
}

export interface WhatsAppMessage {
  to: string;
  body: string;
}

export interface IncomingMessage {
  from: string;
  body: string;
  messageId: string;
}

/**
 * WhatsApp Bridge for parent communication via Twilio
 */
export class WhatsAppBridge {
  private twilioClient: Twilio;
  private whatsappNumber: string;

  constructor(config?: WhatsAppConfig) {
    const accountSid = config?.accountSid || process.env.TWILIO_ACCOUNT_SID;
    const authToken = config?.authToken || process.env.TWILIO_AUTH_TOKEN;
    this.whatsappNumber = config?.whatsappNumber || process.env.TWILIO_WHATSAPP_NUMBER || '';

    if (!accountSid || !authToken) {
      throw new Error('Twilio credentials are required (TWILIO_ACCOUNT_SID and TWILIO_AUTH_TOKEN)');
    }

    if (!this.whatsappNumber) {
      throw new Error('Twilio WhatsApp number is required (TWILIO_WHATSAPP_NUMBER)');
    }

    this.twilioClient = twilio(accountSid, authToken);
  }

  /**
   * Send a WhatsApp message to a phone number
   * REQ-5.2.1: System SHALL integrate with Twilio WhatsApp API
   */
  async sendMessage(to: string, body: string): Promise<string> {
    try {
      // Format phone number with whatsapp: prefix
      const formattedTo = this.formatPhoneNumber(to);
      const formattedFrom = this.formatPhoneNumber(this.whatsappNumber);

      const message = await this.twilioClient.messages.create({
        from: formattedFrom,
        to: formattedTo,
        body: body
      });

      return message.sid;
    } catch (error) {
      const errorMessage = error instanceof Error ? error.message : 'Unknown error';
      throw new Error(`Failed to send WhatsApp message: ${errorMessage}`);
    }
  }

  /**
   * Send daily learning report to parent via WhatsApp
   * REQ-5.2.2: System SHALL send daily learning reports to parents
   * REQ-5.2.3: System SHALL include: sessions, time, topics, progress, confusion events
   */
  async sendDailyReport(parentPhone: string, report: DailyReport): Promise<string> {
    const message = this.formatDailyReport(report);
    return await this.sendMessage(parentPhone, message);
  }

  /**
   * Format daily report into WhatsApp message
   * REQ-5.2.3: System SHALL include: sessions, time, topics, progress, confusion events
   */
  private formatDailyReport(report: DailyReport): string {
    const minutes = Math.round(report.totalLearningTime / 60);
    const topicsText = report.topicsCovered.length > 0
      ? report.topicsCovered.slice(0, 3).join(', ')
      : 'No topics covered';
    
    const masteryCount = Object.keys(report.masteryGained).length;
    const confusionWarning = report.confusionEvents > 0
      ? `\n⚠️ Confusion events: ${report.confusionEvents}`
      : '';
    
    const teacherNote = report.teacherNotes
      ? `\n\nTeacher note: ${report.teacherNotes}`
      : '';

    return `📚 Daily Learning Report for ${report.studentId}

✅ Sessions: ${report.sessionsCompleted}
⏱️ Time: ${minutes} minutes
📖 Topics: ${topicsText}
📈 Progress: ${masteryCount} concepts improved${confusionWarning}${teacherNote}

Reply with questions or type STOP to unsubscribe.`;
  }

  /**
   * Verify if a phone number is valid and can receive WhatsApp messages
   * REQ-5.2.6: System SHALL verify parent phone numbers
   */
  async verifyPhoneNumber(phoneNumber: string): Promise<boolean> {
    try {
      const formattedNumber = this.formatPhoneNumber(phoneNumber);
      
      // Use Twilio Lookup API to verify the phone number
      const lookup = await this.twilioClient.lookups.v2
        .phoneNumbers(formattedNumber.replace('whatsapp:', ''))
        .fetch();

      // Check if the number is valid
      return lookup.valid || false;
    } catch (error) {
      // If lookup fails, the number is likely invalid
      console.error('Phone number verification failed:', error);
      return false;
    }
  }

  /**
   * Handle incoming WhatsApp message from parent
   * REQ-5.2.4: System SHALL handle incoming parent questions
   * REQ-5.2.5: System SHALL support STOP command for unsubscribe
   */
  async handleIncomingMessage(message: IncomingMessage): Promise<void> {
    const from = message.from.replace('whatsapp:', '');
    const body = message.body.trim();

    // Find parent by phone number
    const { data: parent, error: parentError } = await supabase
      .from('parents')
      .select('*')
      .eq('phone', from)
      .single();

    if (parentError || !parent) {
      await this.sendMessage(from, 'Sorry, I don\'t recognize this number. Please register first.');
      return;
    }

    // Handle STOP command
    // REQ-5.2.5: System SHALL support STOP command for unsubscribe
    if (body.toUpperCase() === 'STOP') {
      await supabase
        .from('parents')
        .update({ whatsapp_enabled: false })
        .eq('parent_id', parent.parent_id);

      await this.sendMessage(from, 'You have been unsubscribed from daily reports.');
      return;
    }

    // Handle START command (re-subscribe)
    if (body.toUpperCase() === 'START') {
      await supabase
        .from('parents')
        .update({ whatsapp_enabled: true })
        .eq('parent_id', parent.parent_id);

      await this.sendMessage(from, 'You have been subscribed to daily reports. You will receive updates about your child\'s learning progress.');
      return;
    }

    // For other messages, send a helpful response
    // In a full implementation, this would integrate with Gemini/AI to answer questions
    const response = `Thank you for your message! I'm Haru, your child's AI learning assistant.

I can help you with:
• Daily learning reports
• Progress updates
• Answering questions about your child's learning

Your message has been received. For immediate assistance, please contact your child's teacher.

Type STOP to unsubscribe from daily reports.`;

    await this.sendMessage(from, response);
  }

  /**
   * Format phone number with whatsapp: prefix
   */
  private formatPhoneNumber(phoneNumber: string): string {
    // Remove any existing whatsapp: prefix
    let formatted = phoneNumber.replace('whatsapp:', '');
    
    // Remove any non-digit characters except +
    formatted = formatted.replace(/[^\d+]/g, '');
    
    // Add whatsapp: prefix
    return `whatsapp:${formatted}`;
  }

  /**
   * Get Twilio client instance (for testing purposes)
   */
  getTwilioClient(): Twilio {
    return this.twilioClient;
  }
}

/**
 * Create a singleton instance of WhatsAppBridge
 */
let whatsAppBridgeInstance: WhatsAppBridge | null = null;

export function getWhatsAppBridge(): WhatsAppBridge {
  if (!whatsAppBridgeInstance) {
    whatsAppBridgeInstance = new WhatsAppBridge();
  }
  return whatsAppBridgeInstance;
}

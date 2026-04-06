/**
 * Alerting Service
 * Sends alerts via multiple channels (email, Slack, SMS)
 * 
 * Task 37.5: Set up monitoring and alerting
 */

import { logger } from '../utils/logger.js';
import { Alert } from './MonitoringService.js';

export interface AlertChannel {
  type: 'email' | 'slack' | 'sms' | 'webhook';
  enabled: boolean;
  config: Record<string, any>;
}

export interface AlertConfig {
  channels: AlertChannel[];
  severityThresholds: {
    critical: boolean;
    warning: boolean;
    info: boolean;
  };
}

/**
 * Alerting Service Class
 */
class AlertingService {
  private config: AlertConfig;
  
  constructor() {
    this.config = {
      channels: this.loadChannelsFromEnv(),
      severityThresholds: {
        critical: true,
        warning: true,
        info: false // Don't send info alerts by default
      }
    };
  }
  
  /**
   * Load alert channels from environment variables
   */
  private loadChannelsFromEnv(): AlertChannel[] {
    const channels: AlertChannel[] = [];
    
    // Email channel
    if (process.env.ALERT_EMAIL_ENABLED === 'true') {
      channels.push({
        type: 'email',
        enabled: true,
        config: {
          to: process.env.ALERT_EMAIL_TO || 'admin@finxan.ai',
          from: process.env.ALERT_EMAIL_FROM || 'alerts@finxan.ai',
          smtpHost: process.env.SMTP_HOST,
          smtpPort: process.env.SMTP_PORT,
          smtpUser: process.env.SMTP_USER,
          smtpPassword: process.env.SMTP_PASSWORD
        }
      });
    }
    
    // Slack channel
    if (process.env.ALERT_SLACK_ENABLED === 'true') {
      channels.push({
        type: 'slack',
        enabled: true,
        config: {
          webhookUrl: process.env.SLACK_WEBHOOK_URL,
          channel: process.env.SLACK_ALERT_CHANNEL || '#finxan-alerts'
        }
      });
    }
    
    // SMS channel (via Twilio)
    if (process.env.ALERT_SMS_ENABLED === 'true') {
      channels.push({
        type: 'sms',
        enabled: true,
        config: {
          to: process.env.ALERT_SMS_TO,
          accountSid: process.env.TWILIO_ACCOUNT_SID,
          authToken: process.env.TWILIO_AUTH_TOKEN,
          from: process.env.TWILIO_PHONE_NUMBER
        }
      });
    }
    
    // Webhook channel (generic)
    if (process.env.ALERT_WEBHOOK_ENABLED === 'true') {
      channels.push({
        type: 'webhook',
        enabled: true,
        config: {
          url: process.env.ALERT_WEBHOOK_URL,
          method: process.env.ALERT_WEBHOOK_METHOD || 'POST',
          headers: JSON.parse(process.env.ALERT_WEBHOOK_HEADERS || '{}')
        }
      });
    }
    
    return channels;
  }
  
  /**
   * Send alert to all configured channels
   */
  async sendAlert(alert: Alert): Promise<void> {
    // Check if severity should trigger alerts
    if (!this.shouldSendAlert(alert.severity)) {
      return;
    }
    
    logger.info(`Sending alert: ${alert.type}`, { alert });
    
    // Send to all enabled channels
    const promises = this.config.channels
      .filter(channel => channel.enabled)
      .map(channel => this.sendToChannel(channel, alert));
    
    try {
      await Promise.allSettled(promises);
    } catch (error: any) {
      logger.error('Failed to send alerts', error);
    }
  }
  
  /**
   * Check if alert should be sent based on severity
   */
  private shouldSendAlert(severity: Alert['severity']): boolean {
    return this.config.severityThresholds[severity];
  }
  
  /**
   * Send alert to specific channel
   */
  private async sendToChannel(channel: AlertChannel, alert: Alert): Promise<void> {
    try {
      switch (channel.type) {
        case 'email':
          await this.sendEmail(channel.config, alert);
          break;
        case 'slack':
          await this.sendSlack(channel.config, alert);
          break;
        case 'sms':
          await this.sendSMS(channel.config, alert);
          break;
        case 'webhook':
          await this.sendWebhook(channel.config, alert);
          break;
      }
      
      logger.info(`Alert sent via ${channel.type}`, { alertId: alert.id });
    } catch (error: any) {
      logger.error(`Failed to send alert via ${channel.type}`, error, { alertId: alert.id });
    }
  }
  
  /**
   * Send email alert
   */
  private async sendEmail(config: Record<string, any>, alert: Alert): Promise<void> {
    // TODO: Implement email sending using nodemailer or similar
    // For now, just log
    logger.info('Email alert (not implemented)', {
      to: config.to,
      subject: `[${alert.severity.toUpperCase()}] ${alert.type}`,
      body: alert.message
    });
    
    // Example implementation:
    /*
    const nodemailer = require('nodemailer');
    const transporter = nodemailer.createTransport({
      host: config.smtpHost,
      port: config.smtpPort,
      auth: {
        user: config.smtpUser,
        pass: config.smtpPassword
      }
    });
    
    await transporter.sendMail({
      from: config.from,
      to: config.to,
      subject: `[${alert.severity.toUpperCase()}] ${alert.type}`,
      html: this.formatEmailBody(alert)
    });
    */
  }
  
  /**
   * Send Slack alert
   */
  private async sendSlack(config: Record<string, any>, alert: Alert): Promise<void> {
    if (!config.webhookUrl) {
      logger.warn('Slack webhook URL not configured');
      return;
    }
    
    const color = this.getSeverityColor(alert.severity);
    const emoji = this.getSeverityEmoji(alert.severity);
    
    const payload = {
      channel: config.channel,
      username: 'FinxanAI Monitoring',
      icon_emoji: ':robot_face:',
      attachments: [
        {
          color,
          title: `${emoji} ${alert.type}`,
          text: alert.message,
          fields: [
            {
              title: 'Severity',
              value: alert.severity.toUpperCase(),
              short: true
            },
            {
              title: 'Timestamp',
              value: alert.timestamp,
              short: true
            },
            {
              title: 'Alert ID',
              value: alert.id,
              short: true
            }
          ],
          footer: 'FinxanAI Platform',
          ts: Math.floor(new Date(alert.timestamp).getTime() / 1000)
        }
      ]
    };
    
    const response = await fetch(config.webhookUrl, {
      method: 'POST',
      headers: { 'Content-Type': 'application/json' },
      body: JSON.stringify(payload)
    });
    
    if (!response.ok) {
      throw new Error(`Slack API error: ${response.statusText}`);
    }
  }
  
  /**
   * Send SMS alert
   */
  private async sendSMS(config: Record<string, any>, alert: Alert): Promise<void> {
    // Only send SMS for critical alerts
    if (alert.severity !== 'critical') {
      return;
    }
    
    // TODO: Implement SMS sending using Twilio
    logger.info('SMS alert (not implemented)', {
      to: config.to,
      message: `[CRITICAL] ${alert.type}: ${alert.message}`
    });
    
    // Example implementation:
    /*
    const twilio = require('twilio');
    const client = twilio(config.accountSid, config.authToken);
    
    await client.messages.create({
      body: `[CRITICAL] ${alert.type}: ${alert.message}`,
      from: config.from,
      to: config.to
    });
    */
  }
  
  /**
   * Send webhook alert
   */
  private async sendWebhook(config: Record<string, any>, alert: Alert): Promise<void> {
    const response = await fetch(config.url, {
      method: config.method,
      headers: {
        'Content-Type': 'application/json',
        ...config.headers
      },
      body: JSON.stringify({
        alert,
        timestamp: new Date().toISOString(),
        source: 'finxan-ai-platform'
      })
    });
    
    if (!response.ok) {
      throw new Error(`Webhook error: ${response.statusText}`);
    }
  }
  
  /**
   * Get color for severity
   */
  private getSeverityColor(severity: Alert['severity']): string {
    switch (severity) {
      case 'critical':
        return '#FF0000'; // Red
      case 'warning':
        return '#FFA500'; // Orange
      case 'info':
        return '#0000FF'; // Blue
      default:
        return '#808080'; // Gray
    }
  }
  
  /**
   * Get emoji for severity
   */
  private getSeverityEmoji(severity: Alert['severity']): string {
    switch (severity) {
      case 'critical':
        return '🚨';
      case 'warning':
        return '⚠️';
      case 'info':
        return 'ℹ️';
      default:
        return '📢';
    }
  }
  
  /**
   * Format email body
   */
  private formatEmailBody(alert: Alert): string {
    return `
      <html>
        <body style="font-family: Arial, sans-serif;">
          <h2 style="color: ${this.getSeverityColor(alert.severity)};">
            ${this.getSeverityEmoji(alert.severity)} ${alert.type}
          </h2>
          <p><strong>Severity:</strong> ${alert.severity.toUpperCase()}</p>
          <p><strong>Message:</strong> ${alert.message}</p>
          <p><strong>Timestamp:</strong> ${alert.timestamp}</p>
          <p><strong>Alert ID:</strong> ${alert.id}</p>
          <hr>
          <p style="color: #666; font-size: 12px;">
            This is an automated alert from FinxanAI Platform Monitoring System.
          </p>
        </body>
      </html>
    `;
  }
}

// Export singleton instance
export const alertingService = new AlertingService();

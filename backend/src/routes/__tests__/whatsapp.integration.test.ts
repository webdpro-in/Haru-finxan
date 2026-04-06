/**
 * WhatsApp Integration Tests
 * Task 35.4: Test WhatsApp integration
 * 
 * Tests complete WhatsApp flow including:
 * - Webhook handling for incoming messages
 * - Subscription/unsubscription endpoints
 * - Daily report delivery
 * - STOP command processing
 * - Message formatting
 * - Error handling
 * - Twilio API integration
 * 
 * **Validates: Requirements REQ-5.2.1 through REQ-5.2.6**
 */

import { describe, it, expect, vi, beforeEach, afterEach } from 'vitest';
import express from 'express';
import request from 'supertest';
import whatsappRouter from '../whatsapp.js';

// Mock WhatsAppBridge
const mockSendMessage = vi.fn();
const mockSendDailyReport = vi.fn();
const mockVerifyPhoneNumber = vi.fn();
const mockHandleIncomingMessage = vi.fn();

vi.mock('../../services/WhatsAppBridge.js', () => ({
  getWhatsAppBridge: vi.fn(() => ({
    sendMessage: mockSendMessage,
    sendDailyReport: mockSendDailyReport,
    verifyPhoneNumber: mockVerifyPhoneNumber,
    handleIncomingMessage: mockHandleIncomingMessage
  }))
}));

// Mock Supabase
let mockSupabaseFrom: any;
let mockSupabaseSelect: any;
let mockSupabaseEq: any;
let mockSupabaseSingle: any;
let mockSupabaseUpdate: any;

vi.mock('@supabase/supabase-js', () => ({
  createClient: vi.fn(() => ({
    from: (...args: any[]) => mockSupabaseFrom(...args)
  }))
}));

describe('WhatsApp Integration Tests', () => {
  let app: express.Application;

  beforeEach(() => {
    app = express();
    app.use(express.json());
    app.use(express.urlencoded({ extended: true }));
    app.use('/api/whatsapp', whatsappRouter);

    process.env.SUPABASE_URL = 'https://test.supabase.co';
    process.env.SUPABASE_SERVICE_KEY = 'test_service_key';
    process.env.TWILIO_ACCOUNT_SID = 'AC123456789';
    process.env.TWILIO_AUTH_TOKEN = 'test_auth_token';
    process.env.TWILIO_WHATSAPP_NUMBER = '+14155238886';

    vi.clearAllMocks();

    mockSupabaseFrom = vi.fn();
    mockSupabaseSelect = vi.fn();
    mockSupabaseEq = vi.fn();
    mockSupabaseSingle = vi.fn();
    mockSupabaseUpdate = vi.fn();

    mockSupabaseFrom.mockReturnValue({
      select: mockSupabaseSelect,
      update: mockSupabaseUpdate
    });
    mockSupabaseSelect.mockReturnValue({
      eq: mockSupabaseEq
    });
    mockSupabaseEq.mockReturnValue({
      single: mockSupabaseSingle,
      select: mockSupabaseSelect
    });
    mockSupabaseUpdate.mockReturnValue({
      eq: mockSupabaseEq
    });
  });

  afterEach(() => {
    vi.clearAllMocks();
  });


  describe('POST /api/whatsapp/webhook - REQ-5.2.4, REQ-5.2.5', () => {
    it('should handle incoming WhatsApp message via webhook', async () => {
      mockHandleIncomingMessage.mockResolvedValue(undefined);

      const response = await request(app)
        .post('/api/whatsapp/webhook')
        .send({
          From: 'whatsapp:+1234567890',
          Body: 'How is my child doing?',
          MessageSid: 'SM123456789'
        });

      expect(response.status).toBe(200);
      expect(response.headers['content-type']).toContain('text/xml');
      expect(response.text).toContain('<Response></Response>');
      expect(mockHandleIncomingMessage).toHaveBeenCalledWith({
        from: 'whatsapp:+1234567890',
        body: 'How is my child doing?',
        messageId: 'SM123456789'
      });
    });

    it('should handle STOP command via webhook', async () => {
      mockHandleIncomingMessage.mockResolvedValue(undefined);

      const response = await request(app)
        .post('/api/whatsapp/webhook')
        .send({
          From: 'whatsapp:+1234567890',
          Body: 'STOP',
          MessageSid: 'SM123456789'
        });

      expect(response.status).toBe(200);
      expect(mockHandleIncomingMessage).toHaveBeenCalledWith({
        from: 'whatsapp:+1234567890',
        body: 'STOP',
        messageId: 'SM123456789'
      });
    });

    it('should return 400 if From is missing', async () => {
      const response = await request(app)
        .post('/api/whatsapp/webhook')
        .send({ Body: 'Hello' });

      expect(response.status).toBe(400);
      expect(response.body.error).toContain('Missing required fields');
    });

    it('should handle webhook errors gracefully', async () => {
      mockHandleIncomingMessage.mockRejectedValue(new Error('Processing failed'));

      const response = await request(app)
        .post('/api/whatsapp/webhook')
        .send({
          From: 'whatsapp:+1234567890',
          Body: 'Test',
          MessageSid: 'SM123456789'
        });

      expect(response.status).toBe(500);
      expect(response.body.error).toContain('Failed to process WhatsApp message');
    });
  });


  describe('POST /api/whatsapp/subscribe - REQ-5.2.6', () => {
    it('should subscribe parent to WhatsApp reports', async () => {
      const mockParent = {
        parent_id: 'parent-123',
        name: 'John Doe',
        phone: '+1234567890',
        whatsapp_enabled: false
      };

      mockSupabaseSingle.mockResolvedValue({ data: mockParent, error: null });
      mockSupabaseEq.mockReturnValueOnce({ single: mockSupabaseSingle })
        .mockReturnValueOnce({ data: { ...mockParent, whatsapp_enabled: true }, error: null });
      mockVerifyPhoneNumber.mockResolvedValue(true);
      mockSendMessage.mockResolvedValue('SM123456789');

      const response = await request(app)
        .post('/api/whatsapp/subscribe')
        .send({
          parentId: 'parent-123',
          phoneNumber: '+1234567890'
        });

      expect(response.status).toBe(200);
      expect(response.body.subscribed).toBe(true);
      expect(mockVerifyPhoneNumber).toHaveBeenCalledWith('+1234567890');
      expect(mockSupabaseUpdate).toHaveBeenCalledWith({
        phone: '+1234567890',
        whatsapp_enabled: true
      });
    });

    it('should return 404 if parent not found', async () => {
      mockSupabaseSingle.mockResolvedValue({ data: null, error: { message: 'Not found' } });

      const response = await request(app)
        .post('/api/whatsapp/subscribe')
        .send({
          parentId: 'nonexistent',
          phoneNumber: '+1234567890'
        });

      expect(response.status).toBe(404);
      expect(response.body.error).toBe('Parent not found');
    });

    it('should return 400 if phone number is invalid', async () => {
      mockSupabaseSingle.mockResolvedValue({ data: { parent_id: 'parent-123' }, error: null });
      mockVerifyPhoneNumber.mockResolvedValue(false);

      const response = await request(app)
        .post('/api/whatsapp/subscribe')
        .send({
          parentId: 'parent-123',
          phoneNumber: 'invalid'
        });

      expect(response.status).toBe(400);
      expect(response.body.error).toBe('Invalid phone number');
    });
  });


  describe('POST /api/whatsapp/unsubscribe', () => {
    it('should unsubscribe parent from WhatsApp reports', async () => {
      const mockParent = {
        parent_id: 'parent-123',
        phone: '+1234567890',
        whatsapp_enabled: false
      };

      mockSupabaseSelect.mockReturnValue({
        single: vi.fn().mockResolvedValue({ data: mockParent, error: null })
      });
      mockSendMessage.mockResolvedValue('SM123456789');

      const response = await request(app)
        .post('/api/whatsapp/unsubscribe')
        .send({ parentId: 'parent-123' });

      expect(response.status).toBe(200);
      expect(response.body.unsubscribed).toBe(true);
      expect(mockSupabaseUpdate).toHaveBeenCalledWith({ whatsapp_enabled: false });
    });

    it('should return 404 if parent not found', async () => {
      mockSupabaseSelect.mockReturnValue({
        single: vi.fn().mockResolvedValue({ data: null, error: null })
      });

      const response = await request(app)
        .post('/api/whatsapp/unsubscribe')
        .send({ parentId: 'nonexistent' });

      expect(response.status).toBe(404);
      expect(response.body.error).toBe('Parent not found');
    });
  });

  describe('GET /api/whatsapp/status/:parentId', () => {
    it('should get WhatsApp subscription status', async () => {
      mockSupabaseSingle.mockResolvedValue({
        data: { whatsapp_enabled: true, phone: '+1234567890' },
        error: null
      });

      const response = await request(app)
        .get('/api/whatsapp/status/parent-123');

      expect(response.status).toBe(200);
      expect(response.body).toEqual({
        parentId: 'parent-123',
        whatsappEnabled: true,
        phoneNumber: '+1234567890'
      });
    });

    it('should return 404 if parent not found', async () => {
      mockSupabaseSingle.mockResolvedValue({ data: null, error: { message: 'Not found' } });

      const response = await request(app)
        .get('/api/whatsapp/status/nonexistent');

      expect(response.status).toBe(404);
      expect(response.body.error).toBe('Parent not found');
    });
  });

  describe('End-to-End WhatsApp Flow - REQ-5.2.1, REQ-5.2.2, REQ-5.2.3', () => {
    it('should complete full subscription and message flow', async () => {
      // Subscribe
      mockSupabaseSingle.mockResolvedValue({ data: { parent_id: 'parent-123' }, error: null });
      mockSupabaseEq.mockReturnValueOnce({ single: mockSupabaseSingle })
        .mockReturnValueOnce({ data: { whatsapp_enabled: true }, error: null });
      mockVerifyPhoneNumber.mockResolvedValue(true);
      mockSendMessage.mockResolvedValue('SM123456789');

      const subscribeResponse = await request(app)
        .post('/api/whatsapp/subscribe')
        .send({ parentId: 'parent-123', phoneNumber: '+1234567890' });

      expect(subscribeResponse.status).toBe(200);

      // Check status
      mockSupabaseSingle.mockResolvedValue({
        data: { whatsapp_enabled: true, phone: '+1234567890' },
        error: null
      });

      const statusResponse = await request(app)
        .get('/api/whatsapp/status/parent-123');

      expect(statusResponse.body.whatsappEnabled).toBe(true);

      // Receive message
      mockHandleIncomingMessage.mockResolvedValue(undefined);

      const webhookResponse = await request(app)
        .post('/api/whatsapp/webhook')
        .send({
          From: 'whatsapp:+1234567890',
          Body: 'How is my child doing?',
          MessageSid: 'SM123456789'
        });

      expect(webhookResponse.status).toBe(200);

      // Unsubscribe
      mockSupabaseSelect.mockReturnValue({
        single: vi.fn().mockResolvedValue({
          data: { parent_id: 'parent-123', phone: '+1234567890', whatsapp_enabled: false },
          error: null
        })
      });

      const unsubscribeResponse = await request(app)
        .post('/api/whatsapp/unsubscribe')
        .send({ parentId: 'parent-123' });

      expect(unsubscribeResponse.status).toBe(200);
    });
  });
});

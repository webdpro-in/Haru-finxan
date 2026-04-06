/**
 * Unit Tests for Transcribe API Route
 * Tests POST /api/transcribe endpoint (Speech-to-Text)
 */

import { describe, it, expect, beforeEach, vi } from 'vitest';
import request from 'supertest';
import express from 'express';
import { transcribeRouter } from '../transcribe.js';
import multer from 'multer';

// Mock dependencies
vi.mock('../../providers/registry.js', () => ({
  ProviderRegistry: {
    getSTTProvider: vi.fn().mockResolvedValue({
      transcribe: vi.fn().mockResolvedValue('This is the transcribed text')
    })
  }
}));

describe('Transcribe API Route', () => {
  let app: express.Application;

  beforeEach(() => {
    app = express();
    app.use(express.json());
    
    // Setup multer for file uploads
    const upload = multer({ storage: multer.memoryStorage() });
    app.use('/api/transcribe', upload.single('audio'), transcribeRouter);
    
    vi.clearAllMocks();
  });

  describe('POST /api/transcribe', () => {
    it('should transcribe audio successfully', async () => {
      const audioBuffer = Buffer.from('fake audio data');
      
      const response = await request(app)
        .post('/api/transcribe')
        .attach('audio', audioBuffer, 'test.mp3');

      expect(response.status).toBe(200);
      expect(response.body).toHaveProperty('text');
      expect(response.body.text).toBe('This is the transcribed text');
    });

    it('should return 400 when audio file is missing', async () => {
      const response = await request(app)
        .post('/api/transcribe')
        .send({});

      expect(response.status).toBe(400);
      expect(response.body).toHaveProperty('error');
      expect(response.body.error).toContain('Audio file is required');
    });

    it('should return 400 for file size exceeding 10MB', async () => {
      // Create a buffer larger than 10MB
      const largeBuffer = Buffer.alloc(11 * 1024 * 1024);
      
      const response = await request(app)
        .post('/api/transcribe')
        .attach('audio', largeBuffer, 'large.mp3');

      expect(response.status).toBe(400);
      expect(response.body).toHaveProperty('error');
      expect(response.body.error).toContain('too large');
    });

    it('should return 400 for invalid audio file type', async () => {
      const textBuffer = Buffer.from('This is not audio');
      
      const response = await request(app)
        .post('/api/transcribe')
        .attach('audio', textBuffer, {
          filename: 'test.txt',
          contentType: 'text/plain'
        });

      expect(response.status).toBe(400);
      expect(response.body).toHaveProperty('error');
      expect(response.body.error).toContain('Invalid audio file type');
    });

    it('should accept audio/mpeg files', async () => {
      const audioBuffer = Buffer.from('fake mp3 data');
      
      const response = await request(app)
        .post('/api/transcribe')
        .attach('audio', audioBuffer, {
          filename: 'test.mp3',
          contentType: 'audio/mpeg'
        });

      expect(response.status).toBe(200);
    });

    it('should accept audio/wav files', async () => {
      const audioBuffer = Buffer.from('fake wav data');
      
      const response = await request(app)
        .post('/api/transcribe')
        .attach('audio', audioBuffer, {
          filename: 'test.wav',
          contentType: 'audio/wav'
        });

      expect(response.status).toBe(200);
    });

    it('should accept audio/webm files', async () => {
      const audioBuffer = Buffer.from('fake webm data');
      
      const response = await request(app)
        .post('/api/transcribe')
        .attach('audio', audioBuffer, {
          filename: 'test.webm',
          contentType: 'audio/webm'
        });

      expect(response.status).toBe(200);
    });

    it('should accept audio/ogg files', async () => {
      const audioBuffer = Buffer.from('fake ogg data');
      
      const response = await request(app)
        .post('/api/transcribe')
        .attach('audio', audioBuffer, {
          filename: 'test.ogg',
          contentType: 'audio/ogg'
        });

      expect(response.status).toBe(200);
    });

    it('should accept audio/mp4 files', async () => {
      const audioBuffer = Buffer.from('fake mp4 data');
      
      const response = await request(app)
        .post('/api/transcribe')
        .attach('audio', audioBuffer, {
          filename: 'test.mp4',
          contentType: 'audio/mp4'
        });

      expect(response.status).toBe(200);
    });

    it('should return 500 on STT provider error', async () => {
      const { ProviderRegistry } = await import('../../providers/registry.js');
      const mockProvider = await ProviderRegistry.getSTTProvider();
      vi.mocked(mockProvider.transcribe).mockRejectedValueOnce(
        new Error('Transcription failed')
      );

      const audioBuffer = Buffer.from('fake audio data');
      
      const response = await request(app)
        .post('/api/transcribe')
        .attach('audio', audioBuffer, 'test.mp3');

      expect(response.status).toBe(500);
      expect(response.body).toHaveProperty('error');
    });
  });
});

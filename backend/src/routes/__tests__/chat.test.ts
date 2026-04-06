/**
 * Unit Tests for Chat API Route
 * Tests POST /api/chat endpoint
 */

import { describe, it, expect, beforeEach, vi } from 'vitest';
import request from 'supertest';
import express from 'express';
import { chatRouter } from '../chat.js';

// Mock dependencies
vi.mock('../../providers/registry.js', () => ({
  ProviderRegistry: {
    getAIProvider: vi.fn().mockResolvedValue({
      chat: vi.fn().mockResolvedValue({
        text: 'This is a test response about photosynthesis. Look at the image to see how plants convert sunlight into energy.',
        usage: { totalTokens: 100 }
      })
    }),
    getImageProvider: vi.fn().mockResolvedValue({
      generate: vi.fn().mockResolvedValue('https://example.com/image.png')
    })
  }
}));

vi.mock('../../services/KnowledgeGraph.js', () => ({
  knowledgeGraph: {
    getProfile: vi.fn().mockReturnValue({
      studentId: 'demo_student',
      name: 'Demo Student',
      grade: 8,
      conceptMasteries: new Map()
    }),
    getPersonalizedContext: vi.fn().mockReturnValue('Student context'),
    recordConfusion: vi.fn(),
    recordSession: vi.fn()
  }
}));

vi.mock('../../services/ConfusionDetector.js', () => ({
  ConfusionDetector: {
    detectConfusion: vi.fn().mockReturnValue([]),
    calculateConfusionScore: vi.fn().mockReturnValue(0)
  }
}));

vi.mock('../../services/PrerequisiteDetector.js', () => ({
  PrerequisiteDetector: {
    extractTopic: vi.fn().mockReturnValue('photosynthesis'),
    checkPrerequisites: vi.fn().mockReturnValue({
      readyToLearn: true,
      missingPrerequisites: []
    })
  }
}));

vi.mock('../../utils/imageDetector.js', () => ({
  ImageDetector: {
    needsImages: vi.fn().mockReturnValue(true),
    extractPrompts: vi.fn().mockReturnValue([
      { prompt: 'photosynthesis diagram', priority: 10 }
    ])
  }
}));

describe('Chat API Route', () => {
  let app: express.Application;

  beforeEach(() => {
    app = express();
    app.use(express.json());
    app.use('/api/chat', chatRouter);
    vi.clearAllMocks();
  });

  describe('POST /api/chat', () => {
    it('should return AI response successfully', async () => {
      const response = await request(app)
        .post('/api/chat')
        .send({
          message: 'What is photosynthesis?',
          studentId: 'demo_student'
        });

      expect(response.status).toBe(200);
      expect(response.body).toHaveProperty('response');
      expect(response.body.response).toContain('photosynthesis');
    });

    it('should include generated images in response', async () => {
      const response = await request(app)
        .post('/api/chat')
        .send({
          message: 'Explain photosynthesis',
          studentId: 'demo_student'
        });

      expect(response.status).toBe(200);
      expect(response.body).toHaveProperty('images');
      expect(Array.isArray(response.body.images)).toBe(true);
    });

    it('should include metadata in response', async () => {
      const response = await request(app)
        .post('/api/chat')
        .send({
          message: 'What is photosynthesis?',
          studentId: 'demo_student'
        });

      expect(response.status).toBe(200);
      expect(response.body).toHaveProperty('metadata');
      expect(response.body.metadata).toHaveProperty('confusionDetected');
      expect(response.body.metadata).toHaveProperty('prerequisitesNeeded');
    });

    it('should handle context parameter', async () => {
      const response = await request(app)
        .post('/api/chat')
        .send({
          message: 'Tell me more',
          context: 'Previous: What is photosynthesis?',
          studentId: 'demo_student'
        });

      expect(response.status).toBe(200);
      expect(response.body).toHaveProperty('response');
    });

    it('should use default studentId if not provided', async () => {
      const response = await request(app)
        .post('/api/chat')
        .send({
          message: 'What is photosynthesis?'
        });

      expect(response.status).toBe(200);
      expect(response.body).toHaveProperty('response');
    });

    it('should return 400 for missing message', async () => {
      const response = await request(app)
        .post('/api/chat')
        .send({
          studentId: 'demo_student'
        });

      expect(response.status).toBe(400);
    });

    it('should return 500 on AI provider error', async () => {
      const { ProviderRegistry } = await import('../../providers/registry.js');
      vi.mocked(ProviderRegistry.getAIProvider).mockRejectedValueOnce(
        new Error('AI provider error')
      );

      const response = await request(app)
        .post('/api/chat')
        .send({
          message: 'What is photosynthesis?',
          studentId: 'demo_student'
        });

      expect(response.status).toBe(500);
      expect(response.body).toHaveProperty('error');
    });
  });
});

/**
 * Unit Tests for Image Prompts API Route
 * Tests POST /api/image-prompts/analyze endpoint
 */

import { describe, it, expect, beforeEach, vi } from 'vitest';
import request from 'supertest';
import express from 'express';
import { imagePromptsRouter } from '../imagePrompts.js';

// Mock dependencies
vi.mock('../../utils/imageDetector.js', () => ({
  ImageDetector: {
    needsImages: vi.fn().mockReturnValue(true),
    extractPrompts: vi.fn().mockReturnValue([
      { prompt: 'photosynthesis diagram', priority: 10 },
      { prompt: 'plant cell structure', priority: 9 },
      { prompt: 'chloroplast illustration', priority: 8 }
    ])
  }
}));

describe('Image Prompts API Route', () => {
  let app: express.Application;

  beforeEach(() => {
    app = express();
    app.use(express.json());
    app.use('/api/image-prompts', imagePromptsRouter);
    vi.clearAllMocks();
  });

  describe('POST /api/image-prompts/analyze', () => {
    it('should analyze text and return image prompts', async () => {
      const response = await request(app)
        .post('/api/image-prompts/analyze')
        .send({
          text: 'Photosynthesis is the process by which plants convert sunlight into energy. Look at the diagram to see how chloroplasts work.',
          userMessage: 'Explain photosynthesis'
        });

      expect(response.status).toBe(200);
      expect(response.body).toHaveProperty('needsImages');
      expect(response.body.needsImages).toBe(true);
      expect(response.body).toHaveProperty('prompts');
      expect(Array.isArray(response.body.prompts)).toBe(true);
      expect(response.body.prompts.length).toBeGreaterThan(0);
    });

    it('should include prompt and priority in each result', async () => {
      const response = await request(app)
        .post('/api/image-prompts/analyze')
        .send({
          text: 'Look at the image showing photosynthesis',
          userMessage: 'Explain photosynthesis'
        });

      expect(response.status).toBe(200);
      response.body.prompts.forEach((prompt: any) => {
        expect(prompt).toHaveProperty('prompt');
        expect(prompt).toHaveProperty('priority');
        expect(typeof prompt.prompt).toBe('string');
        expect(typeof prompt.priority).toBe('number');
      });
    });

    it('should return needsImages false when no visual content detected', async () => {
      const { ImageDetector } = await import('../../utils/imageDetector.js');
      vi.mocked(ImageDetector.needsImages).mockReturnValueOnce(false);

      const response = await request(app)
        .post('/api/image-prompts/analyze')
        .send({
          text: 'This is a simple text response without visual references',
          userMessage: 'What is 2+2?'
        });

      expect(response.status).toBe(200);
      expect(response.body.needsImages).toBe(false);
      expect(response.body.prompts).toEqual([]);
    });

    it('should work without userMessage parameter', async () => {
      const response = await request(app)
        .post('/api/image-prompts/analyze')
        .send({
          text: 'Look at the diagram showing photosynthesis'
        });

      expect(response.status).toBe(200);
      expect(response.body).toHaveProperty('needsImages');
      expect(response.body).toHaveProperty('prompts');
    });

    it('should return 400 for missing text parameter', async () => {
      const response = await request(app)
        .post('/api/image-prompts/analyze')
        .send({
          userMessage: 'Explain photosynthesis'
        });

      expect(response.status).toBe(400);
    });

    it('should return 400 for empty text', async () => {
      const response = await request(app)
        .post('/api/image-prompts/analyze')
        .send({
          text: '',
          userMessage: 'Explain photosynthesis'
        });

      expect(response.status).toBe(400);
    });

    it('should return 500 on image detector error', async () => {
      const { ImageDetector } = await import('../../utils/imageDetector.js');
      vi.mocked(ImageDetector.needsImages).mockImplementationOnce(() => {
        throw new Error('Image detector error');
      });

      const response = await request(app)
        .post('/api/image-prompts/analyze')
        .send({
          text: 'Look at the diagram',
          userMessage: 'Explain'
        });

      expect(response.status).toBe(500);
      expect(response.body).toHaveProperty('error');
    });

    it('should handle text with multiple visual references', async () => {
      const response = await request(app)
        .post('/api/image-prompts/analyze')
        .send({
          text: 'Look at the diagram showing photosynthesis. See the image of chloroplasts. Check the illustration of plant cells.',
          userMessage: 'Explain photosynthesis in detail'
        });

      expect(response.status).toBe(200);
      expect(response.body.needsImages).toBe(true);
      expect(response.body.prompts.length).toBeGreaterThan(0);
    });

    it('should sort prompts by priority', async () => {
      const response = await request(app)
        .post('/api/image-prompts/analyze')
        .send({
          text: 'Look at the diagram showing photosynthesis',
          userMessage: 'Explain photosynthesis'
        });

      expect(response.status).toBe(200);
      const prompts = response.body.prompts;
      
      // Check that prompts are sorted by priority (descending)
      for (let i = 0; i < prompts.length - 1; i++) {
        expect(prompts[i].priority).toBeGreaterThanOrEqual(prompts[i + 1].priority);
      }
    });
  });
});

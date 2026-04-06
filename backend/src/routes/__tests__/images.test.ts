/**
 * Unit Tests for Images API Route
 * Tests POST /api/images/search and POST /api/images/generate endpoints
 */

import { describe, it, expect, beforeEach, vi } from 'vitest';
import request from 'supertest';
import express from 'express';
import { imagesRouter } from '../images.js';

// Mock dependencies
vi.mock('../../providers/registry.js', () => ({
  ProviderRegistry: {
    getImageProvider: vi.fn().mockResolvedValue({
      search: vi.fn().mockResolvedValue([
        'https://example.com/image1.png',
        'https://example.com/image2.png',
        'https://example.com/image3.png'
      ]),
      generate: vi.fn().mockResolvedValue('https://example.com/generated-image.png')
    })
  }
}));

describe('Images API Route', () => {
  let app: express.Application;

  beforeEach(() => {
    app = express();
    app.use(express.json());
    app.use('/api/images', imagesRouter);
    vi.clearAllMocks();
  });

  describe('POST /api/images/search', () => {
    it('should search for images successfully', async () => {
      const response = await request(app)
        .post('/api/images/search')
        .send({
          query: 'photosynthesis diagram',
          count: 3
        });

      expect(response.status).toBe(200);
      expect(response.body).toHaveProperty('images');
      expect(Array.isArray(response.body.images)).toBe(true);
      expect(response.body.images).toHaveLength(3);
    });

    it('should use default count if not provided', async () => {
      const response = await request(app)
        .post('/api/images/search')
        .send({
          query: 'photosynthesis'
        });

      expect(response.status).toBe(200);
      expect(response.body).toHaveProperty('images');
    });

    it('should return 400 for missing query', async () => {
      const response = await request(app)
        .post('/api/images/search')
        .send({
          count: 3
        });

      expect(response.status).toBe(400);
    });

    it('should return 500 on provider error', async () => {
      const { ProviderRegistry } = await import('../../providers/registry.js');
      vi.mocked(ProviderRegistry.getImageProvider).mockRejectedValueOnce(
        new Error('Provider error')
      );

      const response = await request(app)
        .post('/api/images/search')
        .send({
          query: 'photosynthesis'
        });

      expect(response.status).toBe(500);
      expect(response.body).toHaveProperty('error');
    });
  });

  describe('POST /api/images/generate', () => {
    it('should generate image successfully', async () => {
      const response = await request(app)
        .post('/api/images/generate')
        .send({
          prompt: 'A diagram showing photosynthesis process'
        });

      expect(response.status).toBe(200);
      expect(response.body).toHaveProperty('imageUrl');
      expect(response.body.imageUrl).toContain('https://');
    });

    it('should return 400 for missing prompt', async () => {
      const response = await request(app)
        .post('/api/images/generate')
        .send({});

      expect(response.status).toBe(400);
    });

    it('should return 500 on generation error', async () => {
      const { ProviderRegistry } = await import('../../providers/registry.js');
      const mockProvider = await ProviderRegistry.getImageProvider();
      vi.mocked(mockProvider.generate).mockRejectedValueOnce(
        new Error('Generation failed')
      );

      const response = await request(app)
        .post('/api/images/generate')
        .send({
          prompt: 'Test prompt'
        });

      expect(response.status).toBe(500);
      expect(response.body).toHaveProperty('error');
    });
  });

  describe('POST /api/images/test', () => {
    it('should generate multiple test images', async () => {
      const response = await request(app)
        .post('/api/images/test')
        .send({});

      expect(response.status).toBe(200);
      expect(response.body).toHaveProperty('images');
      expect(response.body).toHaveProperty('prompts');
      expect(Array.isArray(response.body.images)).toBe(true);
      expect(Array.isArray(response.body.prompts)).toBe(true);
    });

    it('should return 500 on test generation error', async () => {
      const { ProviderRegistry } = await import('../../providers/registry.js');
      vi.mocked(ProviderRegistry.getImageProvider).mockRejectedValueOnce(
        new Error('Test failed')
      );

      const response = await request(app)
        .post('/api/images/test')
        .send({});

      expect(response.status).toBe(500);
      expect(response.body).toHaveProperty('error');
    });
  });
});

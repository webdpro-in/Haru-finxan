/**
 * Image Prompts Route - Returns prompts for frontend image generation
 * 
 * This route analyzes AI responses and returns image prompts that the frontend
 * can use to generate images in parallel using Puter.js browser SDK.
 */

import express from 'express';
import { ImageDetector } from '../utils/imageDetector.js';
import { ValidationMiddleware } from '../middleware/inputValidation.js';

export const imagePromptsRouter = express.Router();

/**
 * Analyze text and return image prompts
 * POST /api/image-prompts/analyze
 */
imagePromptsRouter.post('/analyze', ValidationMiddleware.imagePromptsAnalyze, async (req, res) => {
  try {
    const { text, userMessage } = req.body;

    // Detect if images are needed
    const needsImages = ImageDetector.needsImages(text);

    if (!needsImages) {
      return res.json({ 
        needsImages: false,
        prompts: [] 
      });
    }

    // Extract image prompts
    const prompts = ImageDetector.extractPrompts(text, userMessage || '');

    res.json({
      needsImages: true,
      prompts: prompts.map(p => ({
        prompt: p.prompt,
        priority: p.priority,
      })),
    });
  } catch (error) {
    console.error('Image prompts analysis error:', error);
    res.status(500).json({ error: 'Failed to analyze image prompts' });
  }
});

/**
 * Images Route - Image search and generation
 * 
 * This route uses the Provider Registry to obtain an ImageProvider implementation
 * based on environment configuration. The route depends on the ImageProvider contract
 * interface, not on any specific vendor implementation.
 */

import express from 'express';
import { ProviderRegistry } from '../providers/registry.js';
import { ValidationMiddleware } from '../middleware/inputValidation.js';

export const imagesRouter = express.Router();

// Search for images
imagesRouter.post('/search', ValidationMiddleware.imageSearch, async (req, res) => {
  try {
    const { query, count = 3 } = req.body;

    // Get Image provider from registry (depends on contract, not implementation)
    const imageProvider = await ProviderRegistry.getImageProvider();

    // Call provider through contract interface
    const images = await imageProvider.search(query, count);

    res.json({ images });
  } catch (error) {
    console.error('Image search error:', error);
    res.status(500).json({ error: 'Failed to search images' });
  }
});

// Generate image
imagesRouter.post('/generate', ValidationMiddleware.imageGenerate, async (req, res) => {
  try {
    const { prompt } = req.body;

    console.log(`🎨 Direct image generation request: "${prompt}"`);

    // Get Image provider from registry (depends on contract, not implementation)
    const imageProvider = await ProviderRegistry.getImageProvider();

    // Call provider through contract interface
    const imageUrl = await imageProvider.generate(prompt);

    console.log(`✅ Generated image: ${imageUrl}`);
    res.json({ imageUrl });
  } catch (error) {
    console.error('Image generation error:', error);
    res.status(500).json({ error: 'Failed to generate image' });
  }
});

// Test endpoint - generate multiple images
imagesRouter.post('/test', async (req, res) => {
  try {
    console.log('🧪 Test endpoint called - generating 3 test images');
    
    const imageProvider = await ProviderRegistry.getImageProvider();
    
    const testPrompts = [
      'A peaceful mountain landscape at sunset',
      'Solar system with planets orbiting the sun',
      'Water cycle diagram with labels'
    ];
    
    const images = await Promise.all(
      testPrompts.map(prompt => imageProvider.generate(prompt))
    );
    
    console.log(`✅ Test generated ${images.length} images`);
    res.json({ images, prompts: testPrompts });
  } catch (error) {
    console.error('Test generation error:', error);
    res.status(500).json({ error: 'Test failed' });
  }
});

/**
 * Synthesize Route - Text-to-Speech using Provider Abstraction Layer
 * 
 * This route uses the TTSProvider contract interface through the ProviderRegistry,
 * enabling provider switching via environment variables without modifying route code.
 * 
 * CRITICAL ARCHITECTURAL CONSTRAINTS:
 * - Routes MUST depend on contracts, NOT concrete implementations
 * - Routes MUST NOT know vendor names
 * - Provider switching MUST be environment-based only
 */

import express from 'express';
import { ProviderRegistry } from '../providers/registry.js';
import { ValidationMiddleware } from '../middleware/inputValidation.js';

export const synthesizeRouter = express.Router();

synthesizeRouter.post('/', ValidationMiddleware.synthesize, async (req, res) => {
  try {
    const { text, voiceId = 'Joanna', languageCode = 'en-US' } = req.body;

    // Get TTS provider from registry (uses TTSProvider contract interface)
    const ttsProvider = await ProviderRegistry.getTTSProvider();

    let audioUrl: string;
    // Call provider through contract interface with Fallback logic
    try {
      audioUrl = await ttsProvider.synthesize(text, voiceId, languageCode);
    } catch (primaryError: any) {
      console.warn(`⚠️ Primary TTS provider failed: ${primaryError.message}. Falling back to Browser TTS.`);
      
      // Fallback to Browser Native TTS
      const { BrowserTTSAdapter } = await import('../providers/browser/BrowserTTSAdapter.js');
      const fallbackProvider = new BrowserTTSAdapter();
      audioUrl = await fallbackProvider.synthesize(text, voiceId, languageCode);
    }

    res.json({ audioUrl });
  } catch (error) {
    console.error('Synthesis error:', error);
    res.status(500).json({ error: 'Failed to synthesize speech' });
  }
});

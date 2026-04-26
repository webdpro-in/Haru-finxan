/**
 * Synthesize route — text-to-speech via the configured TTSProvider (default AWS Polly).
 * The frontend prefers the browser's Web Speech API for hackathon demo and only
 * hits this endpoint when explicitly opted in.
 */

import express from 'express';
import { ProviderRegistry } from '../providers/registry.js';
import { ValidationMiddleware } from '../middleware/inputValidation.js';

export const synthesizeRouter = express.Router();

synthesizeRouter.post('/', ValidationMiddleware.synthesize, async (req, res) => {
  try {
    const { text, voiceId = 'Joanna', languageCode = 'en-US' } = req.body;
    const ttsProvider = await ProviderRegistry.getTTSProvider();
    const audioUrl = await ttsProvider.synthesize(text, voiceId, languageCode);
    res.json({ audioUrl });
  } catch (error: any) {
    console.error('Synthesis error:', error);
    res.status(500).json({ error: 'Failed to synthesize speech', message: error?.message });
  }
});

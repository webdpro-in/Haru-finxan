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
    const {
      text,
      voiceId = 'Joanna',
      languageCode = 'en-US',
      voiceGender,
    } = req.body as {
      text: string;
      voiceId?: string;
      languageCode?: string;
      voiceGender?: 'male' | 'female';
    };
    const ttsProvider = await ProviderRegistry.getTTSProvider();
    // Most providers ignore voiceGender; ElevenLabs uses it via the 4th arg.
    const audioUrl = await (ttsProvider as any).synthesize(text, voiceId, languageCode, voiceGender);
    res.json({ audioUrl });
  } catch (error: any) {
    console.error('Synthesis error:', error);
    res.status(500).json({ error: 'Failed to synthesize speech', message: error?.message });
  }
});

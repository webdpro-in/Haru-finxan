/**
 * Transcribe Route - Speech-to-Text using Provider Abstraction Layer
 * 
 * This route uses the ProviderRegistry to obtain an STTProvider implementation
 * based on environment configuration. The route depends on the STTProvider contract
 * interface, not on any specific vendor implementation.
 * 
 * CRITICAL ARCHITECTURAL CONSTRAINTS:
 * - Routes MUST depend on contracts, NOT concrete implementations
 * - Routes MUST NOT know vendor names
 * - Provider switching MUST be environment-based only
 */

import express from 'express';
import { ProviderRegistry } from '../providers/registry.js';
import { Request, Response, NextFunction } from 'express';

export const transcribeRouter = express.Router();

/**
 * Middleware to validate audio file upload
 */
function validateAudioFile(req: Request, res: Response, next: NextFunction) {
  if (!req.file) {
    return res.status(400).json({ error: 'Audio file is required' });
  }
  
  // Validate file size (max 10MB)
  const maxSize = 10 * 1024 * 1024;
  if (req.file.size > maxSize) {
    return res.status(400).json({ error: 'Audio file too large (max 10MB)' });
  }
  
  // Validate file type
  const allowedMimeTypes = ['audio/mpeg', 'audio/wav', 'audio/webm', 'audio/ogg', 'audio/mp4'];
  if (!allowedMimeTypes.includes(req.file.mimetype)) {
    return res.status(400).json({ error: 'Invalid audio file type' });
  }
  
  next();
}

transcribeRouter.post('/', validateAudioFile, async (req, res) => {
  try {

    // Get STT provider from registry (contract-based, vendor-agnostic)
    const sttProvider = await ProviderRegistry.getSTTProvider();

    // Call provider through contract interface
    const audioBuffer = req.file.buffer;
    const text = await sttProvider.transcribe(audioBuffer);

    res.json({ text });
  } catch (error) {
    console.error('Transcription error:', error);
    res.status(500).json({ error: 'Failed to transcribe audio' });
  }
});

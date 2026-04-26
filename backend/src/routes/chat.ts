/**
 * Chat route — Haru AI tutor.
 *
 * Auth + credits: requires JWT (optionalAuth so anonymous demo also works for now).
 * Per-request key override: if `x-user-api-key` + `x-user-provider` are sent, use those
 * directly and skip credit deduction. Otherwise use the platform provider and consume one credit.
 *
 * Body shape: { message, context, subject?, language?, mode? }
 *   subject: 'math' | 'science' | 'english' | 'coding' | 'history' (default: 'general')
 *   language: 'en' | 'hi' (default: 'en')
 *   mode: 'tutor' | 'rubric' (default: 'tutor')
 */

import express, { Response } from 'express';
import { ProviderRegistry } from '../providers/registry.js';
import { ImageDetector } from '../utils/imageDetector.js';
import { ValidationMiddleware } from '../middleware/inputValidation.js';
import { optionalAuth, AuthRequest } from '../middleware/auth.js';
import { creditsService } from '../services/CreditsService.js';

export const chatRouter = express.Router();

type Subject = 'math' | 'science' | 'english' | 'coding' | 'history' | 'general';
type Mode = 'tutor' | 'rubric';

function buildSystemPrompt(subject: Subject, language: 'en' | 'hi', mode: Mode): string {
  const langLine = language === 'hi'
    ? 'Respond entirely in Hindi using Devanagari script. Use simple, conversational Hindi (हिंदी में सरल भाषा में जवाब दो).'
    : 'Respond in clear, friendly English.';

  if (mode === 'rubric') {
    return `You are Haru, a strict but kind AI evaluator. The user will paste an essay, code snippet, or written work. Score it 1–10 and give feedback as:
**Score:** N/10
**Strengths:** (2–3 bullets)
**Issues:** (2–3 bullets)
**Suggested fixes:** (2–3 actionable bullets)
${langLine}`;
  }

  const subjectGuidance: Record<Subject, string> = {
    math: 'You are tutoring **mathematics**. Use the Socratic method: do NOT give the full answer immediately. Give one hint, ask the student what they think, and build up step by step. Only give the full solution if the student explicitly asks "give me the answer".',
    coding: 'You are tutoring **programming**. Do NOT paste the full solution immediately. Lead the student through the problem with hints, pseudocode, and small code snippets. Only give the full code if they explicitly ask.',
    science: 'You are tutoring **science**. Use real-world analogies and reference visuals when helpful (say "see the diagram" so an image gets generated).',
    english: 'You are tutoring **English / language**. Focus on grammar, vocabulary, and writing. Give concrete examples.',
    history: 'You are tutoring **history**. Tell the story chronologically with key dates, people, and causes. Cite eras when helpful.',
    general: 'You are a general-purpose AI tutor. Adjust your depth to the student.',
  };

  return `You are Haru, a friendly anime-style 3D AI teacher. Your role:
- Explain concepts clearly, step by step.
- Be patient, encouraging, and concise (3–6 short paragraphs max).
- When a visual would help, naturally write phrases like "see the diagram" or "look at the image" — the system will auto-generate it.
- Use **bold** for key terms and short bullet lists when listing.

${subjectGuidance[subject]}

${langLine}`;
}

chatRouter.post('/', optionalAuth, ValidationMiddleware.chatMessage, async (req: AuthRequest, res: Response) => {
  try {
    const {
      message,
      context,
      subject = 'general',
      language = 'en',
      mode = 'tutor',
    }: {
      message: string;
      context?: string;
      subject?: Subject;
      language?: 'en' | 'hi';
      mode?: Mode;
    } = req.body;

    const userKey = req.headers['x-user-api-key'];
    const userProvider = req.headers['x-user-provider'];
    const useUserKey = typeof userKey === 'string' && userKey.length > 10
      && typeof userProvider === 'string' && ['groq', 'openai', 'gemini'].includes(userProvider);

    const userId = req.user?.userId;

    // If using platform key, require auth + credits.
    if (!useUserKey) {
      if (!userId) {
        return res.status(401).json({ error: 'Authentication required. Sign in or provide your own API key.' });
      }
      const balance = await creditsService.balance(userId);
      if (balance <= 0) {
        return res.status(402).json({
          error: 'Out of credits',
          message: 'You have used all your free credits. Upgrade your plan or add your own API key to continue.',
          balance: 0,
        });
      }
    }

    const aiProvider = useUserKey
      ? await ProviderRegistry.createAIProviderWithKey(userProvider as string, userKey as string)
      : await ProviderRegistry.getAIProvider();

    const systemPrompt = buildSystemPrompt(subject, language, mode);
    const fullMessage = context ? `Previous conversation:\n${context}\n\nStudent: ${message}` : message;

    const response = await aiProvider.chat(fullMessage, systemPrompt);

    let generatedImages: string[] = [];
    if (mode === 'tutor' && ImageDetector.needsImages(response.text)) {
      const prompts = ImageDetector.extractPrompts(response.text, message).slice(0, 2);
      if (prompts.length) {
        try {
          const imageProvider = await ProviderRegistry.getImageProvider();
          const results = await Promise.all(
            prompts.map(({ prompt }) => imageProvider.generate(prompt).catch(() => null))
          );
          generatedImages = results.filter((u): u is string => !!u);
        } catch (err) {
          console.warn('Image generation failed (non-fatal):', err);
        }
      }
    }

    let remainingCredits: number | undefined;
    if (!useUserKey && userId) {
      remainingCredits = await creditsService.consume(userId, 1, 'chat');
    }

    res.json({
      response: response.text,
      images: generatedImages,
      metadata: {
        subject,
        language,
        mode,
        usedUserKey: useUserKey,
        remainingCredits,
      },
    });
  } catch (error: any) {
    console.error('Chat error:', error);
    res.status(500).json({ error: 'Failed to process chat request', message: error?.message });
  }
});

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
import { evaluate as evaluateLearning, promptInjection } from '../services/LearningSignals.js';

export const chatRouter = express.Router();

type Subject = 'math' | 'science' | 'english' | 'coding' | 'history' | 'general';
type Mode = 'tutor' | 'rubric';
type Language = 'en' | 'hi' | 'ta' | 'te' | 'kn' | 'bn';

const LANGUAGE_LINES: Record<Language, string> = {
  en: 'Respond in clear, friendly English.',
  hi: 'Respond entirely in Hindi using Devanagari script. Use simple, conversational Hindi (हिंदी में सरल भाषा में जवाब दो).',
  ta: 'Respond entirely in Tamil using Tamil script (தமிழ் எழுத்தில் பதிலளிக்கவும்). Use simple, conversational Tamil.',
  te: 'Respond entirely in Telugu using Telugu script (తెలుగు లిపిలో సమాధానం ఇవ్వండి). Use simple, conversational Telugu.',
  kn: 'Respond entirely in Kannada using Kannada script (ಕನ್ನಡ ಲಿಪಿಯಲ್ಲಿ ಉತ್ತರಿಸಿ). Use simple, conversational Kannada.',
  bn: 'Respond entirely in Bengali using Bengali script (বাংলা লিপিতে উত্তর দিন). Use simple, conversational Bengali.',
};

function buildSystemPrompt(subject: Subject, language: Language, mode: Mode): string {
  const langLine = LANGUAGE_LINES[language] || LANGUAGE_LINES.en;

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
- IMPORTANT: When explaining ANY concept, ALWAYS mention visual aids by using phrases like "see the diagram", "look at the image", "observe the picture", or "view the illustration" — the system will automatically generate relevant images to help students understand better.
- For math, science, history, or any visual topic, explicitly reference visuals (e.g., "see the diagram of the water cycle", "look at the image of the solar system").
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
      language?: Language;
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

    // Cognitive-load detection: scan user message + last AI turn from context.
    const lastAiText = extractLastAiTurn(context);
    const learning = evaluateLearning(userId, message, lastAiText);

    const systemPrompt = buildSystemPrompt(subject, language, mode) + promptInjection(learning);
    const fullMessage = context ? `Previous conversation:\n${context}\n\nStudent: ${message}` : message;

    const response = await aiProvider.chat(fullMessage, systemPrompt);

    // Visual aids: fetch up to 3 distinct images per turn.  Each prompt is
    // biased toward instructional/diagram imagery so Pexels returns
    // classroom-style photos (whiteboards, schematics, scientific shots)
    // rather than arbitrary lifestyle stock photography.  Gated by
    // ENABLE_IMAGES so an offline demo still works.
    let generatedImages: string[] = [];
    const imagesEnabled = String(process.env.ENABLE_IMAGES || '').toLowerCase() === 'true';
    console.log(`🎨 Images enabled: ${imagesEnabled}, Mode: ${mode}`);
    
    if (imagesEnabled && mode === 'tutor') {
      // Check if AI response mentions visuals OR if user question is visual
      const aiNeedsImages = ImageDetector.needsImages(response.text);
      const userNeedsImages = ImageDetector.needsImages(message);
      
      console.log(`🔍 Image detection - AI needs: ${aiNeedsImages}, User needs: ${userNeedsImages}`);
      
      if (aiNeedsImages || userNeedsImages) {
        const prompts = ImageDetector.extractPrompts(response.text, message).slice(0, 3);
        
        console.log(`📝 Extracted ${prompts.length} prompts:`, prompts.map(p => p.prompt));
        
        // If no prompts extracted but images are needed, use the user's question
        if (prompts.length === 0 && userNeedsImages) {
          console.log(`💡 No prompts extracted, using user question as fallback`);
          prompts.push({ prompt: message, priority: 5 });
        }
        
        if (prompts.length) {
          try {
            const imageProvider = await ProviderRegistry.getImageProvider();
            console.log(`🖼️ Generating ${prompts.length} images...`);
            
            const results = await Promise.all(
              prompts.map(({ prompt }) => {
                // Bias toward instructional imagery.  Three suffixes cycled so
                // we don't get three identical shots of the same whiteboard.
                const idx = prompts.indexOf(prompts.find((p) => p.prompt === prompt)!);
                const bias = ['diagram', 'infographic education', 'science illustration'][idx % 3];
                const biasedQuery = `${prompt} ${bias}`.trim();
                console.log(`   → Query ${idx + 1}: "${biasedQuery}"`);
                return imageProvider.generate(biasedQuery).catch((err) => {
                  console.error(`   ✗ Failed to generate image for "${biasedQuery}":`, err.message);
                  return null;
                });
              })
            );
            // Drop nulls + dedupe by URL so we never show the same image twice.
            const seen = new Set<string>();
            generatedImages = results.filter((u): u is string => {
              if (!u || seen.has(u)) return false;
              seen.add(u);
              return true;
            });
            console.log(`✅ Successfully generated ${generatedImages.length} images`);
          } catch (err) {
            console.warn('Image generation failed (non-fatal):', err);
          }
        }
      } else {
        console.log(`ℹ️ No images needed for this response`);
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
        // Frontend uses these to drive avatar expression + show "let's build up" cue.
        confusion: learning.isConfused,
        pivotedConcept: learning.shouldPivot ? learning.detectedConcept : null,
        prerequisite: learning.shouldPivot ? learning.prerequisite : null,
      },
    });
  } catch (error: any) {
    console.error('Chat error:', error);
    res.status(500).json({ error: 'Failed to process chat request', message: error?.message });
  }
});

/**
 * Pull the most recent assistant turn out of a flat conversation context string.
 * Frontend formats history as alternating "User: ..." / "AI: ..." lines.
 */
function extractLastAiTurn(context?: string): string | undefined {
  if (!context) return undefined;
  const lines = context.split('\n').reverse();
  for (const line of lines) {
    const m = line.match(/^(?:AI|Assistant|Haru):\s*(.+)$/i);
    if (m) return m[1];
  }
  return undefined;
}

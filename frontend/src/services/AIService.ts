/**
 * AI Service — talks to the Haru AI backend.
 * Sends JWT + optional user-supplied API key + subject/language/mode from the store.
 * Updates credits in the store from the response metadata.
 */

import axios from 'axios';
import { AIResponse } from '../types';
import { GestureRouter } from './GestureRouter';
import { sessionManager } from './SessionManager';
import { HARU_GREETING_MESSAGE } from '../config/systemPrompt';
import { useAppStore } from '../store/useAppStore';
import { detectLanguage } from '../utils/languageDetect';

const API_BASE_URL = import.meta.env.VITE_API_URL || 'http://localhost:3001/api';

export class AIService {
  private buildHeaders(): Record<string, string> {
    const { token, userApiKey, userApiProvider } = useAppStore.getState();
    const headers: Record<string, string> = { 'Content-Type': 'application/json' };
    if (token) headers['Authorization'] = `Bearer ${token}`;
    if (userApiKey && userApiProvider) {
      headers['x-user-api-key'] = userApiKey;
      headers['x-user-provider'] = userApiProvider;
    }
    return headers;
  }

  public async query(userInput: string): Promise<AIResponse> {
    try {
      const store = useAppStore.getState();
      const { subject, mode } = store;
      // Auto-detect language from the user message and update the store so
      // voice + UI reflect it. The manual toggle in the navbar still wins:
      // if the user explicitly switched to Hindi but typed in English, we
      // respect the toggle rather than flipping back.
      const detected = detectLanguage(userInput);
      let language = store.language;
      // Promote to detected Indic language whenever its script dominates the
      // input — strong signal the student wants to converse in that language.
      if (detected !== 'en' && detected !== language) {
        store.setLanguage(detected);
        language = detected;
      }
      const conversationHistory = sessionManager.getConversationHistory();

      const response = await axios.post(
        `${API_BASE_URL}/chat`,
        {
          message: userInput,
          context: conversationHistory,
          subject,
          language,
          mode,
        },
        { headers: this.buildHeaders() }
      );

      const aiText: string = response.data.response || '';
      sessionManager.addExchange(userInput, aiText);

      const segments = GestureRouter.parseTeachingContent(aiText);
      const optimizedSegments = GestureRouter.optimizeSegments(segments);
      const images = this.extractImageUrls(response.data.images || []);

      const remaining = response.data?.metadata?.remainingCredits;
      if (typeof remaining === 'number') {
        useAppStore.getState().setCredits(remaining);
      }

      // Successful exchange counts as activity for the streak system.
      useAppStore.getState().recordStreakActivity();

      return { text: aiText, segments: optimizedSegments, images };
    } catch (error) {
      if (axios.isAxiosError(error)) {
        const status = error.response?.status;
        if (status === 401) {
          throw new Error('Please sign in to keep chatting with Haru.');
        }
        if (status === 402) {
          useAppStore.getState().setCredits(0);
          useAppStore.getState().setUpgradeOpen(true);
          throw new Error('Out of credits. Upgrade or use your own API key.');
        }
        if (status === 429) {
          throw new Error('Slow down a moment — you are sending requests too quickly.');
        }
        if (error.code === 'ERR_NETWORK' || error.code === 'ECONNREFUSED') {
          throw new Error('Cannot reach the Haru backend. Is `npm run dev` running?');
        }
        const serverMsg = error.response?.data?.error || error.response?.data?.message;
        if (serverMsg) throw new Error(serverMsg);
      }
      throw new Error('Failed to get AI response. Please try again.');
    }
  }

  public async searchImages(query: string): Promise<string[]> {
    try {
      const response = await axios.post(
        `${API_BASE_URL}/images/search`,
        { query, count: 3 },
        { headers: this.buildHeaders() }
      );
      return this.extractImageUrls(response.data.images || []);
    } catch (error) {
      console.error('Image search error:', error);
      return [];
    }
  }

  public async generateImage(description: string): Promise<string | null> {
    try {
      const response = await axios.post(
        `${API_BASE_URL}/images/generate`,
        { prompt: description },
        { headers: this.buildHeaders() }
      );
      return response.data.imageUrl || null;
    } catch (error) {
      console.error('Image generation error:', error);
      return null;
    }
  }

  private extractImageUrls(images: unknown[]): string[] {
    return images
      .map((img) => {
        if (typeof img === 'string') return img;
        if (img && typeof img === 'object') {
          const o = img as Record<string, unknown>;
          if (typeof o.url === 'string') return o.url;
          if (typeof o.imageUrl === 'string') return o.imageUrl;
        }
        return null;
      })
      .filter((url): url is string => url !== null);
  }

  public getGreeting(): AIResponse {
    return {
      text: HARU_GREETING_MESSAGE,
      segments: [{ type: 'text', content: HARU_GREETING_MESSAGE, gesture: 'greeting' }],
      images: [],
    };
  }
}

export const aiService = new AIService();

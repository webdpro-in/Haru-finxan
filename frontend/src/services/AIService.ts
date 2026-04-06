/**
 * AI Service - Handles communication with the Finxan AI backend
 * Routes queries through the backend (Groq / any provider) and processes responses
 * into structured teaching segments with gesture cues for Haru.
 */

import axios from 'axios';
import { AIResponse } from '../types';
import { GestureRouter } from './GestureRouter';
import { sessionManager } from './SessionManager';
import { HARU_SYSTEM_PROMPT, HARU_GREETING_MESSAGE } from '../config/systemPrompt';

const API_BASE_URL = import.meta.env.VITE_API_URL || 'http://localhost:3001/api';

export class AIService {
  /**
   * Send user query to AI and get a structured teaching response
   * Images are generated in parallel on the backend
   */
  public async query(userInput: string): Promise<AIResponse> {
    try {
      const conversationHistory = sessionManager.getConversationHistory();

      // Get AI response with parallel image generation on backend
      const response = await axios.post(`${API_BASE_URL}/chat`, {
        message: userInput,
        context: conversationHistory,
        systemPrompt: HARU_SYSTEM_PROMPT,
      });

      console.log('🔍 Raw backend response:', response.data);

      const aiText: string = response.data.response || '';
      console.log(`📝 AI text length: ${aiText.length}`);

      // Add to session history
      sessionManager.addExchange(userInput, aiText);

      // Parse into teaching segments with gesture cues
      const segments = GestureRouter.parseTeachingContent(aiText);
      const optimizedSegments = GestureRouter.optimizeSegments(segments);

      // Extract images from backend response
      const images = this.extractImageUrls(response.data.images || []);

      console.log(`📦 Received response: ${images.length} images generated`);
      console.log('🖼️ Image URLs:', images);

      return {
        text: aiText,
        segments: optimizedSegments,
        images,
      };
    } catch (error) {
      console.error('AI query error:', error);

      if (axios.isAxiosError(error)) {
        if (error.response?.status === 401) {
          throw new Error('API authentication failed. Please check the API key in backend .env');
        } else if (error.response?.status === 429) {
          throw new Error('Rate limit exceeded. Please wait a moment and try again.');
        } else if (error.code === 'ERR_NETWORK' || error.code === 'ECONNREFUSED') {
          throw new Error('Cannot connect to Finxan backend. Make sure `npm run dev` is running in the backend folder.');
        }
        const serverMsg = error.response?.data?.error;
        if (serverMsg) throw new Error(`Server error: ${serverMsg}`);
      }

      throw new Error('Failed to get AI response. Please try again.');
    }
  }

  /**
   * Search for images related to a query
   */
  public async searchImages(query: string): Promise<string[]> {
    try {
      const response = await axios.post(`${API_BASE_URL}/images/search`, { query, count: 3 });
      return this.extractImageUrls(response.data.images || []);
    } catch (error) {
      console.error('Image search error:', error);
      return [];
    }
  }

  /**
   * Generate an image for a description
   */
  public async generateImage(description: string): Promise<string | null> {
    try {
      const response = await axios.post(`${API_BASE_URL}/images/generate`, { prompt: description });
      return response.data.imageUrl || null;
    } catch (error) {
      console.error('Image generation error:', error);
      return null;
    }
  }

  private extractImageUrls(images: unknown[]): string[] {
    return images
      .map(img => {
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

  /**
   * Get the initial greeting response for Haru on load
   */
  public getGreeting(): AIResponse {
    return {
      text: HARU_GREETING_MESSAGE,
      segments: [
        {
          type: 'text',
          content: HARU_GREETING_MESSAGE,
          gesture: 'greeting',
        },
      ],
      images: [],
    };
  }
}

// Singleton instance
export const aiService = new AIService();

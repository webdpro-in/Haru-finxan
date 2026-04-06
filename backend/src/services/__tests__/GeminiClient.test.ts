/**
 * Unit tests for GeminiClient
 */

import { describe, it, expect, beforeEach, vi } from 'vitest';
import { GeminiClient } from '../GeminiClient.js';

describe('GeminiClient', () => {
  let client: GeminiClient;

  beforeEach(() => {
    client = new GeminiClient({
      apiKey: 'test-api-key',
      model: 'gemini-2.0-flash',
      maxRetries: 2,
      baseDelay: 100,
      maxDelay: 1000,
      timeout: 5000,
    });
  });

  describe('constructor', () => {
    it('should create client with valid config', () => {
      expect(client).toBeDefined();
      expect(client.getUsageStats()).toEqual({
        requestCount: 0,
        tokenCount: 0,
        errorCount: 0,
        lastRequestTime: 0,
      });
    });

    it('should throw error if API key is missing', () => {
      expect(() => {
        new GeminiClient({
          apiKey: '',
          model: 'gemini-2.0-flash',
        });
      }).toThrow('Gemini API key is required');
    });
  });

  describe('getUsageStats', () => {
    it('should return initial usage stats', () => {
      const stats = client.getUsageStats();
      expect(stats.requestCount).toBe(0);
      expect(stats.tokenCount).toBe(0);
      expect(stats.errorCount).toBe(0);
    });
  });

  describe('resetUsageStats', () => {
    it('should reset usage statistics', () => {
      // Manually set some stats
      const stats = client.getUsageStats();
      stats.requestCount = 10;
      stats.tokenCount = 1000;
      
      client.resetUsageStats();
      
      const newStats = client.getUsageStats();
      expect(newStats.requestCount).toBe(0);
      expect(newStats.tokenCount).toBe(0);
      expect(newStats.errorCount).toBe(0);
    });
  });

  describe('buildPayload', () => {
    it('should build payload with message and system prompt', () => {
      const message = 'What is 2+2?';
      const systemPrompt = 'You are a helpful math tutor.';
      
      // Access private method through any cast for testing
      const payload = (client as any).buildPayload(message, systemPrompt);
      
      expect(payload.contents).toHaveLength(2);
      expect(payload.contents[0].parts[0].text).toBe(systemPrompt);
      expect(payload.contents[1].parts[0].text).toBe(message);
    });

    it('should include history in payload', () => {
      const message = 'And what about 3+3?';
      const systemPrompt = 'You are a helpful math tutor.';
      const history = [
        { role: 'user', content: 'What is 2+2?' },
        { role: 'assistant', content: '2+2 equals 4.' },
      ];
      
      const payload = (client as any).buildPayload(message, systemPrompt, history);
      
      expect(payload.contents).toHaveLength(3);
      expect(payload.contents[0].parts[0].text).toBe('What is 2+2?');
      expect(payload.contents[1].parts[0].text).toBe('2+2 equals 4.');
      expect(payload.contents[2].parts[0].text).toBe(message);
    });
  });

  describe('calculateBackoff', () => {
    it('should calculate exponential backoff', () => {
      const delay0 = (client as any).calculateBackoff(0);
      const delay1 = (client as any).calculateBackoff(1);
      const delay2 = (client as any).calculateBackoff(2);
      
      // Delays should increase exponentially (with jitter)
      expect(delay0).toBeGreaterThanOrEqual(100);
      expect(delay0).toBeLessThanOrEqual(130); // 100 + 30% jitter
      
      expect(delay1).toBeGreaterThanOrEqual(200);
      expect(delay1).toBeLessThanOrEqual(260);
      
      expect(delay2).toBeGreaterThanOrEqual(400);
      expect(delay2).toBeLessThanOrEqual(520);
    });

    it('should not exceed max delay', () => {
      const delay = (client as any).calculateBackoff(10);
      expect(delay).toBeLessThanOrEqual(1000); // maxDelay
    });
  });

  describe('extractTextFromResponse', () => {
    it('should extract text from valid response', () => {
      const response = {
        candidates: [
          {
            content: {
              parts: [{ text: 'Hello, ' }, { text: 'world!' }],
              role: 'model',
            },
            finishReason: 'STOP',
            index: 0,
            safetyRatings: [],
          },
        ],
      };
      
      const text = (client as any).extractTextFromResponse(response);
      expect(text).toBe('Hello, world!');
    });

    it('should return empty string for response with no candidates', () => {
      const response = {
        candidates: [],
      };
      
      const text = (client as any).extractTextFromResponse(response);
      expect(text).toBe('');
    });
  });

  describe('extractResponse', () => {
    it('should extract complete response with usage metadata', () => {
      const apiResponse = {
        candidates: [
          {
            content: {
              parts: [{ text: 'Test response' }],
              role: 'model',
            },
            finishReason: 'STOP',
            index: 0,
            safetyRatings: [],
          },
        ],
        usageMetadata: {
          promptTokenCount: 10,
          candidatesTokenCount: 5,
          totalTokenCount: 15,
        },
      };
      
      const response = (client as any).extractResponse(apiResponse);
      
      expect(response.text).toBe('Test response');
      expect(response.finishReason).toBe('STOP');
      expect(response.usage).toEqual({
        promptTokens: 10,
        completionTokens: 5,
        totalTokens: 15,
      });
    });

    it('should throw error for empty candidates', () => {
      const apiResponse = {
        candidates: [],
      };
      
      expect(() => {
        (client as any).extractResponse(apiResponse);
      }).toThrow('No response from Gemini API');
    });
  });
});

/**
 * Unit tests for FallbackResponses
 */

import { describe, it, expect } from 'vitest';
import { FallbackResponses } from '../FallbackResponses.js';

describe('FallbackResponses', () => {
  describe('getFallbackResponse', () => {
    it('should return timeout response', () => {
      const response = FallbackResponses.getFallbackResponse({
        studentName: 'Alice',
        errorType: 'timeout',
      });

      expect(response).toContain('Alice');
      expect(response).toContain('taking a bit longer');
      expect(response).toContain('Rephrase your question');
    });

    it('should return rate limit response', () => {
      const response = FallbackResponses.getFallbackResponse({
        studentName: 'Bob',
        errorType: 'rate_limit',
      });

      expect(response).toContain('Bob');
      expect(response).toContain('lot of questions');
      expect(response).toContain('moment to catch up');
    });

    it('should return network error response', () => {
      const response = FallbackResponses.getFallbackResponse({
        studentName: 'Charlie',
        errorType: 'network_error',
      });

      expect(response).toContain('Charlie');
      expect(response).toContain('trouble connecting');
      expect(response).toContain('internet connection');
    });

    it('should return generic fallback for unknown error', () => {
      const response = FallbackResponses.getFallbackResponse({
        studentName: 'Diana',
        topic: 'Algebra',
      });

      expect(response).toContain('Diana');
      expect(response).toContain('technical issue');
      expect(response).toContain('Algebra');
    });

    it('should use default name when not provided', () => {
      const response = FallbackResponses.getFallbackResponse({
        errorType: 'timeout',
      });

      expect(response).toContain('Hi there');
    });
  });

  describe('getTopicTips', () => {
    it('should return fraction tips', () => {
      const tips = FallbackResponses.getTopicTips('fractions', 5);

      expect(tips).toContain('Fractions Tips');
      expect(tips).toContain('pizza');
      expect(tips).toContain('denominator');
      expect(tips).toContain('numerator');
    });

    it('should return algebra tips', () => {
      const tips = FallbackResponses.getTopicTips('algebra', 8);

      expect(tips).toContain('Algebra Tips');
      expect(tips).toContain('balanced scale');
      expect(tips).toContain('step by step');
    });

    it('should return geometry tips', () => {
      const tips = FallbackResponses.getTopicTips('geometry', 7);

      expect(tips).toContain('Geometry Tips');
      expect(tips).toContain('diagrams');
      expect(tips).toContain('formulas');
    });

    it('should return photosynthesis tips', () => {
      const tips = FallbackResponses.getTopicTips('photosynthesis', 6);

      expect(tips).toContain('Photosynthesis Tips');
      expect(tips).toContain('sunlight');
      expect(tips).toContain('Carbon Dioxide');
    });

    it('should return force and motion tips', () => {
      const tips = FallbackResponses.getTopicTips('force and motion', 9);

      expect(tips).toContain('Force & Motion Tips');
      expect(tips).toContain('push or pull');
      expect(tips).toContain('Newton');
    });

    it('should return generic tips for unknown topic', () => {
      const tips = FallbackResponses.getTopicTips('unknown topic', 10);

      expect(tips).toContain('General Learning Tips');
      expect(tips).toContain('Break complex problems');
      expect(tips).toContain('practice');
    });
  });

  describe('getEncouragementMessage', () => {
    it('should return an encouragement message', () => {
      const message = FallbackResponses.getEncouragementMessage();

      expect(message).toBeTruthy();
      expect(message.length).toBeGreaterThan(0);
      // Should contain emoji
      expect(/[🌟💡💪🚀🌈⭐💙🎯]/.test(message)).toBe(true);
    });

    it('should return different messages on multiple calls', () => {
      const messages = new Set();
      
      // Call multiple times to get different messages
      for (let i = 0; i < 20; i++) {
        messages.add(FallbackResponses.getEncouragementMessage());
      }

      // Should have at least 2 different messages
      expect(messages.size).toBeGreaterThan(1);
    });
  });

  describe('getRecoverySuggestion', () => {
    it('should return timeout recovery suggestion', () => {
      const suggestion = FallbackResponses.getRecoverySuggestion('timeout');

      expect(suggestion).toContain('simpler question');
      expect(suggestion).toContain('breaking');
    });

    it('should return rate limit recovery suggestion', () => {
      const suggestion = FallbackResponses.getRecoverySuggestion('rate_limit');

      expect(suggestion).toContain('wait a moment');
      expect(suggestion).toContain('try again');
    });

    it('should return network error recovery suggestion', () => {
      const suggestion = FallbackResponses.getRecoverySuggestion('network_error');

      expect(suggestion).toContain('internet connection');
      expect(suggestion).toContain('refreshing');
    });

    it('should return generic recovery suggestion', () => {
      const suggestion = FallbackResponses.getRecoverySuggestion();

      expect(suggestion).toContain('refreshing');
      expect(suggestion).toContain('again');
    });
  });
});

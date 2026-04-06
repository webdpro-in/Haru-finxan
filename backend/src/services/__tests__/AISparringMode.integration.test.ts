/**
 * AI Sparring Mode Integration Tests
 * Task 26.3: Write integration tests for sparring mode
 * 
 * Tests end-to-end AI Sparring Mode flow:
 * - Counter-argument generation with real GeminiClient integration
 * - Multi-turn debate flow with argument history
 * - Grade-level adaptation in practice
 * - Error handling and fallback behavior
 * - Response quality validation (respectful tone, critical thinking focus)
 * - Integration with debate context
 * - Performance and timeout handling
 * 
 * Requirements tested:
 * - REQ-2.10.1: System SHALL provide AI Sparring Mode for intellectual challenge
 * - REQ-2.10.2: System SHALL generate thoughtful counter-arguments
 * - REQ-2.10.3: System SHALL challenge students to defend positions
 * - REQ-2.10.4: System SHALL maintain respectful tone
 * - REQ-2.10.5: System SHALL focus on critical thinking, not being right
 */

import { describe, it, expect, beforeEach, vi, afterEach } from 'vitest';
import { AISparringMode, CounterArgumentOptions } from '../AISparringMode.js';
import { GeminiClient, GeminiConfig } from '../GeminiClient.js';

// Real GeminiClient with mocked fetch for integration testing
let realGeminiClient: GeminiClient;
let mockFetchResponse: any;

// Mock fetch globally
global.fetch = vi.fn();

describe('AISparringMode Integration Tests', () => {
  beforeEach(() => {
    vi.clearAllMocks();

    // Create real GeminiClient with test config
    const config: GeminiConfig = {
      apiKey: 'test-api-key',
      model: 'gemini-pro',
      maxRetries: 2,
      baseDelay: 100,
      timeout: 5000
    };

    realGeminiClient = new GeminiClient(config);

    // Default mock response
    mockFetchResponse = {
      ok: true,
      status: 200,
      json: async () => ({
        candidates: [{
          content: {
            parts: [{ 
              text: "I understand your perspective on homework. However, let me challenge that idea: what if homework serves a different purpose than initial learning? Research shows that spaced repetition strengthens memory. How would you respond to that?" 
            }],
            role: 'model'
          },
          finishReason: 'STOP',
          index: 0,
          safetyRatings: []
        }],
        usageMetadata: {
          promptTokenCount: 150,
          candidatesTokenCount: 50,
          totalTokenCount: 200
        }
      })
    };

    vi.mocked(global.fetch).mockResolvedValue(mockFetchResponse as any);
  });

  afterEach(() => {
    vi.restoreAllMocks();
  });

  describe('REQ-2.10.1 & REQ-2.10.2: End-to-End Counter-Argument Generation', () => {
    it('should generate counter-argument with real GeminiClient integration', async () => {
      const sparringMode = new AISparringMode(realGeminiClient);

      const options: CounterArgumentOptions = {
        studentArgument: 'I think homework is useless because we already learn everything in class',
        topic: 'Education',
        studentName: 'Alice',
        grade: 8
      };

      const result = await sparringMode.generateCounterArgument(options);

      // Verify response structure
      expect(result).toBeTruthy();
      expect(result.length).toBeGreaterThan(50);

      // Verify fetch was called with correct structure
      expect(global.fetch).toHaveBeenCalledTimes(1);
      const fetchCall = vi.mocked(global.fetch).mock.calls[0];
      expect(fetchCall[0]).toContain('generativelanguage.googleapis.com');
      expect(fetchCall[0]).toContain('gemini-pro');

      // Verify request payload structure
      const requestBody = JSON.parse(fetchCall[1]?.body as string);
      expect(requestBody).toHaveProperty('contents');
      expect(requestBody.contents).toBeInstanceOf(Array);
      expect(requestBody.contents.length).toBeGreaterThan(0);
    });

    it('should include sparring mode instructions in system prompt', async () => {
      const sparringMode = new AISparringMode(realGeminiClient);

      const options: CounterArgumentOptions = {
        studentArgument: 'Social media is harmful',
        topic: 'Technology'
      };

      await sparringMode.generateCounterArgument(options);

      const fetchCall = vi.mocked(global.fetch).mock.calls[0];
      const requestBody = JSON.parse(fetchCall[1]?.body as string);
      const systemPrompt = requestBody.contents[0].parts[0].text;

      // REQ-2.10.4: Verify respectful tone guidelines
      expect(systemPrompt).toContain('respectful');
      expect(systemPrompt).toContain('TONE GUIDELINES');
      expect(systemPrompt.toLowerCase()).toContain('acknowledge');

      // REQ-2.10.5: Verify critical thinking focus
      expect(systemPrompt).toContain('critical thinking');
      expect(systemPrompt).toContain('NOT about being right');

      // REQ-2.10.3: Verify challenge instructions
      expect(systemPrompt).toContain('Challenge them');
      expect(systemPrompt).toContain('defend their position');
    });

    it('should handle API response with usage metadata', async () => {
      const sparringMode = new AISparringMode(realGeminiClient);

      const options: CounterArgumentOptions = {
        studentArgument: 'Climate change is not a priority',
        topic: 'Environmental Science'
      };

      const result = await sparringMode.generateCounterArgument(options);

      expect(result).toBeTruthy();
      
      // Verify GeminiClient tracked usage
      const stats = realGeminiClient.getUsageStats();
      expect(stats.requestCount).toBe(1);
      expect(stats.tokenCount).toBe(200);
      expect(stats.errorCount).toBe(0);
    });
  });

  describe('REQ-2.10.3: Multi-Turn Debate Flow', () => {
    it('should maintain context across multiple debate turns', async () => {
      const sparringMode = new AISparringMode(realGeminiClient);

      const previousArguments = [
        'Homework is useless',
        'We already learn in class',
        'It takes too much time'
      ];

      const options: CounterArgumentOptions = {
        studentArgument: 'But that still doesn\'t prove homework is necessary',
        topic: 'Education',
        studentName: 'Bob',
        grade: 9,
        previousArguments
      };

      await sparringMode.generateCounterArgument(options);

      const fetchCall = vi.mocked(global.fetch).mock.calls[0];
      const requestBody = JSON.parse(fetchCall[1]?.body as string);
      const systemPrompt = requestBody.contents[0].parts[0].text;

      // Verify previous arguments are included
      expect(systemPrompt).toContain('PREVIOUS ARGUMENTS');
      expect(systemPrompt).toContain('Homework is useless');
      expect(systemPrompt).toContain('We already learn in class');
    });

    it('should limit previous arguments to last 3 for context management', async () => {
      const sparringMode = new AISparringMode(realGeminiClient);

      const manyArguments = [
        'Argument 1',
        'Argument 2',
        'Argument 3',
        'Argument 4',
        'Argument 5',
        'Argument 6'
      ];

      const options: CounterArgumentOptions = {
        studentArgument: 'Current argument',
        topic: 'Test Topic',
        previousArguments: manyArguments
      };

      await sparringMode.generateCounterArgument(options);

      const fetchCall = vi.mocked(global.fetch).mock.calls[0];
      const requestBody = JSON.parse(fetchCall[1]?.body as string);
      const systemPrompt = requestBody.contents[0].parts[0].text;

      // Should only include last 3
      expect(systemPrompt).toContain('Argument 4');
      expect(systemPrompt).toContain('Argument 5');
      expect(systemPrompt).toContain('Argument 6');
      expect(systemPrompt).not.toContain('Argument 1');
      expect(systemPrompt).not.toContain('Argument 2');
    });

    it('should handle debate context for continuity', async () => {
      const sparringMode = new AISparringMode(realGeminiClient);

      const options: CounterArgumentOptions = {
        studentArgument: 'Video games are educational',
        topic: 'Gaming and Learning',
        debateContext: 'Discussing the educational value of video games in classroom settings'
      };

      await sparringMode.generateCounterArgument(options);

      const fetchCall = vi.mocked(global.fetch).mock.calls[0];
      const requestBody = JSON.parse(fetchCall[1]?.body as string);
      const systemPrompt = requestBody.contents[0].parts[0].text;

      expect(systemPrompt).toContain('DEBATE CONTEXT');
      expect(systemPrompt).toContain('educational value of video games');
    });
  });

  describe('Grade-Level Adaptation', () => {
    it('should adapt language for elementary students', async () => {
      const sparringMode = new AISparringMode(realGeminiClient);

      const options: CounterArgumentOptions = {
        studentArgument: 'Sharing is hard',
        topic: 'Social Skills',
        grade: 3
      };

      await sparringMode.generateCounterArgument(options);

      const fetchCall = vi.mocked(global.fetch).mock.calls[0];
      const requestBody = JSON.parse(fetchCall[1]?.body as string);
      const systemPrompt = requestBody.contents[0].parts[0].text;

      expect(systemPrompt).toContain('GRADE LEVEL: 3');
      expect(systemPrompt).toContain('age-appropriate language');
    });

    it('should adapt complexity for high school students', async () => {
      const sparringMode = new AISparringMode(realGeminiClient);

      const options: CounterArgumentOptions = {
        studentArgument: 'Quantum mechanics defies classical physics',
        topic: 'Physics',
        grade: 11
      };

      await sparringMode.generateCounterArgument(options);

      const fetchCall = vi.mocked(global.fetch).mock.calls[0];
      const requestBody = JSON.parse(fetchCall[1]?.body as string);
      const systemPrompt = requestBody.contents[0].parts[0].text;

      expect(systemPrompt).toContain('GRADE LEVEL: 11');
      expect(systemPrompt).toContain('concepts they should understand at this grade');
    });

    it('should work without grade level specified', async () => {
      const sparringMode = new AISparringMode(realGeminiClient);

      const options: CounterArgumentOptions = {
        studentArgument: 'Democracy is the best system',
        topic: 'Political Science'
      };

      const result = await sparringMode.generateCounterArgument(options);

      expect(result).toBeTruthy();
      
      const fetchCall = vi.mocked(global.fetch).mock.calls[0];
      const requestBody = JSON.parse(fetchCall[1]?.body as string);
      const systemPrompt = requestBody.contents[0].parts[0].text;

      expect(systemPrompt).not.toContain('GRADE LEVEL');
    });
  });

  describe('Error Handling and Fallback Behavior', () => {
    it('should retry on API failure with exponential backoff', async () => {
      const sparringMode = new AISparringMode(realGeminiClient);

      // First two calls fail, third succeeds
      vi.mocked(global.fetch)
        .mockRejectedValueOnce(new Error('Network error'))
        .mockRejectedValueOnce(new Error('Network error'))
        .mockResolvedValueOnce(mockFetchResponse as any);

      const options: CounterArgumentOptions = {
        studentArgument: 'Test argument',
        topic: 'Test Topic'
      };

      const result = await sparringMode.generateCounterArgument(options);

      expect(result).toBeTruthy();
      expect(global.fetch).toHaveBeenCalledTimes(3);
    });

    it('should return fallback response after max retries', async () => {
      const sparringMode = new AISparringMode(realGeminiClient);

      // All calls fail
      vi.mocked(global.fetch).mockRejectedValue(new Error('API unavailable'));

      const options: CounterArgumentOptions = {
        studentArgument: 'Artificial intelligence will replace teachers',
        topic: 'Education Technology'
      };

      const result = await sparringMode.generateCounterArgument(options);

      // Should return fallback response
      expect(result).toBeTruthy();
      expect(result.length).toBeGreaterThan(50);
      expect(result.toLowerCase()).toContain('education technology');
      
      // Verify it's a respectful fallback - check for question marks (all fallbacks ask questions)
      expect(result).toContain('?');
      
      // Check for respectful language patterns
      const hasRespectfulPattern = 
        result.includes('interesting') ||
        result.includes('see where') ||
        result.includes('valid point') ||
        result.includes('thoughtful');
      expect(hasRespectfulPattern).toBe(true);
    });

    it('should handle malformed API responses gracefully', async () => {
      const sparringMode = new AISparringMode(realGeminiClient);

      // Return malformed response
      vi.mocked(global.fetch).mockResolvedValue({
        ok: true,
        status: 200,
        json: async () => ({
          candidates: [] // Empty candidates
        })
      } as any);

      const options: CounterArgumentOptions = {
        studentArgument: 'Test',
        topic: 'Test'
      };

      const result = await sparringMode.generateCounterArgument(options);

      // Should fall back to fallback response
      expect(result).toBeTruthy();
      expect(result.length).toBeGreaterThan(50);
    });

    it('should handle API timeout gracefully', async () => {
      const sparringMode = new AISparringMode(realGeminiClient);

      // Simulate timeout
      vi.mocked(global.fetch).mockImplementation(() => 
        new Promise((_, reject) => 
          setTimeout(() => reject(new Error('Timeout')), 100)
        )
      );

      const options: CounterArgumentOptions = {
        studentArgument: 'Test',
        topic: 'Test'
      };

      const result = await sparringMode.generateCounterArgument(options);

      // Should return fallback
      expect(result).toBeTruthy();
    });

    it('should track error count in usage stats', async () => {
      const sparringMode = new AISparringMode(realGeminiClient);

      vi.mocked(global.fetch).mockRejectedValue(new Error('API error'));

      const options: CounterArgumentOptions = {
        studentArgument: 'Test',
        topic: 'Test'
      };

      await sparringMode.generateCounterArgument(options);

      const stats = realGeminiClient.getUsageStats();
      expect(stats.errorCount).toBeGreaterThan(0);
    });
  });

  describe('REQ-2.10.4: Response Quality Validation - Respectful Tone', () => {
    it('should validate counter-arguments maintain respectful tone', async () => {
      const sparringMode = new AISparringMode(realGeminiClient);

      // Mock response with respectful language
      mockFetchResponse.json = async () => ({
        candidates: [{
          content: {
            parts: [{ 
              text: "I see where you're coming from with that perspective. However, let me offer an alternative viewpoint. What if we considered this from a different angle? I'd be interested to hear your thoughts on that." 
            }],
            role: 'model'
          },
          finishReason: 'STOP',
          index: 0,
          safetyRatings: []
        }]
      });

      const options: CounterArgumentOptions = {
        studentArgument: 'Test argument',
        topic: 'Test Topic'
      };

      const result = await sparringMode.generateCounterArgument(options);

      // Validate using the static method
      const isValid = AISparringMode.isValidCounterArgument(result);
      expect(isValid).toBe(true);

      // Check for respectful indicators
      const respectfulPhrases = ['see where', 'perspective', 'alternative', 'consider', 'thoughts'];
      const hasRespectful = respectfulPhrases.some(phrase => 
        result.toLowerCase().includes(phrase)
      );
      expect(hasRespectful).toBe(true);
    });

    it('should reject disrespectful responses', () => {
      const disrespectfulResponse = "You're wrong. That doesn't make any sense at all.";

      const isValid = AISparringMode.isValidCounterArgument(disrespectfulResponse);
      
      // Should be invalid due to lack of sparring indicators
      expect(isValid).toBe(false);
    });

    it('should validate responses have sufficient length', () => {
      const tooShort = "I disagree.";
      const sufficient = "I understand your point, but have you considered the alternative perspective? What if we looked at this differently?";

      expect(AISparringMode.isValidCounterArgument(tooShort)).toBe(false);
      expect(AISparringMode.isValidCounterArgument(sufficient)).toBe(true);
    });

    it('should validate responses contain sparring indicators', () => {
      const noIndicators = "This is a response without any engagement presented.";
      const withIndicators = "However, let me challenge that assumption. What if we considered a different approach?";

      expect(AISparringMode.isValidCounterArgument(noIndicators)).toBe(false);
      expect(AISparringMode.isValidCounterArgument(withIndicators)).toBe(true);
    });
  });

  describe('REQ-2.10.5: Critical Thinking Focus', () => {
    it('should include critical thinking prompts in system instructions', async () => {
      const sparringMode = new AISparringMode(realGeminiClient);

      const options: CounterArgumentOptions = {
        studentArgument: 'Renewable energy is too expensive',
        topic: 'Environmental Science'
      };

      await sparringMode.generateCounterArgument(options);

      const fetchCall = vi.mocked(global.fetch).mock.calls[0];
      const requestBody = JSON.parse(fetchCall[1]?.body as string);
      const systemPrompt = requestBody.contents[0].parts[0].text;

      expect(systemPrompt).toContain('critical thinking');
      expect(systemPrompt).toContain('NOT about being right');
      expect(systemPrompt.toLowerCase()).toContain('strengthen');
      expect(systemPrompt).toContain('alternative perspectives');
    });

    it('should encourage questioning assumptions', async () => {
      const sparringMode = new AISparringMode(realGeminiClient);

      const options: CounterArgumentOptions = {
        studentArgument: 'All students learn the same way',
        topic: 'Education'
      };

      await sparringMode.generateCounterArgument(options);

      const fetchCall = vi.mocked(global.fetch).mock.calls[0];
      const requestBody = JSON.parse(fetchCall[1]?.body as string);
      const systemPrompt = requestBody.contents[0].parts[0].text;

      expect(systemPrompt).toContain('challenge assumptions');
      expect(systemPrompt).toContain('probing questions');
    });
  });

  describe('Structured Counter-Argument Response', () => {
    it('should generate structured response with all components', async () => {
      const sparringMode = new AISparringMode(realGeminiClient);

      mockFetchResponse.json = async () => ({
        candidates: [{
          content: {
            parts: [{ 
              text: "I understand your concern about homework.\nHowever, research shows spaced repetition improves retention.\nWhat if homework serves a different purpose than you think?\nI'd love to hear your perspective on this." 
            }],
            role: 'model'
          },
          finishReason: 'STOP',
          index: 0,
          safetyRatings: []
        }]
      });

      const options: CounterArgumentOptions = {
        studentArgument: 'Homework is useless',
        topic: 'Education'
      };

      const result = await sparringMode.generateStructuredCounterArgument(options);

      expect(result).toHaveProperty('counterArgument');
      expect(result).toHaveProperty('acknowledgment');
      expect(result).toHaveProperty('challenge');
      expect(result).toHaveProperty('encouragement');

      expect(result.counterArgument).toBeTruthy();
      expect(result.acknowledgment).toBeTruthy();
      expect(result.challenge).toBeTruthy();
      expect(result.encouragement).toBeTruthy();
    });
  });

  describe('Performance and Timeout Handling', () => {
    it('should complete within acceptable time', async () => {
      const sparringMode = new AISparringMode(realGeminiClient);

      const options: CounterArgumentOptions = {
        studentArgument: 'Test argument',
        topic: 'Test Topic'
      };

      const startTime = Date.now();
      await sparringMode.generateCounterArgument(options);
      const duration = Date.now() - startTime;

      // Should complete quickly with mocked API
      expect(duration).toBeLessThan(1000);
    });

    it('should handle concurrent requests', async () => {
      const sparringMode = new AISparringMode(realGeminiClient);

      const requests = [
        {
          studentArgument: 'Argument 1',
          topic: 'Topic 1'
        },
        {
          studentArgument: 'Argument 2',
          topic: 'Topic 2'
        },
        {
          studentArgument: 'Argument 3',
          topic: 'Topic 3'
        }
      ];

      const results = await Promise.all(
        requests.map(options => sparringMode.generateCounterArgument(options))
      );

      expect(results).toHaveLength(3);
      results.forEach(result => {
        expect(result).toBeTruthy();
        expect(result.length).toBeGreaterThan(50);
      });
    });

    it('should respect timeout configuration', async () => {
      const shortTimeoutConfig: GeminiConfig = {
        apiKey: 'test-key',
        model: 'gemini-pro',
        timeout: 100 // Very short timeout
      };

      const shortTimeoutClient = new GeminiClient(shortTimeoutConfig);
      const sparringMode = new AISparringMode(shortTimeoutClient);

      // Simulate slow response
      vi.mocked(global.fetch).mockImplementation(() =>
        new Promise(resolve => setTimeout(() => resolve(mockFetchResponse as any), 200))
      );

      const options: CounterArgumentOptions = {
        studentArgument: 'Test',
        topic: 'Test'
      };

      // Should timeout and fall back
      const result = await sparringMode.generateCounterArgument(options);
      expect(result).toBeTruthy();
    });
  });

  describe('Integration with SystemPromptBuilder', () => {
    it('should provide configuration for system prompt integration', () => {
      const config = AISparringMode.getSparringModeConfig();

      expect(config).toHaveProperty('sparringMode', true);
      expect(config).toHaveProperty('description');
      expect(config.description).toContain('counter-arguments');
      expect(config.description).toContain('respectful');
      expect(config.description).toContain('critical thinking');
    });
  });

  describe('Edge Cases', () => {
    it('should handle very long student arguments', async () => {
      const sparringMode = new AISparringMode(realGeminiClient);

      const longArgument = 'This is a very detailed argument. '.repeat(100);

      const options: CounterArgumentOptions = {
        studentArgument: longArgument,
        topic: 'Test Topic'
      };

      const result = await sparringMode.generateCounterArgument(options);

      expect(result).toBeTruthy();
      expect(global.fetch).toHaveBeenCalled();
    });

    it('should handle special characters in arguments', async () => {
      const sparringMode = new AISparringMode(realGeminiClient);

      const options: CounterArgumentOptions = {
        studentArgument: 'Test with "quotes" and \'apostrophes\' and $pecial ch@rs! & symbols',
        topic: 'Test Topic'
      };

      const result = await sparringMode.generateCounterArgument(options);

      expect(result).toBeTruthy();
    });

    it('should handle empty student name gracefully', async () => {
      const sparringMode = new AISparringMode(realGeminiClient);

      const options: CounterArgumentOptions = {
        studentArgument: 'Test argument',
        topic: 'Test Topic',
        studentName: ''
      };

      const result = await sparringMode.generateCounterArgument(options);

      expect(result).toBeTruthy();
    });

    it('should handle unicode and multilingual content', async () => {
      const sparringMode = new AISparringMode(realGeminiClient);

      const options: CounterArgumentOptions = {
        studentArgument: 'Test with émojis 🎓 and unicode characters: 你好',
        topic: 'Test Topic'
      };

      const result = await sparringMode.generateCounterArgument(options);

      expect(result).toBeTruthy();
    });
  });

  describe('Complete Debate Flow Integration', () => {
    it('should handle complete multi-turn debate scenario', async () => {
      const sparringMode = new AISparringMode(realGeminiClient);

      // Turn 1: Initial argument
      const turn1 = await sparringMode.generateCounterArgument({
        studentArgument: 'Social media does more harm than good',
        topic: 'Technology and Society',
        studentName: 'Sarah',
        grade: 10
      });

      expect(turn1).toBeTruthy();
      expect(AISparringMode.isValidCounterArgument(turn1)).toBe(true);

      // Turn 2: Student responds
      const turn2 = await sparringMode.generateCounterArgument({
        studentArgument: 'But social media causes anxiety and depression',
        topic: 'Technology and Society',
        studentName: 'Sarah',
        grade: 10,
        previousArguments: ['Social media does more harm than good']
      });

      expect(turn2).toBeTruthy();
      expect(AISparringMode.isValidCounterArgument(turn2)).toBe(true);

      // Turn 3: Deeper debate
      const turn3 = await sparringMode.generateCounterArgument({
        studentArgument: 'The negative effects outweigh any benefits',
        topic: 'Technology and Society',
        studentName: 'Sarah',
        grade: 10,
        previousArguments: [
          'Social media does more harm than good',
          'But social media causes anxiety and depression'
        ],
        debateContext: 'Discussing the psychological impact of social media on teenagers'
      });

      expect(turn3).toBeTruthy();
      expect(AISparringMode.isValidCounterArgument(turn3)).toBe(true);

      // Verify all turns were tracked
      const stats = realGeminiClient.getUsageStats();
      expect(stats.requestCount).toBe(3);
    });
  });
});

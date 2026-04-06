/**
 * Unit Tests for AI Sparring Mode Service
 * 
 * Tests counter-argument generation, respectful tone maintenance,
 * and integration with Gemini API.
 */

import { describe, it, expect, beforeEach, vi } from 'vitest';
import { AISparringMode, CounterArgumentOptions } from '../AISparringMode.js';
import { GeminiClient, GeminiResponse } from '../GeminiClient.js';

describe('AISparringMode', () => {
  let sparringMode: AISparringMode;
  let mockGeminiClient: GeminiClient;

  beforeEach(() => {
    // Create mock Gemini client
    mockGeminiClient = {
      generateResponse: vi.fn(),
    } as any;

    sparringMode = new AISparringMode(mockGeminiClient);
  });

  describe('generateCounterArgument', () => {
    it('should generate counter-argument for student argument', async () => {
      // Arrange
      const options: CounterArgumentOptions = {
        studentArgument: 'I think homework is useless because we learn everything in class',
        topic: 'Education',
        studentName: 'Alice',
        grade: 8
      };

      const mockResponse: GeminiResponse = {
        text: "I hear you - it can feel redundant. But let me challenge that: what if homework serves a different purpose than initial learning? Consider practice and reinforcement. What's your take?",
        finishReason: 'STOP'
      };

      vi.mocked(mockGeminiClient.generateResponse).mockResolvedValue(mockResponse);

      // Act
      const result = await sparringMode.generateCounterArgument(options);

      // Assert
      expect(result).toBe(mockResponse.text);
      expect(mockGeminiClient.generateResponse).toHaveBeenCalledWith(
        options.studentArgument,
        expect.stringContaining('AI Sparring Mode'),
        []
      );
    });

    it('should include topic in system prompt', async () => {
      // Arrange
      const options: CounterArgumentOptions = {
        studentArgument: 'Climate change is not real',
        topic: 'Environmental Science'
      };

      const mockResponse: GeminiResponse = {
        text: 'Counter-argument response',
        finishReason: 'STOP'
      };

      vi.mocked(mockGeminiClient.generateResponse).mockResolvedValue(mockResponse);

      // Act
      await sparringMode.generateCounterArgument(options);

      // Assert
      expect(mockGeminiClient.generateResponse).toHaveBeenCalledWith(
        options.studentArgument,
        expect.stringContaining('Environmental Science'),
        []
      );
    });

    it('should include grade level in prompt when provided', async () => {
      // Arrange
      const options: CounterArgumentOptions = {
        studentArgument: 'Math is boring',
        topic: 'Mathematics',
        grade: 10
      };

      const mockResponse: GeminiResponse = {
        text: 'Counter-argument',
        finishReason: 'STOP'
      };

      vi.mocked(mockGeminiClient.generateResponse).mockResolvedValue(mockResponse);

      // Act
      await sparringMode.generateCounterArgument(options);

      // Assert
      expect(mockGeminiClient.generateResponse).toHaveBeenCalledWith(
        options.studentArgument,
        expect.stringContaining('GRADE LEVEL: 10'),
        []
      );
    });

    it('should include previous arguments for debate continuity', async () => {
      // Arrange
      const options: CounterArgumentOptions = {
        studentArgument: 'But that still doesn\'t prove homework is necessary',
        topic: 'Education',
        previousArguments: [
          'Homework is useless',
          'We already learn in class',
          'It takes too much time'
        ]
      };

      const mockResponse: GeminiResponse = {
        text: 'Building on our discussion...',
        finishReason: 'STOP'
      };

      vi.mocked(mockGeminiClient.generateResponse).mockResolvedValue(mockResponse);

      // Act
      await sparringMode.generateCounterArgument(options);

      // Assert
      expect(mockGeminiClient.generateResponse).toHaveBeenCalledWith(
        options.studentArgument,
        expect.stringContaining('PREVIOUS ARGUMENTS'),
        []
      );
    });

    it('should include debate context when provided', async () => {
      // Arrange
      const options: CounterArgumentOptions = {
        studentArgument: 'Social media does more harm than good',
        topic: 'Technology and Society',
        debateContext: 'Discussing impact of social media on teenagers'
      };

      const mockResponse: GeminiResponse = {
        text: 'Counter-argument',
        finishReason: 'STOP'
      };

      vi.mocked(mockGeminiClient.generateResponse).mockResolvedValue(mockResponse);

      // Act
      await sparringMode.generateCounterArgument(options);

      // Assert
      expect(mockGeminiClient.generateResponse).toHaveBeenCalledWith(
        options.studentArgument,
        expect.stringContaining('Discussing impact of social media on teenagers'),
        []
      );
    });

    it('should return fallback response on API error', async () => {
      // Arrange
      const options: CounterArgumentOptions = {
        studentArgument: 'Test argument',
        topic: 'Test Topic'
      };

      vi.mocked(mockGeminiClient.generateResponse).mockRejectedValue(
        new Error('API Error')
      );

      // Act
      const result = await sparringMode.generateCounterArgument(options);

      // Assert
      expect(result).toBeTruthy();
      expect(result.length).toBeGreaterThan(50);
      expect(result.toLowerCase()).toContain('test topic');
    });

    it('should maintain respectful tone in fallback responses', async () => {
      // Arrange
      const options: CounterArgumentOptions = {
        studentArgument: 'Test argument',
        topic: 'Test Topic'
      };

      vi.mocked(mockGeminiClient.generateResponse).mockRejectedValue(
        new Error('API Error')
      );

      // Act
      const result = await sparringMode.generateCounterArgument(options);

      // Assert - Check for respectful language
      const respectfulIndicators = ['interesting', 'perspective', 'consider', 'think', 'valid'];
      const hasRespectfulTone = respectfulIndicators.some(indicator =>
        result.toLowerCase().includes(indicator)
      );
      expect(hasRespectfulTone).toBe(true);
    });
  });

  describe('generateStructuredCounterArgument', () => {
    it('should return structured response with components', async () => {
      // Arrange
      const options: CounterArgumentOptions = {
        studentArgument: 'Video games are a waste of time',
        topic: 'Gaming and Learning'
      };

      const mockResponse: GeminiResponse = {
        text: "I understand why you might think that.\nHowever, research shows video games can develop problem-solving skills.\nWhat if we considered the educational potential of games?",
        finishReason: 'STOP'
      };

      vi.mocked(mockGeminiClient.generateResponse).mockResolvedValue(mockResponse);

      // Act
      const result = await sparringMode.generateStructuredCounterArgument(options);

      // Assert
      expect(result).toHaveProperty('counterArgument');
      expect(result).toHaveProperty('acknowledgment');
      expect(result).toHaveProperty('challenge');
      expect(result).toHaveProperty('encouragement');
      expect(result.counterArgument).toBe(mockResponse.text);
    });
  });

  describe('isValidCounterArgument', () => {
    it('should validate genuine counter-arguments', () => {
      // Arrange
      const validCounterArgument = "That's an interesting point. However, have you considered the alternative perspective? What if we looked at this differently?";

      // Act
      const result = AISparringMode.isValidCounterArgument(validCounterArgument);

      // Assert
      expect(result).toBe(true);
    });

    it('should reject too short responses', () => {
      // Arrange
      const shortResponse = "I disagree.";

      // Act
      const result = AISparringMode.isValidCounterArgument(shortResponse);

      // Assert
      expect(result).toBe(false);
    });

    it('should reject responses without sparring indicators', () => {
      // Arrange
      const noIndicators = "This is a response that does not engage with the topic or present different viewpoints in any meaningful way.";

      // Act
      const result = AISparringMode.isValidCounterArgument(noIndicators);

      // Assert
      expect(result).toBe(false);
    });

    it('should accept responses with various sparring indicators', () => {
      // Arrange
      const indicators = [
        'however',
        'but',
        'consider',
        'what if',
        'alternative',
        'challenge',
        'perspective',
        'think about',
        'on the other hand'
      ];

      // Act & Assert
      indicators.forEach(indicator => {
        const response = `This is a longer response that includes the word ${indicator} to show it's a counter-argument.`;
        expect(AISparringMode.isValidCounterArgument(response)).toBe(true);
      });
    });
  });

  describe('getSparringModeConfig', () => {
    it('should return sparring mode configuration', () => {
      // Act
      const config = AISparringMode.getSparringModeConfig();

      // Assert
      expect(config).toHaveProperty('sparringMode', true);
      expect(config).toHaveProperty('description');
      expect(config.description).toContain('counter-arguments');
      expect(config.description).toContain('respectful');
    });
  });

  describe('Respectful Tone Requirements', () => {
    it('should emphasize respectful tone in system prompt', async () => {
      // Arrange
      const options: CounterArgumentOptions = {
        studentArgument: 'Test argument',
        topic: 'Test Topic'
      };

      const mockResponse: GeminiResponse = {
        text: 'Response',
        finishReason: 'STOP'
      };

      vi.mocked(mockGeminiClient.generateResponse).mockResolvedValue(mockResponse);

      // Act
      await sparringMode.generateCounterArgument(options);

      // Assert
      const systemPrompt = vi.mocked(mockGeminiClient.generateResponse).mock.calls[0][1];
      expect(systemPrompt).toContain('respectful');
      expect(systemPrompt).toContain('TONE GUIDELINES');
    });

    it('should include examples of respectful vs disrespectful language', async () => {
      // Arrange
      const options: CounterArgumentOptions = {
        studentArgument: 'Test',
        topic: 'Test'
      };

      const mockResponse: GeminiResponse = {
        text: 'Response',
        finishReason: 'STOP'
      };

      vi.mocked(mockGeminiClient.generateResponse).mockResolvedValue(mockResponse);

      // Act
      await sparringMode.generateCounterArgument(options);

      // Assert
      const systemPrompt = vi.mocked(mockGeminiClient.generateResponse).mock.calls[0][1];
      expect(systemPrompt).toContain('✓');
      expect(systemPrompt).toContain('✗');
      expect(systemPrompt).toContain("You're wrong");
    });
  });

  describe('Critical Thinking Focus', () => {
    it('should emphasize critical thinking over being right', async () => {
      // Arrange
      const options: CounterArgumentOptions = {
        studentArgument: 'Test',
        topic: 'Test'
      };

      const mockResponse: GeminiResponse = {
        text: 'Response',
        finishReason: 'STOP'
      };

      vi.mocked(mockGeminiClient.generateResponse).mockResolvedValue(mockResponse);

      // Act
      await sparringMode.generateCounterArgument(options);

      // Assert
      const systemPrompt = vi.mocked(mockGeminiClient.generateResponse).mock.calls[0][1];
      expect(systemPrompt).toContain('critical thinking');
      expect(systemPrompt).toContain('NOT about being right');
    });

    it('should include challenge questions in prompt structure', async () => {
      // Arrange
      const options: CounterArgumentOptions = {
        studentArgument: 'Test',
        topic: 'Test'
      };

      const mockResponse: GeminiResponse = {
        text: 'Response',
        finishReason: 'STOP'
      };

      vi.mocked(mockGeminiClient.generateResponse).mockResolvedValue(mockResponse);

      // Act
      await sparringMode.generateCounterArgument(options);

      // Assert
      const systemPrompt = vi.mocked(mockGeminiClient.generateResponse).mock.calls[0][1];
      expect(systemPrompt).toContain('Challenge them');
      expect(systemPrompt).toContain('thought-provoking question');
    });
  });

  describe('Edge Cases', () => {
    it('should handle empty student name gracefully', async () => {
      // Arrange
      const options: CounterArgumentOptions = {
        studentArgument: 'Test argument',
        topic: 'Test Topic',
        studentName: ''
      };

      const mockResponse: GeminiResponse = {
        text: 'Response',
        finishReason: 'STOP'
      };

      vi.mocked(mockGeminiClient.generateResponse).mockResolvedValue(mockResponse);

      // Act
      const result = await sparringMode.generateCounterArgument(options);

      // Assert
      expect(result).toBeTruthy();
    });

    it('should handle very long student arguments', async () => {
      // Arrange
      const longArgument = 'This is a very long argument. '.repeat(100);
      const options: CounterArgumentOptions = {
        studentArgument: longArgument,
        topic: 'Test Topic'
      };

      const mockResponse: GeminiResponse = {
        text: 'Response',
        finishReason: 'STOP'
      };

      vi.mocked(mockGeminiClient.generateResponse).mockResolvedValue(mockResponse);

      // Act
      const result = await sparringMode.generateCounterArgument(options);

      // Assert
      expect(result).toBeTruthy();
      expect(mockGeminiClient.generateResponse).toHaveBeenCalled();
    });

    it('should handle special characters in arguments', async () => {
      // Arrange
      const options: CounterArgumentOptions = {
        studentArgument: 'Test with "quotes" and \'apostrophes\' and $pecial ch@rs!',
        topic: 'Test Topic'
      };

      const mockResponse: GeminiResponse = {
        text: 'Response',
        finishReason: 'STOP'
      };

      vi.mocked(mockGeminiClient.generateResponse).mockResolvedValue(mockResponse);

      // Act
      const result = await sparringMode.generateCounterArgument(options);

      // Assert
      expect(result).toBeTruthy();
    });
  });
});

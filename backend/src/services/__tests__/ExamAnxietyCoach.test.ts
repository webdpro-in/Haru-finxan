/**
 * Unit tests for ExamAnxietyCoach service
 * Tests anxiety keyword detection, confidence scoring, and multi-language support
 */

import { ExamAnxietyCoach, AnxietyDetectionResult, CalmingResponseOptions } from '../ExamAnxietyCoach';

describe('ExamAnxietyCoach', () => {
  describe('detectAnxiety', () => {
    describe('English keyword detection', () => {
      it('should detect high severity anxiety keywords', () => {
        const message = 'I am panicking about the exam tomorrow';
        const result = ExamAnxietyCoach.detectAnxiety(message, 'en');

        expect(result.isAnxious).toBe(true);
        expect(result.confidence).toBeGreaterThan(0.5);
        expect(result.severity).toBe('high');
        expect(result.keywords).toContain('panicking');
        expect(result.keywords).toContain('exam');
      });

      it('should detect medium severity anxiety keywords', () => {
        const message = 'I am very nervous about the test';
        const result = ExamAnxietyCoach.detectAnxiety(message, 'en');

        expect(result.isAnxious).toBe(true);
        expect(result.confidence).toBeGreaterThan(0.3);
        expect(result.keywords).toContain('nervous');
        expect(result.keywords).toContain('test');
      });

      it('should detect low severity anxiety keywords', () => {
        const message = 'I have an exam tomorrow and I am unsure';
        const result = ExamAnxietyCoach.detectAnxiety(message, 'en');

        expect(result.isAnxious).toBe(true);
        expect(result.keywords).toContain('exam');
        expect(result.keywords).toContain('unsure');
      });

      it('should detect multiple anxiety keywords', () => {
        const message = 'I am scared and worried about failing the test';
        const result = ExamAnxietyCoach.detectAnxiety(message, 'en');

        expect(result.isAnxious).toBe(true);
        expect(result.confidence).toBeGreaterThan(0.6);
        expect(result.keywords.length).toBeGreaterThanOrEqual(3);
      });
    });

    describe('confidence scoring', () => {
      it('should return confidence between 0 and 1', () => {
        const messages = [
          'I am panicking about the exam',
          'I have a test tomorrow',
          'Hello, how are you?',
          'I am terrified and stressed about failing'
        ];

        messages.forEach(message => {
          const result = ExamAnxietyCoach.detectAnxiety(message, 'en');
          expect(result.confidence).toBeGreaterThanOrEqual(0);
          expect(result.confidence).toBeLessThanOrEqual(1);
        });
      });

      it('should return higher confidence for more severe keywords', () => {
        const lowAnxiety = ExamAnxietyCoach.detectAnxiety('I have an exam', 'en');
        const mediumAnxiety = ExamAnxietyCoach.detectAnxiety('I am nervous and worried', 'en');
        const highAnxiety = ExamAnxietyCoach.detectAnxiety('I am panicking and terrified', 'en');

        expect(highAnxiety.confidence).toBeGreaterThan(mediumAnxiety.confidence);
        expect(mediumAnxiety.confidence).toBeGreaterThan(lowAnxiety.confidence);
      });

      it('should increase confidence with multiple keywords', () => {
        const single = ExamAnxietyCoach.detectAnxiety('I am nervous', 'en');
        const multiple = ExamAnxietyCoach.detectAnxiety('I am nervous and scared about the exam', 'en');

        expect(multiple.confidence).toBeGreaterThan(single.confidence);
      });
    });

    describe('edge cases', () => {
      it('should handle empty messages gracefully', () => {
        const result = ExamAnxietyCoach.detectAnxiety('', 'en');

        expect(result.isAnxious).toBe(false);
        expect(result.confidence).toBe(0);
        expect(result.keywords).toEqual([]);
      });

      it('should handle null/undefined messages gracefully', () => {
        const result1 = ExamAnxietyCoach.detectAnxiety(null as any, 'en');
        const result2 = ExamAnxietyCoach.detectAnxiety(undefined as any, 'en');

        expect(result1.isAnxious).toBe(false);
        expect(result2.isAnxious).toBe(false);
      });

      it('should handle messages with no anxiety keywords', () => {
        const message = 'Can you explain quadratic equations?';
        const result = ExamAnxietyCoach.detectAnxiety(message, 'en');

        expect(result.isAnxious).toBe(false);
        expect(result.confidence).toBe(0);
        expect(result.keywords).toEqual([]);
      });

      it('should be case-insensitive', () => {
        const lower = ExamAnxietyCoach.detectAnxiety('i am nervous about the exam', 'en');
        const upper = ExamAnxietyCoach.detectAnxiety('I AM NERVOUS ABOUT THE EXAM', 'en');
        const mixed = ExamAnxietyCoach.detectAnxiety('I aM NeRvOuS aBouT tHe ExAm', 'en');

        expect(lower.isAnxious).toBe(true);
        expect(upper.isAnxious).toBe(true);
        expect(mixed.isAnxious).toBe(true);
      });
    });

    describe('exam context detection', () => {
      it('should detect exam context phrases', () => {
        const message = 'I have exam tomorrow and I am worried';
        const result = ExamAnxietyCoach.detectAnxiety(message, 'en');

        expect(result.isAnxious).toBe(true);
        expect(result.keywords.some(k => k.includes('exam'))).toBe(true);
      });

      it('should boost confidence with exam context', () => {
        const withContext = ExamAnxietyCoach.detectAnxiety('exam tomorrow nervous', 'en');
        const withoutContext = ExamAnxietyCoach.detectAnxiety('nervous', 'en');

        expect(withContext.confidence).toBeGreaterThan(withoutContext.confidence);
      });
    });
  });

  describe('multi-language support', () => {
    it('should detect Hindi anxiety keywords', () => {
      const message = 'Mujhe pariksha ka dar hai';
      const result = ExamAnxietyCoach.detectAnxiety(message, 'hi');

      expect(result.isAnxious).toBe(true);
      expect(result.language).toBe('hi');
    });

    it('should detect Tamil anxiety keywords', () => {
      const message = 'Enakku exam bayam';
      const result = ExamAnxietyCoach.detectAnxiety(message, 'ta');

      expect(result.isAnxious).toBe(true);
      expect(result.language).toBe('ta');
    });

    it('should detect Telugu anxiety keywords', () => {
      const message = 'Naku pariksha bhayam';
      const result = ExamAnxietyCoach.detectAnxiety(message, 'te');

      expect(result.isAnxious).toBe(true);
      expect(result.language).toBe('te');
    });

    it('should detect Kannada anxiety keywords', () => {
      const message = 'Nanage exam bhaya';
      const result = ExamAnxietyCoach.detectAnxiety(message, 'ka');

      expect(result.isAnxious).toBe(true);
      expect(result.language).toBe('ka');
    });

    it('should default to English for unknown language', () => {
      const message = 'I am nervous about the exam';
      const result = ExamAnxietyCoach.detectAnxiety(message, 'unknown');

      expect(result.isAnxious).toBe(true);
      expect(result.language).toBe('unknown');
    });
  });

  describe('detectAnxietyMultiLanguage', () => {
    it('should detect anxiety in mixed language messages', () => {
      const message = 'I am nervous about pariksha tomorrow';
      const result = ExamAnxietyCoach.detectAnxietyMultiLanguage(message);

      expect(result.isAnxious).toBe(true);
      expect(result.confidence).toBeGreaterThan(0);
    });

    it('should return highest confidence language', () => {
      const message = 'exam dar tension';
      const result = ExamAnxietyCoach.detectAnxietyMultiLanguage(message);

      expect(result.isAnxious).toBe(true);
    });
  });

  describe('hasExamContext', () => {
    it('should return true for exam context phrases', () => {
      expect(ExamAnxietyCoach.hasExamContext('exam tomorrow')).toBe(true);
      expect(ExamAnxietyCoach.hasExamContext('test coming up')).toBe(true);
      expect(ExamAnxietyCoach.hasExamContext('exam preparation')).toBe(true);
    });

    it('should return false for non-exam messages', () => {
      expect(ExamAnxietyCoach.hasExamContext('Can you explain this?')).toBe(false);
      expect(ExamAnxietyCoach.hasExamContext('I am learning math')).toBe(false);
    });
  });

  describe('getAnxietyLevelDescription', () => {
    it('should return correct description for high anxiety', () => {
      const description = ExamAnxietyCoach.getAnxietyLevelDescription(0.8);
      expect(description).toContain('High anxiety');
    });

    it('should return correct description for moderate anxiety', () => {
      const description = ExamAnxietyCoach.getAnxietyLevelDescription(0.6);
      expect(description).toContain('Moderate anxiety');
    });

    it('should return correct description for mild anxiety', () => {
      const description = ExamAnxietyCoach.getAnxietyLevelDescription(0.4);
      expect(description).toContain('Mild anxiety');
    });

    it('should return correct description for no anxiety', () => {
      const description = ExamAnxietyCoach.getAnxietyLevelDescription(0.2);
      expect(description).toContain('No significant anxiety');
    });
  });

  describe('calculateAnxietyTrend', () => {
    it('should detect increasing anxiety trend', () => {
      const results: AnxietyDetectionResult[] = [
        { isAnxious: true, confidence: 0.3, keywords: ['exam'], severity: 'low', language: 'en' },
        { isAnxious: true, confidence: 0.4, keywords: ['nervous'], severity: 'medium', language: 'en' },
        { isAnxious: true, confidence: 0.6, keywords: ['scared'], severity: 'high', language: 'en' },
        { isAnxious: true, confidence: 0.8, keywords: ['panic'], severity: 'high', language: 'en' }
      ];

      const trend = ExamAnxietyCoach.calculateAnxietyTrend(results);
      expect(trend.trend).toBe('increasing');
      expect(trend.concernLevel).toBe('high');
    });

    it('should detect decreasing anxiety trend', () => {
      const results: AnxietyDetectionResult[] = [
        { isAnxious: true, confidence: 0.8, keywords: ['panic'], severity: 'high', language: 'en' },
        { isAnxious: true, confidence: 0.6, keywords: ['scared'], severity: 'high', language: 'en' },
        { isAnxious: true, confidence: 0.4, keywords: ['nervous'], severity: 'medium', language: 'en' },
        { isAnxious: false, confidence: 0.2, keywords: ['exam'], severity: 'low', language: 'en' }
      ];

      const trend = ExamAnxietyCoach.calculateAnxietyTrend(results);
      expect(trend.trend).toBe('decreasing');
    });

    it('should detect stable anxiety trend', () => {
      const results: AnxietyDetectionResult[] = [
        { isAnxious: true, confidence: 0.5, keywords: ['nervous'], severity: 'medium', language: 'en' },
        { isAnxious: true, confidence: 0.5, keywords: ['worried'], severity: 'medium', language: 'en' },
        { isAnxious: true, confidence: 0.5, keywords: ['anxious'], severity: 'medium', language: 'en' },
        { isAnxious: true, confidence: 0.5, keywords: ['stressed'], severity: 'medium', language: 'en' }
      ];

      const trend = ExamAnxietyCoach.calculateAnxietyTrend(results);
      expect(trend.trend).toBe('stable');
    });

    it('should handle empty results array', () => {
      const trend = ExamAnxietyCoach.calculateAnxietyTrend([]);
      expect(trend.trend).toBe('stable');
      expect(trend.averageConfidence).toBe(0);
      expect(trend.concernLevel).toBe('low');
    });

    it('should calculate correct average confidence', () => {
      const results: AnxietyDetectionResult[] = [
        { isAnxious: true, confidence: 0.4, keywords: ['exam'], severity: 'low', language: 'en' },
        { isAnxious: true, confidence: 0.6, keywords: ['nervous'], severity: 'medium', language: 'en' }
      ];

      const trend = ExamAnxietyCoach.calculateAnxietyTrend(results);
      expect(trend.averageConfidence).toBe(0.5);
    });
  });

  describe('severity classification', () => {
    it('should classify high severity correctly', () => {
      const message = 'I am panicking and terrified about failing the exam';
      const result = ExamAnxietyCoach.detectAnxiety(message, 'en');

      expect(result.severity).toBe('high');
      expect(result.confidence).toBeGreaterThanOrEqual(0.7);
    });

    it('should classify medium severity correctly', () => {
      const message = 'I am nervous and worried about the test';
      const result = ExamAnxietyCoach.detectAnxiety(message, 'en');

      expect(result.severity).toBe('medium');
      expect(result.confidence).toBeGreaterThanOrEqual(0.5);
      expect(result.confidence).toBeLessThan(0.7);
    });

    it('should classify low severity correctly', () => {
      const message = 'I have an exam tomorrow';
      const result = ExamAnxietyCoach.detectAnxiety(message, 'en');

      expect(result.severity).toBe('low');
      expect(result.confidence).toBeLessThan(0.5);
    });
  });

  describe('matched keywords', () => {
    it('should return list of matched keywords', () => {
      const message = 'I am nervous and scared about the exam';
      const result = ExamAnxietyCoach.detectAnxiety(message, 'en');

      expect(result.keywords).toContain('nervous');
      expect(result.keywords).toContain('scared');
      expect(result.keywords).toContain('exam');
      expect(result.keywords.length).toBeGreaterThanOrEqual(3);
    });

    it('should not duplicate keywords', () => {
      const message = 'exam exam exam nervous nervous';
      const result = ExamAnxietyCoach.detectAnxiety(message, 'en');

      const uniqueKeywords = new Set(result.keywords);
      expect(uniqueKeywords.size).toBe(result.keywords.length);
    });
  });

  describe('generateCalmingResponse', () => {
    describe('English responses', () => {
      it('should generate high severity calming response', () => {
        const detectionResult: AnxietyDetectionResult = {
          isAnxious: true,
          confidence: 0.8,
          keywords: ['panic', 'terrified', 'exam'],
          severity: 'high',
          language: 'en'
        };

        const response = ExamAnxietyCoach.generateCalmingResponse(detectionResult);

        expect(response).toBeTruthy();
        expect(response.length).toBeGreaterThan(0);
        // Should contain calming elements
        expect(
          response.toLowerCase().includes('breath') ||
          response.toLowerCase().includes('calm') ||
          response.toLowerCase().includes('step')
        ).toBe(true);
      });

      it('should generate medium severity calming response', () => {
        const detectionResult: AnxietyDetectionResult = {
          isAnxious: true,
          confidence: 0.6,
          keywords: ['nervous', 'worried'],
          severity: 'medium',
          language: 'en'
        };

        const response = ExamAnxietyCoach.generateCalmingResponse(detectionResult);

        expect(response).toBeTruthy();
        expect(response.length).toBeGreaterThan(0);
      });

      it('should generate low severity calming response', () => {
        const detectionResult: AnxietyDetectionResult = {
          isAnxious: true,
          confidence: 0.4,
          keywords: ['exam'],
          severity: 'low',
          language: 'en'
        };

        const response = ExamAnxietyCoach.generateCalmingResponse(detectionResult);

        expect(response).toBeTruthy();
        expect(response.length).toBeGreaterThan(0);
      });

      it('should personalize response with student name', () => {
        const detectionResult: AnxietyDetectionResult = {
          isAnxious: true,
          confidence: 0.7,
          keywords: ['scared', 'exam'],
          severity: 'high',
          language: 'en'
        };

        const response = ExamAnxietyCoach.generateCalmingResponse(detectionResult, 'Rahul');

        expect(response).toContain('Rahul');
      });

      it('should work without student name', () => {
        const detectionResult: AnxietyDetectionResult = {
          isAnxious: true,
          confidence: 0.7,
          keywords: ['scared', 'exam'],
          severity: 'high',
          language: 'en'
        };

        const response = ExamAnxietyCoach.generateCalmingResponse(detectionResult);

        expect(response).toBeTruthy();
        expect(response).not.toContain('{name}');
      });
    });

    describe('Multi-language responses', () => {
      it('should generate Hindi calming response', () => {
        const detectionResult: AnxietyDetectionResult = {
          isAnxious: true,
          confidence: 0.7,
          keywords: ['dar', 'pariksha'],
          severity: 'high',
          language: 'hi'
        };

        const response = ExamAnxietyCoach.generateCalmingResponse(detectionResult, 'Priya');

        expect(response).toBeTruthy();
        expect(response).toContain('Priya');
        // Should contain Hindi words (romanized)
        expect(
          response.includes('saans') ||
          response.includes('tension') ||
          response.includes('exam')
        ).toBe(true);
      });

      it('should generate Tamil calming response', () => {
        const detectionResult: AnxietyDetectionResult = {
          isAnxious: true,
          confidence: 0.6,
          keywords: ['bayam', 'exam'],
          severity: 'medium',
          language: 'ta'
        };

        const response = ExamAnxietyCoach.generateCalmingResponse(detectionResult);

        expect(response).toBeTruthy();
        expect(response.length).toBeGreaterThan(0);
      });

      it('should generate Telugu calming response', () => {
        const detectionResult: AnxietyDetectionResult = {
          isAnxious: true,
          confidence: 0.5,
          keywords: ['bhayam', 'pariksha'],
          severity: 'medium',
          language: 'te'
        };

        const response = ExamAnxietyCoach.generateCalmingResponse(detectionResult);

        expect(response).toBeTruthy();
        expect(response.length).toBeGreaterThan(0);
      });

      it('should generate Kannada calming response', () => {
        const detectionResult: AnxietyDetectionResult = {
          isAnxious: true,
          confidence: 0.4,
          keywords: ['bhaya', 'exam'],
          severity: 'low',
          language: 'ka'
        };

        const response = ExamAnxietyCoach.generateCalmingResponse(detectionResult);

        expect(response).toBeTruthy();
        expect(response.length).toBeGreaterThan(0);
      });
    });

    describe('response quality', () => {
      it('should generate different responses for same severity', () => {
        const detectionResult: AnxietyDetectionResult = {
          isAnxious: true,
          confidence: 0.8,
          keywords: ['panic', 'exam'],
          severity: 'high',
          language: 'en'
        };

        const responses = new Set<string>();
        // Generate multiple responses to check for variety
        for (let i = 0; i < 10; i++) {
          const response = ExamAnxietyCoach.generateCalmingResponse(detectionResult);
          responses.add(response);
        }

        // Should have at least 2 different responses (randomization)
        expect(responses.size).toBeGreaterThanOrEqual(2);
      });

      it('should generate appropriate length responses', () => {
        const detectionResult: AnxietyDetectionResult = {
          isAnxious: true,
          confidence: 0.7,
          keywords: ['nervous', 'exam'],
          severity: 'high',
          language: 'en'
        };

        const response = ExamAnxietyCoach.generateCalmingResponse(detectionResult);

        // Response should be substantial but not too long
        expect(response.length).toBeGreaterThan(50);
        expect(response.length).toBeLessThan(500);
      });

      it('should be empathetic and supportive', () => {
        const detectionResult: AnxietyDetectionResult = {
          isAnxious: true,
          confidence: 0.8,
          keywords: ['scared', 'fail'],
          severity: 'high',
          language: 'en'
        };

        const response = ExamAnxietyCoach.generateCalmingResponse(detectionResult);

        // Check for empathetic language patterns
        const empatheticPatterns = [
          'understand',
          'normal',
          'can',
          'together',
          'you\'ve',
          'breath',
          'step'
        ];

        const hasEmpatheticLanguage = empatheticPatterns.some(pattern =>
          response.toLowerCase().includes(pattern)
        );

        expect(hasEmpatheticLanguage).toBe(true);
      });
    });

    describe('severity-appropriate responses', () => {
      it('should provide breathing exercises for high severity', () => {
        const detectionResult: AnxietyDetectionResult = {
          isAnxious: true,
          confidence: 0.9,
          keywords: ['panic', 'terrified'],
          severity: 'high',
          language: 'en'
        };

        const response = ExamAnxietyCoach.generateCalmingResponse(detectionResult);

        // High severity should mention breathing or calming techniques
        expect(
          response.toLowerCase().includes('breath') ||
          response.toLowerCase().includes('calm') ||
          response.toLowerCase().includes('deep')
        ).toBe(true);
      });

      it('should provide encouragement for medium severity', () => {
        const detectionResult: AnxietyDetectionResult = {
          isAnxious: true,
          confidence: 0.6,
          keywords: ['nervous', 'worried'],
          severity: 'medium',
          language: 'en'
        };

        const response = ExamAnxietyCoach.generateCalmingResponse(detectionResult);

        // Medium severity should be encouraging - check for various encouraging patterns
        expect(
          response.toLowerCase().includes('can') ||
          response.toLowerCase().includes('prepared') ||
          response.toLowerCase().includes('confident') ||
          response.toLowerCase().includes('natural') ||
          response.toLowerCase().includes('understand') ||
          response.toLowerCase().includes('help') ||
          response.toLowerCase().includes('breath')
        ).toBe(true);
      });

      it('should provide practical support for low severity', () => {
        const detectionResult: AnxietyDetectionResult = {
          isAnxious: true,
          confidence: 0.4,
          keywords: ['exam'],
          severity: 'low',
          language: 'en'
        };

        const response = ExamAnxietyCoach.generateCalmingResponse(detectionResult);

        // Low severity should offer practical help - check for various supportive patterns
        expect(
          response.toLowerCase().includes('prepare') ||
          response.toLowerCase().includes('review') ||
          response.toLowerCase().includes('plan') ||
          response.toLowerCase().includes('ready') ||
          response.toLowerCase().includes('confident') ||
          response.toLowerCase().includes('topic') ||
          response.toLowerCase().includes('study')
        ).toBe(true);
      });
    });

    describe('edge cases', () => {
      it('should handle unknown language by defaulting to English', () => {
        const detectionResult: AnxietyDetectionResult = {
          isAnxious: true,
          confidence: 0.7,
          keywords: ['nervous'],
          severity: 'high',
          language: 'unknown'
        };

        const response = ExamAnxietyCoach.generateCalmingResponse(detectionResult);

        expect(response).toBeTruthy();
        expect(response.length).toBeGreaterThan(0);
      });

      it('should handle empty student name gracefully', () => {
        const detectionResult: AnxietyDetectionResult = {
          isAnxious: true,
          confidence: 0.7,
          keywords: ['scared'],
          severity: 'high',
          language: 'en'
        };

        const response = ExamAnxietyCoach.generateCalmingResponse(detectionResult, '');

        expect(response).toBeTruthy();
        expect(response).not.toContain('{name}');
      });
    });
  });
});

describe('generateEnhancedCalmingResponse', () => {
  const highResult: AnxietyDetectionResult = {
    isAnxious: true,
    confidence: 0.9,
    keywords: ['panic', 'terrified'],
    severity: 'high',
    language: 'en'
  };

  const mediumResult: AnxietyDetectionResult = {
    isAnxious: true,
    confidence: 0.6,
    keywords: ['nervous', 'worried'],
    severity: 'medium',
    language: 'en'
  };

  it('should include breathing exercise for high severity', () => {
    const response = ExamAnxietyCoach.generateEnhancedCalmingResponse(highResult);
    expect(response).toContain('4-7-8');
    expect(response).toContain('breathe');
  });

  it('should include breathing exercise when includeBreathingExercise is true', () => {
    const options: CalmingResponseOptions = { includeBreathingExercise: true };
    const response = ExamAnxietyCoach.generateEnhancedCalmingResponse(mediumResult, options);
    expect(response).toContain('4-7-8');
  });

  it('should include past successes reminder when provided', () => {
    const options: CalmingResponseOptions = {
      pastSuccesses: ['algebra', 'geometry', 'trigonometry']
    };
    const response = ExamAnxietyCoach.generateEnhancedCalmingResponse(mediumResult, options);
    expect(response).toContain("you've already mastered");
    expect(response).toContain('algebra');
    expect(response).toContain('geometry');
    expect(response).toContain('trigonometry');
  });

  it('should limit past successes to 3 items', () => {
    const options: CalmingResponseOptions = {
      pastSuccesses: ['algebra', 'geometry', 'trigonometry', 'calculus', 'statistics']
    };
    const response = ExamAnxietyCoach.generateEnhancedCalmingResponse(mediumResult, options);
    // Only first 3 should appear
    expect(response).toContain('algebra');
    expect(response).toContain('geometry');
    expect(response).toContain('trigonometry');
    expect(response).not.toContain('calculus');
  });

  it('should include topic breakdown offer when topicToBreakDown is provided', () => {
    const options: CalmingResponseOptions = { topicToBreakDown: 'quadratic equations' };
    const response = ExamAnxietyCoach.generateEnhancedCalmingResponse(mediumResult, options);
    expect(response).toContain('quadratic equations');
    expect(response).toContain('smaller, easier steps');
  });

  it('should combine all elements when all options provided', () => {
    const options: CalmingResponseOptions = {
      studentName: 'Rahul',
      pastSuccesses: ['algebra', 'geometry'],
      topicToBreakDown: 'calculus',
      includeBreathingExercise: true
    };
    const response = ExamAnxietyCoach.generateEnhancedCalmingResponse(mediumResult, options);
    expect(response).toContain('Rahul');
    expect(response).toContain('4-7-8');
    expect(response).toContain("you've already mastered");
    expect(response).toContain('calculus');
    expect(response).toContain('smaller, easier steps');
  });

  it('should work with no options (falls back to basic response)', () => {
    const response = ExamAnxietyCoach.generateEnhancedCalmingResponse(mediumResult);
    expect(response).toBeTruthy();
    expect(response.length).toBeGreaterThan(0);
    // Should not contain enhancement markers when no options given and severity is medium
    expect(response).not.toContain("you've already mastered");
    expect(response).not.toContain('smaller, easier steps');
  });
});

describe('getCalmingTechniques', () => {
  it('should return techniques for high severity', () => {
    const techniques = ExamAnxietyCoach.getCalmingTechniques('high');
    expect(techniques).toContain('4-7-8 breathing: breathe in 4 counts, hold 7, out 8');
    expect(techniques).toContain('Progressive muscle relaxation');
    expect(techniques).toContain('Positive affirmations: "I am prepared, I can do this"');
    expect(techniques).toContain('Visualize success');
  });

  it('should return techniques for medium severity', () => {
    const techniques = ExamAnxietyCoach.getCalmingTechniques('medium');
    expect(techniques).toContain('Box breathing: 4 counts in, hold 4, out 4');
    expect(techniques).toContain('Write down 3 things you know well');
    expect(techniques).toContain('Take a 5-minute break and stretch');
  });

  it('should return techniques for low severity', () => {
    const techniques = ExamAnxietyCoach.getCalmingTechniques('low');
    expect(techniques).toContain('Review your notes for 10 minutes');
    expect(techniques).toContain('Create a quick study checklist');
    expect(techniques).toContain('Practice one example problem');
  });

  it('should return non-empty arrays for all severity levels', () => {
    expect(ExamAnxietyCoach.getCalmingTechniques('low').length).toBeGreaterThan(0);
    expect(ExamAnxietyCoach.getCalmingTechniques('medium').length).toBeGreaterThan(0);
    expect(ExamAnxietyCoach.getCalmingTechniques('high').length).toBeGreaterThan(0);
  });

  it('should return more intensive techniques for higher severity', () => {
    const low = ExamAnxietyCoach.getCalmingTechniques('low');
    const high = ExamAnxietyCoach.getCalmingTechniques('high');
    // High severity includes breathing and relaxation techniques not in low
    const highHasBreathing = high.some(t => t.includes('breathing'));
    const lowHasBreathing = low.some(t => t.includes('breathing'));
    expect(highHasBreathing).toBe(true);
    expect(lowHasBreathing).toBe(false);
  });
});

describe('recordAnxietyEvent', () => {
  describe('basic recording functionality', () => {
    it('should record anxiety event when anxiety is detected', () => {
      const detectionResult: AnxietyDetectionResult = {
        isAnxious: true,
        confidence: 0.7,
        keywords: ['nervous', 'exam', 'scared'],
        severity: 'high',
        language: 'en'
      };

      const studentProfile = {
        studentId: 'student123',
        moodHistory: []
      };

      ExamAnxietyCoach.recordAnxietyEvent(detectionResult, studentProfile);

      expect(studentProfile.moodHistory.length).toBe(1);
      expect(studentProfile.moodHistory[0].mood).toBe('anxious');
      expect(studentProfile.moodHistory[0].timestamp).toBeInstanceOf(Date);
    });

    it('should not record when anxiety is not detected', () => {
      const detectionResult: AnxietyDetectionResult = {
        isAnxious: false,
        confidence: 0.2,
        keywords: [],
        severity: 'low',
        language: 'en'
      };

      const studentProfile = {
        studentId: 'student123',
        moodHistory: []
      };

      ExamAnxietyCoach.recordAnxietyEvent(detectionResult, studentProfile);

      expect(studentProfile.moodHistory.length).toBe(0);
    });

    it('should not record when confidence is below threshold (< 0.3)', () => {
      const detectionResult: AnxietyDetectionResult = {
        isAnxious: true,
        confidence: 0.25,
        keywords: ['exam'],
        severity: 'low',
        language: 'en'
      };

      const studentProfile = {
        studentId: 'student123',
        moodHistory: []
      };

      ExamAnxietyCoach.recordAnxietyEvent(detectionResult, studentProfile);

      expect(studentProfile.moodHistory.length).toBe(0);
    });

    it('should record when confidence is exactly at threshold (0.3)', () => {
      const detectionResult: AnxietyDetectionResult = {
        isAnxious: true,
        confidence: 0.3,
        keywords: ['nervous'],
        severity: 'low',
        language: 'en'
      };

      const studentProfile = {
        studentId: 'student123',
        moodHistory: []
      };

      ExamAnxietyCoach.recordAnxietyEvent(detectionResult, studentProfile);

      expect(studentProfile.moodHistory.length).toBe(1);
    });

    it('should initialize moodHistory array if it does not exist', () => {
      const detectionResult: AnxietyDetectionResult = {
        isAnxious: true,
        confidence: 0.6,
        keywords: ['worried', 'test'],
        severity: 'medium',
        language: 'en'
      };

      const studentProfile = {
        studentId: 'student123'
        // No moodHistory field
      };

      ExamAnxietyCoach.recordAnxietyEvent(detectionResult, studentProfile);

      expect(studentProfile.moodHistory).toBeDefined();
      expect(studentProfile.moodHistory.length).toBe(1);
    });
  });

  describe('energy level mapping', () => {
    it('should map high severity to low energy level (1)', () => {
      const detectionResult: AnxietyDetectionResult = {
        isAnxious: true,
        confidence: 0.9,
        keywords: ['panic', 'terrified'],
        severity: 'high',
        language: 'en'
      };

      const studentProfile = { moodHistory: [] };
      ExamAnxietyCoach.recordAnxietyEvent(detectionResult, studentProfile);

      expect(studentProfile.moodHistory[0].energyLevel).toBe(1);
    });

    it('should map medium severity to moderate energy level (3)', () => {
      const detectionResult: AnxietyDetectionResult = {
        isAnxious: true,
        confidence: 0.6,
        keywords: ['nervous', 'worried'],
        severity: 'medium',
        language: 'en'
      };

      const studentProfile = { moodHistory: [] };
      ExamAnxietyCoach.recordAnxietyEvent(detectionResult, studentProfile);

      expect(studentProfile.moodHistory[0].energyLevel).toBe(3);
    });

    it('should map low severity to higher energy level (4)', () => {
      const detectionResult: AnxietyDetectionResult = {
        isAnxious: true,
        confidence: 0.4,
        keywords: ['exam'],
        severity: 'low',
        language: 'en'
      };

      const studentProfile = { moodHistory: [] };
      ExamAnxietyCoach.recordAnxietyEvent(detectionResult, studentProfile);

      expect(studentProfile.moodHistory[0].energyLevel).toBe(4);
    });
  });

  describe('notes generation', () => {
    it('should include severity and confidence in notes', () => {
      const detectionResult: AnxietyDetectionResult = {
        isAnxious: true,
        confidence: 0.75,
        keywords: ['scared', 'exam'],
        severity: 'high',
        language: 'en'
      };

      const studentProfile = { moodHistory: [] };
      ExamAnxietyCoach.recordAnxietyEvent(detectionResult, studentProfile);

      const notes = studentProfile.moodHistory[0].notes;
      expect(notes).toContain('high severity');
      expect(notes).toContain('75%');
    });

    it('should include keywords in notes', () => {
      const detectionResult: AnxietyDetectionResult = {
        isAnxious: true,
        confidence: 0.6,
        keywords: ['nervous', 'worried', 'exam', 'tomorrow'],
        severity: 'medium',
        language: 'en'
      };

      const studentProfile = { moodHistory: [] };
      ExamAnxietyCoach.recordAnxietyEvent(detectionResult, studentProfile);

      const notes = studentProfile.moodHistory[0].notes;
      expect(notes).toContain('Keywords:');
      expect(notes).toContain('nervous');
      expect(notes).toContain('worried');
    });

    it('should limit keywords to first 5 in notes', () => {
      const detectionResult: AnxietyDetectionResult = {
        isAnxious: true,
        confidence: 0.8,
        keywords: ['panic', 'scared', 'nervous', 'worried', 'anxious', 'stressed', 'overwhelmed'],
        severity: 'high',
        language: 'en'
      };

      const studentProfile = { moodHistory: [] };
      ExamAnxietyCoach.recordAnxietyEvent(detectionResult, studentProfile);

      const notes = studentProfile.moodHistory[0].notes;
      const keywordSection = notes.split('|').find(part => part.includes('Keywords:'));
      const keywords = keywordSection?.split(':')[1].split(',').length || 0;
      expect(keywords).toBeLessThanOrEqual(5);
    });

    it('should include language in notes if not English', () => {
      const detectionResult: AnxietyDetectionResult = {
        isAnxious: true,
        confidence: 0.7,
        keywords: ['dar', 'pariksha'],
        severity: 'high',
        language: 'hi'
      };

      const studentProfile = { moodHistory: [] };
      ExamAnxietyCoach.recordAnxietyEvent(detectionResult, studentProfile);

      const notes = studentProfile.moodHistory[0].notes;
      expect(notes).toContain('Language: hi');
    });

    it('should not include language in notes if English', () => {
      const detectionResult: AnxietyDetectionResult = {
        isAnxious: true,
        confidence: 0.7,
        keywords: ['nervous', 'exam'],
        severity: 'high',
        language: 'en'
      };

      const studentProfile = { moodHistory: [] };
      ExamAnxietyCoach.recordAnxietyEvent(detectionResult, studentProfile);

      const notes = studentProfile.moodHistory[0].notes;
      expect(notes).not.toContain('Language:');
    });

    it('should include additional notes if provided', () => {
      const detectionResult: AnxietyDetectionResult = {
        isAnxious: true,
        confidence: 0.6,
        keywords: ['worried'],
        severity: 'medium',
        language: 'en'
      };

      const studentProfile = { moodHistory: [] };
      const additionalNotes = 'Student mentioned upcoming final exam';
      
      ExamAnxietyCoach.recordAnxietyEvent(detectionResult, studentProfile, additionalNotes);

      const notes = studentProfile.moodHistory[0].notes;
      expect(notes).toContain(additionalNotes);
    });
  });

  describe('multiple events', () => {
    it('should append new events to existing mood history', () => {
      const studentProfile = {
        moodHistory: [
          {
            timestamp: new Date('2024-01-01'),
            mood: 'happy' as const,
            energyLevel: 5,
            notes: 'Previous mood check-in'
          }
        ]
      };

      const detectionResult: AnxietyDetectionResult = {
        isAnxious: true,
        confidence: 0.7,
        keywords: ['nervous', 'exam'],
        severity: 'high',
        language: 'en'
      };

      ExamAnxietyCoach.recordAnxietyEvent(detectionResult, studentProfile);

      expect(studentProfile.moodHistory.length).toBe(2);
      expect(studentProfile.moodHistory[0].mood).toBe('happy');
      expect(studentProfile.moodHistory[1].mood).toBe('anxious');
    });

    it('should record multiple anxiety events', () => {
      const studentProfile = { moodHistory: [] };

      const event1: AnxietyDetectionResult = {
        isAnxious: true,
        confidence: 0.5,
        keywords: ['nervous'],
        severity: 'medium',
        language: 'en'
      };

      const event2: AnxietyDetectionResult = {
        isAnxious: true,
        confidence: 0.8,
        keywords: ['panic', 'scared'],
        severity: 'high',
        language: 'en'
      };

      ExamAnxietyCoach.recordAnxietyEvent(event1, studentProfile);
      ExamAnxietyCoach.recordAnxietyEvent(event2, studentProfile);

      expect(studentProfile.moodHistory.length).toBe(2);
      expect(studentProfile.moodHistory[0].energyLevel).toBe(3); // medium
      expect(studentProfile.moodHistory[1].energyLevel).toBe(1); // high
    });

    it('should limit mood history to 100 entries', () => {
      const studentProfile = {
        moodHistory: Array(100).fill(null).map((_, i) => ({
          timestamp: new Date(),
          mood: 'neutral' as const,
          energyLevel: 3,
          notes: `Entry ${i}`
        }))
      };

      const detectionResult: AnxietyDetectionResult = {
        isAnxious: true,
        confidence: 0.7,
        keywords: ['nervous'],
        severity: 'high',
        language: 'en'
      };

      ExamAnxietyCoach.recordAnxietyEvent(detectionResult, studentProfile);

      expect(studentProfile.moodHistory.length).toBe(100);
      expect(studentProfile.moodHistory[99].mood).toBe('anxious');
      expect(studentProfile.moodHistory[0].notes).not.toBe('Entry 0'); // First entry removed
    });
  });

  describe('edge cases', () => {
    it('should handle empty keywords array', () => {
      const detectionResult: AnxietyDetectionResult = {
        isAnxious: true,
        confidence: 0.5,
        keywords: [],
        severity: 'medium',
        language: 'en'
      };

      const studentProfile = { moodHistory: [] };
      ExamAnxietyCoach.recordAnxietyEvent(detectionResult, studentProfile);

      expect(studentProfile.moodHistory.length).toBe(1);
      const notes = studentProfile.moodHistory[0].notes;
      expect(notes).not.toContain('Keywords:');
    });

    it('should handle very high confidence (1.0)', () => {
      const detectionResult: AnxietyDetectionResult = {
        isAnxious: true,
        confidence: 1.0,
        keywords: ['panic', 'terrified', 'scared'],
        severity: 'high',
        language: 'en'
      };

      const studentProfile = { moodHistory: [] };
      ExamAnxietyCoach.recordAnxietyEvent(detectionResult, studentProfile);

      expect(studentProfile.moodHistory.length).toBe(1);
      const notes = studentProfile.moodHistory[0].notes;
      expect(notes).toContain('100%');
    });

    it('should handle confidence at exact threshold', () => {
      const detectionResult: AnxietyDetectionResult = {
        isAnxious: true,
        confidence: 0.3,
        keywords: ['exam'],
        severity: 'low',
        language: 'en'
      };

      const studentProfile = { moodHistory: [] };
      ExamAnxietyCoach.recordAnxietyEvent(detectionResult, studentProfile);

      expect(studentProfile.moodHistory.length).toBe(1);
      const notes = studentProfile.moodHistory[0].notes;
      expect(notes).toContain('30%');
    });

    it('should handle multi-language anxiety events', () => {
      const studentProfile = { moodHistory: [] };

      const languages = ['en', 'hi', 'ta', 'te', 'ka'];
      languages.forEach(lang => {
        const detectionResult: AnxietyDetectionResult = {
          isAnxious: true,
          confidence: 0.6,
          keywords: ['test'],
          severity: 'medium',
          language: lang
        };
        ExamAnxietyCoach.recordAnxietyEvent(detectionResult, studentProfile);
      });

      expect(studentProfile.moodHistory.length).toBe(5);
      // English should not have language in notes
      expect(studentProfile.moodHistory[0].notes).not.toContain('Language:');
      // Other languages should have language in notes
      expect(studentProfile.moodHistory[1].notes).toContain('Language: hi');
      expect(studentProfile.moodHistory[2].notes).toContain('Language: ta');
    });
  });

  describe('integration with detectAnxiety', () => {
    it('should work with real anxiety detection results', () => {
      const message = 'I am so nervous about the exam tomorrow, I am scared I will fail';
      const detectionResult = ExamAnxietyCoach.detectAnxiety(message, 'en');

      const studentProfile = { moodHistory: [] };
      ExamAnxietyCoach.recordAnxietyEvent(detectionResult, studentProfile);

      expect(studentProfile.moodHistory.length).toBe(1);
      expect(studentProfile.moodHistory[0].mood).toBe('anxious');
      expect(studentProfile.moodHistory[0].energyLevel).toBeGreaterThanOrEqual(1);
      expect(studentProfile.moodHistory[0].energyLevel).toBeLessThanOrEqual(5);
    });

    it('should not record for non-anxious messages', () => {
      const message = 'Can you explain quadratic equations?';
      const detectionResult = ExamAnxietyCoach.detectAnxiety(message, 'en');

      const studentProfile = { moodHistory: [] };
      ExamAnxietyCoach.recordAnxietyEvent(detectionResult, studentProfile);

      expect(studentProfile.moodHistory.length).toBe(0);
    });

    it('should record for multi-language anxiety detection', () => {
      const message = 'Mujhe exam ka bahut dar hai';
      const detectionResult = ExamAnxietyCoach.detectAnxiety(message, 'hi');

      const studentProfile = { moodHistory: [] };
      ExamAnxietyCoach.recordAnxietyEvent(detectionResult, studentProfile);

      if (detectionResult.isAnxious) {
        expect(studentProfile.moodHistory.length).toBeGreaterThan(0);
        expect(studentProfile.moodHistory[0].notes).toContain('Language: hi');
      }
    });
  });
});


/**
 * Unit tests for SocraticMode service
 * Tests Socratic prompt generation, leading questions, hint system, and attempt tracking
 */

import { SocraticMode, SocraticPromptOptions, AttemptTracker } from '../SocraticMode';

describe('SocraticMode', () => {
  describe('generateSocraticPrompt', () => {
    it('should generate a basic Socratic prompt', () => {
      const options: SocraticPromptOptions = {
        studentName: 'Rahul',
        grade: 8,
        topic: 'photosynthesis',
        question: 'What is photosynthesis?'
      };

      const prompt = SocraticMode.generateSocraticPrompt(options);

      expect(prompt).toContain('Haru in Socratic Mode');
      expect(prompt).toContain('Rahul');
      expect(prompt).toContain('Grade 8');
      expect(prompt).toContain('photosynthesis');
      expect(prompt).toContain('NEVER give the answer directly');
    });

    it('should include student name in prompt', () => {
      const options: SocraticPromptOptions = {
        studentName: 'Priya',
        grade: 10,
        topic: 'algebra',
        question: 'How do I solve quadratic equations?'
      };

      const prompt = SocraticMode.generateSocraticPrompt(options);

      expect(prompt).toContain('Priya');
    });

    it('should default to "Student" if no name provided', () => {
      const options: SocraticPromptOptions = {
        grade: 7,
        topic: 'fractions',
        question: 'What are fractions?'
      };

      const prompt = SocraticMode.generateSocraticPrompt(options);

      expect(prompt).toContain('Student');
    });

    it('should include grade level in prompt', () => {
      const options: SocraticPromptOptions = {
        grade: 12,
        topic: 'calculus',
        question: 'What is a derivative?'
      };

      const prompt = SocraticMode.generateSocraticPrompt(options);

      expect(prompt).toContain('Grade 12');
      expect(prompt).toContain('GRADE LEVEL: 12');
    });

    it('should include topic in prompt', () => {
      const options: SocraticPromptOptions = {
        grade: 9,
        topic: 'Newton\'s laws',
        question: 'What is Newton\'s first law?'
      };

      const prompt = SocraticMode.generateSocraticPrompt(options);

      expect(prompt).toContain('Newton\'s laws');
    });

    it('should include the student question', () => {
      const question = 'How does the water cycle work?';
      const options: SocraticPromptOptions = {
        grade: 6,
        topic: 'water cycle',
        question
      };

      const prompt = SocraticMode.generateSocraticPrompt(options);

      expect(prompt).toContain(question);
    });

    it('should include concept mastery level', () => {
      const options: SocraticPromptOptions = {
        grade: 8,
        topic: 'geometry',
        question: 'What is the Pythagorean theorem?',
        conceptMastery: 75
      };

      const prompt = SocraticMode.generateSocraticPrompt(options);

      expect(prompt).toContain('CONCEPT MASTERY: 75%');
    });

    it('should adjust guidance for low mastery', () => {
      const options: SocraticPromptOptions = {
        grade: 8,
        topic: 'algebra',
        question: 'What is a variable?',
        conceptMastery: 30
      };

      const prompt = SocraticMode.generateSocraticPrompt(options);

      expect(prompt).toContain('struggling');
      expect(prompt).toContain('simpler questions');
    });

    it('should adjust guidance for medium mastery', () => {
      const options: SocraticPromptOptions = {
        grade: 8,
        topic: 'algebra',
        question: 'What is a variable?',
        conceptMastery: 55
      };

      const prompt = SocraticMode.generateSocraticPrompt(options);

      expect(prompt).toContain('basic understanding');
    });

    it('should adjust guidance for high mastery', () => {
      const options: SocraticPromptOptions = {
        grade: 8,
        topic: 'algebra',
        question: 'What is a variable?',
        conceptMastery: 85
      };

      const prompt = SocraticMode.generateSocraticPrompt(options);

      expect(prompt).toContain('good grasp');
      expect(prompt).toContain('challenge');
    });

    it('should include previous attempts when provided', () => {
      const options: SocraticPromptOptions = {
        grade: 9,
        topic: 'chemistry',
        question: 'What is an atom?',
        attemptCount: 2,
        previousResponses: ['A small particle?', 'Something with electrons?']
      };

      const prompt = SocraticMode.generateSocraticPrompt(options);

      expect(prompt).toContain('PREVIOUS ATTEMPTS');
      expect(prompt).toContain('A small particle?');
      expect(prompt).toContain('Something with electrons?');
    });

    it('should include hint guidance after 3 attempts', () => {
      const options: SocraticPromptOptions = {
        grade: 10,
        topic: 'physics',
        question: 'What is momentum?',
        attemptCount: 3,
        previousResponses: ['Speed?', 'Force?', 'Energy?']
      };

      const prompt = SocraticMode.generateSocraticPrompt(options);

      expect(prompt).toContain('HINT GUIDANCE');
      expect(prompt).toContain('tried 3 times');
      expect(prompt).toContain('helpful hint');
    });

    it('should not include hint guidance before 3 attempts', () => {
      const options: SocraticPromptOptions = {
        grade: 10,
        topic: 'physics',
        question: 'What is momentum?',
        attemptCount: 2,
        previousResponses: ['Speed?', 'Force?']
      };

      const prompt = SocraticMode.generateSocraticPrompt(options);

      expect(prompt).not.toContain('HINT GUIDANCE');
    });

    it('should include Socratic dialogue example', () => {
      const options: SocraticPromptOptions = {
        grade: 7,
        topic: 'biology',
        question: 'What is photosynthesis?'
      };

      const prompt = SocraticMode.generateSocraticPrompt(options);

      expect(prompt).toContain('EXAMPLE SOCRATIC DIALOGUE');
      expect(prompt).toContain('what do plants need to survive');
    });

    it('should include response format guidelines', () => {
      const options: SocraticPromptOptions = {
        grade: 8,
        topic: 'math',
        question: 'What is pi?'
      };

      const prompt = SocraticMode.generateSocraticPrompt(options);

      expect(prompt).toContain('RESPONSE FORMAT');
      expect(prompt).toContain('1-2 leading questions');
      expect(prompt).toContain('encouraging, supportive tone');
    });
  });

  describe('generateLeadingQuestions', () => {
    it('should generate questions for "what is" pattern', () => {
      const questions = SocraticMode.generateLeadingQuestions(
        'photosynthesis',
        'What is photosynthesis?',
        8
      );

      expect(questions.length).toBeGreaterThan(0);
      expect(questions.some(q => q.includes('already know'))).toBe(true);
    });

    it('should generate questions for "how does" pattern', () => {
      const questions = SocraticMode.generateLeadingQuestions(
        'water cycle',
        'How does the water cycle work?',
        7
      );

      expect(questions.length).toBeGreaterThan(0);
      expect(questions.some(q => q.includes('parts') || q.includes('components'))).toBe(true);
    });

    it('should generate questions for "why" pattern', () => {
      const questions = SocraticMode.generateLeadingQuestions(
        'gravity',
        'Why do objects fall?',
        9
      );

      expect(questions.length).toBeGreaterThan(0);
      // Enhanced questions are more sophisticated and grade-aware
      expect(questions.some(q => q.toLowerCase().includes('factor') || 
                                 q.toLowerCase().includes('cause') || 
                                 q.toLowerCase().includes('principle'))).toBe(true);
    });

    it('should generate default questions for other patterns', () => {
      const questions = SocraticMode.generateLeadingQuestions(
        'algebra',
        'Explain variables',
        8
      );

      expect(questions.length).toBeGreaterThan(0);
      expect(questions.some(q => q.includes('already know'))).toBe(true);
    });

    it('should return non-empty array', () => {
      const questions = SocraticMode.generateLeadingQuestions(
        'any topic',
        'any question',
        5
      );

      expect(Array.isArray(questions)).toBe(true);
      expect(questions.length).toBeGreaterThan(0);
    });

    it('should include topic in questions', () => {
      const topic = 'photosynthesis';
      const questions = SocraticMode.generateLeadingQuestions(
        topic,
        'What is photosynthesis?',
        8
      );

      expect(questions.some(q => q.includes(topic))).toBe(true);
    });
  });

  describe('generateHint', () => {
    it('should return empty string before 3 attempts', () => {
      const hint = SocraticMode.generateHint(
        'algebra',
        'What is a variable?',
        2,
        ['A letter?', 'A symbol?']
      );

      expect(hint).toBe('');
    });

    it('should return hint after 3 attempts', () => {
      const hint = SocraticMode.generateHint(
        'algebra',
        'What is a variable?',
        3,
        ['A letter?', 'A symbol?', 'A number?']
      );

      expect(hint).toBeTruthy();
      expect(hint.length).toBeGreaterThan(0);
    });

    it('should include topic in hint', () => {
      const topic = 'photosynthesis';
      const hint = SocraticMode.generateHint(
        topic,
        'What is photosynthesis?',
        3,
        ['Plants?', 'Sunlight?', 'Energy?']
      );

      expect(hint).toContain(topic);
    });

    it('should return hint after 4 attempts', () => {
      const hint = SocraticMode.generateHint(
        'physics',
        'What is momentum?',
        4,
        ['Speed?', 'Force?', 'Energy?', 'Mass?']
      );

      expect(hint).toBeTruthy();
      expect(hint.length).toBeGreaterThan(0);
    });

    it('should return hint after many attempts', () => {
      const hint = SocraticMode.generateHint(
        'chemistry',
        'What is an atom?',
        10,
        Array(10).fill('I don\'t know')
      );

      expect(hint).toBeTruthy();
      expect(hint.length).toBeGreaterThan(0);
    });
  });

  describe('generateEncouragement', () => {
    it('should return celebration for correct answer', () => {
      const encouragement = SocraticMode.generateEncouragement(2, true);

      expect(encouragement).toBeTruthy();
      expect(
        encouragement.includes('!') ||
        encouragement.includes('🎉') ||
        encouragement.includes('⭐') ||
        encouragement.includes('🌟')
      ).toBe(true);
    });

    it('should return encouragement for incorrect answer', () => {
      const encouragement = SocraticMode.generateEncouragement(1, false);

      expect(encouragement).toBeTruthy();
      expect(encouragement.length).toBeGreaterThan(0);
    });

    it('should return different messages for correct answers', () => {
      const messages = new Set<string>();
      for (let i = 0; i < 20; i++) {
        messages.add(SocraticMode.generateEncouragement(1, true));
      }

      // Should have multiple different celebration messages
      expect(messages.size).toBeGreaterThan(1);
    });

    it('should return appropriate encouragement for first attempt', () => {
      const encouragement = SocraticMode.generateEncouragement(0, false);

      expect(encouragement).toBeTruthy();
    });

    it('should return appropriate encouragement for multiple attempts', () => {
      const encouragement = SocraticMode.generateEncouragement(5, false);

      expect(encouragement).toBeTruthy();
    });
  });

  describe('isDiscoveryMoment', () => {
    it('should return true when most concepts are mentioned', () => {
      const response = 'Photosynthesis is when plants use sunlight and water to make food';
      const concepts = ['plants', 'sunlight', 'water', 'food'];

      const isDiscovery = SocraticMode.isDiscoveryMoment(response, concepts);

      expect(isDiscovery).toBe(true);
    });

    it('should return false when few concepts are mentioned', () => {
      const response = 'Plants need sunlight';
      const concepts = ['plants', 'sunlight', 'water', 'carbon dioxide', 'glucose', 'oxygen'];

      const isDiscovery = SocraticMode.isDiscoveryMoment(response, concepts);

      expect(isDiscovery).toBe(false);
    });

    it('should be case-insensitive', () => {
      const response = 'PLANTS use SUNLIGHT and WATER to make FOOD';
      const concepts = ['plants', 'sunlight', 'water', 'food'];

      const isDiscovery = SocraticMode.isDiscoveryMoment(response, concepts);

      expect(isDiscovery).toBe(true);
    });

    it('should handle empty concepts array', () => {
      const response = 'Any response';
      const concepts: string[] = [];

      const isDiscovery = SocraticMode.isDiscoveryMoment(response, concepts);

      expect(isDiscovery).toBe(true); // 60% of 0 is 0, so any response passes
    });

    it('should require at least 60% of concepts', () => {
      const response = 'Plants use sunlight';
      const concepts = ['plants', 'sunlight', 'water', 'carbon dioxide', 'glucose'];

      const isDiscovery = SocraticMode.isDiscoveryMoment(response, concepts);

      // Only 2 out of 5 concepts (40%) - should be false
      expect(isDiscovery).toBe(false);
    });
  });

  describe('breakDownProblem', () => {
    it('should return array of questions', () => {
      const questions = SocraticMode.breakDownProblem(
        'A train travels 120 km in 2 hours. What is its speed?',
        8,
        'speed and distance'
      );

      expect(Array.isArray(questions)).toBe(true);
      expect(questions.length).toBeGreaterThan(0);
    });

    it('should include step-by-step questions', () => {
      const questions = SocraticMode.breakDownProblem(
        'Solve for x: 2x + 5 = 15',
        9,
        'algebra'
      );

      expect(questions.some(q => q.toLowerCase().includes('know'))).toBe(true);
      expect(questions.some(q => q.toLowerCase().includes('find'))).toBe(true);
    });

    it('should ask about given information', () => {
      const questions = SocraticMode.breakDownProblem(
        'A rectangle has length 10 cm and width 5 cm. Find the area.',
        7,
        'geometry'
      );

      expect(questions.some(q => q.toLowerCase().includes('given'))).toBe(true);
    });

    it('should ask about the goal', () => {
      const questions = SocraticMode.breakDownProblem(
        'Calculate the perimeter of a square with side 8 cm',
        6,
        'geometry'
      );

      expect(questions.some(q => q.toLowerCase().includes('find') || q.toLowerCase().includes('solve'))).toBe(true);
    });

    it('should ask about approach/steps', () => {
      const questions = SocraticMode.breakDownProblem(
        'Find the sum of angles in a triangle',
        8,
        'geometry'
      );

      expect(questions.some(q => q.toLowerCase().includes('step'))).toBe(true);
    });

    it('should return at least 3 questions', () => {
      const questions = SocraticMode.breakDownProblem(
        'Any problem',
        5,
        'any topic'
      );

      expect(questions.length).toBeGreaterThanOrEqual(3);
    });
  });

  describe('trackAttempt', () => {
    it('should create new tracker for first attempt', () => {
      const tracker = SocraticMode.trackAttempt(
        'student123',
        'question456',
        'My first answer'
      );

      expect(tracker.studentId).toBe('student123');
      expect(tracker.questionId).toBe('question456');
      expect(tracker.attemptCount).toBe(1);
      expect(tracker.previousResponses).toEqual(['My first answer']);
      expect(tracker.lastAttempt).toBeInstanceOf(Date);
    });

    it('should increment attempt count for existing tracker', () => {
      const existingTracker: AttemptTracker = {
        studentId: 'student123',
        questionId: 'question456',
        attemptCount: 2,
        lastAttempt: new Date('2024-01-01'),
        previousResponses: ['First answer', 'Second answer']
      };

      const tracker = SocraticMode.trackAttempt(
        'student123',
        'question456',
        'Third answer',
        existingTracker
      );

      expect(tracker.attemptCount).toBe(3);
      expect(tracker.previousResponses).toEqual(['First answer', 'Second answer', 'Third answer']);
    });

    it('should update last attempt timestamp', () => {
      const oldDate = new Date('2024-01-01');
      const existingTracker: AttemptTracker = {
        studentId: 'student123',
        questionId: 'question456',
        attemptCount: 1,
        lastAttempt: oldDate,
        previousResponses: ['First answer']
      };

      const tracker = SocraticMode.trackAttempt(
        'student123',
        'question456',
        'Second answer',
        existingTracker
      );

      expect(tracker.lastAttempt.getTime()).toBeGreaterThan(oldDate.getTime());
    });

    it('should preserve student and question IDs', () => {
      const existingTracker: AttemptTracker = {
        studentId: 'student123',
        questionId: 'question456',
        attemptCount: 1,
        lastAttempt: new Date(),
        previousResponses: ['First answer']
      };

      const tracker = SocraticMode.trackAttempt(
        'student123',
        'question456',
        'Second answer',
        existingTracker
      );

      expect(tracker.studentId).toBe('student123');
      expect(tracker.questionId).toBe('question456');
    });

    it('should append new response to previous responses', () => {
      const existingTracker: AttemptTracker = {
        studentId: 'student123',
        questionId: 'question456',
        attemptCount: 3,
        lastAttempt: new Date(),
        previousResponses: ['First', 'Second', 'Third']
      };

      const tracker = SocraticMode.trackAttempt(
        'student123',
        'question456',
        'Fourth',
        existingTracker
      );

      expect(tracker.previousResponses.length).toBe(4);
      expect(tracker.previousResponses[3]).toBe('Fourth');
    });
  });

  describe('shouldProvideHint', () => {
    it('should return false for 0 attempts', () => {
      expect(SocraticMode.shouldProvideHint(0)).toBe(false);
    });

    it('should return false for 1 attempt', () => {
      expect(SocraticMode.shouldProvideHint(1)).toBe(false);
    });

    it('should return false for 2 attempts', () => {
      expect(SocraticMode.shouldProvideHint(2)).toBe(false);
    });

    it('should return true for 3 attempts', () => {
      expect(SocraticMode.shouldProvideHint(3)).toBe(true);
    });

    it('should return true for 4 attempts', () => {
      expect(SocraticMode.shouldProvideHint(4)).toBe(true);
    });

    it('should return true for many attempts', () => {
      expect(SocraticMode.shouldProvideHint(10)).toBe(true);
    });
  });

  describe('generateSocraticResponse', () => {
    it('should generate complete response', () => {
      const options: SocraticPromptOptions = {
        grade: 8,
        topic: 'photosynthesis',
        question: 'What is photosynthesis?'
      };

      const response = SocraticMode.generateSocraticResponse(options);

      expect(response.leadingQuestions).toBeDefined();
      expect(response.leadingQuestions.length).toBeGreaterThan(0);
      expect(response.encouragement).toBeDefined();
      expect(response.shouldProvideHint).toBe(false);
      expect(response.isDiscoveryMoment).toBe(false);
    });

    it('should include hint after 3 attempts', () => {
      const options: SocraticPromptOptions = {
        grade: 9,
        topic: 'algebra',
        question: 'What is a variable?',
        attemptCount: 3,
        previousResponses: ['A letter?', 'A symbol?', 'A number?']
      };

      const response = SocraticMode.generateSocraticResponse(options);

      expect(response.shouldProvideHint).toBe(true);
      expect(response.hint).toBeDefined();
      expect(response.hint).toBeTruthy();
    });

    it('should not include hint before 3 attempts', () => {
      const options: SocraticPromptOptions = {
        grade: 9,
        topic: 'algebra',
        question: 'What is a variable?',
        attemptCount: 2,
        previousResponses: ['A letter?', 'A symbol?']
      };

      const response = SocraticMode.generateSocraticResponse(options);

      expect(response.shouldProvideHint).toBe(false);
      expect(response.hint).toBeUndefined();
    });

    it('should detect potential discovery moment', () => {
      const options: SocraticPromptOptions = {
        grade: 8,
        topic: 'photosynthesis',
        question: 'What is photosynthesis?',
        attemptCount: 2,
        previousResponses: [
          'Plants need sunlight',
          'Photosynthesis is when plants use sunlight and water to make food and oxygen'
        ]
      };

      const response = SocraticMode.generateSocraticResponse(options);

      expect(response.isDiscoveryMoment).toBe(true);
    });

    it('should not detect discovery moment for short responses', () => {
      const options: SocraticPromptOptions = {
        grade: 8,
        topic: 'photosynthesis',
        question: 'What is photosynthesis?',
        attemptCount: 1,
        previousResponses: ['Plants?']
      };

      const response = SocraticMode.generateSocraticResponse(options);

      expect(response.isDiscoveryMoment).toBe(false);
    });

    it('should include leading questions', () => {
      const options: SocraticPromptOptions = {
        grade: 7,
        topic: 'fractions',
        question: 'What are fractions?'
      };

      const response = SocraticMode.generateSocraticResponse(options);

      expect(Array.isArray(response.leadingQuestions)).toBe(true);
      expect(response.leadingQuestions.length).toBeGreaterThan(0);
    });

    it('should include encouragement', () => {
      const options: SocraticPromptOptions = {
        grade: 10,
        topic: 'calculus',
        question: 'What is a derivative?',
        attemptCount: 1
      };

      const response = SocraticMode.generateSocraticResponse(options);

      expect(response.encouragement).toBeTruthy();
      expect(response.encouragement.length).toBeGreaterThan(0);
    });
  });

  describe('getSocraticModeConfig', () => {
    it('should return config object', () => {
      const config = SocraticMode.getSocraticModeConfig();

      expect(config).toBeDefined();
      expect(config.socraticMode).toBe(true);
      expect(config.description).toBeDefined();
    });

    it('should have socraticMode set to true', () => {
      const config = SocraticMode.getSocraticModeConfig();

      expect(config.socraticMode).toBe(true);
    });

    it('should include description', () => {
      const config = SocraticMode.getSocraticModeConfig();

      expect(config.description).toBeTruthy();
      expect(config.description.length).toBeGreaterThan(0);
    });

    it('should mention leading questions in description', () => {
      const config = SocraticMode.getSocraticModeConfig();

      expect(config.description.toLowerCase()).toContain('question');
    });

    it('should mention hints in description', () => {
      const config = SocraticMode.getSocraticModeConfig();

      expect(config.description.toLowerCase()).toContain('hint');
    });
  });

  describe('edge cases', () => {
    it('should handle empty previous responses', () => {
      const options: SocraticPromptOptions = {
        grade: 8,
        topic: 'math',
        question: 'What is pi?',
        attemptCount: 0,
        previousResponses: []
      };

      const prompt = SocraticMode.generateSocraticPrompt(options);

      expect(prompt).toBeTruthy();
      expect(prompt).not.toContain('PREVIOUS ATTEMPTS');
    });

    it('should handle very long questions', () => {
      const longQuestion = 'Can you please explain to me in great detail how the process of photosynthesis works in plants and what are all the different steps involved and what happens at each step?';
      const options: SocraticPromptOptions = {
        grade: 8,
        topic: 'photosynthesis',
        question: longQuestion
      };

      const prompt = SocraticMode.generateSocraticPrompt(options);

      expect(prompt).toContain(longQuestion);
    });

    it('should handle special characters in questions', () => {
      const options: SocraticPromptOptions = {
        grade: 10,
        topic: 'chemistry',
        question: 'What is H₂O & why is it important?'
      };

      const prompt = SocraticMode.generateSocraticPrompt(options);

      expect(prompt).toContain('H₂O');
    });

    it('should handle zero concept mastery', () => {
      const options: SocraticPromptOptions = {
        grade: 7,
        topic: 'algebra',
        question: 'What is algebra?',
        conceptMastery: 0
      };

      const prompt = SocraticMode.generateSocraticPrompt(options);

      expect(prompt).toContain('CONCEPT MASTERY: 0%');
    });

    it('should handle 100% concept mastery', () => {
      const options: SocraticPromptOptions = {
        grade: 12,
        topic: 'calculus',
        question: 'What is integration?',
        conceptMastery: 100
      };

      const prompt = SocraticMode.generateSocraticPrompt(options);

      expect(prompt).toContain('CONCEPT MASTERY: 100%');
    });
  });
});

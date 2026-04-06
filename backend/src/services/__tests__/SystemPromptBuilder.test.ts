/**
 * Unit tests for SystemPromptBuilder
 */

import { describe, it, expect } from 'vitest';
import { SystemPromptBuilder } from '../SystemPromptBuilder.js';

describe('SystemPromptBuilder', () => {
  describe('buildPrompt', () => {
    it('should build basic prompt with student context', () => {
      const studentContext = {
        studentId: 'student-1',
        name: 'Alice',
        grade: 5,
        preferredLanguage: 'en',
      };

      const prompt = SystemPromptBuilder.buildPrompt(studentContext);

      expect(prompt).toContain('You are Haru');
      expect(prompt).toContain('Alice');
      expect(prompt).toContain('Grade: 5');
      expect(prompt).toContain('Language: en');
    });

    it('should include learning style guidance', () => {
      const studentContext = {
        studentId: 'student-1',
        name: 'Bob',
        grade: 6,
        preferredLanguage: 'en',
        learningStyle: 'visual' as const,
      };

      const prompt = SystemPromptBuilder.buildPrompt(studentContext);

      expect(prompt).toContain('Learning Style: visual');
      expect(prompt).toContain('diagrams');
    });

    it('should include cognitive load warning', () => {
      const studentContext = {
        studentId: 'student-1',
        name: 'Charlie',
        grade: 7,
        preferredLanguage: 'en',
        cognitiveLoadThreshold: 85,
      };

      const prompt = SystemPromptBuilder.buildPrompt(studentContext);

      expect(prompt).toContain('Cognitive Load Threshold: 85/100');
      expect(prompt).toContain('high cognitive load');
    });

    it('should include neurodiversity accommodations', () => {
      const studentContext = {
        studentId: 'student-1',
        name: 'Diana',
        grade: 8,
        preferredLanguage: 'en',
        neurodiversityFlags: [
          {
            type: 'dyslexia',
            accommodations: ['Use simple fonts', 'Increase spacing'],
          },
        ],
      };

      const prompt = SystemPromptBuilder.buildPrompt(studentContext);

      expect(prompt).toContain('ACCOMMODATIONS');
      expect(prompt).toContain('dyslexia');
      expect(prompt).toContain('Use simple fonts');
    });

    it('should include topic context', () => {
      const studentContext = {
        studentId: 'student-1',
        name: 'Eve',
        grade: 9,
        preferredLanguage: 'en',
      };

      const topicContext = {
        subject: 'Mathematics',
        topic: 'Quadratic Equations',
        difficulty: 'medium' as const,
        currentMastery: 65,
      };

      const prompt = SystemPromptBuilder.buildPrompt(studentContext, topicContext);

      expect(prompt).toContain('CURRENT TOPIC');
      expect(prompt).toContain('Mathematics');
      expect(prompt).toContain('Quadratic Equations');
      expect(prompt).toContain('Difficulty: medium');
      expect(prompt).toContain('Current Mastery: 65%');
    });

    it('should include low mastery warning', () => {
      const studentContext = {
        studentId: 'student-1',
        name: 'Frank',
        grade: 10,
        preferredLanguage: 'en',
      };

      const topicContext = {
        subject: 'Physics',
        topic: 'Newton\'s Laws',
        difficulty: 'hard' as const,
        currentMastery: 35,
      };

      const prompt = SystemPromptBuilder.buildPrompt(studentContext, topicContext);

      expect(prompt).toContain('struggling');
      expect(prompt).toContain('simpler explanations');
    });

    it('should include session context', () => {
      const studentContext = {
        studentId: 'student-1',
        name: 'Grace',
        grade: 11,
        preferredLanguage: 'en',
      };

      const sessionContext = {
        sessionId: 'session-1',
        duration: 1800000, // 30 minutes
        confusionCount: 2,
        questionsAsked: 5,
        topicsCovered: ['Algebra', 'Geometry'],
      };

      const prompt = SystemPromptBuilder.buildPrompt(studentContext, undefined, sessionContext);

      expect(prompt).toContain('SESSION CONTEXT');
      expect(prompt).toContain('Duration: 30 minutes');
      expect(prompt).toContain('Questions Asked: 5');
      expect(prompt).toContain('Confusion Events: 2');
      expect(prompt).toContain('Algebra, Geometry');
    });

    it('should include teaching modes', () => {
      const studentContext = {
        studentId: 'student-1',
        name: 'Henry',
        grade: 12,
        preferredLanguage: 'en',
      };

      const teachingMode = {
        socraticMode: true,
        analogySwitching: true,
      };

      const prompt = SystemPromptBuilder.buildPrompt(
        studentContext,
        undefined,
        undefined,
        teachingMode
      );

      expect(prompt).toContain('TEACHING MODE');
      expect(prompt).toContain('Socratic Mode: ACTIVE');
      expect(prompt).toContain('Analogy Switching: ACTIVE');
      expect(prompt).toContain('leading questions');
    });

    it('should include confusion adjustment', () => {
      const studentContext = {
        studentId: 'student-1',
        name: 'Iris',
        grade: 6,
        preferredLanguage: 'en',
      };

      const confusionAdjustment = 'Student is confused about fractions. Use pizza analogy.';

      const prompt = SystemPromptBuilder.buildPrompt(
        studentContext,
        undefined,
        undefined,
        undefined,
        confusionAdjustment
      );

      expect(prompt).toContain('CONFUSION DETECTED');
      expect(prompt).toContain('pizza analogy');
    });
  });

  describe('buildSimplePrompt', () => {
    it('should build simple prompt', () => {
      const prompt = SystemPromptBuilder.buildSimplePrompt('Jack', 7);

      expect(prompt).toContain('You are Haru');
      expect(prompt).toContain('Jack');
      expect(prompt).toContain('grade 7');
      expect(prompt).toContain('patient');
      expect(prompt).toContain('encouraging');
    });
  });

  describe('buildAnonymousPrompt', () => {
    it('should build anonymous prompt', () => {
      const prompt = SystemPromptBuilder.buildAnonymousPrompt(8, 'Science');

      expect(prompt).toContain('You are Haru');
      expect(prompt).toContain('anonymous');
      expect(prompt).toContain('grade 8');
      expect(prompt).toContain('Science');
      expect(prompt).toContain('safe');
    });
  });
});

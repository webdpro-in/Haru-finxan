/**
 * Comprehensive unit tests for PrerequisiteDetector
 * Targeting 90%+ coverage for core algorithm (legacy static methods)
 */

import { describe, it, expect } from 'vitest';
import { PrerequisiteDetector, type PrerequisiteCheck, type Prerequisite } from '../PrerequisiteDetector.js';

describe('PrerequisiteDetector - Comprehensive Coverage (Legacy Methods)', () => {
  describe('checkPrerequisites', () => {
    it('should return ready to learn when all prerequisites are met', () => {
      const studentMasteries = new Map([
        ['arithmetic', 80],
        ['fractions', 75],
      ]);

      const result = PrerequisiteDetector.checkPrerequisites('algebra', studentMasteries);

      expect(result.readyToLearn).toBe(true);
      expect(result.missingPrerequisites).toHaveLength(0);
      expect(result.recommendedPath).toHaveLength(0);
    });

    it('should detect missing prerequisites', () => {
      const studentMasteries = new Map([
        ['arithmetic', 50], // Below 60 threshold
      ]);

      const result = PrerequisiteDetector.checkPrerequisites('algebra', studentMasteries);

      expect(result.readyToLearn).toBe(false);
      expect(result.missingPrerequisites.length).toBeGreaterThan(0);
      expect(result.missingPrerequisites).toContain('Basic Arithmetic');
    });

    it('should handle topic with no prerequisites', () => {
      const studentMasteries = new Map();

      const result = PrerequisiteDetector.checkPrerequisites('unknown_topic', studentMasteries);

      expect(result.readyToLearn).toBe(true);
      expect(result.prerequisites).toHaveLength(0);
      expect(result.missingPrerequisites).toHaveLength(0);
    });

    it('should handle calculus prerequisites', () => {
      const studentMasteries = new Map([
        ['algebra', 50], // Missing
        ['functions', 70], // OK
        ['limits', 55], // Missing
      ]);

      cons
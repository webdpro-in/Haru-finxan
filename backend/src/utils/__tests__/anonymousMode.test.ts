/**
 * Unit tests for Anonymous Mode utilities
 * 
 * Tests student ID hashing functionality for anonymous question submission.
 * 
 * Task 16.1: Implement student ID hashing
 */

import { describe, it, expect, beforeEach, afterEach } from 'vitest';
import { hashStudentId, verifyStudentIdHash, createAnonymousIdentifier } from '../anonymousMode';

describe('anonymousMode', () => {
  const originalEnv = process.env;

  beforeEach(() => {
    // Reset environment before each test
    process.env = { ...originalEnv };
    process.env.SALT = 'test-salt-for-hashing-12345';
  });

  afterEach(() => {
    // Restore original environment
    process.env = originalEnv;
  });

  describe('hashStudentId', () => {
    it('should hash a student ID consistently', () => {
      const studentId = 'student-123';
      const hash1 = hashStudentId(studentId);
      const hash2 = hashStudentId(studentId);

      expect(hash1).toBe(hash2);
      expect(hash1).toBeTruthy();
      expect(typeof hash1).toBe('string');
    });

    it('should produce different hashes for different student IDs', () => {
      const hash1 = hashStudentId('student-123');
      const hash2 = hashStudentId('student-456');

      expect(hash1).not.toBe(hash2);
    });

    it('should produce a 64-character hexadecimal string (SHA-256)', () => {
      const hash = hashStudentId('student-123');

      expect(hash).toHaveLength(64);
      expect(hash).toMatch(/^[a-f0-9]{64}$/);
    });

    it('should throw error if student ID is empty', () => {
      expect(() => hashStudentId('')).toThrow('Student ID cannot be empty');
    });

    it('should throw error if student ID is only whitespace', () => {
      expect(() => hashStudentId('   ')).toThrow('Student ID cannot be empty');
    });

    it('should throw error if SALT environment variable is not set', () => {
      delete process.env.SALT;

      expect(() => hashStudentId('student-123')).toThrow('SALT environment variable is not set');
    });

    it('should produce different hashes with different salts', () => {
      const studentId = 'student-123';
      
      process.env.SALT = 'salt-1';
      const hash1 = hashStudentId(studentId);

      process.env.SALT = 'salt-2';
      const hash2 = hashStudentId(studentId);

      expect(hash1).not.toBe(hash2);
    });

    it('should handle special characters in student ID', () => {
      const studentId = 'student@123#test';
      const hash = hashStudentId(studentId);

      expect(hash).toBeTruthy();
      expect(hash).toHaveLength(64);
    });

    it('should handle UUID format student IDs', () => {
      const studentId = '550e8400-e29b-41d4-a716-446655440000';
      const hash = hashStudentId(studentId);

      expect(hash).toBeTruthy();
      expect(hash).toHaveLength(64);
    });

    it('should be case-sensitive', () => {
      const hash1 = hashStudentId('Student-123');
      const hash2 = hashStudentId('student-123');

      expect(hash1).not.toBe(hash2);
    });
  });

  describe('verifyStudentIdHash', () => {
    it('should verify correct student ID against hash', () => {
      const studentId = 'student-123';
      const hash = hashStudentId(studentId);

      const isValid = verifyStudentIdHash(studentId, hash);

      expect(isValid).toBe(true);
    });

    it('should reject incorrect student ID', () => {
      const studentId = 'student-123';
      const hash = hashStudentId(studentId);

      const isValid = verifyStudentIdHash('student-456', hash);

      expect(isValid).toBe(false);
    });

    it('should reject invalid hash format', () => {
      const isValid = verifyStudentIdHash('student-123', 'invalid-hash');

      expect(isValid).toBe(false);
    });

    it('should return false if student ID is empty', () => {
      const hash = hashStudentId('student-123');
      const isValid = verifyStudentIdHash('', hash);

      expect(isValid).toBe(false);
    });

    it('should return false if SALT is not set', () => {
      const studentId = 'student-123';
      const hash = hashStudentId(studentId);

      delete process.env.SALT;

      const isValid = verifyStudentIdHash(studentId, hash);

      expect(isValid).toBe(false);
    });

    it('should handle multiple verifications correctly', () => {
      const studentId1 = 'student-123';
      const studentId2 = 'student-456';
      const hash1 = hashStudentId(studentId1);
      const hash2 = hashStudentId(studentId2);

      expect(verifyStudentIdHash(studentId1, hash1)).toBe(true);
      expect(verifyStudentIdHash(studentId2, hash2)).toBe(true);
      expect(verifyStudentIdHash(studentId1, hash2)).toBe(false);
      expect(verifyStudentIdHash(studentId2, hash1)).toBe(false);
    });
  });

  describe('createAnonymousIdentifier', () => {
    it('should create consistent anonymous identifier', () => {
      const studentId = 'student-123';
      const id1 = createAnonymousIdentifier(studentId);
      const id2 = createAnonymousIdentifier(studentId);

      expect(id1).toBe(id2);
    });

    it('should create different identifiers for different students', () => {
      const id1 = createAnonymousIdentifier('student-123');
      const id2 = createAnonymousIdentifier('student-456');

      expect(id1).not.toBe(id2);
    });

    it('should start with "anon-" prefix', () => {
      const id = createAnonymousIdentifier('student-123');

      expect(id).toMatch(/^anon-/);
    });

    it('should be 13 characters long (anon- + 8 hex chars)', () => {
      const id = createAnonymousIdentifier('student-123');

      expect(id).toHaveLength(13);
    });

    it('should contain only lowercase hexadecimal characters after prefix', () => {
      const id = createAnonymousIdentifier('student-123');
      const hexPart = id.substring(5); // Remove "anon-" prefix

      expect(hexPart).toMatch(/^[a-f0-9]{8}$/);
    });

    it('should handle multiple student IDs', () => {
      const ids = [
        createAnonymousIdentifier('student-1'),
        createAnonymousIdentifier('student-2'),
        createAnonymousIdentifier('student-3'),
      ];

      // All should be unique
      const uniqueIds = new Set(ids);
      expect(uniqueIds.size).toBe(3);

      // All should follow the format
      ids.forEach(id => {
        expect(id).toMatch(/^anon-[a-f0-9]{8}$/);
      });
    });

    it('should throw error if student ID is empty', () => {
      expect(() => createAnonymousIdentifier('')).toThrow('Student ID cannot be empty');
    });

    it('should throw error if SALT is not set', () => {
      delete process.env.SALT;

      expect(() => createAnonymousIdentifier('student-123')).toThrow('SALT environment variable is not set');
    });
  });

  describe('Integration scenarios', () => {
    it('should support anonymous question workflow', () => {
      const studentId = 'student-123';
      
      // Student submits anonymous question
      const anonymousHash = hashStudentId(studentId);
      const displayId = createAnonymousIdentifier(studentId);

      // Teacher sees anonymous identifier
      expect(displayId).toMatch(/^anon-/);

      // System can verify for analytics (without revealing identity)
      expect(verifyStudentIdHash(studentId, anonymousHash)).toBe(true);
      expect(verifyStudentIdHash('different-student', anonymousHash)).toBe(false);
    });

    it('should maintain consistency across multiple operations', () => {
      const studentId = 'student-123';

      // Multiple hashing operations should be consistent
      const hashes = [
        hashStudentId(studentId),
        hashStudentId(studentId),
        hashStudentId(studentId),
      ];

      expect(hashes[0]).toBe(hashes[1]);
      expect(hashes[1]).toBe(hashes[2]);

      // Multiple identifier creations should be consistent
      const identifiers = [
        createAnonymousIdentifier(studentId),
        createAnonymousIdentifier(studentId),
        createAnonymousIdentifier(studentId),
      ];

      expect(identifiers[0]).toBe(identifiers[1]);
      expect(identifiers[1]).toBe(identifiers[2]);
    });

    it('should handle classroom with multiple anonymous questions', () => {
      const students = ['student-1', 'student-2', 'student-3'];
      
      const anonymousData = students.map(studentId => ({
        hash: hashStudentId(studentId),
        displayId: createAnonymousIdentifier(studentId),
      }));

      // All hashes should be unique
      const hashes = anonymousData.map(d => d.hash);
      expect(new Set(hashes).size).toBe(3);

      // All display IDs should be unique
      const displayIds = anonymousData.map(d => d.displayId);
      expect(new Set(displayIds).size).toBe(3);

      // Each student can be verified
      students.forEach((studentId, index) => {
        expect(verifyStudentIdHash(studentId, anonymousData[index].hash)).toBe(true);
      });
    });
  });

  describe('Security properties', () => {
    it('should not reveal student ID from hash', () => {
      const studentId = 'student-123';
      const hash = hashStudentId(studentId);

      // Hash should not contain the student ID
      expect(hash).not.toContain('student');
      expect(hash).not.toContain('123');
    });

    it('should not reveal student ID from anonymous identifier', () => {
      const studentId = 'student-123';
      const id = createAnonymousIdentifier(studentId);

      // Identifier should not contain the student ID
      expect(id).not.toContain('student');
      expect(id).not.toContain('123');
    });

    it('should produce cryptographically strong hashes', () => {
      // Generate multiple hashes and check distribution
      const hashes = Array.from({ length: 100 }, (_, i) => 
        hashStudentId(`student-${i}`)
      );

      // All hashes should be unique
      const uniqueHashes = new Set(hashes);
      expect(uniqueHashes.size).toBe(100);

      // Hashes should have good distribution (check first character variety)
      const firstChars = new Set(hashes.map(h => h[0]));
      expect(firstChars.size).toBeGreaterThan(5); // Should have variety
    });
  });
});

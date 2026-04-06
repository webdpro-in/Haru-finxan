/**
 * Anonymous Mode Utilities
 * 
 * Implements student ID hashing for anonymous question submission.
 * 
 * REQ-3.1.2: System SHALL create one-way hash of student ID for analytics
 * REQ-3.1.6: System SHALL never reveal question author to teacher
 * 
 * Task 16.1: Implement student ID hashing
 */

import crypto from 'crypto';

/**
 * Hash a student ID using SHA-256 with a secret salt
 * 
 * Preconditions:
 * - studentId is non-empty string
 * - SALT environment variable is set
 * 
 * Postconditions:
 * - Returns consistent hash for same student ID
 * - Hash is one-way (cannot be reversed)
 * - Same student ID always produces same hash
 * 
 * @param studentId - The student ID to hash
 * @returns Hexadecimal hash string
 * @throws Error if SALT environment variable is not set
 */
export function hashStudentId(studentId: string): string {
  // Validate input
  if (!studentId || studentId.trim().length === 0) {
    throw new Error('Student ID cannot be empty');
  }

  // Get salt from environment
  const salt = process.env.SALT;
  if (!salt) {
    throw new Error('SALT environment variable is not set');
  }

  // Create SHA-256 hash with salt
  const hash = crypto
    .createHash('sha256')
    .update(studentId + salt)
    .digest('hex');

  return hash;
}

/**
 * Verify that a student ID matches a given hash
 * 
 * This is useful for analytics and verification purposes while maintaining anonymity.
 * 
 * Preconditions:
 * - studentId is non-empty string
 * - hash is valid hexadecimal string
 * 
 * Postconditions:
 * - Returns true if studentId hashes to the given hash
 * - Returns false otherwise
 * 
 * @param studentId - The student ID to verify
 * @param hash - The hash to compare against
 * @returns True if the student ID matches the hash
 */
export function verifyStudentIdHash(studentId: string, hash: string): boolean {
  try {
    const computedHash = hashStudentId(studentId);
    return computedHash === hash;
  } catch (error) {
    return false;
  }
}

/**
 * Create an anonymous identifier for a student
 * 
 * This generates a shorter, more readable identifier while maintaining anonymity.
 * Useful for displaying anonymous questions in the UI.
 * 
 * Preconditions:
 * - studentId is non-empty string
 * 
 * Postconditions:
 * - Returns consistent 8-character identifier
 * - Same student ID always produces same identifier
 * 
 * @param studentId - The student ID
 * @returns 8-character anonymous identifier (e.g., "anon-a3f2")
 */
export function createAnonymousIdentifier(studentId: string): string {
  const hash = hashStudentId(studentId);
  // Take first 8 characters of hash for a shorter identifier
  const shortHash = hash.substring(0, 8);
  return `anon-${shortHash}`;
}

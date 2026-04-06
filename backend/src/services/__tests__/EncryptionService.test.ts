/**
 * EncryptionService Tests
 * 
 * Tests DPDP 2026 compliance requirements:
 * - REQ-7.1.8: Encrypt all PII with AES-256
 * - REQ-7.1.9: Hash passwords with Argon2id
 */

import { describe, it, expect, beforeAll, vi } from 'vitest';

// Set encryption key BEFORE importing EncryptionService
process.env.ENCRYPTION_KEY = 'test-encryption-key-for-unit-tests-only';

import { EncryptionService } from '../EncryptionService';

describe('EncryptionService', () => {
  let encryptionService: EncryptionService;

  beforeAll(() => {
    encryptionService = new EncryptionService();
  });

  describe('AES-256 Encryption', () => {
    it('should encrypt plaintext data', () => {
      const plaintext = 'sensitive-data@example.com';

      const encrypted = encryptionService.encrypt(plaintext);

      expect(encrypted).toBeDefined();
      expect(encrypted).not.toBe(plaintext);
      expect(encrypted.length).toBeGreaterThan(0);
    });

    it('should decrypt encrypted data back to plaintext', () => {
      const plaintext = 'test@example.com';

      const encrypted = encryptionService.encrypt(plaintext);
      const decrypted = encryptionService.decrypt(encrypted);

      expect(decrypted).toBe(plaintext);
    });

    it('should produce different ciphertext for same plaintext (due to random IV)', () => {
      const plaintext = 'same-data';

      const encrypted1 = encryptionService.encrypt(plaintext);
      const encrypted2 = encryptionService.encrypt(plaintext);

      expect(encrypted1).not.toBe(encrypted2);

      // But both should decrypt to same plaintext
      expect(encryptionService.decrypt(encrypted1)).toBe(plaintext);
      expect(encryptionService.decrypt(encrypted2)).toBe(plaintext);
    });

    it('should handle empty strings', () => {
      const encrypted = encryptionService.encrypt('');
      expect(encrypted).toBe('');

      const decrypted = encryptionService.decrypt('');
      expect(decrypted).toBe('');
    });

    it('should encrypt and decrypt special characters', () => {
      const plaintext = 'Test!@#$%^&*()_+-=[]{}|;:,.<>?';

      const encrypted = encryptionService.encrypt(plaintext);
      const decrypted = encryptionService.decrypt(encrypted);

      expect(decrypted).toBe(plaintext);
    });

    it('should encrypt and decrypt Unicode characters', () => {
      const plaintext = 'Hello 世界 🌍 नमस्ते';

      const encrypted = encryptionService.encrypt(plaintext);
      const decrypted = encryptionService.decrypt(encrypted);

      expect(decrypted).toBe(plaintext);
    });

    it('should encrypt and decrypt long text', () => {
      const plaintext = 'A'.repeat(10000);

      const encrypted = encryptionService.encrypt(plaintext);
      const decrypted = encryptionService.decrypt(encrypted);

      expect(decrypted).toBe(plaintext);
    });

    it('should throw error for invalid encrypted data format', () => {
      const invalidData = 'invalid-encrypted-data';

      expect(() => {
        encryptionService.decrypt(invalidData);
      }).toThrow();
    });

    it('should use AES-256-GCM with authentication', () => {
      const plaintext = 'authenticated-data';

      const encrypted = encryptionService.encrypt(plaintext);

      // Verify format: iv:authTag:encrypted
      const parts = encrypted.split(':');
      expect(parts.length).toBe(3);
      expect(parts[0].length).toBeGreaterThan(0); // IV
      expect(parts[1].length).toBeGreaterThan(0); // Auth tag
      expect(parts[2].length).toBeGreaterThan(0); // Encrypted data
    });
  });

  describe('Argon2id Password Hashing', () => {
    it('should hash password using Argon2id', async () => {
      const password = 'SecurePassword123!';

      const hash = await encryptionService.hashPassword(password);

      expect(hash).toBeDefined();
      expect(hash.length).toBeGreaterThan(0);
      expect(hash).not.toBe(password);
    });

    it('should produce different hashes for same password (due to random salt)', async () => {
      const password = 'SamePassword123';

      const hash1 = await encryptionService.hashPassword(password);
      const hash2 = await encryptionService.hashPassword(password);

      expect(hash1).not.toBe(hash2);
    });

    it('should verify correct password', async () => {
      const password = 'CorrectPassword123!';

      const hash = await encryptionService.hashPassword(password);
      const isValid = await encryptionService.verifyPassword(password, hash);

      expect(isValid).toBe(true);
    });

    it('should reject incorrect password', async () => {
      const correctPassword = 'CorrectPassword123!';
      const wrongPassword = 'WrongPassword456!';

      const hash = await encryptionService.hashPassword(correctPassword);
      const isValid = await encryptionService.verifyPassword(wrongPassword, hash);

      expect(isValid).toBe(false);
    });

    it('should reject empty password', async () => {
      await expect(
        encryptionService.hashPassword('')
      ).rejects.toThrow();
    });

    it('should handle password verification with empty inputs', async () => {
      const hash = await encryptionService.hashPassword('test');

      const isValid1 = await encryptionService.verifyPassword('', hash);
      const isValid2 = await encryptionService.verifyPassword('test', '');

      expect(isValid1).toBe(false);
      expect(isValid2).toBe(false);
    });

    it('should use Argon2id variant', async () => {
      const password = 'TestPassword123';

      const hash = await encryptionService.hashPassword(password);

      // Argon2id hashes start with $argon2id$
      expect(hash).toMatch(/^\$argon2id\$/);
    });
  });

  describe('Field Encryption', () => {
    it('should encrypt multiple fields in an object', () => {
      const data = {
        name: 'John Doe',
        email: 'john@example.com',
        phone: '+1234567890',
        publicField: 'not-encrypted'
      };

      const encrypted = encryptionService.encryptFields(data, ['name', 'email', 'phone']);

      expect(encrypted.name).not.toBe(data.name);
      expect(encrypted.email).not.toBe(data.email);
      expect(encrypted.phone).not.toBe(data.phone);
      expect(encrypted.publicField).toBe(data.publicField);
    });

    it('should decrypt multiple fields in an object', () => {
      const data = {
        name: 'Jane Smith',
        email: 'jane@example.com',
        age: 25
      };

      const encrypted = encryptionService.encryptFields(data, ['name', 'email']);
      const decrypted = encryptionService.decryptFields(encrypted, ['name', 'email']);

      expect(decrypted.name).toBe(data.name);
      expect(decrypted.email).toBe(data.email);
      expect(decrypted.age).toBe(data.age);
    });

    it('should handle non-existent fields gracefully', () => {
      const data = {
        name: 'Test User'
      };

      const encrypted = encryptionService.encryptFields(data, ['name', 'nonExistent' as any]);

      expect(encrypted.name).not.toBe(data.name);
      expect(encrypted).not.toHaveProperty('nonExistent');
    });
  });

  describe('Utility Functions', () => {
    it('should generate secure random tokens', () => {
      const token1 = encryptionService.generateSecureToken();
      const token2 = encryptionService.generateSecureToken();

      expect(token1).toBeDefined();
      expect(token2).toBeDefined();
      expect(token1).not.toBe(token2);
      expect(token1.length).toBe(64); // 32 bytes = 64 hex chars
    });

    it('should generate tokens of specified length', () => {
      const token16 = encryptionService.generateSecureToken(16);
      const token64 = encryptionService.generateSecureToken(64);

      expect(token16.length).toBe(32); // 16 bytes = 32 hex chars
      expect(token64.length).toBe(128); // 64 bytes = 128 hex chars
    });

    it('should hash data using SHA-256', () => {
      const data = 'data-to-hash';

      const hash = encryptionService.hashData(data);

      expect(hash).toBeDefined();
      expect(hash.length).toBe(64); // SHA-256 = 64 hex chars
    });

    it('should produce consistent hashes for same data', () => {
      const data = 'consistent-data';

      const hash1 = encryptionService.hashData(data);
      const hash2 = encryptionService.hashData(data);

      expect(hash1).toBe(hash2);
    });

    it('should produce different hashes for different data', () => {
      const data1 = 'data-one';
      const data2 = 'data-two';

      const hash1 = encryptionService.hashData(data1);
      const hash2 = encryptionService.hashData(data2);

      expect(hash1).not.toBe(hash2);
    });
  });

  describe('DPDP Compliance', () => {
    it('REQ-7.1.8: should encrypt PII with AES-256', () => {
      const pii = {
        name: 'Student Name',
        email: 'student@school.edu',
        phone: '+91-9876543210',
        address: '123 Main St, City'
      };

      const encrypted = encryptionService.encryptFields(pii, ['name', 'email', 'phone', 'address']);

      // Verify all PII fields are encrypted
      expect(encrypted.name).not.toBe(pii.name);
      expect(encrypted.email).not.toBe(pii.email);
      expect(encrypted.phone).not.toBe(pii.phone);
      expect(encrypted.address).not.toBe(pii.address);

      // Verify encryption is reversible
      const decrypted = encryptionService.decryptFields(encrypted, ['name', 'email', 'phone', 'address']);
      expect(decrypted).toEqual(pii);
    });

    it('REQ-7.1.9: should hash passwords with Argon2id', async () => {
      const password = 'UserPassword123!';

      const hash = await encryptionService.hashPassword(password);

      // Verify Argon2id is used
      expect(hash).toMatch(/^\$argon2id\$/);

      // Verify password can be verified
      const isValid = await encryptionService.verifyPassword(password, hash);
      expect(isValid).toBe(true);
    });

    it('should use strong encryption parameters', async () => {
      const password = 'TestPassword';

      const hash = await encryptionService.hashPassword(password);

      // Argon2id hash format: $argon2id$v=19$m=65536,t=3,p=4$...
      // Verify memory cost (m), time cost (t), parallelism (p)
      expect(hash).toMatch(/\$argon2id\$v=19\$m=65536,t=3,p=4\$/);
    });
  });
});

/**
 * EncryptionService
 * 
 * Implements DPDP 2026 compliance for data encryption:
 * - REQ-7.1.8: Encrypt all PII with AES-256
 * - REQ-7.1.9: Hash passwords with Argon2id
 */

import crypto from 'crypto';
import argon2 from 'argon2';

export class EncryptionService {
  private readonly algorithm = 'aes-256-gcm';
  private readonly keyLength = 32; // 256 bits
  private readonly ivLength = 16; // 128 bits
  private readonly saltLength = 64;
  private readonly tagLength = 16;

  private encryptionKey: Buffer;

  constructor() {
    // Get encryption key from environment variable
    const key = process.env.ENCRYPTION_KEY;
    
    if (!key) {
      throw new Error('ENCRYPTION_KEY environment variable is required');
    }

    // Derive 256-bit key from environment variable
    this.encryptionKey = crypto.scryptSync(key, 'salt', this.keyLength);
  }

  /**
   * Encrypt PII data using AES-256-GCM
   * REQ-7.1.8: Encrypt all PII with AES-256
   * 
   * @param plaintext - Data to encrypt
   * @returns Encrypted data with IV and auth tag (format: iv:authTag:encrypted)
   */
  encrypt(plaintext: string): string {
    if (!plaintext) {
      return '';
    }

    // Generate random IV
    const iv = crypto.randomBytes(this.ivLength);

    // Create cipher
    const cipher = crypto.createCipheriv(this.algorithm, this.encryptionKey, iv);

    // Encrypt data
    let encrypted = cipher.update(plaintext, 'utf8', 'hex');
    encrypted += cipher.final('hex');

    // Get authentication tag
    const authTag = cipher.getAuthTag();

    // Return format: iv:authTag:encrypted
    return `${iv.toString('hex')}:${authTag.toString('hex')}:${encrypted}`;
  }

  /**
   * Decrypt PII data using AES-256-GCM
   * 
   * @param ciphertext - Encrypted data (format: iv:authTag:encrypted)
   * @returns Decrypted plaintext
   */
  decrypt(ciphertext: string): string {
    if (!ciphertext) {
      return '';
    }

    try {
      // Parse encrypted data
      const parts = ciphertext.split(':');
      if (parts.length !== 3) {
        throw new Error('Invalid encrypted data format');
      }

      const iv = Buffer.from(parts[0], 'hex');
      const authTag = Buffer.from(parts[1], 'hex');
      const encrypted = parts[2];

      // Create decipher
      const decipher = crypto.createDecipheriv(this.algorithm, this.encryptionKey, iv);
      decipher.setAuthTag(authTag);

      // Decrypt data
      let decrypted = decipher.update(encrypted, 'hex', 'utf8');
      decrypted += decipher.final('utf8');

      return decrypted;
    } catch (error) {
      throw new Error(`Decryption failed: ${error instanceof Error ? error.message : 'Unknown error'}`);
    }
  }

  /**
   * Hash password using Argon2id
   * REQ-7.1.9: Hash passwords with Argon2id
   * 
   * Argon2id is the recommended algorithm for password hashing (winner of Password Hashing Competition)
   * It provides resistance against both side-channel and GPU attacks
   * 
   * @param password - Plain text password
   * @returns Hashed password
   */
  async hashPassword(password: string): Promise<string> {
    if (!password) {
      throw new Error('Password cannot be empty');
    }

    try {
      // Use Argon2id variant with recommended parameters
      const hash = await argon2.hash(password, {
        type: argon2.argon2id,
        memoryCost: 65536, // 64 MB
        timeCost: 3, // 3 iterations
        parallelism: 4, // 4 parallel threads
        hashLength: 32 // 256-bit hash
      });

      return hash;
    } catch (error) {
      throw new Error(`Password hashing failed: ${error instanceof Error ? error.message : 'Unknown error'}`);
    }
  }

  /**
   * Verify password against Argon2id hash
   * 
   * @param password - Plain text password to verify
   * @param hash - Stored Argon2id hash
   * @returns True if password matches, false otherwise
   */
  async verifyPassword(password: string, hash: string): Promise<boolean> {
    if (!password || !hash) {
      return false;
    }

    try {
      return await argon2.verify(hash, password);
    } catch (error) {
      console.error('Password verification error:', error);
      return false;
    }
  }

  /**
   * Encrypt multiple PII fields in an object
   * 
   * @param data - Object containing PII fields
   * @param fields - Array of field names to encrypt
   * @returns Object with encrypted fields
   */
  encryptFields<T extends Record<string, any>>(
    data: T,
    fields: (keyof T)[]
  ): T {
    const encrypted = { ...data };

    for (const field of fields) {
      if (encrypted[field] && typeof encrypted[field] === 'string') {
        encrypted[field] = this.encrypt(encrypted[field] as string) as any;
      }
    }

    return encrypted;
  }

  /**
   * Decrypt multiple PII fields in an object
   * 
   * @param data - Object containing encrypted PII fields
   * @param fields - Array of field names to decrypt
   * @returns Object with decrypted fields
   */
  decryptFields<T extends Record<string, any>>(
    data: T,
    fields: (keyof T)[]
  ): T {
    const decrypted = { ...data };

    for (const field of fields) {
      if (decrypted[field] && typeof decrypted[field] === 'string') {
        try {
          decrypted[field] = this.decrypt(decrypted[field] as string) as any;
        } catch (error) {
          console.error(`Failed to decrypt field ${String(field)}:`, error);
          // Keep encrypted value if decryption fails
        }
      }
    }

    return decrypted;
  }

  /**
   * Generate a secure random token
   * Useful for session tokens, API keys, etc.
   * 
   * @param length - Length of token in bytes (default: 32)
   * @returns Hex-encoded random token
   */
  generateSecureToken(length: number = 32): string {
    return crypto.randomBytes(length).toString('hex');
  }

  /**
   * Hash data using SHA-256 (for non-password data)
   * Useful for creating one-way hashes for anonymous IDs
   * 
   * @param data - Data to hash
   * @returns SHA-256 hash (hex-encoded)
   */
  hashData(data: string): string {
    return crypto.createHash('sha256').update(data).digest('hex');
  }
}

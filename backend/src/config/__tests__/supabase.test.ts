/**
 * Unit Tests for Supabase Configuration
 * Tests connection, error handling, and helper functions
 */

import { describe, it, expect, vi, beforeEach, afterEach } from 'vitest';
import { supabase, testConnection, handleSupabaseError } from '../supabase';

// Mock Supabase client
vi.mock('@supabase/supabase-js', () => ({
  createClient: vi.fn(() => ({
    from: vi.fn(() => ({
      select: vi.fn(() => ({
        limit: vi.fn(() => Promise.resolve({ data: [], error: null }))
      }))
    })),
    auth: {
      autoRefreshToken: true,
      persistSession: false
    }
  }))
}));

describe('Supabase Configuration', () => {
  beforeEach(() => {
    vi.clearAllMocks();
  });

  describe('Client Initialization', () => {
    it('should create Supabase client with correct configuration', () => {
      expect(supabase).toBeDefined();
      expect(supabase.from).toBeDefined();
    });

    it('should have auth configuration', () => {
      expect(supabase.auth).toBeDefined();
    });
  });

  describe('testConnection', () => {
    it('should return true when connection is successful', async () => {
      const mockFrom = vi.fn(() => ({
        select: vi.fn(() => ({
          limit: vi.fn(() => Promise.resolve({ data: [], error: null }))
        }))
      }));
      
      (supabase.from as any) = mockFrom;

      const result = await testConnection();
      
      expect(result).toBe(true);
      expect(mockFrom).toHaveBeenCalledWith('students');
    });

    it('should return false when connection fails with error', async () => {
      const mockFrom = vi.fn(() => ({
        select: vi.fn(() => ({
          limit: vi.fn(() => Promise.resolve({ 
            data: null, 
            error: { message: 'Connection failed' } 
          }))
        }))
      }));
      
      (supabase.from as any) = mockFrom;

      const result = await testConnection();
      
      expect(result).toBe(false);
    });

    it('should return false when connection throws exception', async () => {
      const mockFrom = vi.fn(() => ({
        select: vi.fn(() => ({
          limit: vi.fn(() => Promise.reject(new Error('Network error')))
        }))
      }));
      
      (supabase.from as any) = mockFrom;

      const result = await testConnection();
      
      expect(result).toBe(false);
    });
  });

  describe('handleSupabaseError', () => {
    it('should throw error with message from Supabase error', () => {
      const error = { message: 'Duplicate key violation' };
      
      expect(() => handleSupabaseError(error)).toThrow('Database error: Duplicate key violation');
    });

    it('should throw error with unknown error message when no message provided', () => {
      const error = {};
      
      expect(() => handleSupabaseError(error)).toThrow('Database error: Unknown error');
    });

    it('should handle null error', () => {
      expect(() => handleSupabaseError(null)).toThrow('Database error: Unknown error');
    });
  });
});

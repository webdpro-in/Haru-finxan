/**
 * Tests for nightly prediction job
 * Task 15.4: Implement nightly prediction job
 */

import { describe, it, expect, vi, beforeEach } from 'vitest';
import { runNightlyPredictions } from '../PredictiveFailureDetection.js';

describe('Nightly Prediction Job', () => {
  beforeEach(() => {
    // Reset environment variables
    vi.resetModules();
  });

  it('should handle missing Supabase credentials gracefully', async () => {
    // Save original env vars
    const originalUrl = process.env.SUPABASE_URL;
    const originalKey = process.env.SUPABASE_ANON_KEY;
    
    // Remove credentials
    delete process.env.SUPABASE_URL;
    delete process.env.SUPABASE_ANON_KEY;
    
    const consoleSpy = vi.spyOn(console, 'error').mockImplementation(() => {});
    
    await runNightlyPredictions();
    
    expect(consoleSpy).toHaveBeenCalledWith('❌ Supabase credentials not configured');
    
    // Restore env vars
    if (originalUrl) process.env.SUPABASE_URL = originalUrl;
    if (originalKey) process.env.SUPABASE_ANON_KEY = originalKey;
    
    consoleSpy.mockRestore();
  });

  it('should export runNightlyPredictions function', () => {
    expect(runNightlyPredictions).toBeDefined();
    expect(typeof runNightlyPredictions).toBe('function');
  });

  it('should return a Promise', () => {
    // Set dummy credentials to avoid early return
    process.env.SUPABASE_URL = 'https://test.supabase.co';
    process.env.SUPABASE_ANON_KEY = 'test-key';
    
    const result = runNightlyPredictions();
    expect(result).toBeInstanceOf(Promise);
    
    // Clean up the promise to avoid unhandled rejection
    result.catch(() => {});
  });
});

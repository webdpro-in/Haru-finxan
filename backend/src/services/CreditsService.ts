/**
 * CreditsService — Supabase-backed credit ledger with in-memory fallback.
 *
 * Each row in `credit_ledger` is a delta (+grant or -consume). The current balance
 * is sum(delta). Cheap for hackathon demo; if usage grows, materialize into a balance column.
 */

import { supabase, supabaseConfigured } from '../config/supabase.js';

export const SIGNUP_CREDITS = 20;
export const PAID_CREDITS = 200;

const memoryLedger = new Map<string, number>(); // userId -> running balance

class CreditsService {
  async grantSignup(userId: string): Promise<number> {
    return this.grant(userId, SIGNUP_CREDITS, 'signup');
  }

  async grant(userId: string, amount: number, reason: string): Promise<number> {
    if (!supabaseConfigured || !supabase) {
      const next = (memoryLedger.get(userId) || 0) + amount;
      memoryLedger.set(userId, next);
      return next;
    }
    const { error } = await supabase.from('credit_ledger').insert({
      user_id: userId,
      delta: amount,
      reason,
    });
    if (error) throw new Error(`Credit grant failed: ${error.message}`);
    return this.balance(userId);
  }

  /** Deduct one or more credits. Returns the remaining balance. */
  async consume(userId: string, amount = 1, reason = 'chat'): Promise<number> {
    if (!supabaseConfigured || !supabase) {
      const current = memoryLedger.get(userId) || 0;
      const next = Math.max(0, current - amount);
      memoryLedger.set(userId, next);
      return next;
    }
    const { error } = await supabase.from('credit_ledger').insert({
      user_id: userId,
      delta: -Math.abs(amount),
      reason,
    });
    if (error) throw new Error(`Credit consume failed: ${error.message}`);
    return this.balance(userId);
  }

  async balance(userId: string): Promise<number> {
    if (!supabaseConfigured || !supabase) {
      return memoryLedger.get(userId) || 0;
    }
    const { data, error } = await supabase
      .from('credit_ledger')
      .select('delta')
      .eq('user_id', userId);
    if (error) throw new Error(`Credit balance failed: ${error.message}`);
    return (data || []).reduce((sum, row: { delta: number }) => sum + row.delta, 0);
  }
}

export const creditsService = new CreditsService();

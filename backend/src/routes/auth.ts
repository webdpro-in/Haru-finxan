/**
 * Auth route — register / login / me. JWT + argon2.
 * Falls back to in-memory user store when Supabase isn't configured (hackathon demo).
 */

import express, { Response } from 'express';
import argon2 from 'argon2';
import { v4 as uuid } from 'uuid';
import { generateToken, AuthRequest, optionalAuth } from '../middleware/auth.js';
import { supabase, supabaseConfigured } from '../config/supabase.js';
import { creditsService } from '../services/CreditsService.js';

export const authRouter = express.Router();

interface UserRow {
  id: string;
  email: string;
  password_hash: string;
  display_name: string | null;
  plan: 'free' | 'paid';
  created_at: string;
}

const memoryUsers = new Map<string, UserRow>(); // email -> user

async function findUser(email: string): Promise<UserRow | null> {
  if (!supabaseConfigured || !supabase) {
    return memoryUsers.get(email.toLowerCase()) || null;
  }
  const { data, error } = await supabase.from('users').select('*').eq('email', email.toLowerCase()).maybeSingle();
  if (error) throw new Error(`User lookup failed: ${error.message}`);
  return data as UserRow | null;
}

async function createUser(row: UserRow): Promise<void> {
  if (!supabaseConfigured || !supabase) {
    memoryUsers.set(row.email, row);
    return;
  }
  const { error } = await supabase.from('users').insert(row);
  if (error) throw new Error(`User create failed: ${error.message}`);
}

authRouter.post('/register', async (req, res) => {
  try {
    const { email, password, displayName } = req.body || {};
    if (!email || !password || password.length < 8) {
      return res.status(400).json({ error: 'Email and password (≥ 8 chars) required.' });
    }
    if (await findUser(email)) {
      return res.status(409).json({ error: 'Email already registered.' });
    }
    const password_hash = await argon2.hash(password);
    const user: UserRow = {
      id: uuid(),
      email: email.toLowerCase(),
      password_hash,
      display_name: displayName || null,
      plan: 'free',
      created_at: new Date().toISOString(),
    };
    await createUser(user);
    await creditsService.grantSignup(user.id);
    const token = generateToken({ userId: user.id, userType: 'student' });
    const balance = await creditsService.balance(user.id);
    res.json({ token, user: publicUser(user), credits: balance });
  } catch (e: any) {
    console.error('Register error:', e);
    res.status(500).json({ error: e.message || 'Registration failed.' });
  }
});

authRouter.post('/login', async (req, res) => {
  try {
    const { email, password } = req.body || {};
    if (!email || !password) return res.status(400).json({ error: 'Email and password required.' });
    const user = await findUser(email);
    if (!user) return res.status(401).json({ error: 'Invalid credentials.' });
    const ok = await argon2.verify(user.password_hash, password);
    if (!ok) return res.status(401).json({ error: 'Invalid credentials.' });
    const token = generateToken({ userId: user.id, userType: 'student' });
    const balance = await creditsService.balance(user.id);
    res.json({ token, user: publicUser(user), credits: balance });
  } catch (e: any) {
    console.error('Login error:', e);
    res.status(500).json({ error: e.message || 'Login failed.' });
  }
});

authRouter.get('/me', optionalAuth, async (req: AuthRequest, res: Response) => {
  if (!req.user) return res.status(401).json({ error: 'Not authenticated.' });
  const balance = await creditsService.balance(req.user.userId);
  res.json({ userId: req.user.userId, credits: balance });
});

function publicUser(u: UserRow) {
  return { id: u.id, email: u.email, displayName: u.display_name, plan: u.plan };
}

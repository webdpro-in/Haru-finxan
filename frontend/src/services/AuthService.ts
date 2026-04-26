/**
 * Auth client — talks to the Haru backend /api/auth/* and /api/credits/*.
 * Keeps the Zustand store in sync.
 */

import axios from 'axios';
import { useAppStore } from '../store/useAppStore';

const API_BASE_URL = import.meta.env.VITE_API_URL || 'http://localhost:3001/api';

interface AuthSuccess {
  token: string;
  user: { id: string; email: string; displayName: string | null; plan: 'free' | 'paid' };
  credits: number;
}

export const authService = {
  async register(email: string, password: string, displayName?: string): Promise<AuthSuccess> {
    const res = await axios.post<AuthSuccess>(`${API_BASE_URL}/auth/register`, {
      email,
      password,
      displayName,
    });
    useAppStore.getState().setUser(res.data.user, res.data.token);
    useAppStore.getState().setCredits(res.data.credits);
    return res.data;
  },

  async login(email: string, password: string): Promise<AuthSuccess> {
    const res = await axios.post<AuthSuccess>(`${API_BASE_URL}/auth/login`, { email, password });
    useAppStore.getState().setUser(res.data.user, res.data.token);
    useAppStore.getState().setCredits(res.data.credits);
    return res.data;
  },

  async refreshCredits(): Promise<number | null> {
    const { token } = useAppStore.getState();
    if (!token) return null;
    try {
      const res = await axios.get<{ credits: number }>(`${API_BASE_URL}/credits/me`, {
        headers: { Authorization: `Bearer ${token}` },
      });
      useAppStore.getState().setCredits(res.data.credits);
      return res.data.credits;
    } catch {
      return null;
    }
  },

  async upgrade(): Promise<number | null> {
    const { token } = useAppStore.getState();
    if (!token) return null;
    const res = await axios.post<{ credits: number }>(
      `${API_BASE_URL}/credits/upgrade`,
      {},
      { headers: { Authorization: `Bearer ${token}` } }
    );
    useAppStore.getState().setCredits(res.data.credits);
    return res.data.credits;
  },

  signOut(): void {
    useAppStore.getState().signOut();
  },
};

/**
 * AuthModal — email/password login & register against the Haru backend.
 */

import React, { useState } from 'react';
import { authService } from '../services/AuthService';
import './AuthModal.css';

interface AuthModalProps {
  isOpen: boolean;
  onClose: () => void;
  initialMode?: 'login' | 'register';
}

export const AuthModal: React.FC<AuthModalProps> = ({ isOpen, onClose, initialMode = 'login' }) => {
  const [mode, setMode] = useState<'login' | 'register'>(initialMode);
  const [email, setEmail] = useState('');
  const [password, setPassword] = useState('');
  const [displayName, setDisplayName] = useState('');
  const [busy, setBusy] = useState(false);
  const [error, setError] = useState<string | null>(null);

  if (!isOpen) return null;

  const submit = async (e: React.FormEvent) => {
    e.preventDefault();
    setError(null);
    setBusy(true);
    try {
      if (mode === 'login') {
        await authService.login(email, password);
      } else {
        if (password.length < 8) {
          setError('Password must be at least 8 characters.');
          setBusy(false);
          return;
        }
        await authService.register(email, password, displayName || undefined);
      }
      onClose();
    } catch (err: any) {
      const msg = err?.response?.data?.error || err?.message || 'Authentication failed.';
      setError(msg);
    } finally {
      setBusy(false);
    }
  };

  return (
    <div className="auth-modal-overlay" onClick={onClose}>
      <div className="auth-modal" onClick={(e) => e.stopPropagation()}>
        <div className="auth-modal-header">
          <h2>{mode === 'login' ? 'Welcome back' : 'Create your account'}</h2>
          <button className="auth-close" onClick={onClose} aria-label="Close">×</button>
        </div>
        <p className="auth-subtitle">
          {mode === 'login'
            ? 'Sign in to keep teaching with Haru.'
            : 'Start with 20 free credits — no card needed.'}
        </p>

        <form onSubmit={submit} className="auth-form">
          {mode === 'register' && (
            <label>
              <span>Display name (optional)</span>
              <input
                type="text"
                value={displayName}
                onChange={(e) => setDisplayName(e.target.value)}
                placeholder="What should Haru call you?"
              />
            </label>
          )}
          <label>
            <span>Email</span>
            <input
              type="email"
              required
              value={email}
              onChange={(e) => setEmail(e.target.value)}
              placeholder="you@example.com"
              autoComplete="email"
            />
          </label>
          <label>
            <span>Password</span>
            <input
              type="password"
              required
              minLength={8}
              value={password}
              onChange={(e) => setPassword(e.target.value)}
              placeholder="At least 8 characters"
              autoComplete={mode === 'login' ? 'current-password' : 'new-password'}
            />
          </label>

          {error && <div className="auth-error">{error}</div>}

          <button type="submit" className="auth-submit" disabled={busy}>
            {busy ? 'Please wait…' : mode === 'login' ? 'Sign in' : 'Create account'}
          </button>
        </form>

        <div className="auth-switch">
          {mode === 'login' ? (
            <>
              New here?{' '}
              <button onClick={() => setMode('register')}>Create an account</button>
            </>
          ) : (
            <>
              Already have an account?{' '}
              <button onClick={() => setMode('login')}>Sign in</button>
            </>
          )}
        </div>
      </div>
    </div>
  );
};

/**
 * Navbar — Haru AI Teacher.
 * Left: menu + brand. Right: subject + language + mode + credits + sign-in/settings.
 */

import React, { useState } from 'react';
import { useAppStore } from '../store/useAppStore';
import { CreditCounter } from './CreditCounter';
import { SubjectSelector, ModeToggle, LanguageToggle } from './SubjectSelector';
import { AuthModal } from './AuthModal';
import './Navbar.css';

interface NavbarProps {
  onMenuClick: () => void;
  onSettingsClick?: () => void;
}

export const Navbar: React.FC<NavbarProps> = ({ onMenuClick, onSettingsClick }) => {
  const user = useAppStore((s) => s.user);
  const [authOpen, setAuthOpen] = useState(false);

  return (
    <>
      <nav className="navbar">
        <div className="navbar-left">
          <button className="logo-button" onClick={onMenuClick} title="Menu">
            <span className="logo-emoji" aria-hidden>🌸</span>
          </button>
          <div className="brand">
            <div className="brand-name">Haru</div>
            <div className="brand-tag">AI Teacher</div>
          </div>
        </div>

        <div className="navbar-center">
          <SubjectSelector />
          <ModeToggle />
          <LanguageToggle />
        </div>

        <div className="navbar-actions">
          <CreditCounter />

          {!user && (
            <button className="navbar-button navbar-signin" onClick={() => setAuthOpen(true)}>
              Sign in
            </button>
          )}

          {onSettingsClick && (
            <button className="navbar-button" onClick={onSettingsClick} title="Settings">
              <svg width="18" height="18" viewBox="0 0 24 24" fill="none" stroke="currentColor" strokeWidth="2">
                <circle cx="12" cy="12" r="3" />
                <path d="M19.4 15a1.65 1.65 0 0 0 .33 1.82l.06.06a2 2 0 0 1 0 2.83 2 2 0 0 1-2.83 0l-.06-.06a1.65 1.65 0 0 0-1.82-.33 1.65 1.65 0 0 0-1 1.51V21a2 2 0 0 1-4 0v-.09A1.65 1.65 0 0 0 9 19.4a1.65 1.65 0 0 0-1.82.33l-.06.06a2 2 0 0 1-2.83 0 2 2 0 0 1 0-2.83l.06-.06a1.65 1.65 0 0 0 .33-1.82 1.65 1.65 0 0 0-1.51-1H3a2 2 0 0 1 0-4h.09A1.65 1.65 0 0 0 4.6 9a1.65 1.65 0 0 0-.33-1.82l-.06-.06a2 2 0 0 1 0-2.83 2 2 0 0 1 2.83 0l.06.06a1.65 1.65 0 0 0 1.82.33H9a1.65 1.65 0 0 0 1-1.51V3a2 2 0 0 1 4 0v.09a1.65 1.65 0 0 0 1 1.51 1.65 1.65 0 0 0 1.82-.33l.06-.06a2 2 0 0 1 2.83 0 2 2 0 0 1 0 2.83l-.06.06a1.65 1.65 0 0 0-.33 1.82V9a1.65 1.65 0 0 0 1.51 1H21a2 2 0 0 1 0 4h-.09a1.65 1.65 0 0 0-1.51 1z" />
              </svg>
            </button>
          )}
        </div>
      </nav>

      <AuthModal isOpen={authOpen} onClose={() => setAuthOpen(false)} />
    </>
  );
};

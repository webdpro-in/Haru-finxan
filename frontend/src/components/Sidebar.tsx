/**
 * Sidebar — slim slide-in drawer.
 * Shows current user, credits/api-key state, links to API config + sign in/out.
 */

import React, { useState } from 'react';
import { useAppStore } from '../store/useAppStore';
import { authService } from '../services/AuthService';
import { AuthModal } from './AuthModal';
import './Sidebar.css';

interface SidebarProps {
  isOpen: boolean;
  onClose: () => void;
}

export const Sidebar: React.FC<SidebarProps> = ({ isOpen, onClose }) => {
  const user = useAppStore((s) => s.user);
  const credits = useAppStore((s) => s.credits);
  const userApiProvider = useAppStore((s) => s.userApiProvider);
  const setApiConfigOpen = useAppStore((s) => s.setApiConfigOpen);
  const setUpgradeOpen = useAppStore((s) => s.setUpgradeOpen);

  const [authOpen, setAuthOpen] = useState(false);

  const handleLogout = () => {
    authService.signOut();
    onClose();
  };

  return (
    <>
      <div className={`sidebar-overlay ${isOpen ? 'open' : ''}`} onClick={onClose} />
      <div className={`sidebar ${isOpen ? 'open' : ''}`}>
        <div className="sidebar-content">
          {user ? (
            <>
              <div className="sidebar-section sidebar-account">
                <div className="sidebar-avatar">{(user.displayName || user.email)[0].toUpperCase()}</div>
                <div className="sidebar-account-info">
                  <div className="sidebar-account-name">{user.displayName || user.email.split('@')[0]}</div>
                  <div className="sidebar-account-email">{user.email}</div>
                </div>
              </div>

              <div className="sidebar-section sidebar-status">
                {userApiProvider ? (
                  <div className="sidebar-pill sidebar-pill-byok">
                    <span className="sidebar-dot" />
                    Using your {userApiProvider} key
                  </div>
                ) : (
                  <button className="sidebar-pill" onClick={() => { setUpgradeOpen(true); onClose(); }}>
                    ✨ {credits} credits
                  </button>
                )}
              </div>

              <div className="sidebar-spacer" />

              <div className="sidebar-bottom">
                <button className="sidebar-menu-button" onClick={() => { setApiConfigOpen(true); onClose(); }}>
                  <svg viewBox="0 0 20 20" fill="currentColor"><path fillRule="evenodd" d="M12.316 3.051a1 1 0 01.633 1.265l-4 12a1 1 0 11-1.898-.632l4-12a1 1 0 011.265-.633z" clipRule="evenodd"/></svg>
                  <span>API key settings</span>
                </button>
                <button className="sidebar-menu-button" onClick={handleLogout}>
                  <svg viewBox="0 0 20 20" fill="currentColor"><path fillRule="evenodd" d="M3 3a1 1 0 011 1v12a1 1 0 11-2 0V4a1 1 0 011-1zm7.707 3.293a1 1 0 010 1.414L9.414 9H17a1 1 0 110 2H9.414l1.293 1.293a1 1 0 01-1.414 1.414l-3-3a1 1 0 010-1.414l3-3a1 1 0 011.414 0z" clipRule="evenodd"/></svg>
                  <span>Sign out</span>
                </button>
              </div>
            </>
          ) : (
            <>
              <div className="login-prompt">
                <div className="login-emoji">🎓</div>
                <p>Sign in to save your progress and credits.</p>
              </div>
              <div className="sidebar-bottom">
                <button className="sidebar-cta" onClick={() => setAuthOpen(true)}>
                  Sign in or register
                </button>
                <button
                  className="sidebar-menu-button"
                  onClick={() => { setApiConfigOpen(true); onClose(); }}
                >
                  <span>Use your own API key instead</span>
                </button>
              </div>
            </>
          )}
        </div>
      </div>

      <AuthModal isOpen={authOpen} onClose={() => setAuthOpen(false)} />
    </>
  );
};

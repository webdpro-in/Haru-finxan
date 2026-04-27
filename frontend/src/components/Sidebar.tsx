/**
 * Sidebar — slide-in drawer.
 *   • "+ New Chat" pinned at top
 *   • List of past chat sessions (most recent first)
 *   • Account / settings / sign-out at the bottom
 *
 * The active session is highlighted; clicking another session loads its
 * history into the main chat panel.
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

const formatRelative = (ts: number): string => {
  const diff = Date.now() - ts;
  const min = Math.floor(diff / 60000);
  if (min < 1) return 'Just now';
  if (min < 60) return `${min}m ago`;
  const hr = Math.floor(min / 60);
  if (hr < 24) return `${hr}h ago`;
  const d = Math.floor(hr / 24);
  if (d < 7) return `${d}d ago`;
  return new Date(ts).toLocaleDateString();
};

export const Sidebar: React.FC<SidebarProps> = ({ isOpen, onClose }) => {
  const user = useAppStore((s) => s.user);
  const credits = useAppStore((s) => s.credits);
  const userApiProvider = useAppStore((s) => s.userApiProvider);
  const setApiConfigOpen = useAppStore((s) => s.setApiConfigOpen);
  const setUpgradeOpen = useAppStore((s) => s.setUpgradeOpen);

  const chatSessions = useAppStore((s) => s.chatSessions);
  const activeSessionId = useAppStore((s) => s.activeSessionId);
  const newChatSession = useAppStore((s) => s.newChatSession);
  const loadChatSession = useAppStore((s) => s.loadChatSession);
  const deleteChatSession = useAppStore((s) => s.deleteChatSession);

  const [authOpen, setAuthOpen] = useState(false);

  const handleLogout = () => {
    authService.signOut();
    onClose();
  };

  const handleSelect = (id: string) => {
    loadChatSession(id);
    onClose();
  };

  const handleDelete = (e: React.MouseEvent, id: string) => {
    e.stopPropagation();
    if (window.confirm('Delete this conversation?')) deleteChatSession(id);
  };

  return (
    <>
      <div className={`sidebar-overlay ${isOpen ? 'open' : ''}`} onClick={onClose} />
      <div className={`sidebar ${isOpen ? 'open' : ''}`}>
        <div className="sidebar-content">
          <button
            className="sidebar-newchat"
            onClick={() => { newChatSession(); onClose(); }}
            title="Start a fresh conversation"
          >
            <span className="sidebar-newchat-plus">＋</span>
            New Chat
          </button>

          <div className="sidebar-history">
            <div className="sidebar-history-label">Recent</div>
            {chatSessions.length === 0 ? (
              <div className="sidebar-empty">
                No past chats yet — your conversations will appear here.
              </div>
            ) : (
              chatSessions.map((sess) => (
                <button
                  key={sess.id}
                  className={`sidebar-chat-item ${sess.id === activeSessionId ? 'active' : ''}`}
                  onClick={() => handleSelect(sess.id)}
                  title={sess.title}
                >
                  <span className="sidebar-chat-title">{sess.title || 'Untitled chat'}</span>
                  <span className="sidebar-chat-time">{formatRelative(sess.updatedAt)}</span>
                  <span
                    className="sidebar-chat-delete"
                    onClick={(e) => handleDelete(e, sess.id)}
                    role="button"
                    aria-label="Delete chat"
                    tabIndex={0}
                  >
                    ×
                  </span>
                </button>
              ))
            )}
          </div>

          <div className="sidebar-spacer" />

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

              <div className="sidebar-bottom">
                <button className="sidebar-menu-button" onClick={() => { setApiConfigOpen(true); onClose(); }}>
                  <span>API key settings</span>
                </button>
                <button className="sidebar-menu-button" onClick={handleLogout}>
                  <span>Sign out</span>
                </button>
              </div>
            </>
          ) : (
            <div className="sidebar-bottom">
              <button className="sidebar-cta" onClick={() => setAuthOpen(true)}>
                Sign in
              </button>
              <button
                className="sidebar-menu-button"
                onClick={() => { setApiConfigOpen(true); onClose(); }}
              >
                <span>Use your own API key</span>
              </button>
            </div>
          )}
        </div>
      </div>

      <AuthModal isOpen={authOpen} onClose={() => setAuthOpen(false)} />
    </>
  );
};

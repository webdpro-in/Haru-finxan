/**
 * TeachingPanel — left-side chat transcript with sticky-bottom scrolling.
 *
 * Scroll behaviour rules:
 *   - On mount and on every new message, smooth-scroll to the latest entry —
 *     but ONLY if the user was already near the bottom (within 80px).  If
 *     they've scrolled up to read older messages, we don't yank them back
 *     — they keep reading until they manually return to the bottom.
 *   - When the user is "scrolled up", we surface a small "↓ New messages"
 *     button that jumps them back to the bottom on click.
 *   - The frosted-glass card (`.teaching-panel`) does not scroll itself; only
 *     the inner `.panel-content` flex child has `overflow-y: auto`.
 */

import React, { useEffect, useRef, useState } from 'react';
import { useAppStore } from '../store/useAppStore';
import './TeachingPanel.css';

const STICKY_BOTTOM_PX = 80;

export const TeachingPanel: React.FC = () => {
  const chatHistory = useAppStore((s) => s.chatHistory);
  const scrollerRef = useRef<HTMLDivElement>(null);
  const bottomAnchorRef = useRef<HTMLDivElement>(null);
  const [isAtBottom, setIsAtBottom] = useState(true);

  const checkAtBottom = () => {
    const el = scrollerRef.current;
    if (!el) return;
    const distanceFromBottom = el.scrollHeight - el.scrollTop - el.clientHeight;
    setIsAtBottom(distanceFromBottom <= STICKY_BOTTOM_PX);
  };

  // Auto-scroll only if user was near the bottom.  This preserves their
  // reading position when they've scrolled up to look at older messages.
  useEffect(() => {
    if (!isAtBottom) return;
    bottomAnchorRef.current?.scrollIntoView({ behavior: 'smooth', block: 'end' });
    // Keep our notion of "at bottom" accurate after the scroll lands.
    // eslint-disable-next-line react-hooks/exhaustive-deps
  }, [chatHistory.length]);

  const jumpToBottom = () => {
    bottomAnchorRef.current?.scrollIntoView({ behavior: 'smooth', block: 'end' });
    // Optimistically mark as bottom; the scroll handler will reconcile.
    setIsAtBottom(true);
  };

  return (
    <div className="teaching-panel">
      <div className="panel-header">
        <h2>Teaching Chat</h2>
      </div>

      <div
        className="panel-content chat-content"
        ref={scrollerRef}
        onScroll={checkAtBottom}
      >
        {chatHistory && chatHistory.length > 0 ? (
          <div className="chat-messages">
            {chatHistory.map((message, index) => (
              <div key={index} className={`chat-message ${message.role}`}>
                <div className="message-content">
                  <div className="message-text">{message.content}</div>
                </div>
              </div>
            ))}
            {/* 1px sentinel after the last message so smooth-scroll lands
                exactly at the end of the transcript, not partway. */}
            <div ref={bottomAnchorRef} aria-hidden style={{ height: 1 }} />
          </div>
        ) : (
          <div className="placeholder">
            <p>Chat history will appear here</p>
            <p className="placeholder-hint">Start by asking me anything</p>
          </div>
        )}
      </div>

      {/* Scroll-to-bottom button surfaces only when the user is reading
          older messages and a new one has arrived. */}
      {!isAtBottom && chatHistory.length > 0 && (
        <button
          type="button"
          className="chat-jump-bottom"
          onClick={jumpToBottom}
          aria-label="Jump to latest message"
        >
          ↓ New messages
        </button>
      )}
    </div>
  );
};

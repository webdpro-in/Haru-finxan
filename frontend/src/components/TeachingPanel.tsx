/**
 * Teaching Panel Component
 * Displays teaching chat conversation on the left side
 */

import React, { useEffect, useRef } from 'react';
import { useAppStore } from '../store/useAppStore';
import './TeachingPanel.css';

export const TeachingPanel: React.FC = () => {
  const { chatHistory } = useAppStore();
  const contentRef = useRef<HTMLDivElement>(null);

  // Auto-scroll to bottom when content updates
  useEffect(() => {
    if (contentRef.current) {
      contentRef.current.scrollTop = contentRef.current.scrollHeight;
    }
  }, [chatHistory]);

  return (
    <div className="teaching-panel">
      <div className="panel-header">
        <h2>Teaching Chat</h2>
      </div>
      <div className="panel-content chat-content" ref={contentRef}>
        {chatHistory && chatHistory.length > 0 ? (
          <div className="chat-messages">
            {chatHistory.map((message, index) => (
              <div key={index} className={`chat-message ${message.role}`}>
                <div className="message-content">
                  <div className="message-text">{message.content}</div>
                </div>
              </div>
            ))}
          </div>
        ) : (
          <div className="placeholder">
            <p>Chat history will appear here</p>
            <p className="placeholder-hint">Start by asking me anything</p>
          </div>
        )}
      </div>
    </div>
  );
};

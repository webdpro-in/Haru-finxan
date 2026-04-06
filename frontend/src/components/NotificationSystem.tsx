/**
 * Notification System Component
 * Toast-style notifications for real-time feedback
 */

import React, { useEffect, useState } from 'react';
import './NotificationSystem.css';

export type NotificationType = 'info' | 'success' | 'warning' | 'error' | 'confusion' | 'anxiety';

export interface Notification {
  id: string;
  type: NotificationType;
  title: string;
  message: string;
  duration?: number; // milliseconds, 0 = persistent
  action?: {
    label: string;
    onClick: () => void;
  };
}

interface NotificationSystemProps {
  notifications: Notification[];
  onDismiss: (id: string) => void;
}

export const NotificationSystem: React.FC<NotificationSystemProps> = ({ notifications, onDismiss }) => {
  const [visible, setVisible] = useState<Set<string>>(new Set());

  useEffect(() => {
    notifications.forEach(notification => {
      if (!visible.has(notification.id)) {
        setVisible(prev => new Set(prev).add(notification.id));

        // Auto-dismiss after duration
        if (notification.duration && notification.duration > 0) {
          setTimeout(() => {
            handleDismiss(notification.id);
          }, notification.duration);
        }
      }
    });
  }, [notifications]);

  const handleDismiss = (id: string) => {
    setVisible(prev => {
      const next = new Set(prev);
      next.delete(id);
      return next;
    });
    setTimeout(() => onDismiss(id), 300); // Wait for animation
  };

  const getIcon = (type: NotificationType) => {
    switch (type) {
      case 'success':
        return '✓';
      case 'warning':
        return '⚠';
      case 'error':
        return '✕';
      case 'confusion':
        return '❓';
      case 'anxiety':
        return '💙';
      default:
        return 'ℹ';
    }
  };

  return (
    <div className="notification-container">
      {notifications.map(notification => (
        <div
          key={notification.id}
          className={`notification notification-${notification.type} ${
            visible.has(notification.id) ? 'visible' : 'hidden'
          }`}
        >
          <div className="notification-icon">{getIcon(notification.type)}</div>
          <div className="notification-content">
            <div className="notification-title">{notification.title}</div>
            <div className="notification-message">{notification.message}</div>
            {notification.action && (
              <button
                className="notification-action"
                onClick={() => {
                  notification.action!.onClick();
                  handleDismiss(notification.id);
                }}
              >
                {notification.action.label}
              </button>
            )}
          </div>
          <button
            className="notification-close"
            onClick={() => handleDismiss(notification.id)}
            aria-label="Dismiss"
          >
            ×
          </button>
        </div>
      ))}
    </div>
  );
};

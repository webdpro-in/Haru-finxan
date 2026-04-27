/**
 * Debug Panel Component
 * Displays current state, motion, and synchronization status
 * Toggle with Ctrl+D
 */

import React, { useEffect, useState } from 'react';
import { useAppStore } from '../store/useAppStore';
import { motionManager } from '../services/MotionManager';
import { logger } from '../utils/logger';

export const DebugPanel: React.FC = () => {
  const [isVisible, setIsVisible] = useState(false);
  const [logs, setLogs] = useState<any[]>([]);
  
  const {
    haruState,
    currentGesture,
    isRecording,
    isSpeaking,
    isTeaching,
    currentSegmentIndex,
    teachingSegments,
  } = useAppStore();

  useEffect(() => {
    // Toggle debug panel with Ctrl+D
    const handleKeyDown = (e: KeyboardEvent) => {
      if (e.ctrlKey && e.key === 'd') {
        e.preventDefault();
        setIsVisible(prev => !prev);
        logger.setDebugMode(!isVisible);
      }
    };

    window.addEventListener('keydown', handleKeyDown);
    return () => window.removeEventListener('keydown', handleKeyDown);
  }, [isVisible]);

  useEffect(() => {
    // Update logs every second
    const interval = setInterval(() => {
      if (isVisible) {
        setLogs(logger.getLogs().slice(-20)); // Last 20 logs
      }
    }, 1000);

    return () => clearInterval(interval);
  }, [isVisible]);

  if (!isVisible) return null;

  const currentMotion = motionManager.getCurrentMotion();
  const currentMotionLabel = `${currentMotion.group || 'default'}[${currentMotion.index}]`;

  return (
    <div className="debug-panel">
      <div className="debug-header">
        <h3>🐛 Debug Panel</h3>
        <button onClick={() => setIsVisible(false)}>✕</button>
      </div>

      <div className="debug-content">
        <section className="debug-section">
          <h4>State</h4>
          <div className="debug-grid">
            <div className="debug-item">
              <span className="label">Haru State:</span>
              <span className={`value state-${haruState}`}>{haruState}</span>
            </div>
            <div className="debug-item">
              <span className="label">Current Gesture:</span>
              <span className="value">{currentGesture}</span>
            </div>
            <div className="debug-item">
              <span className="label">Current Motion:</span>
              <span className="value">{currentMotionLabel}</span>
            </div>
            <div className="debug-item">
              <span className="label">Recording:</span>
              <span className={`value ${isRecording ? 'active' : ''}`}>
                {isRecording ? 'Yes' : 'No'}
              </span>
            </div>
            <div className="debug-item">
              <span className="label">Speaking:</span>
              <span className={`value ${isSpeaking ? 'active' : ''}`}>
                {isSpeaking ? 'Yes' : 'No'}
              </span>
            </div>
            <div className="debug-item">
              <span className="label">Teaching:</span>
              <span className={`value ${isTeaching ? 'active' : ''}`}>
                {isTeaching ? 'Yes' : 'No'}
              </span>
            </div>
          </div>
        </section>

        <section className="debug-section">
          <h4>Teaching Progress</h4>
          <div className="debug-item">
            <span className="label">Segment:</span>
            <span className="value">
              {currentSegmentIndex + 1} / {teachingSegments.length}
            </span>
          </div>
          {teachingSegments[currentSegmentIndex] && (
            <div className="debug-item">
              <span className="label">Current Segment:</span>
              <span className="value">
                {teachingSegments[currentSegmentIndex].type} - {teachingSegments[currentSegmentIndex].gesture}
              </span>
            </div>
          )}
        </section>

        <section className="debug-section">
          <h4>Recent Logs</h4>
          <div className="debug-logs">
            {logs.map((log, index) => (
              <div key={index} className={`log-entry log-${log.level}`}>
                <span className="log-time">{new Date(log.timestamp).toLocaleTimeString()}</span>
                <span className="log-category">[{log.category}]</span>
                <span className="log-message">{log.message}</span>
              </div>
            ))}
          </div>
        </section>

        <section className="debug-section">
          <h4>Actions</h4>
          <div className="debug-actions">
            <button onClick={() => logger.clearLogs()}>Clear Logs</button>
            <button onClick={() => {
              const logs = logger.exportLogs();
              const blob = new Blob([logs], { type: 'application/json' });
              const url = URL.createObjectURL(blob);
              const a = document.createElement('a');
              a.href = url;
              a.download = `haru-logs-${Date.now()}.json`;
              a.click();
            }}>Export Logs</button>
          </div>
        </section>
      </div>

      <style>{`
        .debug-panel {
          position: fixed;
          top: 60px;
          right: 20px;
          width: 400px;
          max-height: 80vh;
          background: rgba(0, 0, 0, 0.95);
          color: #fff;
          border-radius: 8px;
          box-shadow: 0 4px 20px rgba(0, 0, 0, 0.5);
          z-index: 10000;
          overflow: hidden;
          font-family: 'Courier New', monospace;
          font-size: 12px;
        }

        .debug-header {
          display: flex;
          justify-content: space-between;
          align-items: center;
          padding: 1rem;
          background: #1a1a1a;
          border-bottom: 1px solid #333;
        }

        .debug-header h3 {
          margin: 0;
          font-size: 1rem;
        }

        .debug-header button {
          background: none;
          border: none;
          color: #fff;
          font-size: 1.2rem;
          cursor: pointer;
          padding: 0;
        }

        .debug-content {
          max-height: calc(80vh - 60px);
          overflow-y: auto;
          padding: 1rem;
        }

        .debug-section {
          margin-bottom: 1.5rem;
        }

        .debug-section h4 {
          margin: 0 0 0.5rem 0;
          font-size: 0.875rem;
          color: #4facfe;
          text-transform: uppercase;
        }

        .debug-grid {
          display: grid;
          grid-template-columns: 1fr 1fr;
          gap: 0.5rem;
        }

        .debug-item {
          display: flex;
          flex-direction: column;
          gap: 0.25rem;
        }

        .debug-item .label {
          color: #888;
          font-size: 0.75rem;
        }

        .debug-item .value {
          color: #fff;
          font-weight: bold;
        }

        .debug-item .value.active {
          color: #4facfe;
        }

        .debug-item .value.state-idle {
          color: #888;
        }

        .debug-item .value.state-listening {
          color: #ffd700;
        }

        .debug-item .value.state-speaking {
          color: #4facfe;
        }

        .debug-item .value.state-gesturing {
          color: #00f2fe;
        }

        .debug-logs {
          max-height: 200px;
          overflow-y: auto;
          background: #0a0a0a;
          padding: 0.5rem;
          border-radius: 4px;
        }

        .log-entry {
          display: flex;
          gap: 0.5rem;
          margin-bottom: 0.25rem;
          font-size: 0.75rem;
        }

        .log-time {
          color: #666;
        }

        .log-category {
          color: #4facfe;
        }

        .log-message {
          color: #fff;
          flex: 1;
        }

        .log-entry.log-error .log-message {
          color: #ff4444;
        }

        .log-entry.log-warn .log-message {
          color: #ffaa00;
        }

        .debug-actions {
          display: flex;
          gap: 0.5rem;
        }

        .debug-actions button {
          flex: 1;
          padding: 0.5rem;
          background: #333;
          border: 1px solid #555;
          color: #fff;
          border-radius: 4px;
          cursor: pointer;
          font-size: 0.75rem;
        }

        .debug-actions button:hover {
          background: #444;
        }
      `}</style>
    </div>
  );
};

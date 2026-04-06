/**
 * Status Indicators Component
 * Real-time status badges for cognitive load, confusion, reviews, etc.
 */

import React, { useState } from 'react';
import './StatusIndicators.css';

interface StatusIndicatorsProps {
  cognitiveLoad: number; // 0-100
  confusionLevel: number; // 0-100
  reviewsDue: number;
  masteryLevel: number; // 0-100
  onReviewClick?: () => void;
  onLoadClick?: () => void;
}

export const StatusIndicators: React.FC<StatusIndicatorsProps> = ({
  cognitiveLoad,
  confusionLevel,
  reviewsDue,
  masteryLevel,
  onReviewClick,
  onLoadClick,
}) => {
  const [expandedLoad, setExpandedLoad] = useState(false);
  const [expandedConfusion, setExpandedConfusion] = useState(false);

  const getLoadLevel = () => {
    if (cognitiveLoad < 40) return 'low';
    if (cognitiveLoad < 70) return 'medium';
    return 'high';
  };

  const getLoadColor = () => {
    if (cognitiveLoad < 40) return '#10b981';
    if (cognitiveLoad < 70) return '#f59e0b';
    return '#ef4444';
  };

  const getLoadLabel = () => {
    if (cognitiveLoad < 40) return 'Good';
    if (cognitiveLoad < 70) return 'Moderate';
    return 'High';
  };

  return (
    <div className="status-indicators">
      {/* Cognitive Load Meter */}
      <div
        className={`status-indicator cognitive-load-indicator ${getLoadLevel()}`}
        onClick={() => {
          setExpandedLoad(!expandedLoad);
          onLoadClick?.();
        }}
      >
        <div className="status-indicator-icon">🧠</div>
        <div className="status-indicator-label">Cognitive Load</div>
        <div className="status-indicator-value">{getLoadLabel()}</div>
        {expandedLoad && (
          <div className="status-details">
            <div className="status-detail-item">
              <span>Load Score:</span>
              <span>{cognitiveLoad}%</span>
            </div>
            <div className="status-progress-bar">
              <div
                className="status-progress-fill"
                style={{ width: `${cognitiveLoad}%`, background: getLoadColor() }}
              />
            </div>
          </div>
        )}
      </div>

      {/* Confusion Indicator */}
      {confusionLevel > 0 && (
        <div
          className="status-indicator confusion-indicator"
          onClick={() => setExpandedConfusion(!expandedConfusion)}
        >
          <div className="status-indicator-icon">❓</div>
          <div className="status-indicator-label">Confusion Detected</div>
          <div className="status-indicator-value">{confusionLevel}%</div>
          {expandedConfusion && (
            <div className="status-details">
              <div className="status-detail-item">
                <span>Haru is adapting her teaching style</span>
              </div>
            </div>
          )}
        </div>
      )}

      {/* Reviews Due */}
      {reviewsDue > 0 && (
        <div
          className={`status-indicator review-indicator ${reviewsDue > 0 ? 'has-reviews' : ''}`}
          onClick={onReviewClick}
        >
          <div className="status-indicator-icon">📚</div>
          <div className="status-indicator-label">Reviews Due</div>
          <div className="status-indicator-value">{reviewsDue}</div>
        </div>
      )}

      {/* Mastery Progress */}
      <div className="status-indicator">
        <div className="status-indicator-icon">⭐</div>
        <div className="status-indicator-label">Overall Mastery</div>
        <div className="status-indicator-value">{masteryLevel}%</div>
        <div className="status-progress-bar">
          <div
            className="status-progress-fill"
            style={{ width: `${masteryLevel}%` }}
          />
        </div>
      </div>
    </div>
  );
};

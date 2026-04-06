/**
 * Student Dashboard Component
 * Comprehensive view of student progress, knowledge graph, and learning DNA
 */

import React, { useEffect, useState } from 'react';
import './StudentDashboard.css';

interface ConceptMastery {
  conceptId: string;
  conceptName: string;
  masteryLevel: number;
  lastPracticed: Date;
}

interface ReviewItem {
  conceptId: string;
  conceptName: string;
  nextReviewDate: Date;
  easinessFactor: number;
}

interface LearningDNA {
  preferredStyle: string;
  avgResponseTime: number;
  questionFrequency: number;
  masteryGrowthRate: number;
}

interface SessionStats {
  totalSessions: number;
  totalQuestions: number;
  averageMastery: number;
  strongConcepts: number;
}

interface StudentDashboardProps {
  isOpen: boolean;
  onClose: () => void;
  studentId: string;
}

export const StudentDashboard: React.FC<StudentDashboardProps> = ({
  isOpen,
  onClose,
  studentId,
}) => {
  const [concepts, setConcepts] = useState<ConceptMastery[]>([]);
  const [reviews, setReviews] = useState<ReviewItem[]>([]);
  const [dna, setDna] = useState<LearningDNA | null>(null);
  const [stats, setStats] = useState<SessionStats | null>(null);
  const [loading, setLoading] = useState(true);

  useEffect(() => {
    if (isOpen && studentId) {
      loadDashboardData();
    }
  }, [isOpen, studentId]);

  const loadDashboardData = async () => {
    setLoading(true);
    try {
      // Load student profile
      const profileRes = await fetch(`/api/student/${studentId}/profile`);
      if (profileRes.ok) {
        const profile = await profileRes.json();
        
        // Extract concepts
        const conceptsData = Object.entries(profile.conceptMasteries || {}).map(
          ([id, data]: [string, any]) => ({
            conceptId: id,
            conceptName: data.conceptName,
            masteryLevel: data.masteryLevel,
            lastPracticed: new Date(data.lastPracticed),
          })
        );
        setConcepts(conceptsData.sort((a, b) => b.masteryLevel - a.masteryLevel));

        // Extract stats
        setStats({
          totalSessions: profile.totalSessions || 0,
          totalQuestions: profile.totalQuestionsAsked || 0,
          averageMastery: conceptsData.length > 0
            ? Math.round(
                conceptsData.reduce((sum, c) => sum + c.masteryLevel, 0) / conceptsData.length
              )
            : 0,
          strongConcepts: conceptsData.filter(c => c.masteryLevel >= 70).length,
        });

        // Extract learning DNA
        if (profile.learningStyle) {
          setDna({
            preferredStyle: profile.learningStyle,
            avgResponseTime: profile.averageResponseTime || 0,
            questionFrequency: profile.totalSessions > 0
              ? Math.round((profile.totalQuestionsAsked / profile.totalSessions) * 10) / 10
              : 0,
            masteryGrowthRate: profile.masteryGrowthRate || 0,
          });
        }
      }

      // Load reviews due
      const reviewsRes = await fetch(`/api/student/${studentId}/reviews-due`);
      if (reviewsRes.ok) {
        const reviewsData = await reviewsRes.json();
        setReviews(reviewsData.slice(0, 5)); // Top 5 reviews
      }
    } catch (error) {
      console.error('Error loading dashboard data:', error);
    } finally {
      setLoading(false);
    }
  };

  const getMasteryClass = (level: number) => {
    if (level < 40) return 'low';
    if (level < 70) return 'medium';
    return 'high';
  };

  const formatDate = (date: Date) => {
    const now = new Date();
    const diff = date.getTime() - now.getTime();
    const days = Math.floor(diff / (1000 * 60 * 60 * 24));
    
    if (days < 0) return 'Overdue';
    if (days === 0) return 'Today';
    if (days === 1) return 'Tomorrow';
    return `In ${days} days`;
  };

  return (
    <div className={`student-dashboard ${isOpen ? 'open' : ''}`}>
      <div className="dashboard-header">
        <h2 className="dashboard-title">Your Progress</h2>
        <button className="dashboard-close" onClick={onClose}>
          ×
        </button>
      </div>

      <div className="dashboard-content">
        {loading ? (
          <div className="empty-state">
            <div className="empty-state-icon">⏳</div>
            <div className="empty-state-text">Loading your progress...</div>
          </div>
        ) : (
          <>
            {/* Session Stats */}
            {stats && (
              <div className="dashboard-section">
                <h3 className="section-title">
                  <span className="section-icon">📊</span>
                  Session Stats
                </h3>
                <div className="session-stats">
                  <div className="stat-card">
                    <div className="stat-value">{stats.totalSessions}</div>
                    <div className="stat-label">Sessions</div>
                  </div>
                  <div className="stat-card">
                    <div className="stat-value">{stats.totalQuestions}</div>
                    <div className="stat-label">Questions</div>
                  </div>
                  <div className="stat-card">
                    <div className="stat-value">{stats.averageMastery}%</div>
                    <div className="stat-label">Avg Mastery</div>
                  </div>
                  <div className="stat-card">
                    <div className="stat-value">{stats.strongConcepts}</div>
                    <div className="stat-label">Strong Topics</div>
                  </div>
                </div>
              </div>
            )}

            {/* Knowledge Graph */}
            <div className="dashboard-section">
              <h3 className="section-title">
                <span className="section-icon">🧠</span>
                Knowledge Graph
              </h3>
              <div className="knowledge-graph">
                {concepts.length > 0 ? (
                  concepts.slice(0, 10).map(concept => (
                    <div key={concept.conceptId} className="concept-item">
                      <div className="concept-name">{concept.conceptName}</div>
                      <div className="concept-mastery">
                        <div className="mastery-bar">
                          <div
                            className={`mastery-fill ${getMasteryClass(concept.masteryLevel)}`}
                            style={{ width: `${concept.masteryLevel}%` }}
                          />
                        </div>
                        <div className="mastery-value">{concept.masteryLevel}%</div>
                      </div>
                    </div>
                  ))
                ) : (
                  <div className="empty-state">
                    <div className="empty-state-icon">📚</div>
                    <div className="empty-state-text">
                      Start learning to build your knowledge graph
                    </div>
                  </div>
                )}
              </div>
            </div>

            {/* Learning DNA */}
            {dna && (
              <div className="dashboard-section">
                <h3 className="section-title">
                  <span className="section-icon">🧬</span>
                  Learning DNA
                </h3>
                <div className="learning-dna">
                  <div className="dna-item">
                    <div className="dna-label">Preferred Style</div>
                    <div className="dna-value">{dna.preferredStyle}</div>
                  </div>
                  <div className="dna-item">
                    <div className="dna-label">Avg Response Time</div>
                    <div className="dna-value">{Math.round(dna.avgResponseTime / 1000)}s</div>
                  </div>
                  <div className="dna-item">
                    <div className="dna-label">Questions/Session</div>
                    <div className="dna-value">{dna.questionFrequency}</div>
                  </div>
                  <div className="dna-item">
                    <div className="dna-label">Growth Rate</div>
                    <div className="dna-value">{dna.masteryGrowthRate}%/session</div>
                  </div>
                </div>
              </div>
            )}

            {/* Spaced Repetition Reviews */}
            {reviews.length > 0 && (
              <div className="dashboard-section">
                <h3 className="section-title">
                  <span className="section-icon">📚</span>
                  Reviews Due
                </h3>
                <div className="review-list">
                  {reviews.map(review => (
                    <div key={review.conceptId} className="review-item">
                      <div>
                        <div className="review-concept">{review.conceptName}</div>
                        <div className="review-due">{formatDate(review.nextReviewDate)}</div>
                      </div>
                      <button className="review-button">Review</button>
                    </div>
                  ))}
                </div>
              </div>
            )}
          </>
        )}
      </div>
    </div>
  );
};

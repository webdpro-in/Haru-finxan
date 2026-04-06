/**
 * Enhanced Teacher Dashboard Component
 * Real-time monitoring with all advanced features
 */

import React, { useEffect, useState } from 'react';
import './EnhancedTeacherDashboard.css';

interface Student {
  id: string;
  name: string;
  masteryLevel: number;
  confusionLevel: number;
  riskScore: number;
  isActive: boolean;
  lastActive: Date;
}

interface Alert {
  id: string;
  type: 'confusion' | 'anxiety' | 'failure-risk';
  studentId: string;
  studentName: string;
  message: string;
  timestamp: Date;
}

interface AnonymousQuestion {
  id: string;
  question: string;
  timestamp: Date;
  answered: boolean;
}

interface ClassStats {
  totalStudents: number;
  activeNow: number;
  averageMastery: number;
  atRiskCount: number;
}

interface EnhancedTeacherDashboardProps {
  classId: string;
}

export const EnhancedTeacherDashboard: React.FC<EnhancedTeacherDashboardProps> = ({ classId }) => {
  const [students, setStudents] = useState<Student[]>([]);
  const [alerts, setAlerts] = useState<Alert[]>([]);
  const [anonymousQuestions, setAnonymousQuestions] = useState<AnonymousQuestion[]>([]);
  const [stats, setStats] = useState<ClassStats | null>(null);
  const [loading, setLoading] = useState(true);

  useEffect(() => {
    loadDashboardData();
    
    // Refresh every 10 seconds
    const interval = setInterval(loadDashboardData, 10000);
    return () => clearInterval(interval);
  }, [classId]);

  const loadDashboardData = async () => {
    try {
      // Load students
      const studentsRes = await fetch(`/api/teacher/classroom/${classId}/students`);
      if (studentsRes.ok) {
        const studentsData = await studentsRes.json();
        setStudents(studentsData);
        
        // Calculate stats
        const activeCount = studentsData.filter((s: Student) => s.isActive).length;
        const avgMastery = studentsData.length > 0
          ? Math.round(
              studentsData.reduce((sum: number, s: Student) => sum + s.masteryLevel, 0) /
                studentsData.length
            )
          : 0;
        const atRisk = studentsData.filter((s: Student) => s.riskScore > 60).length;
        
        setStats({
          totalStudents: studentsData.length,
          activeNow: activeCount,
          averageMastery: avgMastery,
          atRiskCount: atRisk,
        });
      }

      // Load alerts
      const alertsRes = await fetch(`/api/teacher/classroom/${classId}/alerts`);
      if (alertsRes.ok) {
        const alertsData = await alertsRes.json();
        setAlerts(alertsData.slice(0, 10)); // Latest 10 alerts
      }

      // Load anonymous questions
      const questionsRes = await fetch(`/api/teacher/classroom/${classId}/anonymous-questions`);
      if (questionsRes.ok) {
        const questionsData = await questionsRes.json();
        setAnonymousQuestions(questionsData.filter((q: AnonymousQuestion) => !q.answered));
      }
    } catch (error) {
      console.error('Error loading dashboard data:', error);
    } finally {
      setLoading(false);
    }
  };

  const getHealthClass = (student: Student) => {
    if (student.riskScore > 60) return 'at-risk';
    if (student.confusionLevel > 50 || student.masteryLevel < 50) return 'moderate';
    return 'healthy';
  };

  const handleAnswerQuestion = async (questionId: string) => {
    const answer = prompt('Enter your answer:');
    if (!answer) return;

    try {
      await fetch(`/api/teacher/anonymous-question/${questionId}/answer`, {
        method: 'POST',
        headers: { 'Content-Type': 'application/json' },
        body: JSON.stringify({ answer }),
      });
      
      // Refresh questions
      loadDashboardData();
    } catch (error) {
      console.error('Error answering question:', error);
    }
  };

  const formatTime = (date: Date) => {
    const now = new Date();
    const diff = now.getTime() - date.getTime();
    const minutes = Math.floor(diff / 60000);
    
    if (minutes < 1) return 'Just now';
    if (minutes < 60) return `${minutes}m ago`;
    const hours = Math.floor(minutes / 60);
    if (hours < 24) return `${hours}h ago`;
    return `${Math.floor(hours / 24)}d ago`;
  };

  if (loading) {
    return (
      <div className="enhanced-teacher-dashboard">
        <div style={{ textAlign: 'center', padding: '48px' }}>
          <div style={{ fontSize: '48px', marginBottom: '16px' }}>⏳</div>
          <div>Loading dashboard...</div>
        </div>
      </div>
    );
  }

  return (
    <div className="enhanced-teacher-dashboard">
      {/* Stats Overview */}
      {stats && (
        <div className="stats-grid">
          <div className="stat-card-large">
            <div className="stat-value-large">{stats.totalStudents}</div>
            <div className="stat-label-large">Total Students</div>
          </div>
          <div className="stat-card-large">
            <div className="stat-value-large">{stats.activeNow}</div>
            <div className="stat-label-large">Active Now</div>
          </div>
          <div className="stat-card-large">
            <div className="stat-value-large">{stats.averageMastery}%</div>
            <div className="stat-label-large">Avg Mastery</div>
          </div>
          <div className="stat-card-large">
            <div className="stat-value-large">{stats.atRiskCount}</div>
            <div className="stat-label-large">At Risk</div>
          </div>
        </div>
      )}

      <div className="dashboard-grid">
        {/* Class Health Heatmap */}
        <div className="dashboard-card" style={{ gridColumn: 'span 2' }}>
          <div className="card-header">
            <h3 className="card-title">
              <span className="card-icon">🔥</span>
              Class Health Heatmap
            </h3>
          </div>
          <div className="heatmap-grid">
            {students.map(student => (
              <div
                key={student.id}
                className={`heatmap-cell ${getHealthClass(student)}`}
                title={`${student.name}: ${student.masteryLevel}% mastery, ${student.riskScore}% risk`}
              >
                <div className="heatmap-name">{student.name.split(' ')[0]}</div>
                <div className="heatmap-score">{student.masteryLevel}%</div>
              </div>
            ))}
          </div>
        </div>

        {/* Real-time Alerts */}
        <div className="dashboard-card">
          <div className="card-header">
            <h3 className="card-title">
              <span className="card-icon">🚨</span>
              Real-time Alerts
            </h3>
            <span className={`card-badge ${alerts.length > 0 ? 'badge-warning' : 'badge-success'}`}>
              {alerts.length} active
            </span>
          </div>
          <div className="alert-list">
            {alerts.length > 0 ? (
              alerts.map(alert => (
                <div key={alert.id} className={`alert-item ${alert.type}`}>
                  <div className="alert-icon">
                    {alert.type === 'confusion' && '❓'}
                    {alert.type === 'anxiety' && '💙'}
                    {alert.type === 'failure-risk' && '⚠️'}
                  </div>
                  <div className="alert-content">
                    <div className="alert-title">{alert.studentName}</div>
                    <div className="alert-message">{alert.message}</div>
                    <div className="alert-time">{formatTime(alert.timestamp)}</div>
                  </div>
                  <button className="alert-action">View</button>
                </div>
              ))
            ) : (
              <div style={{ textAlign: 'center', padding: '32px', color: '#9ca3af' }}>
                <div style={{ fontSize: '32px', marginBottom: '8px' }}>✓</div>
                <div>No alerts - all students doing well!</div>
              </div>
            )}
          </div>
        </div>

        {/* Anonymous Questions */}
        <div className="dashboard-card">
          <div className="card-header">
            <h3 className="card-title">
              <span className="card-icon">🙋</span>
              Anonymous Questions
            </h3>
            <span className={`card-badge ${anonymousQuestions.length > 0 ? 'badge-warning' : 'badge-success'}`}>
              {anonymousQuestions.length} pending
            </span>
          </div>
          <div className="alert-list">
            {anonymousQuestions.length > 0 ? (
              anonymousQuestions.map(question => (
                <div key={question.id} className="anonymous-question">
                  <div className="question-header">
                    <div className="question-id">Question #{question.id.slice(0, 8)}</div>
                    <div className="question-time">{formatTime(question.timestamp)}</div>
                  </div>
                  <div className="question-text">{question.question}</div>
                  <div className="question-actions">
                    <button
                      className="answer-button"
                      onClick={() => handleAnswerQuestion(question.id)}
                    >
                      Answer
                    </button>
                  </div>
                </div>
              ))
            ) : (
              <div style={{ textAlign: 'center', padding: '32px', color: '#9ca3af' }}>
                <div style={{ fontSize: '32px', marginBottom: '8px' }}>📭</div>
                <div>No pending questions</div>
              </div>
            )}
          </div>
        </div>

        {/* Student List */}
        <div className="dashboard-card" style={{ gridColumn: 'span 2' }}>
          <div className="card-header">
            <h3 className="card-title">
              <span className="card-icon">👥</span>
              Students
            </h3>
          </div>
          <div className="student-list">
            {students.map(student => (
              <div key={student.id} className="student-item">
                <div className="student-info">
                  <div className="student-avatar">
                    {student.name.charAt(0).toUpperCase()}
                  </div>
                  <div className="student-details">
                    <div className="student-name">{student.name}</div>
                    <div className="student-stats">
                      {student.masteryLevel}% mastery • {student.confusionLevel}% confusion
                      {student.riskScore > 60 && ` • ⚠️ At risk (${student.riskScore}%)`}
                    </div>
                  </div>
                </div>
                <div className="student-status">
                  <div className={`status-dot ${student.isActive ? 'active' : 'inactive'}`} />
                  <span style={{ fontSize: '12px', color: '#6b7280' }}>
                    {student.isActive ? 'Active' : formatTime(student.lastActive)}
                  </span>
                </div>
              </div>
            ))}
          </div>
        </div>
      </div>
    </div>
  );
};

/**
 * Teacher Dashboard
 * Real-time monitoring of all students in a class
 * Shows class health heatmap, individual progress, and confusion alerts
 */

import React, { useEffect, useState } from 'react';
import axios from 'axios';

const API_BASE_URL = import.meta.env.VITE_API_URL || 'http://localhost:3001/api';

interface StudentSummary {
  studentId: string;
  name: string;
  overallMastery: number;
  confusionLevel: number;
  engagementScore: number;
  conceptMasteries: Record<string, number>;
}

interface ClassActivity {
  activeStudents: number;
  totalStudents: number;
  currentTopics: string[];
  recentConfusion: Array<{
    studentId: string;
    topic: string;
    timestamp: Date;
    resolved: boolean;
  }>;
}

export const TeacherDashboard: React.FC = () => {
  const [students, setStudents] = useState<StudentSummary[]>([]);
  const [activity, setActivity] = useState<ClassActivity | null>(null);
  const [loading, setLoading] = useState(true);

  useEffect(() => {
    loadDashboardData();
    
    // Refresh every 5 seconds
    const interval = setInterval(loadDashboardData, 5000);
    return () => clearInterval(interval);
  }, []);

  const loadDashboardData = async () => {
    try {
      const [heatmapRes, activityRes] = await Promise.all([
        axios.get(`${API_BASE_URL}/teacher/class/demo_class/heatmap`),
        axios.get(`${API_BASE_URL}/teacher/class/demo_class/activity`),
      ]);

      setStudents(heatmapRes.data.students || []);
      setActivity(activityRes.data);
      setLoading(false);
    } catch (error) {
      console.error('Error loading dashboard:', error);
    }
  };

  const getMasteryColor = (mastery: number): string => {
    if (mastery >= 80) return '#00ff00';
    if (mastery >= 60) return '#ffaa00';
    return '#ff4444';
  };

  const getConfusionColor = (confusion: number): string => {
    if (confusion >= 70) return '#ff4444';
    if (confusion >= 40) return '#ffaa00';
    return '#00ff00';
  };

  if (loading) {
    return (
      <div style={styles.container}>
        <div style={styles.loading}>Loading dashboard...</div>
      </div>
    );
  }

  return (
    <div style={styles.container}>
      <header style={styles.header}>
        <h1>Teacher Dashboard</h1>
        <div style={styles.stats}>
          <div style={styles.stat}>
            <span style={styles.statLabel}>Active Now</span>
            <span style={styles.statValue}>{activity?.activeStudents || 0}/{activity?.totalStudents || 0}</span>
          </div>
          <div style={styles.stat}>
            <span style={styles.statLabel}>Current Topics</span>
            <span style={styles.statValue}>{activity?.currentTopics.join(', ') || 'None'}</span>
          </div>
        </div>
      </header>

      <div style={styles.content}>
        {/* Class Heatmap */}
        <section style={styles.section}>
          <h2>Class Health Heatmap</h2>
          <div style={styles.heatmap}>
            {students.map(student => (
              <div
                key={student.studentId}
                style={{
                  ...styles.studentCard,
                  borderColor: getMasteryColor(student.overallMastery),
                }}
              >
                <div style={styles.studentName}>{student.name}</div>
                <div style={styles.metrics}>
                  <div style={styles.metric}>
                    <span>Mastery</span>
                    <span style={{ color: getMasteryColor(student.overallMastery) }}>
                      {student.overallMastery}%
                    </span>
                  </div>
                  <div style={styles.metric}>
                    <span>Confusion</span>
                    <span style={{ color: getConfusionColor(student.confusionLevel) }}>
                      {student.confusionLevel}%
                    </span>
                  </div>
                  <div style={styles.metric}>
                    <span>Engagement</span>
                    <span>{student.engagementScore}%</span>
                  </div>
                </div>
              </div>
            ))}
          </div>
        </section>

        {/* Recent Confusion Alerts */}
        {activity && activity.recentConfusion.length > 0 && (
          <section style={styles.section}>
            <h2>🚨 Confusion Alerts</h2>
            <div style={styles.alerts}>
              {activity.recentConfusion.map((alert, i) => (
                <div key={i} style={styles.alert}>
                  <span style={styles.alertStudent}>{alert.studentId}</span>
                  <span style={styles.alertTopic}>confused about: {alert.topic}</span>
                  <span style={styles.alertTime}>
                    {new Date(alert.timestamp).toLocaleTimeString()}
                  </span>
                  {!alert.resolved && (
                    <button style={styles.alertButton}>Assist</button>
                  )}
                </div>
              ))}
            </div>
          </section>
        )}
      </div>
    </div>
  );
};

const styles: Record<string, React.CSSProperties> = {
  container: {
    width: '100%',
    height: '100vh',
    background: '#1a1a1a',
    color: '#fff',
    overflow: 'auto',
  },
  header: {
    padding: '20px',
    borderBottom: '2px solid #333',
    background: '#222',
  },
  stats: {
    display: 'flex',
    gap: '30px',
    marginTop: '15px',
  },
  stat: {
    display: 'flex',
    flexDirection: 'column',
    gap: '5px',
  },
  statLabel: {
    fontSize: '12px',
    color: '#888',
  },
  statValue: {
    fontSize: '18px',
    fontWeight: 'bold',
    color: '#4facfe',
  },
  content: {
    padding: '20px',
  },
  section: {
    marginBottom: '30px',
  },
  heatmap: {
    display: 'grid',
    gridTemplateColumns: 'repeat(auto-fill, minmax(250px, 1fr))',
    gap: '15px',
    marginTop: '15px',
  },
  studentCard: {
    padding: '15px',
    background: '#222',
    border: '3px solid',
    borderRadius: '8px',
    cursor: 'pointer',
    transition: 'transform 0.2s',
  },
  studentName: {
    fontSize: '16px',
    fontWeight: 'bold',
    marginBottom: '10px',
  },
  metrics: {
    display: 'flex',
    flexDirection: 'column',
    gap: '8px',
  },
  metric: {
    display: 'flex',
    justifyContent: 'space-between',
    fontSize: '14px',
  },
  alerts: {
    display: 'flex',
    flexDirection: 'column',
    gap: '10px',
    marginTop: '15px',
  },
  alert: {
    padding: '15px',
    background: '#2a1a1a',
    border: '2px solid #ff4444',
    borderRadius: '8px',
    display: 'flex',
    alignItems: 'center',
    gap: '15px',
  },
  alertStudent: {
    fontWeight: 'bold',
    color: '#4facfe',
  },
  alertTopic: {
    flex: 1,
  },
  alertTime: {
    fontSize: '12px',
    color: '#888',
  },
  alertButton: {
    padding: '8px 16px',
    background: '#4facfe',
    border: 'none',
    borderRadius: '4px',
    color: '#fff',
    cursor: 'pointer',
  },
  loading: {
    display: 'flex',
    justifyContent: 'center',
    alignItems: 'center',
    height: '100vh',
    fontSize: '20px',
  },
};

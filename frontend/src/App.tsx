/**
 * Main App Component
 * Orchestrates the entire Haru AI Teacher application
 */

import { useEffect, useState } from 'react';
import { Live2DCanvas } from './components/Live2DCanvas';
import { LeftPanel } from './components/LeftPanel';
import { RightPanel } from './components/RightPanel';
import { InputPanel } from './components/InputPanel';
import { DebugPanel } from './components/DebugPanel';
import { Navbar } from './components/Navbar';
import { Sidebar } from './components/Sidebar';
import { NotificationSystem, Notification } from './components/NotificationSystem';
import { StatusIndicators } from './components/StatusIndicators';
import { StudentDashboard } from './components/StudentDashboard';
import { SettingsPanel } from './components/SettingsPanel';
import { AuthProvider } from './contexts/AuthContext';
import { useAppStore } from './store/useAppStore';
import { aiService } from './services/AIService';
import { motionManager } from './services/MotionManager';
import { sessionManager } from './services/SessionManager';
import './App.css';

// Import test utilities in development
if (import.meta.env.DEV) {
  import('./test-store');
}

const MODEL_PATH = '/haru_greeter_pro_jp/runtime/haru_greeter_t05.model3.json';

function AppContent() {
  const { setLeftPanelContent, setTeachingSegments } = useAppStore();
  const [sidebarOpen, setSidebarOpen] = useState(false);
  const [dashboardOpen, setDashboardOpen] = useState(false);
  const [settingsOpen, setSettingsOpen] = useState(false);
  const [notifications, setNotifications] = useState<Notification[]>([]);
  const [cognitiveLoad, setCognitiveLoad] = useState(0);
  const [confusionLevel, setConfusionLevel] = useState(0);
  const [reviewsDue, setReviewsDue] = useState(0);
  const [masteryLevel, setMasteryLevel] = useState(0);

  // Add notification helper
  const addNotification = (notification: Omit<Notification, 'id'>) => {
    const id = Date.now().toString();
    setNotifications(prev => [...prev, { ...notification, id }]);
  };

  const dismissNotification = (id: string) => {
    setNotifications(prev => prev.filter(n => n.id !== id));
  };

  useEffect(() => {
    // Initialize session
    sessionManager.initializeSession();

    // Set greeting text immediately
    const greeting = aiService.getGreeting();
    setLeftPanelContent(greeting.text);
    setTeachingSegments(greeting.segments);

    // Wait for the Live2D model to initialize (motionManager.model becomes set)
    // We poll until the state transitions from the very-first call after setModel()
    let attempts = 0;
    const maxAttempts = 20; // 10 seconds
    const checkInterval = setInterval(() => {
      attempts++;
      // motionManager.getState() returns 'idle' after model is loaded and idle motion starts
      // We check model is ready by seeing if requestGesture would succeed (model != null)
      const state = motionManager.getState();
      // After setModel() is called, state is 'idle'. We check attempts as anti-infinite-loop guard.
      if (state === 'idle' && attempts >= 2) {
        clearInterval(checkInterval);
        console.log('🎬 Model ready — playing greeting animation');
        motionManager.requestGesture('greeting');
      } else if (attempts >= maxAttempts) {
        clearInterval(checkInterval);
        console.warn('⚠️ Model not ready after 10 seconds, skipping greeting animation');
      }
    }, 500);

    // Cleanup on unmount
    return () => {
      clearInterval(checkInterval);
      motionManager.destroy();
    };
  }, []);

  return (
    <div className="app">
      <Navbar 
        onMenuClick={() => setSidebarOpen(!sidebarOpen)}
        onDashboardClick={() => setDashboardOpen(!dashboardOpen)}
        onSettingsClick={() => setSettingsOpen(!settingsOpen)}
      />
      <Sidebar isOpen={sidebarOpen} onClose={() => setSidebarOpen(false)} />
      
      {/* Notification System */}
      <NotificationSystem 
        notifications={notifications}
        onDismiss={dismissNotification}
      />
      
      {/* Status Indicators */}
      <StatusIndicators
        cognitiveLoad={cognitiveLoad}
        confusionLevel={confusionLevel}
        reviewsDue={reviewsDue}
        masteryLevel={masteryLevel}
        onReviewClick={() => setDashboardOpen(true)}
        onLoadClick={() => {
          addNotification({
            type: 'info',
            title: 'Cognitive Load',
            message: 'Your current cognitive load is being monitored. Haru will adjust if needed.',
            duration: 5000,
          });
        }}
      />
      
      {/* Student Dashboard */}
      <StudentDashboard
        isOpen={dashboardOpen}
        onClose={() => setDashboardOpen(false)}
        studentId="demo-student-1"
      />
      
      {/* Settings Panel */}
      <SettingsPanel
        isOpen={settingsOpen}
        onClose={() => setSettingsOpen(false)}
      />

      <main className="app-main">
        <div className="left-section">
          <RightPanel />
        </div>

        <div className="center-section">
          <div className="character-container">
            <Live2DCanvas modelPath={MODEL_PATH} />
          </div>
        </div>

        <div className="right-section">
          <LeftPanel />
        </div>
      </main>

      <InputPanel />
      <DebugPanel />
    </div>
  );
}

function App() {
  return (
    <AuthProvider>
      <AppContent />
    </AuthProvider>
  );
}

export default App;

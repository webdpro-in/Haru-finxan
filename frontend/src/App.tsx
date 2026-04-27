/**
 * Main App — Haru AI Teacher.
 * Orchestrates onboarding, chat, character, and credit flow.
 */

import { useEffect, useState } from 'react';
import { Live2DCanvas } from './components/Live2DCanvas';
import { TeachingPanel } from './components/TeachingPanel';
import { VisualPanel } from './components/VisualPanel';
import { InputPanel } from './components/InputPanel';
import { DebugPanel } from './components/DebugPanel';
import { CharacterDebugPanel } from './components/CharacterDebugPanel';
import { Navbar } from './components/Navbar';
import { Sidebar } from './components/Sidebar';
import { NotificationSystem, Notification } from './components/NotificationSystem';
import { SettingsPanel } from './components/SettingsPanel';
import { Onboarding } from './components/Onboarding';
import { UpgradeModal } from './components/UpgradeModal';
import { APIConfigModal } from './components/APIConfigModal';
import { useAppStore } from './store/useAppStore';
import { aiService } from './services/AIService';
import { authService } from './services/AuthService';
import { motionManager } from './services/MotionManager';
import { sessionManager } from './services/SessionManager';
import './utils/debugCharacter'; // Load debug utilities
import './App.css';

/**
 * CharacterStage — fades the active character in on mount, out on swap.
 *
 * `key={character}` on the stage div tells React to discard and remount the
 * subtree whenever the character id changes.  The fresh subtree starts with
 * the `enter` class (opacity:0, slight translateY) and animates to fully
 * visible — gives a smooth "step forward" entrance instead of a pop.
 */
function CharacterStage() {
  const characterId = useAppStore((s) => s.character);
  const [entered, setEntered] = useState(false);

  useEffect(() => {
    setEntered(false);
    // Next frame so the initial enter style commits before transitioning.
    const id = requestAnimationFrame(() => setEntered(true));
    return () => cancelAnimationFrame(id);
  }, [characterId]);

  return (
    <div
      key={characterId}
      className={`character-stage ${entered ? 'entered' : 'enter'}`}
    >
      <Live2DCanvas />
    </div>
  );
}

function App() {
  const setLeftPanelContent = useAppStore((s) => s.setLeftPanelContent);
  const setTeachingSegments = useAppStore((s) => s.setTeachingSegments);
  const token = useAppStore((s) => s.token);

  const [sidebarOpen, setSidebarOpen] = useState(false);
  const [settingsOpen, setSettingsOpen] = useState(false);
  const [notifications, setNotifications] = useState<Notification[]>([]);

  const dismissNotification = (id: string) => {
    setNotifications((prev) => prev.filter((n) => n.id !== id));
  };

  useEffect(() => {
    sessionManager.initializeSession();

    const greeting = aiService.getGreeting();
    setLeftPanelContent(greeting.text);
    setTeachingSegments(greeting.segments);

    if (token) {
      authService.refreshCredits().catch(() => {});
    }

    let attempts = 0;
    const maxAttempts = 20;
    const checkInterval = setInterval(() => {
      attempts++;
      const state = motionManager.getState();
      if (state === 'idle' && attempts >= 2) {
        clearInterval(checkInterval);
        motionManager.requestGesture('greeting');
      } else if (attempts >= maxAttempts) {
        clearInterval(checkInterval);
      }
    }, 500);

    return () => {
      clearInterval(checkInterval);
      motionManager.destroy();
    };
    // eslint-disable-next-line react-hooks/exhaustive-deps
  }, []);

  return (
    <div className="app">
      <Navbar
        onMenuClick={() => setSidebarOpen(!sidebarOpen)}
        onSettingsClick={() => setSettingsOpen(!settingsOpen)}
      />
      <Sidebar isOpen={sidebarOpen} onClose={() => setSidebarOpen(false)} />

      <NotificationSystem notifications={notifications} onDismiss={dismissNotification} />

      <SettingsPanel isOpen={settingsOpen} onClose={() => setSettingsOpen(false)} />

      <main className="app-main">
        <div className="left-section">
          <TeachingPanel />
        </div>

        <div className="center-section">
          {/* `key` triggers an unmount/remount on character switch, which
              fires the CSS opacity/transform transition on .character-stage
              for a smooth fade-and-rise instead of a hard pop. */}
          <div className="character-container">
            <CharacterStage />
          </div>
        </div>

        <div className="right-section">
          <VisualPanel />
        </div>
      </main>

      <InputPanel />
      <DebugPanel />
      <CharacterDebugPanel />

      <Onboarding />
      <UpgradeModal />
      <APIConfigModal />
    </div>
  );
}

export default App;

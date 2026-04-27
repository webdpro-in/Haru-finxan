/**
 * Settings Panel Component
 * User preferences and feature toggles
 */

import React, { useState } from 'react';
import { useAppStore } from '../store/useAppStore';
import { CHARACTER_LIST } from '../config/characters';
import './SettingsPanel.css';

interface SettingsPanelProps {
  isOpen: boolean;
  onClose: () => void;
}

export const SettingsPanel: React.FC<SettingsPanelProps> = ({ isOpen, onClose }) => {
  const character = useAppStore((s) => s.character);
  const setCharacter = useAppStore((s) => s.setCharacter);
  const [language, setLanguage] = useState<'en' | 'hi'>('en');
  const [confusionDetection, setConfusionDetection] = useState(true);
  const [anxietyCoach, setAnxietyCoach] = useState(true);
  const [spacedRepetition, setSpacedRepetition] = useState(true);
  const [anonymousMode, setAnonymousMode] = useState(false);
  const [voiceInput, setVoiceInput] = useState(true);
  const [autoImages, setAutoImages] = useState(true);

  const handleSave = () => {
    // Save settings to localStorage or backend
    const settings = {
      language,
      confusionDetection,
      anxietyCoach,
      spacedRepetition,
      anonymousMode,
      voiceInput,
      autoImages,
    };
    
    localStorage.setItem('haruSettings', JSON.stringify(settings));
    console.log('Settings saved:', settings);
    onClose();
  };

  const handleReset = () => {
    if (confirm('Reset all settings to default?')) {
      setLanguage('en');
      setConfusionDetection(true);
      setAnxietyCoach(true);
      setSpacedRepetition(true);
      setAnonymousMode(false);
      setVoiceInput(true);
      setAutoImages(true);
      localStorage.removeItem('haruSettings');
    }
  };

  return (
    <div className={`settings-panel ${isOpen ? 'open' : ''}`}>
      <div className="settings-header">
        <h2 className="settings-title">Settings</h2>
        <button className="settings-close" onClick={onClose}>
          ×
        </button>
      </div>

      <div className="settings-content">
        {/* Change Character — switches the active 3D model on screen.
            The voice gender follows automatically (male / female). */}
        <div className="settings-section">
          <h3 className="settings-section-title">
            <span className="settings-section-icon">🎭</span>
            Change Character
          </h3>
          <div className="character-grid">
            {CHARACTER_LIST.map((c) => (
              <button
                key={c.id}
                type="button"
                className={`character-option ${character === c.id ? 'active' : ''}`}
                onClick={() => setCharacter(c.id)}
                title={`Switch to ${c.label}`}
              >
                <div className="character-emoji" aria-hidden>{c.emoji}</div>
                <div className="character-name">{c.label}</div>
                <div className="character-meta">
                  {c.voiceGender === 'female' ? '♀ Female voice' : '♂ Male voice'}
                </div>
              </button>
            ))}
          </div>
        </div>

        {/* Language Settings */}
        <div className="settings-section">
          <h3 className="settings-section-title">
            <span className="settings-section-icon">🌐</span>
            Language
          </h3>
          <div className="language-selector">
            <div
              className={`language-option ${language === 'en' ? 'active' : ''}`}
              onClick={() => setLanguage('en')}
            >
              <div className="language-flag">🇬🇧</div>
              <div className="language-name">English</div>
            </div>
            <div
              className={`language-option ${language === 'hi' ? 'active' : ''}`}
              onClick={() => setLanguage('hi')}
            >
              <div className="language-flag">🇮🇳</div>
              <div className="language-name">हिंदी</div>
            </div>
          </div>
        </div>

        {/* AI Features */}
        <div className="settings-section">
          <h3 className="settings-section-title">
            <span className="settings-section-icon">🤖</span>
            AI Features
          </h3>

          <div className="setting-item">
            <div
              className="setting-toggle"
              onClick={() => setConfusionDetection(!confusionDetection)}
            >
              <div>
                <div className="setting-label">Confusion Detection</div>
                <div className="setting-description">
                  Haru adapts when you're confused
                </div>
              </div>
              <div className={`toggle-switch ${confusionDetection ? 'active' : ''}`}>
                <div className="toggle-slider" />
              </div>
            </div>
          </div>

          <div className="setting-item">
            <div
              className="setting-toggle"
              onClick={() => setAnxietyCoach(!anxietyCoach)}
            >
              <div>
                <div className="setting-label">Exam Anxiety Coach</div>
                <div className="setting-description">
                  Calming support during stress
                </div>
              </div>
              <div className={`toggle-switch ${anxietyCoach ? 'active' : ''}`}>
                <div className="toggle-slider" />
              </div>
            </div>
          </div>

          <div className="setting-item">
            <div
              className="setting-toggle"
              onClick={() => setSpacedRepetition(!spacedRepetition)}
            >
              <div>
                <div className="setting-label">Spaced Repetition</div>
                <div className="setting-description">
                  Smart review reminders
                </div>
              </div>
              <div className={`toggle-switch ${spacedRepetition ? 'active' : ''}`}>
                <div className="toggle-slider" />
              </div>
            </div>
          </div>
        </div>

        {/* Privacy Settings */}
        <div className="settings-section">
          <h3 className="settings-section-title">
            <span className="settings-section-icon">🔒</span>
            Privacy
          </h3>

          <div className="setting-item">
            <div
              className="setting-toggle"
              onClick={() => setAnonymousMode(!anonymousMode)}
            >
              <div>
                <div className="setting-label">Anonymous Question Mode</div>
                <div className="setting-description">
                  Ask questions without revealing identity
                </div>
              </div>
              <div className={`toggle-switch ${anonymousMode ? 'active' : ''}`}>
                <div className="toggle-slider" />
              </div>
            </div>
          </div>
        </div>

        {/* Interface Settings */}
        <div className="settings-section">
          <h3 className="settings-section-title">
            <span className="settings-section-icon">🎨</span>
            Interface
          </h3>

          <div className="setting-item">
            <div
              className="setting-toggle"
              onClick={() => setVoiceInput(!voiceInput)}
            >
              <div>
                <div className="setting-label">Voice Input</div>
                <div className="setting-description">
                  Speak to Haru instead of typing
                </div>
              </div>
              <div className={`toggle-switch ${voiceInput ? 'active' : ''}`}>
                <div className="toggle-slider" />
              </div>
            </div>
          </div>

          <div className="setting-item">
            <div
              className="setting-toggle"
              onClick={() => setAutoImages(!autoImages)}
            >
              <div>
                <div className="setting-label">Auto-generate Images</div>
                <div className="setting-description">
                  Visual aids for every topic
                </div>
              </div>
              <div className={`toggle-switch ${autoImages ? 'active' : ''}`}>
                <div className="toggle-slider" />
              </div>
            </div>
          </div>
        </div>

        {/* Active Features */}
        <div className="settings-section">
          <h3 className="settings-section-title">
            <span className="settings-section-icon">✨</span>
            Active Features
          </h3>
          <div className="feature-list">
            <div className="feature-item">
              <span className="feature-icon">🧠</span>
              <span>Knowledge Graph Tracking</span>
            </div>
            <div className="feature-item">
              <span className="feature-icon">🧬</span>
              <span>Learning DNA Analysis</span>
            </div>
            <div className="feature-item">
              <span className="feature-icon">📊</span>
              <span>Cognitive Load Monitoring</span>
            </div>
            <div className="feature-item">
              <span className="feature-icon">🔍</span>
              <span>Prerequisite Detection</span>
            </div>
            <div className="feature-item">
              <span className="feature-icon">🎯</span>
              <span>Predictive Failure Detection</span>
            </div>
          </div>
        </div>

        {/* Action Buttons */}
        <div className="settings-section">
          <button className="setting-button" onClick={handleSave}>
            Save Settings
          </button>
          <button
            className="setting-button secondary"
            onClick={handleReset}
            style={{ marginTop: '12px' }}
          >
            Reset to Default
          </button>
        </div>
      </div>
    </div>
  );
};

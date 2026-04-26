/**
 * Onboarding — 3-step first-run modal.
 * 1. Welcome / name
 * 2. Subject pick
 * 3. Sign in or continue as guest
 */

import React, { useState } from 'react';
import { useAppStore, Subject } from '../store/useAppStore';
import { AuthModal } from './AuthModal';
import './Onboarding.css';

const SUBJECTS: { id: Subject; label: string; emoji: string }[] = [
  { id: 'math', label: 'Math', emoji: '🧮' },
  { id: 'science', label: 'Science', emoji: '🔬' },
  { id: 'coding', label: 'Coding', emoji: '💻' },
  { id: 'english', label: 'English', emoji: '📝' },
  { id: 'history', label: 'History', emoji: '🏛️' },
  { id: 'general', label: 'Anything', emoji: '💡' },
];

export const Onboarding: React.FC = () => {
  const hasOnboarded = useAppStore((s) => s.hasOnboarded);
  const setHasOnboarded = useAppStore((s) => s.setHasOnboarded);
  const setSubject = useAppStore((s) => s.setSubject);
  const subject = useAppStore((s) => s.subject);
  const user = useAppStore((s) => s.user);

  const [step, setStep] = useState(0);
  const [authOpen, setAuthOpen] = useState(false);

  if (hasOnboarded) return null;

  const finish = () => setHasOnboarded(true);

  return (
    <>
      <div className="onb-overlay">
        <div className="onb-modal">
          <div className="onb-progress">
            {[0, 1, 2].map((i) => (
              <span key={i} className={`onb-dot ${i <= step ? 'active' : ''}`} />
            ))}
          </div>

          {step === 0 && (
            <div className="onb-step">
              <div className="onb-emoji">👋</div>
              <h2>Meet Haru, your AI teacher.</h2>
              <p>An anime-style 3D tutor who teaches with voice, visuals, and patience. You get <strong>20 free credits</strong> to try her out.</p>
              <button className="onb-primary" onClick={() => setStep(1)}>Get started</button>
            </div>
          )}

          {step === 1 && (
            <div className="onb-step">
              <h2>What do you want to learn?</h2>
              <p>You can change this anytime from the navbar.</p>
              <div className="onb-subjects">
                {SUBJECTS.map((s) => (
                  <button
                    key={s.id}
                    className={`onb-subject ${subject === s.id ? 'selected' : ''}`}
                    onClick={() => setSubject(s.id)}
                  >
                    <span className="onb-subject-emoji">{s.emoji}</span>
                    <span>{s.label}</span>
                  </button>
                ))}
              </div>
              <button className="onb-primary" onClick={() => setStep(2)}>Continue</button>
            </div>
          )}

          {step === 2 && (
            <div className="onb-step">
              <div className="onb-emoji">✨</div>
              <h2>{user ? 'You\'re all set!' : 'Save your progress'}</h2>
              <p>
                {user
                  ? 'Press start and Haru will greet you.'
                  : 'Create a free account to keep your credits and history. You can also skip and try as a guest.'}
              </p>
              {!user ? (
                <div className="onb-actions">
                  <button className="onb-primary" onClick={() => setAuthOpen(true)}>Create account</button>
                  <button className="onb-link" onClick={finish}>Skip for now</button>
                </div>
              ) : (
                <button className="onb-primary" onClick={finish}>Start learning</button>
              )}
            </div>
          )}
        </div>
      </div>

      <AuthModal
        isOpen={authOpen}
        onClose={() => {
          setAuthOpen(false);
          if (useAppStore.getState().user) finish();
        }}
        initialMode="register"
      />
    </>
  );
};

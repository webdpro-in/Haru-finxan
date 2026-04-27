/**
 * SubjectSelector — pill row + mode toggle for Subject and Tutor/Rubric mode.
 * Sits in the navbar / settings.
 */

import React from 'react';
import { useAppStore, Subject, Language } from '../store/useAppStore';
import './SubjectSelector.css';

const SUBJECTS: { id: Subject; label: string; emoji: string }[] = [
  { id: 'general', label: 'General', emoji: '💡' },
  { id: 'math', label: 'Math', emoji: '🧮' },
  { id: 'science', label: 'Science', emoji: '🔬' },
  { id: 'english', label: 'English', emoji: '📝' },
  { id: 'coding', label: 'Coding', emoji: '💻' },
  { id: 'history', label: 'History', emoji: '🏛️' },
];

export const SubjectSelector: React.FC = () => {
  const subject = useAppStore((s) => s.subject);
  const setSubject = useAppStore((s) => s.setSubject);

  return (
    <select
      className="subject-select"
      value={subject}
      onChange={(e) => setSubject(e.target.value as Subject)}
      title="Choose subject"
    >
      {SUBJECTS.map((s) => (
        <option key={s.id} value={s.id}>
          {s.emoji} {s.label}
        </option>
      ))}
    </select>
  );
};

export const ModeToggle: React.FC = () => {
  const mode = useAppStore((s) => s.mode);
  const setMode = useAppStore((s) => s.setMode);

  return (
    <div className="mode-toggle" role="tablist" aria-label="Mode">
      <button
        className={mode === 'tutor' ? 'active' : ''}
        onClick={() => setMode('tutor')}
        role="tab"
        aria-selected={mode === 'tutor'}
      >
        Tutor
      </button>
      <button
        className={mode === 'rubric' ? 'active' : ''}
        onClick={() => setMode('rubric')}
        role="tab"
        aria-selected={mode === 'rubric'}
      >
        Rubric
      </button>
    </div>
  );
};

/**
 * Language dropdown — Haru speaks/replies in any of the supported Indian
 * languages.  Auto-detection from input still wins; this is the manual
 * override.  Native script labels keep the picker recognisable.
 */
const LANGUAGES: { id: Language; label: string }[] = [
  { id: 'en', label: '🇬🇧 English' },
  { id: 'hi', label: '🇮🇳 हिन्दी' },
  { id: 'ta', label: '🇮🇳 தமிழ்' },
  { id: 'te', label: '🇮🇳 తెలుగు' },
  { id: 'kn', label: '🇮🇳 ಕನ್ನಡ' },
  { id: 'bn', label: '🇮🇳 বাংলা' },
];

export const LanguageToggle: React.FC = () => {
  const language = useAppStore((s) => s.language);
  const setLanguage = useAppStore((s) => s.setLanguage);

  return (
    <select
      className="subject-select"
      value={language}
      onChange={(e) => setLanguage(e.target.value as Language)}
      title="Choose language"
      aria-label="Choose language"
    >
      {LANGUAGES.map((l) => (
        <option key={l.id} value={l.id}>{l.label}</option>
      ))}
    </select>
  );
};

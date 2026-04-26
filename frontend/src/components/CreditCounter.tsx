/**
 * CreditCounter — small pill in the navbar showing current credit balance.
 * Hidden when the user is using their own API key (no metering).
 */

import React from 'react';
import { useAppStore } from '../store/useAppStore';
import './CreditCounter.css';

export const CreditCounter: React.FC = () => {
  const credits = useAppStore((s) => s.credits);
  const user = useAppStore((s) => s.user);
  const userApiKey = useAppStore((s) => s.userApiKey);
  const setUpgradeOpen = useAppStore((s) => s.setUpgradeOpen);

  if (userApiKey) {
    return (
      <button className="credit-pill credit-pill-byok" title="Using your own API key — unlimited">
        <span className="credit-dot" />
        Your key
      </button>
    );
  }

  if (!user) return null;

  const low = credits <= 3;

  return (
    <button
      className={`credit-pill ${low ? 'credit-pill-low' : ''}`}
      onClick={() => setUpgradeOpen(true)}
      title="Click to upgrade"
    >
      <span className="credit-icon" aria-hidden>✨</span>
      <span className="credit-count">{credits}</span>
      <span className="credit-label">credits</span>
    </button>
  );
};

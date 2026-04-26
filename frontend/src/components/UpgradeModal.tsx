/**
 * UpgradeModal — opens when user runs out of credits.
 * Two paths: stub "upgrade" that grants paid credits, or open the API config modal.
 */

import React, { useState } from 'react';
import { useAppStore } from '../store/useAppStore';
import { authService } from '../services/AuthService';
import './UpgradeModal.css';

export const UpgradeModal: React.FC = () => {
  const open = useAppStore((s) => s.upgradeOpen);
  const setOpen = useAppStore((s) => s.setUpgradeOpen);
  const setApiConfigOpen = useAppStore((s) => s.setApiConfigOpen);
  const credits = useAppStore((s) => s.credits);
  const [busy, setBusy] = useState(false);
  const [error, setError] = useState<string | null>(null);

  if (!open) return null;

  const handleUpgrade = async () => {
    setBusy(true);
    setError(null);
    try {
      await authService.upgrade();
      setOpen(false);
    } catch (e: any) {
      setError(e?.response?.data?.error || 'Upgrade failed.');
    } finally {
      setBusy(false);
    }
  };

  const handleBYOK = () => {
    setOpen(false);
    setApiConfigOpen(true);
  };

  return (
    <div className="upgrade-overlay" onClick={() => setOpen(false)}>
      <div className="upgrade-modal" onClick={(e) => e.stopPropagation()}>
        <button className="upgrade-close" onClick={() => setOpen(false)} aria-label="Close">×</button>
        <div className="upgrade-header">
          <span className="upgrade-emoji">✨</span>
          <h2>{credits === 0 ? 'You ran out of credits' : 'Upgrade your plan'}</h2>
          <p>Pick how you want to keep teaching with Haru.</p>
        </div>

        <div className="upgrade-options">
          <div className="upgrade-card upgrade-card-paid">
            <div className="upgrade-card-title">Upgrade to Paid</div>
            <div className="upgrade-card-price">+200 credits</div>
            <ul>
              <li>200 credits added to your account</li>
              <li>All subjects + image generation</li>
              <li>Priority during demo</li>
            </ul>
            <button className="upgrade-button upgrade-button-primary" onClick={handleUpgrade} disabled={busy}>
              {busy ? 'Granting…' : 'Upgrade now'}
            </button>
          </div>

          <div className="upgrade-card">
            <div className="upgrade-card-title">Use your own API key</div>
            <div className="upgrade-card-price">Free, unlimited</div>
            <ul>
              <li>Plug in your Groq / OpenAI / Gemini key</li>
              <li>No credit metering</li>
              <li>Stays in your browser</li>
            </ul>
            <button className="upgrade-button" onClick={handleBYOK}>Add API key</button>
          </div>
        </div>

        {error && <div className="upgrade-error">{error}</div>}
      </div>
    </div>
  );
};

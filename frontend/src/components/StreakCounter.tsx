/**
 * StreakCounter — daily-activity streak pill for the navbar.
 *
 * Bumps once per local day on app load (and on any chat message — wired in
 * AIService).  Hover reveals a GitHub-style 60-day heatmap of active days.
 */

import React, { useMemo, useState, useEffect } from 'react';
import { useAppStore } from '../store/useAppStore';
import './StreakCounter.css';

const DAY_MS = 24 * 60 * 60 * 1000;
const DAYS_BACK = 60;

const buildCalendar = (activeDays: string[]) => {
  const set = new Set(activeDays);
  const cells: { date: string; active: boolean }[] = [];
  const today = new Date();
  for (let i = DAYS_BACK - 1; i >= 0; i--) {
    const d = new Date(today.getTime() - i * DAY_MS);
    const iso = d.toISOString().slice(0, 10);
    cells.push({ date: iso, active: set.has(iso) });
  }
  return cells;
};

export const StreakCounter: React.FC = () => {
  const streakCount = useAppStore((s) => s.streakCount);
  const streakDays = useAppStore((s) => s.streakDays);
  const recordStreakActivity = useAppStore((s) => s.recordStreakActivity);
  const [open, setOpen] = useState(false);

  // Bump streak once per session load — interpreted as "user opened the app".
  useEffect(() => {
    recordStreakActivity();
  }, [recordStreakActivity]);

  const cells = useMemo(() => buildCalendar(streakDays || []), [streakDays]);

  return (
    <div
      className="streak-wrap"
      onMouseEnter={() => setOpen(true)}
      onMouseLeave={() => setOpen(false)}
    >
      <button
        className="streak-pill"
        onClick={() => setOpen((v) => !v)}
        title={`${streakCount}-day streak`}
        aria-expanded={open}
      >
        <span className="streak-flame" aria-hidden>🔥</span>
        <span className="streak-count">{streakCount}</span>
        <span className="streak-label">day{streakCount === 1 ? '' : 's'}</span>
      </button>

      {open && (
        <div className="streak-popover" role="dialog" aria-label="Activity calendar">
          <div className="streak-popover-title">
            Last {DAYS_BACK} days · <span className="streak-bold">{streakCount}-day streak</span>
          </div>
          <div className="streak-grid">
            {cells.map(({ date, active }) => (
              <div
                key={date}
                className={`streak-cell ${active ? 'active' : ''}`}
                title={`${date}${active ? ' · learned' : ''}`}
              />
            ))}
          </div>
          <div className="streak-legend">
            <span>Less</span>
            <div className="streak-cell" />
            <div className="streak-cell active" />
            <span>More</span>
          </div>
        </div>
      )}
    </div>
  );
};

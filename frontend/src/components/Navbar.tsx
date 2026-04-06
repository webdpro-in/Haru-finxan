/**
 * Navbar Component
 * Logo button (top-left) that opens sidebar + Dashboard and Settings buttons
 */

import React from 'react';
import './Navbar.css';

interface NavbarProps {
  onMenuClick: () => void;
  onDashboardClick?: () => void;
  onSettingsClick?: () => void;
}

export const Navbar: React.FC<NavbarProps> = ({ onMenuClick, onDashboardClick, onSettingsClick }) => {
  return (
    <nav className="navbar">
      <button className="logo-button" onClick={onMenuClick} title="Menu">
        <img src="/finxan.png" alt="Finxan" className="logo-image" />
      </button>
      
      <div className="navbar-actions">
        {onDashboardClick && (
          <button className="navbar-button" onClick={onDashboardClick} title="Dashboard">
            <svg width="20" height="20" viewBox="0 0 24 24" fill="none" stroke="currentColor" strokeWidth="2">
              <rect x="3" y="3" width="7" height="7" />
              <rect x="14" y="3" width="7" height="7" />
              <rect x="14" y="14" width="7" height="7" />
              <rect x="3" y="14" width="7" height="7" />
            </svg>
            <span>Dashboard</span>
          </button>
        )}
        
        {onSettingsClick && (
          <button className="navbar-button" onClick={onSettingsClick} title="Settings">
            <svg width="20" height="20" viewBox="0 0 24 24" fill="none" stroke="currentColor" strokeWidth="2">
              <circle cx="12" cy="12" r="3" />
              <path d="M12 1v6m0 6v6m9-9h-6m-6 0H3" />
            </svg>
            <span>Settings</span>
          </button>
        )}
      </div>
    </nav>
  );
};

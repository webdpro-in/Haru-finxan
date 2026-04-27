/**
 * Character Debug Panel - helps diagnose character loading issues
 */

import React, { useState } from 'react';
import { useAppStore } from '../store/useAppStore';
import { CHARACTER_LIST, getCharacter } from '../config/characters';

export const CharacterDebugPanel: React.FC = () => {
  const [isOpen, setIsOpen] = useState(false);
  const characterId = useAppStore((s) => s.character);
  const setCharacter = useAppStore((s) => s.setCharacter);
  const character = getCharacter(characterId);

  if (!isOpen) {
    return (
      <button
        onClick={() => setIsOpen(true)}
        style={{
          position: 'fixed',
          bottom: 20,
          right: 20,
          padding: '8px 16px',
          background: '#3b82f6',
          color: 'white',
          border: 'none',
          borderRadius: 8,
          cursor: 'pointer',
          fontSize: 12,
          zIndex: 10000,
          fontWeight: 600,
        }}
      >
        🔧 Debug Character
      </button>
    );
  }

  return (
    <div
      style={{
        position: 'fixed',
        bottom: 20,
        right: 20,
        width: 400,
        maxHeight: '80vh',
        background: 'white',
        border: '2px solid #3b82f6',
        borderRadius: 12,
        padding: 20,
        zIndex: 10000,
        boxShadow: '0 10px 40px rgba(0,0,0,0.2)',
        overflow: 'auto',
      }}
    >
      <div style={{ display: 'flex', justifyContent: 'space-between', alignItems: 'center', marginBottom: 16 }}>
        <h3 style={{ margin: 0, fontSize: 16, fontWeight: 700 }}>Character Debug</h3>
        <button
          onClick={() => setIsOpen(false)}
          style={{
            background: 'none',
            border: 'none',
            fontSize: 20,
            cursor: 'pointer',
            padding: 0,
            width: 24,
            height: 24,
          }}
        >
          ×
        </button>
      </div>

      <div style={{ marginBottom: 16 }}>
        <div style={{ fontSize: 12, fontWeight: 600, marginBottom: 8, color: '#64748b' }}>
          Current Character
        </div>
        <div style={{ padding: 12, background: '#f1f5f9', borderRadius: 8, fontSize: 13 }}>
          <div><strong>ID:</strong> {character.id}</div>
          <div><strong>Label:</strong> {character.label}</div>
          <div><strong>Model Path:</strong> {character.modelPath}</div>
          <div><strong>Voice:</strong> {character.voiceGender}</div>
        </div>
      </div>

      <div style={{ marginBottom: 16 }}>
        <div style={{ fontSize: 12, fontWeight: 600, marginBottom: 8, color: '#64748b' }}>
          Switch Character
        </div>
        <div style={{ display: 'flex', flexDirection: 'column', gap: 8 }}>
          {CHARACTER_LIST.map((char) => (
            <button
              key={char.id}
              onClick={() => {
                setCharacter(char.id);
                window.location.reload();
              }}
              style={{
                padding: '10px 12px',
                background: char.id === characterId ? '#3b82f6' : '#f1f5f9',
                color: char.id === characterId ? 'white' : '#0f172a',
                border: 'none',
                borderRadius: 8,
                cursor: 'pointer',
                fontSize: 13,
                fontWeight: 600,
                textAlign: 'left',
                display: 'flex',
                alignItems: 'center',
                gap: 8,
              }}
            >
              <span style={{ fontSize: 18 }}>{char.emoji}</span>
              <span>{char.label}</span>
              {char.id === characterId && <span style={{ marginLeft: 'auto' }}>✓</span>}
            </button>
          ))}
        </div>
      </div>

      <div style={{ marginBottom: 16 }}>
        <div style={{ fontSize: 12, fontWeight: 600, marginBottom: 8, color: '#64748b' }}>
          Actions
        </div>
        <div style={{ display: 'flex', flexDirection: 'column', gap: 8 }}>
          <button
            onClick={() => {
              const validate = (window as any).debugCharacter?.validate;
              if (validate) {
                validate(characterId).then((result: boolean) => {
                  alert(result ? 'Character files validated ✓' : 'Character validation failed ✗');
                });
              }
            }}
            style={{
              padding: '8px 12px',
              background: '#10b981',
              color: 'white',
              border: 'none',
              borderRadius: 8,
              cursor: 'pointer',
              fontSize: 12,
              fontWeight: 600,
            }}
          >
            Validate Current Character
          </button>
          <button
            onClick={() => {
              if (confirm('Reset to default character (Haru)?')) {
                setCharacter('haru');
                window.location.reload();
              }
            }}
            style={{
              padding: '8px 12px',
              background: '#ef4444',
              color: 'white',
              border: 'none',
              borderRadius: 8,
              cursor: 'pointer',
              fontSize: 12,
              fontWeight: 600,
            }}
          >
            Reset to Default
          </button>
          <button
            onClick={() => {
              console.clear();
              window.location.reload();
            }}
            style={{
              padding: '8px 12px',
              background: '#6366f1',
              color: 'white',
              border: 'none',
              borderRadius: 8,
              cursor: 'pointer',
              fontSize: 12,
              fontWeight: 600,
            }}
          >
            Clear Console & Reload
          </button>
        </div>
      </div>

      <div style={{ fontSize: 11, color: '#94a3b8', marginTop: 12 }}>
        💡 Open browser console (F12) for detailed logs
      </div>
    </div>
  );
};

/**
 * APIConfigModal — bring-your-own-key for Groq / OpenAI / Gemini.
 * Persists to the store; backend reads it via x-user-api-key headers.
 * Bypasses credit metering when a key is set.
 */

import React, { useEffect, useState } from 'react';
import { useAppStore } from '../store/useAppStore';
import './APIConfigModal.css';

type Provider = 'groq' | 'openai' | 'gemini';

const PROVIDERS: { id: Provider; name: string; help: string; placeholder: string; getKeyUrl: string }[] = [
  {
    id: 'groq',
    name: 'Groq (Recommended — fastest)',
    help: 'Free tier available — try Llama 3.3 70B at hundreds of tokens/sec.',
    placeholder: 'gsk_...',
    getKeyUrl: 'https://console.groq.com/keys',
  },
  {
    id: 'openai',
    name: 'OpenAI',
    help: 'Bring your own GPT key. Pay per use.',
    placeholder: 'sk-...',
    getKeyUrl: 'https://platform.openai.com/api-keys',
  },
  {
    id: 'gemini',
    name: 'Google Gemini',
    help: 'Free tier available.',
    placeholder: 'AIza...',
    getKeyUrl: 'https://aistudio.google.com/apikey',
  },
];

export const APIConfigModal: React.FC = () => {
  const open = useAppStore((s) => s.apiConfigOpen);
  const setOpen = useAppStore((s) => s.setApiConfigOpen);
  const userApiKey = useAppStore((s) => s.userApiKey);
  const userApiProvider = useAppStore((s) => s.userApiProvider);
  const setUserApi = useAppStore((s) => s.setUserApi);

  const [provider, setProvider] = useState<Provider>(userApiProvider || 'groq');
  const [apiKey, setApiKey] = useState(userApiKey || '');
  const [saved, setSaved] = useState(false);

  useEffect(() => {
    if (!open) return;
    setProvider(userApiProvider || 'groq');
    setApiKey(userApiKey || '');
    setSaved(false);
  }, [open, userApiProvider, userApiKey]);

  if (!open) return null;

  const meta = PROVIDERS.find((p) => p.id === provider)!;

  const handleSave = () => {
    if (!apiKey || apiKey.length < 10) return;
    setUserApi(provider, apiKey.trim());
    setSaved(true);
    setTimeout(() => setOpen(false), 700);
  };

  const handleClear = () => {
    setUserApi(null, null);
    setApiKey('');
    setOpen(false);
  };

  return (
    <div className="api-modal-overlay" onClick={() => setOpen(false)}>
      <div className="api-modal" onClick={(e) => e.stopPropagation()}>
        <div className="api-modal-header">
          <h2>Use your own API key</h2>
          <button className="api-modal-close" onClick={() => setOpen(false)} aria-label="Close">×</button>
        </div>

        <div className="api-modal-content">
          <p className="api-blurb">
            Skip credit limits by bringing your own key. It stays in your browser and is sent
            directly to Haru's backend per request — never logged.
          </p>

          <div className="api-form-group">
            <label>Provider</label>
            <select
              className="api-select"
              value={provider}
              onChange={(e) => setProvider(e.target.value as Provider)}
            >
              {PROVIDERS.map((p) => (
                <option key={p.id} value={p.id}>{p.name}</option>
              ))}
            </select>
            <small className="api-help">{meta.help}</small>
          </div>

          <div className="api-form-group">
            <label>API Key</label>
            <input
              type="password"
              className="api-input"
              value={apiKey}
              onChange={(e) => setApiKey(e.target.value)}
              placeholder={meta.placeholder}
              autoComplete="off"
            />
            <small className="api-help">
              <a href={meta.getKeyUrl} target="_blank" rel="noreferrer">Get a key from {meta.name.split(' ')[0]} →</a>
            </small>
          </div>

          {saved && <div className="api-test-result success">Saved! Your key will be used for the next message.</div>}
        </div>

        <div className="api-modal-footer">
          {userApiKey && (
            <button className="api-button api-button-secondary" onClick={handleClear}>Clear &amp; use credits</button>
          )}
          <button
            className="api-button api-button-primary"
            onClick={handleSave}
            disabled={!apiKey || apiKey.length < 10}
          >
            Save key
          </button>
        </div>
      </div>
    </div>
  );
};

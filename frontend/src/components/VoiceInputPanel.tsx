/**
 * VoiceInputPanel - Voice and Text Input with Fallback
 * 
 * Implements:
 * - Voice input with visual feedback
 * - Text input fallback when voice unavailable
 * - Voice metrics display
 * - Real-time transcript display
 */

import React, { useState, useEffect, useRef } from 'react';
import { voiceService, VoiceRecognitionResult, VoiceMetrics } from '../services/VoiceService';
import './VoiceInputPanel.css';

interface VoiceInputPanelProps {
  onSubmit: (text: string, metrics?: VoiceMetrics) => void;
  disabled?: boolean;
  placeholder?: string;
  showMetrics?: boolean;
}

export const VoiceInputPanel: React.FC<VoiceInputPanelProps> = ({
  onSubmit,
  disabled = false,
  placeholder = 'Ask me anything...',
  showMetrics = false
}) => {
  const [isListening, setIsListening] = useState(false);
  const [transcript, setTranscript] = useState('');
  const [textInput, setTextInput] = useState('');
  const [useVoice, setUseVoice] = useState(true);
  const [metrics, setMetrics] = useState<VoiceMetrics | null>(null);
  const [error, setError] = useState<string | null>(null);
  const [voiceSupported, setVoiceSupported] = useState(false);
  const textareaRef = useRef<HTMLTextAreaElement>(null);
  
  useEffect(() => {
    // Check voice support
    const supported = voiceService.constructor.isRecognitionSupported();
    setVoiceSupported(supported);
    
    if (!supported) {
      setUseVoice(false);
    }
    
    // Setup voice callbacks
    voiceService.onTranscript((result: VoiceRecognitionResult) => {
      setTranscript(result.transcript);
      if (result.isFinal) {
        setMetrics(result.metrics);
      }
    });
    
    voiceService.onComplete((result: VoiceRecognitionResult) => {
      setIsListening(false);
      setMetrics(result.metrics);
      
      if (result.transcript.trim()) {
        onSubmit(result.transcript, result.metrics);
        setTranscript('');
      }
    });
    
    voiceService.onError((error: string) => {
      setError(`Voice error: ${error}`);
      setIsListening(false);
      
      // Auto-fallback to text on persistent errors
      if (error === 'not-allowed' || error === 'service-not-allowed') {
        setUseVoice(false);
      }
    });
    
    return () => {
      voiceService.destroy();
    };
  }, [onSubmit]);
  
  const handleVoiceToggle = async () => {
    if (disabled) return;
    
    try {
      if (isListening) {
        voiceService.stopListening();
        setIsListening(false);
      } else {
        setError(null);
        setTranscript('');
        await voiceService.startListening();
        setIsListening(true);
      }
    } catch (err) {
      setError('Failed to start voice input. Please use text input.');
      setUseVoice(false);
    }
  };
  
  const handleTextSubmit = () => {
    if (disabled || !textInput.trim()) return;
    
    onSubmit(textInput.trim());
    setTextInput('');
    
    // Reset textarea height
    if (textareaRef.current) {
      textareaRef.current.style.height = 'auto';
    }
  };
  
  const handleKeyPress = (e: React.KeyboardEvent) => {
    if (e.key === 'Enter' && !e.shiftKey) {
      e.preventDefault();
      handleTextSubmit();
    }
  };
  
  const handleTextChange = (e: React.ChangeEvent<HTMLTextAreaElement>) => {
    setTextInput(e.target.value);
    
    // Auto-resize textarea
    e.target.style.height = 'auto';
    e.target.style.height = `${e.target.scrollHeight}px`;
  };
  
  const toggleInputMode = () => {
    if (voiceSupported) {
      setUseVoice(!useVoice);
      setError(null);
      
      if (isListening) {
        voiceService.stopListening();
        setIsListening(false);
      }
    }
  };
  
  return (
    <div className="voice-input-panel">
      {/* Input Mode Toggle */}
      <div className="input-mode-toggle">
        <button
          className={`mode-button ${useVoice ? 'active' : ''}`}
          onClick={toggleInputMode}
          disabled={!voiceSupported}
          title={voiceSupported ? 'Switch to voice input' : 'Voice not supported'}
        >
          🎤 Voice
        </button>
        <button
          className={`mode-button ${!useVoice ? 'active' : ''}`}
          onClick={toggleInputMode}
        >
          ⌨️ Text
        </button>
      </div>
      
      {/* Error Display */}
      {error && (
        <div className="error-message">
          ⚠️ {error}
        </div>
      )}
      
      {/* Voice Input Mode */}
      {useVoice && voiceSupported && (
        <div className="voice-input-container">
          <button
            className={`voice-button ${isListening ? 'listening' : ''}`}
            onClick={handleVoiceToggle}
            disabled={disabled}
            title={isListening ? 'Stop listening' : 'Start listening'}
          >
            <div className="voice-icon">
              {isListening ? (
                <>
                  <div className="pulse-ring"></div>
                  <div className="pulse-ring delay-1"></div>
                  <div className="pulse-ring delay-2"></div>
                  🎤
                </>
              ) : (
                '🎤'
              )}
            </div>
            <span className="voice-status">
              {isListening ? 'Listening...' : 'Click to speak'}
            </span>
          </button>
          
          {/* Real-time Transcript */}
          {transcript && (
            <div className="transcript-display">
              <div className="transcript-label">You said:</div>
              <div className="transcript-text">{transcript}</div>
            </div>
          )}
          
          {/* Voice Metrics */}
          {showMetrics && metrics && (
            <div className="voice-metrics">
              <div className="metrics-title">Voice Metrics</div>
              <div className="metrics-grid">
                <div className="metric">
                  <span className="metric-label">Pauses:</span>
                  <span className="metric-value">{metrics.pauseCount}</span>
                </div>
                <div className="metric">
                  <span className="metric-label">Filler Words:</span>
                  <span className="metric-value">{metrics.fillerWordCount}</span>
                </div>
                <div className="metric">
                  <span className="metric-label">Response Time:</span>
                  <span className="metric-value">{Math.round(metrics.responseTime)}ms</span>
                </div>
                <div className="metric">
                  <span className="metric-label">Speech Rate:</span>
                  <span className="metric-value">{metrics.speechRate} wpm</span>
                </div>
              </div>
              {metrics.fillerWords.length > 0 && (
                <div className="filler-words">
                  <span className="filler-label">Detected:</span>
                  <span className="filler-list">{metrics.fillerWords.join(', ')}</span>
                </div>
              )}
            </div>
          )}
        </div>
      )}
      
      {/* Text Input Mode (Fallback) */}
      {!useVoice && (
        <div className="text-input-container">
          <textarea
            ref={textareaRef}
            className="text-input"
            value={textInput}
            onChange={handleTextChange}
            onKeyPress={handleKeyPress}
            placeholder={placeholder}
            disabled={disabled}
            rows={1}
          />
          <button
            className="send-button"
            onClick={handleTextSubmit}
            disabled={disabled || !textInput.trim()}
            title="Send message (Enter)"
          >
            ➤
          </button>
        </div>
      )}
      
      {/* Voice Not Supported Warning */}
      {!voiceSupported && (
        <div className="voice-not-supported">
          ℹ️ Voice input is not supported in this browser. Using text input.
        </div>
      )}
    </div>
  );
};

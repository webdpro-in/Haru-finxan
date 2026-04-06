/**
 * Vitest setup file
 */

import { expect, afterEach, vi } from 'vitest';
import { cleanup } from '@testing-library/react';

// Cleanup after each test
afterEach(() => {
  cleanup();
});

// Mock SpeechSynthesisUtterance globally
(global as any).SpeechSynthesisUtterance = class MockSpeechSynthesisUtterance {
  text = '';
  rate = 1;
  pitch = 1;
  volume = 1;
  lang = 'en-US';
  voice: any = null;
  
  onstart: (() => void) | null = null;
  onend: (() => void) | null = null;
  onerror: ((event: any) => void) | null = null;
  
  constructor(text: string) {
    this.text = text;
  }
};

// Mock Web Speech API globally
(global as any).window = {
  ...(global as any).window,
  SpeechRecognition: undefined,
  webkitSpeechRecognition: undefined,
  speechSynthesis: undefined,
  SpeechSynthesisUtterance: (global as any).SpeechSynthesisUtterance,
};

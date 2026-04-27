/**
 * Core type definitions for Haru AI Teacher
 */

export type MotionName =
  | 'haru_g_idle'
  | 'haru_g_m01' | 'haru_g_m02' | 'haru_g_m03' | 'haru_g_m04' | 'haru_g_m05'
  | 'haru_g_m06' | 'haru_g_m07' | 'haru_g_m08' | 'haru_g_m09' | 'haru_g_m10'
  | 'haru_g_m11' | 'haru_g_m12' | 'haru_g_m13' | 'haru_g_m14' | 'haru_g_m15'
  | 'haru_g_m16' | 'haru_g_m17' | 'haru_g_m18' | 'haru_g_m19' | 'haru_g_m20'
  | 'haru_g_m21' | 'haru_g_m22' | 'haru_g_m23' | 'haru_g_m24' | 'haru_g_m25'
  | 'haru_g_m26';

export type GestureType =
  | 'idle'
  | 'listening'
  | 'greeting'
  | 'pointLeft'
  | 'pointRight'
  | 'emphasis'
  | 'warning'
  | 'nodding'      // affirmation / "yes that's right" — head nod
  | 'thinking';    // "let me think" / Socratic pause

export type HaruState =
  | 'idle'
  | 'listening'
  | 'speaking'
  | 'gesturing';

export enum VoiceState {
  IDLE = 'IDLE',
  LISTENING = 'LISTENING',
  SPEAKING = 'SPEAKING',
}

export interface TeachingSegment {
  type: 'text' | 'image' | 'emphasis';
  content: string;
  gesture?: GestureType;
  imageQuery?: string;
  duration?: number;
}

export interface AIResponse {
  text: string;
  segments: TeachingSegment[];
  images?: string[];
}

export interface MotionConfig {
  name: MotionName;
  gesture: GestureType;
  priority: number;
  duration: number; // in seconds
  description: string;
}

export interface SpeechState {
  isRecording: boolean;
  isSpeaking: boolean;
  currentText: string;
  audioUrl?: string;
}

export interface UIState {
  leftPanelContent: string;
  rightPanelImages: string[];
  currentGesture: GestureType;
  haruState: HaruState;
}

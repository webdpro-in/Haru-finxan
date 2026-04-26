/**
 * Global Zustand store. Persists user/auth/preferences to localStorage.
 */

import { create } from 'zustand';
import { persist } from 'zustand/middleware';
import { HaruState, GestureType, TeachingSegment } from '../types';

interface ChatMessage {
  role: 'user' | 'assistant';
  content: string;
  timestamp: string;
}

export type Subject = 'general' | 'math' | 'science' | 'english' | 'coding' | 'history';
export type Mode = 'tutor' | 'rubric';
export type Language = 'en' | 'hi';

export interface User {
  id: string;
  email: string;
  displayName: string | null;
  plan: 'free' | 'paid';
}

interface AppState {
  // UI
  leftPanelContent: string;
  rightPanelImages: string[];
  chatHistory: ChatMessage[];
  generatedImages: string[];
  isGeneratingImages: boolean;
  currentSegmentIndex: number;

  // Haru
  haruState: HaruState;
  currentGesture: GestureType;

  // Speech
  isRecording: boolean;
  isSpeaking: boolean;
  userInput: string;

  // Teaching session
  teachingSegments: TeachingSegment[];
  isTeaching: boolean;

  // Persisted preferences + auth
  subject: Subject;
  language: Language;
  mode: Mode;
  user: User | null;
  token: string | null;
  credits: number;
  userApiKey: string | null;
  userApiProvider: 'groq' | 'openai' | 'gemini' | null;
  hasOnboarded: boolean;

  // UI dialogs
  upgradeOpen: boolean;
  apiConfigOpen: boolean;

  // Actions — content
  setLeftPanelContent: (content: string) => void;
  addRightPanelImage: (image: string) => void;
  clearRightPanelImages: () => void;
  addChatMessage: (role: 'user' | 'assistant', content: string) => void;
  clearChatHistory: () => void;
  addGeneratedImage: (imageUrl: string) => void;
  clearGeneratedImages: () => void;
  setIsGeneratingImages: (g: boolean) => void;

  // Actions — haru
  setHaruState: (s: HaruState) => void;
  setCurrentGesture: (g: GestureType) => void;
  setRecording: (r: boolean) => void;
  setSpeaking: (s: boolean) => void;
  setUserInput: (u: string) => void;

  // Actions — teaching
  setTeachingSegments: (segments: TeachingSegment[]) => void;
  setCurrentSegmentIndex: (index: number) => void;
  nextSegment: () => void;
  setIsTeaching: (t: boolean) => void;

  // Actions — auth + preferences
  setSubject: (s: Subject) => void;
  setLanguage: (l: Language) => void;
  setMode: (m: Mode) => void;
  setUser: (u: User | null, token?: string | null) => void;
  setCredits: (n: number) => void;
  setUserApi: (provider: 'groq' | 'openai' | 'gemini' | null, key: string | null) => void;
  setHasOnboarded: (v: boolean) => void;
  signOut: () => void;

  // Actions — modals
  setUpgradeOpen: (v: boolean) => void;
  setApiConfigOpen: (v: boolean) => void;

  reset: () => void;
}

export const useAppStore = create<AppState>()(
  persist(
    (set) => ({
      leftPanelContent: '',
      rightPanelImages: [],
      chatHistory: [],
      generatedImages: [],
      isGeneratingImages: false,
      currentSegmentIndex: 0,

      haruState: 'idle',
      currentGesture: 'idle',

      isRecording: false,
      isSpeaking: false,
      userInput: '',

      teachingSegments: [],
      isTeaching: false,

      subject: 'general',
      language: 'en',
      mode: 'tutor',
      user: null,
      token: null,
      credits: 0,
      userApiKey: null,
      userApiProvider: null,
      hasOnboarded: false,

      upgradeOpen: false,
      apiConfigOpen: false,

      setLeftPanelContent: (content) => set({ leftPanelContent: content }),
      addRightPanelImage: (image) => set((s) => ({ rightPanelImages: [...s.rightPanelImages, image] })),
      clearRightPanelImages: () => set({ rightPanelImages: [] }),
      addChatMessage: (role, content) =>
        set((s) => ({
          chatHistory: [
            ...s.chatHistory,
            { role, content, timestamp: new Date().toLocaleTimeString('en-US', { hour: '2-digit', minute: '2-digit' }) },
          ],
        })),
      clearChatHistory: () => set({ chatHistory: [] }),
      addGeneratedImage: (imageUrl) => set((s) => ({ generatedImages: [...s.generatedImages, imageUrl] })),
      clearGeneratedImages: () => set({ generatedImages: [] }),
      setIsGeneratingImages: (isGeneratingImages) => set({ isGeneratingImages }),

      setHaruState: (haruState) => set({ haruState }),
      setCurrentGesture: (currentGesture) => set({ currentGesture }),
      setRecording: (isRecording) => set({ isRecording }),
      setSpeaking: (isSpeaking) => set({ isSpeaking }),
      setUserInput: (userInput) => set({ userInput }),

      setTeachingSegments: (teachingSegments) => set({ teachingSegments, currentSegmentIndex: 0 }),
      setCurrentSegmentIndex: (currentSegmentIndex) => set({ currentSegmentIndex }),
      nextSegment: () =>
        set((s) => ({
          currentSegmentIndex: Math.min(s.currentSegmentIndex + 1, s.teachingSegments.length - 1),
        })),
      setIsTeaching: (isTeaching) => set({ isTeaching }),

      setSubject: (subject) => set({ subject }),
      setLanguage: (language) => set({ language }),
      setMode: (mode) => set({ mode }),
      setUser: (user, token) => set({ user, token: token ?? null }),
      setCredits: (credits) => set({ credits }),
      setUserApi: (userApiProvider, userApiKey) => set({ userApiProvider, userApiKey }),
      setHasOnboarded: (hasOnboarded) => set({ hasOnboarded }),
      signOut: () => set({ user: null, token: null, credits: 0 }),

      setUpgradeOpen: (upgradeOpen) => set({ upgradeOpen }),
      setApiConfigOpen: (apiConfigOpen) => set({ apiConfigOpen }),

      reset: () =>
        set({
          leftPanelContent: '',
          rightPanelImages: [],
          chatHistory: [],
          generatedImages: [],
          isGeneratingImages: false,
          currentSegmentIndex: 0,
          haruState: 'idle',
          currentGesture: 'idle',
          isRecording: false,
          isSpeaking: false,
          userInput: '',
          teachingSegments: [],
          isTeaching: false,
        }),
    }),
    {
      name: 'haru-app',
      partialize: (s) => ({
        subject: s.subject,
        language: s.language,
        mode: s.mode,
        user: s.user,
        token: s.token,
        credits: s.credits,
        userApiKey: s.userApiKey,
        userApiProvider: s.userApiProvider,
        hasOnboarded: s.hasOnboarded,
      }),
    }
  )
);

if (typeof window !== 'undefined' && import.meta.env?.DEV) {
  // @ts-ignore
  window.__ZUSTAND_STORE__ = useAppStore;
}

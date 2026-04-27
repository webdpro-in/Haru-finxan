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

/** A finished or in-progress conversation thread. Persisted to localStorage. */
export interface ChatSession {
  id: string;
  title: string;          // first user message, truncated
  createdAt: number;      // unix ms
  updatedAt: number;
  messages: ChatMessage[];
}

export type Subject = 'general' | 'math' | 'science' | 'english' | 'coding' | 'history';
export type Mode = 'tutor' | 'rubric';
export type Language = 'en' | 'hi' | 'ta' | 'te' | 'kn' | 'bn';
/** Character id from the registry in `config/characters.ts`. */
export type CharacterId = string;

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

  // Persisted: past chat sessions + streak tracking
  chatSessions: ChatSession[];
  activeSessionId: string | null;
  streakCount: number;
  streakLastActiveDay: string | null; // YYYY-MM-DD, account-local
  streakDays: string[];               // every active day, oldest first

  // Selected on-screen character (haru | ren_pro | …) — persisted.
  character: CharacterId;

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

  // Actions — chat sessions
  newChatSession: () => void;
  loadChatSession: (id: string) => void;
  deleteChatSession: (id: string) => void;
  /** Persist current chatHistory back into the active session record. */
  saveCurrentSession: () => void;

  // Actions — streak (called once per app load)
  recordStreakActivity: () => void;

  // Actions — character switching
  setCharacter: (id: CharacterId) => void;

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

      chatSessions: [],
      activeSessionId: null,
      streakCount: 0,
      streakLastActiveDay: null,
      streakDays: [],

      character: 'haru',

      setLeftPanelContent: (content) => set({ leftPanelContent: content }),
      addRightPanelImage: (image) => set((s) => ({ rightPanelImages: [...s.rightPanelImages, image] })),
      clearRightPanelImages: () => set({ rightPanelImages: [] }),
      addChatMessage: (role, content) =>
        set((s) => {
          const msg: ChatMessage = {
            role,
            content,
            timestamp: new Date().toLocaleTimeString('en-US', { hour: '2-digit', minute: '2-digit' }),
          };
          const chatHistory = [...s.chatHistory, msg];

          // Auto-create or update the active session so history persists.
          let { chatSessions, activeSessionId } = s;
          if (!activeSessionId) {
            // First user message of a fresh chat starts a new session.
            const id = `s_${Date.now()}_${Math.random().toString(36).slice(2, 8)}`;
            const title = role === 'user'
              ? content.slice(0, 60)
              : 'New conversation';
            const session: ChatSession = {
              id, title,
              createdAt: Date.now(), updatedAt: Date.now(),
              messages: chatHistory,
            };
            chatSessions = [session, ...chatSessions].slice(0, 50); // cap at 50
            activeSessionId = id;
          } else {
            chatSessions = chatSessions.map((sess) =>
              sess.id === activeSessionId
                ? {
                    ...sess,
                    messages: chatHistory,
                    updatedAt: Date.now(),
                    // Adopt the first user message as the title if we still have a placeholder.
                    title: sess.title === 'New conversation' && role === 'user'
                      ? content.slice(0, 60)
                      : sess.title,
                  }
                : sess
            );
          }

          return { chatHistory, chatSessions, activeSessionId };
        }),
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

      // Chat session actions
      newChatSession: () =>
        set({
          chatHistory: [],
          activeSessionId: null,
          generatedImages: [],
          leftPanelContent: '',
          teachingSegments: [],
        }),

      loadChatSession: (id) =>
        set((s) => {
          const sess = s.chatSessions.find((x) => x.id === id);
          if (!sess) return s;
          return {
            ...s,
            chatHistory: sess.messages,
            activeSessionId: id,
            generatedImages: [],
            leftPanelContent: sess.messages[sess.messages.length - 1]?.content || '',
            teachingSegments: [],
          };
        }),

      deleteChatSession: (id) =>
        set((s) => {
          const chatSessions = s.chatSessions.filter((x) => x.id !== id);
          const wasActive = s.activeSessionId === id;
          return {
            chatSessions,
            activeSessionId: wasActive ? null : s.activeSessionId,
            chatHistory: wasActive ? [] : s.chatHistory,
          };
        }),

      saveCurrentSession: () =>
        set((s) => {
          if (!s.activeSessionId) return s;
          return {
            chatSessions: s.chatSessions.map((sess) =>
              sess.id === s.activeSessionId
                ? { ...sess, messages: s.chatHistory, updatedAt: Date.now() }
                : sess
            ),
          };
        }),

      setCharacter: (character) => set({ character }),

      // Streak: bump count when there's been activity today.  Resets to 1 if
      // there's been a gap > 1 calendar day.  Today's date is the local
      // YYYY-MM-DD so streaks roll over at the user's midnight, not UTC.
      recordStreakActivity: () =>
        set((s) => {
          const today = new Date().toISOString().slice(0, 10);
          if (s.streakLastActiveDay === today) return s; // already counted

          const yesterday = (() => {
            const d = new Date();
            d.setDate(d.getDate() - 1);
            return d.toISOString().slice(0, 10);
          })();

          const continued = s.streakLastActiveDay === yesterday;
          return {
            streakLastActiveDay: today,
            streakCount: continued ? s.streakCount + 1 : 1,
            streakDays: [...(s.streakDays || []), today].slice(-180), // last 6 mo
          };
        }),

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
        chatSessions: s.chatSessions,
        activeSessionId: s.activeSessionId,
        streakCount: s.streakCount,
        streakLastActiveDay: s.streakLastActiveDay,
        streakDays: s.streakDays,
        character: s.character,
      }),
    }
  )
);

if (typeof window !== 'undefined' && import.meta.env?.DEV) {
  // @ts-ignore
  window.__ZUSTAND_STORE__ = useAppStore;
}

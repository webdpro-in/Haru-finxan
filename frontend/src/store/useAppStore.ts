/**
 * Global State Management using Zustand
 * Manages UI state, speech state, and teaching session
 */

import { create } from 'zustand';
import { HaruState, GestureType, TeachingSegment } from '../types';

interface ChatMessage {
  role: 'user' | 'assistant';
  content: string;
  timestamp: string;
}

interface AppState {
  // UI State
  leftPanelContent: string;
  rightPanelImages: string[];
  chatHistory: ChatMessage[];
  generatedImages: string[];
  isGeneratingImages: boolean; // NEW: Track if images are being generated
  currentSegmentIndex: number;
  
  // Haru State
  haruState: HaruState;
  currentGesture: GestureType;
  
  // Speech State
  isRecording: boolean;
  isSpeaking: boolean;
  userInput: string;
  
  // Teaching Session
  teachingSegments: TeachingSegment[];
  isTeaching: boolean;
  
  // Actions
  setLeftPanelContent: (content: string) => void;
  setRightPanelImages: (images: string[]) => void;
  addRightPanelImage: (image: string) => void;
  clearRightPanelImages: () => void;
  
  addChatMessage: (role: 'user' | 'assistant', content: string) => void;
  clearChatHistory: () => void;
  
  addGeneratedImage: (imageUrl: string) => void;
  clearGeneratedImages: () => void;
  setIsGeneratingImages: (generating: boolean) => void; // NEW
  
  setHaruState: (state: HaruState) => void;
  setCurrentGesture: (gesture: GestureType) => void;
  
  setRecording: (recording: boolean) => void;
  setSpeaking: (speaking: boolean) => void;
  setUserInput: (input: string) => void;
  
  setTeachingSegments: (segments: TeachingSegment[]) => void;
  setCurrentSegmentIndex: (index: number) => void;
  nextSegment: () => void;
  setIsTeaching: (teaching: boolean) => void;
  
  reset: () => void;
}

export const useAppStore = create<AppState>((set) => ({
  // Initial State
  leftPanelContent: '',
  rightPanelImages: [],
  chatHistory: [],
  generatedImages: [],
  isGeneratingImages: false, // NEW
  currentSegmentIndex: 0,
  
  haruState: 'idle',
  currentGesture: 'idle',
  
  isRecording: false,
  isSpeaking: false,
  userInput: '',
  
  teachingSegments: [],
  isTeaching: false,
  
  // Actions
  setLeftPanelContent: (content) => set({ leftPanelContent: content }),
  
  setRightPanelImages: (images) => set({ rightPanelImages: images }),
  
  addRightPanelImage: (image) => set((state) => ({
    rightPanelImages: [...state.rightPanelImages, image],
  })),
  
  clearRightPanelImages: () => set({ rightPanelImages: [] }),
  
  addChatMessage: (role, content) => set((state) => ({
    chatHistory: [
      ...state.chatHistory,
      {
        role,
        content,
        timestamp: new Date().toLocaleTimeString('en-US', { 
          hour: '2-digit', 
          minute: '2-digit' 
        }),
      },
    ],
  })),
  
  clearChatHistory: () => set({ chatHistory: [] }),
  
  addGeneratedImage: (imageUrl) => set((state) => ({
    generatedImages: [...state.generatedImages, imageUrl],
  })),
  
  clearGeneratedImages: () => set({ generatedImages: [] }),
  
  setIsGeneratingImages: (isGeneratingImages) => set({ isGeneratingImages }), // NEW
  
  setHaruState: (haruState) => set({ haruState }),
  
  setCurrentGesture: (currentGesture) => set({ currentGesture }),
  
  setRecording: (isRecording) => set({ isRecording }),
  
  setSpeaking: (isSpeaking) => set({ isSpeaking }),
  
  setUserInput: (userInput) => set({ userInput }),
  
  setTeachingSegments: (teachingSegments) => set({ 
    teachingSegments,
    currentSegmentIndex: 0,
  }),
  
  setCurrentSegmentIndex: (currentSegmentIndex) => set({ currentSegmentIndex }),
  
  nextSegment: () => set((state) => ({
    currentSegmentIndex: Math.min(
      state.currentSegmentIndex + 1,
      state.teachingSegments.length - 1
    ),
  })),
  
  setIsTeaching: (isTeaching) => set({ isTeaching }),
  
  reset: () => set({
    leftPanelContent: '',
    rightPanelImages: [],
    chatHistory: [],
    generatedImages: [],
    isGeneratingImages: false, // NEW
    currentSegmentIndex: 0,
    haruState: 'idle',
    currentGesture: 'idle',
    isRecording: false,
    isSpeaking: false,
    userInput: '',
    teachingSegments: [],
    isTeaching: false,
  }),
}));

// Expose store for debugging in development
if (typeof window !== 'undefined' && import.meta.env?.DEV) {
  // @ts-ignore
  window.__ZUSTAND_STORE__ = useAppStore;
  console.log('🔧 Store exposed as window.__ZUSTAND_STORE__ for debugging');
}

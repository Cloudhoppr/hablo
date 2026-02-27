'use client'

import { create } from 'zustand'
import type { Session, Message } from '@/lib/types'

interface SessionState {
  // Current session
  currentSession: Session | null
  messages: Message[]
  isConnected: boolean
  isRecording: boolean
  isSpeaking: boolean

  // History
  sessions: Session[]

  // Actions
  setCurrentSession: (session: Session | null) => void
  addMessage: (message: Message) => void
  setMessages: (messages: Message[]) => void
  setSessions: (sessions: Session[]) => void
  setIsConnected: (connected: boolean) => void
  setIsRecording: (recording: boolean) => void
  setIsSpeaking: (speaking: boolean) => void
  reset: () => void
}

export const useSessionStore = create<SessionState>((set) => ({
  currentSession: null,
  messages: [],
  isConnected: false,
  isRecording: false,
  isSpeaking: false,
  sessions: [],

  setCurrentSession: (session) => set({ currentSession: session }),
  addMessage: (message) =>
    set((state) => ({ messages: [...state.messages, message] })),
  setMessages: (messages) => set({ messages }),
  setSessions: (sessions) => set({ sessions }),
  setIsConnected: (connected) => set({ isConnected: connected }),
  setIsRecording: (recording) => set({ isRecording: recording }),
  setIsSpeaking: (speaking) => set({ isSpeaking: speaking }),
  reset: () =>
    set({
      currentSession: null,
      messages: [],
      isConnected: false,
      isRecording: false,
      isSpeaking: false,
    }),
}))

'use client'

import { useEffect, useRef } from 'react'
import type { Message } from '@/lib/types'
import { MessageBubble, TypingIndicator } from './message-bubble'

interface MessageListProps {
  messages: Message[]
  /** Partial user speech in progress (not yet finalized) */
  partialUserText?: string | null
  /** True when the AI is processing (post-user-speech, pre-response) */
  isAgentThinking?: boolean
}

export function MessageList({ messages, partialUserText, isAgentThinking }: MessageListProps) {
  const bottomRef = useRef<HTMLDivElement>(null)

  // Auto-scroll to bottom when messages or indicators change
  useEffect(() => {
    bottomRef.current?.scrollIntoView({ behavior: 'smooth' })
  }, [messages, partialUserText, isAgentThinking])

  const hasContent = messages.length > 0 || partialUserText || isAgentThinking

  return (
    <div className="flex-1 overflow-y-auto px-4 py-6">
      {!hasContent ? (
        /* Empty state */
        <div className="h-full flex items-center justify-center">
          <div className="text-center space-y-4">
            <div className="w-16 h-16 mx-auto rounded-full bg-indigo-100 dark:bg-indigo-900/50 flex items-center justify-center">
              <svg
                xmlns="http://www.w3.org/2000/svg"
                width="32"
                height="32"
                viewBox="0 0 24 24"
                fill="none"
                stroke="currentColor"
                strokeWidth="2"
                strokeLinecap="round"
                strokeLinejoin="round"
                className="text-indigo-600 dark:text-indigo-400"
              >
                <path d="M12 1a3 3 0 0 0-3 3v8a3 3 0 0 0 6 0V4a3 3 0 0 0-3-3z" />
                <path d="M19 10v2a7 7 0 0 1-14 0v-2" />
                <line x1="12" y1="19" x2="12" y2="23" />
                <line x1="8" y1="23" x2="16" y2="23" />
              </svg>
            </div>
            <h3 className="text-xl font-medium text-gray-900 dark:text-gray-100">
              Start a conversation
            </h3>
            <p className="text-gray-500 dark:text-gray-400 max-w-sm text-sm">
              Click the microphone button below to start practicing Mexican Spanish with your AI coach.
            </p>
          </div>
        </div>
      ) : (
        <div className="max-w-3xl mx-auto space-y-4">
          {messages.map((msg) => (
            <MessageBubble key={msg.id} message={msg} />
          ))}

          {/* Partial user transcript (real-time) */}
          {partialUserText && (
            <TypingIndicator role="user" text={partialUserText} />
          )}

          {/* Agent thinking / typing */}
          {isAgentThinking && !partialUserText && (
            <TypingIndicator role="assistant" />
          )}

          <div ref={bottomRef} />
        </div>
      )}
    </div>
  )
}

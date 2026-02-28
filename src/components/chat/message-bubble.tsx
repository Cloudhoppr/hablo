'use client'

import type { Message } from '@/lib/types'

interface MessageBubbleProps {
  message: Message
}

function formatTime(iso: string): string {
  return new Date(iso).toLocaleTimeString([], { hour: '2-digit', minute: '2-digit' })
}

export function MessageBubble({ message }: MessageBubbleProps) {
  const { role, content, created_at } = message

  if (role === 'system') {
    return (
      <div className="flex justify-center my-2">
        <span className="text-xs text-gray-400 dark:text-gray-500 italic">{content}</span>
      </div>
    )
  }

  const isUser = role === 'user'

  return (
    <div className={`flex items-end gap-2 ${isUser ? 'flex-row-reverse' : 'flex-row'}`}>
      {/* Avatar (assistant only) */}
      {!isUser && (
        <div className="flex-shrink-0 w-8 h-8 rounded-full bg-indigo-600 dark:bg-indigo-500 flex items-center justify-center">
          <svg
            xmlns="http://www.w3.org/2000/svg"
            width="16"
            height="16"
            viewBox="0 0 24 24"
            fill="none"
            stroke="white"
            strokeWidth="2"
            strokeLinecap="round"
            strokeLinejoin="round"
          >
            <path d="M12 1a3 3 0 0 0-3 3v8a3 3 0 0 0 6 0V4a3 3 0 0 0-3-3z" />
            <path d="M19 10v2a7 7 0 0 1-14 0v-2" />
            <line x1="12" y1="19" x2="12" y2="23" />
            <line x1="8" y1="23" x2="16" y2="23" />
          </svg>
        </div>
      )}

      {/* Bubble */}
      <div className={`flex flex-col gap-1 max-w-[70%] ${isUser ? 'items-end' : 'items-start'}`}>
        <div
          className={
            isUser
              ? 'px-4 py-2.5 rounded-2xl rounded-br-sm bg-indigo-600 text-white text-sm leading-relaxed'
              : 'px-4 py-2.5 rounded-2xl rounded-bl-sm bg-gray-100 dark:bg-gray-800 text-gray-900 dark:text-gray-100 text-sm leading-relaxed'
          }
        >
          {content}
        </div>
        <span className="text-xs text-gray-400 dark:text-gray-500 px-1">
          {formatTime(created_at)}
        </span>
      </div>
    </div>
  )
}

interface TypingIndicatorProps {
  role: 'user' | 'assistant'
  text?: string // partial user transcript text
}

export function TypingIndicator({ role, text }: TypingIndicatorProps) {
  if (role === 'user' && text) {
    // Grayed-out partial transcript on the right side
    return (
      <div className="flex items-end gap-2 flex-row-reverse">
        <div className="flex flex-col gap-1 max-w-[70%] items-end">
          <div className="px-4 py-2.5 rounded-2xl rounded-br-sm bg-indigo-300 dark:bg-indigo-800/60 text-white dark:text-indigo-200 text-sm leading-relaxed italic opacity-70">
            {text}
          </div>
        </div>
      </div>
    )
  }

  // Thinking dots indicator (assistant / user without text)
  const isUser = role === 'user'
  return (
    <div className={`flex items-end gap-2 ${isUser ? 'flex-row-reverse' : 'flex-row'}`}>
      {!isUser && (
        <div className="flex-shrink-0 w-8 h-8 rounded-full bg-indigo-600 dark:bg-indigo-500 flex items-center justify-center">
          <svg
            xmlns="http://www.w3.org/2000/svg"
            width="16"
            height="16"
            viewBox="0 0 24 24"
            fill="none"
            stroke="white"
            strokeWidth="2"
            strokeLinecap="round"
            strokeLinejoin="round"
          >
            <path d="M12 1a3 3 0 0 0-3 3v8a3 3 0 0 0 6 0V4a3 3 0 0 0-3-3z" />
            <path d="M19 10v2a7 7 0 0 1-14 0v-2" />
            <line x1="12" y1="19" x2="12" y2="23" />
            <line x1="8" y1="23" x2="16" y2="23" />
          </svg>
        </div>
      )}
      <div
        className={
          isUser
            ? 'px-4 py-3 rounded-2xl rounded-br-sm bg-indigo-300 dark:bg-indigo-800/60'
            : 'px-4 py-3 rounded-2xl rounded-bl-sm bg-gray-100 dark:bg-gray-800'
        }
      >
        <span className="flex gap-1 items-center h-4">
          <span className="w-1.5 h-1.5 rounded-full bg-gray-400 dark:bg-gray-500 animate-bounce [animation-delay:0ms]" />
          <span className="w-1.5 h-1.5 rounded-full bg-gray-400 dark:bg-gray-500 animate-bounce [animation-delay:150ms]" />
          <span className="w-1.5 h-1.5 rounded-full bg-gray-400 dark:bg-gray-500 animate-bounce [animation-delay:300ms]" />
        </span>
      </div>
    </div>
  )
}

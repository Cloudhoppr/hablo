'use client'

export default function Home() {
  return (
    <div className="flex flex-1 flex-col h-full">
      {/* Header */}
      <header className="flex items-center justify-between px-6 py-4 border-b border-gray-200 dark:border-gray-800">
        <h2 className="text-lg font-semibold">New Session</h2>
      </header>

      {/* Message area */}
      <div className="flex-1 flex items-center justify-center overflow-y-auto p-6">
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
          <p className="text-gray-500 dark:text-gray-400 max-w-sm">
            Click the microphone button below to start practicing Mexican Spanish with your AI coach.
          </p>
        </div>
      </div>

      {/* Control bar */}
      <div className="border-t border-gray-200 dark:border-gray-800 p-4">
        <div className="flex items-center gap-3 max-w-3xl mx-auto">
          {/* Text input */}
          <input
            type="text"
            placeholder="Type a message in English or Spanish..."
            disabled
            className="flex-1 px-4 py-2.5 rounded-xl border border-gray-300 dark:border-gray-700 bg-gray-100 dark:bg-gray-800 text-gray-400 dark:text-gray-500 cursor-not-allowed text-sm"
          />

          {/* Mic button */}
          <button
            disabled
            className="w-12 h-12 rounded-full bg-gray-200 dark:bg-gray-800 flex items-center justify-center cursor-not-allowed"
            aria-label="Start voice conversation"
          >
            <svg
              xmlns="http://www.w3.org/2000/svg"
              width="20"
              height="20"
              viewBox="0 0 24 24"
              fill="none"
              stroke="currentColor"
              strokeWidth="2"
              strokeLinecap="round"
              strokeLinejoin="round"
              className="text-gray-400 dark:text-gray-500"
            >
              <path d="M12 1a3 3 0 0 0-3 3v8a3 3 0 0 0 6 0V4a3 3 0 0 0-3-3z" />
              <path d="M19 10v2a7 7 0 0 1-14 0v-2" />
              <line x1="12" y1="19" x2="12" y2="23" />
              <line x1="8" y1="23" x2="16" y2="23" />
            </svg>
          </button>
        </div>
      </div>
    </div>
  )
}

export default function HistoryPage() {
  return (
    <div className="flex flex-1 flex-col h-full">
      {/* Header */}
      <header className="flex items-center justify-between px-6 py-4 border-b border-gray-200 dark:border-gray-800">
        <h2 className="text-lg font-semibold">Chat History</h2>
      </header>

      {/* Session list placeholder */}
      <div className="flex-1 flex items-center justify-center p-6">
        <div className="text-center space-y-4">
          <div className="w-16 h-16 mx-auto rounded-full bg-gray-100 dark:bg-gray-800 flex items-center justify-center">
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
              className="text-gray-400 dark:text-gray-500"
            >
              <circle cx="12" cy="12" r="10" />
              <polyline points="12 6 12 12 16 14" />
            </svg>
          </div>
          <h3 className="text-xl font-medium text-gray-900 dark:text-gray-100">
            No sessions yet
          </h3>
          <p className="text-gray-500 dark:text-gray-400 max-w-sm">
            Your past conversations will appear here. Start a new chat to begin learning!
          </p>
        </div>
      </div>
    </div>
  )
}

export default function SessionDetailPage() {
  return (
    <div className="flex flex-1 flex-col h-full">
      {/* Header */}
      <header className="flex items-center gap-3 px-6 py-4 border-b border-gray-200 dark:border-gray-800">
        <a
          href="/history"
          className="p-1.5 rounded-md hover:bg-gray-200 dark:hover:bg-gray-800 text-gray-500"
          aria-label="Back to history"
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
          >
            <polyline points="15 18 9 12 15 6" />
          </svg>
        </a>
        <h2 className="text-lg font-semibold">Session Detail</h2>
      </header>

      {/* Transcript area placeholder */}
      <div className="flex-1 flex items-center justify-center p-6">
        <p className="text-gray-500 dark:text-gray-400">
          Session transcript will be displayed here.
        </p>
      </div>
    </div>
  )
}

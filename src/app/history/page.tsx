import { SessionList } from '@/components/history/session-list'

export default function HistoryPage() {
  return (
    <div className="flex flex-1 flex-col h-full overflow-hidden">
      {/* Header */}
      <header className="flex items-center justify-between px-6 py-4 border-b border-gray-200 dark:border-gray-800 flex-shrink-0">
        <h2 className="text-lg font-semibold">Chat History</h2>
      </header>

      {/* Session list */}
      <div className="flex-1 overflow-y-auto">
        <div className="max-w-2xl mx-auto">
          <SessionList />
        </div>
      </div>
    </div>
  )
}

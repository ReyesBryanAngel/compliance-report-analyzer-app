'use client'

import type { ConversationSummary } from '@/lib/types/conversation'

interface Props {
  conversations: ConversationSummary[]
  activeId: string | null
  onSelect: (id: string) => void
  onNewConversation: () => void
  isStarting: boolean
}

function formatRelative(iso: string): string {
  const date = new Date(iso)
  const now = new Date()
  const diffMs = now.getTime() - date.getTime()
  const diffMins = Math.floor(diffMs / 60_000)
  if (diffMins < 1) return 'Just now'
  if (diffMins < 60) return `${diffMins}m ago`
  const diffHours = Math.floor(diffMins / 60)
  if (diffHours < 24) return `${diffHours}h ago`
  const diffDays = Math.floor(diffHours / 24)
  if (diffDays < 7) return `${diffDays}d ago`
  return date.toLocaleDateString('en-GB', { month: 'short', day: 'numeric' })
}

export function ConversationList({
  conversations,
  activeId,
  onSelect,
  onNewConversation,
  isStarting,
}: Props) {
  return (
    <div className="flex flex-col gap-1 w-full sm:w-48 shrink-0 border-b sm:border-b-0 sm:border-r border-slate-200 pb-2 sm:pb-0 sm:pr-2">
      <button
        onClick={onNewConversation}
        disabled={isStarting}
        className="flex items-center justify-center gap-1.5 w-full px-3 py-2 text-xs font-medium text-indigo-600
          bg-indigo-50 hover:bg-indigo-100 disabled:opacity-50 disabled:cursor-not-allowed
          rounded-lg transition-colors"
      >
        {isStarting ? (
          <>
            <span className="w-3 h-3 border-2 border-indigo-400/40 border-t-indigo-600 rounded-full animate-spin" />
            Starting…
          </>
        ) : (
          <>
            <span className="text-base leading-none">+</span>
            New Conversation
          </>
        )}
      </button>

      <div className="overflow-y-auto max-h-48 sm:max-h-none sm:flex-1 space-y-0.5 mt-1">
        {conversations.map((conv, i) => {
          const isActive = conv.id === activeId
          return (
            <button
              key={conv.id}
              onClick={() => onSelect(conv.id)}
              className={`w-full text-left px-2.5 py-2 rounded-lg text-xs transition-colors ${
                isActive
                  ? 'bg-indigo-50 text-indigo-700 font-medium'
                  : 'text-slate-600 hover:bg-slate-50'
              }`}
            >
              <p className="font-medium truncate">
                Chat {conversations.length - i}
              </p>
              <p className={`mt-0.5 ${isActive ? 'text-indigo-500' : 'text-slate-400'}`}>
                {formatRelative(conv.createdAt)} · {conv.messageCount} msg{conv.messageCount !== 1 ? 's' : ''}
              </p>
            </button>
          )
        })}
      </div>
    </div>
  )
}

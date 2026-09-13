'use client'

import { useState, useCallback, useEffect, useRef } from 'react'
import type { ConversationMessage, ConversationSummary } from '@/lib/types/conversation'
import {
  listConversations,
  getConversation,
  startConversation,
  sendMessage,
} from '@/lib/api/conversations'
import type { ApiError } from '@/lib/api/conversations'
import { ConversationList } from './ConversationList'
import { ConversationThread } from './ConversationThread'
import { MessageComposer } from './MessageComposer'

interface PanelState {
  conversations: ConversationSummary[]
  activeConversationId: string | null
  messages: ConversationMessage[]
  isSending: boolean
  isLoadingHistory: boolean
  isStarting: boolean
  error: string | null
  draftMessage: string
}

const INITIAL_STATE: PanelState = {
  conversations: [],
  activeConversationId: null,
  messages: [],
  isSending: false,
  isLoadingHistory: false,
  isStarting: false,
  error: null,
  draftMessage: '',
}

interface Props {
  reportId: string
  reportStatus: string
}

function mapError(err: unknown, networkFallback = 'Could not reach the server. Check your connection.'): string {
  if (err && typeof err === 'object' && 'message' in err) {
    return (err as ApiError).message
  }
  if (err instanceof Error) return err.message
  return networkFallback
}

export function ReportConversationPanel({ reportId, reportStatus }: Props) {
  const [state, setState] = useState<PanelState>(INITIAL_STATE)
  const composerRef = useRef<HTMLTextAreaElement>(null)
  const isCompleted = reportStatus === 'COMPLETED'

  const setPartial = useCallback((patch: Partial<PanelState>) => {
    setState(prev => ({ ...prev, ...patch }))
  }, [])

  // On mount: list existing conversations, auto-select most recent
  useEffect(() => {
    if (!isCompleted) return
    let cancelled = false

    async function init() {
      try {
        const { conversations } = await listConversations(reportId)
        if (cancelled) return

        if (conversations.length === 0) {
          setPartial({ conversations })
          return
        }

        const sorted = [...conversations].sort(
          (a, b) => new Date(b.createdAt).getTime() - new Date(a.createdAt).getTime(),
        )
        const latest = sorted[0]

        setPartial({ conversations: sorted, activeConversationId: latest.id, isLoadingHistory: true })

        const detail = await getConversation(reportId, latest.id)
        if (cancelled) return
        setPartial({ messages: detail.messages, isLoadingHistory: false })
      } catch (err) {
        if (cancelled) return
        setPartial({ error: mapError(err), isLoadingHistory: false })
      }
    }

    init()
    return () => { cancelled = true }
  }, [reportId, isCompleted, setPartial])

  const handleSelectConversation = useCallback(async (id: string) => {
    setPartial({ activeConversationId: id, messages: [], isLoadingHistory: true, error: null })
    try {
      const detail = await getConversation(reportId, id)
      setPartial({ messages: detail.messages, isLoadingHistory: false })
    } catch (err) {
      setPartial({ error: mapError(err), isLoadingHistory: false })
    }
  }, [reportId, setPartial])

  const handleNewConversation = useCallback(async () => {
    setPartial({ isStarting: true, error: null })
    try {
      const conv = await startConversation(reportId)
      const newSummary: ConversationSummary = {
        id: conv.id,
        reportId: conv.reportId,
        userId: null,
        messageCount: 0,
        createdAt: conv.createdAt,
        updatedAt: conv.createdAt,
      }
      setState(prev => ({
        ...prev,
        conversations: [newSummary, ...prev.conversations],
        activeConversationId: conv.id,
        messages: [],
        isStarting: false,
        draftMessage: '',
      }))
    } catch (err) {
      setPartial({ error: mapError(err), isStarting: false })
    }
  }, [reportId, setPartial])

  const handleSend = useCallback(async () => {
    const { activeConversationId, draftMessage, messages, isSending } = state
    if (!activeConversationId || !draftMessage.trim() || isSending) return

    const text = draftMessage.trim()
    const lastSeq = messages.length > 0 ? Math.max(...messages.map(m => m.sequence)) : 0

    const optimisticMsg: ConversationMessage = {
      id: `temp-${Date.now()}`,
      conversationId: activeConversationId,
      role: 'USER',
      content: text,
      sequence: lastSeq + 1,
      model: null,
      provider: null,
      promptTokens: null,
      completionTokens: null,
      latencyMs: null,
      createdAt: new Date().toISOString(),
    }

    setState(prev => ({
      ...prev,
      messages: [...prev.messages, optimisticMsg],
      isSending: true,
      draftMessage: '',
      error: null,
    }))

    try {
      const assistantMsg = await sendMessage(reportId, activeConversationId, text)
      setState(prev => ({
        ...prev,
        messages: [...prev.messages, assistantMsg],
        isSending: false,
        // update messageCount in sidebar
        conversations: prev.conversations.map(c =>
          c.id === activeConversationId
            ? { ...c, messageCount: c.messageCount + 2 }
            : c,
        ),
      }))
    } catch (err) {
      // remove optimistic message, restore draft, show error
      setState(prev => ({
        ...prev,
        messages: prev.messages.filter(m => m.id !== optimisticMsg.id),
        isSending: false,
        draftMessage: text,
        error: mapError(err),
      }))
    }
  }, [state, reportId])

  if (!isCompleted) {
    return (
      <div className="flex items-center gap-2 px-4 py-3 bg-slate-50 border border-slate-200 rounded-xl text-sm text-slate-500">
        <svg className="w-4 h-4 shrink-0 text-slate-400" fill="none" stroke="currentColor" viewBox="0 0 24 24" aria-hidden="true">
          <path strokeLinecap="round" strokeLinejoin="round" strokeWidth={1.5}
            d="M8 10h.01M12 10h.01M16 10h.01M9 16H5a2 2 0 01-2-2V6a2 2 0 012-2h14a2 2 0 012 2v8a2 2 0 01-2 2h-5l-5 5v-5z"
          />
        </svg>
        Conversations are available once the report is complete.
      </div>
    )
  }

  const { conversations, activeConversationId, messages, isSending, isLoadingHistory, isStarting, error, draftMessage } = state
  const hasActiveConversation = activeConversationId !== null
  const showEmptyStart = conversations.length === 0 && !isLoadingHistory

  return (
    <div className="flex flex-col gap-3">
      <div className="flex items-center gap-2">
        <svg className="w-4 h-4 text-indigo-500" fill="none" stroke="currentColor" viewBox="0 0 24 24" aria-hidden="true">
          <path strokeLinecap="round" strokeLinejoin="round" strokeWidth={1.5}
            d="M8 10h.01M12 10h.01M16 10h.01M9 16H5a2 2 0 01-2-2V6a2 2 0 012-2h14a2 2 0 012 2v8a2 2 0 01-2 2h-5l-5 5v-5z"
          />
        </svg>
        <h3 className="text-sm font-semibold text-slate-700">Ask AI</h3>
      </div>

      {/* Global error (non-composer) */}
      {error && !hasActiveConversation && (
        <p className="text-xs text-red-600 px-1" role="alert">{error}</p>
      )}

      {/* Empty state — no existing conversations */}
      {showEmptyStart && (
        <div className="flex flex-col items-center gap-3 py-10 border border-dashed border-slate-200 rounded-xl">
          <svg className="w-9 h-9 text-slate-300" fill="none" stroke="currentColor" viewBox="0 0 24 24" aria-hidden="true">
            <path strokeLinecap="round" strokeLinejoin="round" strokeWidth={1.5}
              d="M8 10h.01M12 10h.01M16 10h.01M9 16H5a2 2 0 01-2-2V6a2 2 0 012-2h14a2 2 0 012 2v8a2 2 0 01-2 2h-5l-5 5v-5z"
            />
          </svg>
          <p className="text-sm text-slate-500 font-medium">Ask the AI about this report</p>
          <button
            onClick={handleNewConversation}
            disabled={isStarting}
            className="px-4 py-2 text-sm font-medium text-white bg-indigo-600 hover:bg-indigo-700
              disabled:opacity-50 disabled:cursor-not-allowed rounded-xl transition-colors"
          >
            {isStarting ? 'Starting…' : 'Start Conversation'}
          </button>
        </div>
      )}

      {/* Active conversation panel */}
      {(hasActiveConversation || conversations.length > 0) && (
        <div className="flex flex-col sm:flex-row gap-2 border border-slate-200 rounded-xl overflow-hidden max-h-[600px]">
          {/* Sidebar */}
          <div className="sm:flex sm:flex-col p-2 bg-slate-50/60">
            <ConversationList
              conversations={conversations}
              activeId={activeConversationId}
              onSelect={handleSelectConversation}
              onNewConversation={handleNewConversation}
              isStarting={isStarting}
            />
          </div>

          {/* Thread + Composer */}
          <div className="flex flex-col flex-1 min-h-0 min-w-0">
            <ConversationThread
              messages={messages}
              isSending={isSending}
              isLoading={isLoadingHistory}
            />
            <MessageComposer
              value={draftMessage}
              onChange={(v) => setPartial({ draftMessage: v, error: null })}
              onSend={handleSend}
              isSending={isSending}
              disabled={!hasActiveConversation}
              error={hasActiveConversation ? error : null}
            />
          </div>
        </div>
      )}
    </div>
  )
}

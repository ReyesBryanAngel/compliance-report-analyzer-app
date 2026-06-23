'use client'

import { useState, useEffect, useCallback } from 'react'
import { listWorkflowExecutions, getWorkflowExecutionConversation } from '@/lib/api'
import type { WorkflowExecutionSummary, AgentConversation, AgentMessage } from '@/lib/types'
import { RefreshIcon, ChevronDownIcon } from '@/components/icons'

const WORKFLOW_SLUGS = ['kyc', 'sg', 'traml', 'document-integrity']
const STATUS_OPTIONS = ['COMPLETED', 'RUNNING', 'FAILED']
const PAGE_LIMIT = 20

// ---------------------------------------------------------------------------
// MessageBubble
// ---------------------------------------------------------------------------

function MessageBubble({ message }: { message: AgentMessage }) {
  const [expanded, setExpanded] = useState(message.role === 'ASSISTANT')
  const [copied, setCopied] = useState(false)

  let parsedJson: unknown = null
  let isValidJson = false
  if (message.role === 'ASSISTANT') {
    try {
      parsedJson = JSON.parse(message.content)
      isValidJson = true
    } catch {
      /* raw text fallback */
    }
  }

  const handleCopy = () => {
    navigator.clipboard.writeText(message.content).catch(() => {})
    setCopied(true)
    setTimeout(() => setCopied(false), 2000)
  }

  const isRight = message.role === 'USER'

  return (
    <div className={`flex flex-col gap-1 ${isRight ? 'items-end' : 'items-start'}`}>
      <div className={`flex items-center gap-2 ${isRight ? 'flex-row-reverse' : ''}`}>
        <span className={`text-[10px] font-semibold px-1.5 py-0.5 rounded uppercase tracking-wide ${
          message.role === 'SYSTEM' ? 'bg-slate-200 text-slate-500' :
          message.role === 'USER' ? 'bg-indigo-100 text-indigo-600' :
          'bg-slate-100 text-slate-600'
        }`}>
          {message.role}
        </span>
        <span className="text-[10px] text-slate-400">#{message.sequence}</span>
      </div>

      {message.role === 'ASSISTANT' ? (
        <div className="w-full bg-white border border-slate-200 rounded-xl overflow-hidden">
          <div className="flex items-center justify-between px-3 py-2 border-b border-slate-100">
            <span className="text-[10px] text-slate-400">{isValidJson ? 'JSON response' : 'Text response'}</span>
            <button
              onClick={handleCopy}
              className="text-[10px] text-slate-500 hover:text-indigo-600 flex items-center gap-1 px-2 py-0.5 rounded hover:bg-slate-100 transition-colors"
            >
              {copied ? '✓ Copied' : 'Copy'}
            </button>
          </div>
          {isValidJson ? (
            <pre className="px-3 py-3 text-xs text-slate-700 overflow-x-auto leading-relaxed font-mono">
              {JSON.stringify(parsedJson, null, 2)}
            </pre>
          ) : (
            <div className="px-3 py-3 text-xs text-slate-700 leading-relaxed whitespace-pre-wrap break-words">
              {message.content}
            </div>
          )}
        </div>
      ) : (
        <div className={`max-w-[90%] rounded-xl overflow-hidden border ${
          message.role === 'SYSTEM' ? 'bg-slate-50 border-slate-200' : 'bg-indigo-50 border-indigo-100'
        }`}>
          <button
            onClick={() => setExpanded(!expanded)}
            className={`w-full text-left px-3 py-2 text-xs flex items-center justify-between gap-3 transition-colors ${
              message.role === 'SYSTEM' ? 'text-slate-500 hover:bg-slate-100' : 'text-indigo-700 hover:bg-indigo-100'
            }`}
          >
            <span className="font-medium">{expanded ? 'Hide content' : 'Show content'}</span>
            <span className={`text-xs transition-transform ${expanded ? 'rotate-180' : ''}`}>▾</span>
          </button>
          {expanded && (
            <div className={`px-3 pb-3 text-xs leading-relaxed whitespace-pre-wrap break-words max-h-64 overflow-y-auto ${
              message.role === 'SYSTEM' ? 'text-slate-600' : 'text-indigo-800'
            }`}>
              {message.content}
            </div>
          )}
        </div>
      )}
    </div>
  )
}

// ---------------------------------------------------------------------------
// Page
// ---------------------------------------------------------------------------

function formatDate(iso: string) {
  return new Date(iso).toLocaleString('en-GB', {
    year: 'numeric',
    month: '2-digit',
    day: '2-digit',
    hour: '2-digit',
    minute: '2-digit',
  })
}

export default function WorkflowExecutionsPage() {
  const [items, setItems] = useState<WorkflowExecutionSummary[]>([])
  const [nextCursor, setNextCursor] = useState<string | null>(null)
  const [isLoading, setIsLoading] = useState(true)
  const [isLoadingMore, setIsLoadingMore] = useState(false)
  const [error, setError] = useState<string | null>(null)
  const [isRefreshing, setIsRefreshing] = useState(false)

  // Filters
  const [statusFilter, setStatusFilter] = useState('')
  const [slugFilter, setSlugFilter] = useState('')
  const [fromDate, setFromDate] = useState('')
  const [toDate, setToDate] = useState('')

  // Conversation drawer
  const [conversationTarget, setConversationTarget] = useState<WorkflowExecutionSummary | null>(null)
  const [conversation, setConversation] = useState<AgentConversation | null>(null)
  const [isLoadingConversation, setIsLoadingConversation] = useState(false)
  const [conversationError, setConversationError] = useState<string | null>(null)
  const [isCheckpointRun, setIsCheckpointRun] = useState(false)

  const buildParams = useCallback((cursor?: string) => ({
    limit: PAGE_LIMIT,
    ...(statusFilter && { status: statusFilter }),
    ...(slugFilter && { workflowSlug: slugFilter }),
    ...(fromDate && { from: new Date(fromDate).toISOString() }),
    ...(toDate && { to: new Date(`${toDate}T23:59:59`).toISOString() }),
    ...(cursor && { cursor }),
  }), [statusFilter, slugFilter, fromDate, toDate])

  const fetchFirst = useCallback(async () => {
    setIsLoading(true)
    setError(null)
    setItems([])
    setNextCursor(null)
    try {
      const data = await listWorkflowExecutions(buildParams())
      setItems(data.items)
      setNextCursor(data.nextCursor)
    } catch (err) {
      setError(err instanceof Error ? err.message : 'Failed to load executions')
    } finally {
      setIsLoading(false)
    }
  }, [buildParams])

  useEffect(() => {
    fetchFirst()
  }, [fetchFirst])

  const handleLoadMore = async () => {
    if (!nextCursor) return
    setIsLoadingMore(true)
    try {
      const data = await listWorkflowExecutions(buildParams(nextCursor))
      setItems(prev => [...prev, ...data.items])
      setNextCursor(data.nextCursor)
    } catch {
      // keep existing items
    } finally {
      setIsLoadingMore(false)
    }
  }

  const handleRefresh = async () => {
    setIsRefreshing(true)
    await fetchFirst()
    setIsRefreshing(false)
  }

  const handleViewConversation = async (exec: WorkflowExecutionSummary) => {
    setConversationTarget(exec)
    setConversation(null)
    setIsLoadingConversation(true)
    setConversationError(null)
    setIsCheckpointRun(false)
    try {
      const conv = await getWorkflowExecutionConversation(exec.id)
      if (conv === null) {
        setIsCheckpointRun(true)
      } else {
        setConversation(conv)
      }
    } catch (err) {
      setConversationError(err instanceof Error ? err.message : 'Failed to load conversation')
    } finally {
      setIsLoadingConversation(false)
    }
  }

  const handleCloseConversation = () => {
    setConversationTarget(null)
    setConversation(null)
    setConversationError(null)
    setIsCheckpointRun(false)
  }

  return (
    <div className="flex-1 p-8">
      {/* Conversation drawer */}
      {conversationTarget && (
        <div className="fixed inset-0 z-50">
          <div className="absolute inset-0 bg-black/40" onClick={handleCloseConversation} />
          <div className="absolute inset-y-0 right-0 w-full max-w-2xl bg-white shadow-2xl flex flex-col z-10">
            <div className="flex items-start justify-between px-6 py-4 border-b border-slate-200 shrink-0">
              <div className="min-w-0">
                <div className="flex items-center gap-2 mb-1">
                  <h2 className="text-base font-semibold text-slate-800">Agent Conversation</h2>
                  <span className={`px-2 py-0.5 text-xs font-medium rounded-full ${
                    conversationTarget.status === 'COMPLETED' ? 'bg-emerald-50 text-emerald-700' :
                    conversationTarget.status === 'RUNNING' ? 'bg-amber-50 text-amber-700' :
                    'bg-red-50 text-red-700'
                  }`}>
                    {conversationTarget.status}
                  </span>
                </div>
                <p className="text-xs text-slate-400 font-mono truncate">
                  {conversationTarget.workflowSlug} · {conversationTarget.id}
                </p>
              </div>
              <button
                onClick={handleCloseConversation}
                className="ml-4 p-1.5 text-slate-400 hover:text-slate-600 hover:bg-slate-100 rounded-lg transition-colors text-lg leading-none shrink-0"
              >
                ✕
              </button>
            </div>

            <div className="flex-1 overflow-y-auto p-6">
              {isLoadingConversation && (
                <div className="py-16 text-center text-sm text-slate-400">Loading conversation…</div>
              )}
              {conversationError && (
                <div className="py-8 text-center text-sm text-red-500">{conversationError}</div>
              )}
              {isCheckpointRun && (
                <div className="py-16 text-center">
                  <p className="text-sm text-slate-500">No conversation log available for checkpoint-based runs.</p>
                </div>
              )}
              {conversation && (
                <div className="space-y-8">
                  {[...conversation.executions]
                    .sort((a, b) => a.sequence - b.sequence)
                    .map((exec) => (
                      <div key={exec.id}>
                        {exec.status === 'FAILED' && exec.error && (
                          <div className="mb-3 p-3 bg-red-50 border border-red-200 rounded-lg text-xs text-red-700">
                            {exec.error}
                          </div>
                        )}
                        <div className="flex flex-wrap items-center gap-2 mb-4 px-3 py-2 bg-slate-50 border border-slate-100 rounded-lg text-xs">
                          <span className="font-mono text-slate-600">{exec.model}</span>
                          <span className="text-slate-300">|</span>
                          <span className="text-slate-500 capitalize">{exec.provider}</span>
                          <span className="text-slate-300">|</span>
                          <span className="text-slate-500">{(exec.promptTokens + exec.completionTokens).toLocaleString()} tokens</span>
                          <span className="text-[10px] text-slate-400">({exec.promptTokens}↑ {exec.completionTokens}↓)</span>
                          <span className="text-slate-300">|</span>
                          <span className="text-slate-500">{(exec.latencyMs / 1000).toFixed(2)}s</span>
                          <span className={`ml-auto px-1.5 py-0.5 rounded text-[10px] font-medium ${
                            exec.status === 'COMPLETED' ? 'bg-emerald-50 text-emerald-700' :
                            exec.status === 'RUNNING' ? 'bg-amber-50 text-amber-700' :
                            'bg-red-50 text-red-700'
                          }`}>
                            {exec.status}
                          </span>
                        </div>
                        <div className="space-y-4">
                          {[...exec.messages]
                            .sort((a, b) => a.sequence - b.sequence)
                            .map((msg) => (
                              <MessageBubble key={msg.id} message={msg} />
                            ))}
                        </div>
                      </div>
                    ))}
                </div>
              )}
            </div>
          </div>
        </div>
      )}

      <h1 className="text-2xl font-bold text-slate-800 mb-6">Agent Runs</h1>

      {/* Filter bar */}
      <div className="bg-white rounded-xl border border-slate-200 p-4 mb-4">
        <div className="flex flex-wrap gap-3 items-end">
          {/* Status */}
          <div className="flex flex-col gap-1">
            <label className="text-xs font-medium text-slate-500">Status</label>
            <div className="relative">
              <select
                value={statusFilter}
                onChange={(e) => setStatusFilter(e.target.value)}
                className="appearance-none bg-white pl-3 pr-8 py-2 text-sm border border-slate-200 rounded-lg focus:outline-none focus:ring-2 focus:ring-indigo-500/20 focus:border-indigo-400 text-slate-600"
              >
                <option value="">All</option>
                {STATUS_OPTIONS.map(s => (
                  <option key={s} value={s}>{s}</option>
                ))}
              </select>
              <ChevronDownIcon className="absolute right-2.5 top-1/2 -translate-y-1/2 w-4 h-4 text-slate-400 pointer-events-none" />
            </div>
          </div>

          {/* Workflow */}
          <div className="flex flex-col gap-1">
            <label className="text-xs font-medium text-slate-500">Workflow</label>
            <div className="relative">
              <select
                value={slugFilter}
                onChange={(e) => setSlugFilter(e.target.value)}
                className="appearance-none bg-white pl-3 pr-8 py-2 text-sm border border-slate-200 rounded-lg focus:outline-none focus:ring-2 focus:ring-indigo-500/20 focus:border-indigo-400 text-slate-600"
              >
                <option value="">All</option>
                {WORKFLOW_SLUGS.map(s => (
                  <option key={s} value={s}>{s}</option>
                ))}
              </select>
              <ChevronDownIcon className="absolute right-2.5 top-1/2 -translate-y-1/2 w-4 h-4 text-slate-400 pointer-events-none" />
            </div>
          </div>

          {/* From date */}
          <div className="flex flex-col gap-1">
            <label className="text-xs font-medium text-slate-500">From</label>
            <input
              type="date"
              value={fromDate}
              onChange={(e) => setFromDate(e.target.value)}
              className="px-3 py-2 text-sm border border-slate-200 rounded-lg focus:outline-none focus:ring-2 focus:ring-indigo-500/20 focus:border-indigo-400 text-slate-600"
            />
          </div>

          {/* To date */}
          <div className="flex flex-col gap-1">
            <label className="text-xs font-medium text-slate-500">To</label>
            <input
              type="date"
              value={toDate}
              onChange={(e) => setToDate(e.target.value)}
              className="px-3 py-2 text-sm border border-slate-200 rounded-lg focus:outline-none focus:ring-2 focus:ring-indigo-500/20 focus:border-indigo-400 text-slate-600"
            />
          </div>

          <div className="flex items-end gap-2 ml-auto">
            <button
              onClick={() => {
                setStatusFilter('')
                setSlugFilter('')
                setFromDate('')
                setToDate('')
              }}
              className="px-3 py-2 text-sm text-slate-500 hover:text-slate-700 border border-slate-200 bg-white rounded-lg hover:bg-slate-50 transition-colors"
            >
              Clear
            </button>
            <button
              onClick={handleRefresh}
              disabled={isRefreshing || isLoading}
              title="Refresh"
              className="p-2 rounded-lg border border-slate-200 hover:bg-slate-50 text-slate-500 hover:text-slate-700 disabled:opacity-50 disabled:cursor-not-allowed transition-colors"
            >
              <RefreshIcon className={`w-4 h-4 ${isRefreshing ? 'animate-spin' : ''}`} />
            </button>
          </div>
        </div>
      </div>

      {/* Table */}
      <div className="bg-white rounded-xl border border-slate-200">
        <div className="overflow-x-auto">
          <table className="w-full text-sm">
            <thead>
              <tr className="border-b border-slate-100 bg-slate-50/50">
                <th className="text-left px-5 py-3 font-semibold text-slate-700">Workflow</th>
                <th className="text-left px-5 py-3 font-semibold text-slate-700">Status</th>
                <th className="text-left px-5 py-3 font-semibold text-slate-700">Score</th>
                <th className="text-left px-5 py-3 font-semibold text-slate-700">Latency</th>
                <th className="text-left px-5 py-3 font-semibold text-slate-700">Started</th>
                <th className="text-left px-5 py-3 font-semibold text-slate-700">Report ID</th>
                <th className="px-5 py-3" />
              </tr>
            </thead>
            <tbody>
              {isLoading ? (
                <tr>
                  <td colSpan={7} className="px-5 py-12 text-center text-sm text-slate-400">Loading…</td>
                </tr>
              ) : error ? (
                <tr>
                  <td colSpan={7} className="px-5 py-12 text-center text-sm text-red-500">{error}</td>
                </tr>
              ) : items.length === 0 ? (
                <tr>
                  <td colSpan={7} className="px-5 py-12 text-center text-sm text-slate-400">No agent runs found</td>
                </tr>
              ) : (
                items.map((exec) => {
                  const latencyMs = exec.completedAt && exec.startedAt
                    ? new Date(exec.completedAt).getTime() - new Date(exec.startedAt).getTime()
                    : null
                  return (
                    <tr key={exec.id} className="border-b border-slate-50 hover:bg-slate-50/50 transition-colors">
                      <td className="px-5 py-3.5">
                        <span className="px-2 py-0.5 text-xs font-bold bg-slate-800 text-white rounded uppercase tracking-wide">
                          {exec.workflowSlug}
                        </span>
                      </td>
                      <td className="px-5 py-3.5">
                        <span className={`inline-flex items-center gap-1.5 px-2 py-0.5 rounded-full text-xs font-medium ${
                          exec.status === 'COMPLETED' ? 'bg-emerald-50 text-emerald-700' :
                          exec.status === 'RUNNING' ? 'bg-amber-50 text-amber-700' :
                          'bg-red-50 text-red-700'
                        }`}>
                          {exec.status === 'RUNNING' && (
                            <span className="w-1.5 h-1.5 bg-amber-500 rounded-full animate-pulse" />
                          )}
                          {exec.status}
                        </span>
                      </td>
                      <td className="px-5 py-3.5">
                        {exec.overallScore !== null ? (
                          <span className={`font-semibold ${
                            exec.overallScore >= 70 ? 'text-red-600' :
                            exec.overallScore >= 40 ? 'text-amber-600' :
                            'text-emerald-600'
                          }`}>
                            {exec.overallScore}
                          </span>
                        ) : (
                          <span className="text-slate-400 text-xs">—</span>
                        )}
                      </td>
                      <td className="px-5 py-3.5 text-slate-500 text-xs">
                        {latencyMs !== null ? `${(latencyMs / 1000).toFixed(1)}s` : <span className="text-slate-400">—</span>}
                      </td>
                      <td className="px-5 py-3.5 text-slate-500 text-xs whitespace-nowrap">
                        {formatDate(exec.startedAt)}
                      </td>
                      <td className="px-5 py-3.5 text-slate-400 text-xs font-mono truncate max-w-[160px]">
                        {exec.reportId}
                      </td>
                      <td className="px-5 py-3.5">
                        <button
                          onClick={() => handleViewConversation(exec)}
                          disabled={exec.status === 'RUNNING'}
                          className="inline-flex items-center gap-1.5 px-3 py-1.5 text-xs font-medium text-indigo-600 bg-indigo-50 hover:bg-indigo-100 disabled:opacity-40 disabled:cursor-not-allowed rounded-lg transition-colors whitespace-nowrap"
                        >
                          View Conversation
                        </button>
                      </td>
                    </tr>
                  )
                })
              )}
            </tbody>
          </table>
        </div>

        {/* Load more */}
        {nextCursor && (
          <div className="flex justify-center px-5 py-4 border-t border-slate-100">
            <button
              onClick={handleLoadMore}
              disabled={isLoadingMore}
              className="px-4 py-2 text-sm font-medium text-indigo-600 bg-indigo-50 hover:bg-indigo-100 disabled:opacity-50 disabled:cursor-not-allowed rounded-lg transition-colors"
            >
              {isLoadingMore ? 'Loading…' : 'Load more'}
            </button>
          </div>
        )}
      </div>
    </div>
  )
}

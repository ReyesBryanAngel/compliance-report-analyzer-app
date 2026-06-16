'use client'

import { useState, useEffect, useCallback } from 'react'
import {
  getWorkflowConfigs,
  setWorkflowConfig,
  resetWorkflowConfig,
  listInstructions,
  getActiveInstruction,
  createInstruction,
  activateInstruction,
  deleteInstruction,
  getOrganizationId,
} from '@/lib/api'
import type { WorkflowConfigItem, InstructionItem, ActiveInstructionResponse } from '@/lib/types'
import {
  SparklesIcon,
  ListChecksIcon,
  PlusIcon,
  TrashIcon,
  CheckIcon,
  XIcon,
  EyeIcon,
  RefreshIcon,
} from '@/components/icons'

// ─── Workflow display metadata ────────────────────────────────────────────────

const WORKFLOW_SLUGS = ['kyc', 'sg', 'traml', 'document-integrity'] as const
type WorkflowSlug = (typeof WORKFLOW_SLUGS)[number]

const WORKFLOW_DISPLAY: Record<WorkflowSlug, { name: string; description: string; color: string }> = {
  kyc: {
    name: 'Affordability & Financial Health',
    description: 'Assess customer affordability and financial risk',
    color: 'indigo',
  },
  sg: {
    name: 'Gambling Exposure',
    description: 'Detect and quantify gambling-related activity',
    color: 'amber',
  },
  traml: {
    name: 'Transaction Risk & AML',
    description: 'Flag suspicious transactions and AML risk',
    color: 'rose',
  },
  'document-integrity': {
    name: 'Document Integrity',
    description: 'Verify document authenticity and detect tampering',
    color: 'teal',
  },
}

const COLOR_RING: Record<string, string> = {
  indigo: 'ring-indigo-500',
  amber: 'ring-amber-500',
  rose: 'ring-rose-500',
  teal: 'ring-teal-500',
}

// ─── Helpers ──────────────────────────────────────────────────────────────────

function formatDate(iso: string) {
  return new Date(iso).toLocaleString('en-GB', {
    year: 'numeric',
    month: '2-digit',
    day: '2-digit',
    hour: '2-digit',
    minute: '2-digit',
  })
}

// ─── Sub-components ──────────────────────────────────────────────────────────

function ScopeBadge({ scope }: { scope: 'org' | 'global' }) {
  return scope === 'org' ? (
    <span className="px-1.5 py-0.5 rounded text-xs font-medium bg-indigo-50 text-indigo-700">Org</span>
  ) : (
    <span className="px-1.5 py-0.5 rounded text-xs font-medium bg-slate-100 text-slate-500">Global</span>
  )
}

function ActiveBadge() {
  return (
    <span className="flex items-center gap-1 px-1.5 py-0.5 rounded text-xs font-medium bg-emerald-50 text-emerald-700">
      <CheckIcon className="w-3 h-3" />
      Active
    </span>
  )
}

// ─── Preview Active Modal ────────────────────────────────────────────────────

function PreviewModal({
  workflow,
  onClose,
}: {
  workflow: WorkflowSlug
  onClose: () => void
}) {
  const [data, setData] = useState<ActiveInstructionResponse | null>(null)
  const [loading, setLoading] = useState(true)
  const [error, setError] = useState<string | null>(null)

  useEffect(() => {
    getActiveInstruction(workflow)
      .then(setData)
      .catch((e: Error) => setError(e.message))
      .finally(() => setLoading(false))
  }, [workflow])

  const SOURCE_LABEL: Record<string, string> = {
    org: 'Org override',
    global: 'Global default',
    'built-in': 'Built-in fallback',
  }

  return (
    <div className="fixed inset-0 z-50 flex items-center justify-center bg-black/40 p-4" onClick={onClose}>
      <div
        className="bg-white rounded-2xl shadow-xl w-full max-w-2xl max-h-[80vh] flex flex-col"
        onClick={(e) => e.stopPropagation()}
      >
        <div className="flex items-center justify-between px-6 py-4 border-b border-slate-100">
          <div>
            <h3 className="text-sm font-semibold text-slate-800">Active Instruction</h3>
            <p className="text-xs text-slate-500 mt-0.5">{WORKFLOW_DISPLAY[workflow].name}</p>
          </div>
          <button onClick={onClose} className="text-slate-400 hover:text-slate-600 transition-colors">
            <XIcon className="w-4 h-4" />
          </button>
        </div>

        <div className="flex-1 overflow-y-auto px-6 py-4">
          {loading && <p className="text-sm text-slate-500">Loading…</p>}
          {error && <p className="text-sm text-red-600">{error}</p>}
          {data && (
            <>
              <div className="flex items-center gap-2 mb-4">
                <span className="text-xs font-medium text-slate-500">Source:</span>
                <span className="px-2 py-0.5 rounded-full text-xs font-medium bg-indigo-50 text-indigo-700">
                  {SOURCE_LABEL[data.source] ?? data.source}
                </span>
                {data.item && (
                  <span className="text-xs text-slate-400">
                    v{data.item.version}
                    {data.item.title ? ` · ${data.item.title}` : ''}
                  </span>
                )}
              </div>
              <pre className="text-xs text-slate-700 whitespace-pre-wrap leading-relaxed font-mono bg-slate-50 rounded-xl p-4 border border-slate-100">
                {data.content}
              </pre>
            </>
          )}
        </div>

        <div className="px-6 py-3 border-t border-slate-100 flex justify-end">
          <button
            onClick={onClose}
            className="px-4 py-2 text-sm text-slate-600 bg-slate-100 hover:bg-slate-200 rounded-lg transition-colors"
          >
            Close
          </button>
        </div>
      </div>
    </div>
  )
}

// ─── Create Draft Modal ──────────────────────────────────────────────────────

function CreateDraftModal({
  workflow,
  onClose,
  onCreated,
}: {
  workflow: WorkflowSlug
  onClose: () => void
  onCreated: () => void
}) {
  const [title, setTitle] = useState('')
  const [content, setContent] = useState('')
  const [saving, setSaving] = useState(false)
  const [error, setError] = useState<string | null>(null)

  async function handleSubmit(e: React.FormEvent) {
    e.preventDefault()
    if (!content.trim()) return
    setSaving(true)
    setError(null)
    try {
      await createInstruction(workflow, title.trim() || undefined, content.trim())
      onCreated()
    } catch (err: unknown) {
      setError(err instanceof Error ? err.message : 'Failed to create draft')
    } finally {
      setSaving(false)
    }
  }

  return (
    <div className="fixed inset-0 z-50 flex items-center justify-center bg-black/40 p-4" onClick={onClose}>
      <div
        className="bg-white rounded-2xl shadow-xl w-full max-w-2xl flex flex-col"
        onClick={(e) => e.stopPropagation()}
      >
        <div className="flex items-center justify-between px-6 py-4 border-b border-slate-100">
          <div>
            <h3 className="text-sm font-semibold text-slate-800">Create Draft Instruction</h3>
            <p className="text-xs text-slate-500 mt-0.5">{WORKFLOW_DISPLAY[workflow].name}</p>
          </div>
          <button onClick={onClose} className="text-slate-400 hover:text-slate-600 transition-colors">
            <XIcon className="w-4 h-4" />
          </button>
        </div>

        <form onSubmit={handleSubmit} className="flex flex-col gap-4 px-6 py-5">
          <div>
            <label className="block text-xs font-medium text-slate-600 mb-1.5">
              Title <span className="text-slate-400 font-normal">(optional)</span>
            </label>
            <input
              type="text"
              value={title}
              onChange={(e) => setTitle(e.target.value)}
              placeholder="e.g. Custom TRAML v3"
              className="w-full px-3 py-2 text-sm border border-slate-200 rounded-lg outline-none focus:ring-2 focus:ring-indigo-300 transition"
            />
          </div>

          <div>
            <label className="block text-xs font-medium text-slate-600 mb-1.5">
              Instruction Content <span className="text-red-500">*</span>
            </label>
            <textarea
              value={content}
              onChange={(e) => setContent(e.target.value)}
              required
              rows={10}
              placeholder="You are reviewing transactions for…"
              className="w-full px-3 py-2 text-sm border border-slate-200 rounded-lg outline-none focus:ring-2 focus:ring-indigo-300 transition font-mono resize-y"
            />
          </div>

          {error && <p className="text-xs text-red-600">{error}</p>}

          <div className="flex justify-end gap-2">
            <button
              type="button"
              onClick={onClose}
              className="px-4 py-2 text-sm text-slate-600 bg-slate-100 hover:bg-slate-200 rounded-lg transition-colors"
            >
              Cancel
            </button>
            <button
              type="submit"
              disabled={saving || !content.trim()}
              className="px-4 py-2 text-sm text-white bg-indigo-600 hover:bg-indigo-700 disabled:opacity-50 disabled:cursor-not-allowed rounded-lg transition-colors"
            >
              {saving ? 'Saving…' : 'Create Draft'}
            </button>
          </div>
        </form>
      </div>
    </div>
  )
}

// ─── Instruction Row ─────────────────────────────────────────────────────────

function InstructionRow({
  item,
  workflow,
  readonly,
  onActivate,
  onDelete,
}: {
  item: InstructionItem
  workflow: WorkflowSlug
  readonly: boolean
  onActivate: (id: string) => void
  onDelete: (id: string) => void
}) {
  const [activating, setActivating] = useState(false)
  const [deleting, setDeleting] = useState(false)
  const [error, setError] = useState<string | null>(null)

  async function handleActivate() {
    setActivating(true)
    setError(null)
    try {
      await activateInstruction(workflow, item.id)
      onActivate(item.id)
    } catch (err: unknown) {
      setError(err instanceof Error ? err.message : 'Failed to activate')
    } finally {
      setActivating(false)
    }
  }

  async function handleDelete() {
    setDeleting(true)
    setError(null)
    try {
      await deleteInstruction(workflow, item.id)
      onDelete(item.id)
    } catch (err: unknown) {
      const msg = err instanceof Error ? err.message : 'Failed to delete'
      setError(msg === 'ACTIVE' ? 'Cannot delete the active instruction. Activate another version first, or contact your admin.' : msg)
      setDeleting(false)
    }
  }

  const canActivate = !readonly && item.scope === 'org' && !item.isActive
  const canDelete = !readonly && item.scope === 'org'

  return (
    <div className="px-5 py-4 flex items-start gap-4 hover:bg-slate-50/60 transition-colors">
      {/* Version + badges */}
      <div className="flex-shrink-0 flex flex-col items-center gap-1.5 pt-0.5">
        <span className="w-7 h-7 rounded-full bg-slate-100 text-slate-600 text-xs font-bold flex items-center justify-center">
          v{item.version}
        </span>
      </div>

      {/* Content */}
      <div className="flex-1 min-w-0">
        <div className="flex flex-wrap items-center gap-2 mb-1">
          <span className="text-sm font-medium text-slate-800 truncate">
            {item.title ?? <span className="text-slate-400 italic">Untitled</span>}
          </span>
          <ScopeBadge scope={item.scope} />
          {item.isActive && <ActiveBadge />}
        </div>
        <p className="text-xs text-slate-400 truncate">
          {item.createdBy?.name ?? item.createdBy?.email ?? 'System'} · {formatDate(item.createdAt)}
        </p>
        {error && <p className="text-xs text-red-600 mt-1">{error}</p>}
      </div>

      {/* Actions */}
      <div className="flex-shrink-0 flex items-center gap-1.5">
        {canActivate && (
          <button
            onClick={handleActivate}
            disabled={activating}
            title="Activate this version"
            className="flex items-center gap-1 px-2.5 py-1.5 text-xs font-medium text-emerald-700 bg-emerald-50 hover:bg-emerald-100 disabled:opacity-50 rounded-lg transition-colors"
          >
            <CheckIcon className="w-3.5 h-3.5" />
            {activating ? 'Activating…' : 'Activate'}
          </button>
        )}
        {canDelete && (
          <button
            onClick={handleDelete}
            disabled={deleting}
            title="Delete this draft"
            className="flex items-center gap-1 px-2.5 py-1.5 text-xs font-medium text-red-600 bg-red-50 hover:bg-red-100 disabled:opacity-50 rounded-lg transition-colors"
          >
            <TrashIcon className="w-3.5 h-3.5" />
            {deleting ? 'Deleting…' : 'Delete'}
          </button>
        )}
      </div>
    </div>
  )
}

// ─── Instructions Panel ───────────────────────────────────────────────────────

function InstructionsPanel({
  workflow,
  readonly,
}: {
  workflow: WorkflowSlug
  readonly: boolean
}) {
  const [instructions, setInstructions] = useState<InstructionItem[]>([])
  const [loading, setLoading] = useState(true)
  const [error, setError] = useState<string | null>(null)
  const [showCreate, setShowCreate] = useState(false)
  const [showPreview, setShowPreview] = useState(false)
  const [refreshing, setRefreshing] = useState(false)

  const load = useCallback(async () => {
    setError(null)
    try {
      const items = await listInstructions(workflow)
      setInstructions(items)
    } catch (err: unknown) {
      setError(err instanceof Error ? err.message : 'Failed to load instructions')
    }
  }, [workflow])

  useEffect(() => {
    setLoading(true)
    load().finally(() => setLoading(false))
  }, [load])

  async function handleRefresh() {
    setRefreshing(true)
    await load()
    setRefreshing(false)
  }

  function handleActivated(id: string) {
    setInstructions((prev) =>
      prev.map((item) => ({ ...item, isActive: item.id === id }))
    )
  }

  function handleDeleted(id: string) {
    setInstructions((prev) => prev.filter((item) => item.id !== id))
  }

  async function handleCreated() {
    setShowCreate(false)
    await load()
  }

  return (
    <>
      <div className="flex items-center justify-between mb-3">
        <div className="flex items-center gap-2">
          <button
            onClick={() => setShowPreview(true)}
            className="flex items-center gap-1.5 px-3 py-1.5 text-xs font-medium text-slate-600 bg-white border border-slate-200 hover:bg-slate-50 rounded-lg transition-colors"
          >
            <EyeIcon className="w-3.5 h-3.5" />
            Preview Active
          </button>
          <button
            onClick={handleRefresh}
            disabled={refreshing}
            className="p-1.5 text-slate-400 hover:text-slate-600 hover:bg-slate-100 rounded-lg transition-colors"
            title="Refresh"
          >
            <RefreshIcon className={`w-3.5 h-3.5 ${refreshing ? 'animate-spin' : ''}`} />
          </button>
        </div>
        {!readonly && (
          <button
            onClick={() => setShowCreate(true)}
            className="flex items-center gap-1.5 px-3 py-1.5 text-xs font-medium text-white bg-indigo-600 hover:bg-indigo-700 rounded-lg transition-colors"
          >
            <PlusIcon className="w-3.5 h-3.5" />
            Create Draft
          </button>
        )}
      </div>

      <div className="border border-slate-200 rounded-xl overflow-hidden">
        {loading && (
          <div className="px-5 py-8 text-center text-sm text-slate-400">Loading instructions…</div>
        )}
        {!loading && error && (
          <div className="px-5 py-6 text-center text-sm text-red-600">{error}</div>
        )}
        {!loading && !error && instructions.length === 0 && (
          <div className="px-5 py-8 text-center text-sm text-slate-400">
            No instructions yet.{!readonly && ' Create a draft to get started.'}
          </div>
        )}
        {!loading && !error && instructions.length > 0 && (
          <div className="divide-y divide-slate-100">
            {instructions.map((item) => (
              <InstructionRow
                key={item.id}
                item={item}
                workflow={workflow}
                readonly={readonly}
                onActivate={handleActivated}
                onDelete={handleDeleted}
              />
            ))}
          </div>
        )}
      </div>

      {showCreate && (
        <CreateDraftModal
          workflow={workflow}
          onClose={() => setShowCreate(false)}
          onCreated={handleCreated}
        />
      )}
      {showPreview && (
        <PreviewModal workflow={workflow} onClose={() => setShowPreview(false)} />
      )}
    </>
  )
}

// ─── Workflow Config Card ────────────────────────────────────────────────────

function WorkflowConfigCard({
  config,
  readonly,
  onChange,
}: {
  config: WorkflowConfigItem
  readonly: boolean
  onChange: (updated: WorkflowConfigItem) => void
}) {
  const slug = config.workflow as WorkflowSlug
  const display = WORKFLOW_DISPLAY[slug]
  const [saving, setSaving] = useState(false)
  const [error, setError] = useState<string | null>(null)

  if (!display) return null

  async function handleModeChange(mode: 'checkpoints' | 'agent_skill') {
    if (mode === config.mode) return
    setSaving(true)
    setError(null)
    try {
      let updated: WorkflowConfigItem
      const isResettingToDefault = mode === 'agent_skill' && !config.isDefault
      if (isResettingToDefault) {
        updated = await resetWorkflowConfig(slug)
      } else {
        updated = await setWorkflowConfig(slug, mode)
      }
      onChange(updated)
    } catch (err: unknown) {
      setError(err instanceof Error ? err.message : 'Failed to update')
    } finally {
      setSaving(false)
    }
  }

  const ring = COLOR_RING[display.color] ?? 'ring-slate-300'

  return (
    <div className={`bg-white border border-slate-200 rounded-2xl p-5 flex flex-col gap-4 ring-0 focus-within:ring-2 ${ring}`}>
      <div className="flex items-start justify-between gap-3">
        <div className="min-w-0">
          <p className="text-sm font-semibold text-slate-800 leading-snug">{display.name}</p>
          <p className="text-xs text-slate-400 mt-0.5 leading-relaxed">{display.description}</p>
        </div>
        <div className="flex items-center gap-1.5 flex-shrink-0">
          {config.isDefault && (
            <span className="px-1.5 py-0.5 text-xs font-medium rounded bg-slate-100 text-slate-500">Default</span>
          )}
          {!config.isDefault && config.updatedAt && (
            <span className="text-xs text-slate-400">{formatDate(config.updatedAt)}</span>
          )}
        </div>
      </div>

      {/* Mode toggle */}
      <div className="flex gap-2">
        <button
          onClick={() => handleModeChange('checkpoints')}
          disabled={saving || readonly}
          className={`flex-1 flex items-center justify-center gap-2 px-3 py-2.5 rounded-xl text-xs font-medium border transition-all ${
            config.mode === 'checkpoints'
              ? 'bg-slate-800 text-white border-slate-800'
              : 'bg-white text-slate-600 border-slate-200 hover:border-slate-300 hover:bg-slate-50'
          } disabled:opacity-50 disabled:cursor-not-allowed`}
        >
          <ListChecksIcon className="w-3.5 h-3.5 flex-shrink-0" />
          Checkpoints
        </button>
        <button
          onClick={() => handleModeChange('agent_skill')}
          disabled={saving || readonly}
          className={`flex-1 flex items-center justify-center gap-2 px-3 py-2.5 rounded-xl text-xs font-medium border transition-all ${
            config.mode === 'agent_skill'
              ? 'bg-indigo-600 text-white border-indigo-600'
              : 'bg-white text-slate-600 border-slate-200 hover:border-slate-300 hover:bg-slate-50'
          } disabled:opacity-50 disabled:cursor-not-allowed`}
        >
          <SparklesIcon className="w-3.5 h-3.5 flex-shrink-0" />
          Agent Skill
        </button>
      </div>

      {saving && <p className="text-xs text-slate-400">Saving…</p>}
      {error && <p className="text-xs text-red-600">{error}</p>}
    </div>
  )
}

// ─── Page ────────────────────────────────────────────────────────────────────

export default function SettingsPage() {
  const [configs, setConfigs] = useState<WorkflowConfigItem[]>([])
  const [configsLoading, setConfigsLoading] = useState(true)
  const [configsError, setConfigsError] = useState<string | null>(null)
  const [activeInstructionTab, setActiveInstructionTab] = useState<WorkflowSlug>('kyc')
  const [orgId, setOrgId] = useState<string | null>(null)
  const [orgIdReady, setOrgIdReady] = useState(false)

  useEffect(() => {
    setOrgId(getOrganizationId())
    setOrgIdReady(true)
  }, [])

  useEffect(() => {
    setConfigsLoading(true)
    getWorkflowConfigs()
      .then(setConfigs)
      .catch((e: Error) => setConfigsError(e.message))
      .finally(() => setConfigsLoading(false))
  }, [])

  function handleConfigChange(updated: WorkflowConfigItem) {
    setConfigs((prev) => prev.map((c) => (c.workflow === updated.workflow ? updated : c)))
  }

  const readonly = orgIdReady && !orgId

  return (
    <div className="flex-1 min-h-screen bg-slate-50">
      <div className="max-w-5xl mx-auto px-6 py-8">
        {/* Header */}
        <div className="mb-8">
          <h1 className="text-xl font-bold text-slate-800">Agent Skills Settings</h1>
          <p className="text-sm text-slate-500 mt-1">
            Configure how each compliance workflow executes and manage the SME instructions used by the AI engine.
          </p>
          {readonly && (
            <div className="mt-3 flex items-center gap-2 px-4 py-2.5 bg-amber-50 border border-amber-200 rounded-xl text-xs text-amber-700">
              <span className="font-medium">Read-only:</span> Your account is not linked to an organization. Contact an admin to make changes.
            </div>
          )}
        </div>

        {/* ── Section 1: Execution Mode ── */}
        <section className="mb-10">
          <div className="flex items-center gap-2 mb-4">
            <h2 className="text-sm font-semibold text-slate-700">Execution Mode</h2>
            <span className="text-xs text-slate-400">— choose how each workflow analyses documents</span>
          </div>

          {configsLoading && (
            <div className="grid grid-cols-1 sm:grid-cols-2 gap-4">
              {WORKFLOW_SLUGS.map((slug) => (
                <div key={slug} className="h-36 bg-white border border-slate-200 rounded-2xl animate-pulse" />
              ))}
            </div>
          )}

          {!configsLoading && configsError && (
            <p className="text-sm text-red-600">{configsError}</p>
          )}

          {!configsLoading && !configsError && (
            <div className="grid grid-cols-1 sm:grid-cols-2 gap-4">
              {WORKFLOW_SLUGS.map((slug) => {
                const config = configs.find((c) => c.workflow === slug)
                if (!config) return null
                return (
                  <WorkflowConfigCard
                    key={slug}
                    config={config}
                    readonly={readonly}
                    onChange={handleConfigChange}
                  />
                )
              })}
            </div>
          )}
        </section>

        {/* ── Section 2: SME Instructions ── */}
        <section>
          <div className="flex items-center gap-2 mb-4">
            <h2 className="text-sm font-semibold text-slate-700">SME Instructions</h2>
            <span className="text-xs text-slate-400">— prompt versions used by the Agent Skill engine</span>
          </div>

          {/* Workflow tabs */}
          <div className="flex gap-1 mb-4 bg-slate-100 p-1 rounded-xl w-fit">
            {WORKFLOW_SLUGS.map((slug) => (
              <button
                key={slug}
                onClick={() => setActiveInstructionTab(slug)}
                className={`px-3.5 py-1.5 text-xs font-medium rounded-lg transition-colors whitespace-nowrap ${
                  activeInstructionTab === slug
                    ? 'bg-white text-slate-800 shadow-sm'
                    : 'text-slate-500 hover:text-slate-700'
                }`}
              >
                {WORKFLOW_DISPLAY[slug].name.split(' ')[0]}
                {slug === 'document-integrity' ? ' Integrity' : ''}
              </button>
            ))}
          </div>

          <div className="bg-white border border-slate-200 rounded-2xl p-5">
            <div className="flex items-center gap-2 mb-4">
              <SparklesIcon className="w-4 h-4 text-indigo-500" />
              <p className="text-sm font-medium text-slate-800">
                {WORKFLOW_DISPLAY[activeInstructionTab].name}
              </p>
            </div>
            <InstructionsPanel workflow={activeInstructionTab} readonly={readonly} />
          </div>
        </section>
      </div>
    </div>
  )
}

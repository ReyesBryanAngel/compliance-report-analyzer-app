'use client'

import { useState, useRef, useCallback, useEffect } from 'react'
import { WORKFLOWS, INITIAL_REPORTS } from '@/lib/data'
import { uploadDocument, listDocuments } from '@/lib/api'
import type { WorkflowId, ApiDocument, DocumentStatus } from '@/lib/types'
import {
  ShieldIcon,
  DiceIcon,
  AlertTriangleIcon,
  UploadCloudIcon,
  SearchIcon,
  ChevronDownIcon,
  FileTextIcon,
  UploadIcon,
} from '@/components/icons'

const UPLOAD_MAX = 10

const workflowIconMap = {
  shield: ShieldIcon,
  dice: DiceIcon,
  alert: AlertTriangleIcon,
} as const

const workflowColorMap = {
  purple: { iconBg: 'bg-indigo-50', iconText: 'text-indigo-500', border: 'border-indigo-500' },
  amber: { iconBg: 'bg-amber-50', iconText: 'text-amber-500', border: 'border-amber-500' },
  red: { iconBg: 'bg-rose-50', iconText: 'text-rose-500', border: 'border-rose-500' },
} as const

const STATUS_LABEL: Record<DocumentStatus, string> = {
  PENDING: 'Pending',
  PROCESSING: 'Processing',
  PROCESSED: 'Processed',
  COMPLETED: 'Completed',
  FAILED: 'Failed',
}

const STATUS_BADGE: Record<DocumentStatus, string> = {
  PENDING: 'bg-slate-100 text-slate-600',
  PROCESSING: 'bg-blue-50 text-blue-700',
  PROCESSED: 'bg-cyan-50 text-cyan-700',
  COMPLETED: 'bg-emerald-50 text-emerald-700',
  FAILED: 'bg-red-50 text-red-700',
}

const reportStatusBadge: Record<string, string> = {
  Ready: 'bg-emerald-50 text-emerald-700',
  Generating: 'bg-amber-50 text-amber-700',
}

const FILE_STATUS_OPTIONS = ['All Status', 'PENDING', 'PROCESSING', 'PROCESSED', 'COMPLETED', 'FAILED']
const REPORT_STATUS_OPTIONS = ['All Status', 'Ready', 'Generating']

type Tab = 'file-processing' | 'reports'

function formatDate(iso: string) {
  return new Date(iso).toLocaleString('en-GB', {
    year: 'numeric',
    month: '2-digit',
    day: '2-digit',
    hour: '2-digit',
    minute: '2-digit',
  })
}

export default function WorkflowsPage() {
  const [selectedWorkflow, setSelectedWorkflow] = useState<WorkflowId>('affordability')
  const [activeTab, setActiveTab] = useState<Tab>('file-processing')
  const [documents, setDocuments] = useState<ApiDocument[]>([])
  const [isLoading, setIsLoading] = useState(true)
  const [isUploading, setIsUploading] = useState(false)
  const [uploadError, setUploadError] = useState<string | null>(null)
  const [uploadProgress, setUploadProgress] = useState<{ done: number; total: number } | null>(null)
  const [searchQuery, setSearchQuery] = useState('')
  const [statusFilter, setStatusFilter] = useState('All Status')
  const [isDragging, setIsDragging] = useState(false)
  const [pendingFiles, setPendingFiles] = useState<File[] | null>(null)
  const [batchName, setBatchName] = useState('')
  const [batchDescription, setBatchDescription] = useState('')
  const fileInputRef = useRef<HTMLInputElement>(null)

  const fetchDocuments = useCallback(async () => {
    try {
      const docs = await listDocuments()
      setDocuments(docs)
    } catch {
      // keep existing documents on refresh error
    }
  }, [])

  useEffect(() => {
    setIsLoading(true)
    fetchDocuments().finally(() => setIsLoading(false))
  }, [fetchDocuments])

  const handleFiles = useCallback(
    async (incoming: File[], batchName: string, batchDescription: string) => {
      if (incoming.length === 0) return
      const files = incoming.slice(0, UPLOAD_MAX)

      setIsUploading(true)
      setUploadError(null)
      setUploadProgress({ done: 0, total: files.length })

      for (let i = 0; i < files.length; i++) {
        try {
          const result = await uploadDocument(files[i], batchName, batchDescription)
          setDocuments((prev) => {
            const newIds = new Set(result.documents.map((d) => d.id))
            return [...result.documents, ...prev.filter((d) => !newIds.has(d.id))]
          })
        } catch (err) {
          setUploadError(`Failed to upload "${files[i].name}": ${err instanceof Error ? err.message : 'Unknown error'}`)
        }
        setUploadProgress({ done: i + 1, total: files.length })
      }

      setIsUploading(false)
      setUploadProgress(null)
      await fetchDocuments()
    },
    [fetchDocuments],
  )

  const openModal = useCallback((files: File[]) => {
    if (files.length === 0) return
    const date = new Date()
    const defaultBatchName = `Batch-${date.toISOString().slice(0, 10).replace(/-/g, '')}-${String(date.getHours()).padStart(2, '0')}${String(date.getMinutes()).padStart(2, '0')}`
    setPendingFiles(files.slice(0, UPLOAD_MAX))
    setBatchName(defaultBatchName)
    setBatchDescription('')
  }, [])

  const handleModalCancel = useCallback(() => {
    setPendingFiles(null)
    setBatchName('')
    setBatchDescription('')
  }, [])

  const handleUploadConfirm = useCallback(async () => {
    if (!pendingFiles) return
    const files = pendingFiles
    setPendingFiles(null)
    await handleFiles(files, batchName, batchDescription)
  }, [pendingFiles, batchName, batchDescription, handleFiles])

  const handleDragOver = useCallback((e: React.DragEvent) => {
    e.preventDefault()
    setIsDragging(true)
  }, [])

  const handleDragLeave = useCallback((e: React.DragEvent) => {
    e.preventDefault()
    setIsDragging(false)
  }, [])

  const handleDrop = useCallback(
    (e: React.DragEvent) => {
      e.preventDefault()
      setIsDragging(false)
      openModal(Array.from(e.dataTransfer.files))
    },
    [openModal],
  )

  const handleFileInput = (e: React.ChangeEvent<HTMLInputElement>) => {
    if (e.target.files?.length) {
      openModal(Array.from(e.target.files))
      e.target.value = ''
    }
  }

  const handleTabChange = (tab: Tab) => {
    setActiveTab(tab)
    setSearchQuery('')
    setStatusFilter('All Status')
  }

  const statuses = activeTab === 'file-processing' ? FILE_STATUS_OPTIONS : REPORT_STATUS_OPTIONS

  const filteredDocuments = documents.filter((d) => {
    const q = searchQuery.toLowerCase()
    const matchSearch =
      d.originalName.toLowerCase().includes(q) || (d.batch?.name ?? '').toLowerCase().includes(q)
    const matchStatus = statusFilter === 'All Status' || d.status === statusFilter
    return matchSearch && matchStatus
  })

  const filteredReports = INITIAL_REPORTS.filter((r) => {
    if (r.workflowId !== selectedWorkflow) return false
    const matchSearch = r.name.toLowerCase().includes(searchQuery.toLowerCase())
    const matchStatus = statusFilter === 'All Status' || r.status === statusFilter
    return matchSearch && matchStatus
  })

  return (
    <div className="flex-1 p-8">
      {/* Upload modal */}
      {pendingFiles && (
        <div className="fixed inset-0 z-50 flex items-center justify-center bg-black/40">
          <div className="bg-white rounded-xl shadow-xl p-6 w-full max-w-md mx-4">
            <h2 className="text-lg font-semibold text-slate-800 mb-1">Upload Files</h2>
            <p className="text-sm text-slate-500 mb-5">
              {pendingFiles.length} file{pendingFiles.length > 1 ? 's' : ''} selected
            </p>

            <div className="mb-4">
              <label className="block text-sm font-medium text-slate-700 mb-1.5">
                Batch Name <span className="text-red-500">*</span>
              </label>
              <input
                type="text"
                value={batchName}
                onChange={(e) => setBatchName(e.target.value)}
                placeholder="Enter batch name"
                className="w-full px-3 py-2 text-sm border border-slate-200 rounded-lg focus:outline-none focus:ring-2 focus:ring-indigo-500/20 focus:border-indigo-400"
              />
            </div>

            <div className="mb-6">
              <label className="block text-sm font-medium text-slate-700 mb-1.5">
                Batch Description
              </label>
              <textarea
                value={batchDescription}
                onChange={(e) => setBatchDescription(e.target.value)}
                placeholder="Enter batch description (optional)"
                rows={3}
                className="w-full px-3 py-2 text-sm border border-slate-200 rounded-lg focus:outline-none focus:ring-2 focus:ring-indigo-500/20 focus:border-indigo-400 resize-none"
              />
            </div>

            <div className="flex justify-end gap-3">
              <button
                onClick={handleModalCancel}
                className="px-4 py-2 text-sm font-medium text-slate-600 bg-slate-100 hover:bg-slate-200 rounded-lg transition-colors"
              >
                Cancel
              </button>
              <button
                onClick={handleUploadConfirm}
                disabled={!batchName.trim()}
                className="px-4 py-2 text-sm font-medium text-white bg-indigo-600 hover:bg-indigo-700 disabled:opacity-50 disabled:cursor-not-allowed rounded-lg transition-colors"
              >
                Upload
              </button>
            </div>
          </div>
        </div>
      )}
      <h1 className="text-2xl font-bold text-slate-800 mb-6">Workflows</h1>

      {/* Workflow selection cards */}
      <div className="grid grid-cols-3 gap-4 mb-5">
        {WORKFLOWS.map((workflow) => {
          const Icon = workflowIconMap[workflow.iconType]
          const colors = workflowColorMap[workflow.colorScheme]
          const isSelected = selectedWorkflow === workflow.id

          return (
            <button
              key={workflow.id}
              onClick={() => setSelectedWorkflow(workflow.id)}
              className={`text-left bg-white rounded-xl border-2 p-5 transition-colors ${
                isSelected ? colors.border : 'border-slate-200 hover:border-slate-300'
              }`}
            >
              <div className={`w-9 h-9 rounded-lg flex items-center justify-center mb-3 ${colors.iconBg}`}>
                <Icon className={`w-5 h-5 ${colors.iconText}`} />
              </div>
              <p className="text-sm font-semibold text-slate-800">{workflow.name}</p>
              <p className="text-xs text-slate-500 mt-1">{workflow.description}</p>
            </button>
          )
        })}
      </div>

      {/* File upload zone */}
      <div className="bg-white rounded-xl border border-slate-200 p-5 mb-4">
        <p className="text-xs text-slate-500 mb-3">
          Drag and drop files or click to browse (max {UPLOAD_MAX} files)
        </p>
        <div
          onDragOver={handleDragOver}
          onDragLeave={handleDragLeave}
          onDrop={handleDrop}
          onClick={() => !isUploading && fileInputRef.current?.click()}
          className={`border-2 border-dashed rounded-xl py-12 flex flex-col items-center justify-center transition-colors ${
            isUploading
              ? 'border-slate-200 bg-slate-50 cursor-not-allowed'
              : isDragging
                ? 'border-indigo-400 bg-indigo-50 cursor-pointer'
                : 'border-slate-200 hover:border-slate-300 hover:bg-slate-50/60 cursor-pointer'
          }`}
        >
          <UploadCloudIcon
            className={`w-10 h-10 mb-3 ${isDragging ? 'text-indigo-400' : 'text-slate-300'}`}
          />
          {isUploading && uploadProgress ? (
            <>
              <p className="text-sm text-slate-600 font-medium">
                Uploading {uploadProgress.done}/{uploadProgress.total}…
              </p>
              <div className="mt-3 w-48 h-1.5 bg-slate-200 rounded-full overflow-hidden">
                <div
                  className="h-full bg-indigo-500 rounded-full transition-all"
                  style={{ width: `${(uploadProgress.done / uploadProgress.total) * 100}%` }}
                />
              </div>
            </>
          ) : (
            <>
              <p className="text-sm text-slate-500">
                Drop files here or <span className="text-indigo-600 font-medium">browse</span>
              </p>
              <p className="text-xs text-slate-400 mt-1">CSV, PDF supported</p>
            </>
          )}
        </div>
        <input
          ref={fileInputRef}
          type="file"
          accept=".csv,.pdf"
          multiple
          onChange={handleFileInput}
          className="hidden"
        />
        {uploadError && (
          <p className="mt-2 text-xs text-red-600">{uploadError}</p>
        )}
      </div>

      {/* Tabs + Table */}
      <div className="bg-white rounded-xl border border-slate-200">
        {/* Tab buttons */}
        <div className="flex border-b border-slate-200 px-5">
          <button
            onClick={() => handleTabChange('file-processing')}
            className={`flex items-center gap-2 py-4 px-1 mr-6 text-sm font-medium border-b-2 -mb-px transition-colors ${
              activeTab === 'file-processing'
                ? 'border-indigo-600 text-indigo-600'
                : 'border-transparent text-slate-500 hover:text-slate-700'
            }`}
          >
            <UploadIcon className="w-4 h-4" />
            File Processing
          </button>
          <button
            onClick={() => handleTabChange('reports')}
            className={`flex items-center gap-2 py-4 px-1 text-sm font-medium border-b-2 -mb-px transition-colors ${
              activeTab === 'reports'
                ? 'border-indigo-600 text-indigo-600'
                : 'border-transparent text-slate-500 hover:text-slate-700'
            }`}
          >
            <FileTextIcon className="w-4 h-4" />
            Reports
          </button>
        </div>

        {/* Search + Status filter */}
        <div className="flex gap-3 p-4 border-b border-slate-100">
          <div className="relative flex-1">
            <SearchIcon className="absolute left-3 top-1/2 -translate-y-1/2 w-4 h-4 text-slate-400" />
            <input
              type="text"
              placeholder="Search..."
              value={searchQuery}
              onChange={(e) => setSearchQuery(e.target.value)}
              className="w-full pl-9 pr-3 py-2 text-sm border border-slate-200 rounded-lg focus:outline-none focus:ring-2 focus:ring-indigo-500/20 focus:border-indigo-400"
            />
          </div>
          <div className="relative">
            <select
              value={statusFilter}
              onChange={(e) => setStatusFilter(e.target.value)}
              className="appearance-none bg-white pl-3 pr-8 py-2 text-sm border border-slate-200 rounded-lg focus:outline-none focus:ring-2 focus:ring-indigo-500/20 focus:border-indigo-400 text-slate-600"
            >
              {statuses.map((s) => (
                <option key={s} value={s}>
                  {s === 'All Status' ? s : (STATUS_LABEL[s as DocumentStatus] ?? s)}
                </option>
              ))}
            </select>
            <ChevronDownIcon className="absolute right-2.5 top-1/2 -translate-y-1/2 w-4 h-4 text-slate-400 pointer-events-none" />
          </div>
        </div>

        {/* File Processing table */}
        {activeTab === 'file-processing' && (
          <div className="overflow-x-auto">
            <table className="w-full text-sm">
              <thead>
                <tr className="border-b border-slate-100 bg-slate-50/50">
                  <th className="text-left px-5 py-3 font-semibold text-slate-700">Batch Name</th>
                  <th className="text-left px-5 py-3 font-semibold text-slate-700">File Name</th>
                  <th className="text-left px-5 py-3 font-semibold text-slate-700">Status</th>
                  <th className="text-left px-5 py-3 font-semibold text-slate-700">Uploaded At</th>
                </tr>
              </thead>
              <tbody>
                {isLoading ? (
                  <tr>
                    <td colSpan={4} className="px-5 py-12 text-center text-sm text-slate-400">
                      Loading…
                    </td>
                  </tr>
                ) : filteredDocuments.length === 0 ? (
                  <tr>
                    <td colSpan={4} className="px-5 py-12 text-center text-sm text-slate-400">
                      No files uploaded yet
                    </td>
                  </tr>
                ) : (
                  filteredDocuments.map((doc) => (
                    <tr key={doc.id} className="border-b border-slate-50 hover:bg-slate-50/50 transition-colors">
                      <td className="px-5 py-3.5 text-slate-600">{doc.batch?.name ?? '-'}</td>
                      <td className="px-5 py-3.5 text-slate-600">{doc.originalName}</td>
                      <td className="px-5 py-3.5">
                        <span
                          className={`inline-flex items-center px-2.5 py-0.5 rounded-full text-xs font-medium ${STATUS_BADGE[doc.status] ?? 'bg-slate-100 text-slate-600'}`}
                        >
                          {STATUS_LABEL[doc.status] ?? doc.status}
                        </span>
                      </td>
                      <td className="px-5 py-3.5 text-slate-500">{formatDate(doc.createdAt)}</td>
                    </tr>
                  ))
                )}
              </tbody>
            </table>
          </div>
        )}

        {/* Reports table */}
        {activeTab === 'reports' && (
          <div className="overflow-x-auto">
            <table className="w-full text-sm">
              <thead>
                <tr className="border-b border-slate-100 bg-slate-50/50">
                  <th className="text-left px-5 py-3 font-semibold text-slate-700">Report Name</th>
                  <th className="text-left px-5 py-3 font-semibold text-slate-700">Generated At</th>
                  <th className="text-left px-5 py-3 font-semibold text-slate-700">Status</th>
                </tr>
              </thead>
              <tbody>
                {filteredReports.length === 0 ? (
                  <tr>
                    <td colSpan={3} className="px-5 py-12 text-center text-sm text-slate-400">
                      No reports generated yet
                    </td>
                  </tr>
                ) : (
                  filteredReports.map((report) => (
                    <tr key={report.id} className="border-b border-slate-50 hover:bg-slate-50/50 transition-colors">
                      <td className="px-5 py-3.5 text-slate-600">{report.name}</td>
                      <td className="px-5 py-3.5 text-slate-500">{report.generatedAt}</td>
                      <td className="px-5 py-3.5">
                        <span
                          className={`inline-flex items-center px-2.5 py-0.5 rounded-full text-xs font-medium ${reportStatusBadge[report.status] ?? 'bg-slate-100 text-slate-600'}`}
                        >
                          {report.status}
                        </span>
                      </td>
                    </tr>
                  ))
                )}
              </tbody>
            </table>
          </div>
        )}
      </div>
    </div>
  )
}

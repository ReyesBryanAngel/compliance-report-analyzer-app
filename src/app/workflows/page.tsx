'use client'

import { useState, useRef, useCallback, useEffect } from 'react'
import { WORKFLOWS } from '@/lib/data'
import { uploadDocument, listDocuments, listReports, getReport, generateReport } from '@/lib/api'
import type { WorkflowId, ApiDocument, ApiReport, ApiReportDetail, ReportFinding, DocumentStatus, ReportStatus } from '@/lib/types'
import {
  ShieldIcon,
  DiceIcon,
  AlertTriangleIcon,
  ScanDocumentIcon,
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
  scan: ScanDocumentIcon,
} as const

const workflowColorMap = {
  purple: { iconBg: 'bg-indigo-50', iconText: 'text-indigo-500', border: 'border-indigo-500' },
  amber: { iconBg: 'bg-amber-50', iconText: 'text-amber-500', border: 'border-amber-500' },
  red: { iconBg: 'bg-rose-50', iconText: 'text-rose-500', border: 'border-rose-500' },
  teal: { iconBg: 'bg-teal-50', iconText: 'text-teal-500', border: 'border-teal-500' },
} as const

const WORKFLOW_API_CODE: Record<WorkflowId, string> = {
  affordability: 'kyc',
  gambling: 'sg',
  aml: 'traml',
  'document-integrity': 'document-integrity',
}

const DOC_STATUS_LABEL: Record<DocumentStatus, string> = {
  PROCESSING: 'Processing',
  COMPLETED: 'Completed',
  FAILED: 'Failed',
}

const DOC_STATUS_BADGE: Record<DocumentStatus, string> = {
  PROCESSING: 'bg-blue-50 text-blue-700',
  COMPLETED: 'bg-emerald-50 text-emerald-700',
  FAILED: 'bg-red-50 text-red-700',
}

const REPORT_STATUS_LABEL: Record<ReportStatus, string> = {
  GENERATING: 'Generating',
  COMPLETED: 'Completed',
  FAILED: 'Failed',
}

const REPORT_STATUS_BADGE: Record<ReportStatus, string> = {
  GENERATING: 'bg-blue-50 text-blue-700',
  COMPLETED: 'bg-emerald-50 text-emerald-700',
  FAILED: 'bg-red-50 text-red-700',
}

const FILE_STATUS_OPTIONS = ['All Status', 'PROCESSING', 'COMPLETED', 'FAILED']
const REPORT_STATUS_OPTIONS = ['All Status', 'GENERATING', 'COMPLETED', 'FAILED']

type Tab = 'file-processing' | 'reports'

const SEVERITY_BADGE: Record<string, string> = {
  high: 'bg-red-100 text-red-700',
  medium: 'bg-amber-100 text-amber-700',
  low: 'bg-emerald-100 text-emerald-700',
}

const EVIDENCE_PAGE_SIZE = 10

function FindingCard({ finding }: { finding: ReportFinding }) {
  const [expanded, setExpanded] = useState(false)
  const [page, setPage] = useState(0)

  const totalPages = Math.ceil(finding.evidence.length / EVIDENCE_PAGE_SIZE)
  const pageEvidence = finding.evidence.slice(page * EVIDENCE_PAGE_SIZE, (page + 1) * EVIDENCE_PAGE_SIZE)

  return (
    <div className="border border-slate-200 rounded-xl overflow-hidden">
      {/* Finding header */}
      <div className={`px-5 py-4 flex items-start gap-4 ${finding.triggered ? 'bg-red-50/60' : 'bg-emerald-50/60'}`}>
        <div className="flex-1 min-w-0">
          <div className="flex flex-wrap items-center gap-2 mb-1">
            <span className="text-sm font-semibold text-slate-800 capitalize">
              {finding.checkpoint.replace(/-/g, ' ')}
            </span>
            <span className={`px-2 py-0.5 rounded-full text-xs font-medium capitalize ${SEVERITY_BADGE[finding.severity] ?? 'bg-slate-100 text-slate-600'}`}>
              {finding.severity}
            </span>
            <span className={`px-2 py-0.5 rounded-full text-xs font-medium ${finding.triggered ? 'bg-red-100 text-red-700' : 'bg-emerald-100 text-emerald-700'}`}>
              {finding.triggered ? 'Triggered' : 'Clear'}
            </span>
          </div>
          <p className="text-xs text-slate-600 leading-relaxed">{finding.reason}</p>
        </div>
        <div className="text-right flex-shrink-0">
          <p className={`text-xl font-bold ${finding.score >= 70 ? 'text-red-600' : finding.score >= 40 ? 'text-amber-600' : 'text-emerald-600'}`}>
            {finding.score}
          </p>
          <p className="text-xs text-slate-400">score</p>
        </div>
      </div>

      {/* Evidence toggle */}
      {finding.evidence.length > 0 && (
        <>
          <button
            onClick={() => { setExpanded(!expanded); setPage(0) }}
            className="w-full flex items-center justify-between px-5 py-2.5 text-xs text-slate-500 hover:bg-slate-50 border-t border-slate-100 transition-colors"
          >
            <span>{finding.evidence.length} transaction{finding.evidence.length !== 1 ? 's' : ''} flagged as evidence</span>
            <span className={`transition-transform ${expanded ? 'rotate-180' : ''}`}>▾</span>
          </button>

          {expanded && (
            <div className="border-t border-slate-100">
              <div className="overflow-x-auto">
                <table className="w-full text-xs">
                  <thead>
                    <tr className="bg-slate-50 text-slate-600">
                      <th className="text-left px-4 py-2.5 font-medium">Date</th>
                      <th className="text-left px-4 py-2.5 font-medium">Description</th>
                      <th className="text-left px-4 py-2.5 font-medium">Direction</th>
                      <th className="text-right px-4 py-2.5 font-medium">Amount</th>
                      <th className="text-right px-4 py-2.5 font-medium">Balance</th>
                      <th className="text-left px-4 py-2.5 font-medium">Channel</th>
                      <th className="text-left px-4 py-2.5 font-medium">Reference</th>
                    </tr>
                  </thead>
                  <tbody>
                    {pageEvidence.map((ev, i) => (
                      <tr key={`${ev.reference}-${i}`} className="border-t border-slate-50 hover:bg-slate-50/50">
                        <td className="px-4 py-2 text-slate-500 whitespace-nowrap">{ev.date}</td>
                        <td className="px-4 py-2 text-slate-700">{ev.description}</td>
                        <td className="px-4 py-2">
                          <span className={`inline-flex items-center gap-1 px-1.5 py-0.5 rounded text-xs font-medium ${ev.direction === 'inflow' ? 'bg-emerald-50 text-emerald-700' : 'bg-red-50 text-red-700'}`}>
                            {ev.direction === 'inflow' ? '↑' : '↓'} {ev.direction}
                          </span>
                        </td>
                        <td className="px-4 py-2 text-right text-slate-700 whitespace-nowrap font-mono">
                          {ev.amount.toLocaleString('en-PH', { minimumFractionDigits: 2, maximumFractionDigits: 2 })}
                        </td>
                        <td className="px-4 py-2 text-right text-slate-500 whitespace-nowrap font-mono">
                          {ev.balance.toLocaleString('en-PH', { minimumFractionDigits: 2, maximumFractionDigits: 2 })}
                        </td>
                        <td className="px-4 py-2 text-slate-500 capitalize">{ev.channel}</td>
                        <td className="px-4 py-2 text-slate-400 font-mono">{ev.reference}</td>
                      </tr>
                    ))}
                  </tbody>
                </table>
              </div>
              {totalPages > 1 && (
                <div className="flex items-center justify-between px-4 py-2.5 border-t border-slate-100 bg-slate-50/50">
                  <span className="text-xs text-slate-400">
                    Page {page + 1} of {totalPages}
                  </span>
                  <div className="flex gap-1.5">
                    <button
                      onClick={() => setPage(p => Math.max(0, p - 1))}
                      disabled={page === 0}
                      className="px-2.5 py-1 text-xs text-slate-600 bg-white border border-slate-200 rounded hover:bg-slate-100 disabled:opacity-40 disabled:cursor-not-allowed transition-colors"
                    >
                      Prev
                    </button>
                    <button
                      onClick={() => setPage(p => Math.min(totalPages - 1, p + 1))}
                      disabled={page === totalPages - 1}
                      className="px-2.5 py-1 text-xs text-slate-600 bg-white border border-slate-200 rounded hover:bg-slate-100 disabled:opacity-40 disabled:cursor-not-allowed transition-colors"
                    >
                      Next
                    </button>
                  </div>
                </div>
              )}
            </div>
          )}
        </>
      )}
    </div>
  )
}

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
  const [reports, setReports] = useState<ApiReport[]>([])
  const [isLoading, setIsLoading] = useState(true)
  const [isLoadingReports, setIsLoadingReports] = useState(true)
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
  const [reportDetail, setReportDetail] = useState<ApiReportDetail | null>(null)
  const [isLoadingDetail, setIsLoadingDetail] = useState(false)
  const [reportDetailError, setReportDetailError] = useState<string | null>(null)
  const [selectedDocumentIds, setSelectedDocumentIds] = useState<Set<string>>(new Set())
  const [showGenerateModal, setShowGenerateModal] = useState(false)
  const [selectedWorkflowsForReport, setSelectedWorkflowsForReport] = useState<Set<string>>(new Set())
  const [isGenerating, setIsGenerating] = useState(false)
  const [generateError, setGenerateError] = useState<string | null>(null)

  const fetchDocuments = useCallback(async () => {
    try {
      const docs = await listDocuments()
      setDocuments(docs)
    } catch {
      // keep existing documents on refresh error
    }
  }, [])

  const fetchReports = useCallback(async () => {
    try {
      const data = await listReports(WORKFLOW_API_CODE[selectedWorkflow])
      setReports(data)
    } catch {
      // keep existing reports on refresh error
    }
  }, [selectedWorkflow])

  const handleViewReport = useCallback(async (id: string) => {
    setIsLoadingDetail(true)
    setReportDetailError(null)
    setReportDetail(null)
    try {
      const detail = await getReport(id)
      setReportDetail(detail)
    } catch (err) {
      setReportDetailError(err instanceof Error ? err.message : 'Failed to load report')
    } finally {
      setIsLoadingDetail(false)
    }
  }, [])

  useEffect(() => {
    setIsLoading(true)
    fetchDocuments().finally(() => setIsLoading(false))
  }, [fetchDocuments])

  useEffect(() => {
    setIsLoadingReports(true)
    fetchReports().finally(() => setIsLoadingReports(false))
  }, [fetchReports])

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

  const toggleDocumentSelection = useCallback((id: string) => {
    setSelectedDocumentIds((prev) => {
      const next = new Set(prev)
      if (next.has(id)) next.delete(id)
      else next.add(id)
      return next
    })
  }, [])

  const handleGenerateReportSubmit = useCallback(async () => {
    setIsGenerating(true)
    setGenerateError(null)
    try {
      await generateReport(
        Array.from(selectedWorkflowsForReport),
        Array.from(selectedDocumentIds),
      )
      setShowGenerateModal(false)
      setSelectedWorkflowsForReport(new Set())
      setSelectedDocumentIds(new Set())
      fetchReports()
    } catch (err) {
      setGenerateError(err instanceof Error ? err.message : 'Failed to generate report')
    } finally {
      setIsGenerating(false)
    }
  }, [selectedWorkflowsForReport, selectedDocumentIds, fetchReports])

  const statuses = activeTab === 'file-processing' ? FILE_STATUS_OPTIONS : REPORT_STATUS_OPTIONS

  const filteredDocuments = documents.filter((d) => {
    const q = searchQuery.toLowerCase()
    const matchSearch =
      d.originalName.toLowerCase().includes(q) || (d.batch?.name ?? '').toLowerCase().includes(q)
    const matchStatus = statusFilter === 'All Status' || d.status === statusFilter
    return matchSearch && matchStatus
  })

  const filteredReports = reports.filter((r) => {
    const q = searchQuery.toLowerCase()
    const batchNames = r.batches.map((b) => b.name).join(' ')
    const fileNames = r.documents.map((d) => d.fileName).join(' ')
    const matchSearch = batchNames.toLowerCase().includes(q) || fileNames.toLowerCase().includes(q)
    const matchStatus = statusFilter === 'All Status' || r.status === statusFilter
    return matchSearch && matchStatus
  })

  return (
    <div className="flex-1 p-8">
      {/* Generate Report modal */}
      {showGenerateModal && (
        <div className="fixed inset-0 z-50 flex items-center justify-center bg-black/40">
          <div className="bg-white rounded-xl shadow-xl p-6 w-full max-w-md mx-4">
            <h2 className="text-lg font-semibold text-slate-800 mb-1">Generate Report</h2>
            <p className="text-sm text-slate-500 mb-5">
              {selectedDocumentIds.size} file{selectedDocumentIds.size !== 1 ? 's' : ''} selected. Choose one or more workflows to run.
            </p>

            <div className="mb-6 space-y-3">
              {WORKFLOWS.map((workflow) => {
                const apiCode = WORKFLOW_API_CODE[workflow.id]
                const checked = selectedWorkflowsForReport.has(apiCode)
                return (
                  <label key={workflow.id} className="flex items-start gap-3 cursor-pointer group">
                    <input
                      type="checkbox"
                      checked={checked}
                      onChange={() => {
                        setSelectedWorkflowsForReport((prev) => {
                          const next = new Set(prev)
                          if (next.has(apiCode)) next.delete(apiCode)
                          else next.add(apiCode)
                          return next
                        })
                      }}
                      className="mt-0.5 h-4 w-4 rounded border-slate-300 text-indigo-600 focus:ring-indigo-500"
                    />
                    <div>
                      <p className="text-sm font-medium text-slate-800 group-hover:text-indigo-700 transition-colors">
                        {workflow.name}
                      </p>
                      <p className="text-xs text-slate-500">{workflow.description}</p>
                    </div>
                  </label>
                )
              })}
            </div>

            {generateError && (
              <p className="mb-4 text-xs text-red-600">{generateError}</p>
            )}

            <div className="flex justify-end gap-3">
              <button
                onClick={() => {
                  setShowGenerateModal(false)
                  setSelectedWorkflowsForReport(new Set())
                  setGenerateError(null)
                }}
                disabled={isGenerating}
                className="px-4 py-2 text-sm font-medium text-slate-600 bg-slate-100 hover:bg-slate-200 disabled:opacity-50 rounded-lg transition-colors"
              >
                Cancel
              </button>
              <button
                onClick={handleGenerateReportSubmit}
                disabled={selectedWorkflowsForReport.size === 0 || isGenerating}
                className="px-4 py-2 text-sm font-medium text-white bg-indigo-600 hover:bg-indigo-700 disabled:opacity-50 disabled:cursor-not-allowed rounded-lg transition-colors"
              >
                {isGenerating ? 'Generating…' : 'Proceed'}
              </button>
            </div>
          </div>
        </div>
      )}

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
      {/* Report detail modal */}
      {(isLoadingDetail || reportDetail || reportDetailError) && (
        <div className="fixed inset-0 z-50 flex items-start justify-center bg-black/50 overflow-y-auto py-8 px-4">
          <div className="bg-white rounded-xl shadow-2xl w-full max-w-4xl">
            {/* Modal header */}
            <div className="flex items-start justify-between p-6 border-b border-slate-200">
              <div>
                <h2 className="text-lg font-semibold text-slate-800">
                  {reportDetail?.title ?? 'Loading Report…'}
                </h2>
                {reportDetail && (
                  <p className="text-xs text-slate-500 mt-0.5">
                    Generated {formatDate(reportDetail.createdAt)}
                  </p>
                )}
              </div>
              <button
                onClick={() => { setReportDetail(null); setReportDetailError(null) }}
                className="ml-4 p-1.5 text-slate-400 hover:text-slate-600 hover:bg-slate-100 rounded-lg transition-colors text-lg leading-none"
              >
                ✕
              </button>
            </div>

            <div className="p-6">
              {isLoadingDetail && (
                <div className="py-16 text-center text-sm text-slate-400">Loading report…</div>
              )}

              {reportDetailError && (
                <div className="py-8 text-center text-sm text-red-500">{reportDetailError}</div>
              )}

              {reportDetail && (
                <>
                  {/* Summary cards */}
                  <div className="grid grid-cols-5 gap-3 mb-6">
                    <div className={`rounded-xl p-4 text-center ${reportDetail.summary.overallRiskScore >= 70 ? 'bg-red-50' : reportDetail.summary.overallRiskScore >= 40 ? 'bg-amber-50' : 'bg-emerald-50'}`}>
                      <p className={`text-2xl font-bold ${reportDetail.summary.overallRiskScore >= 70 ? 'text-red-600' : reportDetail.summary.overallRiskScore >= 40 ? 'text-amber-600' : 'text-emerald-600'}`}>
                        {reportDetail.summary.overallRiskScore}
                      </p>
                      <p className="text-xs text-slate-500 mt-0.5">Risk Score</p>
                    </div>
                    <div className="bg-slate-50 rounded-xl p-4 text-center">
                      <p className="text-2xl font-bold text-slate-800">{reportDetail.summary.totalTransactions}</p>
                      <p className="text-xs text-slate-500 mt-0.5">Transactions</p>
                    </div>
                    <div className="bg-slate-50 rounded-xl p-4 text-center">
                      <p className="text-2xl font-bold text-slate-800">{reportDetail.summary.totalDocuments}</p>
                      <p className="text-xs text-slate-500 mt-0.5">Documents</p>
                    </div>
                    <div className="bg-amber-50 rounded-xl p-4 text-center">
                      <p className="text-2xl font-bold text-amber-600">{reportDetail.summary.triggeredChecks}</p>
                      <p className="text-xs text-slate-500 mt-0.5">Triggered Checks</p>
                    </div>
                    <div className="bg-red-50 rounded-xl p-4 text-center">
                      <p className="text-2xl font-bold text-red-600">{reportDetail.summary.highRiskFindings}</p>
                      <p className="text-xs text-slate-500 mt-0.5">High Risk</p>
                    </div>
                  </div>

                  {/* Findings per workflow */}
                  {reportDetail.results.map((result) => (
                    <div key={result.workflow} className="mb-6">
                      <div className="flex items-center gap-3 mb-4">
                        <span className="px-2.5 py-1 text-xs font-bold bg-slate-800 text-white rounded-md uppercase tracking-wider">
                          {result.workflow}
                        </span>
                        <span className="text-sm text-slate-500">Overall Score:</span>
                        <span className={`text-sm font-semibold ${result.overallScore >= 70 ? 'text-red-600' : result.overallScore >= 40 ? 'text-amber-600' : 'text-emerald-600'}`}>
                          {result.overallScore} / 100
                        </span>
                      </div>

                      <div className="space-y-4">
                        {result.findings.map((finding) => (
                          <FindingCard key={finding.checkpoint} finding={finding} />
                        ))}
                      </div>
                    </div>
                  ))}
                </>
              )}
            </div>
          </div>
        </div>
      )}

      <h1 className="text-2xl font-bold text-slate-800 mb-6">Workflows</h1>

      {/* Workflow selection cards */}
      <div className="grid grid-cols-4 gap-4 mb-5">
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
        <div className="flex items-center justify-between border-b border-slate-200 px-5">
          <div className="flex">
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
          <button
            onClick={() => setShowGenerateModal(true)}
            disabled={selectedDocumentIds.size === 0}
            className="flex items-center gap-2 px-4 py-2 text-sm font-medium text-white bg-indigo-600 hover:bg-indigo-700 disabled:opacity-40 disabled:cursor-not-allowed rounded-lg transition-colors"
          >
            <FileTextIcon className="w-4 h-4" />
            Generate Report
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
                  {s === 'All Status' ? s : (activeTab === 'file-processing' ? (DOC_STATUS_LABEL[s as DocumentStatus] ?? s) : (REPORT_STATUS_LABEL[s as ReportStatus] ?? s))}
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
                  <th className="px-5 py-3 w-10">
                    {(() => {
                      const completedDocs = filteredDocuments.filter((d) => d.status === 'COMPLETED')
                      return (
                        <input
                          type="checkbox"
                          checked={completedDocs.length > 0 && completedDocs.every((d) => selectedDocumentIds.has(d.id))}
                          disabled={completedDocs.length === 0}
                          onChange={() => {
                            if (completedDocs.every((d) => selectedDocumentIds.has(d.id))) {
                              setSelectedDocumentIds((prev) => {
                                const next = new Set(prev)
                                completedDocs.forEach((d) => next.delete(d.id))
                                return next
                              })
                            } else {
                              setSelectedDocumentIds((prev) => {
                                const next = new Set(prev)
                                completedDocs.forEach((d) => next.add(d.id))
                                return next
                              })
                            }
                          }}
                          className="h-4 w-4 rounded border-slate-300 text-indigo-600 focus:ring-indigo-500 disabled:opacity-40 disabled:cursor-not-allowed"
                        />
                      )
                    })()}
                  </th>
                  <th className="text-left px-5 py-3 font-semibold text-slate-700">Batch Name</th>
                  <th className="text-left px-5 py-3 font-semibold text-slate-700">File Name</th>
                  <th className="text-left px-5 py-3 font-semibold text-slate-700">Status</th>
                  <th className="text-left px-5 py-3 font-semibold text-slate-700">Uploaded At</th>
                </tr>
              </thead>
              <tbody>
                {isLoading ? (
                  <tr>
                    <td colSpan={5} className="px-5 py-12 text-center text-sm text-slate-400">
                      Loading…
                    </td>
                  </tr>
                ) : filteredDocuments.length === 0 ? (
                  <tr>
                    <td colSpan={5} className="px-5 py-12 text-center text-sm text-slate-400">
                      No files uploaded yet
                    </td>
                  </tr>
                ) : (
                  filteredDocuments.map((doc) => (
                    <tr
                      key={doc.id}
                      className={`border-b border-slate-50 hover:bg-slate-50/50 transition-colors ${selectedDocumentIds.has(doc.id) ? 'bg-indigo-50/40' : ''}`}
                    >
                      <td className="px-5 py-3.5">
                        <input
                          type="checkbox"
                          checked={selectedDocumentIds.has(doc.id)}
                          disabled={doc.status !== 'COMPLETED'}
                          onChange={() => toggleDocumentSelection(doc.id)}
                          className="h-4 w-4 rounded border-slate-300 text-indigo-600 focus:ring-indigo-500 disabled:opacity-40 disabled:cursor-not-allowed"
                        />
                      </td>
                      <td className="px-5 py-3.5 text-slate-600">{doc.batch?.name ?? '-'}</td>
                      <td className="px-5 py-3.5 text-slate-600">{doc.originalName}</td>
                      <td className="px-5 py-3.5">
                        <span
                          className={`inline-flex items-center px-2.5 py-0.5 rounded-full text-xs font-medium ${DOC_STATUS_BADGE[doc.status] ?? 'bg-slate-100 text-slate-600'}`}
                        >
                          {DOC_STATUS_LABEL[doc.status] ?? doc.status}
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
                  <th className="text-left px-5 py-3 font-semibold text-slate-700">Batch Name</th>
                  <th className="text-left px-5 py-3 font-semibold text-slate-700">File Name</th>
                  <th className="text-left px-5 py-3 font-semibold text-slate-700">Generated At</th>
                  <th className="text-left px-5 py-3 font-semibold text-slate-700">Status</th>
                  <th className="text-left px-5 py-3 font-semibold text-slate-700">Severity</th>
                  <th className="text-left px-5 py-3 font-semibold text-slate-700">View Report</th>
                </tr>
              </thead>
              <tbody>
                {isLoadingReports ? (
                  <tr>
                    <td colSpan={6} className="px-5 py-12 text-center text-sm text-slate-400">
                      Loading…
                    </td>
                  </tr>
                ) : filteredReports.length === 0 ? (
                  <tr>
                    <td colSpan={6} className="px-5 py-12 text-center text-sm text-slate-400">
                      No reports generated yet
                    </td>
                  </tr>
                ) : (
                  filteredReports.map((report) => (
                    <tr key={report.id} className="border-b border-slate-50 hover:bg-slate-50/50 transition-colors">
                      <td className="px-5 py-3.5 text-slate-600">
                        {report.batches.length > 0 ? report.batches.map((b) => b.name).join(', ') : '-'}
                      </td>
                      <td className="px-5 py-3.5 text-slate-600">
                        {report.documents.length > 0 ? report.documents.map((d) => d.fileName).join(', ') : '-'}
                      </td>
                      <td className="px-5 py-3.5 text-slate-500">{formatDate(report.createdAt)}</td>
                      <td className="px-5 py-3.5">
                        <span
                          className={`inline-flex items-center px-2.5 py-0.5 rounded-full text-xs font-medium ${REPORT_STATUS_BADGE[report.status] ?? 'bg-slate-100 text-slate-600'}`}
                        >
                          {REPORT_STATUS_LABEL[report.status] ?? report.status}
                        </span>
                      </td>
                      <td className="px-5 py-3.5">
                        {report.summary?.severity ? (
                          <span className={`inline-flex items-center px-2.5 py-0.5 rounded-full text-xs font-medium capitalize ${SEVERITY_BADGE[report.summary.severity] ?? 'bg-slate-100 text-slate-600'}`}>
                            {report.summary.severity}
                          </span>
                        ) : (
                          <span className="text-slate-400 text-xs">—</span>
                        )}
                      </td>
                      <td className="px-5 py-3.5">
                        <button
                          onClick={() => handleViewReport(report.id)}
                          className="inline-flex items-center gap-1.5 px-3 py-1.5 text-xs font-medium text-indigo-600 bg-indigo-50 hover:bg-indigo-100 rounded-lg transition-colors"
                        >
                          <FileTextIcon className="w-3.5 h-3.5" />
                          View Report
                        </button>
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

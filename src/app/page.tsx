'use client'

import { useEffect, useState } from 'react'
import { WORKFLOWS } from '@/lib/data'
import { listDocuments, listReports } from '@/lib/api'
import type { ApiDocument, ApiReport, WorkflowId } from '@/lib/types'
import { ShieldIcon, DiceIcon, AlertTriangleIcon, ScanDocumentIcon, FileIcon, FileTextIcon } from '@/components/icons'

const workflowIconMap = {
  shield: ShieldIcon,
  dice: DiceIcon,
  alert: AlertTriangleIcon,
  scan: ScanDocumentIcon,
} as const

const workflowColorMap = {
  purple: { bg: 'bg-indigo-50', text: 'text-indigo-500' },
  amber: { bg: 'bg-amber-50', text: 'text-amber-500' },
  red: { bg: 'bg-rose-50', text: 'text-rose-500' },
  teal: { bg: 'bg-teal-50', text: 'text-teal-500' },
} as const

const workflowCodeMap: Record<WorkflowId, string> = {
  affordability: 'kyc',
  gambling: 'sg',
  aml: 'traml',
  'document-integrity': 'document-integrity',
}

export default function DashboardPage() {
  const [documents, setDocuments] = useState<ApiDocument[]>([])
  const [reports, setReports] = useState<ApiReport[]>([])
  const [loading, setLoading] = useState(true)

  useEffect(() => {
    async function fetchData() {
      try {
        const [docs, rpts] = await Promise.all([listDocuments(), listReports()])
        const sortedDocs = [...docs].sort(
          (a, b) => new Date(b.createdAt).getTime() - new Date(a.createdAt).getTime()
        )
        const sortedRpts = [...rpts].sort(
          (a, b) => new Date(b.createdAt).getTime() - new Date(a.createdAt).getTime()
        )
        setDocuments(sortedDocs)
        setReports(sortedRpts)
      } catch {
        // leave state empty on error
      } finally {
        setLoading(false)
      }
    }
    fetchData()
  }, [])

  const recentFiles = documents.slice(0, 3)
  const recentReports = reports.slice(0, 3)

  return (
    <div className="flex-1 p-8">
      <h1 className="text-2xl font-bold text-slate-800 mb-6">Dashboard</h1>

      {/* Workflow summary cards */}
      <div className="grid grid-cols-3 gap-4 mb-5">
        {WORKFLOWS.map((workflow) => {
          const Icon = workflowIconMap[workflow.iconType]
          const colors = workflowColorMap[workflow.colorScheme]
          const code = workflowCodeMap[workflow.id]
          const reportCount = reports.filter((r) => r.workflows.includes(code)).length

          return (
            <div key={workflow.id} className="bg-white rounded-xl border border-slate-200 p-5">
              <div className="flex items-center gap-3 mb-4">
                <div className={`w-9 h-9 rounded-lg flex items-center justify-center flex-shrink-0 ${colors.bg}`}>
                  <Icon className={`w-5 h-5 ${colors.text}`} />
                </div>
                <span className="text-sm font-medium text-slate-700 leading-tight">
                  {workflow.name}
                </span>
              </div>
              <p className="text-3xl font-bold text-slate-900">
                {loading ? '—' : reportCount}
              </p>
              <p className="text-xs text-slate-400 mt-0.5">Reports</p>
            </div>
          )
        })}
      </div>

      {/* Bottom row */}
      <div className="grid grid-cols-5 gap-4">
        {/* Recent Uploaded Files */}
        <div className="col-span-3 bg-white rounded-xl border border-slate-200 p-5">
          <h2 className="text-sm font-semibold text-slate-800 mb-4">Recent Uploaded Files</h2>
          {loading ? (
            <p className="text-sm text-slate-400">Loading...</p>
          ) : recentFiles.length === 0 ? (
            <p className="text-sm text-slate-400">No files uploaded yet.</p>
          ) : (
            <div className="space-y-3">
              {recentFiles.map((file) => (
                <div key={file.id} className="flex items-center gap-3">
                  <FileIcon className="w-4 h-4 text-slate-400 flex-shrink-0" />
                  <span className="text-sm text-slate-600">{file.originalName}</span>
                </div>
              ))}
            </div>
          )}
        </div>

        {/* Recent Generated Reports */}
        <div className="col-span-2 bg-white rounded-xl border border-slate-200 p-5">
          <h2 className="text-sm font-semibold text-slate-800 mb-4">Recent Generated Reports</h2>
          {loading ? (
            <p className="text-sm text-slate-400">Loading...</p>
          ) : recentReports.length === 0 ? (
            <p className="text-sm text-slate-400">No reports generated yet.</p>
          ) : (
            <div className="space-y-3">
              {recentReports.map((report) => (
                <div key={report.id} className="flex items-center gap-3">
                  <FileTextIcon className="w-4 h-4 text-emerald-500 flex-shrink-0" />
                  <span className="text-sm text-slate-600">{report.title}</span>
                </div>
              ))}
            </div>
          )}
        </div>
      </div>
    </div>
  )
}

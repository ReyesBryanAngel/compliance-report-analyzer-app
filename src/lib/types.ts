export type WorkflowId = 'affordability' | 'gambling' | 'aml' | 'document-integrity'

export interface Workflow {
  id: WorkflowId
  name: string
  description: string
  iconType: 'shield' | 'dice' | 'alert' | 'scan'
  colorScheme: 'purple' | 'amber' | 'red' | 'teal'
}

export type DocumentStatus = 'PROCESSING' | 'COMPLETED' | 'FAILED'
export type ReportStatus = 'GENERATING' | 'COMPLETED' | 'FAILED'

export interface ApiBatch {
  id: string
  name: string
  description: string
  createdAt: string
}

export interface ApiDocument {
  id: string
  originalName: string
  mimeType: string
  size: number
  status: DocumentStatus
  batchId: string | null
  batch: ApiBatch | null
  uploadedById: string
  organizationId: string
  createdAt: string
}

export interface ApiPresignedDocument {
  uploadUrl: string
  document: ApiDocument
}

export interface ApiUploadUrlResponse {
  batch: ApiBatch | null
  documents: ApiPresignedDocument[]
  failed: { filename: string; error: string }[]
}

export interface ApiListResponse {
  documents: ApiDocument[]
}

export interface UploadedFile {
  id: string
  batchName: string
  fileName: string
  status: 'Processing' | 'Completed' | 'Failed'
  uploadedAt: string
}

export interface Report {
  id: string
  name: string
  workflowId: WorkflowId
  generatedAt: string
  status: 'Ready' | 'Generating'
}

export interface ApiReportDocument {
  id: string
  fileName: string
}

export interface ApiReportBatch {
  id: string
  name: string
}

export interface ApiReportSummary {
  severity: 'low' | 'medium' | 'high'
  totalDocuments: number
  totalTransactions: number
  overallRiskScore: number
  triggeredChecks: number
  highRiskFindings: number
}

export interface ApiReport {
  id: string
  title: string
  status: ReportStatus
  documentIds: string[]
  documents: ApiReportDocument[]
  batches: ApiReportBatch[]
  workflows: string[]
  summary?: ApiReportSummary
  createdAt: string
}

export interface ApiReportsListResponse {
  reports: ApiReport[]
}

export interface ReportEvidence {
  date: string
  description: string
  amount: number
  direction: 'inflow' | 'outflow'
  balance: number
  category?: string
  channel: string
  reference: string
}

export interface ReportFinding {
  checkpoint: string
  triggered: boolean
  severity: 'high' | 'medium' | 'low'
  score: number
  reason: string
  evidence: ReportEvidence[]
}

export interface ReportResult {
  workflow: string
  overallScore: number
  findings: ReportFinding[]
}

export interface ReportCheck {
  id: string
  rule: string
  passed: boolean
  details: string
}

export interface ReportSummary {
  totalDocuments: number
  totalTransactions: number
  overallRiskScore: number
  triggeredChecks: number
  highRiskFindings: number
}

export interface ApiReportDetail {
  id: string
  title: string
  status: string
  documentIds: string[]
  workflows: string[]
  results: ReportResult[]
  checks: ReportCheck[]
  summary: ReportSummary
  createdAt: string
}

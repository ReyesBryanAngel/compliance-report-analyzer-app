export type WorkflowId = 'affordability' | 'gambling' | 'aml'

export interface Workflow {
  id: WorkflowId
  name: string
  description: string
  iconType: 'shield' | 'dice' | 'alert'
  colorScheme: 'purple' | 'amber' | 'red'
}

export type DocumentStatus = 'PENDING' | 'PROCESSING' | 'PROCESSED' | 'COMPLETED' | 'FAILED'

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

export interface ApiUploadResponse {
  batch: ApiBatch | null
  documents: ApiDocument[]
  failed: string[]
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

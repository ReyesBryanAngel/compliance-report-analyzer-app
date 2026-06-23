import type { ActiveInstructionResponse, AgentConversation, AgentExecutionDetail, ApiDocument, ApiDocumentDetail, ApiListResponse, ApiReport, ApiReportDetail, ApiReportsListResponse, ApiUploadUrlResponse, InstructionItem, WorkflowConfigItem, WorkflowExecutionSummary } from './types'

const API_BASE = '/api/backend'
// const API_BASE = 'http://127.0.0.1:3001/api/v1'
async function login(): Promise<string> {
  const res = await fetch('/api/auth/login', { method: 'POST' })
  if (!res.ok) throw new Error(`Login failed (${res.status})`)
  const data = await res.json() as { token: string }
  if (typeof window !== 'undefined') localStorage.setItem('token', data.token)
  return data.token
}

function getToken(): string | null {
  return typeof window !== 'undefined' ? localStorage.getItem('token') : null
}

async function fetchWithAuth(input: RequestInfo, init: RequestInit = {}): Promise<Response> {
  let token = getToken()
  if (!token) token = await login()

  const makeRequest = (t: string) =>
    fetch(input, { ...init, headers: { ...init.headers, Authorization: `Bearer ${t}` } })

  const res = await makeRequest(token)
  if (res.status !== 401) return res

  // Token expired — re-login and retry once
  token = await login()
  return makeRequest(token)
}

export async function requestUploadUrls(
  files: File[],
  batchName: string,
  batchDescription: string,
): Promise<ApiUploadUrlResponse> {
  const res = await fetchWithAuth(`${API_BASE}/documents/upload-url`, {
    method: 'POST',
    headers: { 'Content-Type': 'application/json' },
    body: JSON.stringify({
      files: files.map((f) => ({ filename: f.name })),
      batchName,
      batchDescription,
    }),
  })
  if (!res.ok) throw new Error(`Request upload URLs failed (${res.status})`)
  return res.json() as Promise<ApiUploadUrlResponse>
}

export function uploadToS3(
  uploadUrl: string,
  file: File,
  mimeType: string,
  onProgress: (percent: number) => void,
): Promise<void> {
  return new Promise((resolve, reject) => {
    const xhr = new XMLHttpRequest()
    xhr.open('PUT', uploadUrl)
    xhr.setRequestHeader('Content-Type', mimeType)

    // Forward any checksum headers the presigned URL requires
    const params = new URL(uploadUrl).searchParams
    const checksumAlgo = params.get('x-amz-checksum-algorithm')
    if (checksumAlgo) {
      xhr.setRequestHeader('x-amz-checksum-algorithm', checksumAlgo)
      const checksumKey = `x-amz-checksum-${checksumAlgo.toLowerCase()}`
      const checksumVal = params.get(checksumKey)
      if (checksumVal) xhr.setRequestHeader(checksumKey, checksumVal)
    }

    xhr.upload.onprogress = (e) => {
      if (e.lengthComputable) onProgress(Math.round((e.loaded / e.total) * 100))
    }
    xhr.onload = () => {
      if (xhr.status >= 200 && xhr.status < 300) resolve()
      else reject(new Error(`S3 upload failed (${xhr.status})`))
    }
    xhr.onerror = () => reject(new Error('S3 upload network error'))
    xhr.send(file)
  })
}

export async function confirmUpload(documentId: string): Promise<{ message: string }> {
  const res = await fetchWithAuth(`${API_BASE}/documents/${documentId}/confirm`, { method: 'POST' })
  if (!res.ok) throw new Error(`Confirm upload failed (${res.status})`)
  const data = await res.json() as { code: number; status: string; message: string }
  return { message: data.message }
}

export async function getDocument(id: string): Promise<ApiDocumentDetail> {
  const res = await fetchWithAuth(`${API_BASE}/documents/${id}`)
  if (!res.ok) throw new Error(`Get document failed (${res.status})`)
  return res.json() as Promise<ApiDocumentDetail>
}

export async function listDocuments(): Promise<ApiDocument[]> {
  const res = await fetchWithAuth(`${API_BASE}/documents/list`)
  if (!res.ok) throw new Error(`List failed (${res.status})`)
  const data = (await res.json()) as ApiListResponse
  return data.documents
}

export async function listReports(workflow?: string): Promise<ApiReport[]> {
  const url = workflow ? `${API_BASE}/reports/list?workflow=${encodeURIComponent(workflow)}` : `${API_BASE}/reports/list`
  const res = await fetchWithAuth(url)
  if (!res.ok) throw new Error(`List reports failed (${res.status})`)
  const data = (await res.json()) as ApiReportsListResponse
  return data.reports
}

export async function getReport(id: string): Promise<ApiReportDetail> {
  const res = await fetchWithAuth(`${API_BASE}/reports/${id}`)
  if (!res.ok) throw new Error(`Get report failed (${res.status})`)
  return res.json() as Promise<ApiReportDetail>
}

export async function generateReport(workflows: string[], documentIds: string[]): Promise<{ message: string }> {
  const res = await fetchWithAuth(`${API_BASE}/reports/generate`, {
    method: 'POST',
    headers: { 'Content-Type': 'application/json' },
    body: JSON.stringify({ workflows, document_ids: documentIds }),
  })
  if (!res.ok) throw new Error(`Generate report failed (${res.status})`)
  const data = await res.json() as { code: number; status: string; message: string }
  return { message: data.message }
}

export function getOrganizationId(): string | null {
  const token = getToken()
  if (!token) return null
  try {
    const payload = JSON.parse(atob(token.split('.')[1].replace(/-/g, '+').replace(/_/g, '/'))) as Record<string, unknown>
    return (payload.organizationId as string) ?? null
  } catch {
    return null
  }
}

// Workflow config

export async function getWorkflowConfigs(): Promise<WorkflowConfigItem[]> {
  const res = await fetchWithAuth(`${API_BASE}/workflow-config`)
  if (!res.ok) throw new Error(`Get workflow configs failed (${res.status})`)
  const data = await res.json() as { configs: WorkflowConfigItem[] }
  return data.configs
}

export async function setWorkflowConfig(workflow: string, mode: 'checkpoints' | 'agent_skill'): Promise<WorkflowConfigItem> {
  const res = await fetchWithAuth(`${API_BASE}/workflow-config/${encodeURIComponent(workflow)}`, {
    method: 'PUT',
    headers: { 'Content-Type': 'application/json' },
    body: JSON.stringify({ mode }),
  })
  if (!res.ok) throw new Error(`Set workflow config failed (${res.status})`)
  return res.json() as Promise<WorkflowConfigItem>
}

export async function resetWorkflowConfig(workflow: string): Promise<WorkflowConfigItem> {
  const res = await fetchWithAuth(`${API_BASE}/workflow-config/${encodeURIComponent(workflow)}`, { method: 'DELETE' })
  if (!res.ok) throw new Error(`Reset workflow config failed (${res.status})`)
  return res.json() as Promise<WorkflowConfigItem>
}

// SME instructions

export async function listInstructions(workflow: string): Promise<InstructionItem[]> {
  const res = await fetchWithAuth(`${API_BASE}/workflows/${encodeURIComponent(workflow)}/instructions`)
  if (!res.ok) throw new Error(`List instructions failed (${res.status})`)
  const data = await res.json() as { instructions: InstructionItem[] }
  return data.instructions
}

export async function getActiveInstruction(workflow: string): Promise<ActiveInstructionResponse> {
  const res = await fetchWithAuth(`${API_BASE}/workflows/${encodeURIComponent(workflow)}/instructions/active`)
  if (!res.ok) throw new Error(`Get active instruction failed (${res.status})`)
  return res.json() as Promise<ActiveInstructionResponse>
}

export async function createInstruction(workflow: string, title: string | undefined, content: string): Promise<InstructionItem> {
  const res = await fetchWithAuth(`${API_BASE}/workflows/${encodeURIComponent(workflow)}/instructions`, {
    method: 'POST',
    headers: { 'Content-Type': 'application/json' },
    body: JSON.stringify({ title: title || undefined, content }),
  })
  if (!res.ok) throw new Error(`Create instruction failed (${res.status})`)
  return res.json() as Promise<InstructionItem>
}

export async function activateInstruction(workflow: string, id: string): Promise<InstructionItem> {
  const res = await fetchWithAuth(`${API_BASE}/workflows/${encodeURIComponent(workflow)}/instructions/${encodeURIComponent(id)}/activate`, { method: 'PATCH' })
  if (!res.ok) throw new Error(`Activate instruction failed (${res.status})`)
  return res.json() as Promise<InstructionItem>
}

export async function deleteInstruction(workflow: string, id: string): Promise<void> {
  const res = await fetchWithAuth(`${API_BASE}/workflows/${encodeURIComponent(workflow)}/instructions/${encodeURIComponent(id)}`, { method: 'DELETE' })
  if (res.status === 409) throw new Error('ACTIVE')
  if (!res.ok) throw new Error(`Delete instruction failed (${res.status})`)
}

// Workflow executions

export async function getReportWorkflowExecutions(reportId: string): Promise<WorkflowExecutionSummary[]> {
  const res = await fetchWithAuth(`${API_BASE}/reports/${reportId}/workflow-executions`)
  if (!res.ok) throw new Error(`Get report workflow executions failed (${res.status})`)
  const data = await res.json() as { executions: WorkflowExecutionSummary[] }
  return data.executions
}

export async function listWorkflowExecutions(params?: {
  status?: string
  workflowSlug?: string
  mode?: string
  reportId?: string
  from?: string
  to?: string
  cursor?: string
  limit?: number
}): Promise<{ items: WorkflowExecutionSummary[]; nextCursor: string | null }> {
  const url = new URL(`${API_BASE}/workflow-executions`)
  if (params?.status) url.searchParams.set('status', params.status)
  if (params?.workflowSlug) url.searchParams.set('workflowSlug', params.workflowSlug)
  if (params?.mode) url.searchParams.set('mode', params.mode)
  if (params?.reportId) url.searchParams.set('reportId', params.reportId)
  if (params?.from) url.searchParams.set('from', params.from)
  if (params?.to) url.searchParams.set('to', params.to)
  if (params?.cursor) url.searchParams.set('cursor', params.cursor)
  if (params?.limit) url.searchParams.set('limit', String(params.limit))
  const res = await fetchWithAuth(url.toString())
  if (!res.ok) throw new Error(`List workflow executions failed (${res.status})`)
  return res.json() as Promise<{ items: WorkflowExecutionSummary[]; nextCursor: string | null }>
}

export async function getWorkflowExecution(id: string): Promise<WorkflowExecutionSummary> {
  const res = await fetchWithAuth(`${API_BASE}/workflow-executions/${id}`)
  if (!res.ok) throw new Error(`Get workflow execution failed (${res.status})`)
  return res.json() as Promise<WorkflowExecutionSummary>
}

export async function getWorkflowExecutionConversation(id: string): Promise<AgentConversation | null> {
  const res = await fetchWithAuth(`${API_BASE}/workflow-executions/${id}/conversation`)
  if (res.status === 404) return null
  if (!res.ok) throw new Error(`Get conversation failed (${res.status})`)
  return res.json() as Promise<AgentConversation>
}

export async function getAgentExecution(id: string): Promise<AgentExecutionDetail> {
  const res = await fetchWithAuth(`${API_BASE}/agent-executions/${id}`)
  if (!res.ok) throw new Error(`Get agent execution failed (${res.status})`)
  return res.json() as Promise<AgentExecutionDetail>
}

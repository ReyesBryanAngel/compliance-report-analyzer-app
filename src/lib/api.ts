import type { ApiDocument, ApiDocumentDetail, ApiListResponse, ApiReport, ApiReportDetail, ApiReportsListResponse, ApiUploadUrlResponse } from './types'

const API_BASE = '/api/backend'
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

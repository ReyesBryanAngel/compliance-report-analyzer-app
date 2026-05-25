import type { ApiDocument, ApiListResponse, ApiReport, ApiReportDetail, ApiReportsListResponse, ApiUploadUrlResponse } from './types'

const API_BASE = process.env.NEXT_PUBLIC_API_URL ?? 'http://127.0.0.1:3000/api/v1'

const FALLBACK_TOKEN = 'eyJhbGciOiJIUzI1NiIsInR5cCI6IkpXVCJ9.eyJzdWIiOiI4Y2QxYWVlOC0wMmZiLTRlMzEtYmE2Ni02YWVjZTc2MzA3YzUiLCJvcmdhbml6YXRpb25JZCI6ImY4ODE1MzJhLTg4YzMtNDhjNi1hZTE5LWRiYWY3Nzk4NDRkYiIsImVtYWlsIjoiYW5nZWxicnlhbnJleWVzMDdAZ21haWwuY29tIiwiaWF0IjoxNzc5MjA4NTk3LCJleHAiOjE3Nzk4MTMzOTd9.Ho32E90VAlDbH6FMxsIWEY4t8dbEFTyeRGu3LINroUQ'

function getAuthHeader() {
  const token = (typeof window !== 'undefined' && localStorage.getItem('token')) || FALLBACK_TOKEN
  return { Authorization: `Bearer ${token}` }
}

export async function requestUploadUrls(
  files: File[],
  batchName: string,
  batchDescription: string,
): Promise<ApiUploadUrlResponse> {
  const res = await fetch(`${API_BASE}/documents/upload-url`, {
    method: 'POST',
    headers: { ...getAuthHeader(), 'Content-Type': 'application/json' },
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

export async function confirmUpload(documentId: string): Promise<void> {
  const res = await fetch(`${API_BASE}/documents/${documentId}/confirm`, {
    method: 'POST',
    headers: getAuthHeader(),
  })
  if (!res.ok) throw new Error(`Confirm upload failed (${res.status})`)
}

export async function listDocuments(): Promise<ApiDocument[]> {
  const res = await fetch(`${API_BASE}/documents/list`, { headers: getAuthHeader() })
  if (!res.ok) throw new Error(`List failed (${res.status})`)
  const data = (await res.json()) as ApiListResponse
  return data.documents
}

export async function listReports(workflow?: string): Promise<ApiReport[]> {
  const url = workflow ? `${API_BASE}/reports/list?workflow=${encodeURIComponent(workflow)}` : `${API_BASE}/reports/list`
  const res = await fetch(url, { headers: getAuthHeader() })
  if (!res.ok) throw new Error(`List reports failed (${res.status})`)
  const data = (await res.json()) as ApiReportsListResponse
  return data.reports
}

export async function getReport(id: string): Promise<ApiReportDetail> {
  const res = await fetch(`${API_BASE}/reports/${id}`, { headers: getAuthHeader() })
  if (!res.ok) throw new Error(`Get report failed (${res.status})`)
  return res.json() as Promise<ApiReportDetail>
}

export async function generateReport(workflows: string[], documentIds: string[]): Promise<void> {
  const res = await fetch(`${API_BASE}/reports/generate`, {
    method: 'POST',
    headers: { ...getAuthHeader(), 'Content-Type': 'application/json' },
    body: JSON.stringify({ workflows, document_ids: documentIds }),
  })
  if (!res.ok) throw new Error(`Generate report failed (${res.status})`)
}

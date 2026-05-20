import type { ApiDocument, ApiListResponse, ApiReport, ApiReportDetail, ApiReportsListResponse, ApiUploadResponse } from './types'

const API_BASE = process.env.NEXT_PUBLIC_API_URL ?? 'http://127.0.0.1:3000/api/v1'

const FALLBACK_TOKEN = 'eyJhbGciOiJIUzI1NiIsInR5cCI6IkpXVCJ9.eyJzdWIiOiI4Y2QxYWVlOC0wMmZiLTRlMzEtYmE2Ni02YWVjZTc2MzA3YzUiLCJvcmdhbml6YXRpb25JZCI6ImY4ODE1MzJhLTg4YzMtNDhjNi1hZTE5LWRiYWY3Nzk4NDRkYiIsImVtYWlsIjoiYW5nZWxicnlhbnJleWVzMDdAZ21haWwuY29tIiwiaWF0IjoxNzc5MjA4NTk3LCJleHAiOjE3Nzk4MTMzOTd9.Ho32E90VAlDbH6FMxsIWEY4t8dbEFTyeRGu3LINroUQ'

function getAuthHeader() {
  const token = (typeof window !== 'undefined' && localStorage.getItem('token')) || FALLBACK_TOKEN
  return { Authorization: `Bearer ${token}` }
}

export async function uploadDocument(
  file: File,
  batchName: string,
  batchDescription: string,
): Promise<ApiUploadResponse> {
  const form = new FormData()
  form.append('file', file)
  form.append('batch_name', batchName)
  form.append('batch_description', batchDescription)

  const res = await fetch(`${API_BASE}/documents/upload`, {
    method: 'POST',
    headers: getAuthHeader(),
    body: form,
  })
  if (!res.ok) throw new Error(`Upload failed (${res.status})`)
  return res.json() as Promise<ApiUploadResponse>
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

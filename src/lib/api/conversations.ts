import { API_BASE, fetchWithAuth } from '../api'
import type { ConversationDetail, ConversationMessage, ConversationSummary } from '../types/conversation'

export interface ApiError {
  status: number
  message: string
}

async function handleError(res: Response, fallback: string): Promise<never> {
  let message = fallback
  try {
    const body = await res.json() as { message?: string }
    if (body.message) message = body.message
  } catch {
    // use fallback
  }
  throw { status: res.status, message } satisfies ApiError
}

export async function startConversation(
  reportId: string,
): Promise<{ id: string; reportId: string; createdAt: string }> {
  const res = await fetchWithAuth(`${API_BASE}/reports/${reportId}/conversations`, {
    method: 'POST',
  })
  if (!res.ok) {
    if (res.status === 404) return handleError(res, 'Report not found.')
    if (res.status === 400) return handleError(res, 'Report must be in COMPLETED status to start a conversation.')
    return handleError(res, `Failed to start conversation (${res.status})`)
  }
  return res.json() as Promise<{ id: string; reportId: string; createdAt: string }>
}

export async function sendMessage(
  reportId: string,
  conversationId: string,
  message: string,
): Promise<ConversationMessage> {
  const res = await fetchWithAuth(
    `${API_BASE}/reports/${reportId}/conversations/${conversationId}/messages`,
    {
      method: 'POST',
      headers: { 'Content-Type': 'application/json' },
      body: JSON.stringify({ message }),
    },
  )
  if (!res.ok) {
    if (res.status === 400) return handleError(res, 'Message is too long (max 2000 characters).')
    if (res.status === 404) return handleError(res, 'Conversation not found. Start a new one.')
    if (res.status === 502) return handleError(res, 'The AI assistant is temporarily unavailable. Please try again in a moment.')
    return handleError(res, `Failed to send message (${res.status})`)
  }
  return res.json() as Promise<ConversationMessage>
}

export async function getConversation(
  reportId: string,
  conversationId: string,
): Promise<ConversationDetail> {
  const res = await fetchWithAuth(
    `${API_BASE}/reports/${reportId}/conversations/${conversationId}`,
  )
  if (!res.ok) {
    if (res.status === 404) return handleError(res, 'Conversation not found. Start a new one.')
    return handleError(res, `Failed to load conversation (${res.status})`)
  }
  return res.json() as Promise<ConversationDetail>
}

export async function listConversations(
  reportId: string,
): Promise<{ conversations: ConversationSummary[] }> {
  const res = await fetchWithAuth(`${API_BASE}/reports/${reportId}/conversations`)
  if (!res.ok) {
    return handleError(res, `Failed to list conversations (${res.status})`)
  }
  return res.json() as Promise<{ conversations: ConversationSummary[] }>
}

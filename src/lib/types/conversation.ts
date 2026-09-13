export type MessageRole = 'USER' | 'ASSISTANT'

export interface ConversationMessage {
  id: string
  conversationId: string
  role: MessageRole
  content: string
  sequence: number
  model: string | null
  provider: string | null
  promptTokens: number | null
  completionTokens: number | null
  latencyMs: number | null
  createdAt: string
}

export interface ConversationDetail {
  id: string
  reportId: string
  userId: string | null
  createdAt: string
  updatedAt: string
  messages: ConversationMessage[]
}

export interface ConversationSummary {
  id: string
  reportId: string
  userId: string | null
  messageCount: number
  createdAt: string
  updatedAt: string
}

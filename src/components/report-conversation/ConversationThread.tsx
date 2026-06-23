'use client'

import { useEffect, useRef } from 'react'
import type { ConversationMessage } from '@/lib/types/conversation'
import { MessageBubble } from './MessageBubble'
import { TypingIndicator } from './TypingIndicator'

interface Props {
  messages: ConversationMessage[]
  isSending: boolean
  isLoading: boolean
}

export function ConversationThread({ messages, isSending, isLoading }: Props) {
  const bottomRef = useRef<HTMLDivElement>(null)
  const liveRef = useRef<HTMLDivElement>(null)

  useEffect(() => {
    bottomRef.current?.scrollIntoView({ behavior: 'smooth' })
  }, [messages, isSending])

  if (isLoading) {
    return (
      <div className="flex-1 flex items-center justify-center text-sm text-slate-400">
        Loading conversation…
      </div>
    )
  }

  if (messages.length === 0 && !isSending) {
    return (
      <div className="flex-1 flex flex-col items-center justify-center gap-2 text-slate-400 py-8">
        <svg className="w-8 h-8" fill="none" stroke="currentColor" viewBox="0 0 24 24" aria-hidden="true">
          <path strokeLinecap="round" strokeLinejoin="round" strokeWidth={1.5}
            d="M8 10h.01M12 10h.01M16 10h.01M9 16H5a2 2 0 01-2-2V6a2 2 0 012-2h14a2 2 0 012 2v8a2 2 0 01-2 2h-5l-5 5v-5z"
          />
        </svg>
        <p className="text-sm">Send a message to start the conversation</p>
      </div>
    )
  }

  const sorted = [...messages].sort((a, b) => a.sequence - b.sequence)

  return (
    <div className="flex-1 overflow-y-auto px-4 py-3 space-y-3">
      {/* Screen-reader live region for new assistant messages */}
      <div ref={liveRef} aria-live="polite" aria-atomic="false" className="sr-only">
        {sorted.filter(m => m.role === 'ASSISTANT').slice(-1)[0]?.content ?? ''}
      </div>

      {sorted.map((msg) => (
        <MessageBubble key={msg.id} message={msg} />
      ))}

      {isSending && <TypingIndicator />}

      <div ref={bottomRef} />
    </div>
  )
}

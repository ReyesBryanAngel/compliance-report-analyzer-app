'use client'

import { useRef, useCallback, KeyboardEvent } from 'react'

const MAX_CHARS = 2000

interface Props {
  value: string
  onChange: (value: string) => void
  onSend: () => void
  isSending: boolean
  disabled?: boolean
  error?: string | null
}

export function MessageComposer({ value, onChange, onSend, isSending, disabled, error }: Props) {
  const textareaRef = useRef<HTMLTextAreaElement>(null)
  const isOverLimit = value.length > MAX_CHARS
  const isEmpty = value.trim().length === 0
  const canSend = !isEmpty && !isOverLimit && !isSending && !disabled

  const handleKeyDown = useCallback(
    (e: KeyboardEvent<HTMLTextAreaElement>) => {
      if (e.key === 'Enter' && (e.ctrlKey || e.metaKey) && canSend) {
        e.preventDefault()
        onSend()
      }
    },
    [canSend, onSend],
  )

  return (
    <div className="border-t border-slate-200 p-3 bg-white">
      {error && (
        <p className="text-xs text-red-600 mb-2 px-1" role="alert">
          {error}
        </p>
      )}
      <div className="flex items-end gap-2">
        <div className="flex-1 relative">
          <textarea
            ref={textareaRef}
            value={value}
            onChange={(e) => onChange(e.target.value)}
            onKeyDown={handleKeyDown}
            disabled={isSending || disabled}
            placeholder="Ask about this report… (Ctrl+Enter to send)"
            rows={1}
            className={`w-full resize-none rounded-xl border px-3 py-2.5 text-sm leading-relaxed outline-none transition-colors
              disabled:opacity-50 disabled:cursor-not-allowed
              ${isOverLimit ? 'border-red-400 focus:border-red-500' : 'border-slate-200 focus:border-indigo-400'}
              max-h-[96px] overflow-y-auto`}
            style={{ fieldSizing: 'content' } as React.CSSProperties}
            aria-label="Message input"
          />
        </div>
        <div className="flex flex-col items-end gap-1 shrink-0">
          <button
            type="submit"
            onClick={onSend}
            disabled={!canSend}
            aria-label="Send message"
            className="px-4 py-2.5 text-sm font-medium text-white bg-indigo-600 hover:bg-indigo-700
              disabled:opacity-40 disabled:cursor-not-allowed rounded-xl transition-colors"
          >
            {isSending ? (
              <span className="flex items-center gap-1.5">
                <span className="w-3 h-3 border-2 border-white/40 border-t-white rounded-full animate-spin" />
                Sending
              </span>
            ) : (
              'Send'
            )}
          </button>
        </div>
      </div>
      <div className={`flex justify-end mt-1 text-[10px] ${isOverLimit ? 'text-red-500' : 'text-slate-400'}`}>
        {value.length} / {MAX_CHARS}
      </div>
    </div>
  )
}

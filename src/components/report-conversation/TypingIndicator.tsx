export function TypingIndicator() {
  return (
    <div className="flex items-start gap-3 px-4 py-3">
      <div
        className="flex items-center gap-1 px-3 py-2.5 bg-slate-100 rounded-2xl rounded-tl-sm"
        aria-label="AI is thinking"
        role="status"
      >
        <span className="w-2 h-2 bg-slate-400 rounded-full animate-bounce [animation-delay:0ms]" />
        <span className="w-2 h-2 bg-slate-400 rounded-full animate-bounce [animation-delay:150ms]" />
        <span className="w-2 h-2 bg-slate-400 rounded-full animate-bounce [animation-delay:300ms]" />
      </div>
    </div>
  )
}

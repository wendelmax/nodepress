"use client"

export function SearchTrigger() {
  return (
    <div
      onClick={() => window.dispatchEvent(new CustomEvent('toggle-command-palette'))}
      className="flex-1 max-w-[480px] hidden sm:flex items-center gap-2 bg-background-tertiary border border-border rounded-xl px-3 h-9 hover:border-primary/30 transition-all duration-200 cursor-pointer"
    >
      <span className="text-sm text-text-muted">🔍</span>
      <span className="text-text-muted text-xs font-medium flex-1 text-left">Search or jump to... </span>
      <kbd className="text-[10px] text-text-muted bg-white/5 px-2 py-0.5 rounded border border-border font-sans font-medium">⌘K</kbd>
    </div>
  )
}

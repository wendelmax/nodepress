"use client"

import { useState, useEffect, useRef, useCallback } from "react"
import { useRouter } from "next/navigation"

interface Command {
  id: string
  label: string
  description?: string
  icon: string
  action: () => void
  keywords?: string[]
}

interface CommandPaletteProps {
  recentPosts?: { id: number; title: string }[]
}

export function CommandPalette({ recentPosts = [] }: CommandPaletteProps) {
  const [open, setOpen] = useState(false)
  const [query, setQuery] = useState("")
  const [selected, setSelected] = useState(0)
  const inputRef = useRef<HTMLInputElement>(null)
  const router = useRouter()

  const commands: Command[] = [
    // Navigation
    { id: "nav-dashboard", label: "Dashboard", icon: "🏠", action: () => router.push("/admin"), keywords: ["home", "início"] },
    { id: "nav-posts", label: "Posts", icon: "📝", action: () => router.push("/admin/posts"), keywords: ["artigos"] },
    { id: "nav-pages", label: "Pages", icon: "📄", action: () => router.push("/admin/pages"), keywords: ["páginas"] },
    { id: "nav-media", label: "Media", icon: "🖼️", action: () => router.push("/admin/media"), keywords: ["mídia", "imagens"] },
    { id: "nav-comments", label: "Comments", icon: "💬", action: () => router.push("/admin/comments"), keywords: ["comentários"] },
    { id: "nav-categories", label: "Categories", icon: "🏷️", action: () => router.push("/admin/categories"), keywords: ["categorias"] },
    { id: "nav-tags", label: "Tags", icon: "🔖", action: () => router.push("/admin/tags") },
    { id: "nav-plugins", label: "Plugins", icon: "🔌", action: () => router.push("/admin/plugins") },
    { id: "nav-themes", label: "Themes", icon: "🎨", action: () => router.push("/admin/themes"), keywords: ["temas"] },
    { id: "nav-users", label: "Users", icon: "👤", action: () => router.push("/admin/users"), keywords: ["usuários"] },
    // Settings
    { id: "nav-settings-general", label: "General Settings", icon: "⚙️", action: () => router.push("/admin/options-general"), keywords: ["configurações gerais"] },
    { id: "nav-settings-reading", label: "Reading Settings", icon: "📖", action: () => router.push("/admin/options-reading"), keywords: ["leitura"] },
    { id: "nav-settings-permalink", label: "Permalink Settings", icon: "🔗", action: () => router.push("/admin/options-permalink"), keywords: ["permalinks", "urls"] },
    { id: "nav-settings-seo", label: "SEO Settings", icon: "🔍", action: () => router.push("/admin/options-seo"), keywords: ["seo"] },
    { id: "nav-settings-ai", label: "AI Settings", icon: "🤖", action: () => router.push("/admin/options-ai"), keywords: ["inteligência artificial"] },
    // Actions
    { id: "action-new-post", label: "New Post", description: "Create a new blog post", icon: "✏️", action: () => router.push("/admin/posts/new"), keywords: ["criar post", "novo post"] },
    { id: "action-new-page", label: "New Page", description: "Create a new page", icon: "📋", action: () => router.push("/admin/pages/new"), keywords: ["criar página"] },
    { id: "action-view-site", label: "View Site", description: "Open the public site", icon: "🌐", action: () => window.open("/", "_blank"), keywords: ["ver site", "frontend"] },
    // Recent posts
    ...recentPosts.map(post => ({
      id: `post-${post.id}`,
      label: post.title,
      description: "Edit post",
      icon: "📝",
      action: () => router.push(`/admin/posts/${post.id}/edit`),
      keywords: ["edit", "editar"],
    })),
  ]

  const filtered = query.trim()
    ? commands.filter(cmd => {
        const q = query.toLowerCase()
        return (
          cmd.label.toLowerCase().includes(q) ||
          cmd.description?.toLowerCase().includes(q) ||
          cmd.keywords?.some(k => k.toLowerCase().includes(q))
        )
      })
    : commands.slice(0, 10) // show top 10 when no query

  const handleKeyDown = useCallback((e: KeyboardEvent) => {
    if ((e.metaKey || e.ctrlKey) && e.key === "k") {
      e.preventDefault()
      setOpen(prev => !prev)
      setQuery("")
      setSelected(0)
    }
    if (e.key === "Escape") {
      setOpen(false)
    }
  }, [])

  useEffect(() => {
    window.addEventListener("keydown", handleKeyDown)
    return () => window.removeEventListener("keydown", handleKeyDown)
  }, [handleKeyDown])

  useEffect(() => {
    if (open) {
      setTimeout(() => inputRef.current?.focus(), 50)
    }
  }, [open])

  const runCommand = (cmd: Command) => {
    cmd.action()
    setOpen(false)
    setQuery("")
  }

  const handleInputKeyDown = (e: React.KeyboardEvent) => {
    if (e.key === "ArrowDown") {
      e.preventDefault()
      setSelected(s => Math.min(s + 1, filtered.length - 1))
    } else if (e.key === "ArrowUp") {
      e.preventDefault()
      setSelected(s => Math.max(s - 1, 0))
    } else if (e.key === "Enter" && filtered[selected]) {
      runCommand(filtered[selected])
    }
  }

  if (!open) return null

  return (
    <>
      {/* Backdrop */}
      <div
        onClick={() => setOpen(false)}
        className="fixed inset-0 bg-black/50 z-[9998] backdrop-blur-sm"
      />

      {/* Palette */}
      <div className="fixed top-[20%] left-1/2 -translate-x-1/2 w-full max-w-[560px] bg-background-secondary border border-border rounded-xl shadow-[0_25px_50px_rgba(0,0,0,0.5)] z-[9999] overflow-hidden">
        {/* Search input */}
        <div className="flex items-center px-4 py-3 border-b border-border bg-background-tertiary">
          <span className="mr-3 text-base text-text-muted">🔍</span>
          <input
            ref={inputRef}
            value={query}
            onChange={e => { setQuery(e.target.value); setSelected(0) }}
            onKeyDown={handleInputKeyDown}
            placeholder="Type a command or search..."
            className="flex-1 border-none outline-none text-base text-text bg-transparent placeholder-text-muted"
          />
          <kbd className="text-[11px] text-text-muted bg-white/5 px-2 py-0.5 rounded border border-border">ESC</kbd>
        </div>

        {/* Results */}
        <div className="max-h-[360px] overflow-y-auto py-2">
          {filtered.length === 0 && (
            <div className="p-6 text-center text-text-muted text-sm">
              No results for &quot;{query}&quot;
            </div>
          )}
          {filtered.map((cmd, i) => (
            <button
              key={cmd.id}
              onClick={() => runCommand(cmd)}
              onMouseEnter={() => setSelected(i)}
              className={`flex items-center w-full px-4 py-2.5 border-none cursor-pointer text-left gap-3 transition-colors ${i === selected ? 'bg-primary/10' : 'bg-transparent'}`}
            >
              <span className="text-lg w-6 shrink-0 text-center">{cmd.icon}</span>
              <div className="flex-1 min-w-0">
                <div className={`text-sm ${i === selected ? 'font-semibold text-primary-light' : 'font-normal text-text'}`}>
                  {cmd.label}
                </div>
                {cmd.description && (
                  <div className="text-xs text-text-secondary mt-0.5">{cmd.description}</div>
                )}
              </div>
            </button>
          ))}
        </div>

        {/* Footer hint */}
        <div className="px-4 py-2 border-t border-border bg-background flex gap-4 text-[11px] text-text-muted">
          <span><kbd className="bg-white/5 px-1 rounded border border-border">↑↓</kbd> navigate</span>
          <span><kbd className="bg-white/5 px-1 rounded border border-border">↵</kbd> select</span>
          <span><kbd className="bg-white/5 px-1 rounded border border-border">Ctrl+K</kbd> toggle</span>
        </div>
      </div>
    </>
  )
}

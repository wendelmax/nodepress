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
        style={{
          position: "fixed", inset: 0, backgroundColor: "rgba(0,0,0,0.5)",
          zIndex: 9998, backdropFilter: "blur(2px)",
        }}
      />

      {/* Palette */}
      <div style={{
        position: "fixed",
        top: "20%",
        left: "50%",
        transform: "translateX(-50%)",
        width: "100%",
        maxWidth: "560px",
        backgroundColor: "#fff",
        borderRadius: "8px",
        boxShadow: "0 25px 50px rgba(0,0,0,0.25)",
        zIndex: 9999,
        overflow: "hidden",
      }}>
        {/* Search input */}
        <div style={{ display: "flex", alignItems: "center", padding: "12px 16px", borderBottom: "1px solid #dcdcde" }}>
          <span style={{ marginRight: "10px", fontSize: "16px", color: "#646970" }}>🔍</span>
          <input
            ref={inputRef}
            value={query}
            onChange={e => { setQuery(e.target.value); setSelected(0) }}
            onKeyDown={handleInputKeyDown}
            placeholder="Type a command or search..."
            style={{
              flex: 1,
              border: "none",
              outline: "none",
              fontSize: "16px",
              color: "#1d2327",
              backgroundColor: "transparent",
            }}
          />
          <kbd style={{
            fontSize: "11px",
            color: "#646970",
            backgroundColor: "#f0f0f1",
            padding: "2px 6px",
            borderRadius: "3px",
            border: "1px solid #dcdcde",
          }}>ESC</kbd>
        </div>

        {/* Results */}
        <div style={{ maxHeight: "360px", overflowY: "auto" }}>
          {filtered.length === 0 && (
            <div style={{ padding: "24px", textAlign: "center", color: "#646970", fontSize: "14px" }}>
              No results for &quot;{query}&quot;
            </div>
          )}
          {filtered.map((cmd, i) => (
            <button
              key={cmd.id}
              onClick={() => runCommand(cmd)}
              onMouseEnter={() => setSelected(i)}
              style={{
                display: "flex",
                alignItems: "center",
                width: "100%",
                padding: "10px 16px",
                border: "none",
                backgroundColor: i === selected ? "#f0f0f1" : "transparent",
                cursor: "pointer",
                textAlign: "left",
                gap: "12px",
                transition: "background-color 0.1s",
              }}
            >
              <span style={{ fontSize: "18px", width: "24px", flexShrink: 0 }}>{cmd.icon}</span>
              <div style={{ flex: 1, minWidth: 0 }}>
                <div style={{ fontSize: "14px", fontWeight: i === selected ? 600 : 400, color: "#1d2327" }}>
                  {cmd.label}
                </div>
                {cmd.description && (
                  <div style={{ fontSize: "12px", color: "#646970" }}>{cmd.description}</div>
                )}
              </div>
            </button>
          ))}
        </div>

        {/* Footer hint */}
        <div style={{
          padding: "8px 16px",
          borderTop: "1px solid #f0f0f1",
          display: "flex",
          gap: "16px",
          fontSize: "11px",
          color: "#646970",
        }}>
          <span><kbd style={{ backgroundColor: "#f0f0f1", padding: "1px 4px", borderRadius: "2px", border: "1px solid #dcdcde" }}>↑↓</kbd> navigate</span>
          <span><kbd style={{ backgroundColor: "#f0f0f1", padding: "1px 4px", borderRadius: "2px", border: "1px solid #dcdcde" }}>↵</kbd> select</span>
          <span><kbd style={{ backgroundColor: "#f0f0f1", padding: "1px 4px", borderRadius: "2px", border: "1px solid #dcdcde" }}>Ctrl+K</kbd> toggle</span>
        </div>
      </div>
    </>
  )
}

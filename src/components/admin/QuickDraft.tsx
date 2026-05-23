"use client"

import { useState } from "react"
import { useRouter } from "next/navigation"
import { GlassButton } from "@/components/admin/GlassButton"

export default function QuickDraft() {
  const router = useRouter()
  const [title, setTitle] = useState("")
  const [content, setContent] = useState("")
  const [isSaving, setIsSaving] = useState(false)
  const [msg, setMsg] = useState<{ type: 'success' | 'error'; text: string } | null>(null)

  const handleSave = async () => {
    if (!title.trim()) {
      setMsg({ type: 'error', text: 'Digite um título para o rascunho.' })
      return
    }
    setIsSaving(true)
    setMsg(null)
    try {
      const res = await fetch('/api/dashboard/quick-draft', {
        method: 'POST',
        headers: { 'Content-Type': 'application/json' },
        body: JSON.stringify({ title, content }),
      })
      const data = await res.json()
      if (!res.ok) throw new Error(data.error || 'Erro ao salvar.')
      setMsg({ type: 'success', text: 'Rascunho salvo! Redirecionando...' })
      setTimeout(() => {
        router.push(`/admin/post?post=${data.id}&action=edit`)
      }, 800)
    } catch (err: any) {
      setMsg({ type: 'error', text: err.message })
      setIsSaving(false)
    }
  }

  return (
    <div className="flex flex-col gap-3">
      {msg && (
        <div className={`text-[11px] px-3 py-2 rounded-xl border ${
          msg.type === 'success'
            ? 'bg-success/10 border-success/20 text-success'
            : 'bg-danger/10 border-danger/20 text-danger'
        }`}>
          {msg.text}
        </div>
      )}

      <input
        value={title}
        onChange={e => setTitle(e.target.value)}
        placeholder="Título do rascunho"
        maxLength={200}
        className="w-full bg-white/5 border border-border rounded-xl px-3 py-2 text-xs text-text outline-none focus:border-primary/40 focus:bg-white/10 transition-all duration-200 placeholder-text-muted"
      />

      <textarea
        value={content}
        onChange={e => setContent(e.target.value)}
        placeholder="O que você está pensando?"
        rows={3}
        className="w-full bg-white/5 border border-border rounded-xl px-3 py-2 text-xs text-text outline-none focus:border-primary/40 focus:bg-white/10 transition-all duration-200 placeholder-text-muted resize-none"
      />

      <GlassButton
        onClick={handleSave}
        disabled={isSaving || !title.trim()}
        className="w-full text-center text-xs py-2 bg-primary/15 border border-primary/20 hover:bg-primary/25 hover:border-primary/40 text-white rounded-xl shadow-glow font-bold mt-1 disabled:opacity-50 disabled:cursor-not-allowed"
      >
        {isSaving ? (
          <span className="flex items-center justify-center gap-2">
            <span className="w-3 h-3 border-2 border-white/40 border-t-white rounded-full animate-spin" />
            Salvando...
          </span>
        ) : 'Salvar rascunho'}
      </GlassButton>
    </div>
  )
}

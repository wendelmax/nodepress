"use client"

import { useEffect, useState } from "react"
import { BookCopy, Copy, Download, Link2, Search, Trash2, Upload } from "lucide-react"
import { LoadingSpinner, StatusMessage } from "@/components/admin/SettingsUI"

type PatternSummary = {
  id: string
  name: string
  description: string
  kind: string
  category: string
  tags: string[]
  version: number
  archived: boolean
  updatedAt: string
}

type PatternPackage = {
  manifest: Record<string, unknown>
  document: unknown
}

const kindLabels: Record<string, string> = {
  component: "Componente",
  section: "Section",
  page: "Página",
  kit: "Kit de site",
}

export default function PatternsPage() {
  const [patterns, setPatterns] = useState<PatternSummary[]>([])
  const [search, setSearch] = useState("")
  const [loading, setLoading] = useState(true)
  const [message, setMessage] = useState<{ type: "success" | "error"; text: string } | null>(null)

  const load = async (term = search) => {
    const response = await fetch(`/api/admin/patterns?search=${encodeURIComponent(term)}`)
    const payload = await response.json()
    if (!response.ok) throw new Error(payload.error || "Falha ao carregar patterns")
    setPatterns(payload.patterns)
  }

  useEffect(() => {
    void Promise.resolve().then(() => load()).catch((error) => setMessage({ type: "error", text: error.message })).finally(() => setLoading(false))
  }, [])

  const copyPattern = async (id: string, mode: "copy" | "reference") => {
    const response = await fetch(`/api/admin/patterns/${id}`)
    const payload = await response.json() as { pattern?: PatternPackage; error?: string }
    if (!response.ok || !payload.pattern) throw new Error(payload.error || "Pattern indisponível")
    const value = mode === "copy"
      ? payload.pattern.document
      : { type: "PatternReference", props: { patternId: payload.pattern.manifest.id } }
    await navigator.clipboard.writeText(JSON.stringify(value, null, 2))
    setMessage({ type: "success", text: mode === "copy" ? "Documento copiado para inserção independente." : "Referência sincronizada copiada." })
  }

  const exportPattern = async (id: string) => {
    const response = await fetch(`/api/admin/patterns/${id}`)
    const payload = await response.json()
    if (!response.ok) throw new Error(payload.error || "Falha ao exportar pattern")
    const blob = new Blob([JSON.stringify(payload.pattern, null, 2)], { type: "application/json" })
    const url = URL.createObjectURL(blob)
    const anchor = document.createElement("a")
    anchor.href = url
    anchor.download = `${id}.nodepress-pattern.json`
    anchor.click()
    URL.revokeObjectURL(url)
  }

  const archivePattern = async (id: string) => {
    if (!window.confirm("Arquivar este pattern? Referências existentes continuarão protegidas.")) return
    const response = await fetch(`/api/admin/patterns/${id}`, { method: "DELETE" })
    const payload = await response.json()
    if (!response.ok) throw new Error(payload.error || "Falha ao arquivar pattern")
    setPatterns((items) => items.filter((item) => item.id !== id))
    setMessage({ type: "success", text: "Pattern arquivado." })
  }

  const seedDefaults = async () => {
    const response = await fetch("/api/admin/patterns/seed", { method: "POST" })
    const payload = await response.json()
    if (!response.ok) throw new Error(payload.error || "Falha ao instalar templates")
    await load()
    setMessage({ type: "success", text: payload.created ? `${payload.created} templates iniciais adicionados.` : "Os templates iniciais já estão instalados." })
  }

  const importPattern = async (file: File) => {
    const body = JSON.parse(await file.text())
    const response = await fetch("/api/admin/patterns", { method: "POST", headers: { "Content-Type": "application/json" }, body: JSON.stringify(body) })
    const payload = await response.json()
    if (!response.ok) throw new Error(payload.error || "Falha ao importar pattern")
    await load()
    setMessage({ type: "success", text: "Pattern importado e validado." })
  }

  if (loading) return <LoadingSpinner />

  return (
    <div className="flex w-full max-w-6xl flex-col gap-6">
      <div className="flex flex-wrap items-start justify-between gap-4 border-b border-border/40 pb-6">
        <div className="flex items-center gap-3">
          <BookCopy size={24} className="text-primary-light" />
          <div>
            <h1 className="text-2xl font-bold text-text">Biblioteca de patterns</h1>
            <p className="mt-1 text-sm text-text-secondary">Reutilize componentes, sections, páginas e kits sem executar código importado.</p>
          </div>
        </div>
        <label className="inline-flex cursor-pointer items-center gap-2 rounded-xl border border-border bg-white/5 px-3 py-2 text-xs text-text-secondary hover:border-primary hover:text-text">
          <Upload size={15} /> Importar JSON
          <input type="file" accept="application/json,.json" className="hidden" onChange={(event) => {
            const file = event.target.files?.[0]
            if (file) void importPattern(file).catch((error) => setMessage({ type: "error", text: error instanceof Error ? error.message : "Falha ao importar pattern" }))
            event.target.value = ""
          }} />
        </label>
      </div>

      {message && <StatusMessage type={message.type} text={message.text} />}

      <form className="flex gap-2" onSubmit={(event) => { event.preventDefault(); void load().catch((error) => setMessage({ type: "error", text: error.message })) }}>
        <div className="relative flex-1">
          <Search size={17} className="absolute left-3 top-1/2 -translate-y-1/2 text-text-muted" />
          <input value={search} onChange={(event) => setSearch(event.target.value)} placeholder="Buscar por nome, slug ou descrição" className="w-full rounded-xl border border-border bg-surface px-10 py-2.5 text-sm text-text outline-none focus:border-primary" />
        </div>
        <button className="rounded-xl bg-primary px-4 py-2 text-sm font-semibold text-white hover:bg-primary-light">Buscar</button>
      </form>

      {patterns.length === 0 ? (
        <div className="rounded-2xl border border-dashed border-border p-10 text-center text-sm text-text-secondary">
          <p>Nenhum pattern disponível.</p>
          <button onClick={() => void seedDefaults().catch((error) => setMessage({ type: "error", text: error.message }))} className="mt-4 rounded-xl bg-primary px-4 py-2 text-xs font-semibold text-white hover:bg-primary-light">Instalar templates iniciais</button>
        </div>
      ) : (
        <div className="grid gap-4 md:grid-cols-2 xl:grid-cols-3">
          {patterns.map((pattern) => (
            <article key={pattern.id} className="flex flex-col rounded-2xl border border-border bg-surface/40 p-5">
              <div className="flex items-start justify-between gap-3">
                <div>
                  <h2 className="font-bold text-text">{pattern.name}</h2>
                  <p className="mt-1 text-xs text-text-muted">{kindLabels[pattern.kind] || pattern.kind} · v{pattern.version}</p>
                </div>
                <button onClick={() => void archivePattern(pattern.id).catch((error) => setMessage({ type: "error", text: error.message }))} className="rounded-lg p-2 text-text-muted hover:bg-red-500/10 hover:text-red-400" aria-label={`Arquivar ${pattern.name}`}><Trash2 size={16} /></button>
              </div>
              <p className="mt-4 min-h-10 text-sm leading-relaxed text-text-secondary">{pattern.description}</p>
              <div className="mt-4 flex flex-wrap gap-1.5">{pattern.tags.map((tag) => <span key={tag} className="rounded-full border border-border px-2 py-0.5 text-[10px] text-text-muted">#{tag}</span>)}</div>
              <div className="mt-5 grid grid-cols-3 gap-2 border-t border-border/60 pt-4">
                <button onClick={() => void copyPattern(pattern.id, "copy").catch((error) => setMessage({ type: "error", text: error.message }))} className="flex items-center justify-center gap-1 rounded-lg border border-border px-2 py-2 text-[11px] text-text-secondary hover:border-primary hover:text-text" title="Copiar documento"><Copy size={14} /> Copiar</button>
                <button onClick={() => void copyPattern(pattern.id, "reference").catch((error) => setMessage({ type: "error", text: error.message }))} className="flex items-center justify-center gap-1 rounded-lg border border-border px-2 py-2 text-[11px] text-text-secondary hover:border-primary hover:text-text" title="Copiar referência sincronizada"><Link2 size={14} /> Referência</button>
                <button onClick={() => void exportPattern(pattern.id).catch((error) => setMessage({ type: "error", text: error.message }))} className="flex items-center justify-center gap-1 rounded-lg border border-border px-2 py-2 text-[11px] text-text-secondary hover:border-primary hover:text-text" title="Exportar JSON"><Download size={14} /> Exportar</button>
              </div>
            </article>
          ))}
        </div>
      )}
    </div>
  )
}

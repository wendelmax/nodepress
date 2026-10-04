"use client"

import { useEffect, useState } from 'react'
import { Eye, FileCode2, Power, Upload } from 'lucide-react'
import { LoadingSpinner, StatusMessage } from '@/components/admin/SettingsUI'

type Template = {
  id: string
  themeSlug: string
  area: string
  name: string
  conditions: Record<string, unknown>
  priority: number
  enabled: boolean
  version: number
}

export default function ThemeTemplatesPage() {
  const [templates, setTemplates] = useState<Template[]>([])
  const [loading, setLoading] = useState(true)
  const [message, setMessage] = useState<{ type: 'success' | 'error'; text: string } | null>(null)

  const load = async () => {
    const response = await fetch('/api/admin/theme-templates')
    const payload = await response.json()
    if (!response.ok) throw new Error(payload.error || 'Falha ao carregar templates')
    setTemplates(payload.templates)
  }

  useEffect(() => {
    void Promise.resolve().then(load).catch((error) => setMessage({ type: 'error', text: error.message })).finally(() => setLoading(false))
  }, [])

  const toggle = async (template: Template) => {
    const response = await fetch(`/api/admin/theme-templates/${template.id}/${template.enabled ? '' : 'activate'}`, { method: template.enabled ? 'DELETE' : 'POST' })
    const payload = await response.json()
    if (!response.ok) throw new Error(payload.error || 'Falha ao atualizar template')
    setTemplates((items) => items.map((item) => item.id === template.id ? payload.template : item))
  }

  const importTemplate = async (file: File) => {
    const body = JSON.parse(await file.text())
    const preview = await fetch('/api/admin/theme-templates/preview', { method: 'POST', headers: { 'Content-Type': 'application/json' }, body: JSON.stringify({ ...body, enabled: false }) })
    const previewPayload = await preview.json()
    if (!preview.ok) throw new Error(previewPayload.error || 'Template inválido')
    const create = await fetch('/api/admin/theme-templates', { method: 'POST', headers: { 'Content-Type': 'application/json' }, body: JSON.stringify(previewPayload.template) })
    const createPayload = await create.json()
    if (!create.ok) throw new Error(createPayload.error || 'Falha ao importar template')
    setTemplates((items) => [...items, createPayload.template])
    setMessage({ type: 'success', text: 'Template validado em preview e importado desativado. Ative-o quando estiver pronto.' })
  }

  if (loading) return <LoadingSpinner />

  return (
    <div className="flex w-full max-w-5xl flex-col gap-6">
      <div className="flex flex-wrap items-start justify-between gap-4 border-b border-border/40 pb-6">
        <div className="flex items-center gap-3"><FileCode2 size={24} className="text-primary-light" /><div><h1 className="text-2xl font-bold text-text">Templates do tema</h1><p className="mt-1 text-sm text-text-secondary">Defina regiões do tema no Builder e ative-as com fallback seguro.</p></div></div>
        <label className="inline-flex cursor-pointer items-center gap-2 rounded-xl border border-border bg-white/5 px-3 py-2 text-xs text-text-secondary hover:border-primary"><Upload size={15} /> Importar template<input type="file" accept="application/json,.json" className="hidden" onChange={(event) => { const file = event.target.files?.[0]; if (file) void importTemplate(file).catch((error) => setMessage({ type: 'error', text: error.message })); event.target.value = '' }} /></label>
      </div>
      {message && <StatusMessage type={message.type} text={message.text} />}
      {templates.length === 0 ? <div className="rounded-2xl border border-dashed border-border p-10 text-center text-sm text-text-secondary">Nenhum template personalizado. Exporte um documento do Builder e importe-o para visualizar antes de ativar.</div> : <div className="grid gap-4 md:grid-cols-2">{templates.map((template) => <article key={template.id} className="rounded-2xl border border-border bg-surface/40 p-5"><div className="flex items-start justify-between gap-4"><div><h2 className="font-bold text-text">{template.name}</h2><p className="mt-1 text-xs text-text-muted">{template.area} · {template.themeSlug} · v{template.version}</p></div><span className={`rounded-full px-2 py-1 text-[10px] font-bold ${template.enabled ? 'bg-success/10 text-success' : 'bg-white/5 text-text-muted'}`}>{template.enabled ? 'Ativo' : 'Desativado'}</span></div><p className="mt-4 text-xs text-text-secondary">Condições: {JSON.stringify(template.conditions)}</p><div className="mt-5 flex gap-2 border-t border-border/60 pt-4"><button onClick={() => setMessage({ type: 'success', text: 'Preview validado no servidor antes da ativação.' })} className="flex items-center gap-1 rounded-lg border border-border px-3 py-2 text-xs text-text-secondary hover:border-primary"><Eye size={14} /> Preview</button><button onClick={() => void toggle(template).catch((error) => setMessage({ type: 'error', text: error.message }))} className="flex items-center gap-1 rounded-lg border border-border px-3 py-2 text-xs text-text-secondary hover:border-primary"><Power size={14} /> {template.enabled ? 'Desativar' : 'Ativar'}</button></div></article>)}</div>}
    </div>
  )
}

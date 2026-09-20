"use client"

import { useEffect, useState } from "react"
import { Plug2 } from "lucide-react"
import { LoadingSpinner, StatusMessage } from "@/components/admin/SettingsUI"

interface PluginInfo {
  id: string
  name: string
  version: string
  active: boolean
}

const descriptions: Record<string, { description: string; author: string }> = {
  animals: {
    description: "Adiciona o tipo de conteúdo de animais, menus administrativos e a página pública de adoção.",
    author: "NodePress Contributors",
  },
}

export default function PluginsPage() {
  const [plugins, setPlugins] = useState<PluginInfo[]>([])
  const [isLoading, setIsLoading] = useState(true)
  const [isUpdating, setIsUpdating] = useState<string | null>(null)
  const [msg, setMsg] = useState<{ type: "success" | "error"; text: string } | null>(null)

  const load = async () => {
    const response = await fetch("/api/admin/plugins")
    const payload = await response.json()
    if (!response.ok) throw new Error(payload.error || "Falha ao carregar plugins")
    setPlugins(payload.plugins)
  }

  useEffect(() => {
    void Promise.resolve().then(load).catch((error) => setMsg({ type: "error", text: error.message })).finally(() => setIsLoading(false))
  }, [])

  const handleToggle = async (plugin: PluginInfo) => {
    setIsUpdating(plugin.id)
    setMsg(null)
    const action = plugin.active ? "deactivate" : "activate"
    try {
      const response = await fetch(`/api/admin/plugins/${plugin.id}/${action}`, { method: "POST" })
      const payload = await response.json()
      if (!response.ok) throw new Error(payload.error || "Falha ao atualizar o plugin")
      setPlugins((current) => current.map((item) => item.id === plugin.id ? payload : item))
      setMsg({ type: "success", text: `Plugin "${plugin.name}" ${plugin.active ? "desativado" : "ativado"} com sucesso.` })
    } catch (error) {
      setMsg({ type: "error", text: error instanceof Error ? error.message : "Falha ao atualizar o plugin." })
    } finally {
      setIsUpdating(null)
    }
  }

  if (isLoading) return <LoadingSpinner />

  return (
    <div className="flex w-full max-w-3xl flex-col gap-6">
      <div className="mb-2 flex items-center gap-3 border-b border-border/40 pb-6">
        <Plug2 size={24} className="text-primary-light" />
        <div>
          <h1 className="text-2xl font-bold text-text">Plugins</h1>
          <p className="mt-1 text-sm text-text-secondary">Extenda o NodePress com módulos versionados e reversíveis.</p>
        </div>
      </div>

      {msg && <StatusMessage type={msg.type} text={msg.text} />}

      <div className="flex flex-col gap-4">
        {plugins.length === 0 && <p className="text-sm text-text-secondary">Nenhum plugin registrado.</p>}
        {plugins.map((plugin) => {
          const metadata = descriptions[plugin.id] || { description: "Plugin NodePress registrado no runtime.", author: "NodePress" }
          const updating = isUpdating === plugin.id
          return (
            <div key={plugin.id} className={`relative flex items-start gap-5 rounded-2xl border p-5 transition-all ${plugin.active ? "border-primary/30 bg-primary/[0.03] shadow-glow" : "border-border bg-surface/40 hover:border-border-strong"} ${updating ? "pointer-events-none opacity-60" : ""}`}>
              <div className={`absolute bottom-4 left-0 top-4 w-0.5 rounded-full ${plugin.active ? "bg-primary" : "bg-border"}`} />
              <div className="min-w-0 flex-1 pl-2">
                <div className="flex flex-wrap items-center gap-2.5">
                  <h3 className="text-sm font-bold text-text">{plugin.name}</h3>
                  <span className="rounded-full border border-border bg-white/5 px-2 py-0.5 text-[10px] text-text-muted">v{plugin.version}</span>
                  <span className={`rounded-full border px-2 py-0.5 text-[10px] font-bold ${plugin.active ? "border-success/20 bg-success/10 text-success" : "border-border bg-white/5 text-text-muted"}`}>{plugin.active ? "● Ativo" : "○ Inativo"}</span>
                </div>
                <p className="mt-1.5 text-xs leading-relaxed text-text-secondary">{metadata.description}</p>
                <p className="mt-2 text-[10px] text-text-muted">Por <strong className="text-text-secondary">{metadata.author}</strong></p>
              </div>
              <button onClick={() => handleToggle(plugin)} disabled={updating} title={plugin.active ? "Desativar" : "Ativar"} className="mt-1 flex-shrink-0 focus:outline-none" aria-label={plugin.active ? `Desativar ${plugin.name}` : `Ativar ${plugin.name}`}>
                <div className={`relative h-6 w-12 rounded-full transition-colors ${plugin.active ? "bg-primary" : "bg-white/10"}`}><div className={`absolute top-0.5 h-5 w-5 rounded-full bg-white shadow-md transition-all ${plugin.active ? "left-6" : "left-0.5"}`} /></div>
              </button>
            </div>
          )
        })}
      </div>
    </div>
  )
}

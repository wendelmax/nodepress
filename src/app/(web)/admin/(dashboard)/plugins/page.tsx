"use client"

import { useState, useEffect } from "react"
import { LoadingSpinner, StatusMessage } from "@/components/admin/SettingsUI"

interface PluginInfo {
  id: string
  name: string
  version: string
  description: string
  author: string
}

const pluginsList: PluginInfo[] = [
  {
    id: "hello-dolly",
    name: "Hello Dolly 🎵",
    version: "1.0.0",
    description: "Injects a random lyric from the famous Hello Dolly song into the admin topbar. An homage to the original WordPress plugin.",
    author: "NodePress Contributors"
  },
  {
    id: "seo-optimizer",
    name: "SEO Optimizer 🔍",
    version: "1.0.0",
    description: "Automatically appends an optimized canonical SEO block to the end of every public post content before frontend rendering.",
    author: "NodePress SEO Team"
  }
]

export default function PluginsPage() {
  const [activePlugins, setActivePlugins] = useState<string[]>([])
  const [isLoading, setIsLoading] = useState(true)
  const [isUpdating, setIsUpdating] = useState<string | null>(null)
  const [msg, setMsg] = useState<{ type: "success" | "error"; text: string } | null>(null)

  useEffect(() => {
    fetch("/api/options?keys=active_plugins")
      .then(res => res.json())
      .then(data => {
        const active = data.active_plugins ? JSON.parse(data.active_plugins) : ["hello-dolly", "seo-optimizer"]
        setActivePlugins(active)
      })
      .catch(() => setActivePlugins(["hello-dolly", "seo-optimizer"]))
      .finally(() => setIsLoading(false))
  }, [])

  const handleToggle = async (pluginId: string) => {
    setIsUpdating(pluginId)
    setMsg(null)
    const wasActive = activePlugins.includes(pluginId)
    const newActive = wasActive
      ? activePlugins.filter(id => id !== pluginId)
      : [...activePlugins, pluginId]

    try {
      const res = await fetch("/api/options", {
        method: "POST",
        headers: { "Content-Type": "application/json" },
        body: JSON.stringify({ active_plugins: JSON.stringify(newActive) })
      })
      if (res.ok) {
        setActivePlugins(newActive)
        const name = pluginsList.find(p => p.id === pluginId)?.name
        setMsg({ type: "success", text: `Plugin "${name}" ${wasActive ? 'desativado' : 'ativado'} com sucesso.` })
      } else {
        throw new Error()
      }
    } catch {
      setMsg({ type: "error", text: "Falha ao atualizar o status do plugin." })
    } finally {
      setIsUpdating(null)
      setTimeout(() => setMsg(null), 4000)
    }
  }

  if (isLoading) return <LoadingSpinner />

  return (
    <div className="flex flex-col gap-6 w-full max-w-3xl">
      {/* Header */}
      <div className="border-b border-border/40 pb-4">
        <h1 className="text-2xl font-bold text-text leading-none">🔌 Plugins</h1>
        <p className="text-xs text-text-secondary mt-1.5">
          Amplie as funcionalidades do NodePress. Ative ou desative ferramentas dinamicamente.
        </p>
      </div>

      {msg && <StatusMessage type={msg.type} text={msg.text} />}

      {/* Plugins list */}
      <div className="flex flex-col gap-4">
        {pluginsList.map(plugin => {
          const isActive = activePlugins.includes(plugin.id)
          const updating = isUpdating === plugin.id

          return (
            <div
              key={plugin.id}
              className={`relative flex items-start gap-5 p-5 rounded-2xl border transition-all duration-200 ${
                isActive
                  ? 'border-primary/30 bg-primary/[0.03] shadow-glow'
                  : 'border-border bg-surface/40 hover:border-border-strong'
              } ${updating ? 'opacity-60 pointer-events-none' : ''}`}
            >
              {/* Left accent */}
              <div className={`absolute left-0 top-4 bottom-4 w-0.5 rounded-full transition-all duration-300 ${isActive ? 'bg-primary' : 'bg-border'}`} />

              {/* Content */}
              <div className="flex-1 min-w-0 pl-2">
                <div className="flex items-center gap-2.5 flex-wrap">
                  <h3 className="font-bold text-sm text-text">{plugin.name}</h3>
                  <span className="text-[10px] bg-white/5 border border-border px-2 py-0.5 rounded-full text-text-muted">
                    v{plugin.version}
                  </span>
                  <span className={`text-[10px] font-bold px-2 py-0.5 rounded-full border ${
                    isActive
                      ? 'bg-success/10 text-success border-success/20'
                      : 'bg-white/5 text-text-muted border-border'
                  }`}>
                    {isActive ? '● Ativo' : '○ Inativo'}
                  </span>
                </div>
                <p className="text-xs text-text-secondary leading-relaxed mt-1.5">{plugin.description}</p>
                <p className="text-[10px] text-text-muted mt-2">Por <strong className="text-text-secondary">{plugin.author}</strong></p>
              </div>

              {/* Toggle switch */}
              <button
                onClick={() => handleToggle(plugin.id)}
                disabled={updating}
                title={isActive ? "Desativar" : "Ativar"}
                className="flex-shrink-0 mt-1 focus:outline-none"
                aria-label={isActive ? `Desativar ${plugin.name}` : `Ativar ${plugin.name}`}
              >
                <div className={`relative w-12 h-6 rounded-full transition-colors duration-300 ${isActive ? 'bg-primary' : 'bg-white/10'}`}>
                  <div className={`absolute top-0.5 w-5 h-5 rounded-full bg-white shadow-md transition-all duration-300 ${isActive ? 'left-6' : 'left-0.5'}`} />
                </div>
              </button>
            </div>
          )
        })}
      </div>
    </div>
  )
}

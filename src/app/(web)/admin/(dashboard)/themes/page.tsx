"use client"

import { useState, useEffect } from "react"
import { LoadingSpinner, StatusMessage } from "@/components/admin/SettingsUI"

type Msg = { type: 'success' | 'error'; text: string } | null

export default function ThemesPage() {
  const [themes, setThemes] = useState<any[]>([])
  const [activeTheme, setActiveTheme] = useState<string>("default")
  const [isLoading, setIsLoading] = useState(true)
  const [isSaving, setIsSaving] = useState(false)
  const [msg, setMsg] = useState<Msg>(null)

  useEffect(() => {
    Promise.all([
      fetch('/api/themes').then(res => res.json()),
      fetch('/api/options?keys=active_theme').then(res => res.json())
    ]).then(([themesData, optionsData]) => {
      setThemes(themesData)
      setActiveTheme(optionsData.active_theme || 'default')
      setIsLoading(false)
    }).catch(() => setIsLoading(false))
  }, [])

  const handleActivate = async (slug: string) => {
    setIsSaving(true)
    try {
      const res = await fetch('/api/options', {
        method: 'POST',
        headers: { 'Content-Type': 'application/json' },
        body: JSON.stringify({ active_theme: slug })
      })
      if (res.ok) {
        setActiveTheme(slug)
        setMsg({ type: 'success', text: `Tema "${slug}" ativado com sucesso!` })
      } else {
        setMsg({ type: 'error', text: 'Falha ao ativar o tema.' })
      }
    } catch {
      setMsg({ type: 'error', text: 'Erro ao ativar o tema.' })
    } finally {
      setIsSaving(false)
      setTimeout(() => setMsg(null), 4000)
    }
  }

  if (isLoading) return <LoadingSpinner />

  return (
    <div className="flex flex-col gap-6 w-full">
      {/* Header */}
      <div className="border-b border-border/40 pb-4">
        <h1 className="text-2xl font-bold text-text leading-none">🎨 Temas</h1>
        <p className="text-xs text-text-secondary mt-1.5">
          Gerencie a aparência do seu site NodePress. O tema ativo é aplicado imediatamente no frontend.
        </p>
      </div>

      {msg && <StatusMessage type={msg.type} text={msg.text} />}

      {themes.length === 0 ? (
        <div className="flex flex-col items-center justify-center py-16 gap-2 text-center bg-surface/40 border border-border rounded-2xl">
          <span className="text-4xl opacity-30">🎨</span>
          <p className="text-sm text-text-muted">Nenhum tema disponível.</p>
        </div>
      ) : (
        <div className="grid grid-cols-1 sm:grid-cols-2 xl:grid-cols-3 gap-5">
          {themes.map(theme => {
            const isActive = activeTheme === theme.slug
            return (
              <div
                key={theme.slug}
                className={`flex flex-col rounded-2xl border overflow-hidden transition-all duration-200 ${
                  isActive
                    ? 'border-primary/50 shadow-glow ring-1 ring-primary/20'
                    : 'border-border hover:border-border-strong'
                }`}
              >
                {/* Theme preview */}
                <div className="relative h-44 bg-background-tertiary flex items-center justify-center overflow-hidden">
                  <span className="text-6xl font-black text-text/10 uppercase tracking-tighter select-none">
                    {theme.slug.substring(0, 2)}
                  </span>
                  {isActive && (
                    <div className="absolute top-3 right-3 flex items-center gap-1.5 bg-primary/90 backdrop-blur-sm text-white text-[10px] font-bold px-2.5 py-1 rounded-full">
                      <div className="w-1.5 h-1.5 rounded-full bg-white animate-pulse" />
                      Ativo
                    </div>
                  )}
                </div>

                {/* Info */}
                <div className="flex flex-col gap-2 p-4 bg-surface/40 flex-1">
                  <h2 className="font-bold text-sm text-text">{theme.name}</h2>
                  <p className="text-[10px] text-text-muted">
                    Por {theme.author} · v{theme.version}
                  </p>
                  <p className="text-xs text-text-secondary leading-relaxed flex-1">{theme.description}</p>

                  <div className="pt-3 border-t border-border/40 flex justify-end">
                    {isActive ? (
                      <span className="text-xs font-bold text-primary-light flex items-center gap-1.5">
                        <span className="w-1.5 h-1.5 rounded-full bg-primary animate-pulse" />
                        Tema Ativo
                      </span>
                    ) : (
                      <button
                        onClick={() => handleActivate(theme.slug)}
                        disabled={isSaving}
                        className="flex items-center gap-2 bg-primary/10 border border-primary/20 text-primary-light hover:bg-primary/20 px-3 py-2 rounded-xl font-semibold text-xs transition-all duration-200 disabled:opacity-50"
                      >
                        {isSaving ? (
                          <div className="w-3 h-3 border-2 border-primary/60 border-t-transparent rounded-full animate-spin" />
                        ) : '⚡'}
                        Ativar
                      </button>
                    )}
                  </div>
                </div>
              </div>
            )
          })}
        </div>
      )}
    </div>
  )
}

"use client"

import { useState, useEffect } from "react"
import { Link2 } from "lucide-react"
import {
  PageHeader, SettingsSection, FieldRow, SaveButton, StatusMessage, LoadingSpinner, inputCls
} from "@/components/admin/SettingsUI"

type Msg = { type: 'success' | 'error'; text: string } | null

const PERMALINK_OPTIONS = [
  { value: '/%postname%/', label: 'Nome do post', example: (url: string) => `${url}/meu-post` },
  { value: '/%year%/%monthnum%/%postname%/', label: 'Mês e nome', example: (url: string) => `${url}/2026/05/meu-post` },
]

export default function OptionsPermalinkPage() {
  const [structure, setStructure] = useState("/%postname%/")
  const [customStructure, setCustomStructure] = useState("")
  const [siteUrl, setSiteUrl] = useState("")
  const [isLoading, setIsLoading] = useState(true)
  const [isSaving, setIsSaving] = useState(false)
  const [msg, setMsg] = useState<Msg>(null)

  useEffect(() => {
    fetch("/api/settings")
      .then(res => res.json())
      .then(data => {
        if (data.permalink_structure) {
          const val = data.permalink_structure
          if (PERMALINK_OPTIONS.some(o => o.value === val)) {
            setStructure(val)
          } else {
            setStructure("custom")
            setCustomStructure(val)
          }
        }
        setSiteUrl(data.siteurl?.replace(/\/$/, '') || (typeof window !== 'undefined' ? window.location.origin : ''))
      })
      .finally(() => setIsLoading(false))
  }, [])

  const handleSubmit = async (e: React.FormEvent) => {
    e.preventDefault()
    setIsSaving(true)
    setMsg(null)
    const finalStructure = structure === "custom" ? customStructure : structure
    try {
      const res = await fetch("/api/settings", {
        method: "POST",
        headers: { "Content-Type": "application/json" },
        body: JSON.stringify({ permalink_structure: finalStructure })
      })
      setMsg({ type: res.ok ? 'success' : 'error', text: res.ok ? 'Estrutura de permalink atualizada com sucesso!' : 'Falha ao atualizar.' })
    } catch {
      setMsg({ type: 'error', text: 'Ocorreu um erro ao salvar.' })
    } finally {
      setIsSaving(false)
      setTimeout(() => setMsg(null), 4000)
    }
  }

  if (isLoading) return <LoadingSpinner />

  return (
    <div className="flex flex-col gap-6 w-full max-w-3xl">
      <PageHeader
        title="Configurações de Permalink"
        subtitle="Defina a estrutura da URL para posts e páginas do seu site NodePress."
      />

      {msg && <StatusMessage type={msg.type} text={msg.text} />}

      <form onSubmit={handleSubmit} className="flex flex-col gap-6 max-w-2xl">
        <SettingsSection title="Configurações Comuns" icon={<Link2 size={18} />}>
          <p className="text-xs text-text-muted">
            Escolha a estrutura de URL que melhor se adapta ao seu conteúdo. Estruturas limpas melhoram SEO e usabilidade.
          </p>

          <div className="flex flex-col gap-2.5">
            {PERMALINK_OPTIONS.map(opt => (
              <label
                key={opt.value}
                className={`flex items-center justify-between gap-4 p-4 rounded-xl border cursor-pointer transition-all duration-200 ${
                  structure === opt.value
                    ? 'border-primary/40 bg-primary/5 shadow-glow'
                    : 'border-border bg-surface/30 hover:border-border-strong'
                }`}
              >
                <div className="flex items-center gap-3">
                  <input
                    type="radio"
                    name="permalink_structure"
                    value={opt.value}
                    checked={structure === opt.value}
                    onChange={e => setStructure(e.target.value)}
                    className="accent-primary"
                  />
                  <span className="text-xs font-semibold text-text">{opt.label}</span>
                </div>
                <code className="text-[10px] text-text-muted bg-background px-2.5 py-1 rounded-lg border border-border font-mono">
                  {opt.example(siteUrl)}
                </code>
              </label>
            ))}

            {/* Custom */}
            <label className={`flex flex-col gap-3 p-4 rounded-xl border cursor-pointer transition-all duration-200 ${
              structure === 'custom'
                ? 'border-primary/40 bg-primary/5 shadow-glow'
                : 'border-border bg-surface/30 hover:border-border-strong'
            }`}>
              <div className="flex items-center gap-3">
                <input
                  type="radio"
                  name="permalink_structure"
                  value="custom"
                  checked={structure === "custom"}
                  onChange={e => setStructure(e.target.value)}
                  className="accent-primary"
                />
                <span className="text-xs font-semibold text-text">Estrutura Personalizada</span>
              </div>
              <input
                type="text"
                value={structure === "custom" ? customStructure : ''}
                onChange={e => { setStructure("custom"); setCustomStructure(e.target.value) }}
                onFocus={() => setStructure("custom")}
                placeholder="/%postname%/"
                className={`${inputCls} max-w-sm ml-6`}
              />
            </label>
          </div>
        </SettingsSection>

        <SaveButton isSaving={isSaving} />
      </form>
    </div>
  )
}

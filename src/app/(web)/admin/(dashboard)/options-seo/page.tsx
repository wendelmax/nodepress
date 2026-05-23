"use client"

import { useState, useEffect } from "react"
import {
  PageHeader, SettingsSection, FieldRow, SaveButton, LoadingSpinner,
  inputCls, textareaCls, StatusMessage
} from "@/components/admin/SettingsUI"

type Msg = { type: 'success' | 'error'; text: string } | null

export default function OptionsSeoPage() {
  const [options, setOptions] = useState({
    seo_site_title: "",
    seo_meta_description: "",
    seo_og_image: "",
    seo_twitter_handle: "",
    analytics_ga4_id: ""
  })
  const [isSaving, setIsSaving] = useState(false)
  const [isLoading, setIsLoading] = useState(true)
  const [isPurging, setIsPurging] = useState(false)
  const [isResetting, setIsResetting] = useState(false)
  const [msg, setMsg] = useState<Msg>(null)

  useEffect(() => {
    fetch('/api/options?keys=seo_site_title,seo_meta_description,seo_og_image,seo_twitter_handle,analytics_ga4_id')
      .then(res => res.json())
      .then(data => {
        setOptions({
          seo_site_title: data.seo_site_title || "",
          seo_meta_description: data.seo_meta_description || "",
          seo_og_image: data.seo_og_image || "",
          seo_twitter_handle: data.seo_twitter_handle || "",
          analytics_ga4_id: data.analytics_ga4_id || ""
        })
        setIsLoading(false)
      })
  }, [])

  const handleSave = async (e: React.FormEvent) => {
    e.preventDefault()
    setIsSaving(true)
    setMsg(null)
    try {
      const res = await fetch('/api/options', {
        method: 'POST',
        headers: { 'Content-Type': 'application/json' },
        body: JSON.stringify(options)
      })
      setMsg({ type: res.ok ? 'success' : 'error', text: res.ok ? 'Configurações de SEO salvas com sucesso!' : 'Falha ao salvar as configurações.' })
    } catch {
      setMsg({ type: 'error', text: 'Erro ao salvar as configurações.' })
    } finally {
      setIsSaving(false)
      setTimeout(() => setMsg(null), 4000)
    }
  }

  const handlePurgeCache = async () => {
    setIsPurging(true)
    try {
      const res = await fetch('/api/revalidate?path=/', { method: 'POST' })
      setMsg({ type: res.ok ? 'success' : 'error', text: res.ok ? 'Cache do site limpo com sucesso!' : 'Falha ao limpar o cache.' })
    } catch {
      setMsg({ type: 'error', text: 'Erro ao limpar cache.' })
    } finally {
      setIsPurging(false)
      setTimeout(() => setMsg(null), 4000)
    }
  }

  const handleResetAnalytics = async () => {
    if (!confirm('Isso vai zerar TODOS os dados de visitantes e visualizações acumulados. Continuar?')) return
    setIsResetting(true)
    try {
      const res = await fetch('/api/analytics/reset', { method: 'POST' })
      setMsg({ type: res.ok ? 'success' : 'error', text: res.ok ? 'Analytics zerado! O rastreamento real começa agora.' : 'Falha ao resetar analytics.' })
    } catch {
      setMsg({ type: 'error', text: 'Erro ao resetar analytics.' })
    } finally {
      setIsResetting(false)
      setTimeout(() => setMsg(null), 5000)
    }
  }

  const set = (key: string, val: string) => setOptions(prev => ({ ...prev, [key]: val }))

  if (isLoading) return <LoadingSpinner />

  return (
    <div className="flex flex-col gap-6 w-full max-w-3xl">
      <PageHeader
        title="SEO & Performance"
        subtitle="Gerencie meta tags, Open Graph, Twitter Cards e Analytics do site."
      />

      {msg && <StatusMessage type={msg.type} text={msg.text} />}

      <form onSubmit={handleSave} className="flex flex-col gap-6">
        <SettingsSection title="Configurações Globais de SEO" icon="🔍">
          <FieldRow label="SEO Title do Site" hint="Se vazio, o Título do Site padrão será utilizado.">
            <input className={inputCls} type="text" value={options.seo_site_title}
              onChange={e => set('seo_site_title', e.target.value)}
              placeholder="Meu Blog — Tecnologia e Notícias" />
          </FieldRow>

          <FieldRow label="Meta Description" hint="Mantenha entre 120–156 caracteres para otimização em mecanismos de busca.">
            <textarea className={textareaCls} value={options.seo_meta_description}
              onChange={e => set('seo_meta_description', e.target.value)}
              placeholder="Uma breve descrição sobre o seu site..." />
          </FieldRow>

          <FieldRow label="URL da Imagem OpenGraph" hint="Usada quando um post/página não tem imagem destacada.">
            <input className={inputCls} type="url" value={options.seo_og_image}
              onChange={e => set('seo_og_image', e.target.value)}
              placeholder="https://exemplo.com/og-default.jpg" />
          </FieldRow>

          <FieldRow label="Twitter Handle">
            <input className={inputCls} type="text" value={options.seo_twitter_handle}
              onChange={e => set('seo_twitter_handle', e.target.value)}
              placeholder="@nodepress" />
          </FieldRow>
        </SettingsSection>

        <SettingsSection title="Analytics & Performance" icon="📊">
          <FieldRow label="Google Analytics 4 ID" hint="Será injetado via @next/third-parties para garantir 100/100 no Core Web Vitals.">
            <input className={inputCls} type="text" value={options.analytics_ga4_id}
              onChange={e => set('analytics_ga4_id', e.target.value)}
              placeholder="G-XXXXXXXXXX" />
          </FieldRow>

          <FieldRow label="Gerenciamento de Cache" hint="Força o Next.js a revalidar as páginas públicas. Use se as últimas alterações não aparecerem no site.">
            <button
              type="button"
              onClick={handlePurgeCache}
              disabled={isPurging}
              className="self-start flex items-center gap-2 bg-danger/10 border border-danger/30 text-danger hover:bg-danger/20 px-4 py-2.5 rounded-xl font-semibold text-xs transition-all duration-200 disabled:opacity-50"
            >
              {isPurging ? (
                <>
                  <div className="w-3.5 h-3.5 border-2 border-danger/60 border-t-transparent rounded-full animate-spin" />
                  Limpando...
                </>
              ) : '🗑️ Limpar Cache do Site'}
            </button>
          </FieldRow>

          <FieldRow label="Resetar Analytics" hint="Zera todos os dados de visitantes e visualizações acumulados. Use para iniciar rastreamento limpo após remover dados de teste.">
            <button
              type="button"
              onClick={handleResetAnalytics}
              disabled={isResetting}
              className="self-start flex items-center gap-2 bg-yellow-500/10 border border-yellow-500/30 text-yellow-400 hover:bg-yellow-500/20 px-4 py-2.5 rounded-xl font-semibold text-xs transition-all duration-200 disabled:opacity-50"
            >
              {isResetting ? (
                <>
                  <div className="w-3.5 h-3.5 border-2 border-yellow-400/60 border-t-transparent rounded-full animate-spin" />
                  Resetando...
                </>
              ) : '♻️ Zerar Dados de Analytics'}
            </button>
          </FieldRow>
        </SettingsSection>

        <SaveButton isSaving={isSaving} />
      </form>
    </div>
  )
}

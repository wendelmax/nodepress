'use client'

import { useEffect, useState } from 'react'
import { Save, ShieldCheck } from 'lucide-react'
import { FieldRow, inputCls, PageHeader, SaveButton, SettingsSection, StatusMessage } from '@/components/admin/SettingsUI'
import { DEFAULT_CONSENT_CONFIG, type ConsentConfig } from './consent-service'

export function SettingsPage() {
  const [config, setConfig] = useState<ConsentConfig>(DEFAULT_CONSENT_CONFIG)
  const [loading, setLoading] = useState(true)
  const [saving, setSaving] = useState(false)
  const [message, setMessage] = useState<{ type: 'success' | 'error'; text: string } | null>(null)

  useEffect(() => {
    void fetch('/api/plugins/lgpd-consent/config')
      .then(async (response) => {
        if (!response.ok) throw new Error('Não foi possível carregar a configuração.')
        setConfig(await response.json() as ConsentConfig)
      })
      .catch((error) => setMessage({ type: 'error', text: error instanceof Error ? error.message : 'Falha ao carregar.' }))
      .finally(() => setLoading(false))
  }, [])

  async function save(event: React.FormEvent<HTMLFormElement>) {
    event.preventDefault()
    setSaving(true)
    setMessage(null)
    try {
      const response = await fetch('/api/plugins/lgpd-consent/config', {
        method: 'POST',
        headers: { 'Content-Type': 'application/json' },
        body: JSON.stringify(config),
      })
      const payload = await response.json()
      if (!response.ok) throw new Error(payload.error || 'Não foi possível salvar a configuração.')
      setConfig(payload as ConsentConfig)
      setMessage({ type: 'success', text: 'Configuração de consentimento salva.' })
    } catch (error) {
      setMessage({ type: 'error', text: error instanceof Error ? error.message : 'Falha ao salvar.' })
    } finally {
      setSaving(false)
    }
  }

  if (loading) return <div className="h-64 animate-pulse rounded-2xl bg-surface/40" aria-label="Carregando" />

  return (
    <form onSubmit={save} className="flex w-full max-w-3xl flex-col gap-6">
      <PageHeader title="Consentimento LGPD" subtitle="Controle a política exibida aos visitantes e a retenção do registro mínimo de decisões." />
      {message && <StatusMessage {...message} />}
      <SettingsSection title="Política de consentimento" icon={<ShieldCheck size={18} />}>
        <FieldRow label="Versão da política" hint="Altere quando a política de privacidade mudar; isso solicitará uma nova escolha.">
          <input className={inputCls} value={config.policyVersion} onChange={(event) => setConfig({ ...config, policyVersion: event.target.value })} maxLength={64} required />
        </FieldRow>
        <FieldRow label="URL da política" hint="Link público para a política de privacidade do site.">
          <input className={inputCls} type="url" value={config.policyUrl} onChange={(event) => setConfig({ ...config, policyUrl: event.target.value })} placeholder="https://exemplo.com/privacidade" />
        </FieldRow>
        <FieldRow label="Retenção (dias)" hint="O ledger armazena apenas versão, categorias, idioma e data da decisão.">
          <input className={inputCls} type="number" min={1} max={3650} value={config.retentionDays} onChange={(event) => setConfig({ ...config, retentionDays: Number(event.target.value) })} required />
        </FieldRow>
      </SettingsSection>
      <div><SaveButton isSaving={saving} label="Salvar política" /></div>
    </form>
  )
}

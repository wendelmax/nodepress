"use client"

import { useState, useEffect } from "react"
import { Card } from "@/components/admin/Card"
import { HardDrive, Eye, EyeOff, Plug2, CheckCircle2, XCircle, Cloud, Server } from "lucide-react"

interface StorageSettings {
  storage_driver: string
  s3_access_key: string
  s3_secret_key: string
  s3_bucket: string
  s3_region: string
  s3_endpoint: string
  s3_public_url: string
  optimize_webp: string
}

const DEFAULT_SETTINGS: StorageSettings = {
  storage_driver: 'local',
  s3_access_key: '',
  s3_secret_key: '',
  s3_bucket: '',
  s3_region: '',
  s3_endpoint: '',
  s3_public_url: '',
  optimize_webp: 'true',
}

type StatusMsg = { type: 'success' | 'error' | 'info'; text: string } | null

const PROVIDER_PRESETS = [
  { id: 'aws', label: 'Amazon S3', region: 'us-east-1', endpoint: '' },
  { id: 'r2', label: 'Cloudflare R2', region: 'auto', endpoint: 'https://<ACCOUNT_ID>.r2.cloudflarestorage.com' },
  { id: 'do', label: 'DigitalOcean Spaces', region: 'nyc3', endpoint: 'https://nyc3.digitaloceanspaces.com' },
  { id: 'minio', label: 'MinIO', region: 'us-east-1', endpoint: 'http://localhost:9000' },
  { id: 'backblaze', label: 'Backblaze B2', region: 's3.us-west-004', endpoint: 'https://s3.us-west-004.backblazeb2.com' },
]

export default function StorageSettingsPage() {
  const [settings, setSettings] = useState<StorageSettings>(DEFAULT_SETTINGS)
  const [isLoading, setIsLoading] = useState(true)
  const [isSaving, setIsSaving] = useState(false)
  const [isTesting, setIsTesting] = useState(false)
  const [saveMsg, setSaveMsg] = useState<StatusMsg>(null)
  const [testMsg, setTestMsg] = useState<StatusMsg>(null)
  const [showSecret, setShowSecret] = useState(false)

  useEffect(() => {
    const fetchSettings = async () => {
      try {
        const res = await fetch('/api/settings')
        if (res.ok) {
          const data = await res.json()
          setSettings(prev => ({ ...prev, ...data }))
        }
      } catch { /* silent */ } finally {
        setIsLoading(false)
      }
    }
    fetchSettings()
  }, [])

  const set = (key: keyof StorageSettings, value: string) =>
    setSettings(prev => ({ ...prev, [key]: value }))

  const applyPreset = (preset: typeof PROVIDER_PRESETS[0]) => {
    setSettings(prev => ({
      ...prev,
      s3_region: preset.region,
      s3_endpoint: preset.endpoint,
    }))
  }

  const handleTest = async () => {
    setIsTesting(true)
    setTestMsg(null)
    try {
      const res = await fetch('/api/storage/test-connection', {
        method: 'POST',
        headers: { 'Content-Type': 'application/json' },
        body: JSON.stringify({
          driver: settings.storage_driver,
          s3_access_key: settings.s3_access_key,
          s3_secret_key: settings.s3_secret_key,
          s3_bucket: settings.s3_bucket,
          s3_region: settings.s3_region,
          s3_endpoint: settings.s3_endpoint,
          s3_public_url: settings.s3_public_url,
        }),
      })
      const data = await res.json()
      setTestMsg({ type: res.ok && data.success ? 'success' : 'error', text: data.message })
    } catch (err: any) {
      setTestMsg({ type: 'error', text: err.message || 'Erro ao testar conexão.' })
    } finally {
      setIsTesting(false)
    }
  }

  const handleSave = async (e: React.FormEvent) => {
    e.preventDefault()
    setIsSaving(true)
    setSaveMsg(null)
    try {
      const res = await fetch('/api/settings', {
        method: 'POST',
        headers: { 'Content-Type': 'application/json' },
        body: JSON.stringify(settings),
      })
      if (res.ok) {
        setSaveMsg({ type: 'success', text: 'Configurações de armazenamento salvas com sucesso! O novo provider está ativo imediatamente.' })
        await fetch('/api/storage/test-connection', { method: 'OPTIONS' }).catch(() => {})
      } else {
        setSaveMsg({ type: 'error', text: 'Falha ao salvar as configurações.' })
      }
    } catch {
      setSaveMsg({ type: 'error', text: 'Erro de rede ao salvar.' })
    } finally {
      setIsSaving(false)
    }
  }

  if (isLoading) {
    return (
      <div className="flex items-center justify-center h-64">
        <div className="w-8 h-8 border-2 border-primary border-t-transparent rounded-full animate-spin" />
      </div>
    )
  }

  const isS3 = settings.storage_driver === 's3'

  return (
    <div className="flex flex-col gap-6 w-full max-w-3xl">
      {/* ── Header ── */}
      <div className="border-b border-border/40 pb-4">
        <h1 className="text-2xl font-bold text-text leading-none">Armazenamento de Mídia</h1>
        <p className="text-xs text-text-secondary mt-1.5">
          Configure onde os arquivos enviados pela Biblioteca de Mídia serão armazenados.
          Troque de provider a qualquer momento — arquivos existentes continuam acessíveis.
        </p>
      </div>

      <form onSubmit={handleSave} className="flex flex-col gap-6">
        {/* ── Driver Selector ── */}
        <Card className="p-6">
          <h2 className="text-sm font-bold text-text mb-4 flex items-center gap-2">
            <HardDrive size={18} /> Provider de Armazenamento
          </h2>

          <div className="grid grid-cols-2 gap-3">
            {/* Local Option */}
            <label className={`relative flex flex-col gap-2 p-4 rounded-2xl border cursor-pointer transition-all duration-200 ${
              !isS3 ? 'border-primary/40 bg-primary/5 shadow-glow' : 'border-border bg-surface/30 hover:border-border-strong'
            }`}>
              <input
                type="radio"
                name="storage_driver"
                value="local"
                checked={!isS3}
                onChange={() => set('storage_driver', 'local')}
                className="sr-only"
              />
              <div className="flex items-center gap-3">
                <div className={`w-4 h-4 rounded-full border-2 flex items-center justify-center flex-shrink-0 transition-all ${!isS3 ? 'border-primary bg-primary' : 'border-border'}`}>
                  {!isS3 && <div className="w-1.5 h-1.5 rounded-full bg-white" />}
                </div>
                <Server size={20} />
                <span className="font-semibold text-sm text-text">Armazenamento Local</span>
              </div>
              <p className="text-[11px] text-text-muted leading-relaxed pl-7">
                Arquivos salvos em <code className="bg-white/5 px-1 rounded text-primary-light">public/uploads/</code> no servidor.
              </p>
            </label>

            {/* S3 Option */}
            <label className={`relative flex flex-col gap-2 p-4 rounded-2xl border cursor-pointer transition-all duration-200 ${
              isS3 ? 'border-primary/40 bg-primary/5 shadow-glow' : 'border-border bg-surface/30 hover:border-border-strong'
            }`}>
              <input
                type="radio"
                name="storage_driver"
                value="s3"
                checked={isS3}
                onChange={() => set('storage_driver', 's3')}
                className="sr-only"
              />
              <div className="flex items-center gap-3">
                <div className={`w-4 h-4 rounded-full border-2 flex items-center justify-center flex-shrink-0 transition-all ${isS3 ? 'border-primary bg-primary' : 'border-border'}`}>
                  {isS3 && <div className="w-1.5 h-1.5 rounded-full bg-white" />}
                </div>
                <Cloud size={20} />
                <span className="font-semibold text-sm text-text">S3 / Cloud Storage</span>
              </div>
              <p className="text-[11px] text-text-muted leading-relaxed pl-7">
                AWS S3, Cloudflare R2, MinIO, DigitalOcean Spaces e compatíveis.
              </p>
            </label>
          </div>
        </Card>

        {/* ── S3 Configuration ── */}
        {isS3 && (
          <Card className="p-6 flex flex-col gap-5">
            <div className="flex items-center justify-between">
              <h2 className="text-sm font-bold text-text flex items-center gap-2">
                <Cloud size={18} /> Configuração S3
              </h2>

              {/* Provider presets */}
              <div className="flex flex-wrap gap-1.5">
                {PROVIDER_PRESETS.map(preset => (
                  <button
                    key={preset.id}
                    type="button"
                    onClick={() => applyPreset(preset)}
                    className="px-2.5 py-1 rounded-lg text-[10px] font-semibold bg-white/5 border border-border text-text-secondary hover:bg-primary/10 hover:border-primary/20 hover:text-primary transition-all duration-150"
                  >
                    {preset.label}
                  </button>
                ))}
              </div>
            </div>

            <div className="grid grid-cols-1 md:grid-cols-2 gap-4">
              <Field
                label="Access Key ID"
                required
                placeholder="AKIAIOSFODNN7EXAMPLE"
                value={settings.s3_access_key}
                onChange={v => set('s3_access_key', v)}
                type="text"
              />
              <div className="flex flex-col gap-1.5">
                <label className="text-xs font-semibold text-text-secondary">
                  Secret Access Key <span className="text-danger">*</span>
                </label>
                <div className="relative">
                  <input
                    type={showSecret ? 'text' : 'password'}
                    required
                    placeholder="wJalrXUtnFEMI/K7MDENG/bPxRfiCYEXAMPLEKEY"
                    value={settings.s3_secret_key}
                    onChange={e => set('s3_secret_key', e.target.value)}
                    className="w-full bg-background border border-border text-text text-xs rounded-xl px-3 py-2.5 pr-10 focus:outline-none focus:border-primary/50 focus:shadow-glow transition-all placeholder:text-text-muted font-mono"
                  />
                  <button
                    type="button"
                    onClick={() => setShowSecret(v => !v)}
                    className="absolute right-3 top-1/2 -translate-y-1/2 text-text-muted hover:text-text-secondary text-xs transition-colors"
                  >
                    {showSecret ? <EyeOff size={16} /> : <Eye size={16} />}
                  </button>
                </div>
              </div>

              <Field
                label="Bucket Name"
                required
                placeholder="my-nodepress-media"
                value={settings.s3_bucket}
                onChange={v => set('s3_bucket', v)}
              />
              <Field
                label="Região"
                required
                placeholder="us-east-1"
                value={settings.s3_region}
                onChange={v => set('s3_region', v)}
              />
              <Field
                label="Endpoint Customizado"
                placeholder="https://<account>.r2.cloudflarestorage.com"
                hint="Opcional — necessário para R2, MinIO, Spaces"
                value={settings.s3_endpoint}
                onChange={v => set('s3_endpoint', v)}
              />
              <Field
                label="URL Pública / CDN"
                placeholder="https://cdn.seusite.com"
                hint="Opcional — substitui a URL padrão do bucket por um domínio personalizado"
                value={settings.s3_public_url}
                onChange={v => set('s3_public_url', v)}
              />
            </div>

            {/* Test connection */}
            <div className="flex flex-col gap-2 pt-1 border-t border-border/40">
              {testMsg && (
                <div className={`flex items-start gap-2 text-xs p-3 rounded-xl border ${
                  testMsg.type === 'success'
                    ? 'bg-success/10 border-success/20 text-success'
                    : 'bg-danger/10 border-danger/20 text-danger'
                }`}>
                  {testMsg.type === 'success' ? <CheckCircle2 size={16} /> : <XCircle size={16} />}
                  <span>{testMsg.text}</span>
                </div>
              )}
              <button
                type="button"
                onClick={handleTest}
                disabled={isTesting}
                className="self-start flex items-center gap-2 bg-white/5 border border-border text-text-secondary hover:bg-white/10 hover:text-white px-4 py-2.5 rounded-xl font-semibold text-xs transition-all duration-200 disabled:opacity-50"
              >
                {isTesting ? (
                  <>
                    <div className="w-3.5 h-3.5 border-2 border-current border-t-transparent rounded-full animate-spin" />
                    Testando...
                  </>
                ) : (
                  <> <Plug2 size={14} /> Testar Conexão</>
                )}
              </button>
            </div>
          </Card>
        )}

        {/* ── WebP Optimization ── */}
        <Card className="p-6">
          <h2 className="text-sm font-bold text-text mb-4 flex items-center gap-2">
            Otimização de Imagens
          </h2>
          <label className="flex items-start gap-3 cursor-pointer">
            <input 
              type="checkbox" 
              checked={settings.optimize_webp === 'true'} 
              onChange={e => set('optimize_webp', e.target.checked ? 'true' : 'false')}
              className="mt-1 w-4 h-4 rounded border-border bg-black/50 text-primary focus:ring-primary/50" 
            />
            <div className="flex flex-col">
              <span className="font-semibold text-sm text-text">Converter imagens para WebP automaticamente</span>
              <span className="text-[11px] text-text-muted mt-1 leading-relaxed">
                Ao fazer upload de arquivos JPG ou PNG, o sistema irá automaticamente converter e comprimir a imagem para o formato WebP. Isso reduz o peso do arquivo em até 80% sem perda de qualidade, melhorando a velocidade do seu site no Google (Pagespeed).
              </span>
            </div>
          </label>
        </Card>

        {/* ── Info Notice ── */}
        <div className="flex items-start gap-3 bg-white/[0.02] border border-border/40 rounded-2xl p-4 text-xs text-text-muted">
          <span className="flex-shrink-0 text-base">ℹ️</span>
          <div>
            <span className="font-semibold text-text-secondary block mb-0.5">Sobre a troca de provider</span>
            Arquivos já enviados continuam acessíveis pelas URLs salvas no banco de dados.
            Apenas novos uploads irão para o provider selecionado. Migração de arquivos existentes pode ser feita manualmente.
          </div>
        </div>

        {/* ── Save Button ── */}
        <div className="flex flex-col gap-3">
          {saveMsg && (
            <div className={`flex items-start gap-2 text-xs p-3 rounded-xl border ${
              saveMsg.type === 'success'
                ? 'bg-success/10 border-success/20 text-success'
                : 'bg-danger/10 border-danger/20 text-danger'
            }`}>
              <span>{saveMsg.type === 'success' ? '✓' : '✕'}</span>
              <span>{saveMsg.text}</span>
            </div>
          )}

          <div className="flex items-center gap-3">
            <button
              type="submit"
              disabled={isSaving}
              className="flex items-center gap-2 bg-primary-gradient text-white font-semibold text-xs px-6 py-3 rounded-xl hover:shadow-neon transition-all duration-200 disabled:opacity-60"
            >
              {isSaving ? (
                <>
                  <div className="w-3.5 h-3.5 border-2 border-white/60 border-t-transparent rounded-full animate-spin" />
                  Salvando...
                </>
              ) : (
                '💾 Salvar Configurações'
              )}
            </button>

            <span className="text-[11px] text-text-muted">
              Provider ativo: <span className={`font-bold ${isS3 ? 'text-accent-cyan' : 'text-success'}`}>
                {isS3 ? '☁️ S3 / Cloud' : '🖥️ Local'}
              </span>
            </span>
          </div>
        </div>
      </form>
    </div>
  )
}

// ── Reusable field component ──────────────────────────────────
function Field({
  label, placeholder, value, onChange, required, hint, type = 'text',
}: {
  label: string
  placeholder?: string
  value: string
  onChange: (v: string) => void
  required?: boolean
  hint?: string
  type?: string
}) {
  return (
    <div className="flex flex-col gap-1.5">
      <label className="text-xs font-semibold text-text-secondary">
        {label} {required && <span className="text-danger">*</span>}
      </label>
      <input
        type={type}
        required={required}
        placeholder={placeholder}
        value={value}
        onChange={e => onChange(e.target.value)}
        className="w-full bg-background border border-border text-text text-xs rounded-xl px-3 py-2.5 focus:outline-none focus:border-primary/50 focus:shadow-glow transition-all placeholder:text-text-muted"
      />
      {hint && <p className="text-[10px] text-text-muted leading-relaxed">{hint}</p>}
    </div>
  )
}

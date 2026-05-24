"use client"

import { useState, useEffect } from "react"
import { Bot, Eye, EyeOff, Plug2, CheckCircle2, XCircle } from "lucide-react"
import {
  PageHeader, SettingsSection, FieldRow, SaveButton, StatusMessage, LoadingSpinner,
  inputCls, selectCls, textareaCls
} from "@/components/admin/SettingsUI"

interface ProviderInfo {
  id: string
  name: string
  requiresApiKey: boolean
  defaultModel: string
  knownModels: string[]
}

type Msg = { type: 'success' | 'error'; text: string } | null

export default function OptionsAIPage() {
  const [providers, setProviders] = useState<ProviderInfo[]>([])
  const [selectedProvider, setSelectedProvider] = useState("")
  const [apiKey, setApiKey] = useState("")
  const [showKey, setShowKey] = useState(false)
  const [model, setModel] = useState("")
  const [baseUrl, setBaseUrl] = useState("")
  const [testPrompt, setTestPrompt] = useState("Say 'NodePress AI is working!' in one sentence.")
  const [testResult, setTestResult] = useState<string | null>(null)
  const [testSuccess, setTestSuccess] = useState<boolean | null>(null)
  const [isTesting, setIsTesting] = useState(false)
  const [isSaving, setIsSaving] = useState(false)
  const [isLoading, setIsLoading] = useState(true)
  const [msg, setMsg] = useState<Msg>(null)

  const currentProvider = providers.find(p => p.id === selectedProvider)

  useEffect(() => {
    Promise.all([
      fetch("/api/ai/providers").then(r => r.json()),
      fetch("/api/settings").then(r => r.json()),
    ]).then(([provData, settings]) => {
      if (provData.providers) setProviders(provData.providers)
      if (settings.ai_provider) setSelectedProvider(settings.ai_provider)
      if (settings.ai_api_key) setApiKey(settings.ai_api_key)
      if (settings.ai_model) setModel(settings.ai_model)
      if (settings.ai_base_url) setBaseUrl(settings.ai_base_url)
    }).finally(() => setIsLoading(false))
  }, [])

  const handleProviderChange = (id: string) => {
    setSelectedProvider(id)
    const p = providers.find(pr => pr.id === id)
    if (p) setModel(p.defaultModel)
  }

  const handleSave = async (e: React.FormEvent) => {
    e.preventDefault()
    setIsSaving(true)
    setMsg(null)
    const res = await fetch("/api/settings", {
      method: "POST",
      headers: { "Content-Type": "application/json" },
      body: JSON.stringify({ ai_provider: selectedProvider, ai_api_key: apiKey, ai_model: model, ai_base_url: baseUrl }),
    })
    setIsSaving(false)
    setMsg(res.ok
      ? { type: 'success', text: 'Configurações de AI salvas com sucesso!' }
      : { type: 'error', text: 'Falha ao salvar as configurações.' }
    )
    setTimeout(() => setMsg(null), 4000)
  }

  const handleTest = async () => {
    setIsTesting(true)
    setTestResult(null)
    setTestSuccess(null)
    try {
      const res = await fetch("/api/ai/generate", {
        method: "POST",
        headers: { "Content-Type": "application/json" },
        body: JSON.stringify({ prompt: testPrompt }),
      })
      const data = await res.json()
      if (res.ok) {
        setTestResult(`[${data.provider} / ${data.model}]\n\n${data.result}`)
        setTestSuccess(true)
      } else {
        setTestResult(`Erro: ${data.error}`)
        setTestSuccess(false)
      }
    } catch (err: any) {
      setTestResult(err.message)
      setTestSuccess(false)
    } finally {
      setIsTesting(false)
    }
  }

  if (isLoading) return <LoadingSpinner />

  return (
    <div className="flex flex-col gap-6 w-full max-w-3xl">
      <PageHeader
        title="Configurações de AI"
        subtitle="Conecte um provedor de AI para habilitar o Assistente AI dentro do editor de posts."
      />

      {msg && <StatusMessage type={msg.type} text={msg.text} />}

      <form onSubmit={handleSave} className="flex flex-col gap-6">
        <SettingsSection title="Provedor de AI" icon={<Bot size={18} />}>
          <FieldRow label="Provedor" hint="Ollama funciona localmente — sem necessidade de chave de API.">
            <select
              className={selectCls}
              value={selectedProvider}
              onChange={e => handleProviderChange(e.target.value)}
            >
              <option value="">— Selecione um provedor —</option>
              {providers.map(p => (
                <option key={p.id} value={p.id}>{p.name}</option>
              ))}
            </select>
          </FieldRow>

          {currentProvider?.requiresApiKey && (
            <FieldRow label="Chave de API" hint="Armazenada de forma segura no banco de dados. Nunca exposta ao navegador.">
              <div className="relative max-w-md">
                <input
                  type={showKey ? 'text' : 'password'}
                  value={apiKey}
                  onChange={e => setApiKey(e.target.value)}
                  placeholder="sk-..."
                  className={`${inputCls} pr-10`}
                />
                <button
                  type="button"
                  onClick={() => setShowKey(v => !v)}
                  className="absolute right-3 top-1/2 -translate-y-1/2 text-text-muted hover:text-text-secondary transition-colors"
                >
                  {showKey ? <EyeOff size={16} /> : <Eye size={16} />}
                </button>
              </div>
            </FieldRow>
          )}

          {currentProvider && (
            <>
              <FieldRow label="Modelo">
                <div className="flex flex-col gap-2 max-w-md">
                  <select
                    className={selectCls}
                    value={model}
                    onChange={e => setModel(e.target.value)}
                  >
                    {currentProvider.knownModels.map(m => (
                      <option key={m} value={m}>{m}</option>
                    ))}
                  </select>
                  <input
                    type="text"
                    value={model}
                    onChange={e => setModel(e.target.value)}
                    placeholder="Nome do modelo personalizado"
                    className={inputCls}
                  />
                  <p className="text-[11px] text-text-muted">Digite abaixo um modelo personalizado que não esteja na lista.</p>
                </div>
              </FieldRow>

              <FieldRow
                label="URL Base (opcional)"
                hint="Substitui o endpoint da API. Útil para Ollama, Azure OpenAI, Groq, LM Studio e outros serviços compatíveis com OpenAI."
              >
                <input
                  type="text"
                  value={baseUrl}
                  onChange={e => setBaseUrl(e.target.value)}
                  placeholder={selectedProvider === 'ollama' ? 'http://localhost:11434' : 'https://api.openai.com/v1'}
                  className={inputCls}
                />
              </FieldRow>
            </>
          )}
        </SettingsSection>

        <SaveButton isSaving={isSaving} label="Salvar Configurações" />
      </form>

      {/* Test connection */}
      {selectedProvider && (
        <SettingsSection title="Testar Conexão" icon={<Plug2 size={18} />}>
          <p className="text-xs text-text-muted mb-4">
            Salve as configurações primeiro e depois teste a conexão com o provedor.
          </p>

          <textarea
            value={testPrompt}
            onChange={e => setTestPrompt(e.target.value)}
            rows={2}
            className={textareaCls}
          />

          <button
            type="button"
            onClick={handleTest}
            disabled={isTesting}
            className="mt-4 self-start flex items-center gap-2 bg-success/10 border border-success/20 text-success hover:bg-success/20 px-4 py-2.5 rounded-xl font-semibold text-xs transition-all duration-200 disabled:opacity-50"
          >
            {isTesting ? (
              <>
                <div className="w-3.5 h-3.5 border-2 border-success/60 border-t-transparent rounded-full animate-spin" />
                Testando...
              </>
            ) : '▶ Executar Teste'}
          </button>

          {testResult && (
            <div className={`mt-4 p-4 rounded-xl text-xs border whitespace-pre-wrap font-mono ${
              testSuccess === false ? 'bg-danger/10 border-danger/20 text-danger' : 'bg-success/5 border-success/20 text-text-secondary'
            }`}>
              <div className="flex items-center gap-2 mb-2 font-bold uppercase tracking-wider">
                {testSuccess === false ? <XCircle size={16} /> : <CheckCircle2 size={16} />}
                {testSuccess === false ? 'Falha no Teste' : 'Teste Bem-sucedido'}
              </div>
              {testResult}
            </div>
          )}
        </SettingsSection>
      )}
    </div>
  )
}

"use client"

import { useState, useEffect } from "react"

interface ProviderInfo {
  id: string
  name: string
  requiresApiKey: boolean
  defaultModel: string
  knownModels: string[]
}

const inputStyle = {
  width: '100%',
  maxWidth: '400px',
  padding: '6px 8px',
  border: '1px solid #8c8f94',
  borderRadius: '3px',
  fontSize: '13px',
}

const labelStyle = {
  fontWeight: 600,
  color: '#2c3338',
  fontSize: '14px',
}

const descStyle = {
  fontSize: '12px',
  color: '#646970',
  marginTop: '4px',
}

export default function OptionsAIPage() {
  const [providers, setProviders] = useState<ProviderInfo[]>([])
  const [selectedProvider, setSelectedProvider] = useState("")
  const [apiKey, setApiKey] = useState("")
  const [model, setModel] = useState("")
  const [baseUrl, setBaseUrl] = useState("")
  const [testPrompt, setTestPrompt] = useState("Say 'NodePress AI is working!' in one sentence.")
  const [testResult, setTestResult] = useState("")
  const [isTesting, setIsTesting] = useState(false)
  const [isSaving, setIsSaving] = useState(false)
  const [isLoading, setIsLoading] = useState(true)
  const [message, setMessage] = useState<{ type: 'success' | 'error'; text: string } | null>(null)

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

  // When provider changes, reset model to its default
  const handleProviderChange = (id: string) => {
    setSelectedProvider(id)
    const p = providers.find(pr => pr.id === id)
    if (p) setModel(p.defaultModel)
  }

  const handleSave = async (e: React.FormEvent) => {
    e.preventDefault()
    setIsSaving(true)
    setMessage(null)
    const res = await fetch("/api/settings", {
      method: "POST",
      headers: { "Content-Type": "application/json" },
      body: JSON.stringify({
        ai_provider: selectedProvider,
        ai_api_key: apiKey,
        ai_model: model,
        ai_base_url: baseUrl,
      }),
    })
    setIsSaving(false)
    setMessage(res.ok
      ? { type: 'success', text: 'AI settings saved.' }
      : { type: 'error', text: 'Failed to save settings.' }
    )
    setTimeout(() => setMessage(null), 3000)
  }

  const handleTest = async () => {
    setIsTesting(true)
    setTestResult("")
    try {
      const res = await fetch("/api/ai/generate", {
        method: "POST",
        headers: { "Content-Type": "application/json" },
        body: JSON.stringify({ prompt: testPrompt }),
      })
      const data = await res.json()
      if (res.ok) {
        setTestResult(`✅ [${data.provider} / ${data.model}]\n\n${data.result}`)
      } else {
        setTestResult(`❌ Error: ${data.error}`)
      }
    } catch (err: any) {
      setTestResult(`❌ ${err.message}`)
    } finally {
      setIsTesting(false)
    }
  }

  if (isLoading) return <div style={{ padding: '20px' }}>Loading AI settings...</div>

  return (
    <div style={{ maxWidth: '800px' }}>
      <h1 style={{ fontSize: '23px', fontWeight: 400, margin: 0, padding: '9px 15px 4px 0', marginBottom: '8px' }}>
        AI Settings
      </h1>
      <p style={{ color: '#646970', marginBottom: '24px', fontSize: '14px' }}>
        Connect any AI provider to power the NodePress AI Assistant inside the post editor.
        Your API key is stored in the database and never exposed to the frontend.
      </p>

      {message && (
        <div style={{
          borderLeft: `4px solid ${message.type === 'success' ? '#00a32a' : '#d63638'}`,
          backgroundColor: '#fff',
          padding: '12px',
          marginBottom: '20px',
          boxShadow: '0 1px 1px rgba(0,0,0,.04)'
        }}>
          <p style={{ margin: 0 }}>{message.text}</p>
        </div>
      )}

      <form onSubmit={handleSave}>
        <table style={{ width: '100%', borderCollapse: 'collapse', textAlign: 'left' }}>
          <tbody>
            {/* Provider */}
            <tr style={{ borderBottom: '1px solid #f0f0f1' }}>
              <th style={{ padding: '20px 10px 20px 0', width: '220px', verticalAlign: 'top', ...labelStyle }}>
                <label>AI Provider</label>
              </th>
              <td style={{ padding: '20px 10px' }}>
                <select
                  value={selectedProvider}
                  onChange={e => handleProviderChange(e.target.value)}
                  style={{ ...inputStyle, maxWidth: '220px' }}
                >
                  <option value="">— Select a provider —</option>
                  {providers.map(p => (
                    <option key={p.id} value={p.id}>{p.name}</option>
                  ))}
                </select>
                <p style={descStyle}>
                  Choose which AI service to use. <strong>Ollama</strong> runs locally (no API key needed).
                </p>
              </td>
            </tr>

            {/* API Key */}
            {currentProvider && currentProvider.requiresApiKey && (
              <tr style={{ borderBottom: '1px solid #f0f0f1' }}>
                <th style={{ padding: '20px 10px 20px 0', verticalAlign: 'top', ...labelStyle }}>
                  <label>API Key</label>
                </th>
                <td style={{ padding: '20px 10px' }}>
                  <input
                    type="password"
                    value={apiKey}
                    onChange={e => setApiKey(e.target.value)}
                    placeholder="sk-..."
                    style={inputStyle}
                  />
                  <p style={descStyle}>Stored securely in the database. Never sent to the browser.</p>
                </td>
              </tr>
            )}

            {/* Model */}
            {currentProvider && (
              <tr style={{ borderBottom: '1px solid #f0f0f1' }}>
                <th style={{ padding: '20px 10px 20px 0', verticalAlign: 'top', ...labelStyle }}>
                  <label>Model</label>
                </th>
                <td style={{ padding: '20px 10px' }}>
                  <select
                    value={model}
                    onChange={e => setModel(e.target.value)}
                    style={{ ...inputStyle, maxWidth: '280px' }}
                  >
                    {currentProvider.knownModels.map(m => (
                      <option key={m} value={m}>{m}</option>
                    ))}
                  </select>
                  <p style={descStyle}>
                    Or type a custom model name below if it&apos;s not in the list.
                  </p>
                  <input
                    type="text"
                    value={model}
                    onChange={e => setModel(e.target.value)}
                    placeholder="Custom model name"
                    style={{ ...inputStyle, marginTop: '8px' }}
                  />
                </td>
              </tr>
            )}

            {/* Base URL (optional, for OpenAI-compatible endpoints) */}
            {currentProvider && (
              <tr style={{ borderBottom: '1px solid #f0f0f1' }}>
                <th style={{ padding: '20px 10px 20px 0', verticalAlign: 'top', ...labelStyle }}>
                  <label>Base URL <span style={{ fontWeight: 400, color: '#646970' }}>(optional)</span></label>
                </th>
                <td style={{ padding: '20px 10px' }}>
                  <input
                    type="text"
                    value={baseUrl}
                    onChange={e => setBaseUrl(e.target.value)}
                    placeholder={
                      selectedProvider === 'ollama'
                        ? 'http://localhost:11434'
                        : 'https://api.openai.com/v1'
                    }
                    style={inputStyle}
                  />
                  <p style={descStyle}>
                    Override the API endpoint. Useful for Ollama, Azure OpenAI, Groq, Together AI, LM Studio, and other OpenAI-compatible services.
                  </p>
                </td>
              </tr>
            )}
          </tbody>
        </table>

        <div style={{ marginTop: '20px' }}>
          <button
            type="submit"
            disabled={isSaving || !selectedProvider}
            style={{
              backgroundColor: '#2271b1',
              color: 'white',
              border: 'none',
              padding: '6px 12px',
              borderRadius: '3px',
              cursor: isSaving ? 'not-allowed' : 'pointer',
              fontSize: '13px',
            }}
          >
            {isSaving ? 'Saving...' : 'Save Settings'}
          </button>
        </div>
      </form>

      {/* Connection Test */}
      {selectedProvider && (
        <div style={{ marginTop: '40px', padding: '20px', backgroundColor: '#f6f7f7', border: '1px solid #dcdcde', borderRadius: '4px' }}>
          <h2 style={{ fontSize: '16px', fontWeight: 600, marginBottom: '12px', color: '#1d2327' }}>
            Test Connection
          </h2>
          <p style={{ fontSize: '13px', color: '#646970', marginBottom: '12px' }}>
            Make sure you save your settings first, then test the connection.
          </p>
          <textarea
            value={testPrompt}
            onChange={e => setTestPrompt(e.target.value)}
            rows={2}
            style={{ width: '100%', padding: '8px', border: '1px solid #8c8f94', borderRadius: '3px', fontSize: '13px', resize: 'vertical' }}
          />
          <button
            type="button"
            onClick={handleTest}
            disabled={isTesting}
            style={{
              marginTop: '8px',
              backgroundColor: isTesting ? '#8c8f94' : '#00a32a',
              color: 'white',
              border: 'none',
              padding: '6px 12px',
              borderRadius: '3px',
              cursor: isTesting ? 'not-allowed' : 'pointer',
              fontSize: '13px',
            }}
          >
            {isTesting ? 'Testing...' : '▶ Run Test'}
          </button>

          {testResult && (
            <pre style={{
              marginTop: '12px',
              padding: '12px',
              backgroundColor: '#fff',
              border: '1px solid #dcdcde',
              borderRadius: '3px',
              fontSize: '13px',
              whiteSpace: 'pre-wrap',
              wordBreak: 'break-word',
              color: testResult.startsWith('❌') ? '#d63638' : '#1d2327',
            }}>
              {testResult}
            </pre>
          )}
        </div>
      )}
    </div>
  )
}

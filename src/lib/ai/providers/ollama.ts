import { AIProvider, AIProviderConfig, AIGenerateOptions } from '../types'

/**
 * Ollama provider — run AI models locally.
 * Install from: https://ollama.com
 * No API key required. baseUrl defaults to http://localhost:11434
 */
export const ollamaProvider: AIProvider = {
  id: 'ollama',
  name: 'Ollama (Local)',
  requiresApiKey: false,
  defaultModel: 'llama3.2',
  knownModels: ['llama3.2', 'llama3.1', 'mistral', 'qwen2.5', 'phi3', 'gemma2', 'deepseek-r1'],

  async generate(prompt, config, options = {}) {
    const baseUrl = config.baseUrl?.replace(/\/$/, '') || 'http://localhost:11434'
    const model = config.model || this.defaultModel

    const messages: any[] = []
    if (options.systemPrompt) {
      messages.push({ role: 'system', content: options.systemPrompt })
    }
    messages.push({ role: 'user', content: prompt })

    // Ollama supports OpenAI-compatible /v1/chat/completions endpoint
    const response = await fetch(`${baseUrl}/v1/chat/completions`, {
      method: 'POST',
      headers: { 'Content-Type': 'application/json' },
      body: JSON.stringify({
        model,
        messages,
        stream: false,
        options: {
          num_predict: options.maxTokens ?? 2048,
          temperature: options.temperature ?? 0.7,
        },
      }),
    })

    if (!response.ok) {
      const err = await response.text()
      throw new Error(`Ollama error (${response.status}): ${err}`)
    }

    const data = await response.json()
    return data.choices?.[0]?.message?.content ?? ''
  }
}

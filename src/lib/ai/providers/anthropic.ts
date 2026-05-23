import { AIProvider, AIProviderConfig, AIGenerateOptions } from '../types'

/**
 * Anthropic Claude provider.
 * Get an API key at: https://console.anthropic.com
 */
export const anthropicProvider: AIProvider = {
  id: 'anthropic',
  name: 'Anthropic Claude',
  requiresApiKey: true,
  defaultModel: 'claude-3-5-haiku-20241022',
  knownModels: [
    'claude-opus-4-5',
    'claude-sonnet-4-5',
    'claude-3-5-haiku-20241022',
    'claude-3-5-sonnet-20241022',
    'claude-3-opus-20240229',
  ],

  async generate(prompt, config, options = {}) {
    const model = config.model || this.defaultModel
    const baseUrl = config.baseUrl?.replace(/\/$/, '') || 'https://api.anthropic.com/v1'

    const body: any = {
      model,
      max_tokens: options.maxTokens ?? 2048,
      messages: [{ role: 'user', content: prompt }],
    }

    if (options.systemPrompt) {
      body.system = options.systemPrompt
    }

    const response = await fetch(`${baseUrl}/messages`, {
      method: 'POST',
      headers: {
        'Content-Type': 'application/json',
        'x-api-key': config.apiKey,
        'anthropic-version': '2023-06-01',
      },
      body: JSON.stringify(body),
    })

    if (!response.ok) {
      const err = await response.text()
      throw new Error(`Anthropic API error (${response.status}): ${err}`)
    }

    const data = await response.json()
    return data.content?.[0]?.text ?? ''
  }
}

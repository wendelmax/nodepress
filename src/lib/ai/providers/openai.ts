import { AIProvider, AIProviderConfig, AIGenerateOptions } from '../types'

/**
 * OpenAI provider — also works with any OpenAI-compatible endpoint:
 * - Azure OpenAI
 * - Groq
 * - Together AI
 * - LM Studio
 * - LocalAI
 * Just set a custom baseUrl in the AI settings.
 */
export const openaiProvider: AIProvider = {
  id: 'openai',
  name: 'OpenAI',
  requiresApiKey: true,
  defaultModel: 'gpt-4o-mini',
  knownModels: ['gpt-4o', 'gpt-4o-mini', 'gpt-4-turbo', 'gpt-3.5-turbo'],

  async generate(prompt, config, options = {}) {
    const baseUrl = config.baseUrl?.replace(/\/$/, '') || 'https://api.openai.com/v1'
    const model = config.model || this.defaultModel

    const messages: any[] = []
    if (options.systemPrompt) {
      messages.push({ role: 'system', content: options.systemPrompt })
    }
    messages.push({ role: 'user', content: prompt })

    const response = await fetch(`${baseUrl}/chat/completions`, {
      method: 'POST',
      headers: {
        'Content-Type': 'application/json',
        'Authorization': `Bearer ${config.apiKey}`,
      },
      body: JSON.stringify({
        model,
        messages,
        max_tokens: options.maxTokens ?? 2048,
        temperature: options.temperature ?? 0.7,
      }),
    })

    if (!response.ok) {
      const err = await response.text()
      throw new Error(`OpenAI API error (${response.status}): ${err}`)
    }

    const data = await response.json()
    return data.choices?.[0]?.message?.content ?? ''
  }
}

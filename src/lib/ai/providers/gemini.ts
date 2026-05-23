import { AIProvider, AIProviderConfig, AIGenerateOptions } from '../types'

/**
 * Google Gemini provider via REST API.
 * Get a free API key at: https://aistudio.google.com
 */
export const geminiProvider: AIProvider = {
  id: 'gemini',
  name: 'Google Gemini',
  requiresApiKey: true,
  defaultModel: 'gemini-1.5-flash',
  knownModels: ['gemini-2.0-flash', 'gemini-1.5-pro', 'gemini-1.5-flash', 'gemini-1.0-pro'],

  async generate(prompt, config, options = {}) {
    const model = config.model || this.defaultModel
    const baseUrl = `https://generativelanguage.googleapis.com/v1beta/models/${model}:generateContent`

    const parts: any[] = []
    if (options.systemPrompt) {
      parts.push({ text: `${options.systemPrompt}\n\n` })
    }
    parts.push({ text: prompt })

    const response = await fetch(`${baseUrl}?key=${config.apiKey}`, {
      method: 'POST',
      headers: { 'Content-Type': 'application/json' },
      body: JSON.stringify({
        contents: [{ parts }],
        generationConfig: {
          maxOutputTokens: options.maxTokens ?? 2048,
          temperature: options.temperature ?? 0.7,
        },
      }),
    })

    if (!response.ok) {
      const err = await response.text()
      throw new Error(`Gemini API error (${response.status}): ${err}`)
    }

    const data = await response.json()
    return data.candidates?.[0]?.content?.parts?.[0]?.text ?? ''
  }
}

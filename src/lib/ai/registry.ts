import { AIProvider, AISettings } from './types'
import { openaiProvider } from './providers/openai'
import { geminiProvider } from './providers/gemini'
import { anthropicProvider } from './providers/anthropic'
import { ollamaProvider } from './providers/ollama'
import { OptionService } from '@/services/option.service'

/**
 * Provider Registry
 *
 * To add a new AI provider to NodePress:
 * 1. Create a file in src/lib/ai/providers/your-provider.ts
 * 2. Implement the AIProvider interface
 * 3. Add it to this registry
 * 4. It will automatically appear in the AI settings page
 */
export const AI_PROVIDERS: Record<string, AIProvider> = {
  [openaiProvider.id]: openaiProvider,
  [geminiProvider.id]: geminiProvider,
  [anthropicProvider.id]: anthropicProvider,
  [ollamaProvider.id]: ollamaProvider,
}

/**
 * Returns all registered providers (for the settings dropdown).
 */
export function getAvailableProviders(): AIProvider[] {
  return Object.values(AI_PROVIDERS)
}

/**
 * Reads AI settings from the database and resolves the active provider.
 * Returns null if no provider is configured.
 */
export async function getActiveAIProvider(): Promise<{
  provider: AIProvider
  settings: AISettings
} | null> {
  const options = await OptionService.getOptions([
    'ai_provider',
    'ai_api_key',
    'ai_model',
    'ai_base_url',
  ])

  const providerId = options['ai_provider']
  if (!providerId) return null

  const provider = AI_PROVIDERS[providerId]
  if (!provider) return null

  // Require API key unless it's a local provider (like Ollama)
  if (provider.requiresApiKey && !options['ai_api_key']) return null

  return {
    provider,
    settings: {
      ai_provider: providerId,
      ai_api_key: options['ai_api_key'] || '',
      ai_model: options['ai_model'] || provider.defaultModel,
      ai_base_url: options['ai_base_url'] || '',
    },
  }
}

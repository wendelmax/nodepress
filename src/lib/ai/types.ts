/**
 * NodePress AI Provider Interface
 *
 * Any AI integration must implement this interface.
 * Providers are registered in src/lib/ai/registry.ts and
 * configured by the admin in Settings > AI.
 */

export interface AIGenerateOptions {
  /** Max tokens to generate */
  maxTokens?: number
  /** Temperature (0-1). Higher = more creative */
  temperature?: number
  /** System prompt to prepend */
  systemPrompt?: string
}

export interface AIProvider {
  /** Display name shown in admin settings */
  readonly name: string
  /** Unique identifier used in np_options */
  readonly id: string
  /** Whether this provider requires an API key */
  readonly requiresApiKey: boolean
  /** Default model for this provider */
  readonly defaultModel: string
  /** List of well-known models (for the dropdown in settings) */
  readonly knownModels: string[]

  /**
   * Generate a text response for the given prompt.
   * The provider receives the configured API key, model, and base URL.
   */
  generate(
    prompt: string,
    config: AIProviderConfig,
    options?: AIGenerateOptions
  ): Promise<string>
}

export interface AIProviderConfig {
  apiKey: string
  model: string
  /** Optional: override the API base URL (useful for OpenAI-compatible endpoints) */
  baseUrl?: string
}

/** Shape stored in np_options */
export interface AISettings {
  ai_provider: string    // provider id, e.g. 'openai'
  ai_api_key: string     // encrypted or plain API key
  ai_model: string       // e.g. 'gpt-4o'
  ai_base_url: string    // optional custom endpoint
}

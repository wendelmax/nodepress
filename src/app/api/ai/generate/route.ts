import { NextResponse } from 'next/server'
import { auth } from "@/auth"
import { getActiveAIProvider } from '@/lib/ai/registry'
import { AIGenerateOptions } from '@/lib/ai/types'
import {
  checkRateLimit,
  validatePrompt,
  validateSystemPrompt,
  sanitizeAIOutput,
  auditLog,
  NODEPRESS_SYSTEM_PROMPT,
} from '@/lib/ai/security'

export async function POST(request: Request) {
  // ── Layer 1: Authentication ──────────────────────────────────────────────
  const session = await auth()
  if (!session || !session.user) {
    auditLog('UNAUTHORIZED_ACCESS', { errorType: 'no_session' })
    return NextResponse.json({ error: 'Unauthorized' }, { status: 401 })
  }

  const userId = (session.user as any).id?.toString() ?? session.user.email ?? 'unknown'

  // ── Layer 2: Rate Limiting ───────────────────────────────────────────────
  const rateCheck = checkRateLimit(userId)
  if (!rateCheck.allowed) {
    auditLog('RATE_LIMITED', { userId, errorType: 'rate_limit' })
    return NextResponse.json(
      { error: `Too many requests. Please wait ${rateCheck.retryAfterSeconds} seconds.` },
      {
        status: 429,
        headers: { 'Retry-After': String(rateCheck.retryAfterSeconds) },
      }
    )
  }

  try {
    const body = await request.json()
    const { prompt, options }: { prompt: string; options?: AIGenerateOptions } = body

    // ── Layer 3: Input Validation ──────────────────────────────────────────
    const promptValidation = validatePrompt(prompt)
    if (!promptValidation.valid) {
      auditLog('INPUT_REJECTED', { userId, errorType: 'invalid_prompt', promptPreview: prompt?.slice(0, 80) })
      return NextResponse.json({ error: promptValidation.reason }, { status: 400 })
    }

    const sysPromptValidation = validateSystemPrompt(options?.systemPrompt)
    if (!sysPromptValidation.valid) {
      auditLog('INPUT_REJECTED', { userId, errorType: 'invalid_system_prompt' })
      return NextResponse.json({ error: sysPromptValidation.reason }, { status: 400 })
    }

    // ── Layer 4: Provider Resolution ─────────────────────────────────────
    const active = await getActiveAIProvider()
    if (!active) {
      return NextResponse.json(
        { error: 'No AI provider configured. Go to Settings > AI to set one up.' },
        { status: 503 }
      )
    }

    const { provider, settings } = active

    // ── Layer 5: Guardrails — Enforce NodePress system prompt ─────────────
    // Merge our mandatory system prompt with any optional caller-provided one.
    // Ours always comes FIRST so it cannot be overridden.
    const safeSystemPrompt = options?.systemPrompt
      ? `${NODEPRESS_SYSTEM_PROMPT}\n\nAdditional context:\n${options.systemPrompt}`
      : NODEPRESS_SYSTEM_PROMPT

    // Enforce hard caps on tokens to prevent runaway costs
    const safeOptions: AIGenerateOptions = {
      ...options,
      systemPrompt: safeSystemPrompt,
      maxTokens: Math.min(options?.maxTokens ?? 1024, 4096), // cap at 4096
      temperature: Math.min(Math.max(options?.temperature ?? 0.7, 0), 1), // clamp 0-1
    }

    auditLog('GENERATE_START', {
      userId,
      provider: provider.id,
      model: settings.ai_model,
      promptLength: prompt.length,
      promptPreview: prompt.slice(0, 80),
    })

    const rawResult = await provider.generate(
      prompt,
      {
        apiKey: settings.ai_api_key,
        model: settings.ai_model,
        baseUrl: settings.ai_base_url || undefined,
      },
      safeOptions
    )

    // ── Layer 6: Output Sanitization ─────────────────────────────────────
    const result = sanitizeAIOutput(rawResult)

    auditLog('GENERATE_SUCCESS', {
      userId,
      provider: provider.id,
      model: settings.ai_model,
      success: true,
    })

    return NextResponse.json({ result, provider: provider.name, model: settings.ai_model })

  } catch (error: any) {
    auditLog('GENERATE_ERROR', { userId, errorType: error?.message?.slice(0, 100), success: false })
    console.error('[AI Generate Error]', error)

    // Never expose raw provider errors to the client (may contain sensitive info)
    const safeMessage = error?.message?.includes('API')
      ? 'AI provider returned an error. Check your API key and model settings.'
      : 'AI generation failed. Please try again.'

    return NextResponse.json({ error: safeMessage }, { status: 500 })
  }
}

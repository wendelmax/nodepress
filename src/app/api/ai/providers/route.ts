import { NextResponse } from 'next/server'
import { auth } from "@/auth"
import { getAvailableProviders } from '@/lib/ai/registry'

/** Returns the list of available providers for the settings UI */
export async function GET() {
  const session = await auth()
  if (!session || !session.user) {
    return NextResponse.json({ error: 'Unauthorized' }, { status: 401 })
  }

  const providers = getAvailableProviders().map(p => ({
    id: p.id,
    name: p.name,
    requiresApiKey: p.requiresApiKey,
    defaultModel: p.defaultModel,
    knownModels: p.knownModels,
  }))

  return NextResponse.json({ providers })
}

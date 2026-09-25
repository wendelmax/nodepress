import { NextResponse } from 'next/server'
import { createNodePressContext } from '@/core/context'
import { ensureActivePluginsLoaded } from '@/services/plugin-factory'
import { dispatchPluginRoute } from '@/plugins/runtime-consumers'

async function handle(request: Request) {
  await ensureActivePluginsLoaded()
  const response = await dispatchPluginRoute(request, createNodePressContext())

  return response ?? NextResponse.json(
    { code: 'not_found', message: 'Plugin route not found' },
    { status: 404 },
  )
}

export const GET = handle
export const POST = handle
export const PUT = handle
export const PATCH = handle
export const DELETE = handle

import { requireAdmin } from '@/app/api/admin/plugins/_shared'
import { getLandingPageService } from '@/plugins/landing-pages/factory'
import type { LandingPageInput, LandingPageUpdate } from '@/plugins/landing-pages/service'

export { getLandingPageService }

export async function requireLandingPageAdmin() {
  return requireAdmin()
}

export function parseLandingPageInput(body: Record<string, unknown>): LandingPageInput {
  return {
    title: typeof body.title === 'string' ? body.title : '',
    slug: typeof body.slug === 'string' ? body.slug : undefined,
    document: (body.document ?? {}) as Record<string, unknown>,
    status: body.status === 'publish' || body.status === 'archived' ? body.status : 'draft',
    publishAt: body.publishAt === null || typeof body.publishAt === 'string' ? body.publishAt : undefined,
    timezone: typeof body.timezone === 'string' ? body.timezone : undefined,
    seo: body.seo && typeof body.seo === 'object' && !Array.isArray(body.seo)
      ? body.seo as Record<string, unknown>
      : undefined,
  }
}

export function parseLandingPageUpdate(body: Record<string, unknown>): LandingPageUpdate {
  return parseLandingPageInput(body)
}

export function errorResponse(error: unknown, fallback = 'Invalid landing page request'): Response {
  const message = error instanceof Error ? error.message : fallback
  const status = /not found/i.test(message) ? 404 : 400
  return Response.json({ code: 'landing_page_error', message }, { status })
}

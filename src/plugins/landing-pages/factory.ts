import { PrismaContentRepository } from '@/modules/content'
import { createPluginStorage } from '@/plugins/storage'
import { LandingPageService } from './service'

const globalForLandingPages = globalThis as typeof globalThis & {
  __nodePressLandingPageService?: LandingPageService
}

export function getLandingPageService(): LandingPageService {
  if (!globalForLandingPages.__nodePressLandingPageService) {
    const previewSecret = process.env.LANDING_PAGES_PREVIEW_SECRET
      || process.env.AUTH_SECRET
      || process.env.NEXTAUTH_SECRET
    if (!previewSecret) throw new Error('Landing pages preview secret is not configured')

    globalForLandingPages.__nodePressLandingPageService = new LandingPageService({
      repository: new PrismaContentRepository(),
      revisions: createPluginStorage('landing-pages'),
      previewSecret,
    })
  }

  return globalForLandingPages.__nodePressLandingPageService
}

import type { ContentTypeDefinition } from '@/modules/content'
import type { NodePressPlugin } from '../types'

export const landingPageContentType: ContentTypeDefinition = {
  id: 'landing-page',
  label: 'Landing pages',
  version: '1.0.0',
  fields: {
    document: { type: 'json', required: true },
    publishAt: { type: 'date' },
    timezone: { type: 'text', required: true },
    seo: { type: 'json' },
  },
}

export const landingPagesPlugin: NodePressPlugin = {
  id: 'landing-pages',
  name: 'Landing Pages',
  version: '1.0.0',
  permissions: ['landing-pages.manage', 'landing-pages.preview', 'landing-pages.settings'],
  register({ contentTypes, menus }) {
    contentTypes.register(landingPageContentType)
    menus.addAdmin({
      id: 'landing-pages',
      label: 'Landing pages',
      href: '/admin/landing-pages',
      icon: 'PanelsTopLeft',
      capability: 'landing-pages.manage',
      position: 35,
    })
  },
}

export default landingPagesPlugin

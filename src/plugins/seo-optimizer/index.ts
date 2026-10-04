import React from 'react'
import type { NodePressPlugin } from '../types'
import { SeoBreadcrumbs } from './breadcrumbs'

export const seoOptimizerPlugin: NodePressPlugin = {
  id: 'seo-optimizer',
  name: 'SEO Suite',
  version: '1.0.0',
  permissions: ['seo.manage', 'slots.register'],
  register({ menus, slots }) {
    menus.addAdmin({
      id: 'seo-suite',
      label: 'SEO Suite',
      href: '/admin/settings/seo',
      icon: 'Search',
      capability: 'seo.manage',
      position: 80,
    })
    slots.register({
      id: 'theme.breadcrumbs',
      surface: 'public',
      render: (props) => React.createElement(SeoBreadcrumbs, {
        postTitle: String(props.postTitle ?? ''),
        isPage: Boolean(props.isPage),
        categories: Array.isArray(props.categories) ? props.categories as Array<{ slug: string; name: string }> : [],
      }),
    })
  },
}

export default seoOptimizerPlugin

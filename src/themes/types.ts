import React from 'react'
import type { MenuNode } from '@/services/menu.types'

export interface ThemeMeta {
  name: string
  description: string
  author: string
  version: string
  slug: string
}

export interface ThemeRenderContext {
  options: Record<string, string>
  menus: MenuNode[]
}

export interface NodePressTheme {
  meta: ThemeMeta
  supportsPluginMenus?: boolean
  SinglePost: React.ComponentType<{ post: any, categories?: any[], tags?: any[], initialComments?: any[], options?: any }>
  SinglePage: React.ComponentType<{ post: any, options?: any }>
  Archive: React.ComponentType<{ posts: any[], title?: string, options?: any }>
  NotFound?: React.ComponentType<{ options?: any }>
}

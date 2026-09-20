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

export interface ThemeRenderOptions {
  [key: string]: unknown
  menus: MenuNode[]
}

export interface NodePressTheme {
  meta: ThemeMeta
  supportsPluginMenus?: boolean
  SinglePost: React.ComponentType<{ post: any, categories?: any[], tags?: any[], initialComments?: any[], options?: ThemeRenderOptions }>
  SinglePage: React.ComponentType<{ post: any, options?: ThemeRenderOptions }>
  Archive: React.ComponentType<{ posts: any[], title?: string, options?: ThemeRenderOptions }>
  NotFound?: React.ComponentType<{ options?: ThemeRenderOptions }>
}

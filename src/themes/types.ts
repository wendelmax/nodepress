import React from 'react'
import type { MenuNode } from '@/services/menu.types'

export const THEME_ACTION_SLOTS = [
  'theme_head',
  'theme_footer',
  'before_post_content',
  'after_post_content',
] as const

export const THEME_ACTION_SLOTS_VERSION = 1

export type ThemeActionSlot = typeof THEME_ACTION_SLOTS[number]

export function isThemeActionSlot(value: string): value is ThemeActionSlot {
  return (THEME_ACTION_SLOTS as readonly string[]).includes(value)
}

export interface ThemeMeta {
  name: string
  description: string
  author: string
  version: string
  slug: string
  slots?: string[]
  actionSlots?: readonly ThemeActionSlot[]
  actionSlotsVersion?: number
  tokens?: Record<string, string>
}

export interface ThemeRenderContext {
  options: Record<string, string>
  menus: MenuNode[]
}

export interface ThemeRenderOptions {
  [key: string]: unknown
  menus: MenuNode[]
  themeTokens?: Record<string, string>
  themeSlots?: string[]
  themeActionSlots?: readonly ThemeActionSlot[]
  themeActionSlotsVersion?: number
}

export type ThemeSingleTemplate = React.ComponentType<{
  post: any
  categories?: any[]
  tags?: any[]
  initialComments?: any[]
  options?: ThemeRenderOptions
}>

export type ThemePageTemplate = React.ComponentType<{
  post: any
  options?: ThemeRenderOptions
}>

export type ThemeArchiveTemplate = React.ComponentType<{
  posts: any[]
  title?: string
  options?: ThemeRenderOptions
  postType?: string
}>

export interface NodePressTheme {
  meta: ThemeMeta
  supportsPluginMenus?: boolean
  SinglePost: ThemeSingleTemplate
  SinglePage: ThemePageTemplate
  Archive: ThemeArchiveTemplate
  [key: `Single_${string}`]: ThemeSingleTemplate | undefined
  [key: `Archive_${string}`]: ThemeArchiveTemplate | undefined
  NotFound?: React.ComponentType<{ options?: ThemeRenderOptions }>
}

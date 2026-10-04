import { OptionService } from './option.service'
import { themes } from '@/themes/registry'
import { ensureActivePluginsLoaded } from '@/services/plugin-factory'
import { MenuService } from '@/services/menu.service'
import { HookService } from './hook.service'
import { isValidElement, type ReactNode } from 'react'
import {
  isThemeActionSlot,
  THEME_ACTION_SLOTS,
  THEME_ACTION_SLOTS_VERSION,
  type NodePressTheme,
  type ThemeActionSlot,
  type ThemeRenderOptions,
} from '@/themes/types'
import { themeTemplateService } from './theme-template.service'
import type { ThemeTemplateDefinition, ThemeTemplateResolutionContext } from '@/lib/themes/templates'

export type ThemeActionSlotContext = Record<string, unknown>

function isSafeThemeActionResult(value: unknown): value is ReactNode {
  if (value === null || value === undefined) return true
  if (typeof value === 'string' || typeof value === 'number' || typeof value === 'boolean' || typeof value === 'bigint') {
    return true
  }
  if (Array.isArray(value)) return value.every(isSafeThemeActionResult)

  return isValidElement(value)
}

export class ThemeService {
  static async getActiveThemeSlug(): Promise<string> {
    const options = await OptionService.getOptions(['active_theme'])
    return options['active_theme'] || 'default'
  }

  static async getActiveTheme(): Promise<NodePressTheme> {
    const slug = await this.getActiveThemeSlug()
    
    if (themes[slug as keyof typeof themes]) {
      return themes[slug as keyof typeof themes]
    }
    
    return themes['default'] // Fallback to default
  }

  static getAvailableThemes(): NodePressTheme['meta'][] {
    return Object.values(themes).map(theme => theme.meta)
  }

  static async getRenderOptions(options: Record<string, string>): Promise<ThemeRenderOptions> {
    await ensureActivePluginsLoaded()
    const menus = MenuService.getPluginMenuTree('public', (capability) => !capability)
    const theme = await this.getActiveTheme()
    return {
      ...options,
      menus,
      themeTokens: theme.meta.tokens ?? {},
      themeSlots: theme.meta.slots ?? [],
      themeActionSlots: theme.meta.actionSlots ?? THEME_ACTION_SLOTS,
      themeActionSlotsVersion: theme.meta.actionSlotsVersion ?? THEME_ACTION_SLOTS_VERSION,
    }
  }

  static async renderActionSlot(
    slot: ThemeActionSlot,
    context: ThemeActionSlotContext = {},
  ): Promise<ReactNode[]> {
    if (!isThemeActionSlot(slot)) return []

    await ensureActivePluginsLoaded()
    const results = await HookService.doAction(slot, context)
    return results.filter(isSafeThemeActionResult)
  }

  static async renderSlot(
    slot: ThemeActionSlot,
    context: ThemeActionSlotContext = {},
  ): Promise<ReactNode[]> {
    return this.renderActionSlot(slot, context)
  }

  static async resolveTemplate(context: Omit<ThemeTemplateResolutionContext, 'themeSlug'>): Promise<ThemeTemplateDefinition | null> {
    try {
      const themeSlug = await this.getActiveThemeSlug()
      return await themeTemplateService.resolve({ ...context, themeSlug })
    } catch {
      return null
    }
  }
}

import { OptionService } from './option.service'
import { themes } from '@/themes/registry'
import { ensureActivePluginsLoaded } from '@/services/plugin-factory'
import { MenuService } from '@/services/menu.service'
import type { NodePressTheme, ThemeRenderOptions } from '@/themes/types'

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
    return { ...options, menus }
  }
}

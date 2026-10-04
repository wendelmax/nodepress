import { beforeEach, describe, expect, it, vi } from 'vitest'
import { OptionService } from '../option.service'
import { ThemeService } from '../theme.service'
import { MenuService } from '../menu.service'
import { HookService } from '../hook.service'
import { THEME_ACTION_SLOTS } from '@/themes/types'

describe('ThemeService', () => {
  beforeEach(() => {
    vi.restoreAllMocks()
    MenuService.clearPluginMenus()
  })

  it('resolves the configured theme and falls back to default', async () => {
    vi.spyOn(OptionService, 'getOptions').mockResolvedValue({ active_theme: 'minimal' })
    expect((await ThemeService.getActiveTheme()).meta.slug).toBe('minimal')

    vi.mocked(OptionService.getOptions).mockResolvedValue({ active_theme: 'missing' })
    expect((await ThemeService.getActiveTheme()).meta.slug).toBe('default')
  })

  it('passes capability-safe public plugin menus to theme renderers', async () => {
    vi.spyOn(OptionService, 'getOptions').mockResolvedValue({})
    MenuService.registerPluginMenu('animals', {
      id: 'animals-public',
      label: 'Animais',
      href: '/animais',
      surface: 'public',
    })

    const renderOptions = await ThemeService.getRenderOptions({ blogname: 'NodePress' })
    expect(renderOptions.blogname).toBe('NodePress')
    expect(renderOptions.menus.map((menu) => menu.id)).toEqual(['animals-public'])
  })

  it('renders declared theme action slots in priority order and ignores unsafe results', async () => {
    const cleanups = [
      HookService.addAction('theme_head', async () => 'late', 20),
      HookService.addAction('theme_head', () => undefined, 15),
      HookService.addAction('theme_head', () => ({ not: 'a React node' }), 12),
      HookService.addAction('theme_head', () => 'early', 10),
    ]

    try {
      await expect(ThemeService.renderActionSlot('theme_head', { locale: 'pt-BR' }))
        .resolves.toEqual(['early', 'late'])
      await expect(ThemeService.renderActionSlot('theme_footer')).resolves.toEqual([])
      await expect(ThemeService.renderActionSlot('theme_head', { locale: 'pt-BR' }))
        .resolves.toHaveLength(2)
    } finally {
      cleanups.forEach((cleanup) => cleanup())
    }
  })

  it('exposes only the versioned public theme action slots', () => {
    expect(THEME_ACTION_SLOTS).toEqual([
      'theme_head',
      'theme_footer',
      'before_post_content',
      'after_post_content',
    ])
  })
})

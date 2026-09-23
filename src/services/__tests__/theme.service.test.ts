import { beforeEach, describe, expect, it, vi } from 'vitest'
import { OptionService } from '../option.service'
import { ThemeService } from '../theme.service'
import { MenuService } from '../menu.service'

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
})

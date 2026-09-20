import { beforeEach, describe, expect, it, vi } from 'vitest'
import { OptionService } from '../option.service'
import { ThemeService } from '../theme.service'

describe('ThemeService', () => {
  beforeEach(() => {
    vi.restoreAllMocks()
  })

  it('resolves the configured theme and falls back to default', async () => {
    vi.spyOn(OptionService, 'getOptions').mockResolvedValue({ active_theme: 'minimal' })
    expect((await ThemeService.getActiveTheme()).meta.slug).toBe('minimal')

    vi.mocked(OptionService.getOptions).mockResolvedValue({ active_theme: 'missing' })
    expect((await ThemeService.getActiveTheme()).meta.slug).toBe('default')
  })
})

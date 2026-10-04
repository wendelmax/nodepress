import { beforeEach, describe, expect, it } from 'vitest'
import { HookService } from '@/services/hook.service'
import { MenuService } from '@/services/menu.service'
import { NodePressPluginRuntime } from '@/plugins/runtime'
import { renderPluginSlot } from '@/plugins/slots'
import seoOptimizerPlugin from '../index'

describe('SEO Suite plugin', () => {
  beforeEach(() => {
    MenuService.clearPluginMenus()
  })

  it('registers the admin entrypoint and a public breadcrumb slot', async () => {
    const runtime = new NodePressPluginRuntime()
    await runtime.activate(seoOptimizerPlugin)

    expect(MenuService.getPluginMenuTree('admin', () => true)).toEqual([
      expect.objectContaining({ id: 'seo-suite', href: '/admin/settings/seo' }),
    ])
    await expect(renderPluginSlot('public', 'theme.breadcrumbs', {
      postTitle: 'Hello', isPage: false, categories: [{ slug: 'news', name: 'News' }],
    })).resolves.toHaveLength(1)
    await expect(HookService.applyFilters('the_content', 'original content')).resolves.toBe('original content')

    runtime.deactivate(seoOptimizerPlugin.id)
    await expect(renderPluginSlot('public', 'theme.breadcrumbs')).resolves.toEqual([])
  })
})

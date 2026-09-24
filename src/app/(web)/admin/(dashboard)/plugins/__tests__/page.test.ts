import React from 'react'
import { afterEach, describe, expect, it, vi } from 'vitest'
import { HookService } from '@/services/hook.service'
import PluginPage from '../[slug]/page'

vi.mock('@/services/plugin-factory', () => ({
  ensureActivePluginsLoaded: vi.fn().mockResolvedValue(undefined),
}))

const pageParams = (slug: string) => Promise.resolve({ slug })
const panel = (content: string) => React.createElement('div', null, content)

describe('dynamic admin plugin page', () => {
  const cleanups: Array<() => void> = []

  afterEach(() => {
    cleanups.splice(0).forEach((cleanup) => cleanup())
  })

  it('dispatches the slug-specific hook and renders its content', async () => {
    cleanups.push(HookService.addAction('admin_plugin_page_reports', () => panel('Reports dashboard')))

    const page = await PluginPage({ params: pageParams('reports') })

    expect(page).toMatchObject({
      props: {
        children: expect.arrayContaining([
          expect.objectContaining({
            props: {
              children: expect.objectContaining({ props: { children: 'Reports dashboard' } }),
            },
          }),
        ]),
      },
    })
  })

  it('renders every content returned by multiple handlers', async () => {
    cleanups.push(HookService.addAction('admin_plugin_page_reports', () => panel('Overview'), 10))
    cleanups.push(HookService.addAction('admin_plugin_page_reports', () => panel('Analytics'), 20))

    const page = await PluginPage({ params: pageParams('reports') })

    expect(page).toMatchObject({
      props: {
        children: expect.arrayContaining([
          expect.objectContaining({
            props: {
              children: expect.objectContaining({ props: { children: 'Overview' } }),
            },
          }),
          expect.objectContaining({
            props: {
              children: expect.objectContaining({ props: { children: 'Analytics' } }),
            },
          }),
        ]),
      },
    })
  })

  it('shows an admin-friendly fallback when no handler responds', async () => {
    const page = await PluginPage({ params: pageParams('missing') })
    const pageElement = page as React.ReactElement<{ slug: string }>
    const fallback = (pageElement.type as (props: { slug: string }) => React.ReactElement<{ children?: React.ReactNode }>)(pageElement.props)
    const fallbackChildren = fallback.props.children as React.ReactElement<{ children?: React.ReactNode }>[]

    expect(fallbackChildren[0].type).toBe('h1')
    expect(fallbackChildren[0].props.children).toBe('Plugin page not found')
  })
})

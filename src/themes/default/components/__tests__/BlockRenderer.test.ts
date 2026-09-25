import { describe, expect, it, vi } from 'vitest'
import BlockRenderer from '../BlockRenderer'

const mocks = vi.hoisted(() => ({
  Render: vi.fn(() => null),
  getServerPuckConfig: vi.fn(),
  resolvePostShowcaseData: vi.fn(async (data) => data),
}))

vi.mock('@measured/puck', () => ({
  Render: mocks.Render,
}))

vi.mock('@/lib/puck/server-config', () => ({
  getServerPuckConfig: mocks.getServerPuckConfig,
}))

vi.mock('@/lib/puck/server-showcase-data', () => ({
  resolvePostShowcaseData: mocks.resolvePostShowcaseData,
}))

describe('BlockRenderer', () => {
  it('uses the resolved Puck config only for Puck content', async () => {
    const serverConfig = { components: { Heading: {} } }
    mocks.getServerPuckConfig.mockResolvedValue(serverConfig)
    const resolvedData = { root: {}, content: [{ type: 'PostShowcase', props: { items: [] } }] }
    mocks.resolvePostShowcaseData.mockResolvedValue(resolvedData)

    const puckResult = await BlockRenderer({
      content: JSON.stringify({ root: {}, content: [] }),
    })

    expect(mocks.getServerPuckConfig).toHaveBeenCalledOnce()
    expect(mocks.resolvePostShowcaseData).toHaveBeenCalledOnce()
    expect(puckResult).toMatchObject({ props: { config: serverConfig, data: resolvedData } })
  })

  it('preserves legacy branches without loading the Puck resolver', async () => {
    mocks.getServerPuckConfig.mockClear()
    mocks.resolvePostShowcaseData.mockClear()

    await BlockRenderer({
      content: JSON.stringify({ blocks: [{ type: 'paragraph', data: { text: 'legacy' } }] }),
    })
    await BlockRenderer({ content: '<p>legacy html</p>' })

    expect(mocks.getServerPuckConfig).not.toHaveBeenCalled()
    expect(mocks.resolvePostShowcaseData).not.toHaveBeenCalled()
  })
})

import { beforeEach, describe, expect, it, vi } from 'vitest'
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
  beforeEach(() => {
    mocks.Render.mockClear()
    mocks.getServerPuckConfig.mockReset()
    mocks.resolvePostShowcaseData.mockReset()
    mocks.resolvePostShowcaseData.mockImplementation(async (data) => data)
  })

  it('uses the resolved Puck config only for Puck content', async () => {
    const serverConfig = { components: { Heading: {} } }
    mocks.getServerPuckConfig.mockResolvedValue(serverConfig)
    const resolvedData = { root: {}, content: [{ type: 'PostShowcase', props: { items: [] } }] }
    mocks.resolvePostShowcaseData.mockResolvedValue(resolvedData)

    const puckResult = await BlockRenderer({
      content: JSON.stringify({ root: {}, content: [] }),
    })

    expect(mocks.getServerPuckConfig).toHaveBeenCalledOnce()
    expect(mocks.getServerPuckConfig).toHaveBeenCalledWith('post')
    expect(mocks.resolvePostShowcaseData).toHaveBeenCalledOnce()
    expect(mocks.resolvePostShowcaseData).toHaveBeenCalledWith(expect.objectContaining({ version: 1 }))
    expect(puckResult).toMatchObject({ props: { config: serverConfig, data: resolvedData } })
  })

  it('preserves legacy branches without loading the Puck resolver', async () => {
    await BlockRenderer({
      content: JSON.stringify({ blocks: [{ type: 'paragraph', data: { text: 'legacy' } }] }),
    })
    await BlockRenderer({ content: '<p>legacy html</p>' })

    expect(mocks.getServerPuckConfig).not.toHaveBeenCalled()
    expect(mocks.resolvePostShowcaseData).not.toHaveBeenCalled()
  })

  it('passes the explicit context to the server resolver', async () => {
    mocks.getServerPuckConfig.mockResolvedValue({ components: {} })

    await BlockRenderer({
      content: JSON.stringify({ root: {}, content: [] }),
      context: 'landing',
    })

    expect(mocks.getServerPuckConfig).toHaveBeenCalledWith('landing')
  })

  it('does not render unknown Puck components and returns a safe fallback', async () => {
    mocks.getServerPuckConfig.mockResolvedValue({ components: { Heading: {} } })

    const result = await BlockRenderer({
      content: JSON.stringify({ root: {}, content: [{ type: 'RemovedPluginCard', props: {} }] }),
    })

    expect(mocks.Render).not.toHaveBeenCalled()
    expect(result).toMatchObject({
      props: { 'data-builder-error': 'unknown-component' },
    })
  })

  it('returns a safe fallback for malformed builder content', async () => {
    const result = await BlockRenderer({ content: '{"root":' })

    expect(mocks.getServerPuckConfig).not.toHaveBeenCalled()
    expect(mocks.Render).not.toHaveBeenCalled()
    expect(result).toMatchObject({
      props: { 'data-builder-error': 'invalid-document' },
    })
  })
})

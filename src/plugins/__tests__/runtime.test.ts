import { beforeEach, describe, expect, it, vi } from 'vitest'
import { contentTypeRegistry } from '@/modules/content'
import { eventRegistry } from '@/core/events/registry'
import { jobRegistry } from '../runtime-registries'
import { NodePressPluginRuntime } from '../runtime'
import type { NodePressPlugin } from '../types'

describe('plugin extension registrars', () => {
  beforeEach(() => {
    contentTypeRegistry.clear()
    eventRegistry.clear()
    jobRegistry.clear()
  })

  it('registers and removes content types, events, and jobs with plugin cleanup', async () => {
    const eventHandler = vi.fn()
    const plugin: NodePressPlugin = {
      id: 'animals',
      name: 'Animals',
      version: '1.0.0',
      register({ contentTypes, events, jobs }) {
        contentTypes.register({
          id: 'animal', label: 'Animal', version: '1.0.0', fields: {},
        })
        events.on('animal.created', eventHandler)
        jobs.add({ id: 'animals.sync', handler: async () => {} })
      },
    }

    const runtime = new NodePressPluginRuntime()
    await runtime.activate(plugin)
    expect(contentTypeRegistry.get('animal')).toBeDefined()
    expect(jobRegistry.list().map((job) => job.id)).toEqual(['animals.sync'])
    await eventRegistry.emit('animal.created', { id: 'animal-1' })
    expect(eventHandler).toHaveBeenCalledTimes(1)

    runtime.deactivate(plugin.id)
    expect(contentTypeRegistry.get('animal')).toBeUndefined()
    expect(jobRegistry.list()).toEqual([])
    await eventRegistry.emit('animal.created', { id: 'animal-2' })
    expect(eventHandler).toHaveBeenCalledTimes(1)
  })

  it('cleans registered contributions when plugin registration fails', async () => {
    const runtime = new NodePressPluginRuntime()
    const plugin: NodePressPlugin = {
      id: 'broken',
      name: 'Broken',
      version: '1.0.0',
      register({ contentTypes }) {
        contentTypes.register({ id: 'broken-content', label: 'Broken', version: '1.0.0', fields: {} })
        throw new Error('registration failed')
      },
    }

    await expect(runtime.activate(plugin)).rejects.toThrow('registration failed')

    expect(contentTypeRegistry.get('broken-content')).toBeUndefined()
  })
})

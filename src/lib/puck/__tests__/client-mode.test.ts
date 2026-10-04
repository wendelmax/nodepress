import { describe, expect, it } from 'vitest'
import { puckConfig } from '../config'
import { createClientPuckConfig } from '../client-mode'

describe('Puck client mode', () => {
  it('exposes only the policy-approved fields and does not mutate the editor config', () => {
    const clientConfig = createClientPuckConfig(puckConfig)

    expect(Object.keys(clientConfig.components.Hero.fields ?? {})).toEqual(['title', 'subtitle', 'align'])
    expect(Object.keys(clientConfig.components.Button.fields ?? {})).toEqual(['label', 'variant', 'align'])
    expect(clientConfig.components.Image.fields).toHaveProperty('alt')
    expect(clientConfig.components.Image.fields).not.toHaveProperty('url')
    expect(clientConfig.components.Hero.fields).not.toHaveProperty('padding')
    expect(Object.keys(puckConfig.components.Hero.fields ?? {})).toContain('padding')
  })

  it('removes unknown components instead of making them editable', () => {
    const config = {
      ...puckConfig,
      components: {
        ...puckConfig.components,
        ThirdParty: puckConfig.components.Text,
      },
    }

    const clientConfig = createClientPuckConfig(config)

    expect(clientConfig.components).not.toHaveProperty('ThirdParty')
    expect(clientConfig.components).toHaveProperty('Text')
  })
})

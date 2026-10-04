import { describe, expect, it } from 'vitest'
import { getDefaultActivePluginIds } from './activation'

describe('native plugin activation defaults', () => {
  it('activates only the consent plugin for new installations', () => {
    expect(getDefaultActivePluginIds()).toEqual(['lgpd-consent'])
  })
})

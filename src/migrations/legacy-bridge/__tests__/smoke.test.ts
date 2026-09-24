import { describe, expect, it } from 'vitest'
import { canWriteLegacy } from '../cutover-policy'

describe('coexistence smoke policy', () => {
  it('blocks legacy writes after a domain is frozen for cutover', () => {
    expect(canWriteLegacy('shadow')).toBe(true)
    expect(canWriteLegacy('ready')).toBe(true)
    expect(canWriteLegacy('frozen')).toBe(false)
    expect(canWriteLegacy('active')).toBe(false)
    expect(canWriteLegacy('read-only')).toBe(false)
  })
})

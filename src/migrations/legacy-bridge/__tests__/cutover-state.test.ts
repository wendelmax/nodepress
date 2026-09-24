import { describe, expect, it } from 'vitest'
import { transition } from '../cutover-state'

describe('cutover state', () => {
  it('allows the documented shadow-to-ready transition', () => {
    expect(transition('shadow', 'ready')).toBe('ready')
  })

  it('rejects activating a domain directly from shadow mode', () => {
    expect(() => transition('shadow', 'active')).toThrow('Invalid cutover transition')
  })
})

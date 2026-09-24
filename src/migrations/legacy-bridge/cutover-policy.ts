import type { CutoverState } from './cutover-state'

export function canWriteLegacy(state: CutoverState): boolean {
  return state === 'shadow' || state === 'ready'
}

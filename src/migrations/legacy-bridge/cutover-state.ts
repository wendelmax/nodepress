export const cutoverStates = ['shadow', 'ready', 'frozen', 'active', 'read-only', 'retired'] as const

export type CutoverState = typeof cutoverStates[number]

const allowedTransitions: Record<CutoverState, readonly CutoverState[]> = {
  shadow: ['ready'],
  ready: ['frozen', 'shadow'],
  frozen: ['active', 'shadow'],
  active: ['read-only', 'frozen'],
  'read-only': ['retired'],
  retired: [],
}

export function transition(from: CutoverState, to: CutoverState): CutoverState {
  if (!allowedTransitions[from].includes(to)) {
    throw new Error(`Invalid cutover transition: ${from} -> ${to}`)
  }
  return to
}

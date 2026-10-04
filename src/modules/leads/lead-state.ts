import type { LeadStatus } from './contracts'

const progression: Record<LeadStatus, number> = {
  new: 0,
  contacted: 1,
  qualified: 2,
  converted: 3,
  lost: 4,
}

export function canTransitionLead(from: LeadStatus, to: LeadStatus): boolean {
  if (from === 'converted' || from === 'lost') return false
  if (to === 'lost') return true
  return progression[to] === progression[from] + 1
}

import type { Lead, LeadRepositoryPort } from './contracts'

export class InMemoryLeadRepository implements LeadRepositoryPort {
  private readonly leads = new Map<string, Lead>()

  async findById(id: string): Promise<Lead | undefined> {
    return clone(this.leads.get(id))
  }

  async findBySourceSubmissionId(sourceSubmissionId: string): Promise<Lead | undefined> {
    for (const lead of this.leads.values()) {
      if (lead.sourceSubmissionId === sourceSubmissionId) return clone(lead)
    }
    return undefined
  }

  async save(lead: Lead): Promise<void> {
    this.leads.set(lead.id, clone(lead)!)
  }

  async list(): Promise<Lead[]> {
    return [...this.leads.values()]
      .sort((left, right) => left.createdAt.getTime() - right.createdAt.getTime() || left.id.localeCompare(right.id))
      .map((lead) => clone(lead)!)
  }
}

function clone<T>(value: T | undefined): T | undefined {
  if (value === undefined) return undefined
  return typeof structuredClone === 'function' ? structuredClone(value) : value
}

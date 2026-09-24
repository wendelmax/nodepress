import type { PuckComponents } from '@/lib/puck/types'

type ClientPuckFilter = (
  components: PuckComponents,
) => PuckComponents | Promise<PuckComponents>

type ClientPuckHook = {
  priority: number
  callback: ClientPuckFilter
}

class ClientPuckHookRegistry {
  private readonly filters = new Map<string, ClientPuckHook[]>()

  addFilter(tag: string, callback: ClientPuckFilter, priority = 10): () => void {
    const filters = this.filters.get(tag) ?? []
    filters.push({ priority, callback })
    filters.sort((left, right) => left.priority - right.priority)
    this.filters.set(tag, filters)

    let removed = false
    return () => {
      if (removed) return
      removed = true

      const remaining = (this.filters.get(tag) ?? []).filter(
        (candidate) => candidate.callback !== callback,
      )
      if (remaining.length === 0) {
        this.filters.delete(tag)
      } else {
        this.filters.set(tag, remaining)
      }
    }
  }

  async applyFilters(tag: string, components: PuckComponents): Promise<PuckComponents> {
    let result = components
    for (const filter of this.filters.get(tag) ?? []) {
      result = await filter.callback(result)
    }
    return result
  }
}

export const ClientPuckHookService = new ClientPuckHookRegistry()

type HookCallback = (...args: any[]) => any | Promise<any>;

interface Hook {
  priority: number;
  callback: HookCallback;
}

export class HookRegistry {
  private actions: Map<string, Hook[]> = new Map();
  private filters: Map<string, Hook[]> = new Map();
  private pluginsLoaded: boolean = false;

  private async ensurePluginsLoaded() {
    if (!this.pluginsLoaded) {
      this.pluginsLoaded = true;
      try {
        await import('@/plugins/registry');
      } catch (e) {
        console.error('Failed to load plugins registry:', e);
      }
    }
  }

  /**
   * Register a filter callback
   */
  public addFilter(tag: string, callback: HookCallback, priority: number = 10): () => void {
    if (!this.filters.has(tag)) {
      this.filters.set(tag, []);
    }
    const hooks = this.filters.get(tag)!;
    hooks.push({ priority, callback });
    hooks.sort((a, b) => a.priority - b.priority);
    let removed = false
    return () => {
      if (removed) return
      removed = true
      this.removeFilter(tag, callback)
    }
  }

  public removeFilter(tag: string, callback: HookCallback): void {
    const hooks = this.filters.get(tag)
    if (!hooks) return
    const remaining = hooks.filter((hook) => hook.callback !== callback)
    if (remaining.length === 0) this.filters.delete(tag)
    else this.filters.set(tag, remaining)
  }

  /**
   * Apply filters to a value
   */
  public async applyFilters(tag: string, value: any, ...args: any[]): Promise<any> {
    await this.ensurePluginsLoaded();
    if (!this.filters.has(tag)) return value;

    const hooks = this.filters.get(tag)!;
    let result = value;

    for (const hook of hooks) {
      result = await hook.callback(result, ...args);
    }

    return result;
  }

  /**
   * Register an action callback
   */
  public addAction(tag: string, callback: HookCallback, priority: number = 10): () => void {
    if (!this.actions.has(tag)) {
      this.actions.set(tag, []);
    }
    const hooks = this.actions.get(tag)!;
    hooks.push({ priority, callback });
    hooks.sort((a, b) => a.priority - b.priority);
    let removed = false
    return () => {
      if (removed) return
      removed = true
      this.removeAction(tag, callback)
    }
  }

  public removeAction(tag: string, callback: HookCallback): void {
    const hooks = this.actions.get(tag)
    if (!hooks) return
    const remaining = hooks.filter((hook) => hook.callback !== callback)
    if (remaining.length === 0) this.actions.delete(tag)
    else this.actions.set(tag, remaining)
  }

  /**
   * Execute action callbacks
   * Returns an array of results from the callbacks (useful for injecting React components)
   */
  public async doAction(tag: string, ...args: any[]): Promise<any[]> {
    await this.ensurePluginsLoaded();
    if (!this.actions.has(tag)) return [];

    const hooks = this.actions.get(tag)!;
    const results = [];

    for (const hook of hooks) {
      const result = await hook.callback(...args);
      if (result !== undefined) {
        results.push(result);
      }
    }

    return results;
  }
}

// Global singleton instance
const globalForHooks = globalThis as unknown as {
  __hookService: HookRegistry | undefined;
};

export const HookService = globalForHooks.__hookService ?? new HookRegistry();

if (process.env.NODE_ENV !== "production") {
  globalForHooks.__hookService = HookService;
}



# Puck Plugin Component Filter Implementation Plan

> **For agentic workers:** REQUIRED SUB-SKILL: Use superpowers:subagent-driven-development (recommended) or superpowers:executing-plans to implement this plan task-by-task. Steps use checkbox (`- [ ]`) syntax for tracking.

**Goal:** Allow active plugins to contribute client-safe Puck components and apply the `puck_registered_components` filter consistently in the editor and public renderer.

**Architecture:** Keep `puckConfig` as an immutable, runtime-neutral base. Add a pure component merger, a server resolver that loads active plugin runtime state before applying the server `HookService` filters, and a client resolver that fetches active plugin IDs before applying the same filter contract through a client-local registry to client-safe plugin declarations. `PuckBuilder` falls back to the base config while the client resolver loads; `BlockRenderer` awaits the server resolver only for Puck content.

**Tech Stack:** Next.js 16 App Router, React 19, TypeScript, `@measured/puck`, Vitest, existing `HookService` and plugin lifecycle services, plus a client-local Puck hook registry that does not import server plugin loading.

**Spec:** `docs/superpowers/specs/2026-09-24-puck-component-filter-design.md`

## Global Constraints

- Keep `puckConfig` free of database access and hook execution so it remains importable by both browser and server code.
- Only active plugins contribute `puck.components` to either resolver.
- Do not execute plugin `register` callbacks in the browser.
- Apply the server `HookService` or client-local registry to the same `puck_registered_components` tag after the base/plugin merge.
- Never mutate `puckConfig.components`; each resolver starts from a fresh shallow copy.
- Preserve the existing Puck data format and the existing base components.
- On client resolution failure, log the failure and keep the base config usable.
- On server filter failure, propagate the error instead of silently rendering a different configuration.

## Review Focus

- An inactive plugin must not expose its component in either runtime — pin this in the pure merge and client resolver tests.
- A plugin overriding a base component must replace only that key without mutating the base map — pin this in the pure merge test.
- A filter that adds or replaces a component must run after plugin declarations — pin this in the server resolver test.
- A failed client endpoint or filter must reject the client loader so the editor can retain the base configuration — pin the rejection behavior in the client resolver test and verify the `PuckBuilder` catch path in the integration diff.
- Non-Puck content must not trigger plugin loading or alter the existing Editor.js/HTML branches — pin this in the renderer integration test or preserve it through the existing renderer suite.

---

### Task 1: Define the shared Puck component contract and pure merge

**Files:**
- Create: `src/lib/puck/types.ts`
- Create: `src/lib/puck/components.ts`
- Modify: `src/lib/puck/config.tsx` to export the shared component type without adding runtime work
- Modify: `src/plugins/types.ts` to add optional `puck.components`
- Test: `src/lib/puck/__tests__/components.test.ts`

**Interfaces:**
- `PuckComponents = Config<any>['components']` is the shared component-map type.
- `NodePressPlugin.puck?: { components?: PuckComponents }` is the client-safe manifest contract.
- `mergePuckComponents(base: PuckComponents, plugins: NodePressPlugin[], activePluginIds: ReadonlySet<string>): PuckComponents` returns a new map and never mutates `base`.

- [ ] **Step 1: Write the failing tests**

Use plain React elements created with `React.createElement` so the test remains a `*.test.ts` file. Cover an active plugin contribution, an inactive plugin exclusion, a base-key override, and base-map immutability:

```ts
it('merges only active plugin components without mutating the base map', () => {
  const base = { Heading: { render: () => React.createElement('h1') } } as PuckComponents
  const plugins = [
    { id: 'active', puck: { components: { Heading: { render: () => React.createElement('h2') }, Card: { render: () => React.createElement('article') } } } },
    { id: 'inactive', puck: { components: { Secret: { render: () => React.createElement('aside') } } } },
  ] as NodePressPlugin[]

  const merged = mergePuckComponents(base, plugins, new Set(['active']))

  expect(merged).toHaveProperty('Card')
  expect(merged).not.toHaveProperty('Secret')
  expect(merged.Heading).not.toBe(base.Heading)
  expect(base).not.toHaveProperty('Card')
  expect(base).not.toHaveProperty('Secret')
})
```

- [ ] **Step 2: Run the focused test and verify RED**

Run: `npx vitest run src/lib/puck/__tests__/components.test.ts`

Expected: FAIL because the shared type, manifest property, and `mergePuckComponents` implementation do not exist yet.

- [ ] **Step 3: Implement the minimal contract and merger**

Export the Puck component-map type from `src/lib/puck/types.ts`, add the optional manifest property to `NodePressPlugin`, and implement a shallow copy followed by active-plugin overlays:

```ts
export function mergePuckComponents(
  base: PuckComponents,
  plugins: NodePressPlugin[],
  activePluginIds: ReadonlySet<string>,
): PuckComponents {
  const components = { ...base }
  for (const plugin of plugins) {
    if (!activePluginIds.has(plugin.id)) continue
    Object.assign(components, plugin.puck?.components ?? {})
  }
  return components
}
```

- [ ] **Step 4: Run the focused test and verify GREEN**

Run: `npx vitest run src/lib/puck/__tests__/components.test.ts`

Expected: PASS with all merge, exclusion, override, and immutability assertions.

- [ ] **Step 5: Commit the shared contract**

```bash
git add src/lib/puck/types.ts src/lib/puck/components.ts src/lib/puck/config.tsx src/plugins/types.ts src/lib/puck/__tests__/components.test.ts
git commit -m "feat: define client-safe Puck plugin components"
```

### Task 2: Add the server-side Puck config resolver

**Files:**
- Create: `src/lib/puck/server-config.ts`
- Test: `src/lib/puck/__tests__/server-config.test.ts`

**Interfaces:**
- `getServerPuckConfig(): Promise<Config<any>>` loads active plugins, merges their client-safe components, then applies `HookService.applyFilters('puck_registered_components', components)`.
- The resolver consumes `getPluginService`, `ensureActivePluginsLoaded`, `getRegisteredPlugins`, `puckConfig`, `mergePuckComponents`, and `HookService`.

- [ ] **Step 1: Write the failing tests**

Mock only the lifecycle factory and hook boundary; keep the merge behavior real. Verify active plugin components are present before the filter runs, the filter can add/replace a key, and the base config object remains unchanged:

```ts
it('loads active plugin components before applying the Puck filter', async () => {
  const seen: string[] = []
  applyFilters.mockImplementation(async (_tag, components) => {
    seen.push(Object.keys(components).join(','))
    return { ...components, Filtered: components.Heading }
  })

  const config = await getServerPuckConfig()

  expect(seen[0]).toContain('Card')
  expect(seen[0]).not.toContain('Secret')
  expect(config.components).toHaveProperty('Filtered')
})
```

Configure the mocked registry with `active` and `inactive` plugins, configure the mocked service to return `{ id: 'active', active: true }` and `{ id: 'inactive', active: false }`, and assert that the filter input contains `Card` but not `Secret` before returning the `Filtered` key.

- [ ] **Step 2: Run the focused test and verify RED**

Run: `npx vitest run src/lib/puck/__tests__/server-config.test.ts`

Expected: FAIL because `getServerPuckConfig` does not exist.

- [ ] **Step 3: Implement the server resolver**

Call `ensureActivePluginsLoaded()`, obtain the service list, create the active ID set, merge registered plugin declarations, and apply the filter after the merge:

```ts
export async function getServerPuckConfig(): Promise<Config<any>> {
  await ensureActivePluginsLoaded()
  const [service, plugins] = await Promise.all([getPluginService(), getRegisteredPlugins()])
  const statuses = await service.list()
  const activeIds = new Set(statuses.filter((status) => status.active).map((status) => status.id))
  const components = mergePuckComponents(puckConfig.components, plugins, activeIds)
  const filtered = await HookService.applyFilters('puck_registered_components', components)
  return { ...puckConfig, components: filtered }
}
```

Keep the resolver server-only by never importing it from a Client Component.

- [ ] **Step 4: Run the focused test and verify GREEN**

Run: `npx vitest run src/lib/puck/__tests__/server-config.test.ts`

Expected: PASS, including active-only contribution, filter ordering, and base immutability.

- [ ] **Step 5: Commit the server resolver**

```bash
git add src/lib/puck/server-config.ts src/lib/puck/__tests__/server-config.test.ts
git commit -m "feat: resolve active plugin Puck components on the server"
```

### Task 3: Add the client-side resolver and failure fallback

**Files:**
- Create: `src/lib/puck/client-config.ts`
- Create: `src/plugins/puck-client-registry.ts`
- Create: `src/services/puck-client-hook.service.ts`
- Test: `src/lib/puck/__tests__/client-config.test.ts`

**Interfaces:**
- `getClientPuckConfig(): Promise<Config<any>>` fetches `/api/admin/plugins`, selects `active` plugin IDs, merges declarations from the static client-safe registry, and applies the client-local registry to the same `puck_registered_components` tag.
- A rejected fetch or filter is thrown by this loader; `PuckBuilder` owns the user-facing fallback to `puckConfig`.

- [ ] **Step 1: Write the failing tests**

Stub `fetch` with `{ plugins: [{ id: 'active', active: true }, { id: 'inactive', active: false }] }`, register a filter that adds one component, and assert inactive components are absent:

```ts
vi.stubGlobal('fetch', vi.fn().mockResolvedValue({
  ok: true,
  json: async () => ({ plugins: [
    { id: 'active', active: true },
    { id: 'inactive', active: false },
  ] }),
}))

const cleanup = ClientPuckHookService.addFilter('puck_registered_components', (components) => ({
  ...components,
  Filtered: components.Heading,
}))
const config = await getClientPuckConfig()
cleanup()

expect(config.components).toHaveProperty('Filtered')
expect(config.components).not.toHaveProperty('Secret')
```

Add a rejected-fetch test that expects the loader to reject so the UI can handle it explicitly:

```ts
vi.stubGlobal('fetch', vi.fn().mockRejectedValue(new Error('network down')))
await expect(getClientPuckConfig()).rejects.toThrow('network down')
```

- [ ] **Step 2: Run the focused test and verify RED**

Run: `npx vitest run src/lib/puck/__tests__/client-config.test.ts`

Expected: FAIL because `getClientPuckConfig` does not exist.

- [ ] **Step 3: Implement the client resolver**

Use the existing admin endpoint, the shared merger, and the static client-safe registry. Do not import `plugin-factory`, the server plugin registry, or execute plugin lifecycle callbacks in this file. The client-local hook registry must preserve the filter tag and priority ordering without importing server-only modules:

```ts
export async function getClientPuckConfig(): Promise<Config<any>> {
  const response = await fetch('/api/admin/plugins')
  if (!response.ok) throw new Error(`Failed to load active plugins: ${response.status}`)
  const payload = await response.json() as { plugins?: Array<{ id: string; active: boolean }> }
  const activeIds = new Set((payload.plugins ?? []).filter((plugin) => plugin.active).map((plugin) => plugin.id))
  const components = mergePuckComponents(puckConfig.components, clientPuckPlugins, activeIds)
  const filtered = await ClientPuckHookService.applyFilters('puck_registered_components', components)
  return { ...puckConfig, components: filtered }
}
```

- [ ] **Step 4: Run the focused test and verify GREEN**

Run: `npx vitest run src/lib/puck/__tests__/client-config.test.ts`

Expected: PASS for active-only filtering, hook application, and rejected fetch behavior.

- [ ] **Step 5: Commit the client resolver**

```bash
git add src/lib/puck/client-config.ts src/lib/puck/__tests__/client-config.test.ts
git commit -m "feat: resolve active plugin Puck components in the editor"
```

### Task 4: Integrate both resolvers into Puck editor and public renderer

**Files:**
- Modify: `src/components/admin/PuckBuilder.tsx`
- Modify: `src/themes/default/components/BlockRenderer.tsx`
- Test: extend `src/lib/puck/__tests__/client-config.test.ts` for resolver rejection and create `src/themes/default/components/__tests__/BlockRenderer.test.ts`

**Interfaces:**
- `PuckBuilder` continues to accept `initialData` and `onPublish`; it initializes with `puckConfig` and replaces it only after `getClientPuckConfig()` resolves.
- `BlockRenderer` becomes async only for the Puck branch and passes `await getServerPuckConfig()` to `<Render>`; Editor.js and HTML branches remain unchanged.

- [ ] **Step 1: Write the failing renderer assertions**

Pin that `BlockRenderer` calls the server resolver for Puck JSON and does not call it for Editor.js or HTML content. Mock `@measured/puck`'s `Render` and the server resolver, then call the async component directly:

```ts
const serverConfig = { components: { Heading: {} } }
serverResolver.mockResolvedValue(serverConfig)

const puckResult = await BlockRenderer({ content: JSON.stringify({ root: {}, content: [] }) })
expect(serverResolver).toHaveBeenCalledOnce()
expect(puckResult).toMatchObject({ props: { config: serverConfig } })

serverResolver.mockClear()
await BlockRenderer({ content: JSON.stringify({ blocks: [{ type: 'paragraph', data: { text: 'legacy' } }] }) })
await BlockRenderer({ content: '<p>legacy html</p>' })
expect(serverResolver).not.toHaveBeenCalled()
```

The client resolver rejection is already pinned in Task 3; the `PuckBuilder` integration will retain its base state and log the rejection in its effect.

- [ ] **Step 2: Run the focused tests and verify RED**

Run: `npx vitest run src/lib/puck/__tests__/client-config.test.ts src/themes/default/components/__tests__/BlockRenderer.test.ts`

Expected: FAIL because `BlockRenderer` still imports `puckConfig` directly and does not call `getServerPuckConfig`.

- [ ] **Step 3: Update `PuckBuilder`**

Use state and an effect with a mounted flag:

```tsx
const [config, setConfig] = useState(puckConfig)

useEffect(() => {
  let mounted = true
  getClientPuckConfig()
    .then((resolved) => { if (mounted) setConfig(resolved) })
    .catch((error) => console.error('Failed to load plugin Puck components:', error))
  return () => { mounted = false }
}, [])
```

Pass `config` to `<Puck>` and keep the existing data parsing and publish callback unchanged.

- [ ] **Step 4: Update `BlockRenderer`**

Use the server resolver only inside the existing `isPuck` branch:

```tsx
if (isPuck) {
  const config = await getServerPuckConfig()
  return <Render config={config} data={parsedContent} />
}
```

Do not make non-Puck content depend on plugin loading.

- [ ] **Step 5: Run focused tests and verify GREEN**

Run the focused test command from Step 2. Expected: PASS, including resolver use for Puck content and preservation of non-Puck branches.

- [ ] **Step 6: Commit the integration**

```bash
git add src/components/admin/PuckBuilder.tsx src/themes/default/components/BlockRenderer.tsx src/lib/puck/__tests__ src/themes/default/components/__tests__
git commit -m "feat: apply plugin Puck components in editor and renderer"
```

### Task 5: Document the plugin contract and run the full verification suite

**Files:**
- Modify: `docs/plugins.md`
- Modify: `docs/superpowers/specs/2026-09-24-puck-component-filter-design.md` only if implementation discovers a deliberate contract clarification

- [ ] **Step 1: Document a client-safe plugin example**

Add this example to `docs/plugins.md`, followed by the active-plugin and fallback rules:

```tsx
export const reportsPlugin: NodePressPlugin = {
  id: 'reports',
  name: 'Relatórios',
  version: '1.0.0',
  puck: {
    components: {
      ReportsTable: {
        fields: { title: { type: 'text' } },
        render: ({ title }) => <section>{title}</section>,
      },
    },
  },
}
```

State that `puck.components` must be client-safe, only active plugins contribute, `puck_registered_components` runs after the merge, and editor failures retain the base config.

- [ ] **Step 2: Run the complete verification suite**

Run:

```bash
npm test
npx tsc --noEmit
npm run lint
npx prisma validate
npm run build
git diff origin/main...HEAD --check
```

Expected: all commands exit 0. Build-time database-unavailable warnings are acceptable only if the build still completes and `/admin` routes remain dynamic.

- [ ] **Step 3: Review the complete diff**

Confirm only the planned files are changed, `artifacts/` is not staged, no server-only import enters `PuckBuilder`, and no base config object is mutated.

- [ ] **Step 4: Commit documentation and final cleanup**

```bash
git add docs/plugins.md
git commit -m "docs: document Puck plugin components"
git status --short
```

Expected: the only remaining untracked path is the pre-existing `artifacts/` directory.

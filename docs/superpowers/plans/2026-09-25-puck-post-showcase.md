# Puck PostShowcase Implementation Plan

> **For agentic workers:** REQUIRED SUB-SKILL: Use superpowers:subagent-driven-development (recommended) or superpowers:executing-plans to implement this plan task-by-task. Steps use checkbox (`- [ ]`) syntax for tracking.

**Goal:** Add a built-in `PostShowcase` Puck block that previews published content in the editor and resolves the same content server-side for public rendering.

**Architecture:** Keep the Puck component client-safe and synchronous. A server-only query service returns a small public DTO, `/api/posts/showcase` supplies editor preview data, and `BlockRenderer` enriches Puck nodes with transient server-resolved items before calling `Render`. The persisted Puck JSON contains only query/display fields; resolved items never become saved content.

**Tech Stack:** Next.js 16 App Router, React 19, TypeScript, Prisma 7, `@measured/puck` 0.20, Vitest, existing `TaxonomyService`, `contentTypeRegistry`, and plugin activation lifecycle.

**Spec:** `docs/superpowers/specs/2026-09-25-puck-post-showcase-design.md`

## Global Constraints

- Only `postStatus = 'publish'` content is eligible for the showcase.
- `limit` is normalized to the inclusive range 1–12.
- `postType` accepts core types `post` and `page`, plus active plugin content types.
- Category filtering uses the `category` taxonomy and returns an empty list when the category has no relationships.
- Public responses expose only `PostShowcaseItem`; never return `postContent`, arbitrary metadata, or private author data.
- The Puck component and config must not import Prisma, `PostService`, or server-only plugin modules.
- Server resolution must be immutable and must not persist transient `items` into post content.
- HTML and Editor.js branches in `BlockRenderer` must not invoke showcase resolution.
- Do not add dependencies; preserve the existing public API error format.

## Review Focus

- An invalid or inactive `postType` must return a controlled client/API error and never query arbitrary database types — test in the query service and API route.
- A missing category must return an empty showcase rather than silently removing the category filter — test in the query service.
- A limit of `0`, a negative value, a decimal, or a value above `12` must normalize deterministically — test in the query service and endpoint.
- A Puck document with repeated identical showcase queries must issue one server query per unique query and leave non-Puck content untouched — test in the server data resolver.
- A preview request that is superseded or fails must not update the editor with stale data or throw through Puck — test the pure request helpers and component state boundary.

---

### Task 1: Define the showcase DTO and server query service

**Files:**
- Create: `src/services/post-showcase.service.ts`
- Test: `src/services/__tests__/post-showcase.service.test.ts`
- Modify: `src/services/post.service.ts` only if the implementation chooses to place the query there; prefer the dedicated service to keep the existing service stable.

**Interfaces:**
- `PostShowcaseQuery = { postType: string; limit: number; category?: string }`.
- `PostShowcaseItem = { id: number; title: string; slug: string; excerpt: string; date: string; thumbnailUrl?: string }`.
- `normalizePostShowcaseQuery(input: { postType?: unknown; limit?: unknown; category?: unknown }): PostShowcaseQuery` rejects a missing type, trims an optional category, and clamps a numeric limit to 1–12; active-type validation belongs to the service boundary.
- `getPublishedPostShowcase(query: PostShowcaseQuery): Promise<PostShowcaseItem[]>` validates active types, applies published/type/category filters, and returns only the DTO.

- [ ] **Step 1: Write the failing service tests**

Mock `@/lib/prisma`, `@/services/taxonomy.service`, `@/services/plugin-factory`, and `@/modules/content` at the module boundary. Pin the query contract with tests like:

```ts
it('returns only published items projected to the public DTO', async () => {
  mocks.contentTypeList.mockReturnValue([{ id: 'animal', label: 'Animais' }])
  mocks.prisma.post.findMany.mockResolvedValue([
    {
      id: 4,
      postTitle: 'Luna',
      postName: 'luna',
      postExcerpt: 'Disponível para adoção',
      postDate: new Date('2026-09-25T12:00:00.000Z'),
      meta: [{ metaValue: '/media/luna.jpg' }],
    },
  ])

  await expect(getPublishedPostShowcase({ postType: 'animal', limit: 6 }))
    .resolves.toEqual([{
      id: 4,
      title: 'Luna',
      slug: 'luna',
      excerpt: 'Disponível para adoção',
      date: '2026-09-25T12:00:00.000Z',
      thumbnailUrl: '/media/luna.jpg',
    }])

  expect(mocks.prisma.post.findMany).toHaveBeenCalledWith(expect.objectContaining({
    where: { postStatus: 'publish', postType: 'animal' },
    take: 6,
  }))
})

it('filters by category IDs and returns empty when the category has no posts', async () => {
  mocks.taxonomy.getPostIdsByTermSlug.mockResolvedValue([4, 8])
  await getPublishedPostShowcase({ postType: 'post', limit: 3, category: 'adocao' })
  expect(mocks.prisma.post.findMany).toHaveBeenCalledWith(expect.objectContaining({
    where: expect.objectContaining({ id: { in: [4, 8] } }),
  }))

  mocks.taxonomy.getPostIdsByTermSlug.mockResolvedValue([])
  await expect(getPublishedPostShowcase({ postType: 'post', limit: 3, category: 'vazio' }))
    .resolves.toEqual([])
})

it('rejects invalid types at the service boundary and normalizes limits', async () => {
  await expect(getPublishedPostShowcase({ postType: 'inactive', limit: 99 }))
    .rejects.toThrow('Invalid post type')
  expect(normalizePostShowcaseQuery({ postType: 'post', limit: 0 }))
    .toEqual({ postType: 'post', limit: 1 })
  expect(normalizePostShowcaseQuery({ postType: 'post', limit: 99.8 }))
    .toEqual({ postType: 'post', limit: 12 })
})
```

Use the active-type loader in the real implementation, but keep the pure limit/category normalization independently testable. Assert that the Prisma `select` does not request `postContent` or arbitrary meta.

- [ ] **Step 2: Run the focused tests and verify RED**

Run: `npx vitest run src/services/__tests__/post-showcase.service.test.ts`

Expected: FAIL because the DTO, normalization, and query service do not exist.

- [ ] **Step 3: Implement the minimal query service**

Create the service with core types plus active registry types:

```ts
const CORE_POST_TYPES = new Set(['post', 'page'])
const MAX_SHOWCASE_LIMIT = 12

export type PostShowcaseItem = {
  id: number
  title: string
  slug: string
  excerpt: string
  date: string
  thumbnailUrl?: string
}

export type PostShowcaseQuery = {
  postType: string
  limit: number
  category?: string
}

export function normalizePostShowcaseQuery(input: {
  postType?: unknown
  limit?: unknown
  category?: unknown
}): PostShowcaseQuery {
  const postType = typeof input.postType === 'string' ? input.postType.trim() : ''
  if (!postType) throw new Error('Invalid post type')
  const numericLimit = typeof input.limit === 'number' ? input.limit : Number(input.limit ?? 6)
  const limit = Math.min(MAX_SHOWCASE_LIMIT, Math.max(1, Math.floor(Number.isFinite(numericLimit) ? numericLimit : 6)))
  const category = typeof input.category === 'string' ? input.category.trim() : undefined
  return category ? { postType, limit, category } : { postType, limit }
}
```

`getPublishedPostShowcase` must call `ensureActivePluginsLoaded`, validate `postType` against `post`/`page` and `contentTypeRegistry.list()`, resolve category IDs through `TaxonomyService.getPostIdsByTermSlug`, return `[]` for no IDs, and query Prisma with `postStatus`, `postType`, optional `id.in`, descending `postDate`, `take`, and a narrow `select`. Map `_thumbnail_url` from the first matching meta row and convert `postDate` to ISO.

- [ ] **Step 4: Run the service tests and verify GREEN**

Run: `npx vitest run src/services/__tests__/post-showcase.service.test.ts`

Expected: all query, projection, category, type, and normalization tests pass.

- [ ] **Step 5: Commit the query boundary**

```bash
git add src/services/post-showcase.service.ts src/services/__tests__/post-showcase.service.test.ts
git commit -m "feat: add published post showcase query"
```

### Task 2: Add preview and content-type API boundaries

**Files:**
- Create: `src/app/api/posts/showcase/route.ts`
- Create: `src/app/api/content-types/route.ts`
- Test: `src/app/api/posts/showcase/__tests__/route.test.ts`
- Test: `src/app/api/content-types/__tests__/route.test.ts`

**Interfaces:**
- `GET /api/posts/showcase?type=post&limit=6&category=adocao` returns `PostShowcaseItem[]`.
- `GET /api/content-types?search=ani` returns `{ types: Array<{ id: string; label: string }> }`.
- Both routes are read-only and public; only the showcase route returns post data.

- [ ] **Step 1: Write failing route tests**

Mock `getPublishedPostShowcase`, `ensureActivePluginsLoaded`, and `contentTypeRegistry`. Verify the route passes parsed values to the service, returns `400` for invalid query input, preserves service errors as the project’s `{ code, message }` `500` response, and filters content types by a case-insensitive search string while always including core `post` and `page` when they match.

```ts
it('returns the public showcase DTO for valid query params', async () => {
  mocks.getPublishedPostShowcase.mockResolvedValue([{ id: 1, title: 'Luna', slug: 'luna', excerpt: '', date: '2026-09-25T00:00:00.000Z' }])
  const response = await GET(new Request('http://localhost/api/posts/showcase?type=post&limit=6&category=adocao'))
  expect(response.status).toBe(200)
  await expect(response.json()).resolves.toEqual(expect.arrayContaining([{ id: 1, slug: 'luna' }]))
  expect(mocks.getPublishedPostShowcase).toHaveBeenCalledWith({ postType: 'post', limit: 6, category: 'adocao' })
})

it('rejects malformed limits before querying the database', async () => {
  const response = await GET(new Request('http://localhost/api/posts/showcase?type=post&limit=abc'))
  expect(response.status).toBe(400)
  expect(mocks.getPublishedPostShowcase).not.toHaveBeenCalled()
})
```

- [ ] **Step 2: Run focused route tests and verify RED**

Run: `npx vitest run src/app/api/posts/showcase/__tests__/route.test.ts src/app/api/content-types/__tests__/route.test.ts`

Expected: FAIL because both route modules and their handlers do not exist.

- [ ] **Step 3: Implement the API routes**

Parse URL parameters without passing raw values into Prisma. The showcase route should reject missing/invalid `type` and non-numeric `limit` with `400`, call `normalizePostShowcaseQuery` for numeric clamping, and return `NextResponse.json(items)`. The service remains responsible for active-type validation and the final 1–12 cap; known invalid/inactive types are mapped to `400`. Catch unexpected errors and return `{ code: 'internal_error', message: 'Error fetching post showcase' }` with status `500`.

The content-type route must await `ensureActivePluginsLoaded`, build:

```ts
const types = [
  { id: 'post', label: 'Posts' },
  { id: 'page', label: 'Pages' },
  ...contentTypeRegistry.list().map(({ id, label }) => ({ id, label })),
]
```

deduplicate by `id`, apply an optional lower-case `search`, sort by label, and return `{ types }`.

- [ ] **Step 4: Run route tests and verify GREEN**

Run: `npx vitest run src/app/api/posts/showcase/__tests__/route.test.ts src/app/api/content-types/__tests__/route.test.ts`

Expected: all success, validation, error-format, search, deduplication, and activation tests pass.

- [ ] **Step 5: Commit the API boundary**

```bash
git add src/app/api/posts/showcase src/app/api/content-types
git commit -m "feat: expose post showcase preview APIs"
```

### Task 3: Add the client-safe PostShowcase component and Puck definition

**Files:**
- Create: `src/components/puck/PostShowcase.tsx`
- Create: `src/lib/puck/post-showcase.ts`
- Test: `src/lib/puck/__tests__/post-showcase.test.ts`
- Modify: `src/lib/puck/config.tsx`

**Interfaces:**
- `buildPostShowcaseUrl(query: PostShowcaseQuery): string` produces the encoded API URL and is pure/testable.
- `PostShowcase` is a client component that accepts `PostShowcaseProps` and uses transient `items` when provided.
- `postShowcaseComponent` is a Puck component definition with fields/defaults and `render: PostShowcase`.

- [ ] **Step 1: Write failing pure/config tests**

Pin URL encoding, defaults, component registration, and field names without rendering hooks directly:

```ts
it('builds an encoded preview URL', () => {
  expect(buildPostShowcaseUrl({ postType: 'animal', limit: 6, category: 'cães e gatos' }))
    .toBe('/api/posts/showcase?type=animal&limit=6&category=c%C3%A3es+e+gatos')
})

it('registers PostShowcase with all issue fields and stable defaults', () => {
  expect(puckConfig.components.PostShowcase).toMatchObject({
    fields: expect.objectContaining({ postType: expect.any(Object), limit: expect.any(Object), category: expect.any(Object), layout: expect.any(Object), showExcerpt: expect.any(Object), showDate: expect.any(Object) }),
    defaultProps: { postType: 'post', limit: 6, category: '', layout: 'grid', showExcerpt: true, showDate: true },
  })
})
```

- [ ] **Step 2: Run focused config tests and verify RED**

Run: `npx vitest run src/lib/puck/__tests__/post-showcase.test.ts`

Expected: FAIL because the shared query URL helper and Puck component definition do not exist.

- [ ] **Step 3: Implement the client-safe component**

Create the shared types and URL helper. Add `PostShowcase` with `useEffect` and `AbortController`: when `items` exists, render it and skip fetch; otherwise fetch the encoded URL, set loading before the request, ignore `AbortError`, and render a neutral empty/error state on failure. Render title links as `/${item.slug}`, use React text escaping, and implement class variants for `grid`, `list`, and horizontally scrollable `carousel`. Keep the API response narrowed to the DTO shape before storing it.

Add `postShowcaseComponent` to `puckConfig.components` with an `external` `postType` field whose `fetchList` calls `/api/content-types`, maps `{ id, label }` to the stored ID, and exposes a search UI. Use `number` min/max for `limit`, `text` for category, a select for layout, and booleans for excerpt/date. The config module must only import the client-safe component and shared types.

- [ ] **Step 4: Run focused tests and verify GREEN**

Run: `npx vitest run src/lib/puck/__tests__/post-showcase.test.ts`

Expected: URL, config, defaults, and component contract tests pass. Also run `npx tsc --noEmit` to verify the Puck external-field types.

- [ ] **Step 5: Commit the Puck component**

```bash
git add src/components/puck/PostShowcase.tsx src/lib/puck/post-showcase.ts src/lib/puck/config.tsx src/lib/puck/__tests__/post-showcase.test.ts
git commit -m "feat: add Puck PostShowcase block"
```

### Task 4: Resolve showcase data server-side before public Puck rendering

**Files:**
- Create: `src/lib/puck/server-showcase-data.ts`
- Test: `src/lib/puck/__tests__/server-showcase-data.test.ts`
- Modify: `src/themes/default/components/BlockRenderer.tsx`
- Modify: `src/themes/default/components/__tests__/BlockRenderer.test.ts`

**Interfaces:**
- `resolvePostShowcaseData(data: Data): Promise<Data>` returns a new Puck data object and injects transient `items` only into `PostShowcase` nodes.
- `BlockRenderer` calls this resolver only in the existing Puck branch before `<Render config={...} data={...} />`.

- [ ] **Step 1: Write failing resolver and renderer tests**

Mock `getPublishedPostShowcase` and the server Puck config. Use Puck data with two equal showcase nodes, one different node, and a non-Puck renderer input:

```ts
it('enriches repeated showcase queries once without mutating the input', async () => {
  mocks.getPublishedPostShowcase.mockResolvedValue([{ id: 1, title: 'Luna', slug: 'luna', excerpt: '', date: '2026-09-25T00:00:00.000Z' }])
  const data = {
    root: {},
    content: [
      { type: 'PostShowcase', props: { postType: 'post', limit: 6, category: '' } },
      { type: 'PostShowcase', props: { postType: 'post', limit: 6, category: '' } },
    ],
  } as any

  const resolved = await resolvePostShowcaseData(data)
  expect(resolved).not.toBe(data)
  expect(resolved.content[0].props.items).toHaveLength(1)
  expect(mocks.getPublishedPostShowcase).toHaveBeenCalledOnce()
  expect(data.content[0].props).not.toHaveProperty('items')
})

it('does not resolve non-Puck content', async () => {
  await BlockRenderer({ content: '<p>legacy</p>' })
  await BlockRenderer({ content: JSON.stringify({ blocks: [{ type: 'paragraph', data: { text: 'legacy' } }] }) })
  expect(mocks.getPublishedPostShowcase).not.toHaveBeenCalled()
})
```

- [ ] **Step 2: Run focused tests and verify RED**

Run: `npx vitest run src/lib/puck/__tests__/server-showcase-data.test.ts src/themes/default/components/__tests__/BlockRenderer.test.ts`

Expected: FAIL because the server resolver is not defined and `BlockRenderer` does not enrich Puck data.

- [ ] **Step 3: Implement immutable server enrichment**

Walk `data.content`, identify only `type === 'PostShowcase'`, normalize each node’s query, cache promises by `JSON.stringify(query)`, and return `{ ...data, content: resolvedContent }`. Copy each matching node and its `props`; never mutate the parsed request object. Let invalid configuration resolve to `items: []` with a warning-compatible empty state, while unexpected database errors propagate through the existing server rendering path.

In `BlockRenderer`, preserve the current `isPuck`, `isEditorJs`, and HTML detection order. In the Puck branch, call `getServerPuckConfig()`, then `resolvePostShowcaseData(parsedContent)`, and pass the resolved data to `Render`. Do not call either resolver for HTML or Editor.js.

- [ ] **Step 4: Run focused tests and verify GREEN**

Run: `npx vitest run src/lib/puck/__tests__/server-showcase-data.test.ts src/themes/default/components/__tests__/BlockRenderer.test.ts`

Expected: server enrichment, deduplication, immutability, Puck rendering, and non-Puck preservation pass.

- [ ] **Step 5: Commit server rendering integration**

```bash
git add src/lib/puck/server-showcase-data.ts src/lib/puck/__tests__/server-showcase-data.test.ts src/themes/default/components/BlockRenderer.tsx src/themes/default/components/__tests__/BlockRenderer.test.ts
git commit -m "feat: resolve Puck showcase data on the server"
```

### Task 5: Document, review, and run the full verification suite

**Files:**
- Modify: `docs/plugins.md` or the Puck documentation section containing built-in blocks
- Test: extend existing Puck/config tests only where the documented contract is not already pinned

- [ ] **Step 1: Document usage and runtime behavior**

Document the `PostShowcase` fields, the active-CPT rule, the published-only rule, the category slug behavior, and the distinction between editor API preview and server-side public enrichment. Include a persisted JSON example that contains query fields but no `items` field.

- [ ] **Step 2: Run the complete verification suite**

Run in the isolated worktree:

```bash
npm test
npx tsc --noEmit
npm run lint
npx prisma validate
npm run build
git diff origin/main...HEAD --check
```

Expected: all commands exit 0. Build-time database-unavailable warnings are acceptable only when the existing fallback completes successfully and the Puck/public routes remain available.

- [ ] **Step 3: Review the complete diff**

Confirm no server-only imports enter `PostShowcase.tsx` or the Puck config, no `items` field is saved by editor publish, invalid types cannot broaden Prisma queries, and the revert of PR #47 remains intact.

- [ ] **Step 4: Commit documentation and final cleanup**

```bash
git add docs/plugins.md
git commit -m "docs: document Puck PostShowcase block"
git status --short
```

Expected: the worktree is clean except for any pre-existing untracked `artifacts/` outside the isolated feature worktree.

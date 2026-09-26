# Builder Foundation Implementation Plan

> **For agentic workers:** REQUIRED SUB-SKILL: Use superpowers:subagent-driven-development (recommended) or superpowers:executing-plans to implement this plan task-by-task. Steps use checkbox (`- [ ]`) syntax for tracking.

**Goal:** Introduce a versioned, validated `BuilderDocument` contract around the existing Puck editor and public renderer while preserving Editor.js, HTML, and legacy Puck content.

**Architecture:** Add a pure document module that parses, normalizes, validates, and serializes Puck data without importing React, Prisma, hooks, or plugin runtime code. The client editor uses it to load legacy/canonical data and persist canonical JSON; the server renderer uses it before resolving active plugin components and rendering published content. Existing Puck component resolvers remain the source of truth for base and active-plugin components.

**Tech Stack:** Next.js App Router, React 19, TypeScript, `@measured/puck`, Vitest, existing `PostEditor`, `PuckBuilder`, `BlockRenderer`, plugin Puck resolvers, and the current `postContent` persistence field.

**Spec:** `docs/superpowers/specs/2026-09-26-builder-foundation-design.md`

## Global Constraints

- The canonical document uses `version: 1`, `content`, `root`, and `metadata.editor: 'puck'` / `metadata.schemaVersion: 1`.
- Legacy `{ content, root }` Puck data is accepted and normalized in memory; existing rows are not batch-rewritten.
- HTML legacy and Editor.js branches remain compatible and must not depend on Puck plugin loading.
- The public renderer never executes JavaScript from a document and must not render unknown Puck component types.
- Client resolution failures retain the base Puck configuration; server failures produce an observable safe fallback.
- The current `postContent` field remains the persistence boundary for this issue.
- Do not modify unrelated existing untracked paths: `artifacts/` and `src/app/api/content-types/`.

## Review Focus

- A legacy Puck document without `version` or `metadata` must normalize to version 1 without changing `content` or `root`; test in Task 1.
- A document with an unknown version or malformed `content`/`root` must be rejected without throwing from the public renderer; test in Task 1.
- A component type removed or disabled by a plugin must not render publicly; test in Task 2.
- HTML and Editor.js content must bypass Puck parsing and plugin resolution; test in Task 4.
- A client editor save/reopen cycle must produce deterministic canonical JSON and preserve the document tree; test in Task 3.

---

### Task 1: Define and test the pure BuilderDocument contract

**Files:**
- Create: `src/lib/puck/document.ts`
- Modify: `src/lib/puck/types.ts`
- Test: `src/lib/puck/__tests__/document.test.ts`

**Interfaces:**
- `BuilderDocument` with `version: 1`, `content: unknown[]`, `root: Record<string, unknown>`, and `metadata: { editor: 'puck'; schemaVersion: 1; updatedAt?: string }`.
- `BuilderContext = 'post' | 'page' | 'template' | 'landing'` is the explicit context passed to resolver boundaries; the first version shares the current component set across contexts.
- `MAX_BUILDER_DOCUMENT_BYTES` and `MAX_BUILDER_DOCUMENT_DEPTH` are exported limits used by the parser before any builder document reaches a renderer.
- `BuilderParseResult = { kind: 'puck'; document: BuilderDocument } | { kind: 'editorjs'; document: unknown } | { kind: 'html'; content: string } | { kind: 'invalid'; reason: string }`.
- `parseBuilderDocument(value: unknown): BuilderParseResult`.
- `serializeBuilderDocument(document: BuilderDocument): string`.
- `isBuilderDocument(value: unknown): value is BuilderDocument`.
- `createEmptyBuilderDocument(): BuilderDocument` returning version 1 with empty `content`, empty `root`, and `metadata.editor === 'puck'`.

- [ ] **Step 1: Write the failing tests**

Test these exact cases with plain objects and JSON strings:

```ts
it('normalizes legacy Puck data without changing its tree', () => {
  const result = parseBuilderDocument({ root: {}, content: [{ type: 'Heading', props: { title: 'Hi' } }] })
  expect(result.kind).toBe('puck')
  expect(result.document.version).toBe(1)
  expect(result.document.content).toEqual([{ type: 'Heading', props: { title: 'Hi' } }])
})

it('accepts canonical data and serializes it deterministically', () => {
  const document = createEmptyBuilderDocument()
  expect(parseBuilderDocument(JSON.parse(serializeBuilderDocument(document))).kind).toBe('puck')
})

it('rejects unsupported versions and malformed trees', () => {
  expect(parseBuilderDocument({ version: 2, root: {}, content: [] }).kind).toBe('invalid')
  expect(parseBuilderDocument({ version: 1, root: [], content: [] }).kind).toBe('invalid')
  expect(parseBuilderDocument({ version: 1, root: {}, content: 'bad' }).kind).toBe('invalid')
})

it('rejects oversized or excessively deep documents before rendering', () => {
  expect(parseBuilderDocument('x'.repeat(MAX_BUILDER_DOCUMENT_BYTES + 1)).kind).toBe('invalid')
  expect(parseBuilderDocument(makeNestedValue(MAX_BUILDER_DOCUMENT_DEPTH + 1)).kind).toBe('invalid')
})

it('keeps Editor.js and HTML content on their existing branches', () => {
  expect(parseBuilderDocument({ blocks: [] }).kind).toBe('editorjs')
  expect(parseBuilderDocument('<p>legacy</p>').kind).toBe('html')
})
```

- [ ] **Step 2: Run the focused test and verify RED**

Run: `npx vitest run src/lib/puck/__tests__/document.test.ts`

Expected: FAIL because the document module and exported contract do not exist.

- [ ] **Step 3: Implement the pure parser and serializer**

Implement structural checks without Zod or a new dependency. Accept JSON strings and parsed objects, enforce named byte/depth limits before rendering, recognize Editor.js before Puck, require object `root` and array `content`, accept legacy Puck data, reject versions other than 1, and return classified invalid results rather than throwing. Use stable JSON serialization of the canonical object and never include runtime values in error text.

- [ ] **Step 4: Run the focused test and verify GREEN**

Run: `npx vitest run src/lib/puck/__tests__/document.test.ts`

Expected: PASS for legacy normalization, canonical round-trip, invalid input classification, and non-Puck branches.

- [ ] **Step 5: Commit the document contract**

```bash
git add src/lib/puck/document.ts src/lib/puck/types.ts src/lib/puck/__tests__/document.test.ts
git commit -m "feat: add versioned builder document contract"
```

### Task 2: Add component-aware validation against the resolved Puck config

**Files:**
- Modify: `src/lib/puck/document.ts`
- Test: `src/lib/puck/__tests__/document.test.ts`

**Interfaces:**
- `validateBuilderComponents(document: BuilderDocument, componentIds: ReadonlySet<string>): { valid: true } | { valid: false; unknownTypes: string[] }`.

- [ ] **Step 1: Write the failing tests**

Add tests that a document containing `Heading` passes when `Heading` is in the set, a document containing `RemovedPluginCard` fails when it is absent, duplicate unknown types are returned once in stable order, and an empty document passes.

- [ ] **Step 2: Run the focused test and verify RED**

Run: `npx vitest run src/lib/puck/__tests__/document.test.ts`

Expected: FAIL because component-aware validation is not implemented.

- [ ] **Step 3: Implement `validateBuilderComponents`**

Inspect only top-level Puck content entries and collect string `type` values. Return a stable list of missing types; do not mutate the document or attempt to inspect component props.

- [ ] **Step 4: Run the focused test and verify GREEN**

Run: `npx vitest run src/lib/puck/__tests__/document.test.ts`

Expected: PASS, including disabled-plugin and duplicate-type cases.

- [ ] **Step 5: Commit component validation**

```bash
git add src/lib/puck/document.ts src/lib/puck/__tests__/document.test.ts
git commit -m "feat: validate builder component availability"
```

### Task 3: Integrate canonical documents into the client editor

**Files:**
- Modify: `src/components/admin/PuckBuilder.tsx`
- Modify: `src/components/admin/PostEditor.tsx` to preserve the canonical serialized string instead of serializing it a second time
- Test: `src/lib/puck/__tests__/document.test.ts` and the existing Puck/editor tests

**Interfaces:**
- `PuckBuilder` continues accepting `initialData: string | object` and exposes `onPublish: (serialized: string) => void`; `PostEditor` stores that canonical string directly.

- [ ] **Step 1: Write the failing test**

Add a pure round-trip assertion that a legacy initial document passed through the editor boundary is normalized to version 1 and that publishing it serializes `content` and `root` without loss. Keep the test independent of browser rendering by exercising the document helpers and the callback adapter.

- [ ] **Step 2: Run the focused tests and verify RED**

Run: `npx vitest run src/lib/puck/__tests__/document.test.ts src/lib/puck/__tests__/client-config.test.ts`

Expected: FAIL because `PuckBuilder` currently passes raw Puck JSON through without canonicalization.

- [ ] **Step 3: Update `PuckBuilder`**

Use `parseBuilderDocument(initialData)` on load. Pass only the normalized `document` to Puck. If the input is missing or invalid, start with `createEmptyBuilderDocument()` and log a concise diagnostic. Adapt Puck's `Data` callback by wrapping it in the version 1 document shape, updating `metadata.updatedAt`, serializing it, and passing the canonical string through the existing `PostEditor` state callback. Keep the client resolver's base-config fallback and validate loaded component IDs against the resolved client config before treating a document as editable; unknown components must remain diagnosable rather than being silently discarded. Do not change plugin lifecycle loading.

- [ ] **Step 4: Run focused tests and verify GREEN**

Run: `npx vitest run src/lib/puck/__tests__/document.test.ts src/lib/puck/__tests__/client-config.test.ts`

Expected: PASS, with existing Puck plugin resolver tests unchanged.

- [ ] **Step 5: Commit client persistence integration**

```bash
git add src/components/admin/PuckBuilder.tsx src/components/admin/PostEditor.tsx src/lib/puck/document.ts src/lib/puck/__tests__/document.test.ts
git commit -m "feat: persist canonical builder documents"
```

### Task 4: Integrate parsing and validation into the public renderer

**Files:**
- Modify: `src/themes/default/components/BlockRenderer.tsx`
- Modify: `src/lib/puck/server-config.ts`
- Test: `src/themes/default/components/__tests__/BlockRenderer.test.ts`
- Test: `src/lib/puck/__tests__/server-config.test.ts`

**Interfaces:**
- `BlockRenderer({ content, context }: { content: string; context?: BuilderContext })` remains backward-compatible with `context = 'post'`.
- `getServerPuckConfig(context: BuilderContext)` receives the explicit context while the first implementation shares the current component set for every context.
- It uses `parseBuilderDocument`, `getServerPuckConfig`, and `validateBuilderComponents` only for the Puck branch.

- [ ] **Step 1: Write the failing tests**

Extend the renderer suite to assert:

```ts
it('normalizes legacy Puck content before rendering', async () => {
  const result = await BlockRenderer({ content: JSON.stringify({ root: {}, content: [] }) })
  expect(serverConfigResolver).toHaveBeenCalledOnce()
  expect(renderMock).toHaveBeenCalledWith(expect.objectContaining({ data: expect.objectContaining({ version: 1 }) }))
})

it('does not resolve Puck plugins for Editor.js or HTML content', async () => {
  await BlockRenderer({ content: JSON.stringify({ blocks: [] }) })
  await BlockRenderer({ content: '<p>legacy</p>' })
  expect(serverConfigResolver).not.toHaveBeenCalled()
})
```

Also pin that an unknown component returns the safe invalid-content fallback and does not call Puck `Render`.

- [ ] **Step 2: Run the focused test and verify RED**

Run: `npx vitest run src/themes/default/components/__tests__/BlockRenderer.test.ts`

Expected: FAIL because the renderer currently performs its own shape detection and renders any Puck-shaped data without version/component validation.

- [ ] **Step 3: Implement the renderer pipeline**

Replace manual Puck detection with `parseBuilderDocument`. For `kind === 'puck'`, resolve the server config with the explicit context, validate component types from `Object.keys(config.components)`, and render only when valid. For `editorjs` and `html`, preserve the existing branches. For `invalid`, return a safe non-executable fallback with an observable server warning; never pass invalid JSON to `dangerouslySetInnerHTML` or Puck `Render`.

- [ ] **Step 4: Run focused tests and verify GREEN**

Run: `npx vitest run src/themes/default/components/__tests__/BlockRenderer.test.ts src/lib/puck/__tests__/server-config.test.ts`

Expected: PASS for legacy/canonical Puck, unknown components, Editor.js, HTML, and plugin resolver ordering.

- [ ] **Step 5: Commit public renderer integration**

```bash
git add src/themes/default/components/BlockRenderer.tsx src/lib/puck/server-config.ts src/themes/default/components/__tests__/BlockRenderer.test.ts src/lib/puck/__tests__/server-config.test.ts
git commit -m "feat: validate builder documents before public rendering"
```

### Task 5: Document the contract and run the complete verification suite

**Files:**
- Modify: `docs/plugins.md` if it exists; otherwise create it with the Puck plugin contract section
- Modify: `docs/superpowers/specs/2026-09-26-builder-foundation-design.md` only if implementation reveals a deliberate contract correction
- Test: existing suite; add no new behavior in this task

- [ ] **Step 1: Document the public contract**

Document `BuilderDocument`, legacy normalization, active-plugin component rules, unknown-component behavior, client fallback, and the prohibition on arbitrary JavaScript in documents. Include a client-safe plugin component example and link to the Puck component filter design.

- [ ] **Step 2: Run complete verification**

Run:

```bash
npm test
npx tsc --noEmit
npm run lint
npx prisma validate
npm run build
git diff origin/main...HEAD --check
```

Expected: all checks pass. If the local Windows environment reports `spawn EPERM` inside Next's own parallel typecheck, retain the independently passing `npx tsc --noEmit` evidence and report the build limitation explicitly.

- [ ] **Step 3: Review the final diff**

Confirm that only the planned document, editor, renderer, test, and documentation files are changed; the existing untracked `artifacts/` and `src/app/api/content-types/` paths are not staged; no server-only import entered `PuckBuilder`; and no persisted content is batch-rewritten.

- [ ] **Step 4: Commit documentation and final cleanup**

```bash
git add docs/plugins.md docs/superpowers/specs/2026-09-26-builder-foundation-design.md
git commit -m "docs: document the builder foundation contract"
git status --short
```

Expected: no planned changes remain unstaged; unrelated pre-existing untracked paths remain untouched.

# WordPress-Style Plugin System Implementation Plan

> **For agentic workers:** REQUIRED SUB-SKILL: Use superpowers:executing-plans to implement this plan task-by-task. Steps use checkbox (`- [ ]`) syntax for tracking.

**Goal:** Implement first-class, code-managed NodePress plugins with lifecycle, migrations, permissions, and automatic admin/public menu aggregation while preserving existing legacy plugins and themes.

**Architecture:** Keep `src/plugins/registry.ts` as the discovery boundary, but make it export typed plugin manifests alongside legacy imports. Add a `PluginService` that validates manifests, runs plugin migrations through Prisma transactions, persists activation, and registers hooks/menus only after successful migration. Add a pure `MenuService` that collects contributions from active plugins, validates hierarchy, sorts deterministically, deduplicates IDs, and filters capabilities.

**Tech Stack:** TypeScript, Next.js App Router, Prisma 7, PostgreSQL, NextAuth, Vitest.

**Spec:** `docs/superpowers/specs/2026-09-19-wordpress-style-plugin-system-design.md`

## Global Constraints

- Plugins are trusted in-process TypeScript; no remote installation or sandboxing.
- Migration execution must be transactional and must reject checksum changes after application.
- Deactivation removes runtime contributions but never deletes plugin data.
- Existing `hello-dolly` and `seo-optimizer` imports remain functional.
- Existing theme components (`SinglePost`, `SinglePage`, `Archive`) retain their current contract.
- All new public APIs must be type-safe and reject invalid plugin/menu IDs.

## Review Focus

- A failed migration must not persist activation or partial database changes; Task 4 tests a rejected transaction and activation state.
- A previously applied migration whose checksum changes must fail loudly; Task 3 tests checksum mismatch.
- Duplicate IDs, missing parents, and cycles must not produce a malformed menu tree; Task 5 tests each invalid graph shape.
- Deactivated plugins must contribute neither hooks nor menus while preserving migrations and data; Task 4 tests lifecycle cleanup.
- Legacy plugins must still load without a manifest; Task 2 tests the registry compatibility path.

---

### Task 1: Add the test harness and plugin domain contracts

**Files:**
- Create: `vitest.config.ts`
- Modify: `package.json`
- Create: `src/plugins/types.ts`
- Create: `src/plugins/validation.ts`
- Test: `src/plugins/__tests__/validation.test.ts`

**Interfaces:**
- Produces `NodePressPlugin`, `PluginMigration`, `PluginMenuItem`, `PluginSurface`, `PluginContext`, and `PluginCapability` types for all later tasks.
- Produces `validatePluginManifest(plugin: NodePressPlugin): void`, throwing an `Error` with the plugin ID and invalid field.

- [ ] **Step 1: Add Vitest scripts and configuration**

Add `vitest` as a dev dependency and add these scripts to `package.json`:

```json
{
  "scripts": {
    "test": "vitest run",
    "test:watch": "vitest",
    "test:coverage": "vitest run --coverage"
  }
}
```

Configure `vitest.config.ts` with the existing `@/*` alias, Node environment, and tests under `src/**/*.test.ts`.

- [ ] **Step 2: Write the failing manifest validation tests**

Cover a valid manifest, empty/invalid plugin ID, invalid version, duplicate menu IDs within a plugin, and invalid migration IDs. Run `npm test -- src/plugins/__tests__/validation.test.ts`; expect failure because the types and validator do not exist.

- [ ] **Step 3: Define the plugin contracts**

Create the following shapes:

```ts
export type PluginSurface = 'admin' | 'public'
export type PluginCapability = string

export interface PluginMenuItem {
  id: string
  label: string
  surface: PluginSurface
  href?: string
  parentId?: string
  position?: number
  capability?: PluginCapability
  icon?: string
  children?: PluginMenuItem[]
}

export interface PluginMigration {
  id: string
  up(tx: Prisma.TransactionClient): Promise<void>
  down?(tx: Prisma.TransactionClient): Promise<void>
}

export interface NodePressPlugin {
  id: string
  name: string
  version: string
  permissions?: PluginCapability[]
  migrations?: PluginMigration[]
  register(context: PluginContext): void | Promise<void>
}
```

`PluginContext` exposes `hooks`, `menus`, and the plugin ID; menu registration must attach the plugin ID internally rather than trusting plugin input.

- [ ] **Step 4: Implement minimal validation and run the focused tests**

Validate IDs with `/^[a-z0-9]+(?:-[a-z0-9]+)*$/`, require semver-like non-empty versions, reject duplicate migration IDs, and validate menu IDs at registration. Run `npm test -- src/plugins/__tests__/validation.test.ts`; expect PASS.

- [ ] **Step 5: Run typecheck and commit**

Run `npx tsc --noEmit`, then commit:

```bash
git add package.json package-lock.json vitest.config.ts src/plugins/types.ts src/plugins/validation.ts src/plugins/__tests__/validation.test.ts
git commit -m "feat: add plugin contracts and test harness"
```

### Task 2: Make hook registration reversible and preserve legacy plugins

**Files:**
- Modify: `src/services/hook.service.ts`
- Modify: `src/plugins/registry.ts`
- Modify: `src/plugins/hello-dolly/index.tsx`
- Modify: `src/plugins/seo-optimizer/index.ts`
- Create: `src/plugins/legacy.ts`
- Test: `src/services/__tests__/hook.service.test.ts`
- Test: `src/plugins/__tests__/registry.test.ts`

**Interfaces:**
- `HookService.addAction` and `addFilter` return `() => void` unsubscribe functions.
- `HookService.removeAction(tag, callback)` and `removeFilter(tag, callback)` are available for lifecycle cleanup.
- `getRegisteredPlugins(): NodePressPlugin[]` returns new manifests while loading legacy modules exactly once.

- [ ] **Step 1: Write failing hook cleanup tests**

Assert that an action runs while registered, stops after its unsubscribe function is called, and that a filter preserves priority order. Run `npm test -- src/services/__tests__/hook.service.test.ts`; expect failure because registration currently returns `void`.

- [ ] **Step 2: Implement reversible hook registration**

Store callback identity in the hook entry, return an idempotent unsubscribe closure, and keep `ensurePluginsLoaded()` behavior unchanged. Do not clear all hooks globally because Next.js development reloads rely on the existing singleton.

- [ ] **Step 3: Write the failing registry compatibility test**

Create a test that imports the registry and confirms legacy modules remain loadable while a typed manifest can be returned from the same registry boundary.

- [ ] **Step 4: Add the typed registry boundary**

Create `src/plugins/legacy.ts` for the old side-effect imports and change `src/plugins/registry.ts` to export:

```ts
export const registeredPlugins: NodePressPlugin[] = [
  // new manifests are added here
]

export async function loadLegacyPlugins(): Promise<void> {
  await import('./legacy')
}
```

The first implementation must keep `hello-dolly` and `seo-optimizer` as legacy modules. Run the focused tests and confirm both hook plugins still register.

- [ ] **Step 5: Run the full test suite and commit**

Run `npm test`, then commit:

```bash
git add src/services/hook.service.ts src/plugins/registry.ts src/plugins/legacy.ts src/plugins/hello-dolly/index.tsx src/plugins/seo-optimizer/index.ts src/services/__tests__/hook.service.test.ts src/plugins/__tests__/registry.test.ts
git commit -m "feat: make plugin hooks reversible"
```

### Task 3: Add the plugin migration ledger and migration runner

**Files:**
- Modify: `prisma/schema.prisma`
- Create: `prisma/migrations/20260919000000_add_plugin_migrations/migration.sql`
- Create: `src/plugins/migration-runner.ts`
- Create: `src/plugins/checksum.ts`
- Test: `src/plugins/__tests__/migration-runner.test.ts`

**Interfaces:**
- `PluginMigrationRunner.runPending(plugin: NodePressPlugin): Promise<void>`.
- `PluginMigrationRunner.getApplied(pluginId: string): Promise<AppliedPluginMigration[]>`.
- `checksumMigration(migration: PluginMigration): string`.

- [ ] **Step 1: Add the failing migration-runner unit tests**

Use an in-memory fake transaction client implementing only `$queryRaw`, `$executeRaw`, and `$transaction` to test: ordered application, already-applied same checksum skip, changed checksum rejection, and rollback when `up` throws. Run the focused test; expect failure because the runner does not exist.

- [ ] **Step 2: Add the Prisma ledger model and SQL migration**

Add this model to `prisma/schema.prisma`:

```prisma
model PluginMigration {
  id          Int      @id @default(autoincrement())
  pluginId    String   @map("plugin_id") @db.VarChar(100)
  migrationId String   @map("migration_id") @db.VarChar(150)
  checksum    String   @db.VarChar(128)
  pluginVersion String @map("plugin_version") @db.VarChar(50)
  appliedAt   DateTime @default(now()) @map("applied_at")

  @@unique([pluginId, migrationId])
  @@index([pluginId])
  @@map("np_plugin_migrations")
}
```

Create the matching PostgreSQL migration with the unique constraint and index. Run `npx prisma validate` and `npx prisma generate`.

- [ ] **Step 3: Implement deterministic checksums**

Hash the migration ID plus the normalized function source with SHA-256. Store a hexadecimal checksum and reject a later migration with the same `(pluginId, migrationId)` and a different checksum.

- [ ] **Step 4: Implement transactional execution**

Load applied rows, validate the complete migration list before executing anything, then call `prisma.$transaction(async (tx) => { ... })`. Inside the transaction run each pending `up(tx)` and insert its ledger row. If any `up` rejects, allow the transaction to throw and do not return success.

- [ ] **Step 5: Run focused tests, Prisma validation, and commit**

Run `npm test -- src/plugins/__tests__/migration-runner.test.ts`, `npx prisma validate`, and `npx tsc --noEmit`. Commit:

```bash
git add prisma/schema.prisma prisma/migrations/20260919000000_add_plugin_migrations/migration.sql src/plugins/migration-runner.ts src/plugins/checksum.ts src/plugins/__tests__/migration-runner.test.ts
git commit -m "feat: add transactional plugin migrations"
```

### Task 4: Implement plugin activation and deactivation lifecycle

**Files:**
- Create: `src/services/plugin.service.ts`
- Modify: `src/services/option.service.ts`
- Modify: `src/plugins/registry.ts`
- Create: `src/app/api/admin/plugins/route.ts`
- Create: `src/app/api/admin/plugins/[pluginId]/activate/route.ts`
- Create: `src/app/api/admin/plugins/[pluginId]/deactivate/route.ts`
- Test: `src/services/__tests__/plugin.service.test.ts`

**Interfaces:**
- `PluginService.list(): Promise<PluginStatus[]>`.
- `PluginService.activate(pluginId: string): Promise<PluginStatus>`.
- `PluginService.deactivate(pluginId: string): Promise<PluginStatus>`.
- `PluginService.loadActive(): Promise<void>`.

- [ ] **Step 1: Write failing lifecycle tests**

Test that activation runs migrations before persistence, does not persist after migration failure, deactivation removes runtime contributions while preserving active migration rows, and unknown plugin IDs are rejected. Run the focused test; expect failure because `PluginService` does not exist.

- [ ] **Step 2: Add active-plugin option helpers**

Extend `OptionService` with `getActivePluginIds()`, `setActivePluginIds(ids)`, and `clearCache(keys?)`. Parse malformed JSON as an empty list, deduplicate IDs, and persist only registered plugin IDs.

- [ ] **Step 3: Implement the service lifecycle**

The service validates all manifests, loads persisted IDs, runs migrations for activation, calls `plugin.register(context)` once, tracks cleanup callbacks, and removes those callbacks during deactivation. Guard concurrent activation/deactivation with a per-plugin promise map so two requests cannot run the same migration batch simultaneously.

- [ ] **Step 4: Add authenticated admin API routes**

Use `auth()` from `src/auth.ts`, require `session.user.role === 'admin'`, and return JSON status. `GET /api/admin/plugins` lists registered, active, version, and migration state. `POST /api/admin/plugins/:pluginId/activate` and `/deactivate` call the service and return `409` for lifecycle conflicts, `404` for unknown IDs, and `500` with a safe error message for migration failure.

- [ ] **Step 5: Run tests, lint, and commit**

Run `npm test`, `npm run lint`, and `npx tsc --noEmit`. Commit:

```bash
git add src/services/plugin.service.ts src/services/option.service.ts src/plugins/registry.ts src/app/api/admin/plugins src/services/__tests__/plugin.service.test.ts
git commit -m "feat: add plugin activation lifecycle"
```

### Task 5: Build the automatic menu aggregator

**Files:**
- Create: `src/services/menu.service.ts`
- Create: `src/services/menu.types.ts`
- Create: `src/app/api/menus/route.ts`
- Modify: `src/plugins/types.ts`
- Test: `src/services/__tests__/menu.service.test.ts`

**Interfaces:**
- `MenuService.register(pluginId: string, item: PluginMenuItem): () => void`.
- `MenuService.getTree(surface: PluginSurface, capabilityChecker: (capability?: string) => boolean): MenuNode[]`.
- `MenuService.clearPlugin(pluginId: string): void`.

- [ ] **Step 1: Write failing menu tests**

Cover deterministic position/id ordering, parent-child grouping, capability filtering, duplicate IDs, missing parents, and cycle rejection. Run the focused test; expect failure because `MenuService` does not exist.

- [ ] **Step 2: Implement registration and validation**

Keep contributions in a per-plugin registry. Require a non-empty label and valid ID, default `position` to `100`, and reject duplicate IDs for the same surface. Registration returns an idempotent cleanup function.

- [ ] **Step 3: Implement tree construction**

Filter by surface and capability, remove inactive plugin contributions through `clearPlugin`, sort siblings by `(position, id)`, attach children by `parentId`, and throw a descriptive error for missing parents or cycles. Return frozen nodes so consumers cannot mutate the shared registry.

- [ ] **Step 4: Add the menu API**

Create `GET /api/menus?surface=admin|public`. For `admin`, use the authenticated user role/capability checker; for `public`, allow only items without a capability requirement. Never return plugin callbacks or arbitrary HTML.

- [ ] **Step 5: Run tests, lint, and commit**

Run `npm test`, `npm run lint`, and `npx tsc --noEmit`. Commit:

```bash
git add src/services/menu.service.ts src/services/menu.types.ts src/app/api/menus src/plugins/types.ts src/services/__tests__/menu.service.test.ts
git commit -m "feat: aggregate plugin menus"
```

### Task 6: Connect themes, admin navigation, and a real example plugin

**Files:**
- Modify: `src/themes/types.ts`
- Modify: `src/themes/registry.ts`
- Create: `src/components/admin/PluginMenu.tsx`
- Modify: `src/app/(web)/admin` route component that currently renders the admin navigation, identified by the existing hard-coded `/admin` links before implementation
- Create: `src/plugins/animals/index.ts`
- Create: `src/plugins/animals/migrations/001_create_animals.ts`
- Create: `src/plugins/animals/README.md`
- Test: `src/plugins/__tests__/animals-plugin.test.ts`

**Interfaces:**
- Theme renderers receive `menus: MenuNode[]` through their existing options/context object.
- `animalsPlugin` demonstrates one migration, one admin menu item, one public menu item, and one capability.

- [ ] **Step 1: Write the failing theme/example tests**

Assert the theme registry resolves the active theme from `OptionService.active_theme`, and the example plugin registers its admin/public menu items and migration without editing multiple lifecycle files.

- [ ] **Step 2: Make theme resolution consume the menu service**

Add a typed `menus` property to the existing theme options/context type. Resolve the active theme safely, falling back to `default` when the option is missing or unknown. Pass the public menu tree to `SinglePost`, `SinglePage`, and `Archive` call sites without changing their required existing props.

- [ ] **Step 3: Replace hard-coded admin navigation with aggregated items**

Create `src/components/admin/PluginMenu.tsx` as a server/client-safe renderer for `MenuNode[]`. Update the current admin navigation route component that owns the hard-coded `/admin` links to fetch `GET /api/menus?surface=admin`, render nested menu nodes through `PluginMenu`, retain core NodePress links as core contributions, and hide entries without the current capability. Keep a loading and empty state so the setup wizard does not fail when the database is unavailable.

- [ ] **Step 4: Add the example plugin**

Create `animalsPlugin` with capability `animals.read`, an admin link at `/admin/animals`, a public link at `/animals`, and a migration that creates an `np_animals` table with `id`, `name`, `slug`, `status`, `created_at`, and `updated_at`. Register it in the typed registry and document activation/deactivation behavior.

- [ ] **Step 5: Run the complete verification suite and commit**

Run `npm test`, `npm run lint`, `npx tsc --noEmit`, `npx prisma validate`, and `npm run build`. Commit:

```bash
git add src/themes src/components/admin/PluginMenu.tsx src/app/(web)/admin src/plugins/animals src/plugins/__tests__/animals-plugin.test.ts
git commit -m "feat: connect plugin menus and theme navigation"
```

### Task 7: Document the plugin author workflow and perform final verification

**Files:**
- Modify: `README.md`
- Create: `docs/plugins.md`
- Modify: `src/plugins/hello-dolly/index.tsx`
- Modify: `src/plugins/seo-optimizer/index.ts`

- [ ] **Step 1: Document the complete workflow**

Document manifest creation, registration, capabilities, menu contributions, migrations, activation, deactivation, and the rule that deactivation preserves data. Include a minimal plugin example and a migration example.

- [ ] **Step 2: Migrate legacy examples to the documented cleanup API where safe**

Keep their current behavior and avoid changing their output. If a legacy module cannot expose cleanup without changing Next.js loading semantics, document it as legacy rather than forcing a risky rewrite.

- [ ] **Step 3: Run the full verification commands**

Run all of:

```bash
npm test
npm run lint
npx tsc --noEmit
npx prisma validate
npm run build
```

Record any pre-existing failure by command and file; do not claim completion until the new tests and build pass.

- [ ] **Step 4: Commit the documentation and final changes**

```bash
git add README.md docs/plugins.md src/plugins/hello-dolly/index.tsx src/plugins/seo-optimizer/index.ts
git commit -m "docs: document plugin development workflow"
```

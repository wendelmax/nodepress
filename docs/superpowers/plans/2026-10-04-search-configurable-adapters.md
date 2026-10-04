# Busca configurável com adapters Implementation Plan

> **For agentic workers:** REQUIRED SUB-SKILL: Use superpowers:subagent-driven-development (recommended) or superpowers:executing-plans to implement this plan task-by-task. Steps use checkbox (`- [ ]`) syntax for tracking.

**Goal:** Implement the issue #73 search MVP with a stable adapter contract, local Prisma/PostgreSQL indexing, safe public/admin APIs, tenant-aware generic content, and regression coverage.

**Architecture:** A `SearchService` owns query/config validation and delegates to a `SearchAdapter`. `PrismaSearchAdapter` builds and searches a unique `SearchDocument` projection from published posts, generic content, taxonomies, and registered content types; configuration is stored in existing `Option` rows.

**Tech Stack:** Next.js App Router route handlers, TypeScript, Prisma 7/PostgreSQL, Vitest, existing `auth`, `OptionService`, and `requireAdmin` helpers.

**Spec:** `docs/superpowers/specs/2026-10-04-search-configurable-adapters-design.md`

## Global Constraints

- Public search returns published content only and never accepts a caller-controlled tenant selector.
- Admin search endpoints use the existing `requireAdmin` authorization helper.
- The local adapter must be dependency-free beyond the existing Prisma/PostgreSQL stack.
- Reindexing must replace by unique source key and be safe to repeat.
- Existing APIs and tests must remain compatible.

## Review Focus

- Draft/trash records must never be returned by public search; route tests pin the published-only behavior.
- Accented and approximate terms must rank an intended result; utility/adapter tests pin deterministic relevance.
- Tenant-scoped generic content must not cross the requested trusted context; adapter tests pin both inclusion and exclusion.
- Reindexing must not duplicate documents; store/adapter tests pin repeated calls.
- Non-admin users must not inspect or mutate search configuration; admin route tests pin 403 behavior.

### Task 1: Search domain contract and pure query behavior

**Files:**
- Create: `src/modules/search/search.types.ts`
- Create: `src/modules/search/search.utils.ts`
- Create: `src/modules/search/__tests__/search.utils.test.ts`
- Create: `src/modules/search/index.ts`

**Interfaces:**
- Produces `SearchAdapter`, `SearchQuery`, `SearchDocument`, `SearchResult`, `SearchPage`, `SearchHealth`, `ReindexResult`, normalization and highlight helpers used by later tasks.

- [ ] Write failing tests for accent normalization, token scoring, field weighting, safe highlight fragments, pagination defaults, and invalid bounds.
- [ ] Run `npx vitest run src/modules/search/__tests__/search.utils.test.ts` and observe the expected missing-module failures.
- [ ] Implement the pure domain types and utilities with fixed limits (`page >= 1`, `1 <= pageSize <= 100`) and deterministic score ordering.
- [ ] Run the focused test until green.

### Task 2: Prisma source/index adapter and schema

**Files:**
- Modify: `prisma/schema.prisma`
- Create: `prisma/migrations/20261004000000_add_search_documents/migration.sql`
- Create: `src/modules/search/prisma-search-adapter.ts`
- Create: `src/modules/search/__tests__/prisma-search-adapter.test.ts`
- Modify: `src/modules/search/index.ts`

**Interfaces:**
- Consumes the domain contract from Task 1.
- Produces `PrismaSearchAdapter` with `search`, `health`, and `reindex`, plus injectable source/store seams used by unit tests.

- [ ] Write failing adapter tests with in-memory source/store fakes for published filtering, post/content/taxonomy/type filters, author/category/tag filters, tenant isolation, sort/pagination, and repeated reindex with no duplicate source keys.
- [ ] Run the focused adapter test and verify it fails because the adapter is absent.
- [ ] Add `SearchDocument` with unique `sourceKey` and indexes for tenant/type/status/source.
- [ ] Implement the minimal adapter: collect published sources, write the scoped projection transactionally by unique key, read documents, score/sort/filter, and return health/reindex counts without leaking raw source payloads.
- [ ] Run focused adapter tests and `npx prisma validate`.

### Task 3: Configuration/service and admin/public route handlers

**Files:**
- Modify: `src/services/option.service.ts`
- Create: `src/modules/search/search.service.ts`
- Create: `src/app/api/search/route.ts`
- Create: `src/app/api/admin/search/route.ts`
- Create: `src/app/api/admin/search/reindex/route.ts`
- Create: `src/app/api/search/__tests__/route.test.ts`
- Create: `src/app/api/admin/search/__tests__/route.test.ts`
- Modify: `src/modules/search/index.ts`

**Interfaces:**
- Consumes `PrismaSearchAdapter` and the existing `auth`, `requireAdmin`, and `OptionService` patterns.
- Produces public query JSON, admin configuration/health JSON, and admin reindex JSON with stable error codes.

- [ ] Write failing route/service tests for public publication safety, invalid query/page, admin 401/403, config validation, health, and reindex delegation.
- [ ] Run focused route tests and observe expected failures.
- [ ] Add the search option allowlist and implement cached config parsing with safe local defaults.
- [ ] Implement `SearchService` adapter resolution, trusted tenant resolution from environment/context, public query normalization, and reindex orchestration.
- [ ] Implement route handlers with stable 400/401/403/503/500 responses and no internal error details.
- [ ] Run focused route tests until green.

### Task 4: Integration verification and documentation

**Files:**
- Modify: `README.md` or `API.md` only if the existing API documentation location has a suitable search section.
- Modify: any search files only for fixes found by verification.

- [ ] Run `npm test` and confirm the full existing/new suite is green.
- [ ] Run `npx tsc --noEmit`, `npx prisma validate`, `npm run lint`, and `npm run build`.
- [ ] Run `git diff --check` and inspect `git status`/diff for scope and accidental files.
- [ ] Record any unavailable database/integration verification as a limitation rather than claiming it passed.

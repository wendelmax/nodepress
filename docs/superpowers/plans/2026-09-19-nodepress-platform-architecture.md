# NodePress Platform Architecture Implementation Plan

> Execution: native implementation in isolated Git worktrees, with one pull request per independently reviewable increment.

## Goal

Evolve NodePress into a platform-agnostic modular monolith with a versioned plugin SDK, generic content types, infrastructure ports, a safe Payload import adapter, and production hardening. Preserve existing posts, themes, menus, legacy plugins, and routes throughout the migration.

## Constraints and assumptions

- The current public `main` at `bb42a92` is the base for all branches.
- The current plugin lifecycle and menu aggregator remain the compatibility layer while the new contracts are introduced.
- Single-tenant persistence remains the default; request/job/plugin context carries an optional site/tenant identifier for future isolation.
- Payload import accepts a versioned JSON export first. A REST source with an API token uses the same source adapter contract and can follow without changing the import pipeline.
- Arbitrary runtime ZIP/JavaScript installation is explicitly excluded. Plugins are trusted, reviewed TypeScript shipped with the application.
- Every behavior change follows TDD: failing test, minimal implementation, full suite, commit.

## Branch and worktree sequence

All branches are created from the latest `main` and stored below the ignored parent `.worktrees` directory:

1. `architecture/core-platform` — this plan plus kernel contracts and context.
2. `feature/content-type-system` — generic content types and fields.
3. `feature/plugin-sdk-v2` — dependency-aware manifest and extension registrars.
4. `feature/plugin-admin-management` — lifecycle-driven admin UI and generic Animals reference plugin.
5. `feature/payload-import-adapter` — dry-run, resumable, idempotent import pipeline.
6. `chore/security-observability` — safe errors, lint, audit, logs, health checks, and CI.
7. `feature/infra-adapters` — queue/cache/storage/search ports and default adapters where justified by tests.

Each PR must merge in this order. Dependent branches are rebased onto the merged predecessor before their PR is opened. No branch force-push is used after review unless explicitly requested.

## Task 1 — Kernel context and module contracts

**Branch:** `architecture/core-platform`

**Files:**

- Create `src/core/context.ts` with request/job context (`requestId`, optional `tenantId`, actor, locale, correlation metadata).
- Create `src/core/contracts/module.ts` with module metadata, startup/shutdown hooks, health checks, and dependency declarations.
- Create `src/core/events/types.ts` with typed domain event envelope and event handler contracts.
- Create `src/core/ports/index.ts` with ports for cache, object storage, queue, search, mail, and webhook delivery.
- Add contract tests under `src/core/**/__tests__`.

**Implementation:**

1. Write tests for context propagation, deterministic event metadata, module dependency validation, and adapter capability reporting.
2. Implement pure contracts and in-memory test adapters only; do not change Prisma or route behavior yet.
3. Export the contracts through a stable `src/core/index.ts` boundary.
4. Run `npm test`, `npx tsc --noEmit`, and `npm run lint`.
5. Commit and push the branch; open PR 1.

## Task 2 — Generic content type and field system

**Branch:** `feature/content-type-system`

**Files:**

- Create `src/modules/content/contracts.ts`, `content-type-registry.ts`, `content.service.ts`, and repository ports.
- Create field definition validation for text, number, boolean, date, select, relation, media, and JSON fields.
- Create Prisma persistence for generic content metadata/field values only where it does not break existing `Post` records.
- Add `src/plugins/animals` as a reference registration through the generic content API; preserve its specialized migration as an explicit escape hatch if needed.
- Add unit and integration tests with an in-memory repository and Prisma contract fixture.

**Implementation:**

1. Write failing tests for registering a content type, duplicate IDs, field validation, required fields, capability-protected operations, publish status, and stable slugs.
2. Implement a registry that validates IDs and versions and returns immutable definitions.
3. Implement an application service with repository injection and tenant-aware context.
4. Add compatibility mapping so existing posts/pages remain served by current services.
5. Add migration and rollback documentation; never rewrite existing production post rows automatically.
6. Run focused tests, full tests, `npx prisma validate`, `npx prisma generate`, typecheck, lint, and build.
7. Push and open PR 2.

## Task 3 — Plugin SDK v2 and dependency-aware lifecycle

**Branch:** `feature/plugin-sdk-v2`

**Files:**

- Extend `src/plugins/types.ts` with engine compatibility, dependencies, settings, content types, routes, jobs, commands, and typed events.
- Add `src/plugins/dependencies.ts` for semver-compatible dependency resolution and cycle detection.
- Extend `PluginService` to validate the dependency graph before activation and to expose health/migration status.
- Add versioned SDK exports under `src/plugins/sdk.ts`.
- Extend API tests and lifecycle tests for missing dependencies, cycles, incompatible engine versions, and cleanup.

**Implementation:**

1. Write failing tests for dependency ordering, duplicate registrations, cycles, incompatible versions, and activation rollback.
2. Implement graph validation and deterministic activation order.
3. Keep old manifests valid through a compatibility default.
4. Add typed registrars without letting plugins import Prisma or internal route code directly.
5. Return stable public error codes from lifecycle APIs.
6. Run all verification commands and open PR 3.

## Task 4 — Plugin management UI and generic reference plugin

**Branch:** `feature/plugin-admin-management`

**Files:**

- Replace the hard-coded list and direct `/api/options` writes in `src/app/(web)/admin/(dashboard)/plugins/page.tsx` with `/api/admin/plugins` and activation/deactivation endpoints.
- Add migration status, dependency errors, and safe failure messages to the UI.
- Add `/admin/animals` and `/animais` routes backed by the generic content service.
- Add CRUD/API tests for the reference plugin without coupling core modules to `animals`.
- Keep Hello Dolly and SEO Optimizer in the legacy compatibility path.

**Implementation:**

1. Write failing component/API tests for listing, activation, migration failure, deactivation, and unknown plugin states.
2. Implement the UI against the lifecycle API, including optimistic-safe loading and server-confirmed state.
3. Create the reference plugin page and public listing; do not add animal-specific logic to the kernel.
4. Verify public/admin menu capabilities and 404-free links.
5. Run full tests, typecheck, lint, Prisma validation, and build; open PR 4.

## Task 5 — Payload import adapter

**Branch:** `feature/payload-import-adapter`

**Files:**

- Create `src/integrations/payload/contracts.ts` for source collections, records, relations, assets, and import reports.
- Create JSON source reader and optional REST source reader with token configuration.
- Create mapping pipeline to Content, Identity, Taxonomy, and Media ports.
- Create `src/cli/payload-import.ts` with `--file`, `--dry-run`, `--batch-size`, `--resume`, `--report`, and mapping options.
- Create `np_import_records` migration/model for `(source, collection, sourceId)` idempotency and target references.
- Add fixture exports and tests for duplicate runs, partial failure/resume, missing relations, invalid fields, media failure, and slug redirects.

**Implementation:**

1. Write failing tests against a fixture JSON export before implementing the reader.
2. Validate and normalize source records without writing when `dry-run` is enabled.
3. Import primary records in batches, record source IDs transactionally, then resolve relationships in a second pass.
4. Route media through the storage port and retain original URLs when download fails.
5. Produce machine-readable and human-readable reports; unknown collections must be warnings, not silent drops.
6. Add a documented Payload field mapping example and run the complete verification suite.
7. Open PR 5.

## Task 6 — Security, observability, and CI hardening

**Branch:** `chore/security-observability`

**Files:**

- Add public error-code mapping for plugin/admin/import APIs and server-only detailed logs.
- Add structured logger with request/plugin/job/tenant fields.
- Add health checks for database, migrations, storage, queue, and plugin registry.
- Fix the existing `FormEditor.tsx` lint violation without changing behavior.
- Add CI workflow for tests, typecheck, lint, Prisma validation, build, audit, and migration checks.
- Document production deployment, backup, migration order, secrets, and rollback boundaries.

**Implementation:**

1. Write failing tests asserting no SQL/stack trace leaks from API responses.
2. Implement safe error serialization and structured logging.
3. Add health endpoint tests and CI configuration validation.
4. Run `npm audit` and update only compatible dependencies; document unresolved vulnerabilities rather than using unsafe bulk fixes.
5. Run the complete suite and open PR 6.

## Task 7 — Infrastructure adapters

**Branch:** `feature/infra-adapters`

**Files:**

- Implement default no-op/in-process adapters where current deployment needs no external service.
- Add Redis cache and queue adapter behind configuration when dependencies are approved.
- Add S3-compatible media storage adapter and search adapter contracts.
- Add contract tests shared by every adapter.
- Document environment variables and local Docker services.

**Implementation:**

1. Write adapter contract tests first.
2. Implement adapters with timeouts, retries, idempotency, and graceful fallback only where safe.
3. Keep PostgreSQL/local storage as the default path.
4. Run integration tests using disposable services when available and open PR 7.

## Verification gate for every PR

```text
npm test
npm run lint
npx tsc --noEmit
npx prisma validate
npm run build
```

The pre-existing GitHub dependency alert and any non-zero audit findings must be recorded in the PR. A PR is not marked ready while its own tests, typecheck, or build fail.

## Review focus

- No core contract imports ONG, Animals, Payload, or theme-specific code.
- Plugin activation cannot bypass dependency, capability, migration, or engine validation.
- Import retries cannot duplicate content or media.
- Tenant context cannot be silently dropped at module boundaries.
- Admin errors do not expose SQL, stack traces, secrets, or source records.
- Existing legacy plugins and routes remain functional during every merge step.

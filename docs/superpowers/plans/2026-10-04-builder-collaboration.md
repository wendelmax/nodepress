# Builder Collaboration, Revisions, and Client Mode Implementation Plan

> **For agentic workers:** REQUIRED SUB-SKILL: Use superpowers:executing-plans to implement this plan task-by-task. Steps use checkbox (`- [ ]`) syntax for tracking.

**Goal:** Add an append-only Builder collaboration aggregate with optimistic concurrency, private comments, auditable reversible restores, separated RBAC, and server-enforced client mode while preserving the public rendering/sanitization pipeline.

**Architecture:** A generic Prisma-backed `BuilderTarget` owns the latest canonical document and version; append-only revisions, comments, and audit events hang off the target. A pure policy module decides capability and structural changes before a transaction synchronizes the target's legacy post/option source. The existing Puck editor receives an optional target and uses Builder APIs only for opted-in collaboration callers.

**Tech Stack:** Next.js App Router, React 19, TypeScript, Prisma/PostgreSQL, Vitest, `@measured/puck`, existing `auth`, logger, plugin hooks, and Puck document contract.

**Spec:** `docs/superpowers/specs/2026-10-04-builder-collaboration-design.md`

## Global Constraints

- Work only in `C:\Users\wende\Projects\ong-animal-app\.nodepress-eval-wendelmax\.worktrees\issue-82-collaboration` on branch `codex/issue-82-collaboration`.
- Do not open or attach a pull request.
- Do not modify `BlockRenderer`, `parseBuilderDocument`, public route selection, or sanitization/rendering behavior owned by issue #83.
- Existing untracked paths outside this worktree are out of scope.
- Builder mutations accept canonical/normalized Puck documents only and synchronize legacy source fields transactionally.
- Revisions and audit events are append-only; restore always creates a new revision.
- `expectedVersion` is mandatory for mutation APIs and stale writes return `409` without state changes.
- Private comments and audit data never appear in public post/option responses.

## Review Focus

- Two concurrent saves against one version: exactly one succeeds and the stale request has no revision/source side effect — Task 3.
- A restore followed by a restore of the prior version leaves every revision immutable and returns the document to the prior state — Task 3.
- Client mode cannot change component structure, root data, links, media URLs, or disallowed fields through a crafted payload — Task 1 and Task 4.
- Author/contributor/client/editor permissions differ by content, layout, tokens, history, and comments — Task 1 and Task 4.
- Public post data and Puck public rendering do not expose comments, audit events, or revision bodies — Task 4 and Task 5.

---

### Task 1: Define collaboration domain types, RBAC, and structural policy

**Files:**
- Create: `src/modules/builder-collaboration/domain.ts`
- Create: `src/modules/builder-collaboration/policy.ts`
- Test: `src/modules/builder-collaboration/__tests__/policy.test.ts`
- Modify: `src/lib/role-normalization.mjs`
- Test: `tests/role-normalization.test.mjs`

**Interfaces:**
- `BuilderTargetType = 'post' | 'option' | 'tokens'`.
- `BuilderTargetRef = { type: BuilderTargetType; key: string }`.
- `BuilderPermission` is the exact capability union from the specification.
- `BuilderActor = { id: string; role?: string }`.
- `getBuilderPermissions(actor): ReadonlySet<BuilderPermission>`.
- `canBuilder(actor, permission, target): boolean`.
- `assertBuilderChange(previous, next, actor, mode): { ok: true } | { ok: false; code: string; reason: string }`.
- `getClientEditableFields(componentType): readonly string[]` and `filterClientPuckConfig(config)` for the UI allowlist.
- `normalizeRole` recognizes `client` while preserving all existing mappings.

- [ ] **Step 1: Write failing policy tests**

Add one-behavior tests proving admin/editor/author/contributor/client capability differences, target ownership/draft restrictions, content-only structural rejection, layout permission acceptance, token-target isolation, and client field/structure rejection.

- [ ] **Step 2: Run the focused policy tests and verify the expected missing-module failures**

Run: `npx vitest run src/modules/builder-collaboration/__tests__/policy.test.ts` and `node tests/role-normalization.test.mjs`.

- [ ] **Step 3: Implement the pure types and policy**

Keep policy independent of Prisma, React, and HTTP. Compare stable component identity/type/order and root data separately from editable props. Use a fixed client allowlist for current Puck components; unknown components are never client-editable.

- [ ] **Step 4: Run the focused tests and refactor only while green**

Run both commands from Step 2; expected result is all new policy and role tests passing.

- [ ] **Step 5: Commit the domain policy**

```text
git add src/modules/builder-collaboration src/lib/role-normalization.mjs tests/role-normalization.test.mjs
git commit -m "feat: add builder collaboration policy"
```

### Task 2: Add immutable persistence models and target adapters

**Files:**
- Modify: `prisma/schema.prisma`
- Create: `prisma/migrations/20261004000000_add_builder_collaboration/migration.sql`
- Create: `src/modules/builder-collaboration/repository.ts`
- Create: `src/modules/builder-collaboration/__tests__/repository.test.ts`
- Modify: `src/lib/prisma.ts` only if the repository needs a typed transaction helper

**Interfaces:**
- Prisma models: `BuilderTarget`, `BuilderRevision`, `BuilderComment`, `BuilderAuditEvent` with the fields and unique/index constraints in the spec.
- `BuilderRepository` methods: `getTarget(ref)`, `createTarget(input)`, `createRevision(input)`, `updateTargetVersion(id, expectedVersion, input)`, `listRevisions(targetId)`, `getRevision(targetId, revisionId)`, `createComment(input)`, `listComments(targetId)`, `updateComment(id, input)`, and `createAuditEvent(input)`.
- `BuilderSourceAdapter` methods: `read(ref, tx?)` and `write(ref, document, tx?)` for post content and `site_footer_content`.

- [ ] **Step 1: Write failing repository contract tests**

Use a small fake adapter to prove target initialization reads existing Puck content without rewriting it, revisions are insert-only, comments are returned only by the private repository, and version update rejects a mismatched expected version.

- [ ] **Step 2: Run repository tests to verify RED**

Run: `npx vitest run src/modules/builder-collaboration/__tests__/repository.test.ts`.

- [ ] **Step 3: Add Prisma schema and migration**

Use string target types/keys for adapter extensibility, JSON for canonical documents and audit metadata, explicit user relations, append-only timestamps, unique `(targetType,targetKey)` and `(targetId,version)` constraints, and indexes for target/revision/comment queries. The SQL migration must not alter the existing post content or public comment tables.

- [ ] **Step 4: Implement repository and source adapters**

Keep the adapter boundary narrow so service tests can run without a live database. Use conditional `updateMany`/row-count checks or equivalent transaction-safe optimistic locking for target version updates; never expose audit or comment joins from source reads.

- [ ] **Step 5: Run focused tests and Prisma validation**

Run: `npx vitest run src/modules/builder-collaboration/__tests__/repository.test.ts` and `npx prisma validate`.

- [ ] **Step 6: Commit persistence**

```text
git add prisma src/modules/builder-collaboration/repository.ts src/modules/builder-collaboration/__tests__/repository.test.ts
git commit -m "feat: persist builder collaboration state"
```

### Task 3: Implement the collaboration service with concurrency, restore, comments, and audit

**Files:**
- Create: `src/modules/builder-collaboration/service.ts`
- Create: `src/modules/builder-collaboration/errors.ts`
- Test: `src/modules/builder-collaboration/__tests__/service.test.ts`
- Modify: `src/core/logger.ts` only for a narrowly typed audit helper if needed

**Interfaces:**
- `BuilderService.getTarget(actor, ref): Promise<BuilderTargetView>`.
- `BuilderService.save(actor, ref, input): Promise<BuilderMutationResult>` where input includes `document`, `expectedVersion`, optional `note`, and `mode`.
- `BuilderService.listRevisions(actor, ref): Promise<BuilderRevisionSummary[]>`.
- `BuilderService.getRevision(actor, ref, revisionId): Promise<BuilderRevisionView>`.
- `BuilderService.restore(actor, ref, revisionId, expectedVersion): Promise<BuilderMutationResult>`.
- `BuilderService.listComments/createComment/updateComment` with authorization and private response shapes.
- Stable service errors: `BuilderUnauthorizedError`, `BuilderForbiddenError`, `BuilderConflictError`, `BuilderNotFoundError`, `BuilderInvalidDocumentError`.

- [ ] **Step 1: Write failing service tests**

Cover lazy initialization, successful versioned save, stale concurrent save with no side effects, immutable revisions, audited restore, reversible restore, comment creation/resolution, and refusal to return private comments to an actor without comment read permission.

- [ ] **Step 2: Run service tests and verify RED**

Run: `npx vitest run src/modules/builder-collaboration/__tests__/service.test.ts`.

- [ ] **Step 3: Implement minimum service behavior**

Normalize through `parseBuilderDocument`, enforce target/role/mode policy before opening the transaction, perform revision/target/source/audit writes in one transaction, and return only stable DTOs. Audit conflicts and authorization failures without persisting request bodies or document contents.

- [ ] **Step 4: Run service tests and refactor while green**

Run the focused service test command; expected result is all concurrency, restore, audit, and comment behaviors passing.

- [ ] **Step 5: Commit service behavior**

```text
git add src/modules/builder-collaboration/service.ts src/modules/builder-collaboration/errors.ts src/modules/builder-collaboration/__tests__/service.test.ts
git commit -m "feat: add builder collaboration service"
```

### Task 4: Add authenticated Builder APIs and non-public boundaries

**Files:**
- Create: `src/app/api/admin/builder/_shared.ts`
- Create: `src/app/api/admin/builder/targets/[targetType]/[targetKey]/route.ts`
- Create: `src/app/api/admin/builder/targets/[targetType]/[targetKey]/revisions/route.ts`
- Create: `src/app/api/admin/builder/targets/[targetType]/[targetKey]/revisions/[revisionId]/route.ts`
- Create: `src/app/api/admin/builder/targets/[targetType]/[targetKey]/restore/route.ts`
- Create: `src/app/api/admin/builder/targets/[targetType]/[targetKey]/comments/route.ts`
- Create: `src/app/api/admin/builder/targets/[targetType]/[targetKey]/comments/[commentId]/route.ts`
- Test: route tests alongside each route or in `src/app/api/admin/builder/__tests__/routes.test.ts`
- Test: `src/themes/default/components/__tests__/BlockRenderer.test.ts` only if a non-exposure regression belongs there; do not alter renderer code

**Interfaces:**
- Routes call only `BuilderService` and `auth`; they do not query Prisma directly.
- `requireBuilderActor(request)` returns actor plus request ID or a stable `401` response.
- Invalid target type/key/body returns `400`; service errors map to `401/403/404/409` without leaking database details.
- Public post/option routes remain unchanged and cannot serialize collaboration relations.

- [ ] **Step 1: Write failing route tests**

Test authenticated GET/PUT, stale PUT `409`, restore `409`/success, comment create/list/resolve authorization, absence of comments/audit/revision bodies from public post responses, and absence of a public frontend import/query for the collaboration endpoints.

- [ ] **Step 2: Run route tests to verify RED**

Run: `npx vitest run src/app/api/admin/builder/__tests__/routes.test.ts`.

- [ ] **Step 3: Implement route handlers and shared error mapping**

Validate target parameters and JSON body shapes before delegating. Use `createNodePressContext`/request IDs and `logger` for operational context, while durable audit remains service-owned. Keep comment and revision responses private and capability-filtered.

- [ ] **Step 4: Run route and full existing tests**

Run: `npx vitest run src/app/api/admin/builder/__tests__/routes.test.ts` then `npm test`; expected result is the new route tests and the existing baseline suite pass.

- [ ] **Step 5: Commit the APIs**

```text
git add src/app/api/admin/builder
git commit -m "feat: expose builder collaboration APIs"
```

### Task 5: Integrate PuckBuilder, post/page editor, footer, and client mode UI

**Files:**
- Modify: `src/components/admin/PuckBuilder.tsx`
- Create: `src/components/admin/BuilderCollaborationPanel.tsx`
- Modify: `src/components/admin/PostEditor.tsx`
- Modify: `src/app/(web)/admin/(dashboard)/posts/page.tsx` or the existing edit page only where target/version data is needed
- Modify: `src/app/(web)/admin/(dashboard)/appearance/footer/page.tsx`
- Create: `src/lib/puck/client-mode.ts`
- Test: `src/components/admin/__tests__/BuilderCollaborationPanel.test.tsx`
- Test: `src/lib/puck/__tests__/client-mode.test.ts`

**Interfaces:**
- `PuckBuilderProps` gains optional `collaborationTarget`, `mode`, and `onVersionChange`; existing untargeted usage remains behavior-compatible.
- `BuilderCollaborationPanel` receives target ref, current version, and callbacks for reload/restore/save conflict.
- `createClientPuckConfig(config)` returns a config with only allowlisted fields; it is presentation-only and never replaces server policy.

- [ ] **Step 1: Write failing UI/client-mode tests**

Test that client config hides disallowed fields, the panel renders revision/comment controls only when capabilities allow them, a save conflict is visible without replacing local Puck data, and the public renderer/page tree contains no collaboration panel or private comment fetch.

- [ ] **Step 2: Run focused UI tests to verify RED**

Run: `npx vitest run src/lib/puck/__tests__/client-mode.test.ts src/components/admin/__tests__/BuilderCollaborationPanel.test.tsx`.

- [ ] **Step 3: Implement the UI integration**

Targeted Puck publish calls the Builder PUT endpoint with the current version and updates the parent only after success. The post/page editor supplies `post:<id>` and footer supplies `option:site_footer_content`; untargeted callers continue using the current callback. The panel uses revision JSON/tree summaries, restore expected version, and private comments. Client mode exposes the allowlist and a conflict/error state but cannot bypass API authorization.

- [ ] **Step 4: Run focused UI tests and existing Puck tests**

Run: `npx vitest run src/lib/puck/__tests__/client-mode.test.ts src/components/admin/__tests__/BuilderCollaborationPanel.test.tsx src/lib/puck/__tests__`.

- [ ] **Step 5: Commit the UI integration**

```text
git add src/components/admin 'src/app/(web)/admin' src/lib/puck
git commit -m "feat: add builder collaboration UI"
```

### Task 6: Final verification and scope audit

**Files:**
- Modify only files required by failing verification; no planned product scope expansion.

- [ ] **Step 1: Review changed files and protected boundaries**

Run: `git status --short`, `git diff --stat`, and `git diff --name-only`. Confirm no public renderer/sanitizer file changed and no unrelated worktree path is included.

- [ ] **Step 2: Run the requested verification commands**

Run each command freshly and record exit code/output:

```text
npm test
npx tsc --noEmit
npm run lint
npx prisma validate
npm run build
```

- [ ] **Step 3: Fix only in-scope failures with a failing regression test first**

For any issue introduced by this branch, add/run a focused failing test, apply the minimal fix, then rerun the affected command. Do not change #83 rendering/sanitization to make this branch green.

- [ ] **Step 4: Review final diff and report limitations**

Report worktree path, commits, files changed, test/validation results, install warnings, and any environment/database limitations. Do not open a PR.

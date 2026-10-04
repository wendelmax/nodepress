# Form Submission Legacy Migration Implementation Plan

> **For agentic workers:** REQUIRED SUB-SKILL: Use superpowers:executing-plans to implement this plan task-by-task. Steps use checkbox (`- [ ]`) syntax for tracking.

**Goal:** Make the Form Engine the canonical submission path, deprecate the legacy form endpoint/model through a measurable compatibility shim, and integrate secure persistence, leads, delivery, admin, and retention so issue #76 can be closed without deleting data prematurely.

**Architecture:** A `FormSubmissionOrchestrator` composes the existing Form Engine, submission security, lead pipeline, and delivery ports. Both the new route and the legacy route call it; only the legacy route adds compatibility mapping and deprecation headers. Prisma-backed repositories persist canonical submissions, leads, and delivery records, while the existing cron processes retryable deliveries.

**Tech Stack:** Next.js App Router, TypeScript, Prisma/PostgreSQL, Vitest, Playwright.

**Spec:** `docs/superpowers/specs/2026-10-04-form-submission-legacy-migration-design.md`

## Global Constraints

- The Form Engine is the only canonical implementation of validation, security, persistence, and forwarding.
- The legacy `POST /api/forms/submit` remains a compatibility shim during deprecation and must not duplicate business rules.
- Tokens, secrets, rate-limit keys, and complete personal payloads must never be written to logs.
- Provider adapters remain credential-free ports in tests and must not make real external calls.
- Physical deletion of the legacy route/model is a separate follow-up after the deprecation window.
- Every production behavior change is preceded by a failing test.

## Review Focus

- Repeated requests with the same idempotency key must not create duplicate submissions, leads, or deliveries.
- Security failures must happen before persistence and must not disclose CAPTCHA tokens or origin keys.
- A provider outage must leave a retryable outbox record and never turn a stored submission into data loss.
- Legacy payloads with malformed or missing form mappings must preserve stable errors while emitting deprecation metadata.
- Retention and export must exclude secrets and remove only records past the configured cutoff.

---

### Task 1: Canonical submission orchestration contract

**Files:**
- Create: `src/modules/forms/submission-orchestrator.ts`
- Create: `src/modules/forms/__tests__/submission-orchestrator.test.ts`
- Modify: `src/modules/forms/types.ts`
- Modify: `src/modules/forms/service.ts`

**Interfaces:**
- Consumes: `FormService`, `SubmissionSecurityService`, `LeadPipelineService`, delivery publisher ports.
- Produces: `FormSubmissionOrchestrator.submit(input): Promise<OrchestratedSubmissionResult>` with stable `accepted`, `securityFailure`, `duplicate`, and `deliveryPending` outcomes.

- [ ] **Step 1: Write the failing tests** for a valid submission, security rejection before repository writes, idempotent duplicate, and provider failure that leaves delivery pending.
- [ ] **Step 2: Run the focused test** with `npm test -- --run src/modules/forms/__tests__/submission-orchestrator.test.ts`; confirm the missing orchestrator/contract failure.
- [ ] **Step 3: Implement the orchestrator** with dependency injection and a normalized input containing `formId`, `values`, uploads, consent, honeypot, origin/identity keys, and optional idempotency key.
- [ ] **Step 4: Run the focused tests** and then the existing `src/modules/forms` tests.
- [ ] **Step 5: Commit** with `feat: add canonical form submission orchestrator`.

### Task 2: Prisma persistence for idempotency, leads, and delivery

**Files:**
- Modify: `prisma/schema.prisma`
- Create: `prisma/migrations/20261004120000_add_form_submission_delivery/migration.sql`
- Create: `src/modules/forms/prisma-submission-repository.ts`
- Create: `src/modules/leads/prisma-lead-repository.ts`
- Create: `src/modules/delivery/prisma-delivery-repository.ts`
- Test: `src/modules/forms/__tests__/prisma-submission-repository.test.ts`
- Test: `src/modules/leads/__tests__/prisma-lead-repository.test.ts`

**Interfaces:**
- Consumes: `FormRepository`, `LeadRepositoryPort`, delivery store ports.
- Produces: unique `(formId, idempotencyKey)`, unique `sourceSubmissionId`, unique `(eventId, targetId)`, persisted attempts/status/next-attempt metadata.

- [ ] **Step 1: Write failing repository contract tests** for duplicate idempotency, lead upsert, delivery state update, and retry scheduling.
- [ ] **Step 2: Run the focused tests** and confirm the Prisma adapters/models are missing.
- [ ] **Step 3: Add the schema/migration** without removing `np_form_submissions`; add canonical submission metadata, `np_leads`, and `np_lead_deliveries` with indexes and unique constraints.
- [ ] **Step 4: Implement adapters** using Prisma transactions where submission and initial lead creation must be atomic.
- [ ] **Step 5: Run `npx prisma generate`, focused tests, `npx prisma validate`, and typecheck.**
- [ ] **Step 6: Commit** with `feat: persist canonical submissions and lead deliveries`.

### Task 3: Integrate submission security and the canonical route

**Files:**
- Create: `src/security/submissions/factory.ts`
- Create: `src/app/api/forms/[id]/submissions/__tests__/integration.test.ts`
- Modify: `src/app/api/forms/[id]/submissions/route.ts`
- Modify: `src/modules/forms/index.ts`
- Test: `src/security/submissions/factory.test.ts`

**Interfaces:**
- Consumes: request headers, `OptionService`, `SubmissionSecurityService`, `FormSubmissionOrchestrator`.
- Produces: canonical HTTP responses with safe error codes, `Retry-After` for rate limiting, and no persistence on rejected submissions.

- [ ] **Step 1: Write failing route tests** for honeypot, missing consent, invalid CAPTCHA, valid submission, and repeated idempotency key.
- [ ] **Step 2: Run the tests** and verify the route currently bypasses security/orchestration.
- [ ] **Step 3: Implement the configured security factory** with safe defaults and option/env-backed policy; wire the route to the orchestrator.
- [ ] **Step 4: Run route, security, and forms tests;** assert persisted call counts and response headers.
- [ ] **Step 5: Commit** with `feat: secure canonical form submissions`.

### Task 4: Convert the legacy endpoint into a deprecation shim

**Files:**
- Modify: `src/app/api/forms/submit/route.ts`
- Create: `src/app/api/forms/submit/__tests__/route.test.ts`
- Create: `src/modules/forms/legacy-form-adapter.ts`
- Create: `src/modules/forms/legacy-form-adapter.test.ts`
- Modify: `src/components/FormEmbed.tsx`

**Interfaces:**
- Consumes: legacy numeric post ID and payload, `PostService`/Prisma form metadata, canonical orchestrator.
- Produces: compatibility response shape, `Deprecation: true`, configurable `Sunset`, and successor `Link` header.

- [ ] **Step 1: Write failing tests** proving the old payload maps to a canonical form, malformed mappings return stable errors, and headers are present.
- [ ] **Step 2: Run the tests** to capture the current direct-Prisma behavior.
- [ ] **Step 3: Implement the adapter/shim** with no direct lead or connector calls; migrate `FormEmbed` to the canonical form ID/fields contract.
- [ ] **Step 4: Run old/new route tests and a component test** covering successful submission and safe error feedback.
- [ ] **Step 5: Commit** with `feat: deprecate legacy form submission endpoint`.

### Task 5: Outbox worker, cron processing, and provider composition

**Files:**
- Create: `src/modules/delivery/delivery-worker.ts`
- Create: `src/modules/delivery/__tests__/delivery-worker.test.ts`
- Modify: `src/app/api/cron/route.ts`
- Modify: `src/modules/leads/index.ts`
- Modify: `src/modules/delivery/index.ts`
- Modify: `src/modules/connectors/index.ts`

**Interfaces:**
- Consumes: persisted pending delivery repository, `WebhookDeliveryService`, connector ports, cron authentication.
- Produces: bounded batch processing, retryable/failed state transitions, explicit reprocessing, and a cron response summary.

- [ ] **Step 1: Write failing worker tests** for pending delivery, backoff, permanent failure, batch limit, and idempotent rerun.
- [ ] **Step 2: Run the focused tests** and verify the worker is absent.
- [ ] **Step 3: Implement the worker** with a bounded batch and no request-blocking provider calls in the submission route.
- [ ] **Step 4: Wire the worker into the authenticated cron route** and test the summary without changing backup behavior.
- [ ] **Step 5: Commit** with `feat: process lead delivery outbox from cron`.

### Task 6: Canonical admin leads, export, retention, and migration

**Files:**
- Modify: `src/app/(web)/admin/(dashboard)/leads/page.tsx`
- Modify: `src/app/api/export/leads/route.ts`
- Create: `src/modules/leads/retention.ts`
- Create: `src/modules/leads/__tests__/retention.test.ts`
- Create: `src/scripts/migrate-legacy-form-submissions.ts`
- Create: `src/scripts/__tests__/migrate-legacy-form-submissions.test.ts`
- Modify: `package.json`

**Interfaces:**
- Consumes: canonical lead repository, `lgpd_retention_days`, legacy `FormSubmission` rows.
- Produces: filtered admin list/export from canonical leads, bounded retention pruning, idempotent migration command.

- [ ] **Step 1: Write failing tests** for canonical filters, secret redaction, retention cutoff, and rerunning the legacy migration.
- [ ] **Step 2: Run the focused tests** and confirm current admin/export paths read only the legacy table.
- [ ] **Step 3: Implement migration, retention, admin, and export changes** while preserving the legacy table for rollback during deprecation.
- [ ] **Step 4: Run unit tests and a dry-run migration against fixtures.**
- [ ] **Step 5: Commit** with `feat: migrate admin leads to canonical storage`.

### Task 7: End-to-end deprecation verification and release gate

**Files:**
- Create: `tests/e2e/forms-legacy-migration.spec.ts`
- Create: `scripts/check-legacy-form-consumers.mjs`
- Modify: `README.md`
- Modify: `.github/workflows/ci.yml` only if the existing workflow lacks the required Playwright/migration checks.

- [ ] **Step 1: Write the Playwright scenarios** for canonical submit, security rejection, legacy shim headers, admin lead visibility, export, and cron retry.
- [ ] **Step 2: Run the new scenarios locally** against the project’s Docker setup and fix failures before changing assertions.
- [ ] **Step 3: Add the consumer-audit script** and document the deprecation date/configuration and follow-up removal issue.
- [ ] **Step 4: Run the complete suite:** `npm test`, `npx tsc --noEmit`, `npm run lint`, `npm run build`, and the Playwright suite.
- [ ] **Step 5: Commit** with `test: verify legacy form deprecation flow`.

### Task 8: Integration review and PR cycle

- [ ] Rebase/merge the task commits into the isolated branch without deleting the legacy model.
- [ ] Run `git diff --check` and inspect the complete diff for secret/payload logging.
- [ ] Run the full local CI command set and Docker smoke test.
- [ ] Push one PR linked to #76, wait for GitHub CI, fix any failure/conflict, and repeat until green.
- [ ] Merge only after CI is green and confirm #76 has all acceptance criteria documented; create a follow-up issue for physical legacy deletion and leave #76 open only if a criterion remains incomplete.

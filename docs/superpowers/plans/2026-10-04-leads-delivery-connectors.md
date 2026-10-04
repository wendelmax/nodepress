# Leads, Delivery e Connectors Slice 3 Implementation Plan

> **For agentic workers:** REQUIRED SUB-SKILL: Use superpowers:subagent-driven-development (recommended) or superpowers:executing-plans to implement this plan task-by-task. Steps use checkbox (`- [ ]`) syntax for tracking.

**Goal:** Transform compatible form submissions into ordered leads and deliver signed, idempotent, retryable events through configurable HubSpot, Mailchimp and Slack adapters without changing Prisma, forms or security.

**Architecture:** Keep three self-contained module boundaries: `leads` owns normalized lead state and event publication, `delivery` owns signed webhook helpers plus delivery records/retry state, and `connectors` owns provider-neutral adapter mapping. Ports are dependency-injected; in-memory stores/transports make the slice deterministic and credential-free.

**Tech Stack:** TypeScript 5, Vitest 3, Node `crypto`, existing Next.js path aliases and strict TypeScript.

**Spec:** `docs/superpowers/specs/2026-10-04-leads-delivery-connectors-design.md`

## Global Constraints

- Base branch is `origin/main` after PR #100.
- Keep production changes inside `src/modules/leads`, `src/modules/delivery`, and `src/modules/connectors`.
- Do not modify `prisma/schema.prisma`, migrations, forms, or security modules.
- Do not use real credentials or network calls; adapters must accept injected ports/stubs.
- Every production behavior is introduced by a failing test first.

## Review Focus

- Duplicate submissions and duplicate event/target pairs must not create or deliver twice — covered in Tasks 1 and 3.
- Invalid, malformed, and tampered webhook signatures must be rejected without timing-unsafe comparison — covered in Task 2.
- Transient failures must not be treated as permanent, and permanent failures must not loop forever — covered in Task 3.
- Terminal or out-of-order lead state changes must not regress the lead — covered in Task 1.
- Unconfigured connectors must be safe no-ops while configured connectors must produce provider-specific payloads — covered in Task 4.

---

### Task 1: Lead contracts and ordered pipeline

**Files:**
- Create: `src/modules/leads/contracts.ts`
- Create: `src/modules/leads/lead-state.ts`
- Create: `src/modules/leads/lead-pipeline.service.ts`
- Create: `src/modules/leads/in-memory-lead-repository.ts`
- Create: `src/modules/leads/index.ts`
- Test: `src/modules/leads/__tests__/lead-pipeline.service.test.ts`

**Interfaces:**
- Consumes: `SubmissionInput { id: string | number; formId: string; formSlug?: string; data: Record<string, unknown>; occurredAt?: Date }`.
- Produces: `Lead`, `LeadStatus`, `LeadEvent`, `LeadRepositoryPort`, `LeadEventPublisherPort`, `LeadPipelineService.createFromSubmission(input)`, `LeadPipelineService.transition(leadId, status)`, and `LeadPipelineService.list()`.
- `Lead` includes `id`, `sourceSubmissionId`, `sourceFormId`, `formSlug?`, `data`, `status`, `version`, `createdAt`, `updatedAt`.
- `LeadEvent` includes stable `id`, `type`, `sequence`, `lead`, and `occurredAt`.

- [ ] **Step 1: Write failing tests**

  Add tests that a submission creates `new` lead and one `lead.created` event; repeated same submission returns the same lead without publishing again; leads list in creation order; valid transitions increment version and publish ordered events; invalid backward/terminal transitions throw a stable domain error.

- [ ] **Step 2: Run the focused tests and verify RED**

  Run: `npx vitest run src/modules/leads/__tests__/lead-pipeline.service.test.ts`

  Expected: FAIL because the lead contracts/service do not exist yet.

- [ ] **Step 3: Implement the minimal lead boundary**

  Use an in-memory repository keyed by `sourceSubmissionId` and lead ID. Normalize dates to injected/current `Date`, assign monotonic `version`, allow only `new → contacted → qualified → converted` or any non-terminal state → `lost`, and publish only after the repository write succeeds.

- [ ] **Step 4: Run the focused tests and verify GREEN**

  Run the same Vitest command; expected all lead tests pass.

- [ ] **Step 5: Commit**

  `git add src/modules/leads && git commit -m "feat: add ordered lead pipeline"`

### Task 2: Signed webhook contracts

**Files:**
- Create: `src/modules/delivery/webhook-signature.ts`
- Create: `src/modules/delivery/webhook-transport.ts`
- Create: `src/modules/delivery/__tests__/webhook-signature.test.ts`
- Create/update: `src/modules/delivery/index.ts`

**Interfaces:**
- Consumes: canonical JSON body string and secret string.
- Produces: `signWebhookPayload(payload: string, secret: string): string`, `verifyWebhookSignature(payload: string, signature: string, secret: string): boolean`, `WebhookRequest`, and `WebhookTransportPort.send(request)`.
- Signature format is exactly `sha256=<lowercase hex digest>` over HMAC-SHA256.

- [ ] **Step 1: Write failing tests**

  Test valid signature verification, altered body rejection, wrong secret rejection, malformed prefix/length rejection, and deterministic signed headers through the injected transport contract.

- [ ] **Step 2: Run the focused tests and verify RED**

  Run: `npx vitest run src/modules/delivery/__tests__/webhook-signature.test.ts`

  Expected: FAIL because signer/verifier do not exist yet.

- [ ] **Step 3: Implement the minimal signer/verifier**

  Use `node:crypto` HMAC and `timingSafeEqual` only after validating equal-length buffers. Keep transport as a port with no concrete network implementation.

- [ ] **Step 4: Run the focused tests and verify GREEN**

  Run the same Vitest command; expected all signature tests pass.

- [ ] **Step 5: Commit**

  `git add src/modules/delivery && git commit -m "feat: add signed webhook contracts"`

### Task 3: Idempotent delivery, retries and reprocessing

**Files:**
- Create: `src/modules/delivery/contracts.ts`
- Create: `src/modules/delivery/retry-policy.ts`
- Create: `src/modules/delivery/in-memory-delivery-store.ts`
- Create: `src/modules/delivery/delivery.service.ts`
- Modify: `src/modules/delivery/index.ts`
- Test: `src/modules/delivery/__tests__/delivery.service.test.ts`

**Interfaces:**
- Consumes: `LeadEvent` from Task 1 and a `DeliveryTarget { id: string; deliver(event: LeadEvent): Promise<void> }`.
- Produces: `DeliveryStatus`, `DeliveryRecord`, `DeliveryStorePort`, `RetryPolicy`, `DeliveryService.enqueue(event, targetId)`, `DeliveryService.process(recordId, target)`, `DeliveryService.reprocess(recordId, target)`, and `DeliveryService.get(recordId)`.
- Default policy: maximum 3 attempts; delay `baseDelayMs * 2 ** (attempt - 1)`; injected clock makes `nextAttemptAt` deterministic.

- [ ] **Step 1: Write failing tests**

  Test enqueue idempotency for `(eventId, targetId)`, successful delivery, transient failure moving to `retryable` with attempts/backoff, permanent failure moving directly to `failed`, third transient attempt becoming `failed`, due retry success, and explicit reprocessing of a failed record.

- [ ] **Step 2: Run the focused tests and verify RED**

  Run: `npx vitest run src/modules/delivery/__tests__/delivery.service.test.ts`

  Expected: FAIL because delivery contracts/service do not exist yet.

- [ ] **Step 3: Implement the minimal delivery state machine**

  Persist before/after each attempt, deduplicate by a composite event/target key, classify errors through `DeliveryError` (`transient` or `permanent`), skip retryable records before `nextAttemptAt`, and let `reprocess` reset attempts to a new pending cycle without changing event identity.

- [ ] **Step 4: Run focused and dependent tests**

  Run: `npx vitest run src/modules/leads/__tests__/lead-pipeline.service.test.ts src/modules/delivery/__tests__/webhook-signature.test.ts src/modules/delivery/__tests__/delivery.service.test.ts`

  Expected: all lead and delivery tests pass.

- [ ] **Step 5: Commit**

  `git add src/modules/delivery && git commit -m "feat: add idempotent delivery retries"`

### Task 4: Configurable HubSpot, Mailchimp and Slack adapters

**Files:**
- Create: `src/modules/connectors/contracts.ts`
- Create: `src/modules/connectors/provider-adapters.ts`
- Create: `src/modules/connectors/index.ts`
- Test: `src/modules/connectors/__tests__/provider-adapters.test.ts`

**Interfaces:**
- Consumes: `LeadEvent` and injected `ConnectorTransportPort`.
- Produces: `LeadConnector { id; deliver(event): Promise<ConnectorResult> }`, `ConnectorResult`, `ConnectorTransportRequest`, `HubSpotConnector`, `MailchimpConnector`, and `SlackConnector`.
- Each adapter accepts optional configuration; missing configuration returns `{ status: 'disabled' }` without invoking transport. Configured adapters map name/email/phone/custom fields to provider-neutral request URLs, headers and bodies.

- [ ] **Step 1: Write failing tests**

  Test each adapter's disabled behavior without configuration and configured mapping for HubSpot contact, Mailchimp member, and Slack notification. Assert transport receives no real credential and receives the expected provider request shape.

- [ ] **Step 2: Run the focused tests and verify RED**

  Run: `npx vitest run src/modules/connectors/__tests__/provider-adapters.test.ts`

  Expected: FAIL because connector contracts/adapters do not exist yet.

- [ ] **Step 3: Implement adapters with injected transport**

  Keep payload construction local and explicit; use only configured endpoint/token placeholders passed by the caller, never environment reads or hard-coded secrets. Return normalized `sent`, `disabled`, or `retryable`/`failed` results from transport errors.

- [ ] **Step 4: Run focused and full tests**

  Run: `npx vitest run src/modules/connectors/__tests__/provider-adapters.test.ts src/modules/leads/__tests__/lead-pipeline.service.test.ts src/modules/delivery/__tests__/webhook-signature.test.ts src/modules/delivery/__tests__/delivery.service.test.ts`

  Expected: all slice tests pass.

- [ ] **Step 5: Commit**

  `git add src/modules/connectors src/modules/delivery/index.ts && git commit -m "feat: add configurable lead connectors"`

### Task 5: Public exports, documentation and verification

**Files:**
- Modify: `src/modules/leads/index.ts`
- Modify: `src/modules/delivery/index.ts`
- Modify: `src/modules/connectors/index.ts`
- Create: `src/modules/leads/__tests__/pipeline-delivery.integration.test.ts`

- [ ] **Step 1: Add cross-module composition test**

  Compose `LeadPipelineService` with `DeliveryService` and a connector target, submit one input, process the emitted event, and assert one delivered record; submit the same input again and assert no duplicate lead or delivery.

- [ ] **Step 2: Run the test and verify RED**

  Run: `npx vitest run src/modules/leads/__tests__/pipeline-delivery.integration.test.ts`

  Expected: FAIL because the cross-module composition test and final public exports do not exist yet.

- [ ] **Step 3: Wire public exports only**

  Export the stable local contracts and services from each module index without importing forms, Prisma, security, or concrete credential providers.

- [ ] **Step 4: Run focused, lint and typecheck**

  Run: `npx vitest run src/modules/leads src/modules/delivery src/modules/connectors`; `npm run lint`; `npx tsc --noEmit`.

  Expected: all focused tests pass, ESLint exits 0, and TypeScript exits 0.

- [ ] **Step 5: Commit**

  `git add src/modules/leads src/modules/delivery src/modules/connectors && git commit -m "test: cover leads delivery composition"`


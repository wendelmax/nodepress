# Submission Security Slice 2 Implementation Plan

> **For agentic workers:** REQUIRED SUB-SKILL: Use superpowers:subagent-driven-development (recommended) or superpowers:executing-plans to implement this plan task-by-task. Steps use checkbox (`- [ ]`) syntax for tracking.

**Goal:** Add an isolated submission-security service and ports for honeypot, origin/identity rate limiting, consent, and CAPTCHA/Turnstile verification.

**Architecture:** Keep all product code under `src/security/submissions/`. The service owns orchestration and safe public outcomes; the in-memory limiter and Turnstile adapter implement injected ports without coupling to forms, persistence, or leads.

**Tech Stack:** TypeScript, Vitest, native `fetch`, Node `crypto` hashing, existing ESLint and TypeScript configuration.

**Spec:** `docs/superpowers/specs/2026-10-04-submission-security-design.md`

## Global Constraints

- Do not modify `prisma/schema.prisma`, migrations, the forms module, webhooks, connectors, or the leads pipeline.
- Keep integration future-facing through interfaces/ports and document the expected Form Engine adapter.
- Do not return or log secrets, CAPTCHA tokens, origin keys, identity keys, IPs, user agents, payloads, or provider errors.
- Fail closed when a required security port is unavailable or throws.
- Preserve unambiguous success and actionable safe feedback for legitimate callers.
- Production code must follow RED → GREEN → REFACTOR for each behavior.

## Review Focus

- Blank or whitespace-only origin key: should fail closed without echoing input.
- Duplicate origin and identity values: should count once per dimension, not twice within one dimension.
- Rate-limit boundary and retry calculation: should allow exactly the configured maximum and report a positive retry window after rejection.
- Turnstile network failure or malformed JSON: should become a safe verification failure with no provider details.
- Consent version mismatch: should reject even when the consent flag is true.

### Task 1: Submission contracts and orchestration

**Files:**
- Create: `src/security/submissions/contracts.ts`
- Create: `src/security/submissions/submission-security.service.ts`
- Test: `src/security/submissions/submission-security.service.test.ts`

**Interfaces:**
- Produces `SubmissionSecurityInput`, `SubmissionSecurityPolicy`, `SubmissionRateLimiter`, `CaptchaVerifier`, `SubmissionSecurityResult`, `SubmissionSecurityService`.
- `SubmissionSecurityService.protect(input: SubmissionSecurityInput, policy: SubmissionSecurityPolicy): Promise<SubmissionSecurityResult>`.

- [ ] **Step 1: Write failing tests for legitimate, honeypot, missing consent, and public-safety behavior.**
  Use a test-local rate limiter and CAPTCHA verifier. Assert a legitimate request returns `{ allowed: true, code: 'ALLOWED', message: 'Submission accepted.' }`; a filled honeypot returns `SUBMISSION_REJECTED`; missing consent returns `CONSENT_REQUIRED`; and failure results have no token, origin, identity, provider detail, or payload properties.
- [ ] **Step 2: Run the focused test and verify the expected RED failure.**
  Run `npx vitest run src/security/submissions/submission-security.service.test.ts`.
  Expected: FAIL because the new contracts/service module does not exist.
- [ ] **Step 3: Implement the contracts and minimal service.**
  Validate a non-empty origin key, check a non-empty honeypot as a generic rejection, require `accepted === true` and the configured policy version, consume rate-limit keys, then invoke CAPTCHA only when required. Use fixed public messages and catch required-port exceptions as `SECURITY_UNAVAILABLE`.
- [ ] **Step 4: Run the focused test and verify GREEN.**
  Run `npx vitest run src/security/submissions/submission-security.service.test.ts`.
  Expected: all Task 1 tests pass with no sensitive values in results.
- [ ] **Step 5: Commit the service and contract slice.**
  Run `git add src/security/submissions/contracts.ts src/security/submissions/submission-security.service.ts src/security/submissions/submission-security.service.test.ts` and `git commit -m "feat: add submission security contracts"`.

### Task 2: In-memory origin and identity rate limiter

**Files:**
- Create: `src/security/submissions/in-memory-rate-limiter.ts`
- Test: `src/security/submissions/in-memory-rate-limiter.test.ts`
- Modify: `src/security/submissions/submission-security.service.test.ts`

**Interfaces:**
- Consumes `SubmissionRateLimiter`, `SubmissionRateLimitKey`, `RateLimitPolicy`, and `RateLimitDecision` from Task 1.
- Produces `InMemorySubmissionRateLimiter` with `consume(keys, policy)` and deterministic `now` injection for tests.

- [ ] **Step 1: Write failing tests for per-origin/per-identity enforcement, atomic consumption, boundary, retry, and duplicate keys.**
  Assert separate origins do not share a bucket, identities are independently limited, the maximum allowed attempt succeeds, the next attempt is rejected with `retryAfterSeconds > 0`, a rejected combined request does not partially consume another key, and duplicate scope/value pairs are counted once.
- [ ] **Step 2: Run the limiter test and verify the expected RED failure.**
  Run `npx vitest run src/security/submissions/in-memory-rate-limiter.test.ts`.
  Expected: FAIL because the limiter implementation does not exist.
- [ ] **Step 3: Implement the fixed-window limiter.**
  Hash `scope` plus opaque key before using it as the map key; prune expired entries, check every unique key before incrementing any, increment each once when allowed, and return the maximum remaining retry duration when rejected.
- [ ] **Step 4: Add a service integration test using the real limiter and run both focused files.**
  Run `npx vitest run src/security/submissions/submission-security.service.test.ts src/security/submissions/in-memory-rate-limiter.test.ts`.
  Expected: all service and limiter tests pass.
- [ ] **Step 5: Commit the rate limiter.**
  Run `git add src/security/submissions/in-memory-rate-limiter.ts src/security/submissions/in-memory-rate-limiter.test.ts src/security/submissions/submission-security.service.test.ts` and `git commit -m "feat: add submission rate limiter"`.

### Task 3: CAPTCHA port and Turnstile adapter

**Files:**
- Create: `src/security/submissions/turnstile.adapter.ts`
- Test: `src/security/submissions/turnstile.adapter.test.ts`
- Modify: `src/security/submissions/submission-security.service.test.ts`

**Interfaces:**
- Consumes `CaptchaVerifier` and `CaptchaVerificationInput` from Task 1.
- Produces `createTurnstileVerifier(options): CaptchaVerifier` with injectable `fetchImplementation`.

- [ ] **Step 1: Write failing tests for valid and invalid Turnstile responses and service propagation.**
  Use a fake fetch implementation that returns `{ success: true }` or `{ success: false }`; assert valid tokens allow the service, invalid tokens return `CAPTCHA_INVALID`, and adapter results never contain the token or configured secret.
- [ ] **Step 2: Run the adapter test and verify the expected RED failure.**
  Run `npx vitest run src/security/submissions/turnstile.adapter.test.ts`.
  Expected: FAIL because the adapter does not exist.
- [ ] **Step 3: Implement the Turnstile adapter.**
  POST URL-encoded `secret` and `response` to Cloudflare’s fixed verification endpoint (or an explicitly injected endpoint for tests), accept only an HTTP-success JSON object with `success === true`, and convert missing input, non-OK responses, malformed JSON, and network errors to `{ valid: false }` without throwing or logging.
- [ ] **Step 4: Run all security tests and verify GREEN.**
  Run `npx vitest run src/security/submissions`.
  Expected: all submission-security, limiter, and Turnstile tests pass.
- [ ] **Step 5: Commit the CAPTCHA adapter.**
  Run `git add src/security/submissions/turnstile.adapter.ts src/security/submissions/turnstile.adapter.test.ts src/security/submissions/submission-security.service.test.ts` and `git commit -m "feat: add Turnstile submission adapter"`.

### Task 4: Public exports, Form Engine adapter documentation, and validation

**Files:**
- Create: `src/security/submissions/index.ts`
- Create: `src/security/submissions/README.md`
- Test: `src/security/submissions/index.test.ts`
- Modify: `package.json` only if an existing script is required; otherwise no package changes.

**Interfaces:**
- Consumes all public contracts and implementations from Tasks 1–3.
- Produces a single module entry point and documented future adapter boundary.

- [ ] **Step 1: Write a failing export-surface test.**
  Import the public names from `./index` and assert the service, limiter, Turnstile factory, and contract types’ runtime factories are available without importing forms or Prisma.
- [ ] **Step 2: Run the export test and verify the expected RED failure.**
  Run `npx vitest run src/security/submissions/index.test.ts`.
  Expected: FAIL because the index module does not exist.
- [ ] **Step 3: Implement the index and README.**
  Re-export the service, limiter, Turnstile factory, and runtime policy constants; document the future Form Engine adapter call order and which fields must never be persisted or returned by this module.
- [ ] **Step 4: Run focused tests, lint, and typecheck.**
  Run `npx vitest run src/security/submissions`, `npm run lint`, and `npx tsc --noEmit`.
  Expected: all focused tests pass, ESLint exits 0, and TypeScript exits 0.
- [ ] **Step 5: Commit exports and documentation.**
  Run `git add src/security/submissions/index.ts src/security/submissions/index.test.ts src/security/submissions/README.md docs/superpowers/specs/2026-10-04-submission-security-design.md docs/superpowers/plans/2026-10-04-submission-security.md` and `git commit -m "docs: document submission security integration"`.

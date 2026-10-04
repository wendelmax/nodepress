# LGPD Consent Plugin MVP Implementation Plan

> **For agentic workers:** REQUIRED SUB-SKILL: Use superpowers:executing-plans to implement this plan task-by-task. Steps use checkbox (`- [ ]`) syntax for tracking.

**Goal:** Deliver the native `lgpd-consent` plugin with granular multilingual consent, script blocking, revocation, minimal versioned records, configuration and regression coverage.

**Architecture:** The plugin uses the current NodePress SDK to register public/admin hooks and plugin routes. Public consent state is a small client cookie plus a client API for scripts/widgets; the existing GA4 and internal analytics paths become consent-aware. Configuration remains in `OptionService`, while the plugin migration owns the append-only consent ledger table.

**Tech Stack:** Next.js App Router, React 19, TypeScript, Vitest, Prisma raw migration SQL, existing NodePress hooks/options/plugin runtime and Tailwind UI.

**Spec:** `docs/superpowers/specs/2026-10-04-lgpd-consent-design.md`

## Global Constraints

- Keep implementation limited to issue #74; do not open or update a pull request.
- Do not claim automatic legal compliance; expose operator-configurable policy metadata and explicit limitations.
- Necessary consent is always true; only optional categories can be rejected.
- Store no IP, user-agent, path or visitor identifier in the consent ledger.
- New public script tags must be absent before optional consent and removable on revocation.
- Preserve existing plugin lifecycle, options, i18n and frontend rendering contracts.

## Review Focus

- Malformed/stale consent cookies must fail closed and show the banner; test normalization in `consent-state.test.ts`.
- A request cannot elevate categories or policy version supplied by the client; test route/service validation in `consent-service.test.ts`.
- A revoked analytics choice must stop both dynamic GA tags and internal analytics; test `consent-manager.test.ts` and `proxy.test.ts`.
- Missing database/configuration must keep public layout renderable; test root layout integration or isolated fallback helpers.
- Unsupported site language must use the documented fallback without rendering empty labels; test `i18n.test.ts`.

### Task 1: Consent state contract and pure services

**Files:**
- Create: `src/plugins/lgpd-consent/consent-state.ts`
- Create: `src/plugins/lgpd-consent/consent-state.test.ts`
- Create: `src/plugins/lgpd-consent/consent-service.ts`
- Create: `src/plugins/lgpd-consent/consent-service.test.ts`

**Interfaces:**
- Produces `ConsentCategory`, `ConsentChoices`, `ConsentCookie`, `DEFAULT_CONSENT_CHOICES`, `normalizeConsentChoices`, `parseConsentCookie`, `serializeConsentCookie` and `isCategoryAllowed`.
- Produces `ConsentConfig`, `DEFAULT_CONSENT_CONFIG`, `normalizeConsentConfig`, `buildConsentEvent` and a repository interface for append/prune operations.

- [ ] Write failing tests for first visit, reject optional categories, partial acceptance, stale/malformed cookie fallback, necessary-category enforcement, client input validation and minimal event shape.
- [ ] Run `npx vitest run src/plugins/lgpd-consent/consent-state.test.ts src/plugins/lgpd-consent/consent-service.test.ts` and confirm the missing-module failures.
- [ ] Implement the pure types/normalizers and repository-independent event builder without browser or Prisma dependencies.
- [ ] Run the focused tests and confirm all pass; refactor only after green.
- [ ] Commit `feat: add lgpd consent state contracts`.

### Task 2: Plugin migration, persistence and SDK routes

**Files:**
- Create: `src/plugins/lgpd-consent/migration.ts`
- Create: `src/plugins/lgpd-consent/repository.ts`
- Create: `src/plugins/lgpd-consent/routes.ts`
- Create: `src/plugins/lgpd-consent/plugin.test.ts`
- Modify: `src/services/option.service.ts`
- Modify: `src/plugins/registry.ts`

**Interfaces:**
- `createConsentRepository()` persists `ConsentEvent` using parameterized Prisma SQL and prunes by retention days.
- `createLgpdConsentPlugin()` returns the `NodePressPlugin` manifest with migration, routes, admin/public hooks and `privacy.manage` permission.
- Routes expose `GET /lgpd-consent/config`, `POST /lgpd-consent/config`, `POST /lgpd-consent/record` and `POST /lgpd-consent/cleanup` under the existing plugin dispatcher.

- [ ] Write failing tests for migration DDL contract, plugin registry presence, safe public config, admin-only config writes, append-only event validation and retention pruning.
- [ ] Run focused tests and confirm failures before implementation.
- [ ] Implement the migration and repository with no PII columns, config normalization through existing options, authentication/capability checks and parameterized queries.
- [ ] Register the plugin without changing other plugin activation behavior.
- [ ] Run plugin-focused tests and existing plugin tests; refactor after green.
- [ ] Commit `feat: register lgpd consent plugin runtime`.

### Task 3: Multilingual public banner and script gate

**Files:**
- Create: `src/plugins/lgpd-consent/i18n.ts`
- Create: `src/plugins/lgpd-consent/ConsentManager.tsx`
- Create: `src/plugins/lgpd-consent/consent-manager.test.ts`
- Modify: `src/app/(web)/layout.tsx`
- Modify: `src/i18n/index.ts` or the plugin-local i18n adapter as required by the existing locale contract.

**Interfaces:**
- `getConsentDictionary(locale: string): ConsentDictionary` returns complete labels with fallback.
- `ConsentManager` accepts `{ locale: string; analyticsId?: string }` and exposes `window.NodePressConsent.isAllowed`, `.subscribe` and `.registerScript` for widgets.

- [ ] Write failing component/helper tests for first visit banner, rejection, partial acceptance, revocation, no script before consent, allowed script injection, removal after revocation and all supported locale fallbacks.
- [ ] Run focused tests and confirm the expected failures.
- [ ] Implement the client state machine, cookie persistence, record calls, accessible banner/preferences UI and script registry. Keep GA tags out of the initial markup.
- [ ] Integrate the plugin public slot into root layout while preserving metadata and render behavior when options/database are unavailable.
- [ ] Run focused tests, existing layout/frontend tests and refactor only while green.
- [ ] Commit `feat: gate public scripts behind lgpd consent`.

### Task 4: Analytics integration, defaults and admin settings

**Files:**
- Create: `src/plugins/lgpd-consent/SettingsPage.tsx`
- Create: `src/plugins/lgpd-consent/proxy-consent.ts`
- Create: `src/plugins/lgpd-consent/proxy-consent.test.ts`
- Modify: `src/proxy.ts`
- Modify: `src/app/api/install/route.ts`
- Modify: `src/i18n/dictionaries/pt-BR.ts`
- Modify: `src/i18n/dictionaries/en-US.ts`
- Modify: `src/app/(web)/admin/(dashboard)/plugins/page.tsx`

**Interfaces:**
- `hasAnalyticsConsent(cookieHeader: string | null): boolean` is a fail-closed, edge-safe parser used by proxy.
- `SettingsPage` uses existing `AdminI18nProvider` labels and plugin config routes for policy URL/version/retention.

- [ ] Write failing tests for proxy analytics blocking/allowing, install default activation, admin settings labels and frontend non-regression assertions.
- [ ] Run focused tests and confirm failures.
- [ ] Implement consent gating for internal analytics, default-enable the native plugin for new installs, add admin configuration UI and plugin metadata.
- [ ] Run focused tests plus existing public-home/proxy/plugin-page tests; refactor after green.
- [ ] Commit `feat: integrate lgpd analytics and settings`.

### Task 5: Full verification and review

**Files:**
- Modify: relevant files only if verification exposes a task-scoped defect.

- [ ] Run `npm test` and record complete output.
- [ ] Run `npx tsc --noEmit` and record complete output.
- [ ] Run `npm run lint` and record complete output.
- [ ] Run `npx prisma validate` and record complete output.
- [ ] Run `npm run build` when the environment permits; record failures as limitations with their exact cause.
- [ ] Review `git diff --check`, changed-file list and the issue checklist; do not open a PR.

# Pluggable Authentication Implementation Plan

> **For agentic workers:** REQUIRED SUB-SKILL: Use superpowers:executing-plans (recommended) to implement this plan task-by-task. Steps use checkbox (`- [ ]`) syntax for tracking.

**Goal:** Add local, Keycloak-only, and hybrid authentication modes with safe user migration and consistent internal roles.

**Architecture:** Extract authentication configuration and role normalization into pure modules. Configure Auth.js providers from `AUTH_MODE`, keeping local bcrypt credentials available without Keycloak and linking Keycloak identities to existing users by subject or exact email. Update the login and installer flows to reflect the active mode, and add a non-destructive migration/diagnostic command.

**Tech Stack:** Next.js 16 App Router, Auth.js/NextAuth v5 beta, Prisma 7, PostgreSQL, bcryptjs, TypeScript, Node test runner.

**Spec:** `docs/superpowers/specs/2026-09-21-pluggable-auth-design.md`

## Global Constraints

- `AUTH_MODE` accepts only `local`, `keycloak`, or `hybrid`; missing/unknown values resolve to `local`.
- Keycloak configuration is required only in `keycloak` and `hybrid` modes.
- Local passwords are compared with bcrypt and are never logged.
- Keycloak linking by email never overwrites `userPass`.
- Unknown or missing roles resolve to `subscriber`; `admin` and `administrator` resolve to `admin`.
- Migration is non-destructive and must not delete users, passwords, or Keycloak subjects.
- Existing API and UI authorization must use the normalized role vocabulary.

## Review Focus

- Missing Keycloak environment variables in local mode must not prevent the app from importing Auth.js — covered by Task 1 configuration tests.
- Unknown `AUTH_MODE` must not accidentally enable SSO — covered by Task 1 mode-resolution tests.
- A local user with a valid bcrypt hash must authenticate by both username and email — covered by Task 2 credential tests.
- Linking a Keycloak user by email must preserve the local password and avoid duplicates — covered by Task 3 linking tests.
- A non-admin must not promote users or access administrator-only APIs — covered by Task 4 authorization tests.

---

### Task 1: Authentication configuration and role normalization

**Files:**
- Create: `src/lib/auth-config.ts`
- Create: `src/lib/role-normalization.ts`
- Test: `tests/auth-config.test.mjs`
- Test: `tests/role-normalization.test.mjs`
- Modify: `package.json`

**Interfaces:**
- `resolveAuthMode(value?: string): 'local' | 'keycloak' | 'hybrid'`
- `getAuthProviderAvailability(env: NodeJS.ProcessEnv): { local: boolean; keycloak: boolean; mode: AuthMode; keycloakMissing: string[] }`
- `normalizeRole(value?: string | null): AppRole`
- `hasAdminAccess(value?: string | null): boolean`

- [x] **Step 1: Write failing mode and role tests**

  Add tests for missing/unknown mode, all three valid modes, missing Keycloak variables, legacy administrator role, supported roles, and unknown role.

- [x] **Step 2: Run tests to verify they fail**

  Run: `node tests/auth-config.test.mjs && node tests/role-normalization.test.mjs`

  Expected: FAIL because the new modules do not exist.

- [x] **Step 3: Implement pure configuration and role modules**

  Keep these modules free of Prisma, Auth.js, filesystem, and network dependencies so they can be tested directly by Node.

- [x] **Step 4: Run tests and update the project test script**

  Run: `node tests/auth-config.test.mjs && node tests/role-normalization.test.mjs`

  Update `package.json` so `npm test` runs every `tests/*.test.mjs` file.

- [x] **Step 5: Run the complete unit test command**

  Run: `npm test`

  Expected: PASS with the existing access-control tests plus the new configuration and role tests.

### Task 2: Local Auth.js credentials provider

**Files:**
- Modify: `src/auth.ts`
- Modify: `src/app/(web)/login/page.tsx`
- Modify: `src/app/(web)/admin/install/page.tsx`
- Modify: `src/app/api/install/route.ts`
- Test: `tests/local-auth.test.mjs`

**Interfaces:**
- Auth.js local provider accepts `{ identifier: string, password: string }`.
- `authorize` returns the safe user identity or `null`.
- Session JWT includes `id`, normalized `role`, and `authProvider`.

- [x] **Step 1: Write failing local credential tests**

  Test valid username, valid email, wrong password, missing user, and empty `userPass` using the same bcrypt comparison semantics as production.

- [x] **Step 2: Run the tests to verify the missing behavior**

  Run: `node tests/local-auth.test.mjs`

  Expected: FAIL because local authentication is not yet configured.

- [x] **Step 3: Add mode-aware Auth.js provider construction**

  Register `CredentialsProvider` for `local` and `hybrid`. Register Keycloak only for `keycloak` and `hybrid` when its required environment is complete. Keep Keycloak errors explicit without throwing on local-mode imports.

- [x] **Step 4: Restore the local installer password only for local/hybrid mode**

  The API must hash the supplied password for local/hybrid installations and reject a missing password in those modes. Keycloak-only installations omit the password and retain an unusable hash.

- [x] **Step 5: Make the login page render the active methods**

  Render local identifier/password fields when enabled, a Keycloak button when enabled, and a clear configuration message when Keycloak is selected but incomplete.

- [x] **Step 6: Run focused tests and the build typecheck**

  Run: `node tests/local-auth.test.mjs` and `npm run build`

  Expected: local auth tests PASS and TypeScript compilation succeeds.

### Task 3: Keycloak linking and migration command

**Files:**
- Modify: `src/auth.ts`
- Create: `src/lib/user-identity-linking.ts`
- Create: `src/scripts/migrate-keycloak-users.ts`
- Modify: `package.json`
- Test: `tests/keycloak-linking.test.mjs`

**Interfaces:**
- `linkKeycloakIdentity({ keycloakSub, email, profile, roles }, repository)` returns `{ userId, created, linkedBy }`.
- Migration command reports `{ scanned, linked, alreadyLinked, missing, conflicts }` and never deletes or overwrites `userPass`.

- [x] **Step 1: Write failing identity-linking tests**

  Cover existing `keycloakSub`, exact email link, new subscriber creation, duplicate email conflict, role mapping, and password preservation.

- [x] **Step 2: Run the tests to verify they fail**

  Run: `node tests/keycloak-linking.test.mjs`

  Expected: FAIL because the linking module does not exist.

- [x] **Step 3: Implement the repository-independent linking service**

  Pass database operations through a small repository interface so the behavior can be tested without starting PostgreSQL. Do not put secrets or password values in return objects or logs.

- [x] **Step 4: Integrate linking into the Keycloak JWT callback**

  Replace duplicated user lookup/creation code in `src/auth.ts` with the linking service and include `authProvider: 'keycloak'` in the token.

- [x] **Step 5: Add the migration/diagnostic script**

  Query users without `keycloakSub`, accept an email mapping input or report missing/conflicting entries, and update only `keycloakSub`. Expose it as `npm run auth:migrate-keycloak`.

- [x] **Step 6: Run focused and complete tests**

  Run: `node tests/keycloak-linking.test.mjs` and `npm test`

  Expected: PASS without requiring Keycloak or PostgreSQL for the pure tests.

### Task 4: Role enforcement and API hardening

**Files:**
- Modify: `src/proxy.ts`
- Modify: `src/app/api/users/route.ts`
- Modify: `src/app/api/users/[id]/route.ts`
- Modify: `src/app/api/export/leads/route.ts`
- Modify: `src/app/(web)/admin/(dashboard)/users/new/page.tsx`
- Modify: `src/app/(web)/admin/(dashboard)/users/[id]/page.tsx`
- Test: `tests/authorization.test.mjs`

**Interfaces:**
- All admin checks use the normalized `AppRole` and `hasAdminAccess`.
- User creation/update APIs reject role changes from non-admin sessions.

- [x] **Step 1: Write failing authorization tests**

  Test `admin` and legacy `administrator` access, rejection of `author`/`subscriber`, and rejection of non-admin role mutation.

- [x] **Step 2: Run the tests to verify they fail**

  Run: `node tests/authorization.test.mjs`

  Expected: FAIL against the current session-only user APIs.

- [x] **Step 3: Implement centralized authorization checks**

  Keep route handlers responsible for HTTP responses and use the shared role helper for decisions. Preserve public GET behavior only where the current route explicitly documents it as public.

- [x] **Step 4: Align user UI role values with the normalized vocabulary**

  Keep display labels in Portuguese but submit `admin`, `editor`, `author`, `contributor`, or `subscriber`.

- [x] **Step 5: Run authorization tests and lint**

  Run: `node tests/authorization.test.mjs` and `npm run lint`

  Expected: PASS with no lint errors.

### Task 5: Environment, documentation, and UI validation

**Files:**
- Modify: `env.example`
- Modify: `README.md`
- Modify: `scripts/validate-ui.mjs`
- Modify: `artifacts/wiki-screenshots/README.md`

**Interfaces:**
- Document `AUTH_MODE=local` as the default.
- Document the hybrid migration sequence and rollback behavior.
- Playwright checks local login fields, Keycloak button visibility, and installer password visibility per mode.

- [x] **Step 1: Add mode-specific environment and migration documentation**

  Include local, Keycloak-only, and hybrid examples with warnings not to commit secrets.

- [x] **Step 2: Extend Playwright validation**

  Run the dev server with isolated environment values and assert that local mode does not require Keycloak, Keycloak mode shows SSO, and hybrid mode shows both methods. Keep screenshots under `artifacts/wiki-screenshots/`.

- [x] **Step 3: Run the full verification suite**

  Run: `npm test`, `npm run lint`, `npm run build`, `npm run validate:ui`, and `npm audit --omit=dev`.

  Expected: all commands exit 0; build may log that PostgreSQL is unavailable during optional static data collection, but must not fail.

- [x] **Step 4: Review the final diff and working tree**

  Run: `git diff --check` and `git status --short`.

  Confirm no `.env`, passwords, client secrets, or generated dependency directories are tracked.

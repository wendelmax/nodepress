# Plugin SDK settings, secrets, storage and slots

## Goal

Implement issue #70 on top of the existing plugin lifecycle, capability enforcement and namespaced storage APIs.

## Tasks

1. Add test-first configuration APIs for typed settings and encrypted secrets, including validation, redaction, tenant-ready keys and permission boundaries.
2. Add typed slot/admin-page registries backed by reversible hooks, wire them into the runtime, and cover registration plus cleanup.
3. Add health/status types and service methods, gate runtime storage, and add an example plugin that uses settings, secrets and a slot.
4. Document the SDK contract, run focused tests and the complete suite, then commit and open the PR.

## Verification

- Focused plugin tests pass.
- Typecheck and lint/build checks pass when available in the repository scripts.
- Full `npm test` passes with no regression in existing plugin lifecycle behavior.
- No secret value appears in settings snapshots, UI/status output or error responses.


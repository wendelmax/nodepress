# NodePress operations

## Deployment order

1. Build the image from the exact commit being deployed with `npm ci` and `npm run build`.
2. Take a PostgreSQL backup before applying migrations.
3. Run `npx prisma migrate deploy` as a release step, before starting the new application image.
4. Start the application and verify `GET /api/health`.
5. Confirm the plugin registry and migration check are healthy before routing traffic to the release.

The application should run as a non-root container. Runtime configuration belongs in the secret manager or deployment environment, not in the image or repository.

## Required secrets and configuration

- `DATABASE_URL`: PostgreSQL connection string with least-privilege application credentials.
- `AUTH_SECRET`: secret used to sign sessions.
- `AUTH_KEYCLOAK_ID`, `AUTH_KEYCLOAK_SECRET`, `AUTH_KEYCLOAK_REALM`, and `NEXT_PUBLIC_KEYCLOAK_URL`: Keycloak integration.
- `NEXTAUTH_URL`: canonical public application URL.
- `STORAGE_DRIVER` and provider credentials when object storage is enabled.

Rotate secrets through the deployment platform. Do not print them in CI logs or pass them as command-line arguments.

## Backups and rollback

Use a tested `pg_dump`/managed PostgreSQL backup before every migration batch. Keep backup retention independent of application releases and test restoration regularly.

Application image rollback is safe when the previous image is compatible with the already-applied schema. Destructive or non-backward-compatible migrations require an explicit rollback migration or a restore; do not roll back the image alone and assume the database will follow it.

If `/api/health` reports `unhealthy`, stop traffic to the release, inspect structured logs by `requestId`/`pluginId`, and restore the previous image only when the schema compatibility boundary allows it.

## Observability

Logs are JSON records with an event name and optional request, plugin, job, or tenant fields. Public API responses contain stable error codes and generic messages; SQL, stack traces, and credentials remain server-side only. The health endpoint reports database, migration, plugin, storage, and queue status.

## Legacy coexistence and cutover

The temporary `nodepress-legacy-bridge` is an operational migration tool, not a second source of truth. Keep the legacy application authoritative for a domain until its reconciliation report is `passed` and the cutover is explicitly approved.

For each domain:

1. Run a shadow export with a fixed watermark and record the `runId`.
2. Review counts, IDs, checksums and failed items; do not activate on blocking errors.
3. Freeze legacy writes, run the final delta, and repeat reconciliation.
4. Move the domain through `shadow -> ready -> frozen -> active` using the protected admin API.
5. Route reads and administrative writes to NodePress; keep the legacy domain read-only during stabilization.
6. For rollback, block NodePress writes, preserve the run and audit events, and route back only after reconciling post-cutover writes.

The bridge uses separate credentials and databases. NodePress must never access legacy tables directly. Keep `runId`, `legacyId`, request IDs, counts, checksums and operator identity in the audit trail, without logging payloads, tokens or personal data.

### Kill switch and retirement

Set routing mode to `legacy` to return public traffic to the legacy application. This does not reopen writes for an already-active domain; rollback requires an explicit, audited decision.

- [ ] All domains are active in NodePress and stable for the agreed period.
- [ ] Final backup is restorable and migration reports are archived.
- [ ] No blocking reconciliation errors or open incidents remain.
- [ ] Legacy tokens, jobs and admin links are revoked.
- [ ] Legal/LGPD retention requirements are approved before deletion.
- [ ] The bridge is removed only after its evidence package is retained.

# NodePress operations

## Deployment order

1. Extract the exact compiled release package; do not run a new application build.
2. Take a PostgreSQL backup before applying migrations.
3. Run `npm run migrate:deploy` from the extracted package as a release step, before starting the application.
4. Start the application with `node server.js` and verify `GET /api/health`.
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

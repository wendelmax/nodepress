# NodePress infrastructure adapters

NodePress application services depend on ports, not on a specific vendor. The
default factory in `src/infrastructure/defaults.ts` provides a safe single-
process baseline and can be replaced by composition at the application
boundary.

## Default adapters

| Capability | Default | Production guidance |
| --- | --- | --- |
| Cache | in-memory | Replace with Redis or another shared cache when running multiple instances. |
| Queue | in-process | Replace with a durable broker for jobs that must survive restarts. Idempotency keys remain part of the port contract. |
| Object storage | in-memory | Use local files only for single-instance/self-hosted deployments. Use S3-compatible storage for durable shared media. |
| Search | no-op, degraded health | Configure a real adapter before enabling search-dependent features. |
| Mail | no-op, degraded health | Configure a real provider before sending transactional mail. |
| Webhooks | no-op, degraded health | Configure a real dispatcher before relying on external event delivery. |

The no-op adapters intentionally report `degraded`; this makes missing optional
services visible through health inspection instead of pretending they are
available.

## Local storage configuration

Set these variables when a deployment should persist media on its local disk:

```env
STORAGE_DRIVER=local-filesystem
STORAGE_LOCAL_ROOT=./data/uploads
```

The local adapter rejects path traversal, creates parent directories on demand,
and returns binary content without exposing provider-specific APIs to callers.
The default is in-memory storage, which is appropriate for tests and disposable
development processes only.

## External services

Redis, queue brokers, and S3-compatible providers should be introduced as
separate adapter packages that implement the same port interfaces. Their
credentials and endpoints belong in the deployment environment or secret
manager. Do not make external services mandatory for the default local setup or
add provider-specific imports to domain modules.

For a multi-instance deployment, configure shared cache, durable queue, and
shared object storage before scaling beyond one application process.

## Legacy media migration

The temporary legacy bridge uses `ObjectStoragePort` through
`MediaTransfer`. Media keys are deterministic (`legacy-media/<legacyId>`), the
SHA-256 checksum is verified after upload, and the mapping is persisted only
after verification. A failed first-time mapping save removes the newly created
object so retries do not leave orphaned media.

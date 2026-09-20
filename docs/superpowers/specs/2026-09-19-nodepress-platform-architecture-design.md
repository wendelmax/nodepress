# NodePress Platform Architecture Design

## Status

Approved direction: evolve NodePress from an ONG-oriented CMS implementation into a platform-agnostic, modular monolith with a stable plugin SDK and explicit integration adapters.

## Goal

Make NodePress suitable for blogs, institutional sites, commerce-like catalogs, education, directories, portals, and organization-specific workflows without moving domain-specific rules into the core.

The result must preserve the current Next.js/Prisma application and existing WordPress-like behavior while creating boundaries that allow modules, plugins, and infrastructure adapters to evolve independently.

## Guiding decisions

1. **Platform-neutral core.** The core owns lifecycle, contracts, identity, content primitives, configuration, and infrastructure ports. It must not know about animals, NGOs, Payload, or a particular theme.
2. **Modular monolith first.** Modules remain in one deployable application and one primary database initially. Boundaries are explicit so a high-load module can later be extracted without redesigning its public contract.
3. **Trusted code-managed plugins.** Plugins are TypeScript code reviewed and deployed with the application. Runtime upload of arbitrary ZIP/JavaScript packages is excluded because it would turn the admin panel into remote code execution.
4. **Generic content before domain tables.** Plugins should prefer declaring content types and fields through the content module. A plugin may own a specialized table when it needs custom constraints, high-volume queries, or external synchronization.
5. **Payload is an adapter.** Payload migration code lives outside the core and maps source data into NodePress contracts. It must be idempotent and safe to dry-run.
6. **Single-tenant deployment initially, tenant-aware contracts.** The first release keeps the existing single-site persistence model. Application context, events, jobs, cache keys, and plugin contracts carry an optional tenant/site identifier so a later multi-tenant module does not require rewriting every boundary.

## Target architecture

```text
Next.js routes / CLI / workers
              |
       Application modules
 content | media | identity | menus | forms | settings
              |
         NodePress kernel
 lifecycle | events | capabilities | migrations | registry
              |
       ports and adapters
 Prisma | object storage | cache | queue | search | email | webhooks
```

### Kernel

The kernel provides:

- typed plugin discovery and manifest validation;
- dependency-aware activation and deactivation;
- transactional migration ledger and checksum enforcement;
- actions, filters, and typed domain events;
- capability checks and request context;
- module and plugin health checks;
- stable versioned contracts for API and CLI entry points.

The kernel must not import feature-specific repositories or render feature-specific UI.

### Application modules

Each module exposes an application service and contracts, with infrastructure kept behind a repository or adapter boundary.

- **Content:** content types, records, status, revisions, fields, publishing, and permalink metadata.
- **Taxonomy:** categories, tags, hierarchical terms, and relationships.
- **Media:** metadata, transformations, storage keys, and signed/public URLs.
- **Identity:** users, sessions, roles, capabilities, and later tenant membership.
- **Navigation:** database menus plus plugin contributions.
- **Forms:** form definitions, submissions, spam controls, and webhooks.
- **Settings:** typed schemas, validation, secrets, and cache invalidation.
- **Jobs:** durable asynchronous work with retry, backoff, idempotency, and visibility.
- **Search:** an optional index adapter; PostgreSQL search remains the fallback.

Existing WordPress-compatible services remain available during the transition. New module contracts should wrap or replace them incrementally rather than breaking all route consumers at once.

### Plugin SDK

The plugin manifest evolves to support:

```ts
interface NodePressPluginManifest {
  id: string
  name: string
  version: string
  engine?: { nodepress: string }
  dependencies?: Record<string, string>
  permissions?: string[]
  migrations?: PluginMigration[]
  register(context: PluginContext): void | Promise<void>
}
```

`PluginContext` exposes only stable registrars and ports:

- hooks and typed events;
- admin and public menus;
- content types and fields;
- settings schemas;
- routes and commands;
- jobs and scheduled handlers;
- capability definitions;
- module services through explicit interfaces.

Plugin activation validates dependencies, engine compatibility, migrations, and capabilities before registering runtime contributions. Deactivation removes runtime contributions and preserves data by default. Uninstall and destructive rollback are separate, explicit operations and are not part of normal deactivation.

### Generic content types

Content types are declared with stable IDs and field definitions. A declaration can select the default content repository or provide a custom repository adapter.

```ts
contentTypes.register({
  id: 'animal',
  label: 'Animal',
  fields: {
    name: { type: 'text', required: true },
    status: { type: 'select', options: ['available', 'adopted'] },
  },
})
```

The example `animals` plugin becomes a reference consumer of this API. Its specialized table may remain as a performance example, but no core route or schema can require it.

### Infrastructure ports

The application defines ports for:

- database transactions and repositories;
- object storage;
- cache;
- queue/worker execution;
- search indexing;
- email and notifications;
- outbound webhooks.

Prisma/PostgreSQL remains the default adapter. Optional adapters must be selected through configuration and tested against the same contract suite.

## Payload migration adapter

Payload support is implemented as a separate import package/CLI, not as a core dependency. The first adapter accepts a versioned JSON export and can later add a REST source using a token.

Required properties:

- `dry-run` mode with counts and validation errors;
- source-to-target mapping configuration;
- idempotency by source collection and source ID;
- resumable batches;
- transaction boundaries per batch;
- media download through the Media port;
- preservation of source IDs and original URLs;
- relationship resolution after primary records exist;
- redirect manifest for changed slugs;
- import report suitable for CI artifacts.

The adapter maps common Payload collections into Content, Taxonomy, Identity, and Media contracts. Unknown collections are reported and can be mapped by a plugin without changing the core.

## Admin and themes

The plugin management screen consumes the plugin lifecycle API instead of writing `active_plugins` directly. Themes receive a typed render context containing settings and capability-filtered public menus. Core navigation remains available as core contributions; plugin navigation is additive and hierarchical.

## Security and operations

- API errors expose stable public codes and safe messages; migration SQL and stack traces stay server-side.
- Capability checks are performed server-side for every admin route and command.
- Plugin manifests are validated at build/startup time.
- Migrations run through `prisma migrate deploy` for core schema and the plugin ledger for plugin schema.
- Jobs and importers are idempotent and observable.
- Structured logs include request, plugin, module, job, and optional tenant IDs.
- CI runs tests, typecheck, lint, Prisma validation, build, dependency audit, and migration checks.

## Pull request/worktree sequence

Each PR is based on `main`, uses its own worktree, and must pass the complete verification suite before publication:

1. `architecture/core-platform` — contracts, module boundaries, context, and SDK evolution.
2. `feature/content-type-system` — generic content type/field registry and reference plugin migration.
3. `feature/plugin-admin-management` — lifecycle-driven admin UI and generic plugin status.
4. `feature/payload-import-adapter` — dry-run/resumable/idempotent Payload import.
5. `chore/security-observability` — safe errors, lint, audit, logs, health checks, and CI.
6. `feature/infra-adapters` — queue/cache/storage/search ports and configuration contracts where needed by production load.

The first two PRs are prerequisites for the importer. Domain-specific pages remain in the example plugin and do not become core modules.

## Acceptance criteria

- Existing posts, themes, menus, legacy plugins, and admin routes continue working.
- A new plugin can add a content type, settings, menu, capability, migration, route, and job without editing unrelated core modules.
- A plugin can be deactivated without deleting its data.
- A Payload export can be dry-run, imported twice safely, resumed after interruption, and audited by source ID.
- The application can run with PostgreSQL-only defaults and optionally enable infrastructure adapters.
- The codebase has no ONG/Payload-specific assumptions in kernel contracts.
- Every PR has focused tests, full-suite verification, and a reviewable migration/rollback story.

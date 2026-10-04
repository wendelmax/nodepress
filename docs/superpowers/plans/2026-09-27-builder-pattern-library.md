# Builder Pattern Library Implementation Plan

## Goal

Implement issue #79 on top of the responsive layout contract from issue #78.

## Tasks

1. Add the pure pattern contract and validation helpers with red tests for kinds, manifests, safe JSON and copy/reference nodes.
2. Add Prisma persistence and a service for catalog CRUD, versioning, import/export and bounded reference resolution.
3. Add admin-only API routes for catalog, item operations, import and export, with route tests and consistent auth errors.
4. Add the admin pattern library screen with search, filters, metadata preview and copy/reference actions.
5. Integrate `PatternReference` into the Puck config and server renderer without allowing arbitrary components or code.
6. Run focused tests, full test suite, typecheck, lint, Prisma validation and build; document the result.

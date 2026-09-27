# Builder Pattern Library Design

## Context

Issue #79 adds reusable sections, components, pages and site kits to the Puck builder. The library must preserve the existing versioned builder document contract and must never execute code imported from a pattern.

## Contract

### Pattern record

Each pattern has a stable id, slug, name, description, kind (`component`, `section`, `page` or `kit`), category, tags, engine range, schema version and a validated Puck document. A pattern version is immutable once published; updating a pattern creates the next version while retaining the previous document for rollback/export.

### Usage modes

- Copy: returns a deep-cloned document fragment that can be inserted and edited independently.
- Reference: stores a `PatternReference` node. Server rendering resolves references to the current published pattern version, with cycle and depth guards. Broken references render the safe builder fallback.

### Import/export

Exports contain a manifest (`format`, `engine`, `schemaVersion`, pattern metadata) and the document. Imports validate JSON size/depth, manifest format, engine compatibility, schema version, allowed component ids and builder layout props. No functions, arbitrary HTML execution, scripts or unknown component types are accepted.

### Administration

Admin-only APIs provide list/search, create, update, delete, export and import. The admin library page exposes search, category/tag filters, preview metadata and copy/reference actions. Delete is blocked when the pattern is referenced by an active document unless the caller explicitly chooses a replacement/cleanup flow; the first increment uses a soft archive flag.

## Acceptance mapping

- Reuse is represented by copy documents and `PatternReference` nodes.
- Search, categories, tags and preview metadata are available in the admin catalog.
- Versioned records preserve previous documents.
- Import/export validates engine, schema and components.
- Public resolution is bounded and treats all pattern data as inert JSON.

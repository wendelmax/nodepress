# Builder Collaboration, Revisions, and Client Mode

## Context

The Puck foundation now provides a canonical `BuilderDocument`, client/server
configuration resolution, and safe public rendering. The Builder still saves
through the legacy post/option paths, has no durable collaboration history,
and gives every authenticated editor the same field surface. Issue #82 adds a
small vertical collaboration domain without changing the document parser,
sanitizer, or public renderer owned by issue #83.

## Goal

Provide an auditable, append-only collaboration layer for Puck documents with
optimistic concurrency, private comments, separate content/layout/global-token
permissions, and a server-enforced client editing mode with a reduced field
allowlist.

The MVP covers:

- Puck content attached to an existing post or page (`post:<numeric id>`);
- the existing global footer option (`option:site_footer_content`) as a layout
  target;
- the generic global-token target contract and authorization policy, without
  adding a new token editor;
- admin Builder UI for history, JSON/tree comparison, restoration, and private
  comments;
- role-based enforcement for `admin`, `editor`, `author`, `contributor`, and
  `client` actors.

It does not change public rendering, sanitization, component registration, or
the existing standard post revision implementation.

## Design

### 1. Generic Builder collaboration aggregate

Add four Prisma models:

`BuilderTarget` is the mutable coordination record. It identifies a target by
`targetType` and `targetKey`, stores the latest canonical Puck document, and
owns an integer `version`. The pair `(targetType, targetKey)` is unique. A
target is lazily initialized from the existing post content or option value
when first requested, so existing content is not batch-rewritten.

`BuilderRevision` is append-only. It stores the target, monotonically
increasing version, full canonical document JSON, author, creation time, an
optional note, and an optional `restoredFromRevisionId`. There is a unique
constraint on `(targetId, version)`. The service never updates or deletes a
revision.

`BuilderComment` is private collaboration data. It stores the target,
optional revision, an optional JSON-pointer-like `anchor`, body, author,
status (`open` or `resolved`), and resolution metadata. It is exposed only by
authenticated admin Builder endpoints and is never joined by public content
queries.

`BuilderAuditEvent` is append-only. It records actor, target, action, source
and destination versions, optional revision/comment IDs, request ID, and
structured metadata. Save, conflict, restore, comment create/resolve, and
authorization failures produce audit entries. The existing structured logger
remains the operational sink; this table is the durable audit trail for the
Builder domain.

The aggregate uses a transaction for every mutation. A save or restore reads
the target with its current version, verifies `expectedVersion`, creates the
next revision, updates the target, synchronizes the legacy source field, and
creates the audit event in one transaction. A stale version returns `409` and
does not write a revision, target update, or source update.

### 2. Target adapters

The Builder service resolves and persists these target types:

- `post` + numeric key: `Post.postContent` is the legacy source boundary;
- `option` + `site_footer_content`: `Option.optionValue` is the legacy source
  boundary;
- `tokens` + a named global token key: reserved for the global-token policy and
  persistence adapter, but no new UI is introduced in this MVP.

Only canonical Puck documents are accepted by collaboration mutations. Legacy
Puck documents are normalized by the existing foundation parser before the
first target/revision is created. HTML and Editor.js values continue through
their existing flows and are not imported into the collaboration aggregate.

### 3. Authorization and structural protection

Create a pure policy module with these capabilities:

- `builder.content.read` / `builder.content.write`;
- `builder.layout.read` / `builder.layout.write`;
- `builder.tokens.read` / `builder.tokens.write`;
- `builder.history.read` / `builder.history.restore`;
- `builder.comments.read` / `builder.comments.write`;
- `builder.client.use`.

The role policy is explicit and testable:

- `admin`: all capabilities;
- `editor`: content, layout, history, and comments; global tokens read-only;
- `author`: content and history read on owned post targets;
- `contributor`: content read/write on draft post targets and history read;
- `client`: content read/write plus `builder.client.use`, with no layout,
  tokens, restore, or comments.

The route/service still checks target ownership and draft status for author and
contributor operations. Client mode requires the `client` role or an explicit
server-issued client capability; a UI prop alone never grants it.

Structural protection compares the previous and requested documents before a
mutation:

- content-only actors may change allowed component props but not component
  types, order, nesting, root layout data, or global token data;
- layout actors may change the component tree and root layout data;
- token actors may change only the token target;
- client actors use a component/field allowlist and cannot change structure,
  links, media URLs, code-like fields, root data, or tokens.

The comparison is a domain policy check. It does not sanitize or render the
document and does not modify the issue #83 pipeline.

### 4. API

Add authenticated admin Builder routes under `/api/admin/builder`:

- `GET /targets/:targetType/:targetKey`: current document, version,
  capabilities, and mode metadata;
- `PUT /targets/:targetType/:targetKey`: save a document with
  `{ document, expectedVersion, note?, mode? }`;
- `GET /targets/:targetType/:targetKey/revisions`: immutable revision list;
- `GET /targets/:targetType/:targetKey/revisions/:revisionId`: a revision and
  its document for comparison;
- `POST /targets/:targetType/:targetKey/restore`: restore a revision with
  `{ revisionId, expectedVersion }`, creating a new revision and audit event;
- `GET /targets/:targetType/:targetKey/comments`: private comments;
- `POST /targets/:targetType/:targetKey/comments`: create a private comment;
- `PATCH /targets/:targetType/:targetKey/comments/:commentId`: resolve or
  reopen a private comment.

Responses contain no comments, audit rows, or revision bodies unless the
authenticated caller has the corresponding capability. Public routes and
public page data do not call these endpoints or include these models.

### 5. UI

Extend `PuckBuilder` with an optional collaboration target and mode. When a
target is supplied, publish performs the Builder save endpoint using the
current version, reports conflicts without overwriting local edits, and
returns the saved version to its parent. Existing callers without a target
retain the current callback behavior.

The admin post/page editor passes its post target and exposes a compact
collaboration panel containing:

- current version and conflict status;
- revision list with side-by-side structural/property JSON comparison;
- restore action requiring the current version and showing that restoration is
  reversible;
- private comment list/create/resolve controls.

The footer Builder passes the option target. Client mode renders the same Puck
canvas with only the allowlisted editable fields; server-side policy is the
source of truth and rejects crafted requests.

### 6. Audit and errors

Audit payloads contain target identity, actor ID, role, request ID, action,
versions, and stable reason codes. They never contain passwords, session
tokens, or arbitrary full request bodies. Conflict is `409`, missing target or
revision is `404`, unauthenticated is `401`, and capability/structural
violations are `403` with a stable error code.

Restoration copies the selected immutable document into a new version. It
does not mutate the selected revision; restoring again creates another version
and can therefore be reversed by restoring the prior version.

## Testing strategy

Use TDD for every new production behavior. Add unit tests for the pure RBAC
and structural policy, service tests with an in-memory transaction-shaped
adapter for version conflicts and immutable/reversible restore, and route/UI
tests for comments and private-data boundaries. Add regression assertions that
public post data and public renderer paths do not expose Builder comments,
audit events, or revision bodies.

The final verification attempts, in the isolated worktree, are:

```text
npm test
npx tsc --noEmit
npm run lint
npx prisma validate
npm run build
```

Known environmental failures will be reported with their command output and
will not be fixed by changing unrelated infrastructure or the #83 pipeline.

## Out of scope

- public comments or annotations;
- changing HTML/Editor.js/Puck sanitization or rendering;
- real-time websocket presence or live cursors;
- merge/conflict resolution beyond optimistic version rejection;
- a new global token editor;
- changes to legacy `Post` revision semantics outside Builder saves;
- pull requests or deployment.

## Acceptance criteria

- Existing Puck content can be loaded, saved, listed, compared, and restored
  through the collaboration aggregate.
- Revision rows and audit rows are append-only; restore creates a new revision.
- A stale save/restore receives `409` and leaves persisted state unchanged.
- Content, layout, token, history, comment, and client permissions are tested
  independently and enforced server-side.
- Client mode cannot alter protected structure or disallowed fields, even with a
  crafted request.
- Comments are available to authorized admin UI only and are absent from
  public responses/frontend data.
- The existing public renderer and sanitization code remain unchanged.
- Verification commands are run and their actual results are reported.

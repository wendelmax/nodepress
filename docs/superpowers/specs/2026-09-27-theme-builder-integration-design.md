# Theme Builder Integration Design

## Goal

Allow the Puck Builder to provide versioned theme templates while preserving the current theme components and published content when a template is missing, disabled or incompatible.

## Contract

### Theme template

A template belongs to a registered theme and targets one area: `header`, `footer`, `single`, `page`, `archive` or `404`. It contains a validated Puck document, a priority and conditions for context, post type, slug or taxonomy. The current version is kept on the template record and every activation/update is copied to an immutable version history.

### Resolution

Only templates for the active theme and enabled records participate. Specificity is deterministic: exact slug, taxonomy, post type, context, then default; priority and id break ties. A resolver never throws for a missing match. The current static theme component remains the fallback.

### Slots and tokens

`ThemeSlot` is the only Builder surface for theme regions. Server-side slot resolution replaces it with the explicitly provided slot content and never evaluates arbitrary component code. Theme metadata exposes allowed slots and global design tokens through `ThemeRenderOptions`, so the Builder and theme use the same token contract.

### Compatibility

Template documents must pass the existing Builder document, component and responsive layout validators. Theme switching only changes the template resolver; post/page content remains stored in its existing canonical Builder document. Disabling a template immediately returns to the static fallback; historical versions remain available for rollback.

## Acceptance mapping

- Header, footer, single, page, archive and 404 are first-class areas.
- Conditions cover post type, taxonomy, slug and context.
- Preview returns a validated document before activation.
- Theme tokens and slots are explicit and bounded.
- Missing, disabled or invalid templates use the current safe theme fallback.

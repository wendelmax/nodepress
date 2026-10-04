# Theme Builder Integration Implementation Plan

1. Add the pure theme-template contract, condition matcher, specificity resolver and slot replacement tests.
2. Add Prisma persistence and immutable template versions with safe create/update/disable/rollback operations.
3. Extend theme metadata with slots/tokens and add the `ThemeSlot` Builder component.
4. Integrate template resolution into header, footer, page/post/archive and 404 rendering while preserving static fallbacks.
5. Add admin APIs for listing, previewing, activating, disabling and rolling back templates.
6. Add a small admin template management surface linked from Themes.
7. Run focused/full tests, typecheck, lint, Prisma validation and production build.

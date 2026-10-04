# Form Engine migration

The canonical submission contract is:

```text
POST /api/forms/:formId/submissions
{ "values": { ...fields }, "security": { ...optional checks } }
```

`/api/forms/submit` remains available during the deprecation window for numeric
legacy form IDs. It creates or refreshes the `legacy-{postId}` form definition,
delegates to the same orchestrator, and returns `Deprecation`, `Sunset`, and
`Link` headers. Set `FORMS_LEGACY_SUNSET` to the planned removal date.

## Existing data

Run the idempotent migration in bounded batches before removing the old table:

```bash
npm run forms:migrate-legacy
```

The command creates canonical submissions and leads using stable `legacy-*`
source IDs. It never deletes or rewrites rows in `np_form_submissions`; an
invalid payload is counted as skipped for manual review.

## Delivery and retention

The authenticated `/api/cron` endpoint processes pending lead deliveries. Set
`FORMS_DELIVERY_WEBHOOK_URL` and `FORMS_DELIVERY_WEBHOOK_SECRET` to enable the
default signed webhook target. Without them, pending records remain retryable
and are never reported as delivered. `FORMS_DELIVERY_BATCH_SIZE` optionally
limits each cron run (maximum 500).

Canonical leads are retained according to `lgpd_retention_days` (30–3650 days,
365 by default) and pruned in bounded batches by the same cron job. The export
route redacts keys that look like tokens, secrets, passwords, API keys, or
CAPTCHA values.

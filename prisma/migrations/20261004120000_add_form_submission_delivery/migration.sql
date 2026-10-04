ALTER TABLE "np_form_engine_submissions"
  ADD COLUMN "idempotency_key" VARCHAR(191),
  ADD COLUMN "orchestration_result" JSONB;

CREATE UNIQUE INDEX "np_form_engine_submissions_form_id_idempotency_key_key"
  ON "np_form_engine_submissions"("form_id", "idempotency_key");

CREATE TABLE "np_leads" (
    "id" VARCHAR(30) NOT NULL,
    "source_submission_id" VARCHAR(80) NOT NULL,
    "source_form_id" VARCHAR(80) NOT NULL,
    "form_slug" VARCHAR(120),
    "data" JSONB NOT NULL,
    "status" VARCHAR(20) NOT NULL DEFAULT 'new',
    "version" INTEGER NOT NULL DEFAULT 1,
    "created_at" TIMESTAMP(3) NOT NULL DEFAULT CURRENT_TIMESTAMP,
    "updated_at" TIMESTAMP(3) NOT NULL,

    CONSTRAINT "np_leads_pkey" PRIMARY KEY ("id")
);

CREATE UNIQUE INDEX "np_leads_source_submission_id_key" ON "np_leads"("source_submission_id");
CREATE INDEX "np_leads_source_form_id_created_at_idx" ON "np_leads"("source_form_id", "created_at");
CREATE INDEX "np_leads_status_updated_at_idx" ON "np_leads"("status", "updated_at");

CREATE TABLE "np_lead_deliveries" (
    "id" VARCHAR(30) NOT NULL,
    "event_id" VARCHAR(80) NOT NULL,
    "target_id" VARCHAR(120) NOT NULL,
    "payload" JSONB NOT NULL,
    "status" VARCHAR(20) NOT NULL DEFAULT 'pending',
    "attempts" INTEGER NOT NULL DEFAULT 0,
    "next_attempt_at" TIMESTAMP(3) NOT NULL DEFAULT CURRENT_TIMESTAMP,
    "last_error" TEXT,
    "created_at" TIMESTAMP(3) NOT NULL DEFAULT CURRENT_TIMESTAMP,
    "updated_at" TIMESTAMP(3) NOT NULL,

    CONSTRAINT "np_lead_deliveries_pkey" PRIMARY KEY ("id")
);

CREATE UNIQUE INDEX "np_lead_deliveries_event_id_target_id_key"
  ON "np_lead_deliveries"("event_id", "target_id");
CREATE INDEX "np_lead_deliveries_status_next_attempt_at_idx"
  ON "np_lead_deliveries"("status", "next_attempt_at");

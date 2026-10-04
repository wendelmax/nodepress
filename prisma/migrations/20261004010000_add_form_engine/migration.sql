CREATE TABLE "np_form_definitions" (
    "id" VARCHAR(30) NOT NULL,
    "slug" VARCHAR(120) NOT NULL,
    "name" VARCHAR(180) NOT NULL,
    "status" VARCHAR(20) NOT NULL DEFAULT 'active',
    "fields" JSONB NOT NULL,
    "created_at" TIMESTAMP(3) NOT NULL DEFAULT CURRENT_TIMESTAMP,
    "updated_at" TIMESTAMP(3) NOT NULL,

    CONSTRAINT "np_form_definitions_pkey" PRIMARY KEY ("id")
);

CREATE TABLE "np_form_engine_submissions" (
    "id" VARCHAR(30) NOT NULL,
    "form_id" VARCHAR(30) NOT NULL,
    "payload" JSONB NOT NULL,
    "created_at" TIMESTAMP(3) NOT NULL DEFAULT CURRENT_TIMESTAMP,

    CONSTRAINT "np_form_engine_submissions_pkey" PRIMARY KEY ("id")
);

CREATE UNIQUE INDEX "np_form_definitions_slug_key" ON "np_form_definitions"("slug");
CREATE INDEX "np_form_definitions_status_idx" ON "np_form_definitions"("status");
CREATE INDEX "np_form_engine_submissions_form_id_created_at_idx" ON "np_form_engine_submissions"("form_id", "created_at");

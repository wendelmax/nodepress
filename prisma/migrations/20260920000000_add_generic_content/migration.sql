CREATE TABLE "np_content_types" (
    "id" VARCHAR(100) NOT NULL,
    "label" VARCHAR(180) NOT NULL,
    "version" VARCHAR(50) NOT NULL,
    "fields" JSONB NOT NULL,
    "created_at" TIMESTAMP(3) NOT NULL DEFAULT CURRENT_TIMESTAMP,
    "updated_at" TIMESTAMP(3) NOT NULL,
    CONSTRAINT "np_content_types_pkey" PRIMARY KEY ("id")
);

CREATE TABLE "np_content_records" (
    "id" VARCHAR(30) NOT NULL,
    "content_type" VARCHAR(100) NOT NULL,
    "tenant_id" VARCHAR(100),
    "title" VARCHAR(255) NOT NULL,
    "slug" VARCHAR(255) NOT NULL,
    "status" VARCHAR(20) NOT NULL DEFAULT 'draft',
    "data" JSONB NOT NULL,
    "created_at" TIMESTAMP(3) NOT NULL DEFAULT CURRENT_TIMESTAMP,
    "updated_at" TIMESTAMP(3) NOT NULL,
    CONSTRAINT "np_content_records_pkey" PRIMARY KEY ("id")
);

CREATE UNIQUE INDEX "np_content_records_content_type_tenant_id_slug_key"
ON "np_content_records"("content_type", "tenant_id", "slug");

CREATE INDEX "np_content_records_content_type_status_idx"
ON "np_content_records"("content_type", "status");

CREATE INDEX "np_content_records_tenant_id_idx"
ON "np_content_records"("tenant_id");

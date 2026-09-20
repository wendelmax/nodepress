CREATE TABLE "np_import_records" (
    "id" VARCHAR(30) NOT NULL,
    "source" VARCHAR(100) NOT NULL,
    "collection" VARCHAR(150) NOT NULL,
    "source_id" VARCHAR(255) NOT NULL,
    "target_id" VARCHAR(100) NOT NULL,
    "target_type" VARCHAR(100) NOT NULL,
    "slug" VARCHAR(255) NOT NULL,
    "imported_at" TIMESTAMP(3) NOT NULL DEFAULT CURRENT_TIMESTAMP,

    CONSTRAINT "np_import_records_pkey" PRIMARY KEY ("id")
);

CREATE UNIQUE INDEX "np_import_records_source_collection_source_id_key"
ON "np_import_records"("source", "collection", "source_id");

CREATE INDEX "np_import_records_target_type_target_id_idx"
ON "np_import_records"("target_type", "target_id");

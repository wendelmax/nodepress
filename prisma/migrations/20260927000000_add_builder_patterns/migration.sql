CREATE TABLE "np_builder_patterns" (
    "id" VARCHAR(30) NOT NULL,
    "slug" VARCHAR(120) NOT NULL,
    "name" VARCHAR(120) NOT NULL,
    "description" TEXT NOT NULL,
    "kind" VARCHAR(20) NOT NULL,
    "category" VARCHAR(80) NOT NULL,
    "tags" JSONB NOT NULL,
    "engine" VARCHAR(50) NOT NULL,
    "schema_version" INTEGER NOT NULL,
    "version" INTEGER NOT NULL DEFAULT 1,
    "document" JSONB NOT NULL,
    "archived_at" TIMESTAMP(3),
    "created_at" TIMESTAMP(3) NOT NULL DEFAULT CURRENT_TIMESTAMP,
    "updated_at" TIMESTAMP(3) NOT NULL,

    CONSTRAINT "np_builder_patterns_pkey" PRIMARY KEY ("id")
);

CREATE TABLE "np_builder_pattern_versions" (
    "id" VARCHAR(30) NOT NULL,
    "pattern_id" VARCHAR(30) NOT NULL,
    "version" INTEGER NOT NULL,
    "manifest" JSONB NOT NULL,
    "document" JSONB NOT NULL,
    "created_at" TIMESTAMP(3) NOT NULL DEFAULT CURRENT_TIMESTAMP,

    CONSTRAINT "np_builder_pattern_versions_pkey" PRIMARY KEY ("id")
);

CREATE UNIQUE INDEX "np_builder_patterns_slug_key" ON "np_builder_patterns"("slug");
CREATE INDEX "np_builder_patterns_kind_category_archived_at_idx" ON "np_builder_patterns"("kind", "category", "archived_at");
CREATE INDEX "np_builder_patterns_archived_at_idx" ON "np_builder_patterns"("archived_at");
CREATE UNIQUE INDEX "np_builder_pattern_versions_pattern_id_version_key" ON "np_builder_pattern_versions"("pattern_id", "version");
CREATE INDEX "np_builder_pattern_versions_pattern_id_version_idx" ON "np_builder_pattern_versions"("pattern_id", "version");

ALTER TABLE "np_builder_pattern_versions" ADD CONSTRAINT "np_builder_pattern_versions_pattern_id_fkey" FOREIGN KEY ("pattern_id") REFERENCES "np_builder_patterns"("id") ON DELETE CASCADE ON UPDATE CASCADE;

CREATE TABLE "np_search_documents" (
    "id" VARCHAR(30) NOT NULL,
    "source_key" VARCHAR(255) NOT NULL,
    "kind" VARCHAR(30) NOT NULL,
    "type" VARCHAR(100) NOT NULL,
    "source_id" VARCHAR(100) NOT NULL,
    "tenant_id" VARCHAR(100),
    "title" TEXT NOT NULL,
    "slug" VARCHAR(255) NOT NULL,
    "body" TEXT NOT NULL,
    "excerpt" TEXT NOT NULL,
    "url" VARCHAR(500) NOT NULL,
    "status" VARCHAR(20) NOT NULL,
    "author_id" INTEGER,
    "categories" JSONB NOT NULL,
    "tags" JSONB NOT NULL,
    "published_at" TIMESTAMP(3),
    "indexed_at" TIMESTAMP(3) NOT NULL DEFAULT CURRENT_TIMESTAMP,
    CONSTRAINT "np_search_documents_pkey" PRIMARY KEY ("id")
);

CREATE UNIQUE INDEX "np_search_documents_source_key_key"
ON "np_search_documents"("source_key");

CREATE INDEX "np_search_documents_tenant_id_idx"
ON "np_search_documents"("tenant_id");

CREATE INDEX "np_search_documents_kind_type_status_idx"
ON "np_search_documents"("kind", "type", "status");

CREATE INDEX "np_search_documents_source_id_idx"
ON "np_search_documents"("source_id");

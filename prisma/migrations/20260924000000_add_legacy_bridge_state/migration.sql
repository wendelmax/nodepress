CREATE TABLE "np_migration_runs" (
    "id" VARCHAR(30) NOT NULL,
    "run_id" VARCHAR(100) NOT NULL,
    "resource" VARCHAR(50) NOT NULL,
    "status" VARCHAR(20) NOT NULL,
    "watermark" TIMESTAMP(3),
    "imported" INTEGER NOT NULL DEFAULT 0,
    "created" INTEGER NOT NULL DEFAULT 0,
    "updated" INTEGER NOT NULL DEFAULT 0,
    "failed" INTEGER NOT NULL DEFAULT 0,
    "retried" INTEGER NOT NULL DEFAULT 0,
    "started_at" TIMESTAMP(3) NOT NULL DEFAULT CURRENT_TIMESTAMP,
    "finished_at" TIMESTAMP(3),
    CONSTRAINT "np_migration_runs_pkey" PRIMARY KEY ("id")
);

CREATE UNIQUE INDEX "np_migration_runs_run_id_key" ON "np_migration_runs"("run_id");
CREATE INDEX "np_migration_runs_resource_status_idx" ON "np_migration_runs"("resource", "status");

CREATE TABLE "np_migration_items" (
    "id" VARCHAR(30) NOT NULL,
    "run_id" VARCHAR(100) NOT NULL,
    "resource" VARCHAR(50) NOT NULL,
    "legacy_id" VARCHAR(255) NOT NULL,
    "nodepress_id" VARCHAR(100),
    "checksum" VARCHAR(128),
    "status" VARCHAR(20) NOT NULL,
    "error_code" VARCHAR(100),
    CONSTRAINT "np_migration_items_pkey" PRIMARY KEY ("id")
);

CREATE UNIQUE INDEX "np_migration_items_resource_legacy_id_key" ON "np_migration_items"("resource", "legacy_id");
CREATE INDEX "np_migration_items_run_id_status_idx" ON "np_migration_items"("run_id", "status");
ALTER TABLE "np_migration_items" ADD CONSTRAINT "np_migration_items_run_id_fkey" FOREIGN KEY ("run_id") REFERENCES "np_migration_runs"("run_id") ON DELETE CASCADE ON UPDATE CASCADE;

CREATE TABLE "np_cutover_domains" (
    "id" VARCHAR(30) NOT NULL,
    "domain" VARCHAR(100) NOT NULL,
    "state" VARCHAR(20) NOT NULL,
    "changed_at" TIMESTAMP(3) NOT NULL,
    "changed_by" VARCHAR(100),
    "reason" TEXT,
    CONSTRAINT "np_cutover_domains_pkey" PRIMARY KEY ("id")
);

CREATE UNIQUE INDEX "np_cutover_domains_domain_key" ON "np_cutover_domains"("domain");

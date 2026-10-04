CREATE TABLE "np_builder_targets" (
    "id" VARCHAR(30) NOT NULL,
    "target_type" VARCHAR(20) NOT NULL,
    "target_key" VARCHAR(191) NOT NULL,
    "document" JSONB NOT NULL,
    "version" INTEGER NOT NULL DEFAULT 0,
    "updated_by_id" INTEGER,
    "created_at" TIMESTAMP(3) NOT NULL DEFAULT CURRENT_TIMESTAMP,
    "updated_at" TIMESTAMP(3) NOT NULL,

    CONSTRAINT "np_builder_targets_pkey" PRIMARY KEY ("id")
);

CREATE UNIQUE INDEX "np_builder_targets_target_type_target_key_key"
  ON "np_builder_targets"("target_type", "target_key");
CREATE INDEX "np_builder_targets_target_type_target_key_idx"
  ON "np_builder_targets"("target_type", "target_key");

CREATE TABLE "np_builder_revisions" (
    "id" VARCHAR(30) NOT NULL,
    "target_id" VARCHAR(30) NOT NULL,
    "version" INTEGER NOT NULL,
    "document" JSONB NOT NULL,
    "created_by_id" INTEGER NOT NULL,
    "note" TEXT,
    "restored_from_revision_id" VARCHAR(30),
    "created_at" TIMESTAMP(3) NOT NULL DEFAULT CURRENT_TIMESTAMP,

    CONSTRAINT "np_builder_revisions_pkey" PRIMARY KEY ("id")
);

CREATE UNIQUE INDEX "np_builder_revisions_target_id_version_key"
  ON "np_builder_revisions"("target_id", "version");
CREATE INDEX "np_builder_revisions_target_id_created_at_idx"
  ON "np_builder_revisions"("target_id", "created_at");
ALTER TABLE "np_builder_revisions"
  ADD CONSTRAINT "np_builder_revisions_target_id_fkey"
  FOREIGN KEY ("target_id") REFERENCES "np_builder_targets"("id") ON DELETE CASCADE ON UPDATE CASCADE;

CREATE TABLE "np_builder_comments" (
    "id" VARCHAR(30) NOT NULL,
    "target_id" VARCHAR(30) NOT NULL,
    "revision_id" VARCHAR(30),
    "anchor" VARCHAR(255),
    "body" TEXT NOT NULL,
    "status" VARCHAR(20) NOT NULL DEFAULT 'open',
    "created_by_id" INTEGER NOT NULL,
    "resolved_by_id" INTEGER,
    "created_at" TIMESTAMP(3) NOT NULL DEFAULT CURRENT_TIMESTAMP,
    "updated_at" TIMESTAMP(3) NOT NULL,
    "resolved_at" TIMESTAMP(3),

    CONSTRAINT "np_builder_comments_pkey" PRIMARY KEY ("id")
);

CREATE INDEX "np_builder_comments_target_id_status_created_at_idx"
  ON "np_builder_comments"("target_id", "status", "created_at");
CREATE INDEX "np_builder_comments_revision_id_idx"
  ON "np_builder_comments"("revision_id");
ALTER TABLE "np_builder_comments"
  ADD CONSTRAINT "np_builder_comments_target_id_fkey"
  FOREIGN KEY ("target_id") REFERENCES "np_builder_targets"("id") ON DELETE CASCADE ON UPDATE CASCADE;
ALTER TABLE "np_builder_comments"
  ADD CONSTRAINT "np_builder_comments_revision_id_fkey"
  FOREIGN KEY ("revision_id") REFERENCES "np_builder_revisions"("id") ON DELETE SET NULL ON UPDATE CASCADE;

CREATE TABLE "np_builder_audit_events" (
    "id" VARCHAR(30) NOT NULL,
    "target_id" VARCHAR(30),
    "action" VARCHAR(80) NOT NULL,
    "actor_id" INTEGER,
    "from_version" INTEGER,
    "to_version" INTEGER,
    "revision_id" VARCHAR(30),
    "comment_id" VARCHAR(30),
    "request_id" VARCHAR(100) NOT NULL,
    "metadata" JSONB NOT NULL,
    "created_at" TIMESTAMP(3) NOT NULL DEFAULT CURRENT_TIMESTAMP,

    CONSTRAINT "np_builder_audit_events_pkey" PRIMARY KEY ("id")
);

CREATE INDEX "np_builder_audit_events_target_id_created_at_idx"
  ON "np_builder_audit_events"("target_id", "created_at");
CREATE INDEX "np_builder_audit_events_action_created_at_idx"
  ON "np_builder_audit_events"("action", "created_at");
ALTER TABLE "np_builder_audit_events"
  ADD CONSTRAINT "np_builder_audit_events_target_id_fkey"
  FOREIGN KEY ("target_id") REFERENCES "np_builder_targets"("id") ON DELETE SET NULL ON UPDATE CASCADE;

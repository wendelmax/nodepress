CREATE TABLE "np_plugin_migrations" (
    "id" SERIAL NOT NULL,
    "plugin_id" VARCHAR(100) NOT NULL,
    "migration_id" VARCHAR(150) NOT NULL,
    "checksum" VARCHAR(128) NOT NULL,
    "plugin_version" VARCHAR(50) NOT NULL,
    "applied_at" TIMESTAMP(3) NOT NULL DEFAULT CURRENT_TIMESTAMP,

    CONSTRAINT "np_plugin_migrations_pkey" PRIMARY KEY ("id")
);

CREATE UNIQUE INDEX "np_plugin_migrations_plugin_id_migration_id_key"
    ON "np_plugin_migrations"("plugin_id", "migration_id");

CREATE INDEX "np_plugin_migrations_plugin_id_idx"
    ON "np_plugin_migrations"("plugin_id");

CREATE TABLE "np_plugin_storage" (
    "id" SERIAL NOT NULL,
    "plugin_id" VARCHAR(100) NOT NULL,
    "storage_key" VARCHAR(191) NOT NULL,
    "value" JSONB NOT NULL,
    "created_at" TIMESTAMP(3) NOT NULL DEFAULT CURRENT_TIMESTAMP,
    "updated_at" TIMESTAMP(3) NOT NULL,

    CONSTRAINT "np_plugin_storage_pkey" PRIMARY KEY ("id")
);

CREATE UNIQUE INDEX "np_plugin_storage_plugin_id_storage_key_key"
  ON "np_plugin_storage"("plugin_id", "storage_key");

CREATE INDEX "np_plugin_storage_plugin_id_idx"
  ON "np_plugin_storage"("plugin_id");

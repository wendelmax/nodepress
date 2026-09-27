CREATE TABLE "np_theme_templates" (
    "id" VARCHAR(30) NOT NULL,
    "slug" VARCHAR(120) NOT NULL,
    "theme_slug" VARCHAR(80) NOT NULL,
    "area" VARCHAR(20) NOT NULL,
    "name" VARCHAR(120) NOT NULL,
    "conditions" JSONB NOT NULL,
    "priority" INTEGER NOT NULL DEFAULT 0,
    "enabled" BOOLEAN NOT NULL DEFAULT false,
    "version" INTEGER NOT NULL DEFAULT 1,
    "document" JSONB NOT NULL,
    "created_at" TIMESTAMP(3) NOT NULL DEFAULT CURRENT_TIMESTAMP,
    "updated_at" TIMESTAMP(3) NOT NULL,

    CONSTRAINT "np_theme_templates_pkey" PRIMARY KEY ("id")
);

CREATE TABLE "np_theme_template_versions" (
    "id" VARCHAR(30) NOT NULL,
    "template_id" VARCHAR(30) NOT NULL,
    "version" INTEGER NOT NULL,
    "document" JSONB NOT NULL,
    "created_at" TIMESTAMP(3) NOT NULL DEFAULT CURRENT_TIMESTAMP,

    CONSTRAINT "np_theme_template_versions_pkey" PRIMARY KEY ("id")
);

CREATE UNIQUE INDEX "np_theme_templates_theme_slug_slug_key" ON "np_theme_templates"("theme_slug", "slug");
CREATE INDEX "np_theme_templates_theme_slug_area_enabled_idx" ON "np_theme_templates"("theme_slug", "area", "enabled");
CREATE UNIQUE INDEX "np_theme_template_versions_template_id_version_key" ON "np_theme_template_versions"("template_id", "version");
CREATE INDEX "np_theme_template_versions_template_id_version_idx" ON "np_theme_template_versions"("template_id", "version");

ALTER TABLE "np_theme_template_versions" ADD CONSTRAINT "np_theme_template_versions_template_id_fkey" FOREIGN KEY ("template_id") REFERENCES "np_theme_templates"("id") ON DELETE CASCADE ON UPDATE CASCADE;

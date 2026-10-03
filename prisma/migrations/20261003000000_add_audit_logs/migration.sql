CREATE TABLE "np_audit_logs" (
    "id" SERIAL NOT NULL,
    "actor_user_id" INTEGER,
    "tenant_id" VARCHAR(100),
    "action" VARCHAR(120) NOT NULL,
    "resource_type" VARCHAR(80) NOT NULL,
    "resource_id" VARCHAR(120),
    "success" BOOLEAN NOT NULL DEFAULT true,
    "correlation_id" VARCHAR(128),
    "ip_summary" VARCHAR(80),
    "metadata" JSONB,
    "occurred_at" TIMESTAMP(3) NOT NULL DEFAULT CURRENT_TIMESTAMP,
    "created_at" TIMESTAMP(3) NOT NULL DEFAULT CURRENT_TIMESTAMP,

    CONSTRAINT "np_audit_logs_pkey" PRIMARY KEY ("id")
);

CREATE INDEX "np_audit_logs_occurred_at_id_idx" ON "np_audit_logs"("occurred_at", "id");
CREATE INDEX "np_audit_logs_action_idx" ON "np_audit_logs"("action");
CREATE INDEX "np_audit_logs_resource_type_resource_id_idx" ON "np_audit_logs"("resource_type", "resource_id");
CREATE INDEX "np_audit_logs_actor_user_id_idx" ON "np_audit_logs"("actor_user_id");
CREATE INDEX "np_audit_logs_tenant_id_idx" ON "np_audit_logs"("tenant_id");
CREATE INDEX "np_audit_logs_success_idx" ON "np_audit_logs"("success");

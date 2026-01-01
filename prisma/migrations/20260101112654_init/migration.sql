-- CreateExtension
CREATE EXTENSION IF NOT EXISTS "postgis";

-- CreateTable
CREATE TABLE "users" (
    "id" TEXT NOT NULL,
    "role" TEXT NOT NULL DEFAULT 'USER',
    "full_name" TEXT NOT NULL,
    "email" TEXT NOT NULL,
    "password_hash" TEXT NOT NULL,
    "is_active" BOOLEAN NOT NULL DEFAULT true,
    "home_lat" DOUBLE PRECISION NOT NULL,
    "home_lng" DOUBLE PRECISION NOT NULL,
    "home_point" geography(Point, 4326),
    "kelurahan" TEXT,
    "kecamatan" TEXT,
    "kota" TEXT,
    "provinsi" TEXT,
    "last_login_at" TIMESTAMPTZ,
    "created_at" TIMESTAMPTZ NOT NULL DEFAULT CURRENT_TIMESTAMP,
    "updated_at" TIMESTAMPTZ NOT NULL,
    "deleted_at" TIMESTAMPTZ,

    CONSTRAINT "users_pkey" PRIMARY KEY ("id")
);

-- CreateTable
CREATE TABLE "disaster_categories" (
    "id" TEXT NOT NULL,
    "code" TEXT NOT NULL,
    "name" TEXT NOT NULL,
    "description" TEXT,
    "is_active" BOOLEAN NOT NULL DEFAULT true,
    "created_at" TIMESTAMPTZ NOT NULL DEFAULT CURRENT_TIMESTAMP,
    "updated_at" TIMESTAMPTZ NOT NULL,
    "deleted_at" TIMESTAMPTZ,

    CONSTRAINT "disaster_categories_pkey" PRIMARY KEY ("id")
);

-- CreateTable
CREATE TABLE "disaster_events" (
    "id" TEXT NOT NULL,
    "category_id" TEXT NOT NULL,
    "title" TEXT NOT NULL,
    "description" TEXT NOT NULL,
    "event_time" TIMESTAMPTZ NOT NULL,
    "published_at" TIMESTAMPTZ,
    "status" TEXT NOT NULL DEFAULT 'DRAFT',
    "location_lat" DOUBLE PRECISION NOT NULL,
    "location_lng" DOUBLE PRECISION NOT NULL,
    "location_point" geography(Point, 4326),
    "kelurahan" TEXT,
    "kecamatan" TEXT,
    "kota" TEXT,
    "danger_radius_m" INTEGER NOT NULL DEFAULT 2000,
    "warning_radius_m" INTEGER NOT NULL DEFAULT 10000,
    "created_by" TEXT NOT NULL,
    "created_at" TIMESTAMPTZ NOT NULL DEFAULT CURRENT_TIMESTAMP,
    "updated_at" TIMESTAMPTZ NOT NULL,
    "deleted_at" TIMESTAMPTZ,

    CONSTRAINT "disaster_events_pkey" PRIMARY KEY ("id")
);

-- CreateTable
CREATE TABLE "user_notifications" (
    "id" TEXT NOT NULL,
    "user_id" TEXT NOT NULL,
    "event_id" TEXT NOT NULL,
    "priority" TEXT NOT NULL,
    "distance_m" INTEGER NOT NULL,
    "channel" TEXT NOT NULL DEFAULT 'IN_APP',
    "email_status" TEXT NOT NULL DEFAULT 'PENDING',
    "email_sent_at" TIMESTAMPTZ,
    "read_at" TIMESTAMPTZ,
    "error_message" TEXT,
    "created_at" TIMESTAMPTZ NOT NULL DEFAULT CURRENT_TIMESTAMP,
    "updated_at" TIMESTAMPTZ NOT NULL,
    "deleted_at" TIMESTAMPTZ,

    CONSTRAINT "user_notifications_pkey" PRIMARY KEY ("id")
);

-- CreateTable
CREATE TABLE "audit_logs" (
    "id" TEXT NOT NULL,
    "actor_id" TEXT,
    "action" TEXT NOT NULL,
    "entity_type" TEXT NOT NULL,
    "entity_id" TEXT,
    "metadata" JSONB,
    "created_at" TIMESTAMPTZ NOT NULL DEFAULT CURRENT_TIMESTAMP,
    "updated_at" TIMESTAMPTZ NOT NULL,
    "deleted_at" TIMESTAMPTZ,

    CONSTRAINT "audit_logs_pkey" PRIMARY KEY ("id")
);

-- CreateIndex
CREATE INDEX "users_kelurahan_idx" ON "users"("kelurahan");

-- CreateIndex
CREATE INDEX "users_role_is_active_idx" ON "users"("role", "is_active");

-- CreateIndex
CREATE UNIQUE INDEX "users_email_deleted_at_key" ON "users"("email", "deleted_at");

-- CreateIndex
CREATE INDEX "disaster_categories_is_active_idx" ON "disaster_categories"("is_active");

-- CreateIndex
CREATE UNIQUE INDEX "disaster_categories_code_deleted_at_key" ON "disaster_categories"("code", "deleted_at");

-- CreateIndex
CREATE INDEX "disaster_events_category_id_idx" ON "disaster_events"("category_id");

-- CreateIndex
CREATE INDEX "disaster_events_status_idx" ON "disaster_events"("status");

-- CreateIndex
CREATE INDEX "disaster_events_event_time_idx" ON "disaster_events"("event_time");

-- CreateIndex
CREATE INDEX "disaster_events_kelurahan_idx" ON "disaster_events"("kelurahan");

-- CreateIndex
CREATE INDEX "user_notifications_user_id_read_at_idx" ON "user_notifications"("user_id", "read_at");

-- CreateIndex
CREATE INDEX "user_notifications_event_id_idx" ON "user_notifications"("event_id");

-- CreateIndex
CREATE UNIQUE INDEX "user_notifications_user_id_event_id_deleted_at_key" ON "user_notifications"("user_id", "event_id", "deleted_at");

-- CreateIndex
CREATE INDEX "audit_logs_actor_id_idx" ON "audit_logs"("actor_id");

-- CreateIndex
CREATE INDEX "audit_logs_action_idx" ON "audit_logs"("action");

-- CreateIndex
CREATE INDEX "audit_logs_entity_type_entity_id_idx" ON "audit_logs"("entity_type", "entity_id");

-- AddForeignKey
ALTER TABLE "disaster_events" ADD CONSTRAINT "disaster_events_category_id_fkey" FOREIGN KEY ("category_id") REFERENCES "disaster_categories"("id") ON DELETE RESTRICT ON UPDATE CASCADE;

-- AddForeignKey
ALTER TABLE "disaster_events" ADD CONSTRAINT "disaster_events_created_by_fkey" FOREIGN KEY ("created_by") REFERENCES "users"("id") ON DELETE RESTRICT ON UPDATE CASCADE;

-- AddForeignKey
ALTER TABLE "user_notifications" ADD CONSTRAINT "user_notifications_user_id_fkey" FOREIGN KEY ("user_id") REFERENCES "users"("id") ON DELETE RESTRICT ON UPDATE CASCADE;

-- AddForeignKey
ALTER TABLE "user_notifications" ADD CONSTRAINT "user_notifications_event_id_fkey" FOREIGN KEY ("event_id") REFERENCES "disaster_events"("id") ON DELETE RESTRICT ON UPDATE CASCADE;

-- AddForeignKey
ALTER TABLE "audit_logs" ADD CONSTRAINT "audit_logs_actor_id_fkey" FOREIGN KEY ("actor_id") REFERENCES "users"("id") ON DELETE SET NULL ON UPDATE CASCADE;

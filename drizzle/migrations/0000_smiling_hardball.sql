CREATE TYPE "public"."capture_mode" AS ENUM('on_site', 'off_site');--> statement-breakpoint
CREATE TYPE "public"."capture_method" AS ENUM('app', 'map', 'survey', 'web_import');--> statement-breakpoint
CREATE TYPE "public"."capture_status" AS ENUM('complete', 'partial', 'incomplete');--> statement-breakpoint
CREATE TYPE "public"."coordinate_type" AS ENUM('gps', 'manual', 'estimated');--> statement-breakpoint
CREATE TYPE "public"."image_type" AS ENUM('before', 'during', 'after', 'detail', 'overview', 'progress', 'aerial', 'ground', 'record');--> statement-breakpoint
CREATE TYPE "public"."intervention_discriminator" AS ENUM('plot', 'intervention');--> statement-breakpoint
CREATE TYPE "public"."intervention_status" AS ENUM('planned', 'active', 'completed', 'failed', 'on_hold', 'cancelled');--> statement-breakpoint
CREATE TYPE "public"."intervention_type" AS ENUM('assisting-seed-rain', 'control-livestock', 'direct-seeding', 'enrichment-planting', 'fencing', 'fire-patrol', 'fire-suppression', 'firebreaks', 'generic-tree-registration', 'grass-suppression', 'liberating-regenerant', 'maintenance', 'marking-regenerant', 'multi-tree-registration', 'other-intervention', 'plot-plant-registration', 'removal-invasive-species', 'sample-tree-registration', 'single-tree-registration', 'soil-improvement', 'stop-tree-harvesting');--> statement-breakpoint
CREATE TYPE "public"."invite_status" AS ENUM('pending', 'accepted', 'declined', 'expired', 'discarded');--> statement-breakpoint
CREATE TYPE "public"."project_role" AS ENUM('owner', 'admin', 'manager', 'contributor', 'observer', 'researcher');--> statement-breakpoint
CREATE TYPE "public"."record_type" AS ENUM('planting', 'measurement', 'status_change', 'inspection', 'maintenance', 'death', 'removal', 'health_assessment', 'growth_monitoring');--> statement-breakpoint
CREATE TYPE "public"."site_status" AS ENUM('planted', 'planting', 'barren', 'reforestation');--> statement-breakpoint
CREATE TYPE "public"."species_request_status" AS ENUM('pending', 'approved', 'rejected');--> statement-breakpoint
CREATE TYPE "public"."tree_status" AS ENUM('alive', 'dead', 'unknown', 'removed');--> statement-breakpoint
CREATE TYPE "public"."tree_enum" AS ENUM('single', 'sample');--> statement-breakpoint
CREATE TYPE "public"."user_type" AS ENUM('individual', 'education', 'tpo', 'organization', 'student');--> statement-breakpoint
CREATE TABLE "audit_logs" (
	"id" serial PRIMARY KEY NOT NULL,
	"table_name" varchar(100) NOT NULL,
	"record_uid" varchar(50) NOT NULL,
	"operation" varchar(10) NOT NULL,
	"old_values" jsonb,
	"new_values" jsonb,
	"changed_by" integer,
	"changed_at" timestamp DEFAULT now() NOT NULL,
	"ip_address" varchar(45),
	"user_agent" text,
	"metadata" jsonb
);
--> statement-breakpoint
CREATE TABLE "intervention_images" (
	"id" serial PRIMARY KEY NOT NULL,
	"uid" varchar(50) NOT NULL,
	"intervention_id" integer NOT NULL,
	"filename" varchar(255) NOT NULL,
	"original_name" varchar(255),
	"mime_type" varchar(50),
	"size" bigint,
	"width" integer,
	"height" integer,
	"image_type" "image_type" DEFAULT 'detail' NOT NULL,
	"is_primary" boolean DEFAULT false,
	"is_private" boolean DEFAULT false,
	"caption" text,
	"created_at" timestamp with time zone DEFAULT now() NOT NULL,
	"updated_at" timestamp with time zone DEFAULT now() NOT NULL,
	"deleted_at" timestamp with time zone,
	CONSTRAINT "intervention_images_uid_unique" UNIQUE("uid")
);
--> statement-breakpoint
CREATE TABLE "intervention_records" (
	"id" serial PRIMARY KEY NOT NULL,
	"uid" varchar(50) NOT NULL,
	"intervention_id" integer NOT NULL,
	"recorded_by_id" integer NOT NULL,
	"record_type" "record_type" NOT NULL,
	"recorded_at" timestamp with time zone DEFAULT now() NOT NULL,
	"image" text,
	"height" double precision,
	"width" double precision,
	"health_score" integer,
	"vitality_score" integer,
	"structural_integrity" varchar(50),
	"previous_status" "tree_status",
	"new_status" "tree_status",
	"status_reason" varchar(100),
	"findings" text,
	"findings_severity" varchar(50),
	"findings_comments" text,
	"notes" text,
	"weather_conditions" jsonb,
	"soil_conditions" jsonb,
	"surrounding_vegetation" text,
	"pests_observed" jsonb,
	"diseases_observed" jsonb,
	"damage_observed" jsonb,
	"growth_rate" numeric(6, 3),
	"leaf_density" varchar(50),
	"fruiting_status" varchar(50),
	"recommended_actions" jsonb,
	"priority_level" varchar(20),
	"is_public" boolean DEFAULT true NOT NULL,
	"device_location" jsonb,
	"metadata" jsonb,
	"created_at" timestamp with time zone DEFAULT now() NOT NULL,
	"updated_at" timestamp with time zone DEFAULT now() NOT NULL,
	"deleted_at" timestamp with time zone,
	CONSTRAINT "intervention_records_uid_unique" UNIQUE("uid")
);
--> statement-breakpoint
CREATE TABLE "interventions" (
	"id" serial PRIMARY KEY NOT NULL,
	"uid" varchar(50) NOT NULL,
	"hid" varchar(16) NOT NULL,
	"discr" "intervention_discriminator" DEFAULT 'intervention' NOT NULL,
	"user_id" integer NOT NULL,
	"project_id" integer,
	"project_site_id" integer,
	"parent_intervention_id" integer,
	"parent_id" varchar,
	"type" "intervention_type" NOT NULL,
	"idempotency_key" varchar(64) NOT NULL,
	"capture_mode" "capture_mode" NOT NULL,
	"capture_status" "capture_status" DEFAULT 'complete' NOT NULL,
	"registration_date" timestamp with time zone NOT NULL,
	"intervention_start_date" timestamp with time zone NOT NULL,
	"intervention_end_date" timestamp with time zone NOT NULL,
	"location" geometry(Geometry,4326) NOT NULL,
	"original_geometry" jsonb NOT NULL,
	"geometry_type" varchar(50),
	"device_location" jsonb,
	"trees_planted" integer,
	"sample_tree_count" integer DEFAULT 0,
	"intervention_status" "intervention_status" DEFAULT 'active',
	"description" varchar(2048),
	"image" text,
	"is_private" boolean DEFAULT false NOT NULL,
	"metadata" jsonb,
	"scientific_species_id" integer,
	"custom_species_name" varchar(255),
	"created_at" timestamp with time zone DEFAULT now() NOT NULL,
	"updated_at" timestamp with time zone DEFAULT now() NOT NULL,
	"deleted_at" timestamp with time zone,
	"planet_record" boolean DEFAULT false,
	"tag" varchar(100),
	"height" double precision,
	"width" double precision,
	"status" "tree_status" DEFAULT 'alive' NOT NULL,
	"status_reason" varchar(100),
	"status_changed_at" timestamp with time zone,
	"last_measurement_date" timestamp with time zone,
	"next_measurement_date" timestamp with time zone,
	"latitude" double precision,
	"longitude" double precision,
	"altitude" numeric(8, 2),
	"accuracy" numeric(6, 2),
	"planting_date" timestamp with time zone,
	"has_records" boolean DEFAULT false NOT NULL,
	"planted_species" jsonb DEFAULT '[]'::jsonb,
	CONSTRAINT "interventions_uid_unique" UNIQUE("uid"),
	CONSTRAINT "interventions_hid_unique" UNIQUE("hid"),
	CONSTRAINT "interventions_idempotency_key_unique" UNIQUE("idempotency_key")
);
--> statement-breakpoint
CREATE TABLE "migration_logs" (
	"id" serial PRIMARY KEY NOT NULL,
	"user_migration_id" integer,
	"uid" varchar(50) NOT NULL,
	"level" varchar(20) NOT NULL,
	"message" text NOT NULL,
	"entity" varchar(50),
	"entity_id" varchar(255),
	"context" jsonb,
	"stack_trace" text,
	"created_at" timestamp DEFAULT now()
);
--> statement-breakpoint
CREATE TABLE "notifications" (
	"id" serial PRIMARY KEY NOT NULL,
	"uid" varchar(50) NOT NULL,
	"user_id" integer NOT NULL,
	"type" varchar(50) NOT NULL,
	"title" varchar(255) NOT NULL,
	"message" text NOT NULL,
	"related_entity_type" varchar(50),
	"related_entity_id" integer,
	"priority" varchar(20) DEFAULT 'normal',
	"category" varchar(50),
	"is_read" boolean DEFAULT false NOT NULL,
	"is_archived" boolean DEFAULT false NOT NULL,
	"action_url" text,
	"action_text" varchar(100),
	"scheduled_for" timestamp,
	"expires_at" timestamp,
	"delivery_method" varchar(50) DEFAULT 'in_app',
	"sent_at" timestamp,
	"delivered_at" timestamp,
	"created_at" timestamp DEFAULT now() NOT NULL,
	"updated_at" timestamp DEFAULT now() NOT NULL,
	CONSTRAINT "notifications_uid_unique" UNIQUE("uid")
);
--> statement-breakpoint
CREATE TABLE "project_invites" (
	"id" serial PRIMARY KEY NOT NULL,
	"uid" varchar(50) NOT NULL,
	"project_id" integer NOT NULL,
	"email" varchar(320) NOT NULL,
	"message" varchar(400),
	"role" "project_role" DEFAULT 'contributor' NOT NULL,
	"invited_by_id" integer NOT NULL,
	"status" "invite_status" DEFAULT 'pending' NOT NULL,
	"token" uuid DEFAULT gen_random_uuid() NOT NULL,
	"expires_at" timestamp with time zone NOT NULL,
	"accepted_at" timestamp with time zone,
	"created_at" timestamp with time zone DEFAULT now() NOT NULL,
	"updated_at" timestamp with time zone DEFAULT now() NOT NULL,
	CONSTRAINT "project_invites_uid_unique" UNIQUE("uid"),
	CONSTRAINT "project_invites_token_unique" UNIQUE("token"),
	CONSTRAINT "project_invites_token" UNIQUE("token")
);
--> statement-breakpoint
CREATE TABLE "project_members" (
	"id" serial PRIMARY KEY NOT NULL,
	"uid" varchar(50) NOT NULL,
	"project_id" integer NOT NULL,
	"user_id" integer NOT NULL,
	"role" "project_role" DEFAULT 'contributor' NOT NULL,
	"invited_at" timestamp with time zone,
	"joined_at" timestamp with time zone DEFAULT now(),
	"created_at" timestamp with time zone DEFAULT now() NOT NULL,
	"updated_at" timestamp with time zone DEFAULT now() NOT NULL,
	CONSTRAINT "project_members_uid_unique" UNIQUE("uid"),
	CONSTRAINT "unique_project_member" UNIQUE("project_id","user_id")
);
--> statement-breakpoint
CREATE TABLE "project_species" (
	"id" serial PRIMARY KEY NOT NULL,
	"uid" varchar(50) NOT NULL,
	"scientific_species_id" integer NOT NULL,
	"is_native_species" boolean DEFAULT false,
	"is_disabled" boolean DEFAULT false,
	"project_id" integer NOT NULL,
	"added_by_id" integer NOT NULL,
	"aliases" varchar(255),
	"local_name" varchar(255),
	"image" text,
	"description" text,
	"notes" text,
	"favourite" boolean DEFAULT false NOT NULL,
	"created_at" timestamp with time zone DEFAULT now() NOT NULL,
	"updated_at" timestamp with time zone DEFAULT now() NOT NULL,
	"deleted_at" timestamp with time zone,
	"metadata" jsonb,
	CONSTRAINT "project_species_uid_unique" UNIQUE("uid")
);
--> statement-breakpoint
CREATE TABLE "projects" (
	"id" serial PRIMARY KEY NOT NULL,
	"uid" varchar(50) NOT NULL,
	"created_by_id" integer NOT NULL,
	"slug" varchar(400) NOT NULL,
	"purpose" varchar(100),
	"project_name" varchar(255) NOT NULL,
	"project_type" varchar(100),
	"ecosystem" varchar(100),
	"project_scale" varchar(100),
	"target" integer,
	"project_website" text,
	"description" text,
	"classification" varchar(100),
	"image" text,
	"video_url" text,
	"country" varchar(2),
	"location" geometry(Geometry,4326),
	"original_geometry" jsonb,
	"geometry_type" varchar(50),
	"url" text,
	"link_text" varchar(100),
	"is_active" boolean DEFAULT true NOT NULL,
	"is_public" boolean DEFAULT true NOT NULL,
	"is_primary" boolean DEFAULT false NOT NULL,
	"is_personal" boolean DEFAULT false NOT NULL,
	"intensity" varchar(100),
	"revision_periodicity_level" varchar(100),
	"metadata" jsonb,
	"created_at" timestamp with time zone DEFAULT now() NOT NULL,
	"updated_at" timestamp with time zone DEFAULT now() NOT NULL,
	"deleted_at" timestamp with time zone,
	"planet_record" boolean DEFAULT false,
	CONSTRAINT "projects_uid_unique" UNIQUE("uid"),
	CONSTRAINT "projects_slug_unique" UNIQUE("slug")
);
--> statement-breakpoint
CREATE TABLE "scientific_species" (
	"id" serial PRIMARY KEY NOT NULL,
	"uid" varchar(50) NOT NULL,
	"scientific_name" varchar(255) NOT NULL,
	"common_name" varchar(400),
	"description" text,
	"image" text,
	"gbif_id" varchar(100),
	"created_at" timestamp with time zone DEFAULT now() NOT NULL,
	"updated_at" timestamp with time zone DEFAULT now() NOT NULL,
	"deleted_at" timestamp with time zone,
	"metadata" jsonb,
	CONSTRAINT "scientific_species_uid_unique" UNIQUE("uid"),
	CONSTRAINT "scientific_species_scientific_name_unique" UNIQUE("scientific_name")
);
--> statement-breakpoint
CREATE TABLE "site_images" (
	"id" serial PRIMARY KEY NOT NULL,
	"uid" varchar(50) NOT NULL,
	"site_id" integer NOT NULL,
	"filename" varchar(255) NOT NULL,
	"original_name" varchar(255),
	"mime_type" varchar(50),
	"size" bigint,
	"width" integer,
	"height" integer,
	"is_primary" boolean DEFAULT false,
	"caption" text,
	"is_private" boolean DEFAULT false,
	"created_at" timestamp with time zone DEFAULT now() NOT NULL,
	"updated_at" timestamp with time zone DEFAULT now() NOT NULL,
	"deleted_at" timestamp with time zone,
	CONSTRAINT "site_images_uid_unique" UNIQUE("uid")
);
--> statement-breakpoint
CREATE TABLE "sites" (
	"id" serial PRIMARY KEY NOT NULL,
	"uid" varchar(50) NOT NULL,
	"project_id" integer NOT NULL,
	"name" varchar(255) NOT NULL,
	"description" text,
	"location" geometry(Geometry,4326),
	"original_geometry" jsonb,
	"status" "site_status" DEFAULT 'barren',
	"created_by_id" integer NOT NULL,
	"created_at" timestamp with time zone DEFAULT now() NOT NULL,
	"updated_at" timestamp with time zone DEFAULT now() NOT NULL,
	"deleted_at" timestamp with time zone,
	"metadata" jsonb,
	"planet_record" boolean DEFAULT false,
	CONSTRAINT "sites_uid_unique" UNIQUE("uid")
);
--> statement-breakpoint
CREATE TABLE "species_images" (
	"id" serial PRIMARY KEY NOT NULL,
	"uid" varchar(50) NOT NULL,
	"species_id" integer NOT NULL,
	"filename" varchar(255) NOT NULL,
	"original_name" varchar(255),
	"mime_type" varchar(50),
	"size" bigint,
	"width" integer,
	"height" integer,
	"is_primary" boolean DEFAULT false,
	"is_private" boolean DEFAULT false,
	"created_at" timestamp with time zone DEFAULT now() NOT NULL,
	"updated_at" timestamp with time zone DEFAULT now() NOT NULL,
	CONSTRAINT "species_images_uid_unique" UNIQUE("uid")
);
--> statement-breakpoint
CREATE TABLE "species_requests" (
	"id" serial PRIMARY KEY NOT NULL,
	"uid" varchar(50) NOT NULL,
	"scientific_name" varchar(255) NOT NULL,
	"common_name" varchar(400),
	"description" text,
	"request_reason" text,
	"gbif_id" varchar(100),
	"requested_by_id" integer NOT NULL,
	"project_id" integer,
	"status" "species_request_status" DEFAULT 'pending' NOT NULL,
	"reviewed_by_id" integer,
	"admin_notes" text,
	"reviewed_at" timestamp with time zone,
	"created_at" timestamp with time zone DEFAULT now() NOT NULL,
	"updated_at" timestamp with time zone DEFAULT now() NOT NULL,
	"deleted_at" timestamp with time zone,
	CONSTRAINT "species_requests_uid_unique" UNIQUE("uid")
);
--> statement-breakpoint
CREATE TABLE "user_migrations" (
	"id" serial PRIMARY KEY NOT NULL,
	"uid" varchar(50) NOT NULL,
	"user_id" integer NOT NULL,
	"planet_id" varchar(50) NOT NULL,
	"status" varchar(50) DEFAULT 'in_progress' NOT NULL,
	"migrated_entities" jsonb DEFAULT '{"user":false,"projects":false,"sites":false,"species":false,"interventions":false,"images":false}'::jsonb,
	"migration_started_at" timestamp,
	"migration_completed_at" timestamp,
	"last_updated_at" timestamp,
	"email" varchar(320) NOT NULL,
	"error_message" text,
	"retry_count" integer DEFAULT 0,
	"migration_version" varchar(50) DEFAULT '1.0',
	"metadata" jsonb,
	"created_at" timestamp DEFAULT now(),
	"updated_at" timestamp DEFAULT now(),
	CONSTRAINT "user_migrations_uid_unique" UNIQUE("uid"),
	CONSTRAINT "user_migrations_planet_id_unique" UNIQUE("planet_id")
);
--> statement-breakpoint
CREATE TABLE "users" (
	"id" serial PRIMARY KEY NOT NULL,
	"uid" varchar(50) NOT NULL,
	"auth0_id" varchar(500) NOT NULL,
	"email" varchar(320) NOT NULL,
	"auth_name" varchar(255) NOT NULL,
	"firstname" varchar(255),
	"lastname" varchar(255),
	"display_name" varchar(400),
	"image" text,
	"slug" varchar(100),
	"type" "user_type" DEFAULT 'individual',
	"country" char(2),
	"url" text,
	"support_pin" varchar(20),
	"is_private" boolean DEFAULT false NOT NULL,
	"bio" text,
	"locale" varchar(10) DEFAULT 'en',
	"is_active" boolean DEFAULT true NOT NULL,
	"last_login_at" timestamp,
	"created_at" timestamp with time zone DEFAULT now() NOT NULL,
	"updated_at" timestamp with time zone DEFAULT now() NOT NULL,
	"deleted_at" timestamp with time zone,
	"migrated_at" timestamp with time zone,
	"planet_record" boolean DEFAULT false,
	CONSTRAINT "users_uid_unique" UNIQUE("uid"),
	CONSTRAINT "users_auth0_id_unique" UNIQUE("auth0_id"),
	CONSTRAINT "users_email_unique" UNIQUE("email"),
	CONSTRAINT "users_slug_unique" UNIQUE("slug")
);
--> statement-breakpoint
ALTER TABLE "audit_logs" ADD CONSTRAINT "audit_logs_changed_by_users_id_fk" FOREIGN KEY ("changed_by") REFERENCES "public"."users"("id") ON DELETE no action ON UPDATE no action;--> statement-breakpoint
ALTER TABLE "intervention_images" ADD CONSTRAINT "intervention_images_intervention_id_interventions_id_fk" FOREIGN KEY ("intervention_id") REFERENCES "public"."interventions"("id") ON DELETE cascade ON UPDATE no action;--> statement-breakpoint
ALTER TABLE "intervention_records" ADD CONSTRAINT "intervention_records_intervention_id_interventions_id_fk" FOREIGN KEY ("intervention_id") REFERENCES "public"."interventions"("id") ON DELETE no action ON UPDATE no action;--> statement-breakpoint
ALTER TABLE "intervention_records" ADD CONSTRAINT "intervention_records_recorded_by_id_users_id_fk" FOREIGN KEY ("recorded_by_id") REFERENCES "public"."users"("id") ON DELETE no action ON UPDATE no action;--> statement-breakpoint
ALTER TABLE "interventions" ADD CONSTRAINT "interventions_user_id_users_id_fk" FOREIGN KEY ("user_id") REFERENCES "public"."users"("id") ON DELETE no action ON UPDATE no action;--> statement-breakpoint
ALTER TABLE "interventions" ADD CONSTRAINT "interventions_project_id_projects_id_fk" FOREIGN KEY ("project_id") REFERENCES "public"."projects"("id") ON DELETE no action ON UPDATE no action;--> statement-breakpoint
ALTER TABLE "interventions" ADD CONSTRAINT "interventions_project_site_id_sites_id_fk" FOREIGN KEY ("project_site_id") REFERENCES "public"."sites"("id") ON DELETE no action ON UPDATE no action;--> statement-breakpoint
ALTER TABLE "interventions" ADD CONSTRAINT "interventions_parent_intervention_id_interventions_id_fk" FOREIGN KEY ("parent_intervention_id") REFERENCES "public"."interventions"("id") ON DELETE no action ON UPDATE no action;--> statement-breakpoint
ALTER TABLE "interventions" ADD CONSTRAINT "interventions_parent_id_interventions_uid_fk" FOREIGN KEY ("parent_id") REFERENCES "public"."interventions"("uid") ON DELETE no action ON UPDATE no action;--> statement-breakpoint
ALTER TABLE "interventions" ADD CONSTRAINT "interventions_scientific_species_id_scientific_species_id_fk" FOREIGN KEY ("scientific_species_id") REFERENCES "public"."scientific_species"("id") ON DELETE no action ON UPDATE no action;--> statement-breakpoint
ALTER TABLE "migration_logs" ADD CONSTRAINT "migration_logs_user_migration_id_user_migrations_id_fk" FOREIGN KEY ("user_migration_id") REFERENCES "public"."user_migrations"("id") ON DELETE no action ON UPDATE no action;--> statement-breakpoint
ALTER TABLE "notifications" ADD CONSTRAINT "notifications_user_id_users_id_fk" FOREIGN KEY ("user_id") REFERENCES "public"."users"("id") ON DELETE cascade ON UPDATE no action;--> statement-breakpoint
ALTER TABLE "project_invites" ADD CONSTRAINT "project_invites_project_id_projects_id_fk" FOREIGN KEY ("project_id") REFERENCES "public"."projects"("id") ON DELETE cascade ON UPDATE no action;--> statement-breakpoint
ALTER TABLE "project_invites" ADD CONSTRAINT "project_invites_invited_by_id_users_id_fk" FOREIGN KEY ("invited_by_id") REFERENCES "public"."users"("id") ON DELETE no action ON UPDATE no action;--> statement-breakpoint
ALTER TABLE "project_members" ADD CONSTRAINT "project_members_project_id_projects_id_fk" FOREIGN KEY ("project_id") REFERENCES "public"."projects"("id") ON DELETE cascade ON UPDATE no action;--> statement-breakpoint
ALTER TABLE "project_members" ADD CONSTRAINT "project_members_user_id_users_id_fk" FOREIGN KEY ("user_id") REFERENCES "public"."users"("id") ON DELETE cascade ON UPDATE no action;--> statement-breakpoint
ALTER TABLE "project_species" ADD CONSTRAINT "project_species_scientific_species_id_scientific_species_id_fk" FOREIGN KEY ("scientific_species_id") REFERENCES "public"."scientific_species"("id") ON DELETE no action ON UPDATE no action;--> statement-breakpoint
ALTER TABLE "project_species" ADD CONSTRAINT "project_species_project_id_projects_id_fk" FOREIGN KEY ("project_id") REFERENCES "public"."projects"("id") ON DELETE cascade ON UPDATE no action;--> statement-breakpoint
ALTER TABLE "project_species" ADD CONSTRAINT "project_species_added_by_id_users_id_fk" FOREIGN KEY ("added_by_id") REFERENCES "public"."users"("id") ON DELETE cascade ON UPDATE no action;--> statement-breakpoint
ALTER TABLE "projects" ADD CONSTRAINT "projects_created_by_id_users_id_fk" FOREIGN KEY ("created_by_id") REFERENCES "public"."users"("id") ON DELETE no action ON UPDATE no action;--> statement-breakpoint
ALTER TABLE "site_images" ADD CONSTRAINT "site_images_site_id_sites_id_fk" FOREIGN KEY ("site_id") REFERENCES "public"."sites"("id") ON DELETE cascade ON UPDATE no action;--> statement-breakpoint
ALTER TABLE "sites" ADD CONSTRAINT "sites_project_id_projects_id_fk" FOREIGN KEY ("project_id") REFERENCES "public"."projects"("id") ON DELETE cascade ON UPDATE no action;--> statement-breakpoint
ALTER TABLE "sites" ADD CONSTRAINT "sites_created_by_id_users_id_fk" FOREIGN KEY ("created_by_id") REFERENCES "public"."users"("id") ON DELETE no action ON UPDATE no action;--> statement-breakpoint
ALTER TABLE "species_images" ADD CONSTRAINT "species_images_species_id_project_species_id_fk" FOREIGN KEY ("species_id") REFERENCES "public"."project_species"("id") ON DELETE cascade ON UPDATE no action;--> statement-breakpoint
ALTER TABLE "species_requests" ADD CONSTRAINT "species_requests_requested_by_id_users_id_fk" FOREIGN KEY ("requested_by_id") REFERENCES "public"."users"("id") ON DELETE cascade ON UPDATE no action;--> statement-breakpoint
ALTER TABLE "species_requests" ADD CONSTRAINT "species_requests_project_id_projects_id_fk" FOREIGN KEY ("project_id") REFERENCES "public"."projects"("id") ON DELETE cascade ON UPDATE no action;--> statement-breakpoint
ALTER TABLE "species_requests" ADD CONSTRAINT "species_requests_reviewed_by_id_users_id_fk" FOREIGN KEY ("reviewed_by_id") REFERENCES "public"."users"("id") ON DELETE no action ON UPDATE no action;--> statement-breakpoint
ALTER TABLE "user_migrations" ADD CONSTRAINT "user_migrations_user_id_users_id_fk" FOREIGN KEY ("user_id") REFERENCES "public"."users"("id") ON DELETE no action ON UPDATE no action;--> statement-breakpoint
CREATE INDEX "audit_logs_table_record_idx" ON "audit_logs" USING btree ("table_name","record_uid");--> statement-breakpoint
CREATE INDEX "audit_logs_user_idx" ON "audit_logs" USING btree ("changed_by");--> statement-breakpoint
CREATE INDEX "audit_logs_time_idx" ON "audit_logs" USING btree ("changed_at");--> statement-breakpoint
CREATE INDEX "intervention_images_intervention_id_idx" ON "intervention_images" USING btree ("intervention_id");--> statement-breakpoint
CREATE INDEX "intervention_images_primary_idx" ON "intervention_images" USING btree ("intervention_id","is_primary");--> statement-breakpoint
CREATE INDEX "intervention_images_type_idx" ON "intervention_images" USING btree ("image_type");--> statement-breakpoint
CREATE INDEX "intervention_records_intervention_idx" ON "intervention_records" USING btree ("intervention_id");--> statement-breakpoint
CREATE INDEX "tree_records_recorded_by_idx" ON "intervention_records" USING btree ("recorded_by_id");--> statement-breakpoint
CREATE INDEX "interventions_project_idx" ON "interventions" USING btree ("project_id");--> statement-breakpoint
CREATE INDEX "interventions_project_site_idx" ON "interventions" USING btree ("project_site_id");--> statement-breakpoint
CREATE INDEX "parent_idx" ON "interventions" USING btree ("uid");--> statement-breakpoint
CREATE INDEX "interventions_user_idx" ON "interventions" USING btree ("user_id");--> statement-breakpoint
CREATE INDEX "interventions_uid_idx" ON "interventions" USING btree ("uid");--> statement-breakpoint
CREATE INDEX "interventions_hid_idx" ON "interventions" USING btree ("hid");--> statement-breakpoint
CREATE INDEX "notifications_user_id_idx" ON "notifications" USING btree ("user_id");--> statement-breakpoint
CREATE INDEX "notifications_type_idx" ON "notifications" USING btree ("type");--> statement-breakpoint
CREATE INDEX "notifications_is_read_idx" ON "notifications" USING btree ("is_read");--> statement-breakpoint
CREATE INDEX "notifications_is_archived_idx" ON "notifications" USING btree ("is_archived");--> statement-breakpoint
CREATE INDEX "notifications_priority_idx" ON "notifications" USING btree ("priority");--> statement-breakpoint
CREATE INDEX "notifications_scheduled_for_idx" ON "notifications" USING btree ("scheduled_for");--> statement-breakpoint
CREATE INDEX "notifications_expires_at_idx" ON "notifications" USING btree ("expires_at");--> statement-breakpoint
CREATE INDEX "notifications_related_entity_idx" ON "notifications" USING btree ("related_entity_type","related_entity_id");--> statement-breakpoint
CREATE INDEX "notifications_user_unread_idx" ON "notifications" USING btree ("user_id","is_read");--> statement-breakpoint
CREATE INDEX "notifications_user_category_idx" ON "notifications" USING btree ("user_id","category");--> statement-breakpoint
CREATE INDEX "notifications_unread_idx" ON "notifications" USING btree ("user_id") WHERE is_read = false AND is_archived = false;--> statement-breakpoint
CREATE INDEX "project_invites_project_idx" ON "project_invites" USING btree ("project_id");--> statement-breakpoint
CREATE INDEX "project_invites_email_idx" ON "project_invites" USING btree ("email");--> statement-breakpoint
CREATE INDEX "project_invites_project_status_idx" ON "project_invites" USING btree ("project_id","status");--> statement-breakpoint
CREATE INDEX "project_members_project_idx" ON "project_members" USING btree ("project_id");--> statement-breakpoint
CREATE INDEX "project_members_user_idx" ON "project_members" USING btree ("user_id");--> statement-breakpoint
CREATE INDEX "project_members_uid_idx" ON "project_members" USING btree ("uid");--> statement-breakpoint
CREATE UNIQUE INDEX "unique_project_species" ON "project_species" USING btree ("project_id","scientific_species_id");--> statement-breakpoint
CREATE INDEX "project_species_scientific_species_idx" ON "project_species" USING btree ("scientific_species_id");--> statement-breakpoint
CREATE INDEX "project_species_project_idx" ON "project_species" USING btree ("project_id");--> statement-breakpoint
CREATE INDEX "project_species_added_by_idx" ON "project_species" USING btree ("added_by_id");--> statement-breakpoint
CREATE INDEX "project_species_uid_idx" ON "project_species" USING btree ("uid");--> statement-breakpoint
CREATE INDEX "project_species_native_idx" ON "project_species" USING btree ("is_native_species");--> statement-breakpoint
CREATE INDEX "projects_location_gist_idx" ON "projects" USING gist ("location");--> statement-breakpoint
CREATE INDEX "projects_slug_idx" ON "projects" USING btree ("slug");--> statement-breakpoint
CREATE INDEX "project_uid_idx" ON "projects" USING btree ("uid");--> statement-breakpoint
CREATE INDEX "projects_created_by_idx" ON "projects" USING btree ("created_by_id");--> statement-breakpoint
CREATE INDEX "scientific_species_name_idx" ON "scientific_species" USING btree ("scientific_name");--> statement-breakpoint
CREATE INDEX "scientific_species_uid_idx" ON "scientific_species" USING btree ("uid");--> statement-breakpoint
CREATE INDEX "site_images_site_id_idx" ON "site_images" USING btree ("site_id");--> statement-breakpoint
CREATE INDEX "site_images_primary_idx" ON "site_images" USING btree ("site_id","is_primary");--> statement-breakpoint
CREATE INDEX "sites_project_id_idx" ON "sites" USING btree ("project_id");--> statement-breakpoint
CREATE INDEX "sites_location_gist_idx" ON "sites" USING gist ("location");--> statement-breakpoint
CREATE INDEX "sites_uid_idx" ON "sites" USING btree ("uid");--> statement-breakpoint
CREATE INDEX "uid_species_image_idx" ON "species_images" USING btree ("uid");--> statement-breakpoint
CREATE INDEX "species_images_species_id_idx" ON "species_images" USING btree ("species_id");--> statement-breakpoint
CREATE INDEX "species_requests_requested_by_idx" ON "species_requests" USING btree ("requested_by_id");--> statement-breakpoint
CREATE INDEX "user_id_idx" ON "user_migrations" USING btree ("user_id");--> statement-breakpoint
CREATE INDEX "users_email_idx" ON "users" USING btree ("email");--> statement-breakpoint
CREATE INDEX "users_auth0_id_idx" ON "users" USING btree ("auth0_id");--> statement-breakpoint
CREATE INDEX "users_uid_idx" ON "users" USING btree ("uid");
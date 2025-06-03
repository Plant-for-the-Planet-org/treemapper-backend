CREATE TYPE "public"."capture_mode" AS ENUM('on_site', 'off_site');--> statement-breakpoint
CREATE TYPE "public"."capture_method" AS ENUM('app', 'map', 'survey');--> statement-breakpoint
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
CREATE TABLE "data_conflicts" (
	"id" uuid PRIMARY KEY DEFAULT gen_random_uuid() NOT NULL,
	"user_migration_id" integer,
	"entity" varchar(50) NOT NULL,
	"entity_id" varchar(255) NOT NULL,
	"field" varchar(100) NOT NULL,
	"old_value" jsonb,
	"new_value" jsonb,
	"resolution" varchar(50),
	"resolved_at" timestamp,
	"resolved_by" varchar(255),
	"created_at" timestamp DEFAULT now()
);
--> statement-breakpoint
CREATE TABLE "intervention_configurations" (
	"id" serial PRIMARY KEY NOT NULL,
	"intervention_type" "intervention_type" NOT NULL,
	"allows_species" boolean DEFAULT false NOT NULL,
	"allows_multiple_species" boolean DEFAULT false NOT NULL,
	"requires_species" boolean DEFAULT false NOT NULL,
	"allows_tree_registration" boolean DEFAULT false NOT NULL,
	"requires_tree_registration" boolean DEFAULT false NOT NULL,
	"allows_sample_trees" boolean DEFAULT false NOT NULL,
	"description" text,
	"metadata" jsonb,
	"created_at" timestamp with time zone DEFAULT now() NOT NULL,
	"updated_at" timestamp with time zone DEFAULT now() NOT NULL,
	CONSTRAINT "intervention_configurations_intervention_type_unique" UNIQUE("intervention_type")
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
	"image" text,
	"image_type" "image_type" DEFAULT 'detail' NOT NULL,
	"is_primary" boolean DEFAULT false,
	"caption" text,
	"created_at" timestamp with time zone DEFAULT now() NOT NULL,
	"updated_at" timestamp with time zone DEFAULT now() NOT NULL,
	"deleted_at" timestamp with time zone,
	CONSTRAINT "intervention_images_uid_unique" UNIQUE("uid")
);
--> statement-breakpoint
CREATE TABLE "intervention_species" (
	"id" serial PRIMARY KEY NOT NULL,
	"uid" varchar(50) NOT NULL,
	"intervention_id" integer NOT NULL,
	"scientific_species_id" integer,
	"is_unknown" boolean DEFAULT false NOT NULL,
	"custom_species_name" varchar(255),
	"planted_count" bigint DEFAULT 0,
	"survival_rate" numeric(5, 2),
	"notes" text,
	"metadata" jsonb,
	"created_at" timestamp with time zone DEFAULT now() NOT NULL,
	"updated_at" timestamp with time zone DEFAULT now() NOT NULL,
	"deleted_at" timestamp with time zone,
	CONSTRAINT "intervention_species_uid_unique" UNIQUE("uid"),
	CONSTRAINT "intervention_species_planted_count_check" CHECK (planted_count >= 0)
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
	"trees_planted" bigint,
	"sample_tree_count" bigint DEFAULT 0,
	"status" "intervention_status" DEFAULT 'active',
	"description" varchar(2048),
	"image" text,
	"image_cdn" text,
	"is_private" boolean DEFAULT false NOT NULL,
	"metadata" jsonb,
	"created_at" timestamp with time zone DEFAULT now() NOT NULL,
	"updated_at" timestamp with time zone DEFAULT now() NOT NULL,
	"deleted_at" timestamp with time zone,
	CONSTRAINT "interventions_uid_unique" UNIQUE("uid"),
	CONSTRAINT "interventions_hid_unique" UNIQUE("hid"),
	CONSTRAINT "interventions_idempotency_key_unique" UNIQUE("idempotency_key"),
	CONSTRAINT "interventions_sample_tree_count_check" CHECK (sample_tree_count IS NULL OR sample_tree_count >= 0),
	CONSTRAINT "interventions_date_range_check" CHECK (intervention_end_date >= intervention_start_date)
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
	"image_cdn" text,
	"images" jsonb,
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
	"image_cdn" text,
	"images" jsonb,
	"video_url" text,
	"country" varchar(2),
	"location" geometry(Geometry,4326),
	"original_geometry" jsonb,
	"latitude" double precision,
	"longitude" double precision,
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
	"image_cdn" text,
	"images" jsonb,
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
	"image" text,
	"image_cdn" text,
	"is_primary" boolean DEFAULT false,
	"caption" text,
	"hide" boolean DEFAULT false,
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
	CONSTRAINT "sites_uid_unique" UNIQUE("uid")
);
--> statement-breakpoint
CREATE TABLE "species_images" (
	"id" serial PRIMARY KEY NOT NULL,
	"species_id" integer NOT NULL,
	"filename" varchar(255) NOT NULL,
	"original_name" varchar(255),
	"mime_type" varchar(50),
	"size" bigint,
	"width" integer,
	"height" integer,
	"image" text,
	"image_cdn" text,
	"images" jsonb,
	"is_primary" boolean DEFAULT false,
	"hide" boolean DEFAULT false,
	"created_at" timestamp with time zone DEFAULT now() NOT NULL,
	"updated_at" timestamp with time zone DEFAULT now() NOT NULL,
	CONSTRAINT "species_images_size_check" CHECK (size IS NULL OR size > 0)
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
CREATE TABLE "tree_images" (
	"id" serial PRIMARY KEY NOT NULL,
	"uid" varchar(50) NOT NULL,
	"tree_id" integer NOT NULL,
	"tree_record_id" integer,
	"filename" varchar(255) NOT NULL,
	"original_name" varchar(255),
	"mime_type" varchar(50),
	"size" bigint,
	"width" integer,
	"height" integer,
	"image" varchar(300),
	"image_type" "image_type" DEFAULT 'detail' NOT NULL,
	"is_primary" boolean DEFAULT false,
	"caption" text,
	"shooting_angle" varchar(50),
	"created_at" timestamp with time zone DEFAULT now() NOT NULL,
	"updated_at" timestamp with time zone DEFAULT now() NOT NULL,
	"deleted_at" timestamp with time zone,
	CONSTRAINT "tree_images_uid_unique" UNIQUE("uid")
);
--> statement-breakpoint
CREATE TABLE "tree_records" (
	"id" serial PRIMARY KEY NOT NULL,
	"uid" varchar(50) NOT NULL,
	"tree_id" integer NOT NULL,
	"recorded_by_id" integer NOT NULL,
	"record_type" "record_type" NOT NULL,
	"recorded_at" timestamp with time zone DEFAULT now() NOT NULL,
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
	CONSTRAINT "tree_records_uid_unique" UNIQUE("uid"),
	CONSTRAINT "tree_records_health_score_check" CHECK (health_score IS NULL OR (health_score >= 0 AND health_score <= 100)),
	CONSTRAINT "tree_records_vitality_score_check" CHECK (vitality_score IS NULL OR (vitality_score >= 0 AND vitality_score <= 100)),
	CONSTRAINT "tree_records_status_change_check" CHECK ((record_type = 'status_change' AND previous_status IS NOT NULL AND new_status IS NOT NULL) OR 
        (record_type != 'status_change'))
);
--> statement-breakpoint
CREATE TABLE "trees" (
	"id" serial PRIMARY KEY NOT NULL,
	"uid" varchar(50) NOT NULL,
	"hid" varchar(50) NOT NULL,
	"intervention_id" integer,
	"intervention_species_id" integer,
	"user_id" integer NOT NULL,
	"tag" varchar(100),
	"tree_type" "tree_enum" NOT NULL,
	"latitude" double precision NOT NULL,
	"longitude" double precision NOT NULL,
	"altitude" numeric(8, 2),
	"accuracy" numeric(6, 2),
	"planting_date" date NOT NULL,
	"height" double precision,
	"width" double precision,
	"capture_mode" "capture_mode" NOT NULL,
	"capture_status" "capture_status" DEFAULT 'complete' NOT NULL,
	"status" "tree_status" DEFAULT 'alive' NOT NULL,
	"status_reason" varchar(100),
	"status_changed_at" timestamp with time zone,
	"last_measurement_date" timestamp with time zone,
	"next_measurement_date" timestamp with time zone,
	"measurement_frequency_days" integer,
	"image" text,
	"created_at" timestamp with time zone DEFAULT now() NOT NULL,
	"updated_at" timestamp with time zone DEFAULT now() NOT NULL,
	"deleted_at" timestamp with time zone,
	"metadata" jsonb,
	CONSTRAINT "trees_uid_unique" UNIQUE("uid"),
	CONSTRAINT "trees_hid_unique" UNIQUE("hid"),
	CONSTRAINT "trees_measurement_frequency_check" CHECK (measurement_frequency_days IS NULL OR measurement_frequency_days > 0)
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
	"additional_metadata" jsonb,
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
	"name" varchar(255),
	"firstname" varchar(255),
	"lastname" varchar(255),
	"display_name" varchar(400),
	"avatar" text,
	"avatar_cdn" text,
	"slug" varchar(100),
	"type" "user_type" DEFAULT 'individual',
	"country" char(2),
	"url" text,
	"support_pin" varchar(20),
	"is_private" boolean DEFAULT false NOT NULL,
	"bio" text,
	"locale" varchar(10) DEFAULT 'en_US',
	"is_active" boolean DEFAULT true NOT NULL,
	"last_login_at" timestamp,
	"created_at" timestamp with time zone DEFAULT now() NOT NULL,
	"updated_at" timestamp with time zone DEFAULT now() NOT NULL,
	"deleted_at" timestamp with time zone,
	"migrated_at" timestamp with time zone,
	CONSTRAINT "users_uid_unique" UNIQUE("uid"),
	CONSTRAINT "users_auth0_id_unique" UNIQUE("auth0_id"),
	CONSTRAINT "users_email_unique" UNIQUE("email")
);
--> statement-breakpoint
ALTER TABLE "data_conflicts" ADD CONSTRAINT "data_conflicts_user_migration_id_user_migrations_id_fk" FOREIGN KEY ("user_migration_id") REFERENCES "public"."user_migrations"("id") ON DELETE no action ON UPDATE no action;--> statement-breakpoint
ALTER TABLE "intervention_images" ADD CONSTRAINT "intervention_images_intervention_id_interventions_id_fk" FOREIGN KEY ("intervention_id") REFERENCES "public"."interventions"("id") ON DELETE cascade ON UPDATE no action;--> statement-breakpoint
ALTER TABLE "intervention_species" ADD CONSTRAINT "intervention_species_intervention_id_interventions_id_fk" FOREIGN KEY ("intervention_id") REFERENCES "public"."interventions"("id") ON DELETE cascade ON UPDATE no action;--> statement-breakpoint
ALTER TABLE "intervention_species" ADD CONSTRAINT "intervention_species_scientific_species_id_scientific_species_id_fk" FOREIGN KEY ("scientific_species_id") REFERENCES "public"."scientific_species"("id") ON DELETE no action ON UPDATE no action;--> statement-breakpoint
ALTER TABLE "interventions" ADD CONSTRAINT "interventions_user_id_users_id_fk" FOREIGN KEY ("user_id") REFERENCES "public"."users"("id") ON DELETE no action ON UPDATE no action;--> statement-breakpoint
ALTER TABLE "interventions" ADD CONSTRAINT "interventions_project_id_projects_id_fk" FOREIGN KEY ("project_id") REFERENCES "public"."projects"("id") ON DELETE no action ON UPDATE no action;--> statement-breakpoint
ALTER TABLE "interventions" ADD CONSTRAINT "interventions_project_site_id_sites_id_fk" FOREIGN KEY ("project_site_id") REFERENCES "public"."sites"("id") ON DELETE no action ON UPDATE no action;--> statement-breakpoint
ALTER TABLE "interventions" ADD CONSTRAINT "interventions_parent_intervention_id_interventions_id_fk" FOREIGN KEY ("parent_intervention_id") REFERENCES "public"."interventions"("id") ON DELETE no action ON UPDATE no action;--> statement-breakpoint
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
ALTER TABLE "tree_images" ADD CONSTRAINT "tree_images_tree_id_trees_id_fk" FOREIGN KEY ("tree_id") REFERENCES "public"."trees"("id") ON DELETE cascade ON UPDATE no action;--> statement-breakpoint
ALTER TABLE "tree_images" ADD CONSTRAINT "tree_images_tree_record_id_tree_records_id_fk" FOREIGN KEY ("tree_record_id") REFERENCES "public"."tree_records"("id") ON DELETE cascade ON UPDATE no action;--> statement-breakpoint
ALTER TABLE "tree_records" ADD CONSTRAINT "tree_records_tree_id_trees_id_fk" FOREIGN KEY ("tree_id") REFERENCES "public"."trees"("id") ON DELETE cascade ON UPDATE no action;--> statement-breakpoint
ALTER TABLE "tree_records" ADD CONSTRAINT "tree_records_recorded_by_id_users_id_fk" FOREIGN KEY ("recorded_by_id") REFERENCES "public"."users"("id") ON DELETE no action ON UPDATE no action;--> statement-breakpoint
ALTER TABLE "trees" ADD CONSTRAINT "trees_intervention_id_interventions_id_fk" FOREIGN KEY ("intervention_id") REFERENCES "public"."interventions"("id") ON DELETE set null ON UPDATE no action;--> statement-breakpoint
ALTER TABLE "trees" ADD CONSTRAINT "trees_intervention_species_id_intervention_species_id_fk" FOREIGN KEY ("intervention_species_id") REFERENCES "public"."intervention_species"("id") ON DELETE set null ON UPDATE no action;--> statement-breakpoint
ALTER TABLE "trees" ADD CONSTRAINT "trees_user_id_users_id_fk" FOREIGN KEY ("user_id") REFERENCES "public"."users"("id") ON DELETE no action ON UPDATE no action;--> statement-breakpoint
ALTER TABLE "user_migrations" ADD CONSTRAINT "user_migrations_user_id_users_id_fk" FOREIGN KEY ("user_id") REFERENCES "public"."users"("id") ON DELETE no action ON UPDATE no action;--> statement-breakpoint
CREATE INDEX "intervention_config_type_idx" ON "intervention_configurations" USING btree ("intervention_type");--> statement-breakpoint
CREATE INDEX "intervention_images_intervention_id_idx" ON "intervention_images" USING btree ("intervention_id");--> statement-breakpoint
CREATE INDEX "intervention_images_primary_idx" ON "intervention_images" USING btree ("intervention_id","is_primary");--> statement-breakpoint
CREATE INDEX "intervention_images_type_idx" ON "intervention_images" USING btree ("image_type");--> statement-breakpoint
CREATE INDEX "intervention_species_intervention_idx" ON "intervention_species" USING btree ("intervention_id");--> statement-breakpoint
CREATE INDEX "intervention_species_species_idx" ON "intervention_species" USING btree ("scientific_species_id");--> statement-breakpoint
CREATE INDEX "intervention_species_planted_count_idx" ON "intervention_species" USING btree ("planted_count");--> statement-breakpoint
CREATE INDEX "intervention_species_uid_idx" ON "intervention_species" USING btree ("uid");--> statement-breakpoint
CREATE INDEX "interventions_discr_idx" ON "interventions" USING btree ("discr");--> statement-breakpoint
CREATE INDEX "interventions_project_idx" ON "interventions" USING btree ("project_id");--> statement-breakpoint
CREATE INDEX "interventions_project_site_idx" ON "interventions" USING btree ("project_site_id");--> statement-breakpoint
CREATE INDEX "interventions_user_idx" ON "interventions" USING btree ("user_id");--> statement-breakpoint
CREATE INDEX "interventions_type_idx" ON "interventions" USING btree ("type");--> statement-breakpoint
CREATE INDEX "interventions_idempotencyKey_idx" ON "interventions" USING btree ("idempotency_key");--> statement-breakpoint
CREATE INDEX "interventions_capture_mode_idx" ON "interventions" USING btree ("capture_mode");--> statement-breakpoint
CREATE INDEX "interventions_capture_status_idx" ON "interventions" USING btree ("capture_status");--> statement-breakpoint
CREATE INDEX "interventions_private_idx" ON "interventions" USING btree ("is_private");--> statement-breakpoint
CREATE INDEX "interventions_parent_idx" ON "interventions" USING btree ("parent_intervention_id");--> statement-breakpoint
CREATE INDEX "interventions_uid_idx" ON "interventions" USING btree ("uid");--> statement-breakpoint
CREATE INDEX "interventions_hid_idx" ON "interventions" USING btree ("hid");--> statement-breakpoint
CREATE INDEX "interventions_start_date_idx" ON "interventions" USING btree ("intervention_start_date");--> statement-breakpoint
CREATE INDEX "interventions_end_date_idx" ON "interventions" USING btree ("intervention_end_date");--> statement-breakpoint
CREATE INDEX "interventions_date_range_idx" ON "interventions" USING btree ("intervention_start_date","intervention_end_date");--> statement-breakpoint
CREATE INDEX "interventions_trees_planted_idx" ON "interventions" USING btree ("trees_planted");--> statement-breakpoint
CREATE INDEX "interventions_user_type_idx" ON "interventions" USING btree ("user_id","type");--> statement-breakpoint
CREATE INDEX "interventions_with_trees_idx" ON "interventions" USING btree ("type") WHERE type IN ('multi-tree-registration', 'sample-tree-registration', 'single-tree-registration', 'enrichment-planting');--> statement-breakpoint
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
CREATE UNIQUE INDEX "projects_unique_primary_per_user_idx" ON "projects" USING btree ("created_by_id") WHERE "projects"."is_primary" = true;--> statement-breakpoint
CREATE INDEX "scientific_species_name_idx" ON "scientific_species" USING btree ("scientific_name");--> statement-breakpoint
CREATE INDEX "scientific_species_common_name_idx" ON "scientific_species" USING btree ("common_name");--> statement-breakpoint
CREATE INDEX "scientific_species_uid_idx" ON "scientific_species" USING btree ("uid");--> statement-breakpoint
CREATE INDEX "site_images_site_id_idx" ON "site_images" USING btree ("site_id");--> statement-breakpoint
CREATE INDEX "site_images_primary_idx" ON "site_images" USING btree ("site_id","is_primary");--> statement-breakpoint
CREATE INDEX "sites_project_id_idx" ON "sites" USING btree ("project_id");--> statement-breakpoint
CREATE INDEX "sites_location_gist_idx" ON "sites" USING gist ("location");--> statement-breakpoint
CREATE INDEX "sites_uid_idx" ON "sites" USING btree ("uid");--> statement-breakpoint
CREATE INDEX "species_images_species_id_idx" ON "species_images" USING btree ("species_id");--> statement-breakpoint
CREATE INDEX "species_images_primary_idx" ON "species_images" USING btree ("species_id","is_primary");--> statement-breakpoint
CREATE INDEX "species_requests_requested_by_idx" ON "species_requests" USING btree ("requested_by_id");--> statement-breakpoint
CREATE INDEX "species_requests_status_idx" ON "species_requests" USING btree ("status");--> statement-breakpoint
CREATE INDEX "species_requests_scientific_name_idx" ON "species_requests" USING btree ("scientific_name");--> statement-breakpoint
CREATE INDEX "species_requests_reviewed_by_idx" ON "species_requests" USING btree ("reviewed_by_id");--> statement-breakpoint
CREATE INDEX "species_requests_project_idx" ON "species_requests" USING btree ("project_id");--> statement-breakpoint
CREATE INDEX "tree_images_tree_id_idx" ON "tree_images" USING btree ("tree_id");--> statement-breakpoint
CREATE INDEX "tree_images_tree_record_idx" ON "tree_images" USING btree ("tree_record_id");--> statement-breakpoint
CREATE INDEX "tree_images_primary_idx" ON "tree_images" USING btree ("tree_id","is_primary");--> statement-breakpoint
CREATE INDEX "tree_images_type_idx" ON "tree_images" USING btree ("image_type");--> statement-breakpoint
CREATE INDEX "tree_records_tree_id_idx" ON "tree_records" USING btree ("tree_id");--> statement-breakpoint
CREATE INDEX "tree_records_recorded_by_idx" ON "tree_records" USING btree ("recorded_by_id");--> statement-breakpoint
CREATE INDEX "tree_records_type_idx" ON "tree_records" USING btree ("record_type");--> statement-breakpoint
CREATE INDEX "tree_records_recorded_at_idx" ON "tree_records" USING btree ("recorded_at");--> statement-breakpoint
CREATE INDEX "tree_records_uid_idx" ON "tree_records" USING btree ("uid");--> statement-breakpoint
CREATE INDEX "tree_records_tree_type_idx" ON "tree_records" USING btree ("tree_id","record_type");--> statement-breakpoint
CREATE INDEX "tree_records_tree_recorded_at_idx" ON "tree_records" USING btree ("tree_id","recorded_at");--> statement-breakpoint
CREATE INDEX "tree_records_status_change_idx" ON "tree_records" USING btree ("tree_id","new_status");--> statement-breakpoint
CREATE INDEX "tree_records_health_score_idx" ON "tree_records" USING btree ("health_score");--> statement-breakpoint
CREATE INDEX "tree_records_priority_idx" ON "tree_records" USING btree ("priority_level");--> statement-breakpoint
CREATE INDEX "tree_records_latest_idx" ON "tree_records" USING btree ("tree_id","recorded_at") WHERE deleted_at IS NULL;--> statement-breakpoint
CREATE INDEX "tree_records_measurements_idx" ON "tree_records" USING btree ("tree_id","recorded_at") WHERE record_type = 'measurement' AND deleted_at IS NULL;--> statement-breakpoint
CREATE INDEX "tree_records_health_idx" ON "tree_records" USING btree ("tree_id","health_score") WHERE health_score IS NOT NULL;--> statement-breakpoint
CREATE INDEX "tree_records_planting_idx" ON "tree_records" USING btree ("tree_id") WHERE record_type = 'planting';--> statement-breakpoint
CREATE INDEX "trees_intervention_idx" ON "trees" USING btree ("intervention_id");--> statement-breakpoint
CREATE INDEX "trees_uid_idx" ON "trees" USING btree ("uid");--> statement-breakpoint
CREATE INDEX "trees_hid_idx" ON "trees" USING btree ("hid");--> statement-breakpoint
CREATE INDEX "trees_intervention_species_idx" ON "trees" USING btree ("intervention_species_id");--> statement-breakpoint
CREATE INDEX "trees_user_id_idx" ON "trees" USING btree ("user_id");--> statement-breakpoint
CREATE INDEX "trees_status_idx" ON "trees" USING btree ("status");--> statement-breakpoint
CREATE INDEX "trees_planting_date_idx" ON "trees" USING btree ("planting_date");--> statement-breakpoint
CREATE INDEX "trees_last_measurement_idx" ON "trees" USING btree ("last_measurement_date");--> statement-breakpoint
CREATE INDEX "trees_next_measurement_idx" ON "trees" USING btree ("next_measurement_date");--> statement-breakpoint
CREATE INDEX "trees_coords_idx" ON "trees" USING btree ("latitude","longitude");--> statement-breakpoint
CREATE INDEX "trees_status_date_idx" ON "trees" USING btree ("status","status_changed_at");--> statement-breakpoint
CREATE INDEX "trees_intervention_status_idx" ON "trees" USING btree ("intervention_id","status");--> statement-breakpoint
CREATE INDEX "trees_location_gist_idx" ON "trees" USING gist (ST_Point(longitude, latitude));--> statement-breakpoint
CREATE INDEX "user_id_idx" ON "user_migrations" USING btree ("user_id");--> statement-breakpoint
CREATE INDEX "status_idx" ON "user_migrations" USING btree ("status");--> statement-breakpoint
CREATE INDEX "users_email_idx" ON "users" USING btree ("email");--> statement-breakpoint
CREATE INDEX "users_auth0_id_idx" ON "users" USING btree ("auth0_id");--> statement-breakpoint
CREATE INDEX "users_uid_idx" ON "users" USING btree ("uid");
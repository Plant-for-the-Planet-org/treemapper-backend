CREATE TYPE "public"."allocation_priority" AS ENUM('manual', 'automatic', 'high', 'medium', 'low');--> statement-breakpoint
CREATE TYPE "public"."capture_mode" AS ENUM('on_site', 'off_site');--> statement-breakpoint
CREATE TYPE "public"."capture_method" AS ENUM('device', 'map', 'survey');--> statement-breakpoint
CREATE TYPE "public"."capture_status" AS ENUM('complete', 'partial', 'incomplete');--> statement-breakpoint
CREATE TYPE "public"."coordinate_type" AS ENUM('gps', 'manual', 'estimated');--> statement-breakpoint
CREATE TYPE "public"."image_type" AS ENUM('before', 'during', 'after', 'detail', 'overview', 'progress', 'aerial', 'ground');--> statement-breakpoint
CREATE TYPE "public"."intervention_discriminator" AS ENUM('base', 'generic', 'plot', 'sample', 'intervention');--> statement-breakpoint
CREATE TYPE "public"."intervention_status" AS ENUM('active', 'completed', 'cancelled', 'pending', 'failed');--> statement-breakpoint
CREATE TYPE "public"."intervention_type" AS ENUM('assisting-seed-rain', 'control-livestock', 'direct-seeding', 'enrichment-planting', 'fencing', 'fire-patrol', 'fire-suppression', 'firebreaks', 'generic-tree-registration', 'grass-suppression', 'liberating-regenerant', 'maintenance', 'marking-regenerant', 'multi-tree-registration', 'other-intervention', 'plot-plant-registration', 'removal-invasive-species', 'sample-tree-registration', 'single-tree-registration', 'soil-improvement', 'stop-tree-harvesting', 'multi', 'single', 'sample');--> statement-breakpoint
CREATE TYPE "public"."invite_status" AS ENUM('pending', 'accepted', 'declined', 'expired');--> statement-breakpoint
CREATE TYPE "public"."project_role" AS ENUM('owner', 'admin', 'manager', 'contributor', 'observer', 'researcher');--> statement-breakpoint
CREATE TYPE "public"."site_status" AS ENUM('planted', 'planting', 'barren', 'reforestation');--> statement-breakpoint
CREATE TYPE "public"."tree_status" AS ENUM('alive', 'dead', 'unknown', 'removed');--> statement-breakpoint
CREATE TYPE "public"."user_type" AS ENUM('individual', 'education', 'tpo', 'organization', 'student');--> statement-breakpoint
CREATE TABLE "intervention_images" (
	"id" serial PRIMARY KEY NOT NULL,
	"guid" varchar(36) NOT NULL,
	"intervention_id" integer NOT NULL,
	"filename" varchar(255) NOT NULL,
	"original_name" varchar(255),
	"mime_type" varchar(100),
	"size" integer,
	"width" integer,
	"height" integer,
	"is_main_image" boolean DEFAULT false NOT NULL,
	"is_public" boolean DEFAULT true NOT NULL,
	"is_validated" boolean DEFAULT false NOT NULL,
	"validated_by_id" integer,
	"validated_at" timestamp,
	"created_at" timestamp DEFAULT now() NOT NULL,
	"updated_at" timestamp DEFAULT now() NOT NULL,
	CONSTRAINT "intervention_images_guid_unique" UNIQUE("guid"),
	CONSTRAINT "intervention_images_size_check" CHECK (size IS NULL OR size > 0),
	CONSTRAINT "intervention_images_width_check" CHECK (width IS NULL OR width > 0),
	CONSTRAINT "intervention_images_height_check" CHECK (height IS NULL OR height > 0)
);
--> statement-breakpoint
CREATE TABLE "interventions" (
	"id" serial PRIMARY KEY NOT NULL,
	"guid" varchar(36) NOT NULL,
	"hid" varchar(16),
	"discr" "intervention_discriminator" DEFAULT 'base' NOT NULL,
	"project_id" integer,
	"project_site_id" integer,
	"scientific_species_id" integer,
	"user_id" integer NOT NULL,
	"parent_intervention_id" integer,
	"type" "intervention_type" NOT NULL,
	"origin" varchar(16) NOT NULL,
	"idempotency_key" varchar(64) NOT NULL,
	"registration_date" date,
	"intervention_start_date" timestamp,
	"intervention_end_date" timestamp,
	"capture_mode" "capture_mode" NOT NULL,
	"capture_status" "capture_status" DEFAULT 'complete' NOT NULL,
	"geometry" jsonb NOT NULL,
	"original_geometry" jsonb NOT NULL,
	"device_location" jsonb,
	"image" varchar(255),
	"trees_planted" numeric(20, 2) DEFAULT '0' NOT NULL,
	"sample_tree_count" integer,
	"allocation_priority" "allocation_priority" DEFAULT 'manual' NOT NULL,
	"measurements" jsonb,
	"metadata" jsonb,
	"tag" varchar(255),
	"description" varchar(2048),
	"other_species" varchar(2048),
	"status" "intervention_status" DEFAULT 'active',
	"status_reason" varchar(64),
	"is_private" boolean DEFAULT false NOT NULL,
	"legacy_id" integer,
	"created_at" timestamp DEFAULT now() NOT NULL,
	"updated_at" timestamp DEFAULT now() NOT NULL,
	"deleted_at" timestamp,
	CONSTRAINT "interventions_guid_unique" UNIQUE("guid"),
	CONSTRAINT "interventions_idempotency_key_unique" UNIQUE("idempotency_key"),
	CONSTRAINT "interventions_trees_planted_check" CHECK (trees_planted >= 0),
	CONSTRAINT "interventions_sample_tree_count_check" CHECK (sample_tree_count IS NULL OR sample_tree_count > 0)
);
--> statement-breakpoint
CREATE TABLE "notifications" (
	"id" serial PRIMARY KEY NOT NULL,
	"guid" varchar(36) NOT NULL,
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
	CONSTRAINT "notifications_guid_unique" UNIQUE("guid")
);
--> statement-breakpoint
CREATE TABLE "project_invites" (
	"id" serial PRIMARY KEY NOT NULL,
	"guid" varchar(36) NOT NULL,
	"project_id" integer NOT NULL,
	"email" text NOT NULL,
	"message" text DEFAULT '',
	"role" "project_role" DEFAULT 'contributor' NOT NULL,
	"invited_by_id" integer NOT NULL,
	"status" "invite_status" DEFAULT 'pending' NOT NULL,
	"token" uuid DEFAULT gen_random_uuid() NOT NULL,
	"expires_at" timestamp NOT NULL,
	"accepted_at" timestamp,
	"created_at" timestamp DEFAULT now() NOT NULL,
	"updated_at" timestamp DEFAULT now() NOT NULL,
	CONSTRAINT "project_invites_guid_unique" UNIQUE("guid"),
	CONSTRAINT "project_invites_token_unique" UNIQUE("token")
);
--> statement-breakpoint
CREATE TABLE "project_members" (
	"id" serial PRIMARY KEY NOT NULL,
	"guid" varchar(36) NOT NULL,
	"project_id" integer NOT NULL,
	"user_id" integer NOT NULL,
	"role" "project_role" DEFAULT 'contributor' NOT NULL,
	"invited_at" timestamp,
	"joined_at" timestamp DEFAULT now(),
	"created_at" timestamp DEFAULT now() NOT NULL,
	"updated_at" timestamp DEFAULT now() NOT NULL,
	CONSTRAINT "project_members_guid_unique" UNIQUE("guid"),
	CONSTRAINT "unique_project_member" UNIQUE("project_id","user_id")
);
--> statement-breakpoint
CREATE TABLE "projects" (
	"id" serial PRIMARY KEY NOT NULL,
	"guid" varchar(36) NOT NULL,
	"discr" varchar(20) DEFAULT 'base' NOT NULL,
	"created_by_id" integer NOT NULL,
	"slug" varchar(255) NOT NULL,
	"purpose" varchar(64),
	"name" varchar(255) NOT NULL,
	"project_type" text,
	"ecosystem" text,
	"project_scale" text,
	"target" integer,
	"project_website" text,
	"description" text,
	"classification" text,
	"image" varchar(255),
	"video_url" text,
	"country" varchar(2),
	"location" geometry(Geometry,4326),
	"original_geometry" text,
	"geo_latitude" real,
	"geo_longitude" real,
	"url" text,
	"link_text" text,
	"is_active" boolean DEFAULT true NOT NULL,
	"is_public" boolean DEFAULT true NOT NULL,
	"intensity" varchar(100),
	"revision_periodicity_level" varchar(100),
	"metadata" jsonb,
	"created_at" timestamp DEFAULT now() NOT NULL,
	"updated_at" timestamp DEFAULT now() NOT NULL,
	"deleted_at" timestamp,
	CONSTRAINT "projects_guid_unique" UNIQUE("guid"),
	CONSTRAINT "projects_slug_unique" UNIQUE("slug")
);
--> statement-breakpoint
CREATE TABLE "scientific_species" (
	"id" serial PRIMARY KEY NOT NULL,
	"guid" varchar(36) NOT NULL,
	"scientific_name" varchar(255) NOT NULL,
	"common_name" varchar(255),
	"description" text,
	"default_image" text,
	"gbif_id" varchar(50),
	"created_at" timestamp DEFAULT now() NOT NULL,
	"updated_at" timestamp DEFAULT now() NOT NULL,
	"deleted_at" timestamp,
	"metadata" jsonb,
	CONSTRAINT "scientific_species_guid_unique" UNIQUE("guid"),
	CONSTRAINT "scientific_species_scientific_name_unique" UNIQUE("scientific_name")
);
--> statement-breakpoint
CREATE TABLE "site_images" (
	"id" serial PRIMARY KEY NOT NULL,
	"guid" varchar(36) NOT NULL,
	"site_id" integer NOT NULL,
	"filename" varchar(255) NOT NULL,
	"original_name" varchar(255),
	"mime_type" varchar(100),
	"size" integer,
	"created_at" timestamp DEFAULT now() NOT NULL,
	"updated_at" timestamp DEFAULT now() NOT NULL,
	CONSTRAINT "site_images_guid_unique" UNIQUE("guid"),
	CONSTRAINT "site_images_size_check" CHECK (size IS NULL OR size > 0)
);
--> statement-breakpoint
CREATE TABLE "sites" (
	"id" serial PRIMARY KEY NOT NULL,
	"guid" varchar(36) NOT NULL,
	"project_id" integer NOT NULL,
	"name" varchar(255) NOT NULL,
	"description" text,
	"boundary" geometry(Geometry,4326),
	"geometry" jsonb,
	"status" "site_status" DEFAULT 'barren',
	"area" numeric(12, 4),
	"created_by_id" integer NOT NULL,
	"created_at" timestamp DEFAULT now() NOT NULL,
	"updated_at" timestamp DEFAULT now() NOT NULL,
	"deleted_at" timestamp,
	"metadata" jsonb,
	CONSTRAINT "sites_guid_unique" UNIQUE("guid"),
	CONSTRAINT "sites_area_check" CHECK (area IS NULL OR area > 0)
);
--> statement-breakpoint
CREATE TABLE "species_images" (
	"id" serial PRIMARY KEY NOT NULL,
	"species_id" integer NOT NULL,
	"filename" varchar(255) NOT NULL,
	"original_name" varchar(255),
	"mime_type" varchar(100),
	"size" integer,
	"created_at" timestamp DEFAULT now() NOT NULL,
	"updated_at" timestamp DEFAULT now() NOT NULL,
	CONSTRAINT "species_images_size_check" CHECK (size IS NULL OR size > 0)
);
--> statement-breakpoint
CREATE TABLE "tree_records" (
	"id" serial PRIMARY KEY NOT NULL,
	"guid" varchar(36) NOT NULL,
	"tree_id" integer NOT NULL,
	"notes" text,
	"height" double precision,
	"diameter" double precision,
	"previous_status" "tree_status",
	"new_status" "tree_status",
	"images" jsonb,
	"main_image_url" text,
	"recorded_by_id" integer NOT NULL,
	"is_public" boolean DEFAULT true NOT NULL,
	"created_at" timestamp DEFAULT now() NOT NULL,
	"metadata" jsonb,
	CONSTRAINT "tree_records_guid_unique" UNIQUE("guid"),
	CONSTRAINT "tree_records_height_check" CHECK (height IS NULL OR height > 0),
	CONSTRAINT "tree_records_diameter_check" CHECK (diameter IS NULL OR diameter > 0)
);
--> statement-breakpoint
CREATE TABLE "trees" (
	"id" serial PRIMARY KEY NOT NULL,
	"intervention_id" integer,
	"guid" varchar(36) NOT NULL,
	"species_id" integer,
	"tag" varchar(100),
	"latitude" double precision NOT NULL,
	"longitude" double precision NOT NULL,
	"altitude" numeric(8, 2),
	"accuracy" numeric(6, 2),
	"height" double precision,
	"diameter" double precision,
	"planting_date" date,
	"status" "tree_status" DEFAULT 'alive' NOT NULL,
	"last_measurement_date" timestamp,
	"next_measurement_date" timestamp,
	"images" jsonb,
	"main_image_url" text,
	"created_by_id" integer NOT NULL,
	"created_at" timestamp DEFAULT now() NOT NULL,
	"updated_at" timestamp DEFAULT now() NOT NULL,
	"deleted_at" timestamp,
	"metadata" jsonb,
	CONSTRAINT "trees_guid_unique" UNIQUE("guid"),
	CONSTRAINT "trees_diameter_check" CHECK (diameter IS NULL OR diameter > 0),
	CONSTRAINT "trees_latitude_check" CHECK (latitude >= -90 AND latitude <= 90),
	CONSTRAINT "trees_longitude_check" CHECK (longitude >= -180 AND longitude <= 180)
);
--> statement-breakpoint
CREATE TABLE "user_species" (
	"id" serial PRIMARY KEY NOT NULL,
	"guid" varchar(36) NOT NULL,
	"scientific_species_id" integer NOT NULL,
	"user_id" integer NOT NULL,
	"aliases" varchar(255),
	"local_name" varchar(255),
	"image" varchar(255),
	"description" varchar(255),
	"notes" text,
	"created_at" timestamp DEFAULT now() NOT NULL,
	"updated_at" timestamp DEFAULT now() NOT NULL,
	"deleted_at" timestamp,
	"metadata" jsonb,
	CONSTRAINT "user_species_guid_unique" UNIQUE("guid")
);
--> statement-breakpoint
CREATE TABLE "users" (
	"id" serial PRIMARY KEY NOT NULL,
	"guid" varchar(36) NOT NULL,
	"auth0_id" text NOT NULL,
	"email" text NOT NULL,
	"auth_name" text NOT NULL,
	"name" text,
	"firstname" text,
	"lastname" text,
	"display_name" text,
	"avatar" text,
	"slug" text,
	"type" "user_type" DEFAULT 'individual',
	"country" varchar(2),
	"url" text,
	"support_pin" text,
	"is_private" boolean DEFAULT false NOT NULL,
	"bio" text,
	"locale" varchar(10) DEFAULT 'en_US',
	"is_active" boolean DEFAULT true NOT NULL,
	"last_login_at" timestamp,
	"created_at" timestamp with time zone DEFAULT now() NOT NULL,
	"updated_at" timestamp with time zone DEFAULT now() NOT NULL,
	"deleted_at" timestamp,
	"migrated_at" timestamp,
	CONSTRAINT "users_guid_unique" UNIQUE("guid"),
	CONSTRAINT "users_auth0_id_unique" UNIQUE("auth0_id"),
	CONSTRAINT "users_email_unique" UNIQUE("email")
);
--> statement-breakpoint
ALTER TABLE "intervention_images" ADD CONSTRAINT "intervention_images_intervention_id_interventions_id_fk" FOREIGN KEY ("intervention_id") REFERENCES "public"."interventions"("id") ON DELETE cascade ON UPDATE no action;--> statement-breakpoint
ALTER TABLE "intervention_images" ADD CONSTRAINT "intervention_images_validated_by_id_users_id_fk" FOREIGN KEY ("validated_by_id") REFERENCES "public"."users"("id") ON DELETE no action ON UPDATE no action;--> statement-breakpoint
ALTER TABLE "interventions" ADD CONSTRAINT "interventions_project_id_projects_id_fk" FOREIGN KEY ("project_id") REFERENCES "public"."projects"("id") ON DELETE no action ON UPDATE no action;--> statement-breakpoint
ALTER TABLE "interventions" ADD CONSTRAINT "interventions_project_site_id_sites_id_fk" FOREIGN KEY ("project_site_id") REFERENCES "public"."sites"("id") ON DELETE no action ON UPDATE no action;--> statement-breakpoint
ALTER TABLE "interventions" ADD CONSTRAINT "interventions_scientific_species_id_scientific_species_id_fk" FOREIGN KEY ("scientific_species_id") REFERENCES "public"."scientific_species"("id") ON DELETE no action ON UPDATE no action;--> statement-breakpoint
ALTER TABLE "interventions" ADD CONSTRAINT "interventions_user_id_users_id_fk" FOREIGN KEY ("user_id") REFERENCES "public"."users"("id") ON DELETE no action ON UPDATE no action;--> statement-breakpoint
ALTER TABLE "interventions" ADD CONSTRAINT "interventions_parent_intervention_id_interventions_id_fk" FOREIGN KEY ("parent_intervention_id") REFERENCES "public"."interventions"("id") ON DELETE no action ON UPDATE no action;--> statement-breakpoint
ALTER TABLE "notifications" ADD CONSTRAINT "notifications_user_id_users_id_fk" FOREIGN KEY ("user_id") REFERENCES "public"."users"("id") ON DELETE cascade ON UPDATE no action;--> statement-breakpoint
ALTER TABLE "project_invites" ADD CONSTRAINT "project_invites_project_id_projects_id_fk" FOREIGN KEY ("project_id") REFERENCES "public"."projects"("id") ON DELETE cascade ON UPDATE no action;--> statement-breakpoint
ALTER TABLE "project_invites" ADD CONSTRAINT "project_invites_invited_by_id_users_id_fk" FOREIGN KEY ("invited_by_id") REFERENCES "public"."users"("id") ON DELETE no action ON UPDATE no action;--> statement-breakpoint
ALTER TABLE "project_members" ADD CONSTRAINT "project_members_project_id_projects_id_fk" FOREIGN KEY ("project_id") REFERENCES "public"."projects"("id") ON DELETE cascade ON UPDATE no action;--> statement-breakpoint
ALTER TABLE "project_members" ADD CONSTRAINT "project_members_user_id_users_id_fk" FOREIGN KEY ("user_id") REFERENCES "public"."users"("id") ON DELETE cascade ON UPDATE no action;--> statement-breakpoint
ALTER TABLE "projects" ADD CONSTRAINT "projects_created_by_id_users_id_fk" FOREIGN KEY ("created_by_id") REFERENCES "public"."users"("id") ON DELETE no action ON UPDATE no action;--> statement-breakpoint
ALTER TABLE "site_images" ADD CONSTRAINT "site_images_site_id_sites_id_fk" FOREIGN KEY ("site_id") REFERENCES "public"."sites"("id") ON DELETE cascade ON UPDATE no action;--> statement-breakpoint
ALTER TABLE "sites" ADD CONSTRAINT "sites_project_id_projects_id_fk" FOREIGN KEY ("project_id") REFERENCES "public"."projects"("id") ON DELETE cascade ON UPDATE no action;--> statement-breakpoint
ALTER TABLE "sites" ADD CONSTRAINT "sites_created_by_id_users_id_fk" FOREIGN KEY ("created_by_id") REFERENCES "public"."users"("id") ON DELETE no action ON UPDATE no action;--> statement-breakpoint
ALTER TABLE "species_images" ADD CONSTRAINT "species_images_species_id_user_species_id_fk" FOREIGN KEY ("species_id") REFERENCES "public"."user_species"("id") ON DELETE cascade ON UPDATE no action;--> statement-breakpoint
ALTER TABLE "tree_records" ADD CONSTRAINT "tree_records_tree_id_trees_id_fk" FOREIGN KEY ("tree_id") REFERENCES "public"."trees"("id") ON DELETE cascade ON UPDATE no action;--> statement-breakpoint
ALTER TABLE "tree_records" ADD CONSTRAINT "tree_records_recorded_by_id_users_id_fk" FOREIGN KEY ("recorded_by_id") REFERENCES "public"."users"("id") ON DELETE no action ON UPDATE no action;--> statement-breakpoint
ALTER TABLE "trees" ADD CONSTRAINT "trees_intervention_id_interventions_id_fk" FOREIGN KEY ("intervention_id") REFERENCES "public"."interventions"("id") ON DELETE set null ON UPDATE no action;--> statement-breakpoint
ALTER TABLE "trees" ADD CONSTRAINT "trees_species_id_user_species_id_fk" FOREIGN KEY ("species_id") REFERENCES "public"."user_species"("id") ON DELETE set null ON UPDATE no action;--> statement-breakpoint
ALTER TABLE "trees" ADD CONSTRAINT "trees_created_by_id_users_id_fk" FOREIGN KEY ("created_by_id") REFERENCES "public"."users"("id") ON DELETE no action ON UPDATE no action;--> statement-breakpoint
ALTER TABLE "user_species" ADD CONSTRAINT "user_species_scientific_species_id_scientific_species_id_fk" FOREIGN KEY ("scientific_species_id") REFERENCES "public"."scientific_species"("id") ON DELETE no action ON UPDATE no action;--> statement-breakpoint
ALTER TABLE "user_species" ADD CONSTRAINT "user_species_user_id_users_id_fk" FOREIGN KEY ("user_id") REFERENCES "public"."users"("id") ON DELETE cascade ON UPDATE no action;--> statement-breakpoint
CREATE INDEX "intervention_images_intervention_idx" ON "intervention_images" USING btree ("intervention_id");--> statement-breakpoint
CREATE INDEX "intervention_images_main_idx" ON "intervention_images" USING btree ("intervention_id","is_main_image");--> statement-breakpoint
CREATE INDEX "intervention_images_validated_idx" ON "intervention_images" USING btree ("is_validated");--> statement-breakpoint
CREATE INDEX "interventions_discr_idx" ON "interventions" USING btree ("discr");--> statement-breakpoint
CREATE INDEX "interventions_project_idx" ON "interventions" USING btree ("project_id");--> statement-breakpoint
CREATE INDEX "interventions_project_site_idx" ON "interventions" USING btree ("project_site_id");--> statement-breakpoint
CREATE INDEX "interventions_user_idx" ON "interventions" USING btree ("user_id");--> statement-breakpoint
CREATE INDEX "interventions_type_idx" ON "interventions" USING btree ("type");--> statement-breakpoint
CREATE INDEX "interventions_capture_mode_idx" ON "interventions" USING btree ("capture_mode");--> statement-breakpoint
CREATE INDEX "interventions_capture_status_idx" ON "interventions" USING btree ("capture_status");--> statement-breakpoint
CREATE INDEX "interventions_status_idx" ON "interventions" USING btree ("status");--> statement-breakpoint
CREATE INDEX "interventions_private_idx" ON "interventions" USING btree ("is_private");--> statement-breakpoint
CREATE INDEX "interventions_parent_idx" ON "interventions" USING btree ("parent_intervention_id");--> statement-breakpoint
CREATE INDEX "interventions_user_type_idx" ON "interventions" USING btree ("user_id","type");--> statement-breakpoint
CREATE INDEX "interventions_site_status_idx" ON "interventions" USING btree ("project_site_id","status");--> statement-breakpoint
CREATE INDEX "interventions_active_idx" ON "interventions" USING btree ("project_id") WHERE status = 'active';--> statement-breakpoint
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
CREATE INDEX "project_invites_status_idx" ON "project_invites" USING btree ("status");--> statement-breakpoint
CREATE INDEX "project_invites_token_idx" ON "project_invites" USING btree ("token");--> statement-breakpoint
CREATE INDEX "project_invites_expires_idx" ON "project_invites" USING btree ("expires_at");--> statement-breakpoint
CREATE INDEX "project_members_project_idx" ON "project_members" USING btree ("project_id");--> statement-breakpoint
CREATE INDEX "project_members_user_idx" ON "project_members" USING btree ("user_id");--> statement-breakpoint
CREATE INDEX "project_members_role_idx" ON "project_members" USING btree ("role");--> statement-breakpoint
CREATE INDEX "projects_location_gist_idx" ON "projects" USING gist ("location");--> statement-breakpoint
CREATE INDEX "scientific_species_name_idx" ON "scientific_species" USING btree ("scientific_name");--> statement-breakpoint
CREATE INDEX "site_images_site_id_idx" ON "site_images" USING btree ("site_id");--> statement-breakpoint
CREATE INDEX "sites_project_id_idx" ON "sites" USING btree ("project_id");--> statement-breakpoint
CREATE INDEX "sites_location_gist_idx" ON "sites" USING gist ("boundary");--> statement-breakpoint
CREATE INDEX "sites_status_idx" ON "sites" USING btree ("status");--> statement-breakpoint
CREATE INDEX "sites_project_status_idx" ON "sites" USING btree ("project_id","status");--> statement-breakpoint
CREATE INDEX "species_images_species_id_idx" ON "species_images" USING btree ("species_id");--> statement-breakpoint
CREATE INDEX "tree_records_tree_id_idx" ON "tree_records" USING btree ("tree_id");--> statement-breakpoint
CREATE INDEX "tree_records_recorded_by_idx" ON "tree_records" USING btree ("recorded_by_id");--> statement-breakpoint
CREATE INDEX "trees_intervention_idx" ON "trees" USING btree ("intervention_id");--> statement-breakpoint
CREATE INDEX "trees_status_idx" ON "trees" USING btree ("status");--> statement-breakpoint
CREATE INDEX "trees_planting_date_idx" ON "trees" USING btree ("planting_date");--> statement-breakpoint
CREATE INDEX "trees_coords_idx" ON "trees" USING btree ("latitude","longitude");--> statement-breakpoint
CREATE INDEX "trees_next_measurement_idx" ON "trees" USING btree ("next_measurement_date");--> statement-breakpoint
CREATE INDEX "trees_location_gist_idx" ON "trees" USING gist (ST_Point(longitude, latitude));--> statement-breakpoint
CREATE UNIQUE INDEX "unique_user_species" ON "user_species" USING btree ("user_id","scientific_species_id");--> statement-breakpoint
CREATE INDEX "user_species_scientific_species_idx" ON "user_species" USING btree ("scientific_species_id");--> statement-breakpoint
CREATE INDEX "user_species_user_idx" ON "user_species" USING btree ("user_id");--> statement-breakpoint
CREATE INDEX "user_species_aliases_idx" ON "user_species" USING btree ("aliases");--> statement-breakpoint
CREATE INDEX "users_email_idx" ON "users" USING btree ("email");--> statement-breakpoint
CREATE INDEX "users_auth0_id_idx" ON "users" USING btree ("auth0_id");--> statement-breakpoint
CREATE INDEX "users_type_idx" ON "users" USING btree ("type");--> statement-breakpoint
CREATE INDEX "users_active_idx" ON "users" USING btree ("is_active");
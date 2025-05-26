CREATE TYPE "public"."allocation_priority" AS ENUM('manual', 'automatic', 'high', 'medium', 'low');--> statement-breakpoint
CREATE TYPE "public"."audit_operation" AS ENUM('insert', 'update', 'delete');--> statement-breakpoint
CREATE TYPE "public"."capture_mode" AS ENUM('on_site', 'off_site', 'external');--> statement-breakpoint
CREATE TYPE "public"."capture_method" AS ENUM('device', 'map', 'survey');--> statement-breakpoint
CREATE TYPE "public"."capture_status" AS ENUM('complete', 'partial', 'incomplete');--> statement-breakpoint
CREATE TYPE "public"."coordinate_type" AS ENUM('gps', 'manual', 'estimated');--> statement-breakpoint
CREATE TYPE "public"."image_type" AS ENUM('before', 'during', 'after', 'detail', 'overview', 'progress', 'aerial', 'ground');--> statement-breakpoint
CREATE TYPE "public"."intervention_discriminator" AS ENUM('base', 'generic', 'plot', 'sample', 'intervention');--> statement-breakpoint
CREATE TYPE "public"."intervention_status" AS ENUM('active', 'completed', 'cancelled', 'pending', 'failed');--> statement-breakpoint
CREATE TYPE "public"."intervention_type" AS ENUM('assisting-seed-rain', 'control-livestock', 'direct-seeding', 'enrichment-planting', 'fencing', 'fire-patrol', 'fire-suppression', 'firebreaks', 'generic-tree-registration', 'grass-suppression', 'liberating-regenerant', 'maintenance', 'marking-regenerant', 'multi-tree-registration', 'other-intervention', 'plot-plant-registration', 'removal-invasive-species', 'sample-tree-registration', 'single-tree-registration', 'soil-improvement', 'stop-tree-harvesting', 'multi', 'single', 'sample');--> statement-breakpoint
CREATE TYPE "public"."invite_status" AS ENUM('pending', 'accepted', 'declined', 'expired');--> statement-breakpoint
CREATE TYPE "public"."project_role" AS ENUM('owner', 'admin', 'manager', 'contributor', 'observer', 'researcher');--> statement-breakpoint
CREATE TYPE "public"."report_type" AS ENUM('monthly', 'quarterly', 'annual', 'incident', 'progress');--> statement-breakpoint
CREATE TYPE "public"."site_status" AS ENUM('planted', 'planting', 'barren', 'reforestation');--> statement-breakpoint
CREATE TYPE "public"."tree_status" AS ENUM('alive', 'dead', 'unknown', 'removed');--> statement-breakpoint
CREATE TYPE "public"."user_type" AS ENUM('individual', 'education', 'tpo', 'organization', 'student');--> statement-breakpoint
CREATE TABLE "audit_log" (
	"id" serial PRIMARY KEY NOT NULL,
	"table_name" varchar(100) NOT NULL,
	"record_id" integer NOT NULL,
	"operation" "audit_operation" NOT NULL,
	"old_values" jsonb,
	"new_values" jsonb,
	"changed_fields" jsonb,
	"user_id" integer,
	"session_id" varchar(100),
	"request_id" varchar(100),
	"ip_address" varchar(45),
	"user_agent" text,
	"api_endpoint" varchar(255),
	"timestamp" timestamp DEFAULT now() NOT NULL
);
--> statement-breakpoint
CREATE TABLE "intervention_coordinates" (
	"id" serial PRIMARY KEY NOT NULL,
	"guid" varchar(36) NOT NULL,
	"intervention_id" integer NOT NULL,
	"latitude" numeric(10, 8) NOT NULL,
	"longitude" numeric(11, 8) NOT NULL,
	"altitude" numeric(8, 2),
	"accuracy" numeric(6, 2),
	"coordinate_type" "coordinate_type" DEFAULT 'gps',
	"capture_method" "capture_method" DEFAULT 'device',
	"device_id" varchar(100),
	"device_info" jsonb,
	"status" "capture_status" DEFAULT 'complete' NOT NULL,
	"horizontal_accuracy" numeric(6, 2),
	"vertical_accuracy" numeric(6, 2),
	"speed" numeric(6, 2),
	"heading" numeric(5, 2),
	"captured_at" timestamp,
	"created_at" timestamp DEFAULT now() NOT NULL,
	"updated_at" timestamp DEFAULT now() NOT NULL,
	CONSTRAINT "intervention_coordinates_guid_unique" UNIQUE("guid"),
	CONSTRAINT "intervention_coordinates_latitude_check" CHECK (latitude >= -90 AND latitude <= 90),
	CONSTRAINT "intervention_coordinates_longitude_check" CHECK (longitude >= -180 AND longitude <= 180),
	CONSTRAINT "intervention_coordinates_accuracy_check" CHECK (accuracy IS NULL OR accuracy >= 0),
	CONSTRAINT "intervention_coordinates_h_accuracy_check" CHECK (horizontal_accuracy IS NULL OR horizontal_accuracy >= 0),
	CONSTRAINT "intervention_coordinates_v_accuracy_check" CHECK (vertical_accuracy IS NULL OR vertical_accuracy >= 0),
	CONSTRAINT "intervention_coordinates_speed_check" CHECK (speed IS NULL OR speed >= 0),
	CONSTRAINT "intervention_coordinates_heading_check" CHECK (heading IS NULL OR (heading >= 0 AND heading < 360))
);
--> statement-breakpoint
CREATE TABLE "intervention_history" (
	"id" serial PRIMARY KEY NOT NULL,
	"guid" varchar(36) NOT NULL,
	"intervention_id" integer NOT NULL,
	"event_type" varchar(50) NOT NULL,
	"event_description" text,
	"field_name" varchar(100),
	"old_value" text,
	"new_value" text,
	"triggered_by" varchar(50) DEFAULT 'user',
	"triggered_by_id" integer,
	"device_info" jsonb,
	"session_id" varchar(100),
	"request_id" varchar(100),
	"api_version" varchar(20),
	"event_date" timestamp DEFAULT now() NOT NULL,
	"created_at" timestamp DEFAULT now() NOT NULL,
	CONSTRAINT "intervention_history_guid_unique" UNIQUE("guid")
);
--> statement-breakpoint
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
	"caption" varchar(500),
	"description" text,
	"image_type" "image_type" DEFAULT 'overview',
	"coordinates_taken" jsonb,
	"date_taken" timestamp,
	"device_info" jsonb,
	"thumbnail_url" text,
	"compressed_url" text,
	"original_url" text,
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
CREATE TABLE "intervention_planted_species" (
	"id" serial PRIMARY KEY NOT NULL,
	"guid" varchar(36) NOT NULL,
	"intervention_id" integer NOT NULL,
	"scientific_species_id" integer,
	"scientific_name" varchar(255),
	"common_name" varchar(255),
	"local_name" varchar(255),
	"tree_count" integer DEFAULT 1 NOT NULL,
	"seedling_age" integer,
	"seedling_height" numeric(6, 2),
	"seedling_source" varchar(255),
	"planting_method" varchar(100),
	"spacing" numeric(6, 2),
	"depth" numeric(6, 2),
	"survival_rate" numeric(5, 2),
	"average_height" numeric(6, 2),
	"average_diameter" numeric(6, 2),
	"seedling_cost" numeric(10, 2),
	"planting_cost" numeric(10, 2),
	"maintenance_cost" numeric(10, 2),
	"notes" text,
	"challenges" text,
	"planted_at" timestamp,
	"last_measured" timestamp,
	"created_at" timestamp DEFAULT now() NOT NULL,
	"updated_at" timestamp DEFAULT now() NOT NULL,
	CONSTRAINT "intervention_planted_species_guid_unique" UNIQUE("guid"),
	CONSTRAINT "planted_species_tree_count_check" CHECK (tree_count > 0),
	CONSTRAINT "planted_species_seedling_age_check" CHECK (seedling_age IS NULL OR seedling_age >= 0),
	CONSTRAINT "planted_species_seedling_height_check" CHECK (seedling_height IS NULL OR seedling_height > 0),
	CONSTRAINT "planted_species_spacing_check" CHECK (spacing IS NULL OR spacing > 0),
	CONSTRAINT "planted_species_depth_check" CHECK (depth IS NULL OR depth > 0),
	CONSTRAINT "planted_species_survival_rate_check" CHECK (survival_rate IS NULL OR (survival_rate >= 0 AND survival_rate <= 100)),
	CONSTRAINT "planted_species_avg_height_check" CHECK (average_height IS NULL OR average_height > 0),
	CONSTRAINT "planted_species_avg_diameter_check" CHECK (average_diameter IS NULL OR average_diameter > 0),
	CONSTRAINT "planted_species_seedling_cost_check" CHECK (seedling_cost IS NULL OR seedling_cost >= 0),
	CONSTRAINT "planted_species_planting_cost_check" CHECK (planting_cost IS NULL OR planting_cost >= 0),
	CONSTRAINT "planted_species_maintenance_cost_check" CHECK (maintenance_cost IS NULL OR maintenance_cost >= 0)
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
	"intervention_date" date,
	"registration_date" date,
	"intervention_start_date" timestamp,
	"intervention_end_date" timestamp,
	"capture_mode" "capture_mode" NOT NULL,
	"capture_status" "capture_status" DEFAULT 'complete' NOT NULL,
	"geometry" jsonb NOT NULL,
	"original_geometry" jsonb NOT NULL,
	"device_location" jsonb,
	"geometry_updates_count" integer DEFAULT 0 NOT NULL,
	"image" varchar(255),
	"trees_planted" numeric(20, 2) DEFAULT '0' NOT NULL,
	"trees_allocated" integer DEFAULT 0 NOT NULL,
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
	"revision_periodicity" jsonb DEFAULT '[]',
	"last_measurement_date" timestamp,
	"next_measurement_date" timestamp,
	"success_rate" numeric(5, 2),
	"growth_rate" numeric(6, 2),
	"survival_rate" numeric(5, 2),
	"legacy_id" integer,
	"created_at" timestamp DEFAULT now() NOT NULL,
	"updated_at" timestamp DEFAULT now() NOT NULL,
	"deleted_at" timestamp,
	CONSTRAINT "interventions_guid_unique" UNIQUE("guid"),
	CONSTRAINT "interventions_idempotency_key_unique" UNIQUE("idempotency_key"),
	CONSTRAINT "interventions_trees_planted_check" CHECK (trees_planted >= 0),
	CONSTRAINT "interventions_trees_allocated_check" CHECK (trees_allocated >= 0),
	CONSTRAINT "interventions_sample_tree_count_check" CHECK (sample_tree_count IS NULL OR sample_tree_count > 0),
	CONSTRAINT "interventions_geometry_updates_check" CHECK (geometry_updates_count >= 0),
	CONSTRAINT "interventions_success_rate_check" CHECK (success_rate IS NULL OR (success_rate >= 0 AND success_rate <= 100)),
	CONSTRAINT "interventions_growth_rate_check" CHECK (growth_rate IS NULL OR growth_rate >= 0),
	CONSTRAINT "interventions_survival_rate_check" CHECK (survival_rate IS NULL OR (survival_rate >= 0 AND survival_rate <= 100))
);
--> statement-breakpoint
CREATE TABLE "monitoring_schedules" (
	"id" serial PRIMARY KEY NOT NULL,
	"guid" varchar(36) NOT NULL,
	"entity_type" varchar(50) NOT NULL,
	"entity_id" integer NOT NULL,
	"name" varchar(255) NOT NULL,
	"description" text,
	"frequency" varchar(50) NOT NULL,
	"custom_frequency_days" integer,
	"monitoring_type" varchar(50) NOT NULL,
	"required_measurements" jsonb,
	"start_date" date NOT NULL,
	"end_date" date,
	"next_due_date" date NOT NULL,
	"last_completed_date" date,
	"assigned_to_user_id" integer,
	"assigned_to_role" "project_role",
	"is_active" boolean DEFAULT true NOT NULL,
	"is_overdue" boolean DEFAULT false NOT NULL,
	"reminder_days_before" integer DEFAULT 7,
	"escalation_days_after" integer DEFAULT 3,
	"created_by_id" integer NOT NULL,
	"created_at" timestamp DEFAULT now() NOT NULL,
	"updated_at" timestamp DEFAULT now() NOT NULL,
	CONSTRAINT "monitoring_schedules_guid_unique" UNIQUE("guid"),
	CONSTRAINT "monitoring_schedules_custom_frequency_check" CHECK ((frequency != 'custom') OR (custom_frequency_days IS NOT NULL AND custom_frequency_days > 0)),
	CONSTRAINT "monitoring_schedules_reminder_days_check" CHECK (reminder_days_before >= 0),
	CONSTRAINT "monitoring_schedules_escalation_days_check" CHECK (escalation_days_after >= 0),
	CONSTRAINT "monitoring_schedules_date_range_check" CHECK (end_date IS NULL OR end_date >= start_date)
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
	CONSTRAINT "project_invites_token_unique" UNIQUE("token"),
	CONSTRAINT "unique_project_invite" UNIQUE("project_id","email","status")
);
--> statement-breakpoint
CREATE TABLE "project_members" (
	"id" serial PRIMARY KEY NOT NULL,
	"project_id" integer NOT NULL,
	"user_id" integer NOT NULL,
	"role" "project_role" DEFAULT 'contributor' NOT NULL,
	"invited_at" timestamp,
	"joined_at" timestamp DEFAULT now(),
	"created_at" timestamp DEFAULT now() NOT NULL,
	"updated_at" timestamp DEFAULT now() NOT NULL,
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
	"family" varchar(100),
	"genus" varchar(100),
	"species" varchar(100),
	"kingdom" varchar(50),
	"phylum" varchar(50),
	"class" varchar(50),
	"order" varchar(50),
	"description" text,
	"default_image" text,
	"habitat" text,
	"native_regions" varchar(500),
	"max_height" varchar(50),
	"max_diameter" varchar(50),
	"lifespan" varchar(50),
	"gbif_id" varchar(50),
	"iplant_id" varchar(50),
	"is_verified" boolean DEFAULT false NOT NULL,
	"is_active" boolean DEFAULT true NOT NULL,
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
	"caption" varchar(500),
	"description" text,
	"image_type" "image_type" DEFAULT 'overview',
	"coordinates_taken" jsonb,
	"date_taken" timestamp,
	"photographer_name" varchar(255),
	"is_main_image" boolean DEFAULT false NOT NULL,
	"is_public" boolean DEFAULT true NOT NULL,
	"created_at" timestamp DEFAULT now() NOT NULL,
	"updated_at" timestamp DEFAULT now() NOT NULL,
	CONSTRAINT "site_images_guid_unique" UNIQUE("guid"),
	CONSTRAINT "site_images_size_check" CHECK (size IS NULL OR size > 0)
);
--> statement-breakpoint
CREATE TABLE "site_reports" (
	"id" serial PRIMARY KEY NOT NULL,
	"guid" varchar(36) NOT NULL,
	"site_id" integer NOT NULL,
	"report_type" "report_type" NOT NULL,
	"title" varchar(255) NOT NULL,
	"summary" text,
	"detailed_report" text,
	"trees_planted_since_last" integer DEFAULT 0,
	"total_trees_alive" integer DEFAULT 0,
	"overall_survival_rate" numeric(5, 2),
	"weather_conditions" text,
	"soil_conditions" text,
	"wildlife_observations" text,
	"community_engagement" text,
	"challenges_faced" text,
	"actions_required" text,
	"recommended_interventions" text,
	"reporter_id" integer,
	"report_date" timestamp NOT NULL,
	"visit_date" timestamp,
	"is_published" boolean DEFAULT false NOT NULL,
	"created_at" timestamp DEFAULT now() NOT NULL,
	"updated_at" timestamp DEFAULT now() NOT NULL,
	CONSTRAINT "site_reports_guid_unique" UNIQUE("guid"),
	CONSTRAINT "site_reports_trees_planted_check" CHECK (trees_planted_since_last >= 0),
	CONSTRAINT "site_reports_total_trees_check" CHECK (total_trees_alive >= 0),
	CONSTRAINT "site_reports_survival_rate_check" CHECK (overall_survival_rate IS NULL OR (overall_survival_rate >= 0 AND overall_survival_rate <= 100))
);
--> statement-breakpoint
CREATE TABLE "site_species" (
	"id" serial PRIMARY KEY NOT NULL,
	"guid" varchar(36) NOT NULL,
	"site_id" integer NOT NULL,
	"species_id" integer,
	"scientific_name" varchar(255),
	"common_name" varchar(255),
	"local_name" varchar(255),
	"target_count" integer,
	"planted_count" integer DEFAULT 0 NOT NULL,
	"survival_count" integer DEFAULT 0 NOT NULL,
	"survival_rate" numeric(5, 2),
	"planting_density" integer,
	"spacing_meters" numeric(4, 2),
	"planting_zone" varchar(100),
	"average_height" numeric(6, 2),
	"average_diameter" numeric(6, 2),
	"planted_date" timestamp,
	"last_measured" timestamp,
	"created_at" timestamp DEFAULT now() NOT NULL,
	"updated_at" timestamp DEFAULT now() NOT NULL,
	CONSTRAINT "site_species_guid_unique" UNIQUE("guid"),
	CONSTRAINT "site_species_target_count_check" CHECK (target_count IS NULL OR target_count > 0),
	CONSTRAINT "site_species_planted_count_check" CHECK (planted_count >= 0),
	CONSTRAINT "site_species_survival_count_check" CHECK (survival_count >= 0 AND survival_count <= planted_count),
	CONSTRAINT "site_species_survival_rate_check" CHECK (survival_rate IS NULL OR (survival_rate >= 0 AND survival_rate <= 100)),
	CONSTRAINT "site_species_planting_density_check" CHECK (planting_density IS NULL OR planting_density > 0),
	CONSTRAINT "site_species_spacing_check" CHECK (spacing_meters IS NULL OR spacing_meters > 0),
	CONSTRAINT "site_species_height_check" CHECK (average_height IS NULL OR average_height > 0),
	CONSTRAINT "site_species_diameter_check" CHECK (average_diameter IS NULL OR average_diameter > 0)
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
	"planting_date" timestamp,
	"target_tree_count" integer,
	"planted_tree_count" integer DEFAULT 0 NOT NULL,
	"survival_rate" numeric(5, 2),
	"soil_type" varchar(100),
	"climate" varchar(100),
	"elevation" integer,
	"slope" varchar(50),
	"water_source" varchar(100),
	"degradation_cause" text,
	"main_challenges" text,
	"access_difficulty" varchar(50),
	"planting_method" varchar(100),
	"maintenance_plan" text,
	"monitoring_frequency" varchar(50),
	"site_manager_name" varchar(255),
	"site_manager_contact" varchar(255),
	"local_partner" varchar(255),
	"is_active" boolean DEFAULT true NOT NULL,
	"is_public" boolean DEFAULT true NOT NULL,
	"last_monitored" timestamp,
	"created_by_id" integer NOT NULL,
	"created_at" timestamp DEFAULT now() NOT NULL,
	"updated_at" timestamp DEFAULT now() NOT NULL,
	"deleted_at" timestamp,
	"metadata" jsonb,
	CONSTRAINT "sites_guid_unique" UNIQUE("guid"),
	CONSTRAINT "sites_area_check" CHECK (area IS NULL OR area > 0),
	CONSTRAINT "sites_target_tree_count_check" CHECK (target_tree_count IS NULL OR target_tree_count > 0),
	CONSTRAINT "sites_planted_tree_count_check" CHECK (planted_tree_count >= 0),
	CONSTRAINT "sites_survival_rate_check" CHECK (survival_rate IS NULL OR (survival_rate >= 0 AND survival_rate <= 100))
);
--> statement-breakpoint
CREATE TABLE "species_images" (
	"id" serial PRIMARY KEY NOT NULL,
	"guid" varchar(36) NOT NULL,
	"species_id" integer NOT NULL,
	"filename" varchar(255) NOT NULL,
	"original_name" varchar(255),
	"mime_type" varchar(100),
	"size" integer,
	"caption" varchar(500),
	"description" text,
	"image_type" "image_type" DEFAULT 'detail',
	"is_main_image" boolean DEFAULT false NOT NULL,
	"created_at" timestamp DEFAULT now() NOT NULL,
	"updated_at" timestamp DEFAULT now() NOT NULL,
	CONSTRAINT "species_images_guid_unique" UNIQUE("guid"),
	CONSTRAINT "species_images_size_check" CHECK (size IS NULL OR size > 0)
);
--> statement-breakpoint
CREATE TABLE "tree_records" (
	"id" serial PRIMARY KEY NOT NULL,
	"guid" varchar(36) NOT NULL,
	"tree_id" integer NOT NULL,
	"record_type" varchar(50) NOT NULL,
	"record_date" timestamp DEFAULT now() NOT NULL,
	"notes" text,
	"height" double precision,
	"diameter" double precision,
	"circumference" double precision,
	"crown_diameter" double precision,
	"previous_status" "tree_status",
	"new_status" "tree_status",
	"treatment_type" varchar(100),
	"treatment_description" text,
	"materials_used" text,
	"cost_incurred" numeric(10, 2),
	"weather_conditions" varchar(255),
	"soil_moisture" varchar(50),
	"temperature" numeric(4, 1),
	"images" jsonb,
	"documents" jsonb,
	"recorded_by_id" integer NOT NULL,
	"verified_by_id" integer,
	"verified_at" timestamp,
	"is_public" boolean DEFAULT true NOT NULL,
	"created_at" timestamp DEFAULT now() NOT NULL,
	"metadata" jsonb,
	CONSTRAINT "tree_records_guid_unique" UNIQUE("guid"),
	CONSTRAINT "tree_records_height_check" CHECK (height IS NULL OR height > 0),
	CONSTRAINT "tree_records_diameter_check" CHECK (diameter IS NULL OR diameter > 0),
	CONSTRAINT "tree_records_circumference_check" CHECK (circumference IS NULL OR circumference > 0),
	CONSTRAINT "tree_records_crown_diameter_check" CHECK (crown_diameter IS NULL OR crown_diameter > 0),
	CONSTRAINT "tree_records_cost_check" CHECK (cost_incurred IS NULL OR cost_incurred >= 0),
	CONSTRAINT "tree_records_temperature_check" CHECK (temperature IS NULL OR (temperature >= -50 AND temperature <= 60))
);
--> statement-breakpoint
CREATE TABLE "trees" (
	"id" serial PRIMARY KEY NOT NULL,
	"guid" varchar(36) NOT NULL,
	"site_id" integer,
	"user_species_id" integer,
	"identifier" varchar(100),
	"latitude" double precision NOT NULL,
	"longitude" double precision NOT NULL,
	"altitude" numeric(8, 2),
	"accuracy" numeric(6, 2),
	"height" double precision,
	"diameter" double precision,
	"circumference" double precision,
	"crown_diameter" double precision,
	"planting_date" date,
	"seedling_age" integer,
	"seedling_height" numeric(6, 2),
	"seedling_source" varchar(255),
	"planting_method" varchar(100),
	"status" "tree_status" DEFAULT 'alive' NOT NULL,
	"health_notes" text,
	"last_measurement_date" timestamp,
	"next_measurement_date" timestamp,
	"growth_rate" numeric(6, 2),
	"images" jsonb,
	"main_image_url" text,
	"is_monitored" boolean DEFAULT true NOT NULL,
	"monitoring_frequency" varchar(50),
	"created_by_id" integer NOT NULL,
	"created_at" timestamp DEFAULT now() NOT NULL,
	"updated_at" timestamp DEFAULT now() NOT NULL,
	"deleted_at" timestamp,
	"metadata" jsonb,
	CONSTRAINT "trees_guid_unique" UNIQUE("guid"),
	CONSTRAINT "trees_height_check" CHECK (height IS NULL OR height > 0),
	CONSTRAINT "trees_diameter_check" CHECK (diameter IS NULL OR diameter > 0),
	CONSTRAINT "trees_circumference_check" CHECK (circumference IS NULL OR circumference > 0),
	CONSTRAINT "trees_crown_diameter_check" CHECK (crown_diameter IS NULL OR crown_diameter > 0),
	CONSTRAINT "trees_seedling_age_check" CHECK (seedling_age IS NULL OR seedling_age >= 0),
	CONSTRAINT "trees_seedling_height_check" CHECK (seedling_height IS NULL OR seedling_height > 0),
	CONSTRAINT "trees_growth_rate_check" CHECK (growth_rate IS NULL OR growth_rate >= 0),
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
	"custom_image" text,
	"image" varchar(255),
	"description" varchar(255),
	"notes" text,
	"local_uses" text,
	"personal_notes" text,
	"local_habitat" text,
	"growth_conditions" text,
	"is_favorite" boolean DEFAULT false NOT NULL,
	"is_private" boolean DEFAULT false NOT NULL,
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
	CONSTRAINT "users_guid_unique" UNIQUE("guid"),
	CONSTRAINT "users_auth0_id_unique" UNIQUE("auth0_id"),
	CONSTRAINT "users_email_unique" UNIQUE("email")
);
--> statement-breakpoint
ALTER TABLE "audit_log" ADD CONSTRAINT "audit_log_user_id_users_id_fk" FOREIGN KEY ("user_id") REFERENCES "public"."users"("id") ON DELETE no action ON UPDATE no action;--> statement-breakpoint
ALTER TABLE "intervention_coordinates" ADD CONSTRAINT "intervention_coordinates_intervention_id_interventions_id_fk" FOREIGN KEY ("intervention_id") REFERENCES "public"."interventions"("id") ON DELETE cascade ON UPDATE no action;--> statement-breakpoint
ALTER TABLE "intervention_history" ADD CONSTRAINT "intervention_history_intervention_id_interventions_id_fk" FOREIGN KEY ("intervention_id") REFERENCES "public"."interventions"("id") ON DELETE cascade ON UPDATE no action;--> statement-breakpoint
ALTER TABLE "intervention_history" ADD CONSTRAINT "intervention_history_triggered_by_id_users_id_fk" FOREIGN KEY ("triggered_by_id") REFERENCES "public"."users"("id") ON DELETE no action ON UPDATE no action;--> statement-breakpoint
ALTER TABLE "intervention_images" ADD CONSTRAINT "intervention_images_intervention_id_interventions_id_fk" FOREIGN KEY ("intervention_id") REFERENCES "public"."interventions"("id") ON DELETE cascade ON UPDATE no action;--> statement-breakpoint
ALTER TABLE "intervention_images" ADD CONSTRAINT "intervention_images_validated_by_id_users_id_fk" FOREIGN KEY ("validated_by_id") REFERENCES "public"."users"("id") ON DELETE no action ON UPDATE no action;--> statement-breakpoint
ALTER TABLE "intervention_planted_species" ADD CONSTRAINT "intervention_planted_species_intervention_id_interventions_id_fk" FOREIGN KEY ("intervention_id") REFERENCES "public"."interventions"("id") ON DELETE cascade ON UPDATE no action;--> statement-breakpoint
ALTER TABLE "intervention_planted_species" ADD CONSTRAINT "intervention_planted_species_scientific_species_id_scientific_species_id_fk" FOREIGN KEY ("scientific_species_id") REFERENCES "public"."scientific_species"("id") ON DELETE no action ON UPDATE no action;--> statement-breakpoint
ALTER TABLE "interventions" ADD CONSTRAINT "interventions_project_id_projects_id_fk" FOREIGN KEY ("project_id") REFERENCES "public"."projects"("id") ON DELETE no action ON UPDATE no action;--> statement-breakpoint
ALTER TABLE "interventions" ADD CONSTRAINT "interventions_project_site_id_sites_id_fk" FOREIGN KEY ("project_site_id") REFERENCES "public"."sites"("id") ON DELETE no action ON UPDATE no action;--> statement-breakpoint
ALTER TABLE "interventions" ADD CONSTRAINT "interventions_scientific_species_id_scientific_species_id_fk" FOREIGN KEY ("scientific_species_id") REFERENCES "public"."scientific_species"("id") ON DELETE no action ON UPDATE no action;--> statement-breakpoint
ALTER TABLE "interventions" ADD CONSTRAINT "interventions_user_id_users_id_fk" FOREIGN KEY ("user_id") REFERENCES "public"."users"("id") ON DELETE no action ON UPDATE no action;--> statement-breakpoint
ALTER TABLE "interventions" ADD CONSTRAINT "interventions_parent_intervention_id_interventions_id_fk" FOREIGN KEY ("parent_intervention_id") REFERENCES "public"."interventions"("id") ON DELETE no action ON UPDATE no action;--> statement-breakpoint
ALTER TABLE "monitoring_schedules" ADD CONSTRAINT "monitoring_schedules_assigned_to_user_id_users_id_fk" FOREIGN KEY ("assigned_to_user_id") REFERENCES "public"."users"("id") ON DELETE no action ON UPDATE no action;--> statement-breakpoint
ALTER TABLE "monitoring_schedules" ADD CONSTRAINT "monitoring_schedules_created_by_id_users_id_fk" FOREIGN KEY ("created_by_id") REFERENCES "public"."users"("id") ON DELETE no action ON UPDATE no action;--> statement-breakpoint
ALTER TABLE "notifications" ADD CONSTRAINT "notifications_user_id_users_id_fk" FOREIGN KEY ("user_id") REFERENCES "public"."users"("id") ON DELETE cascade ON UPDATE no action;--> statement-breakpoint
ALTER TABLE "project_invites" ADD CONSTRAINT "project_invites_project_id_projects_id_fk" FOREIGN KEY ("project_id") REFERENCES "public"."projects"("id") ON DELETE cascade ON UPDATE no action;--> statement-breakpoint
ALTER TABLE "project_invites" ADD CONSTRAINT "project_invites_invited_by_id_users_id_fk" FOREIGN KEY ("invited_by_id") REFERENCES "public"."users"("id") ON DELETE no action ON UPDATE no action;--> statement-breakpoint
ALTER TABLE "project_members" ADD CONSTRAINT "project_members_project_id_projects_id_fk" FOREIGN KEY ("project_id") REFERENCES "public"."projects"("id") ON DELETE cascade ON UPDATE no action;--> statement-breakpoint
ALTER TABLE "project_members" ADD CONSTRAINT "project_members_user_id_users_id_fk" FOREIGN KEY ("user_id") REFERENCES "public"."users"("id") ON DELETE cascade ON UPDATE no action;--> statement-breakpoint
ALTER TABLE "projects" ADD CONSTRAINT "projects_created_by_id_users_id_fk" FOREIGN KEY ("created_by_id") REFERENCES "public"."users"("id") ON DELETE no action ON UPDATE no action;--> statement-breakpoint
ALTER TABLE "site_images" ADD CONSTRAINT "site_images_site_id_sites_id_fk" FOREIGN KEY ("site_id") REFERENCES "public"."sites"("id") ON DELETE cascade ON UPDATE no action;--> statement-breakpoint
ALTER TABLE "site_reports" ADD CONSTRAINT "site_reports_site_id_sites_id_fk" FOREIGN KEY ("site_id") REFERENCES "public"."sites"("id") ON DELETE cascade ON UPDATE no action;--> statement-breakpoint
ALTER TABLE "site_reports" ADD CONSTRAINT "site_reports_reporter_id_users_id_fk" FOREIGN KEY ("reporter_id") REFERENCES "public"."users"("id") ON DELETE no action ON UPDATE no action;--> statement-breakpoint
ALTER TABLE "site_species" ADD CONSTRAINT "site_species_site_id_sites_id_fk" FOREIGN KEY ("site_id") REFERENCES "public"."sites"("id") ON DELETE cascade ON UPDATE no action;--> statement-breakpoint
ALTER TABLE "site_species" ADD CONSTRAINT "site_species_species_id_user_species_id_fk" FOREIGN KEY ("species_id") REFERENCES "public"."user_species"("id") ON DELETE no action ON UPDATE no action;--> statement-breakpoint
ALTER TABLE "sites" ADD CONSTRAINT "sites_project_id_projects_id_fk" FOREIGN KEY ("project_id") REFERENCES "public"."projects"("id") ON DELETE cascade ON UPDATE no action;--> statement-breakpoint
ALTER TABLE "sites" ADD CONSTRAINT "sites_created_by_id_users_id_fk" FOREIGN KEY ("created_by_id") REFERENCES "public"."users"("id") ON DELETE no action ON UPDATE no action;--> statement-breakpoint
ALTER TABLE "species_images" ADD CONSTRAINT "species_images_species_id_user_species_id_fk" FOREIGN KEY ("species_id") REFERENCES "public"."user_species"("id") ON DELETE cascade ON UPDATE no action;--> statement-breakpoint
ALTER TABLE "tree_records" ADD CONSTRAINT "tree_records_tree_id_trees_id_fk" FOREIGN KEY ("tree_id") REFERENCES "public"."trees"("id") ON DELETE cascade ON UPDATE no action;--> statement-breakpoint
ALTER TABLE "tree_records" ADD CONSTRAINT "tree_records_recorded_by_id_users_id_fk" FOREIGN KEY ("recorded_by_id") REFERENCES "public"."users"("id") ON DELETE no action ON UPDATE no action;--> statement-breakpoint
ALTER TABLE "tree_records" ADD CONSTRAINT "tree_records_verified_by_id_users_id_fk" FOREIGN KEY ("verified_by_id") REFERENCES "public"."users"("id") ON DELETE no action ON UPDATE no action;--> statement-breakpoint
ALTER TABLE "trees" ADD CONSTRAINT "trees_site_id_sites_id_fk" FOREIGN KEY ("site_id") REFERENCES "public"."sites"("id") ON DELETE cascade ON UPDATE no action;--> statement-breakpoint
ALTER TABLE "trees" ADD CONSTRAINT "trees_user_species_id_user_species_id_fk" FOREIGN KEY ("user_species_id") REFERENCES "public"."user_species"("id") ON DELETE set null ON UPDATE no action;--> statement-breakpoint
ALTER TABLE "trees" ADD CONSTRAINT "trees_created_by_id_users_id_fk" FOREIGN KEY ("created_by_id") REFERENCES "public"."users"("id") ON DELETE no action ON UPDATE no action;--> statement-breakpoint
ALTER TABLE "user_species" ADD CONSTRAINT "user_species_scientific_species_id_scientific_species_id_fk" FOREIGN KEY ("scientific_species_id") REFERENCES "public"."scientific_species"("id") ON DELETE no action ON UPDATE no action;--> statement-breakpoint
ALTER TABLE "user_species" ADD CONSTRAINT "user_species_user_id_users_id_fk" FOREIGN KEY ("user_id") REFERENCES "public"."users"("id") ON DELETE cascade ON UPDATE no action;--> statement-breakpoint
CREATE INDEX "audit_log_table_name_idx" ON "audit_log" USING btree ("table_name");--> statement-breakpoint
CREATE INDEX "audit_log_record_id_idx" ON "audit_log" USING btree ("record_id");--> statement-breakpoint
CREATE INDEX "audit_log_operation_idx" ON "audit_log" USING btree ("operation");--> statement-breakpoint
CREATE INDEX "audit_log_user_id_idx" ON "audit_log" USING btree ("user_id");--> statement-breakpoint
CREATE INDEX "audit_log_timestamp_idx" ON "audit_log" USING btree ("timestamp");--> statement-breakpoint
CREATE INDEX "audit_log_session_id_idx" ON "audit_log" USING btree ("session_id");--> statement-breakpoint
CREATE INDEX "audit_log_table_record_idx" ON "audit_log" USING btree ("table_name","record_id");--> statement-breakpoint
CREATE INDEX "audit_log_user_timestamp_idx" ON "audit_log" USING btree ("user_id","timestamp");--> statement-breakpoint
CREATE INDEX "audit_log_table_operation_idx" ON "audit_log" USING btree ("table_name","operation");--> statement-breakpoint
CREATE INDEX "intervention_coordinates_intervention_idx" ON "intervention_coordinates" USING btree ("intervention_id");--> statement-breakpoint
CREATE INDEX "intervention_coordinates_coords_idx" ON "intervention_coordinates" USING btree ("latitude","longitude");--> statement-breakpoint
CREATE INDEX "intervention_coordinates_captured_at_idx" ON "intervention_coordinates" USING btree ("captured_at");--> statement-breakpoint
CREATE INDEX "intervention_coordinates_status_idx" ON "intervention_coordinates" USING btree ("status");--> statement-breakpoint
CREATE INDEX "intervention_coordinates_location_gist_idx" ON "intervention_coordinates" USING gist (ST_Point(longitude::double precision, latitude::double precision));--> statement-breakpoint
CREATE INDEX "intervention_history_intervention_idx" ON "intervention_history" USING btree ("intervention_id");--> statement-breakpoint
CREATE INDEX "intervention_history_event_type_idx" ON "intervention_history" USING btree ("event_type");--> statement-breakpoint
CREATE INDEX "intervention_history_event_date_idx" ON "intervention_history" USING btree ("event_date");--> statement-breakpoint
CREATE INDEX "intervention_history_triggered_by_idx" ON "intervention_history" USING btree ("triggered_by");--> statement-breakpoint
CREATE INDEX "intervention_history_triggered_by_id_idx" ON "intervention_history" USING btree ("triggered_by_id");--> statement-breakpoint
CREATE INDEX "intervention_history_intervention_date_idx" ON "intervention_history" USING btree ("intervention_id","event_date");--> statement-breakpoint
CREATE INDEX "intervention_history_intervention_type_idx" ON "intervention_history" USING btree ("intervention_id","event_type");--> statement-breakpoint
CREATE INDEX "intervention_images_intervention_idx" ON "intervention_images" USING btree ("intervention_id");--> statement-breakpoint
CREATE INDEX "intervention_images_type_idx" ON "intervention_images" USING btree ("image_type");--> statement-breakpoint
CREATE INDEX "intervention_images_main_idx" ON "intervention_images" USING btree ("intervention_id","is_main_image");--> statement-breakpoint
CREATE INDEX "intervention_images_date_taken_idx" ON "intervention_images" USING btree ("date_taken");--> statement-breakpoint
CREATE INDEX "intervention_images_validated_idx" ON "intervention_images" USING btree ("is_validated");--> statement-breakpoint
CREATE INDEX "planted_species_intervention_idx" ON "intervention_planted_species" USING btree ("intervention_id");--> statement-breakpoint
CREATE INDEX "planted_species_species_idx" ON "intervention_planted_species" USING btree ("scientific_species_id");--> statement-breakpoint
CREATE INDEX "planted_species_planted_at_idx" ON "intervention_planted_species" USING btree ("planted_at");--> statement-breakpoint
CREATE INDEX "planted_species_intervention_species_idx" ON "intervention_planted_species" USING btree ("intervention_id","scientific_species_id");--> statement-breakpoint
CREATE INDEX "interventions_discr_idx" ON "interventions" USING btree ("discr");--> statement-breakpoint
CREATE INDEX "interventions_project_idx" ON "interventions" USING btree ("project_id");--> statement-breakpoint
CREATE INDEX "interventions_project_site_idx" ON "interventions" USING btree ("project_site_id");--> statement-breakpoint
CREATE INDEX "interventions_user_idx" ON "interventions" USING btree ("user_id");--> statement-breakpoint
CREATE INDEX "interventions_type_idx" ON "interventions" USING btree ("type");--> statement-breakpoint
CREATE INDEX "interventions_capture_mode_idx" ON "interventions" USING btree ("capture_mode");--> statement-breakpoint
CREATE INDEX "interventions_capture_status_idx" ON "interventions" USING btree ("capture_status");--> statement-breakpoint
CREATE INDEX "interventions_date_idx" ON "interventions" USING btree ("intervention_date");--> statement-breakpoint
CREATE INDEX "interventions_status_idx" ON "interventions" USING btree ("status");--> statement-breakpoint
CREATE INDEX "interventions_private_idx" ON "interventions" USING btree ("is_private");--> statement-breakpoint
CREATE INDEX "interventions_parent_idx" ON "interventions" USING btree ("parent_intervention_id");--> statement-breakpoint
CREATE INDEX "interventions_next_measurement_idx" ON "interventions" USING btree ("next_measurement_date");--> statement-breakpoint
CREATE INDEX "interventions_project_date_idx" ON "interventions" USING btree ("project_id","intervention_date");--> statement-breakpoint
CREATE INDEX "interventions_user_type_idx" ON "interventions" USING btree ("user_id","type");--> statement-breakpoint
CREATE INDEX "interventions_site_status_idx" ON "interventions" USING btree ("project_site_id","status");--> statement-breakpoint
CREATE INDEX "interventions_active_idx" ON "interventions" USING btree ("project_id") WHERE status = 'active';--> statement-breakpoint
CREATE INDEX "monitoring_schedules_entity_idx" ON "monitoring_schedules" USING btree ("entity_type","entity_id");--> statement-breakpoint
CREATE INDEX "monitoring_schedules_next_due_idx" ON "monitoring_schedules" USING btree ("next_due_date");--> statement-breakpoint
CREATE INDEX "monitoring_schedules_assigned_to_idx" ON "monitoring_schedules" USING btree ("assigned_to_user_id");--> statement-breakpoint
CREATE INDEX "monitoring_schedules_is_active_idx" ON "monitoring_schedules" USING btree ("is_active");--> statement-breakpoint
CREATE INDEX "monitoring_schedules_is_overdue_idx" ON "monitoring_schedules" USING btree ("is_overdue");--> statement-breakpoint
CREATE INDEX "monitoring_schedules_frequency_idx" ON "monitoring_schedules" USING btree ("frequency");--> statement-breakpoint
CREATE INDEX "monitoring_schedules_monitoring_type_idx" ON "monitoring_schedules" USING btree ("monitoring_type");--> statement-breakpoint
CREATE INDEX "monitoring_schedules_entity_active_idx" ON "monitoring_schedules" USING btree ("entity_type","entity_id","is_active");--> statement-breakpoint
CREATE INDEX "monitoring_schedules_due_active_idx" ON "monitoring_schedules" USING btree ("next_due_date","is_active");--> statement-breakpoint
CREATE INDEX "monitoring_schedules_active_due_idx" ON "monitoring_schedules" USING btree ("next_due_date") WHERE is_active = true;--> statement-breakpoint
CREATE INDEX "monitoring_schedules_overdue_idx" ON "monitoring_schedules" USING btree ("next_due_date") WHERE is_overdue = true AND is_active = true;--> statement-breakpoint
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
CREATE INDEX "scientific_species_family_idx" ON "scientific_species" USING btree ("family");--> statement-breakpoint
CREATE INDEX "scientific_species_genus_idx" ON "scientific_species" USING btree ("genus");--> statement-breakpoint
CREATE INDEX "scientific_species_verified_idx" ON "scientific_species" USING btree ("is_verified");--> statement-breakpoint
CREATE INDEX "scientific_species_active_idx" ON "scientific_species" USING btree ("is_active");--> statement-breakpoint
CREATE INDEX "scientific_species_taxonomy_idx" ON "scientific_species" USING btree ("family","genus","species");--> statement-breakpoint
CREATE INDEX "site_images_site_id_idx" ON "site_images" USING btree ("site_id");--> statement-breakpoint
CREATE INDEX "site_images_type_idx" ON "site_images" USING btree ("image_type");--> statement-breakpoint
CREATE INDEX "site_images_main_idx" ON "site_images" USING btree ("site_id","is_main_image");--> statement-breakpoint
CREATE INDEX "site_images_date_taken_idx" ON "site_images" USING btree ("date_taken");--> statement-breakpoint
CREATE INDEX "site_reports_site_id_idx" ON "site_reports" USING btree ("site_id");--> statement-breakpoint
CREATE INDEX "site_reports_date_idx" ON "site_reports" USING btree ("report_date");--> statement-breakpoint
CREATE INDEX "site_reports_type_idx" ON "site_reports" USING btree ("report_type");--> statement-breakpoint
CREATE INDEX "site_reports_published_idx" ON "site_reports" USING btree ("is_published");--> statement-breakpoint
CREATE INDEX "site_reports_reporter_idx" ON "site_reports" USING btree ("reporter_id");--> statement-breakpoint
CREATE INDEX "site_reports_site_date_idx" ON "site_reports" USING btree ("site_id","report_date");--> statement-breakpoint
CREATE INDEX "site_species_site_id_idx" ON "site_species" USING btree ("site_id");--> statement-breakpoint
CREATE INDEX "site_species_species_id_idx" ON "site_species" USING btree ("species_id");--> statement-breakpoint
CREATE INDEX "site_species_planted_date_idx" ON "site_species" USING btree ("planted_date");--> statement-breakpoint
CREATE INDEX "site_species_compound_idx" ON "site_species" USING btree ("site_id","species_id");--> statement-breakpoint
CREATE INDEX "sites_project_id_idx" ON "sites" USING btree ("project_id");--> statement-breakpoint
CREATE INDEX "sites_location_gist_idx" ON "sites" USING gist ("boundary");--> statement-breakpoint
CREATE INDEX "sites_status_idx" ON "sites" USING btree ("status");--> statement-breakpoint
CREATE INDEX "sites_planting_date_idx" ON "sites" USING btree ("planting_date");--> statement-breakpoint
CREATE INDEX "sites_active_idx" ON "sites" USING btree ("is_active");--> statement-breakpoint
CREATE INDEX "sites_project_status_idx" ON "sites" USING btree ("project_id","status");--> statement-breakpoint
CREATE INDEX "species_images_species_id_idx" ON "species_images" USING btree ("species_id");--> statement-breakpoint
CREATE INDEX "species_images_type_idx" ON "species_images" USING btree ("image_type");--> statement-breakpoint
CREATE INDEX "species_images_main_idx" ON "species_images" USING btree ("species_id","is_main_image");--> statement-breakpoint
CREATE INDEX "tree_records_tree_id_idx" ON "tree_records" USING btree ("tree_id");--> statement-breakpoint
CREATE INDEX "tree_records_type_idx" ON "tree_records" USING btree ("record_type");--> statement-breakpoint
CREATE INDEX "tree_records_date_idx" ON "tree_records" USING btree ("record_date");--> statement-breakpoint
CREATE INDEX "tree_records_recorded_by_idx" ON "tree_records" USING btree ("recorded_by_id");--> statement-breakpoint
CREATE INDEX "tree_records_verified_by_idx" ON "tree_records" USING btree ("verified_by_id");--> statement-breakpoint
CREATE INDEX "tree_records_tree_date_idx" ON "tree_records" USING btree ("tree_id","record_date");--> statement-breakpoint
CREATE INDEX "tree_records_tree_type_idx" ON "tree_records" USING btree ("tree_id","record_type");--> statement-breakpoint
CREATE INDEX "trees_site_id_idx" ON "trees" USING btree ("site_id");--> statement-breakpoint
CREATE INDEX "trees_user_species_id_idx" ON "trees" USING btree ("user_species_id");--> statement-breakpoint
CREATE INDEX "trees_status_idx" ON "trees" USING btree ("status");--> statement-breakpoint
CREATE INDEX "trees_planting_date_idx" ON "trees" USING btree ("planting_date");--> statement-breakpoint
CREATE INDEX "trees_coords_idx" ON "trees" USING btree ("latitude","longitude");--> statement-breakpoint
CREATE INDEX "trees_identifier_idx" ON "trees" USING btree ("identifier");--> statement-breakpoint
CREATE INDEX "trees_monitored_idx" ON "trees" USING btree ("is_monitored");--> statement-breakpoint
CREATE INDEX "trees_next_measurement_idx" ON "trees" USING btree ("next_measurement_date");--> statement-breakpoint
CREATE INDEX "trees_site_status_idx" ON "trees" USING btree ("site_id","status");--> statement-breakpoint
CREATE INDEX "trees_site_species_idx" ON "trees" USING btree ("site_id","user_species_id");--> statement-breakpoint
CREATE INDEX "trees_location_gist_idx" ON "trees" USING gist (ST_Point(longitude, latitude));--> statement-breakpoint
CREATE UNIQUE INDEX "unique_user_species" ON "user_species" USING btree ("user_id","scientific_species_id");--> statement-breakpoint
CREATE INDEX "user_species_scientific_species_idx" ON "user_species" USING btree ("scientific_species_id");--> statement-breakpoint
CREATE INDEX "user_species_user_idx" ON "user_species" USING btree ("user_id");--> statement-breakpoint
CREATE INDEX "user_species_aliases_idx" ON "user_species" USING btree ("aliases");--> statement-breakpoint
CREATE INDEX "user_species_favorite_idx" ON "user_species" USING btree ("is_favorite");--> statement-breakpoint
CREATE INDEX "users_email_idx" ON "users" USING btree ("email");--> statement-breakpoint
CREATE INDEX "users_auth0_id_idx" ON "users" USING btree ("auth0_id");--> statement-breakpoint
CREATE INDEX "users_type_idx" ON "users" USING btree ("type");--> statement-breakpoint
CREATE INDEX "users_active_idx" ON "users" USING btree ("is_active");
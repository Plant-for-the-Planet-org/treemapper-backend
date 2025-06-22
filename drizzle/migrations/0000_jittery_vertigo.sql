CREATE TYPE "public"."activity_type" AS ENUM('tree_planted', 'tree_measured', 'tree_status_changed', 'intervention_created', 'intervention_updated', 'site_created', 'site_updated', 'species_added', 'image_uploaded', 'project_joined', 'project_updated');--> statement-breakpoint
CREATE TYPE "public"."aggregation_period" AS ENUM('daily', 'weekly', 'monthly', 'quarterly', 'yearly');--> statement-breakpoint
CREATE TYPE "public"."analytics_job_type" AS ENUM('on_demand', 'scheduled_monthly', 'manual_trigger');--> statement-breakpoint
CREATE TYPE "public"."analytics_status" AS ENUM('processing', 'completed', 'failed', 'pending', 'partial');--> statement-breakpoint
CREATE TYPE "public"."capture_mode" AS ENUM('on_site', 'off_site');--> statement-breakpoint
CREATE TYPE "public"."capture_method" AS ENUM('app', 'map', 'survey', 'web_import');--> statement-breakpoint
CREATE TYPE "public"."capture_status" AS ENUM('complete', 'partial', 'incomplete');--> statement-breakpoint
CREATE TYPE "public"."coordinate_type" AS ENUM('gps', 'manual', 'estimated');--> statement-breakpoint
CREATE TYPE "public"."device_type" AS ENUM('mobile_app', 'web_app', 'tablet', 'desktop', 'api', 'import');--> statement-breakpoint
CREATE TYPE "public"."entity_type" AS ENUM('users', 'projects', 'interventions', 'species', 'sites', 'images');--> statement-breakpoint
CREATE TYPE "public"."image_type" AS ENUM('before', 'during', 'after', 'detail', 'overview', 'progress', 'aerial', 'ground', 'record');--> statement-breakpoint
CREATE TYPE "public"."intervention_discriminator" AS ENUM('plot', 'intervention');--> statement-breakpoint
CREATE TYPE "public"."intervention_status" AS ENUM('planned', 'active', 'completed', 'failed', 'on_hold', 'cancelled');--> statement-breakpoint
CREATE TYPE "public"."intervention_type" AS ENUM('assisting-seed-rain', 'control-livestock', 'direct-seeding', 'enrichment-planting', 'fencing', 'fire-patrol', 'fire-suppression', 'firebreaks', 'generic-tree-registration', 'grass-suppression', 'liberating-regenerant', 'maintenance', 'marking-regenerant', 'multi-tree-registration', 'other-intervention', 'plot-plant-registration', 'removal-invasive-species', 'sample-tree-registration', 'single-tree-registration', 'soil-improvement', 'stop-tree-harvesting');--> statement-breakpoint
CREATE TYPE "public"."invite_status" AS ENUM('pending', 'accepted', 'declined', 'expired', 'discarded');--> statement-breakpoint
CREATE TYPE "public"."log_level" AS ENUM('debug', 'info', 'warning', 'error', 'fatal');--> statement-breakpoint
CREATE TYPE "public"."migration_status" AS ENUM('in_progress', 'completed', 'failed');--> statement-breakpoint
CREATE TYPE "public"."project_role" AS ENUM('owner', 'admin', 'contributor', 'observer');--> statement-breakpoint
CREATE TYPE "public"."record_type" AS ENUM('planting', 'measurement', 'status_change', 'inspection', 'maintenance', 'death', 'removal', 'health_assessment', 'growth_monitoring');--> statement-breakpoint
CREATE TYPE "public"."site_status" AS ENUM('planted', 'planting', 'barren', 'reforestation');--> statement-breakpoint
CREATE TYPE "public"."species_request_status" AS ENUM('pending', 'approved', 'rejected');--> statement-breakpoint
CREATE TYPE "public"."tree_status" AS ENUM('alive', 'dead', 'unknown', 'removed', 'sick');--> statement-breakpoint
CREATE TYPE "public"."tree_enum" AS ENUM('single', 'sample', 'plot');--> statement-breakpoint
CREATE TYPE "public"."user_activity_tier" AS ENUM('highly_active', 'moderate', 'low_activity', 'inactive');--> statement-breakpoint
CREATE TYPE "public"."user_type" AS ENUM('individual', 'education', 'tpo', 'organization', 'student');--> statement-breakpoint
CREATE TABLE "analytics_jobs" (
	"id" serial PRIMARY KEY NOT NULL,
	"uid" varchar(50) NOT NULL,
	"project_id" integer NOT NULL,
	"triggered_by_id" integer,
	"job_type" "analytics_job_type" NOT NULL,
	"status" "analytics_status" DEFAULT 'pending' NOT NULL,
	"progress" integer DEFAULT 0,
	"current_step" varchar(100),
	"total_steps" integer,
	"started_at" timestamp with time zone,
	"completed_at" timestamp with time zone,
	"error_message" text,
	"processing_time" integer,
	"memory_usage" bigint,
	"version" varchar(20) DEFAULT '1.0',
	"metadata" jsonb,
	"created_at" timestamp with time zone DEFAULT now() NOT NULL,
	"updated_at" timestamp with time zone DEFAULT now() NOT NULL,
	CONSTRAINT "analytics_jobs_uid_unique" UNIQUE("uid")
);
--> statement-breakpoint
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
CREATE TABLE "geospatial_analytics" (
	"id" serial PRIMARY KEY NOT NULL,
	"uid" varchar(50) NOT NULL,
	"project_id" integer NOT NULL,
	"analytics_job_id" integer,
	"version" varchar(20) DEFAULT '1.0',
	"total_project_area" numeric(12, 2),
	"planted_area" numeric(12, 2),
	"unplanted_area" numeric(12, 2),
	"coverage_percentage" numeric(5, 2),
	"average_tree_density" numeric(8, 2),
	"high_density_zones" integer,
	"medium_density_zones" integer,
	"low_density_zones" integer,
	"high_survival_zones" integer,
	"medium_survival_zones" integer,
	"low_survival_zones" integer,
	"tree_clusters" integer,
	"average_cluster_size" numeric(8, 2),
	"largest_cluster_size" integer,
	"isolated_trees" integer,
	"elevation_range" jsonb,
	"slope_range" jsonb,
	"aspect_distribution" jsonb,
	"best_performing_area" geometry(Geometry,4326),
	"worst_performing_area" geometry(Geometry,4326),
	"high_growth_zones" geometry(Geometry,4326),
	"boundary_length" numeric(12, 2),
	"perimeter_to_area_ratio" numeric(8, 4),
	"compactness_index" numeric(6, 3),
	"spatial_distribution_index" numeric(6, 3),
	"uniformity_score" numeric(5, 2),
	"calculated_at" timestamp with time zone DEFAULT now() NOT NULL,
	"created_at" timestamp with time zone DEFAULT now() NOT NULL,
	"updated_at" timestamp with time zone DEFAULT now() NOT NULL,
	CONSTRAINT "geospatial_analytics_uid_unique" UNIQUE("uid"),
	CONSTRAINT "geospatial_analytics_project_id_unique" UNIQUE("project_id")
);
--> statement-breakpoint
CREATE TABLE "intervention_analytics" (
	"id" serial PRIMARY KEY NOT NULL,
	"uid" varchar(50) NOT NULL,
	"project_id" integer NOT NULL,
	"analytics_job_id" integer,
	"version" varchar(20) DEFAULT '1.0',
	"total_interventions" integer,
	"completed_interventions" integer,
	"active_interventions" integer,
	"failed_interventions" integer,
	"planned_interventions" integer,
	"on_hold_interventions" integer,
	"cancelled_interventions" integer,
	"direct_seeding_success_rate" numeric(5, 2),
	"enrichment_planting_success_rate" numeric(5, 2),
	"maintenance_success_rate" numeric(5, 2),
	"fencing_success_rate" numeric(5, 2),
	"other_intervention_success_rate" numeric(5, 2),
	"average_intervention_duration" numeric(8, 2),
	"shortest_intervention_duration" numeric(8, 2),
	"longest_intervention_duration" numeric(8, 2),
	"average_trees_per_intervention" numeric(8, 2),
	"total_trees_from_interventions" integer,
	"intervention_density" numeric(8, 2),
	"spring_interventions" integer,
	"summer_interventions" integer,
	"autumn_interventions" integer,
	"winter_interventions" integer,
	"most_effective_season" varchar(10),
	"most_successful_intervention_type" varchar(50),
	"least_successful_intervention_type" varchar(50),
	"interventions_with_follow_up" integer,
	"average_follow_up_time" numeric(8, 2),
	"follow_up_success_rate" numeric(5, 2),
	"sites_with_interventions" integer,
	"average_interventions_per_site" numeric(8, 2),
	"calculated_at" timestamp with time zone DEFAULT now() NOT NULL,
	"created_at" timestamp with time zone DEFAULT now() NOT NULL,
	"updated_at" timestamp with time zone DEFAULT now() NOT NULL,
	CONSTRAINT "intervention_analytics_uid_unique" UNIQUE("uid"),
	CONSTRAINT "intervention_analytics_project_id_unique" UNIQUE("project_id")
);
--> statement-breakpoint
CREATE TABLE "intervention_images" (
	"id" serial PRIMARY KEY NOT NULL,
	"uid" varchar(50) NOT NULL,
	"intervention_id" integer NOT NULL,
	"filename" varchar(255),
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
	"updated_by" integer NOT NULL,
	"title" varchar,
	"description" text,
	"created_at" timestamp with time zone DEFAULT now() NOT NULL,
	"updated_at" timestamp with time zone DEFAULT now() NOT NULL,
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
	"type" "intervention_type" NOT NULL,
	"idempotency_key" varchar(64) NOT NULL,
	"capture_mode" "capture_mode" NOT NULL,
	"capture_status" "capture_status" DEFAULT 'complete' NOT NULL,
	"registration_date" timestamp with time zone NOT NULL,
	"intervention_start_date" timestamp with time zone NOT NULL,
	"intervention_end_date" timestamp with time zone NOT NULL,
	"location" geometry(Geometry,4326) NOT NULL,
	"original_geometry" jsonb NOT NULL,
	"device_location" jsonb,
	"tree_count" integer DEFAULT 0,
	"sample_tree_count" integer DEFAULT 0,
	"intervention_status" "intervention_status" DEFAULT 'active',
	"description" varchar(2048),
	"image" text,
	"is_private" boolean DEFAULT false NOT NULL,
	"metadata" jsonb,
	"created_at" timestamp with time zone DEFAULT now() NOT NULL,
	"updated_at" timestamp with time zone DEFAULT now() NOT NULL,
	"flag" boolean DEFAULT false,
	"flag_reason" jsonb,
	"deleted_at" timestamp with time zone,
	"migrated_intervetion" boolean DEFAULT false,
	"species" jsonb DEFAULT '[]'::jsonb,
	CONSTRAINT "interventions_uid_unique" UNIQUE("uid"),
	CONSTRAINT "interventions_hid_unique" UNIQUE("hid"),
	CONSTRAINT "interventions_idempotency_key_unique" UNIQUE("idempotency_key")
);
--> statement-breakpoint
CREATE TABLE "migration_logs" (
	"id" serial PRIMARY KEY NOT NULL,
	"user_migration_id" integer NOT NULL,
	"uid" varchar(50) NOT NULL,
	"level" "log_level" NOT NULL,
	"message" text NOT NULL,
	"entity" "entity_type",
	"entity_id" varchar(255),
	"context" jsonb,
	"stack_trace" text,
	"created_at" timestamp with time zone DEFAULT now() NOT NULL
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
CREATE TABLE "project_analytics" (
	"id" serial PRIMARY KEY NOT NULL,
	"uid" varchar(50) NOT NULL,
	"project_id" integer NOT NULL,
	"analytics_job_id" integer,
	"version" varchar(20) DEFAULT '1.0',
	"total_trees" integer,
	"alive_trees" integer,
	"dead_trees" integer,
	"sick_trees" integer,
	"unknown_status_trees" integer,
	"removed_trees" integer,
	"survival_rate" numeric(5, 2),
	"average_height" numeric(8, 2),
	"average_width" numeric(8, 2),
	"average_health_score" numeric(5, 2),
	"average_vitality_score" numeric(5, 2),
	"total_growth_rate" numeric(8, 3),
	"total_species" integer,
	"native_species_count" integer,
	"endangered_species_count" integer,
	"species_diversity_index" numeric(6, 3),
	"total_sites" integer,
	"active_sites" integer,
	"total_area" numeric(12, 2),
	"tree_density" numeric(8, 2),
	"total_interventions" integer,
	"completed_interventions" integer,
	"active_interventions" integer,
	"intervention_success_rate" numeric(5, 2),
	"total_members" integer,
	"active_members" integer,
	"owner_count" integer,
	"admin_count" integer,
	"contributor_count" integer,
	"observer_count" integer,
	"total_activities" integer,
	"activities_last_30_days" integer,
	"activities_last_7_days" integer,
	"trees_planted_last_30_days" integer,
	"measurements_taken_last_30_days" integer,
	"target_trees" integer,
	"target_progress" numeric(5, 2),
	"projected_completion_date" date,
	"mobile_app_usage" numeric(5, 2),
	"web_app_usage" numeric(5, 2),
	"tablet_usage" numeric(5, 2),
	"tree_growth_trend" numeric(5, 2),
	"survival_rate_trend" numeric(5, 2),
	"activity_trend" numeric(5, 2),
	"membership_trend" numeric(5, 2),
	"calculated_at" timestamp with time zone DEFAULT now() NOT NULL,
	"created_at" timestamp with time zone DEFAULT now() NOT NULL,
	"updated_at" timestamp with time zone DEFAULT now() NOT NULL,
	CONSTRAINT "project_analytics_uid_unique" UNIQUE("uid"),
	CONSTRAINT "project_analytics_project_id_unique" UNIQUE("project_id")
);
--> statement-breakpoint
CREATE TABLE "project_analytics_history" (
	"id" serial PRIMARY KEY NOT NULL,
	"uid" varchar(50) NOT NULL,
	"project_id" integer NOT NULL,
	"analytics_job_id" integer,
	"version" varchar(20) DEFAULT '1.0',
	"period" "aggregation_period" DEFAULT 'monthly' NOT NULL,
	"period_start" date NOT NULL,
	"period_end" date NOT NULL,
	"total_trees" integer,
	"alive_trees" integer,
	"dead_trees" integer,
	"survival_rate" numeric(5, 2),
	"average_height" numeric(8, 2),
	"average_width" numeric(8, 2),
	"average_health_score" numeric(5, 2),
	"total_species" integer,
	"total_members" integer,
	"active_members" integer,
	"total_activities" integer,
	"trees_planted" integer,
	"measurements_taken" integer,
	"interventions_completed" integer,
	"target_progress" numeric(5, 2),
	"created_at" timestamp with time zone DEFAULT now() NOT NULL,
	CONSTRAINT "project_analytics_history_uid_unique" UNIQUE("uid")
);
--> statement-breakpoint
CREATE TABLE "project_audit" (
	"id" serial PRIMARY KEY NOT NULL,
	"uid" varchar(50) NOT NULL,
	"project_id" integer NOT NULL,
	"modified_by" integer NOT NULL,
	"description" text,
	"notes" text,
	"title" text,
	"created_at" timestamp with time zone DEFAULT now() NOT NULL,
	"updated_at" timestamp with time zone DEFAULT now() NOT NULL,
	"metadata" jsonb,
	CONSTRAINT "project_audit_uid_unique" UNIQUE("uid")
);
--> statement-breakpoint
CREATE TABLE "project_images" (
	"id" serial PRIMARY KEY NOT NULL,
	"uid" varchar(50) NOT NULL,
	"project_id" integer NOT NULL,
	"filename" varchar(255),
	"original_name" varchar(255),
	"mime_type" varchar(50),
	"size" bigint,
	"width" integer,
	"height" integer,
	"caption" text,
	"uploaded_from" varchar,
	"is_primary" boolean DEFAULT false,
	"is_private" boolean DEFAULT false,
	"created_at" timestamp with time zone DEFAULT now() NOT NULL,
	"updated_at" timestamp with time zone DEFAULT now() NOT NULL,
	"deleted_at" timestamp with time zone,
	CONSTRAINT "project_images_uid_unique" UNIQUE("uid")
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
	"discarded_by" integer,
	"status" "invite_status" DEFAULT 'pending' NOT NULL,
	"token" uuid DEFAULT gen_random_uuid() NOT NULL,
	"expires_at" timestamp with time zone NOT NULL,
	"accepted_at" timestamp with time zone,
	"created_at" timestamp with time zone DEFAULT now() NOT NULL,
	"updated_at" timestamp with time zone DEFAULT now() NOT NULL,
	CONSTRAINT "project_invites_uid_unique" UNIQUE("uid"),
	CONSTRAINT "project_invites_token_unique" UNIQUE("token")
);
--> statement-breakpoint
CREATE TABLE "project_members" (
	"id" serial PRIMARY KEY NOT NULL,
	"uid" varchar(50) NOT NULL,
	"project_id" integer NOT NULL,
	"user_id" integer NOT NULL,
	"project_role" "project_role" DEFAULT 'contributor' NOT NULL,
	"invited_at" timestamp with time zone,
	"joined_at" timestamp with time zone,
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
	"is_endangered" boolean DEFAULT false,
	"is_disabled" boolean DEFAULT false,
	"project_id" integer NOT NULL,
	"added_by_id" integer NOT NULL,
	"common_name" varchar(255),
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
CREATE TABLE "project_species_images" (
	"id" serial PRIMARY KEY NOT NULL,
	"uid" varchar(50) NOT NULL,
	"species_id" integer NOT NULL,
	"filename" varchar(255),
	"original_name" varchar(255),
	"mime_type" varchar(50),
	"size" bigint,
	"width" integer,
	"height" integer,
	"is_primary" boolean DEFAULT false,
	"is_private" boolean DEFAULT false,
	"created_at" timestamp with time zone DEFAULT now() NOT NULL,
	"updated_at" timestamp with time zone DEFAULT now() NOT NULL,
	CONSTRAINT "project_species_images_uid_unique" UNIQUE("uid")
);
--> statement-breakpoint
CREATE TABLE "projects" (
	"id" serial PRIMARY KEY NOT NULL,
	"uid" varchar(50) NOT NULL,
	"created_by_id" integer NOT NULL,
	"slug" varchar(255) NOT NULL,
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
	"url" text,
	"is_active" boolean DEFAULT true NOT NULL,
	"is_public" boolean DEFAULT true NOT NULL,
	"is_primary" boolean DEFAULT false NOT NULL,
	"is_personal" boolean DEFAULT false NOT NULL,
	"intensity" varchar(100),
	"revision_periodicity_level" varchar(100),
	"metadata" jsonb,
	"migrated_project" boolean DEFAULT false,
	"created_at" timestamp with time zone DEFAULT now() NOT NULL,
	"updated_at" timestamp with time zone DEFAULT now() NOT NULL,
	"flag" boolean DEFAULT false,
	"flag_reason" jsonb,
	CONSTRAINT "projects_uid_unique" UNIQUE("uid"),
	CONSTRAINT "projects_slug_unique" UNIQUE("slug")
);
--> statement-breakpoint
CREATE TABLE "scientific_species" (
	"id" serial PRIMARY KEY NOT NULL,
	"uid" varchar(50) NOT NULL,
	"scientific_name" varchar(255) NOT NULL,
	"common_name" varchar(255),
	"family" varchar(100),
	"genus" varchar(100),
	"description" text,
	"gbif_id" varchar(100),
	"created_at" timestamp with time zone DEFAULT now() NOT NULL,
	"updated_at" timestamp with time zone DEFAULT now() NOT NULL,
	"deleted_at" timestamp with time zone,
	"metadata" jsonb,
	CONSTRAINT "scientific_species_uid_unique" UNIQUE("uid"),
	CONSTRAINT "scientific_species_scientific_name_unique" UNIQUE("scientific_name")
);
--> statement-breakpoint
CREATE TABLE "site_analytics" (
	"id" serial PRIMARY KEY NOT NULL,
	"uid" varchar(50) NOT NULL,
	"project_id" integer NOT NULL,
	"site_id" integer NOT NULL,
	"analytics_job_id" integer,
	"version" varchar(20) DEFAULT '1.0',
	"total_trees" integer,
	"alive_trees" integer,
	"dead_trees" integer,
	"sick_trees" integer,
	"survival_rate" numeric(5, 2),
	"site_area" numeric(12, 2),
	"tree_density" numeric(8, 2),
	"planted_area" numeric(12, 2),
	"coverage_percentage" numeric(5, 2),
	"total_species" integer,
	"native_species_count" integer,
	"endangered_species_count" integer,
	"species_diversity_index" numeric(6, 3),
	"dominant_species_id" integer,
	"average_height" numeric(8, 2),
	"average_width" numeric(8, 2),
	"average_growth_rate" numeric(8, 3),
	"average_health_score" numeric(5, 2),
	"average_vitality_score" numeric(5, 2),
	"average_elevation" numeric(8, 2),
	"average_slope" numeric(5, 2),
	"aspect_direction" varchar(2),
	"total_interventions" integer,
	"total_activities" integer,
	"activities_last_30_days" integer,
	"unique_contributors" integer,
	"last_activity_date" timestamp with time zone,
	"survival_rate_rank" integer,
	"growth_rate_rank" integer,
	"diversity_rank" integer,
	"activity_rank" integer,
	"overall_performance_rank" integer,
	"performance_score" numeric(5, 2),
	"first_planting_date" date,
	"last_planting_date" date,
	"establishment_duration" integer,
	"calculated_at" timestamp with time zone DEFAULT now() NOT NULL,
	"created_at" timestamp with time zone DEFAULT now() NOT NULL,
	"updated_at" timestamp with time zone DEFAULT now() NOT NULL,
	CONSTRAINT "site_analytics_uid_unique" UNIQUE("uid"),
	CONSTRAINT "site_analytics_site_id_unique" UNIQUE("site_id")
);
--> statement-breakpoint
CREATE TABLE "site_images" (
	"id" serial PRIMARY KEY NOT NULL,
	"uid" varchar(50) NOT NULL,
	"site_id" integer NOT NULL,
	"filename" varchar(255),
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
	"status" "site_status" DEFAULT 'planting',
	"created_by_id" integer NOT NULL,
	"created_at" timestamp with time zone DEFAULT now() NOT NULL,
	"updated_at" timestamp with time zone DEFAULT now() NOT NULL,
	"flag" boolean DEFAULT false,
	"flag_reason" jsonb,
	"deleted_at" timestamp with time zone,
	"metadata" jsonb,
	"migrated_site" boolean DEFAULT false,
	CONSTRAINT "sites_uid_unique" UNIQUE("uid")
);
--> statement-breakpoint
CREATE TABLE "species_analytics" (
	"id" serial PRIMARY KEY NOT NULL,
	"uid" varchar(50) NOT NULL,
	"project_id" integer NOT NULL,
	"scientific_species_id" integer NOT NULL,
	"analytics_job_id" integer,
	"version" varchar(20) DEFAULT '1.0',
	"total_trees" integer,
	"alive_trees" integer,
	"dead_trees" integer,
	"sick_trees" integer,
	"survival_rate" numeric(5, 2),
	"average_height" numeric(8, 2),
	"average_width" numeric(8, 2),
	"average_growth_rate" numeric(8, 3),
	"average_health_score" numeric(5, 2),
	"average_vitality_score" numeric(5, 2),
	"survival_rank" integer,
	"growth_rate_rank" integer,
	"health_score_rank" integer,
	"overall_performance_rank" integer,
	"performance_score" numeric(5, 2),
	"best_performing_site_id" integer,
	"worst_performing_site_id" integer,
	"sites_planted_in" integer,
	"first_planting_date" date,
	"last_planting_date" date,
	"average_age" integer,
	"total_measurements" integer,
	"last_measurement_date" timestamp with time zone,
	"measurement_frequency" numeric(5, 2),
	"is_native" boolean,
	"is_endangered" boolean,
	"is_favourite" boolean,
	"recommendation_score" varchar(20),
	"recommendation_notes" text,
	"calculated_at" timestamp with time zone DEFAULT now() NOT NULL,
	"created_at" timestamp with time zone DEFAULT now() NOT NULL,
	"updated_at" timestamp with time zone DEFAULT now() NOT NULL,
	CONSTRAINT "species_analytics_uid_unique" UNIQUE("uid")
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
CREATE TABLE "trees" (
	"id" serial PRIMARY KEY NOT NULL,
	"hid" varchar(16) NOT NULL,
	"uid" varchar(50) NOT NULL,
	"intervention_id" integer,
	"intervention_species_id" varchar(50),
	"species_name" varchar,
	"is_unknown" boolean DEFAULT false,
	"created_by_id" integer NOT NULL,
	"tag" varchar(100),
	"treeType" "tree_enum" DEFAULT 'sample',
	"latitude" double precision NOT NULL,
	"longitude" double precision NOT NULL,
	"altitude" numeric(8, 2),
	"accuracy" numeric(6, 2),
	"location" geometry(Geometry,4326),
	"last_measured_height" double precision,
	"last_measured_width" double precision,
	"status" "tree_status" DEFAULT 'alive' NOT NULL,
	"status_reason" varchar,
	"planting_date" date,
	"last_measurement_date" timestamp with time zone,
	"next_measurement_date" timestamp with time zone,
	"image" text,
	"created_at" timestamp with time zone DEFAULT now() NOT NULL,
	"updated_at" timestamp with time zone DEFAULT now() NOT NULL,
	"deleted_at" timestamp with time zone,
	"metadata" jsonb,
	"flag" boolean DEFAULT false,
	"flag_reason" jsonb,
	"records" jsonb DEFAULT '[]'::jsonb,
	CONSTRAINT "trees_hid_unique" UNIQUE("hid"),
	CONSTRAINT "trees_uid_unique" UNIQUE("uid")
);
--> statement-breakpoint
CREATE TABLE "user_activity" (
	"id" serial PRIMARY KEY NOT NULL,
	"uid" varchar(50) NOT NULL,
	"user_id" integer NOT NULL,
	"project_id" integer,
	"activity_type" "activity_type" NOT NULL,
	"entity_type" varchar(50),
	"entity_id" varchar(50),
	"entity_uid" varchar(50),
	"device_type" "device_type" NOT NULL,
	"device_info" jsonb,
	"location" geometry(Geometry,4326),
	"ip_address" varchar(45),
	"user_agent" text,
	"metadata" jsonb,
	"created_at" timestamp with time zone DEFAULT now() NOT NULL,
	CONSTRAINT "user_activity_uid_unique" UNIQUE("uid")
);
--> statement-breakpoint
CREATE TABLE "user_engagement_analytics" (
	"id" serial PRIMARY KEY NOT NULL,
	"uid" varchar(50) NOT NULL,
	"project_id" integer NOT NULL,
	"analytics_job_id" integer,
	"version" varchar(20) DEFAULT '1.0',
	"total_activities" integer,
	"activities_last_7_days" integer,
	"activities_last_30_days" integer,
	"activities_last_90_days" integer,
	"highly_active_users" integer,
	"moderate_users" integer,
	"low_activity_users" integer,
	"inactive_users" integer,
	"mobile_app_activities" integer,
	"web_app_activities" integer,
	"tablet_activities" integer,
	"desktop_activities" integer,
	"api_activities" integer,
	"import_activities" integer,
	"mobile_usage_percentage" numeric(5, 2),
	"web_usage_percentage" numeric(5, 2),
	"tablet_usage_percentage" numeric(5, 2),
	"trees_planted_count" integer,
	"trees_measured_count" integer,
	"status_changes_count" integer,
	"interventions_created_count" integer,
	"sites_created_count" integer,
	"species_added_count" integer,
	"images_uploaded_count" integer,
	"most_active_hour" integer,
	"most_active_day_of_week" integer,
	"most_active_month" integer,
	"team_collaboration_score" numeric(5, 2),
	"cross_member_interactions" integer,
	"average_response_time" numeric(8, 2),
	"recent_activities" jsonb,
	"top_contributors" jsonb,
	"new_members_last_30_days" integer,
	"active_members_retention" numeric(5, 2),
	"member_engagement_score" numeric(5, 2),
	"calculated_at" timestamp with time zone DEFAULT now() NOT NULL,
	"created_at" timestamp with time zone DEFAULT now() NOT NULL,
	"updated_at" timestamp with time zone DEFAULT now() NOT NULL,
	CONSTRAINT "user_engagement_analytics_uid_unique" UNIQUE("uid"),
	CONSTRAINT "user_engagement_analytics_project_id_unique" UNIQUE("project_id")
);
--> statement-breakpoint
CREATE TABLE "user_migrations" (
	"id" serial PRIMARY KEY NOT NULL,
	"uid" varchar(50) NOT NULL,
	"user_id" integer NOT NULL,
	"planet_id" varchar(50) NOT NULL,
	"status" "migration_status" DEFAULT 'in_progress' NOT NULL,
	"migrated_entities" jsonb DEFAULT '{"user":false,"projects":false,"sites":false,"species":false,"interventions":false,"images":false}'::jsonb,
	"migration_completed_at" timestamp with time zone,
	"error_message" text,
	"retry_count" integer DEFAULT 0,
	"migration_version" varchar(50) DEFAULT '1.0',
	"metadata" jsonb,
	"created_at" timestamp with time zone DEFAULT now() NOT NULL,
	"updated_at" timestamp with time zone DEFAULT now() NOT NULL,
	"flag" boolean DEFAULT false,
	"flag_reason" jsonb,
	"intervention_page_url" text,
	CONSTRAINT "user_migrations_uid_unique" UNIQUE("uid"),
	CONSTRAINT "user_migrations_planet_id_unique" UNIQUE("planet_id")
);
--> statement-breakpoint
CREATE TABLE "users" (
	"id" serial PRIMARY KEY NOT NULL,
	"uid" varchar(50) NOT NULL,
	"auth0_id" varchar(255) NOT NULL,
	"email" varchar(320) NOT NULL,
	"firstname" varchar(255),
	"lastname" varchar(255),
	"display_name" varchar(400),
	"image" text,
	"slug" varchar(100),
	"type" "user_type" DEFAULT 'individual',
	"country" char(2),
	"url" text,
	"is_private" boolean DEFAULT false NOT NULL,
	"is_active" boolean DEFAULT true NOT NULL,
	"last_login_at" timestamp with time zone DEFAULT now(),
	"bio" text,
	"locale" varchar(10) DEFAULT 'en',
	"created_at" timestamp with time zone DEFAULT now() NOT NULL,
	"updated_at" timestamp with time zone DEFAULT now() NOT NULL,
	"flag" boolean DEFAULT false,
	"flag_reason" jsonb,
	"deleted_at" timestamp with time zone,
	"migrated_at" timestamp with time zone,
	"existing_planet_user" boolean DEFAULT false,
	CONSTRAINT "users_uid_unique" UNIQUE("uid"),
	CONSTRAINT "users_auth0_id_unique" UNIQUE("auth0_id"),
	CONSTRAINT "users_email_unique" UNIQUE("email"),
	CONSTRAINT "users_slug_unique" UNIQUE("slug")
);
--> statement-breakpoint
ALTER TABLE "analytics_jobs" ADD CONSTRAINT "analytics_jobs_project_id_projects_id_fk" FOREIGN KEY ("project_id") REFERENCES "public"."projects"("id") ON DELETE no action ON UPDATE no action;--> statement-breakpoint
ALTER TABLE "analytics_jobs" ADD CONSTRAINT "analytics_jobs_triggered_by_id_users_id_fk" FOREIGN KEY ("triggered_by_id") REFERENCES "public"."users"("id") ON DELETE no action ON UPDATE no action;--> statement-breakpoint
ALTER TABLE "audit_logs" ADD CONSTRAINT "audit_logs_changed_by_users_id_fk" FOREIGN KEY ("changed_by") REFERENCES "public"."users"("id") ON DELETE no action ON UPDATE no action;--> statement-breakpoint
ALTER TABLE "geospatial_analytics" ADD CONSTRAINT "geospatial_analytics_project_id_projects_id_fk" FOREIGN KEY ("project_id") REFERENCES "public"."projects"("id") ON DELETE no action ON UPDATE no action;--> statement-breakpoint
ALTER TABLE "geospatial_analytics" ADD CONSTRAINT "geospatial_analytics_analytics_job_id_analytics_jobs_id_fk" FOREIGN KEY ("analytics_job_id") REFERENCES "public"."analytics_jobs"("id") ON DELETE no action ON UPDATE no action;--> statement-breakpoint
ALTER TABLE "intervention_analytics" ADD CONSTRAINT "intervention_analytics_project_id_projects_id_fk" FOREIGN KEY ("project_id") REFERENCES "public"."projects"("id") ON DELETE no action ON UPDATE no action;--> statement-breakpoint
ALTER TABLE "intervention_analytics" ADD CONSTRAINT "intervention_analytics_analytics_job_id_analytics_jobs_id_fk" FOREIGN KEY ("analytics_job_id") REFERENCES "public"."analytics_jobs"("id") ON DELETE no action ON UPDATE no action;--> statement-breakpoint
ALTER TABLE "intervention_images" ADD CONSTRAINT "intervention_images_intervention_id_interventions_id_fk" FOREIGN KEY ("intervention_id") REFERENCES "public"."interventions"("id") ON DELETE no action ON UPDATE no action;--> statement-breakpoint
ALTER TABLE "intervention_records" ADD CONSTRAINT "intervention_records_intervention_id_interventions_id_fk" FOREIGN KEY ("intervention_id") REFERENCES "public"."interventions"("id") ON DELETE no action ON UPDATE no action;--> statement-breakpoint
ALTER TABLE "intervention_records" ADD CONSTRAINT "intervention_records_updated_by_users_id_fk" FOREIGN KEY ("updated_by") REFERENCES "public"."users"("id") ON DELETE no action ON UPDATE no action;--> statement-breakpoint
ALTER TABLE "interventions" ADD CONSTRAINT "interventions_user_id_users_id_fk" FOREIGN KEY ("user_id") REFERENCES "public"."users"("id") ON DELETE no action ON UPDATE no action;--> statement-breakpoint
ALTER TABLE "interventions" ADD CONSTRAINT "interventions_project_id_projects_id_fk" FOREIGN KEY ("project_id") REFERENCES "public"."projects"("id") ON DELETE no action ON UPDATE no action;--> statement-breakpoint
ALTER TABLE "interventions" ADD CONSTRAINT "interventions_project_site_id_sites_id_fk" FOREIGN KEY ("project_site_id") REFERENCES "public"."sites"("id") ON DELETE no action ON UPDATE no action;--> statement-breakpoint
ALTER TABLE "interventions" ADD CONSTRAINT "interventions_parent_intervention_id_interventions_id_fk" FOREIGN KEY ("parent_intervention_id") REFERENCES "public"."interventions"("id") ON DELETE no action ON UPDATE no action;--> statement-breakpoint
ALTER TABLE "migration_logs" ADD CONSTRAINT "migration_logs_user_migration_id_user_migrations_id_fk" FOREIGN KEY ("user_migration_id") REFERENCES "public"."user_migrations"("id") ON DELETE no action ON UPDATE no action;--> statement-breakpoint
ALTER TABLE "notifications" ADD CONSTRAINT "notifications_user_id_users_id_fk" FOREIGN KEY ("user_id") REFERENCES "public"."users"("id") ON DELETE cascade ON UPDATE no action;--> statement-breakpoint
ALTER TABLE "project_analytics" ADD CONSTRAINT "project_analytics_project_id_projects_id_fk" FOREIGN KEY ("project_id") REFERENCES "public"."projects"("id") ON DELETE no action ON UPDATE no action;--> statement-breakpoint
ALTER TABLE "project_analytics" ADD CONSTRAINT "project_analytics_analytics_job_id_analytics_jobs_id_fk" FOREIGN KEY ("analytics_job_id") REFERENCES "public"."analytics_jobs"("id") ON DELETE no action ON UPDATE no action;--> statement-breakpoint
ALTER TABLE "project_analytics_history" ADD CONSTRAINT "project_analytics_history_project_id_projects_id_fk" FOREIGN KEY ("project_id") REFERENCES "public"."projects"("id") ON DELETE no action ON UPDATE no action;--> statement-breakpoint
ALTER TABLE "project_analytics_history" ADD CONSTRAINT "project_analytics_history_analytics_job_id_analytics_jobs_id_fk" FOREIGN KEY ("analytics_job_id") REFERENCES "public"."analytics_jobs"("id") ON DELETE no action ON UPDATE no action;--> statement-breakpoint
ALTER TABLE "project_audit" ADD CONSTRAINT "project_audit_project_id_projects_id_fk" FOREIGN KEY ("project_id") REFERENCES "public"."projects"("id") ON DELETE no action ON UPDATE no action;--> statement-breakpoint
ALTER TABLE "project_audit" ADD CONSTRAINT "project_audit_modified_by_users_id_fk" FOREIGN KEY ("modified_by") REFERENCES "public"."users"("id") ON DELETE no action ON UPDATE no action;--> statement-breakpoint
ALTER TABLE "project_images" ADD CONSTRAINT "project_images_project_id_projects_id_fk" FOREIGN KEY ("project_id") REFERENCES "public"."projects"("id") ON DELETE no action ON UPDATE no action;--> statement-breakpoint
ALTER TABLE "project_invites" ADD CONSTRAINT "project_invites_project_id_projects_id_fk" FOREIGN KEY ("project_id") REFERENCES "public"."projects"("id") ON DELETE cascade ON UPDATE no action;--> statement-breakpoint
ALTER TABLE "project_invites" ADD CONSTRAINT "project_invites_invited_by_id_users_id_fk" FOREIGN KEY ("invited_by_id") REFERENCES "public"."users"("id") ON DELETE no action ON UPDATE no action;--> statement-breakpoint
ALTER TABLE "project_invites" ADD CONSTRAINT "project_invites_discarded_by_users_id_fk" FOREIGN KEY ("discarded_by") REFERENCES "public"."users"("id") ON DELETE no action ON UPDATE no action;--> statement-breakpoint
ALTER TABLE "project_members" ADD CONSTRAINT "project_members_project_id_projects_id_fk" FOREIGN KEY ("project_id") REFERENCES "public"."projects"("id") ON DELETE no action ON UPDATE no action;--> statement-breakpoint
ALTER TABLE "project_members" ADD CONSTRAINT "project_members_user_id_users_id_fk" FOREIGN KEY ("user_id") REFERENCES "public"."users"("id") ON DELETE no action ON UPDATE no action;--> statement-breakpoint
ALTER TABLE "project_species" ADD CONSTRAINT "project_species_scientific_species_id_scientific_species_id_fk" FOREIGN KEY ("scientific_species_id") REFERENCES "public"."scientific_species"("id") ON DELETE no action ON UPDATE no action;--> statement-breakpoint
ALTER TABLE "project_species" ADD CONSTRAINT "project_species_project_id_projects_id_fk" FOREIGN KEY ("project_id") REFERENCES "public"."projects"("id") ON DELETE no action ON UPDATE no action;--> statement-breakpoint
ALTER TABLE "project_species" ADD CONSTRAINT "project_species_added_by_id_users_id_fk" FOREIGN KEY ("added_by_id") REFERENCES "public"."users"("id") ON DELETE no action ON UPDATE no action;--> statement-breakpoint
ALTER TABLE "project_species_images" ADD CONSTRAINT "project_species_images_species_id_project_species_id_fk" FOREIGN KEY ("species_id") REFERENCES "public"."project_species"("id") ON DELETE no action ON UPDATE no action;--> statement-breakpoint
ALTER TABLE "projects" ADD CONSTRAINT "projects_created_by_id_users_id_fk" FOREIGN KEY ("created_by_id") REFERENCES "public"."users"("id") ON DELETE no action ON UPDATE no action;--> statement-breakpoint
ALTER TABLE "site_analytics" ADD CONSTRAINT "site_analytics_project_id_projects_id_fk" FOREIGN KEY ("project_id") REFERENCES "public"."projects"("id") ON DELETE no action ON UPDATE no action;--> statement-breakpoint
ALTER TABLE "site_analytics" ADD CONSTRAINT "site_analytics_site_id_sites_id_fk" FOREIGN KEY ("site_id") REFERENCES "public"."sites"("id") ON DELETE no action ON UPDATE no action;--> statement-breakpoint
ALTER TABLE "site_analytics" ADD CONSTRAINT "site_analytics_analytics_job_id_analytics_jobs_id_fk" FOREIGN KEY ("analytics_job_id") REFERENCES "public"."analytics_jobs"("id") ON DELETE no action ON UPDATE no action;--> statement-breakpoint
ALTER TABLE "site_analytics" ADD CONSTRAINT "site_analytics_dominant_species_id_scientific_species_id_fk" FOREIGN KEY ("dominant_species_id") REFERENCES "public"."scientific_species"("id") ON DELETE no action ON UPDATE no action;--> statement-breakpoint
ALTER TABLE "site_images" ADD CONSTRAINT "site_images_site_id_sites_id_fk" FOREIGN KEY ("site_id") REFERENCES "public"."sites"("id") ON DELETE no action ON UPDATE no action;--> statement-breakpoint
ALTER TABLE "sites" ADD CONSTRAINT "sites_project_id_projects_id_fk" FOREIGN KEY ("project_id") REFERENCES "public"."projects"("id") ON DELETE cascade ON UPDATE no action;--> statement-breakpoint
ALTER TABLE "sites" ADD CONSTRAINT "sites_created_by_id_users_id_fk" FOREIGN KEY ("created_by_id") REFERENCES "public"."users"("id") ON DELETE no action ON UPDATE no action;--> statement-breakpoint
ALTER TABLE "species_analytics" ADD CONSTRAINT "species_analytics_project_id_projects_id_fk" FOREIGN KEY ("project_id") REFERENCES "public"."projects"("id") ON DELETE no action ON UPDATE no action;--> statement-breakpoint
ALTER TABLE "species_analytics" ADD CONSTRAINT "species_analytics_scientific_species_id_scientific_species_id_fk" FOREIGN KEY ("scientific_species_id") REFERENCES "public"."scientific_species"("id") ON DELETE no action ON UPDATE no action;--> statement-breakpoint
ALTER TABLE "species_analytics" ADD CONSTRAINT "species_analytics_analytics_job_id_analytics_jobs_id_fk" FOREIGN KEY ("analytics_job_id") REFERENCES "public"."analytics_jobs"("id") ON DELETE no action ON UPDATE no action;--> statement-breakpoint
ALTER TABLE "species_analytics" ADD CONSTRAINT "species_analytics_best_performing_site_id_sites_id_fk" FOREIGN KEY ("best_performing_site_id") REFERENCES "public"."sites"("id") ON DELETE no action ON UPDATE no action;--> statement-breakpoint
ALTER TABLE "species_analytics" ADD CONSTRAINT "species_analytics_worst_performing_site_id_sites_id_fk" FOREIGN KEY ("worst_performing_site_id") REFERENCES "public"."sites"("id") ON DELETE no action ON UPDATE no action;--> statement-breakpoint
ALTER TABLE "species_requests" ADD CONSTRAINT "species_requests_requested_by_id_users_id_fk" FOREIGN KEY ("requested_by_id") REFERENCES "public"."users"("id") ON DELETE cascade ON UPDATE no action;--> statement-breakpoint
ALTER TABLE "species_requests" ADD CONSTRAINT "species_requests_project_id_projects_id_fk" FOREIGN KEY ("project_id") REFERENCES "public"."projects"("id") ON DELETE cascade ON UPDATE no action;--> statement-breakpoint
ALTER TABLE "species_requests" ADD CONSTRAINT "species_requests_reviewed_by_id_users_id_fk" FOREIGN KEY ("reviewed_by_id") REFERENCES "public"."users"("id") ON DELETE no action ON UPDATE no action;--> statement-breakpoint
ALTER TABLE "trees" ADD CONSTRAINT "trees_intervention_id_interventions_id_fk" FOREIGN KEY ("intervention_id") REFERENCES "public"."interventions"("id") ON DELETE no action ON UPDATE no action;--> statement-breakpoint
ALTER TABLE "trees" ADD CONSTRAINT "trees_created_by_id_users_id_fk" FOREIGN KEY ("created_by_id") REFERENCES "public"."users"("id") ON DELETE no action ON UPDATE no action;--> statement-breakpoint
ALTER TABLE "user_activity" ADD CONSTRAINT "user_activity_user_id_users_id_fk" FOREIGN KEY ("user_id") REFERENCES "public"."users"("id") ON DELETE no action ON UPDATE no action;--> statement-breakpoint
ALTER TABLE "user_activity" ADD CONSTRAINT "user_activity_project_id_projects_id_fk" FOREIGN KEY ("project_id") REFERENCES "public"."projects"("id") ON DELETE no action ON UPDATE no action;--> statement-breakpoint
ALTER TABLE "user_engagement_analytics" ADD CONSTRAINT "user_engagement_analytics_project_id_projects_id_fk" FOREIGN KEY ("project_id") REFERENCES "public"."projects"("id") ON DELETE no action ON UPDATE no action;--> statement-breakpoint
ALTER TABLE "user_engagement_analytics" ADD CONSTRAINT "user_engagement_analytics_analytics_job_id_analytics_jobs_id_fk" FOREIGN KEY ("analytics_job_id") REFERENCES "public"."analytics_jobs"("id") ON DELETE no action ON UPDATE no action;--> statement-breakpoint
ALTER TABLE "user_migrations" ADD CONSTRAINT "user_migrations_user_id_users_id_fk" FOREIGN KEY ("user_id") REFERENCES "public"."users"("id") ON DELETE no action ON UPDATE no action;--> statement-breakpoint
CREATE INDEX "analytics_jobs_project_idx" ON "analytics_jobs" USING btree ("project_id");--> statement-breakpoint
CREATE INDEX "analytics_jobs_status_idx" ON "analytics_jobs" USING btree ("status");--> statement-breakpoint
CREATE INDEX "analytics_jobs_triggered_by_idx" ON "analytics_jobs" USING btree ("triggered_by_id");--> statement-breakpoint
CREATE INDEX "analytics_jobs_type_idx" ON "analytics_jobs" USING btree ("job_type");--> statement-breakpoint
CREATE INDEX "analytics_jobs_created_at_idx" ON "analytics_jobs" USING btree ("created_at");--> statement-breakpoint
CREATE INDEX "audit_logs_table_record_idx" ON "audit_logs" USING btree ("table_name","record_uid");--> statement-breakpoint
CREATE INDEX "audit_logs_user_idx" ON "audit_logs" USING btree ("changed_by");--> statement-breakpoint
CREATE INDEX "audit_logs_time_idx" ON "audit_logs" USING btree ("changed_at");--> statement-breakpoint
CREATE INDEX "geospatial_analytics_project_idx" ON "geospatial_analytics" USING btree ("project_id");--> statement-breakpoint
CREATE INDEX "geospatial_analytics_calculated_at_idx" ON "geospatial_analytics" USING btree ("calculated_at");--> statement-breakpoint
CREATE INDEX "geospatial_analytics_best_area_gist_idx" ON "geospatial_analytics" USING gist ("best_performing_area");--> statement-breakpoint
CREATE INDEX "geospatial_analytics_worst_area_gist_idx" ON "geospatial_analytics" USING gist ("worst_performing_area");--> statement-breakpoint
CREATE INDEX "intervention_analytics_project_idx" ON "intervention_analytics" USING btree ("project_id");--> statement-breakpoint
CREATE INDEX "intervention_analytics_calculated_at_idx" ON "intervention_analytics" USING btree ("calculated_at");--> statement-breakpoint
CREATE INDEX "intervention_analytics_most_successful_idx" ON "intervention_analytics" USING btree ("most_successful_intervention_type");--> statement-breakpoint
CREATE INDEX "intervention_images_intervention_id_idx" ON "intervention_images" USING btree ("intervention_id");--> statement-breakpoint
CREATE INDEX "intervention_records_intervention_idx" ON "intervention_records" USING btree ("intervention_id");--> statement-breakpoint
CREATE INDEX "intervention_updated_by_idx" ON "intervention_records" USING btree ("updated_by");--> statement-breakpoint
CREATE INDEX "interventions_project_idx" ON "interventions" USING btree ("project_id");--> statement-breakpoint
CREATE INDEX "interventions_project_site_idx" ON "interventions" USING btree ("project_site_id");--> statement-breakpoint
CREATE INDEX "parent_idx" ON "interventions" USING btree ("uid");--> statement-breakpoint
CREATE INDEX "interventions_user_idx" ON "interventions" USING btree ("user_id");--> statement-breakpoint
CREATE INDEX "interventions_type_idx" ON "interventions" USING btree ("type");--> statement-breakpoint
CREATE INDEX "user_migration_id_idx" ON "migration_logs" USING btree ("user_migration_id");--> statement-breakpoint
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
CREATE INDEX "project_analytics_project_idx" ON "project_analytics" USING btree ("project_id");--> statement-breakpoint
CREATE INDEX "project_analytics_calculated_at_idx" ON "project_analytics" USING btree ("calculated_at");--> statement-breakpoint
CREATE INDEX "project_analytics_version_idx" ON "project_analytics" USING btree ("version");--> statement-breakpoint
CREATE INDEX "project_analytics_history_project_idx" ON "project_analytics_history" USING btree ("project_id");--> statement-breakpoint
CREATE INDEX "project_analytics_history_period_idx" ON "project_analytics_history" USING btree ("period_start","period_end");--> statement-breakpoint
CREATE INDEX "project_analytics_history_project_period_idx" ON "project_analytics_history" USING btree ("project_id","period_start");--> statement-breakpoint
CREATE INDEX "project_species_project_idx" ON "project_audit" USING btree ("project_id");--> statement-breakpoint
CREATE INDEX "modified_by_idx" ON "project_audit" USING btree ("modified_by");--> statement-breakpoint
CREATE INDEX "project_images_site_id_idx" ON "project_images" USING btree ("project_id");--> statement-breakpoint
CREATE INDEX "project_invites_project_idx" ON "project_invites" USING btree ("project_id");--> statement-breakpoint
CREATE INDEX "project_invites_email_idx" ON "project_invites" USING btree ("email");--> statement-breakpoint
CREATE INDEX "project_invites_project_status_idx" ON "project_invites" USING btree ("project_id","status");--> statement-breakpoint
CREATE INDEX "project_members_project_idx" ON "project_members" USING btree ("project_id");--> statement-breakpoint
CREATE INDEX "project_members_user_idx" ON "project_members" USING btree ("user_id");--> statement-breakpoint
CREATE INDEX "project_members_role_idx" ON "project_members" USING btree ("project_role");--> statement-breakpoint
CREATE UNIQUE INDEX "unique_project_species" ON "project_species" USING btree ("project_id","scientific_species_id");--> statement-breakpoint
CREATE INDEX "project_species_scientific_species_idx" ON "project_species" USING btree ("scientific_species_id");--> statement-breakpoint
CREATE INDEX "project_species_projects_idx" ON "project_species" USING btree ("project_id");--> statement-breakpoint
CREATE INDEX "project_species_added_by_idx" ON "project_species" USING btree ("added_by_id");--> statement-breakpoint
CREATE INDEX "project_species_native_idx" ON "project_species" USING btree ("is_native_species");--> statement-breakpoint
CREATE INDEX "uid_species_image_idx" ON "project_species_images" USING btree ("uid");--> statement-breakpoint
CREATE INDEX "species_images_species_id_idx" ON "project_species_images" USING btree ("species_id");--> statement-breakpoint
CREATE INDEX "projects_location_gist_idx" ON "projects" USING gist ("location");--> statement-breakpoint
CREATE INDEX "projects_created_by_idx" ON "projects" USING btree ("created_by_id");--> statement-breakpoint
CREATE INDEX "scientific_species_name_idx" ON "scientific_species" USING btree ("scientific_name");--> statement-breakpoint
CREATE INDEX "scientific_species_uid_idx" ON "scientific_species" USING btree ("uid");--> statement-breakpoint
CREATE INDEX "site_analytics_project_idx" ON "site_analytics" USING btree ("project_id");--> statement-breakpoint
CREATE INDEX "site_analytics_site_idx" ON "site_analytics" USING btree ("site_id");--> statement-breakpoint
CREATE INDEX "site_analytics_survival_rank_idx" ON "site_analytics" USING btree ("survival_rate_rank");--> statement-breakpoint
CREATE INDEX "site_analytics_performance_rank_idx" ON "site_analytics" USING btree ("overall_performance_rank");--> statement-breakpoint
CREATE INDEX "site_analytics_calculated_at_idx" ON "site_analytics" USING btree ("calculated_at");--> statement-breakpoint
CREATE INDEX "site_images_site_id_idx" ON "site_images" USING btree ("site_id");--> statement-breakpoint
CREATE INDEX "site_images_primary_idx" ON "site_images" USING btree ("site_id","is_primary");--> statement-breakpoint
CREATE INDEX "sites_project_id_idx" ON "sites" USING btree ("project_id");--> statement-breakpoint
CREATE INDEX "sites_location_gist_idx" ON "sites" USING gist ("location");--> statement-breakpoint
CREATE UNIQUE INDEX "species_analytics_project_species_idx" ON "species_analytics" USING btree ("project_id","scientific_species_id");--> statement-breakpoint
CREATE INDEX "species_analytics_project_idx" ON "species_analytics" USING btree ("project_id");--> statement-breakpoint
CREATE INDEX "species_analytics_survival_rank_idx" ON "species_analytics" USING btree ("survival_rank");--> statement-breakpoint
CREATE INDEX "species_analytics_performance_rank_idx" ON "species_analytics" USING btree ("overall_performance_rank");--> statement-breakpoint
CREATE INDEX "species_analytics_calculated_at_idx" ON "species_analytics" USING btree ("calculated_at");--> statement-breakpoint
CREATE INDEX "species_requests_requested_by_idx" ON "species_requests" USING btree ("requested_by_id");--> statement-breakpoint
CREATE INDEX "trees_intervention_idx" ON "trees" USING btree ("intervention_id");--> statement-breakpoint
CREATE INDEX "trees_created_by_idx" ON "trees" USING btree ("created_by_id");--> statement-breakpoint
CREATE INDEX "trees_status_idx" ON "trees" USING btree ("status");--> statement-breakpoint
CREATE INDEX "trees_type_idx" ON "trees" USING btree ("treeType");--> statement-breakpoint
CREATE INDEX "trees_planting_date_idx" ON "trees" USING btree ("planting_date");--> statement-breakpoint
CREATE INDEX "trees_last_measurement_idx" ON "trees" USING btree ("last_measurement_date");--> statement-breakpoint
CREATE INDEX "trees_location_gist_idx" ON "trees" USING gist ("location");--> statement-breakpoint
CREATE INDEX "user_activity_user_idx" ON "user_activity" USING btree ("user_id");--> statement-breakpoint
CREATE INDEX "user_activity_project_idx" ON "user_activity" USING btree ("project_id");--> statement-breakpoint
CREATE INDEX "user_activity_type_idx" ON "user_activity" USING btree ("activity_type");--> statement-breakpoint
CREATE INDEX "user_activity_device_idx" ON "user_activity" USING btree ("device_type");--> statement-breakpoint
CREATE INDEX "user_activity_created_at_idx" ON "user_activity" USING btree ("created_at");--> statement-breakpoint
CREATE INDEX "user_activity_user_project_idx" ON "user_activity" USING btree ("user_id","project_id");--> statement-breakpoint
CREATE INDEX "user_engagement_analytics_project_idx" ON "user_engagement_analytics" USING btree ("project_id");--> statement-breakpoint
CREATE INDEX "user_engagement_analytics_calculated_at_idx" ON "user_engagement_analytics" USING btree ("calculated_at");--> statement-breakpoint
CREATE INDEX "user_engagement_analytics_hour_idx" ON "user_engagement_analytics" USING btree ("most_active_hour");--> statement-breakpoint
CREATE INDEX "user_engagement_analytics_day_idx" ON "user_engagement_analytics" USING btree ("most_active_day_of_week");--> statement-breakpoint
CREATE INDEX "user_id_idx" ON "user_migrations" USING btree ("user_id");
ALTER TABLE "project_species" RENAME COLUMN "custom_species_name" TO "species_name";--> statement-breakpoint
ALTER TABLE "project_species" RENAME COLUMN "custom_common_name" TO "common_name";--> statement-breakpoint
ALTER TABLE "project_species" RENAME COLUMN "custom_image" TO "image";--> statement-breakpoint
ALTER TABLE "project_species" DROP CONSTRAINT "unknown_species_logic";--> statement-breakpoint
ALTER TABLE "project_species" DROP CONSTRAINT "unknown_species_has_name";--> statement-breakpoint
ALTER TABLE "project_species" DROP CONSTRAINT "planned_quantity_positive";--> statement-breakpoint
ALTER TABLE "project_species" DROP CONSTRAINT "actual_quantity_non_negative";--> statement-breakpoint
ALTER TABLE "project_species" DROP CONSTRAINT "actual_not_exceed_planned";--> statement-breakpoint
ALTER TABLE "project_species" DROP CONSTRAINT "valid_priority";--> statement-breakpoint
DROP INDEX "project_species_active_idx";--> statement-breakpoint
DROP INDEX "project_species_usage_idx";--> statement-breakpoint
ALTER TABLE "project_species" ADD COLUMN "metadata" jsonb;--> statement-breakpoint
CREATE INDEX "scientific_species_id_Idx" ON "project_species" USING btree ("scientific_species_id");--> statement-breakpoint
ALTER TABLE "project_species" DROP COLUMN "planned_quantity";--> statement-breakpoint
ALTER TABLE "project_species" DROP COLUMN "actual_quantity";--> statement-breakpoint
ALTER TABLE "project_species" DROP COLUMN "priority";
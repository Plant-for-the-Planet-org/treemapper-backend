ALTER TABLE "intervention_species" RENAME COLUMN "planned_count" TO "species_count";--> statement-breakpoint
ALTER TABLE "intervention_species" DROP CONSTRAINT "planned_count_positive";--> statement-breakpoint
ALTER TABLE "intervention_species" ADD CONSTRAINT "species_count_positive" CHECK (species_count > 0);
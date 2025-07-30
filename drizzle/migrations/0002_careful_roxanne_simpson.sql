ALTER TABLE "project_species" ADD COLUMN "scientific_species_uid" text;--> statement-breakpoint
ALTER TABLE "project_species" ADD COLUMN "is_unknown" boolean DEFAULT false NOT NULL;--> statement-breakpoint
ALTER TABLE "project_species" ADD COLUMN "species_name" text;
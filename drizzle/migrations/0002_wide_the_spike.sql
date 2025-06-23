ALTER TABLE "intervention_species" ALTER COLUMN "uid" SET NOT NULL;--> statement-breakpoint
ALTER TABLE "intervention_species" ADD COLUMN "scientific_species_uid" varchar(50);
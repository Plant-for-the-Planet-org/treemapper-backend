ALTER TABLE "intervention_species" DROP CONSTRAINT "intervention_species_scientific_species_id_scientific_species_id_fk";
--> statement-breakpoint
ALTER TABLE "project_species" DROP CONSTRAINT "project_species_scientific_species_id_scientific_species_id_fk";
--> statement-breakpoint
ALTER TABLE "intervention_species" ALTER COLUMN "scientific_species_id" SET DATA TYPE varchar;--> statement-breakpoint
ALTER TABLE "project_species" ALTER COLUMN "scientific_species_id" SET DATA TYPE varchar;--> statement-breakpoint
ALTER TABLE "intervention_species" ADD CONSTRAINT "intervention_species_scientific_species_id_scientific_species_uid_fk" FOREIGN KEY ("scientific_species_id") REFERENCES "public"."scientific_species"("uid") ON DELETE no action ON UPDATE no action;--> statement-breakpoint
ALTER TABLE "project_species" ADD CONSTRAINT "project_species_scientific_species_id_scientific_species_uid_fk" FOREIGN KEY ("scientific_species_id") REFERENCES "public"."scientific_species"("uid") ON DELETE no action ON UPDATE no action;
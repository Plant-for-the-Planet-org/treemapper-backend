ALTER TABLE "interventions" ALTER COLUMN "updated_at" SET DEFAULT now();--> statement-breakpoint
ALTER TABLE "interventions" ALTER COLUMN "updated_at" SET NOT NULL;--> statement-breakpoint
ALTER TABLE "interventions" ADD COLUMN "planting_date" timestamp with time zone;
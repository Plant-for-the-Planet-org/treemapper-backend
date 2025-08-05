ALTER TABLE "intervention" RENAME COLUMN "start_date" TO "intervention_start_date";--> statement-breakpoint
ALTER TABLE "intervention" RENAME COLUMN "end_date" TO "intervention_end_date";--> statement-breakpoint
DROP INDEX "intervention_project_date_range_idx";--> statement-breakpoint
DROP INDEX "intervention_user_idx";--> statement-breakpoint
CREATE INDEX "intervention_project_date_range_idx" ON "intervention" USING btree ("project_id","intervention_start_date","status") WHERE deleted_at IS NULL;--> statement-breakpoint
CREATE INDEX "intervention_user_idx" ON "intervention" USING btree ("user_id","intervention_end_date") WHERE deleted_at IS NULL;
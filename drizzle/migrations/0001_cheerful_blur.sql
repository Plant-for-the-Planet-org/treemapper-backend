ALTER TABLE "bulk_invites" ADD COLUMN "deleted_at" timestamp with time zone;--> statement-breakpoint
CREATE INDEX "project_bulk_invites_deleted_at_idx" ON "bulk_invites" USING btree ("deleted_at");
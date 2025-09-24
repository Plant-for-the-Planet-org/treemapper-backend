ALTER TABLE "tree" RENAME COLUMN "current_height" TO "height";--> statement-breakpoint
ALTER TABLE "tree" RENAME COLUMN "current_width" TO "width";--> statement-breakpoint
ALTER TABLE "tree" ADD COLUMN "original_geometry" jsonb;
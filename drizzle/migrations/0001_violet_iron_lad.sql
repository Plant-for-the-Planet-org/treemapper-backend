ALTER TABLE "image" DROP CONSTRAINT "size_positive";--> statement-breakpoint
ALTER TABLE "image" DROP CONSTRAINT "dimensions_positive";--> statement-breakpoint
ALTER TABLE "image" DROP CONSTRAINT "reasonable_file_size";--> statement-breakpoint
ALTER TABLE "image" DROP CONSTRAINT "primary_image_logic";--> statement-breakpoint
ALTER TABLE "image" DROP CONSTRAINT "valid_mime_type";--> statement-breakpoint
ALTER TABLE "image" DROP CONSTRAINT "filename_required";
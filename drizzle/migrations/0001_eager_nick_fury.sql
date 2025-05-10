CREATE TYPE "public"."role" AS ENUM('superadmin', 'admin', 'viewer', 'contributor');--> statement-breakpoint
ALTER TABLE "users" ALTER COLUMN "name" DROP NOT NULL;--> statement-breakpoint
ALTER TABLE "users" ADD COLUMN "auth0_id" text;--> statement-breakpoint
ALTER TABLE "users" ADD COLUMN "role" "role" DEFAULT 'viewer' NOT NULL;
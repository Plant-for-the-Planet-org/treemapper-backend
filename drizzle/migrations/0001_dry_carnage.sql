CREATE TABLE "migration_request" (
	"id" serial PRIMARY KEY NOT NULL,
	"uid" text NOT NULL,
	"user_id" integer NOT NULL,
	"planet_id" text NOT NULL,
	"status" "migration_status" DEFAULT 'in_progress' NOT NULL,
	"created_at" timestamp with time zone DEFAULT now() NOT NULL,
	"updated_at" timestamp with time zone DEFAULT now() NOT NULL,
	"flag" boolean DEFAULT false,
	"flag_reason" jsonb,
	CONSTRAINT "migration_request_uid_unique" UNIQUE("uid"),
	CONSTRAINT "migration_request_planet_id_unique" UNIQUE("planet_id")
);
--> statement-breakpoint
ALTER TABLE "migration_request" ADD CONSTRAINT "migration_request_user_id_user_id_fk" FOREIGN KEY ("user_id") REFERENCES "public"."user"("id") ON DELETE cascade ON UPDATE no action;--> statement-breakpoint
CREATE INDEX "migration_request_id_idx" ON "migration_request" USING btree ("user_id");
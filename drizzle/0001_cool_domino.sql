CREATE TABLE "user_metadata" (
	"user_id" uuid PRIMARY KEY NOT NULL,
	"roles" jsonb DEFAULT '["user"]'::jsonb NOT NULL,
	"last_login" timestamp DEFAULT now() NOT NULL,
	"updated_at" timestamp DEFAULT now() NOT NULL
);
--> statement-breakpoint
ALTER TABLE "user_metadata" ADD CONSTRAINT "user_metadata_user_id_users_id_fk" FOREIGN KEY ("user_id") REFERENCES "public"."users"("id") ON DELETE no action ON UPDATE no action;
ALTER TABLE "audit_log" DROP CONSTRAINT "valid_entity_id";--> statement-breakpoint
ALTER TABLE "audit_log" DROP CONSTRAINT "valid_source";--> statement-breakpoint
ALTER TABLE "audit_log" DROP CONSTRAINT "occurred_at_not_future";
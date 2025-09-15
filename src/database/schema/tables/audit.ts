import {
  pgTable,
  text,
  timestamp,
  integer,
  jsonb,
  serial,
  index,
} from 'drizzle-orm/pg-core';
import { sql } from 'drizzle-orm';
import { user } from './user';
import { workspace } from './workspace';
import { project } from './project';
import { auditEntityEnum, auditActionEnum } from '../enums';

export const auditLog = pgTable(
  'audit_log',
  {
    id: serial('id').primaryKey(),
    uid: text('uid').notNull().unique(),
    action: auditActionEnum('action').notNull(),
    entityType: auditEntityEnum('entity_type').notNull(),
    entityId: integer('entity_id').notNull(),
    entityUid: text('entity_uid'),
    userId: integer('user_id').references(() => user.id, {
      onDelete: 'set null',
    }),
    workspaceId: integer('workspace_id').references(() => workspace.id, {
      onDelete: 'set null',
    }),
    projectId: integer('project_id').references(() => project.id, {
      onDelete: 'set null',
    }),
    oldValues: jsonb('old_values'),
    newValues: jsonb('new_values'),
    changedFields: text('changed_fields').array(),
    source: text('source').default('web'),
    ipAddress: text('ip_address'),
    occurredAt: timestamp('occurred_at', { withTimezone: true })
      .defaultNow()
      .notNull(),
  },
  (table) => ({
    entityAuditIdx: index('audit_log_entity_audit_idx').on(
      table.entityType,
      table.entityId,
      table.occurredAt,
    ),
    userActivityIdx: index('audit_log_user_activity_idx')
      .on(table.userId, table.occurredAt)
      .where(sql`user_id IS NOT NULL`),
    workspaceAuditIdx: index('audit_log_workspace_audit_idx')
      .on(table.workspaceId, table.occurredAt)
      .where(sql`workspace_id IS NOT NULL`),
  }),
);

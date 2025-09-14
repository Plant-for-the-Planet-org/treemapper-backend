import {
  pgTable,
  text,
  timestamp,
  integer,
  uuid,
  serial,
  index,
  check,
} from 'drizzle-orm/pg-core';
import { projectRoleEnum, inviteStatusEnum } from '../enums';
import { user } from './user';
import { project } from './project';
import { sql } from 'drizzle-orm';

export const bulkInvite = pgTable(
  'bulk_invite',
  {
    id: serial('id').primaryKey(),
    uid: text('uid').notNull().unique(),
    projectId: integer('project_id')
      .notNull()
      .references(() => project.id, { onDelete: 'cascade' }),
    emailDomainRestrictions: text('email_domain_restrictions')
      .array()
      .default([]),
    message: text('message'),
    projectRole: projectRoleEnum('project_role')
      .notNull()
      .default('contributor'),
    invitedById: integer('invited_by_id')
      .notNull()
      .references(() => user.id, { onDelete: 'cascade' }),
    discardedById: integer('discarded_by_id').references(() => user.id, {
      onDelete: 'set null',
    }),
    discardedAt: timestamp('discarded_at', { withTimezone: true }),
    status: inviteStatusEnum('status').notNull().default('pending'),
    token: uuid('token').defaultRandom().notNull().unique(),
    expiresAt: timestamp('expires_at', { withTimezone: true }).notNull(),
    maxUses: integer('max_uses').default(100),
    currentUses: integer('current_uses').default(0),
    totalInvitesSent: integer('total_invites_sent').default(0),
    totalAccepted: integer('total_accepted').default(0),
    createdAt: timestamp('created_at', { withTimezone: true })
      .defaultNow()
      .notNull(),
    updatedAt: timestamp('updated_at', { withTimezone: true })
      .defaultNow()
      .notNull()
      .$onUpdate(() => new Date()),
    deletedAt: timestamp('deleted_at', { withTimezone: true }),
  },
  (table) => ({
    projectActiveInvitesIdx: index('bulk_invite_project_active_idx')
      .on(table.projectId, table.status)
      .where(sql`deleted_at IS NULL`),
    tokenLookupIdx: index('bulk_invite_token_active_idx')
      .on(table.token, table.status)
      .where(sql`status = 'pending' AND deleted_at IS NULL`),
    expiresInFuture: check('expires_in_future', sql`expires_at > created_at`),
    maxUsesPositive: check(
      'max_uses_positive',
      sql`max_uses IS NULL OR max_uses > 0`,
    ),
    currentUsesValid: check(
      'current_uses_valid',
      sql`current_uses >= 0 AND (max_uses IS NULL OR current_uses <= max_uses)`,
    ),
    analyticsValid: check(
      'analytics_valid',
      sql`total_invites_sent >= 0 AND total_accepted >= 0 AND total_accepted <= total_invites_sent`,
    ),
    expiredOrDiscardedNotPending: check(
      'expired_or_discarded_not_pending',
      sql`(status != 'expired' OR expires_at <= NOW()) AND (status != 'discarded' OR discarded_by_id IS NOT NULL)`,
    ),
    discardedHasTimestamp: check(
      'discarded_has_timestamp',
      sql`discarded_by_id IS NULL OR discarded_at IS NOT NULL`,
    ),
    validEmailDomains: check(
      'valid_email_domains',
      sql`array_length(email_domain_restrictions, 1) IS NULL OR array_length(email_domain_restrictions, 1) > 0`,
    ),
  }),
);

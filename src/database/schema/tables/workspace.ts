import {
  pgTable,
  text,
  timestamp,
  integer,
  boolean,
  jsonb,
  serial,
  index,
  check,
  unique,
} from 'drizzle-orm/pg-core';
import {
  workspaceTypeEnum,
  workspaceRoleEnum,
  memberStatusEnum,
} from '../enums';
import { sql } from 'drizzle-orm';
import { user } from './user';

export const workspace = pgTable(
  'workspace',
  {
    id: serial('id').primaryKey(),
    uid: text('uid').notNull().unique(),
    name: text('name').notNull(),
    slug: text('slug').notNull().unique(),
    type: workspaceTypeEnum('type').notNull(),
    description: text('description'),
    image: text('image'),
    primaryColor: text('primary_color'),
    secondaryColor: text('secondary_color'),
    email: text('email'),
    phone: text('phone'),
    website: text('website'),
    address: text('address'),
    isActive: boolean('is_active').default(true).notNull(),
    createdById: integer('created_by_id').references(() => user.id),
    createdAt: timestamp('created_at', { withTimezone: true })
      .defaultNow()
      .notNull(),
    updatedAt: timestamp('updated_at', { withTimezone: true })
      .defaultNow()
      .notNull()
      .$onUpdate(() => new Date()),
    deletedAt: timestamp('deleted_at', { withTimezone: true }),
    metadata: jsonb('metadata'),
  },
  (table) => ({
    slugFormat: check(
      'slug_format',
      sql`slug ~* '^[a-z0-9-]+$' AND length(slug) >= 3`,
    ),
    emailFormat: check(
      'email_format',
      sql`email IS NULL OR email ~* '^[A-Za-z0-9._%+-]+@[A-Za-z0-9.-]+\.[A-Za-z]{2,}$'`,
    ),
    createdByIdx: index('workspace_created_by_idx').on(table.createdById),
  }),
);

export const workspaceMember = pgTable(
  'workspace_member',
  {
    id: serial('id').primaryKey(),
    uid: text('uid').notNull().unique(),
    workspaceId: integer('workspace_id')
      .notNull()
      .references(() => workspace.id, { onDelete: 'cascade' }),
    userId: integer('user_id')
      .notNull()
      .references(() => user.id, { onDelete: 'cascade' }),
    role: workspaceRoleEnum('role').notNull().default('member'),
    status: memberStatusEnum('status').default('active'),
    joinedAt: timestamp('joined_at', { withTimezone: true })
      .defaultNow()
      .notNull(),
    invitedAt: timestamp('invited_at', { withTimezone: true }),
    invitedById: integer('invited_by_id').references(() => user.id, {
      onDelete: 'set null',
    }),
    lastActiveAt: timestamp('last_active_at', { withTimezone: true }),
    createdAt: timestamp('created_at', { withTimezone: true })
      .defaultNow()
      .notNull(),
    updatedAt: timestamp('updated_at', { withTimezone: true })
      .defaultNow()
      .notNull(),
    metadata: jsonb('metadata'),
  },
  (table) => ({
    uniqueMembership: unique('unique_workspace_membership').on(
      table.workspaceId,
      table.userId,
    ),
    workspaceIdx: index('workspace_members_workspace_idx').on(
      table.workspaceId,
    ),
    userIdx: index('workspace_members_user_idx').on(table.userId),
    joinedAfterInvited: check(
      'joined_after_invited',
      sql`invited_at IS NULL OR joined_at >= invited_at`,
    ),
    activeStatusLogic: check(
      'active_status_logic',
      sql`status != 'active' OR joined_at IS NOT NULL`,
    ),
  }),
);

import {
  pgTable,
  text,
  timestamp,
  boolean,
  jsonb,
  serial,
  char,
  check,
} from 'drizzle-orm/pg-core';
import { userTypeEnum, workspaceRoleEnum } from '..';
import { sql } from 'drizzle-orm';
import { FlagReasonEntry } from '../type';

export const user = pgTable(
  'user',
  {
    id: serial('id').primaryKey(),
    uid: text('uid').notNull().unique(),
    auth0Id: text('auth0_id').notNull().unique(),
    email: text('email').notNull().unique(),
    firstName: text('first_name'),
    lastName: text('last_name'),
    displayName: text('display_name').notNull(),
    primaryWorkspaceUid: text('primary_workspace_uid'),
    primaryProjectUid: text('primary_project_uid'),
    image: text('image'),
    slug: text('slug').unique().notNull(),
    type: userTypeEnum('type').default('individual'),
    country: char('country', { length: 3 }),
    website: text('website'),
    isPrivate: boolean('is_private').default(false).notNull(),
    isActive: boolean('is_active').default(true).notNull(),
    bio: text('bio'),
    locale: text('locale').default('en'),
    createdAt: timestamp('created_at', { withTimezone: true })
      .defaultNow()
      .notNull(),
    updatedAt: timestamp('updated_at', { withTimezone: true })
      .defaultNow()
      .notNull()
      .$onUpdate(() => new Date()),
    flag: boolean('flag').default(false),
    flagReason: jsonb('flag_reason').$type<FlagReasonEntry[]>(),
    deletedAt: timestamp('deleted_at', { withTimezone: true }),
    migratedAt: timestamp('migrated_at', { withTimezone: true }),
    existingPlanetUser: boolean('existing_planet_user').default(false),
    workspaceRole: workspaceRoleEnum('workspace_role').default('member'),
    v3ApprovedAt: timestamp('v3_approved_at', { withTimezone: true }),
  },
  () => ({
    emailFormat: check(
      'email_format',
      sql`email ~* '^[A-Za-z0-9._%+-]+@[A-Za-z0-9.-]+\.[A-Za-z]{2,}$'`,
    ),
  }),
);

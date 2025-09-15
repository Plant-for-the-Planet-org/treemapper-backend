import {
  pgTable,
  customType,
  serial,
  text,
  integer,
  char,
  boolean,
  jsonb,
  timestamp,
  index,
  check,
  unique,
  uuid,
} from 'drizzle-orm/pg-core';
import { sql } from 'drizzle-orm';
import { user } from './user';
import {
  projectRoleEnum,
  memberStatusEnum,
  siteAccessEnum,
  inviteStatusEnum,
} from '../enums';
import { workspace } from './workspace';
import { bulkInvite } from './bulkInvite';

export type FlagLevel = 'error' | 'warning' | 'info';
export type FlagEntity = 'location' | 'species' | 'measurements';

export interface FlagReasonEntry {
  uid: string;
  type: FlagEntity;
  level: FlagLevel;
  title: string;
  message: string;
  updatedAt: Date;
  createdAt: Date;
}

interface GeoJSONGeometry {
  type: 'Point' | 'Polygon' | 'MultiPolygon';
  coordinates: number[] | number[][] | number[][][];
}

const geometryWithGeoJSON = (srid?: number) =>
  customType<{
    data: GeoJSONGeometry;
    driverData: string;
  }>({
    dataType() {
      return srid ? `geometry(Geometry,${srid})` : 'geometry';
    },
    toDriver(value: any): string {
      if (typeof value === 'object') {
        return `ST_GeomFromGeoJSON('${JSON.stringify(value)}')`;
      }
      return `ST_GeomFromText('${value}')`;
    },
    fromDriver(value: string): any {
      return value;
    },
  });

export const project = pgTable(
  'project',
  {
    id: serial('id').primaryKey(),
    uid: text('uid').notNull().unique(),
    createdById: integer('created_by_id')
      .notNull()
      .references(() => user.id, { onDelete: 'cascade' }),
    workspaceId: integer('workspace_id')
      .notNull()
      .references(() => workspace.id, { onDelete: 'cascade' }),
    slug: text('slug').notNull().unique(),
    name: text('name').notNull(),
    description: text('description'),
    purpose: text('purpose'),
    type: text('type'),
    ecosystem: text('ecosystem'),
    scale: text('scale'),
    classification: text('classification'),
    target: integer('target'),
    originalGeometry: jsonb('original_geometry'),
    website: text('website'),
    image: text('image'),
    videoUrl: text('video_url'),
    country: char('country', { length: 3 }),
    location: geometryWithGeoJSON(4326)('location'),
    isActive: boolean('is_active').notNull().default(true),
    isPublic: boolean('is_public').default(true).notNull(),
    isPrimary: boolean('is_primary').default(false).notNull(),
    isPersonal: boolean('is_personal').default(false).notNull(),
    intensity: integer('intensity'),
    revisionPeriodicity: text('revision_periodicity'),
    migratedProject: boolean('migrated_project').default(false),
    flag: boolean('flag').default(false),
    flagReason: jsonb('flag_reason').$type<FlagReasonEntry[]>(),
    metadata: jsonb('metadata'),
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
    workspaceProjectsIdx: index('project_workspace_active_idx').on(
      table.workspaceId,
      table.isActive,
      table.isPublic,
    ),
    userProjectsIdx: index('project_user_projects_idx').on(
      table.createdById,
      table.isActive,
    ),
    locationIdx: index('project_location_gist_idx').using(
      'gist',
      table.location,
    ),
    targetPositive: check('target_positive', sql`target IS NULL OR target > 0`),
    validScale: check(
      'valid_scale',
      sql`scale IS NULL OR scale IN ('small', 'medium', 'large', 'enterprise')`,
    ),
    websiteFormat: check(
      'website_format',
      sql`website IS NULL OR website ~* '^https?://'`,
    ),
    primaryProjectLogic: check(
      'primary_project_logic',
      sql`is_primary = false OR (is_primary = true AND is_active = true)`,
    ),
    flaggedProjectReason: check(
      'flagged_project_reason',
      sql`flag = false OR flag_reason IS NOT NULL`,
    ),
  }),
);

export const projectMember = pgTable(
  'project_member',
  {
    id: serial('id').primaryKey(),
    uid: text('uid').notNull().unique(),
    projectId: integer('project_id')
      .notNull()
      .references(() => project.id, { onDelete: 'cascade' }),
    userId: integer('user_id')
      .notNull()
      .references(() => user.id, { onDelete: 'cascade' }),
    projectRole: projectRoleEnum('project_role')
      .notNull()
      .default('contributor'),
    invitedAt: timestamp('invited_at', { withTimezone: true }),
    invitedById: integer('invited_by_id').references(() => user.id, {
      onDelete: 'set null',
    }),
    joinedAt: timestamp('joined_at', { withTimezone: true }),
    lastActiveAt: timestamp('last_active_at', { withTimezone: true }),
    status: memberStatusEnum('status').default('active'),
    siteAccess: siteAccessEnum('site_access').default('all_sites').notNull(),
    restrictedSites: text('restricted_sites').array().default([]),
    bulkInviteId: integer('bulk_invite_id').references(() => bulkInvite.id, {
      onDelete: 'set null',
    }),
    createdAt: timestamp('created_at', { withTimezone: true })
      .defaultNow()
      .notNull(),
    updatedAt: timestamp('updated_at', { withTimezone: true })
      .defaultNow()
      .notNull(),
    deletedAt: timestamp('deleted_at', { withTimezone: true }), // 🔧 ADD: Soft delete
  },
  (table) => ({
    uniqueMember: unique('unique_project_member').on(
      table.projectId,
      table.userId,
    ),
    projectMembersIdx: index('project_members_active_idx')
      .on(table.projectId, table.status)
      .where(sql`deleted_at IS NULL`),
    userProjectsIdx: index('project_members_user_active_idx')
      .on(table.userId, table.status)
      .where(sql`deleted_at IS NULL`),
    joinedAfterInvited: check(
      'joined_after_invited',
      sql`invited_at IS NULL OR joined_at IS NULL OR joined_at >= invited_at`,
    ),
    activeMemberJoined: check(
      'active_member_joined',
      sql`status != 'active' OR joined_at IS NOT NULL`,
    ),
    inviterNotSelf: check(
      'inviter_not_self',
      sql`invited_by_id IS NULL OR invited_by_id != user_id`,
    ),
    restrictedSitesValidAccess: check(
      'restricted_sites_valid_access',
      sql`site_access != 'limited_access' OR array_length(restricted_sites, 1) > 0`,
    ),
  }),
);

export const projectInvites = pgTable(
  'project_invite',
  {
    id: serial('id').primaryKey(),
    uid: text('uid').notNull().unique(),
    projectId: integer('project_id')
      .notNull()
      .references(() => project.id, { onDelete: 'cascade' }),
    email: text('email').notNull(),
    message: text('message'),
    projectRole: projectRoleEnum('project_role')
      .notNull()
      .default('contributor'),
    invitedById: integer('invited_by_id')
      .notNull()
      .references(() => user.id, { onDelete: 'set null' }),
    discardedById: integer('discarded_by_id').references(() => user.id, {
      onDelete: 'set null',
    }),
    discardedAt: timestamp('discarded_at', { withTimezone: true }),
    status: inviteStatusEnum('status').notNull().default('pending'),
    token: uuid('token').defaultRandom().notNull().unique(),
    expiresAt: timestamp('expires_at', { withTimezone: true }).notNull(),
    acceptedAt: timestamp('accepted_at', { withTimezone: true }),
    sentAt: timestamp('sent_at', { withTimezone: true }),
    deliveredAt: timestamp('delivered_at', { withTimezone: true }),
    retryCount: integer('retry_count').default(0),
    inviteHash: text('invite_hash'),
    createdAt: timestamp('created_at', { withTimezone: true })
      .defaultNow()
      .notNull(),
    updatedAt: timestamp('updated_at', { withTimezone: true })
      .defaultNow()
      .notNull()
      .$onUpdate(() => new Date()),
  },
  (table) => ({
    projectInvitesIdx: index('project_invite_project_status_idx').on(
      table.projectId,
      table.status,
    ),
    tokenLookupIdx: index('project_invite_token_active_idx')
      .on(table.token, table.status)
      .where(sql`status = 'pending'`),
    inviterIdx: index('project_invite_inviter_idx').on(
      table.invitedById,
      table.createdAt,
    ),
    acceptedBeforeExpiry: check(
      'accepted_before_expiry',
      sql`accepted_at IS NULL OR accepted_at <= expires_at`,
    ),
    expiresInFuture: check('expires_in_future', sql`expires_at > created_at`),
    validEmail: check(
      'valid_email',
      sql`email ~* '^[A-Za-z0-9._%+-]+@[A-Za-z0-9.-]+\.[A-Za-z]{2,}$'`,
    ),
    acceptedStatusHasTimestamp: check(
      'accepted_status_has_timestamp',
      sql`status != 'accepted' OR accepted_at IS NOT NULL`,
    ),
    discardedStatusHasDetails: check(
      'discarded_status_has_details',
      sql`status != 'discarded' OR (discarded_by_id IS NOT NULL AND discarded_at IS NOT NULL)`,
    ),
    expiredStatusAfterExpiry: check(
      'expired_status_after_expiry',
      sql`status != 'expired' OR expires_at <= NOW()`,
    ),
    retryCountValid: check(
      'retry_count_valid',
      sql`retry_count >= 0 AND retry_count <= 5`,
    ), // Max 5 retry attempts
    deliveredAfterSent: check(
      'delivered_after_sent',
      sql`delivered_at IS NULL OR sent_at IS NULL OR delivered_at >= sent_at`,
    ),
  }),
);

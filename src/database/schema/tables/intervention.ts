import {
  pgTable,
  text,
  timestamp,
  integer,
  boolean,
  jsonb,
  doublePrecision,
  serial,
  index,
  check,
} from 'drizzle-orm/pg-core';
import {
  interventionTypeEnum,
  interventionStatusEnum,
  captureModeEnum,
  captureStatusEnum,
} from '../enums';
import { user } from './user';
import { project } from './project';
import { site } from './site';
import { sql } from 'drizzle-orm';
import { FlagReasonEntry } from '../type';
import { geometryWithGeoJSON } from '../utils';

export const intervention = pgTable(
  'intervention',
  {
    id: serial('id').primaryKey(),
    uid: text('uid').notNull().unique(),
    hid: text('hid').notNull().unique(),
    userId: integer('user_id')
      .notNull()
      .references(() => user.id, { onDelete: 'set null' }),
    projectId: integer('project_id')
      .notNull()
      .references(() => project.id, { onDelete: 'cascade' }),
    siteId: integer('site_id').references(() => site.id, {
      onDelete: 'set null',
    }),
    type: interventionTypeEnum('type').notNull(),
    status: interventionStatusEnum('status').default('planned'),
    idempotencyKey: text('idempotency_key').unique().notNull(),
    registrationDate: timestamp('registration_date', {
      withTimezone: true,
    }).notNull(),
    interventionStartDate: timestamp('intervention_start_date', {
      withTimezone: true,
    }).notNull(),
    interventionEndDate: timestamp('intervention_end_date', {
      withTimezone: true,
    }).notNull(),
    location: geometryWithGeoJSON(4326)('location'),
    area: doublePrecision('area'),
    totalTreeCount: integer('total_tree_count').default(0),
    totalSampleTreeCount: integer('total_sample_tree_count').default(0),
    captureMode: captureModeEnum('capture_mode').notNull().default('on-site'),
    captureStatus: captureStatusEnum('capture_status')
      .notNull()
      .default('complete'),
    deviceLocation: jsonb('device_location'),
    originalGeometry: jsonb('original_geometry'),
    description: text('description'),
    image: text('image'),
    isPrivate: boolean('is_private').default(false).notNull(),
    flag: boolean('flag').default(false),
    editedAt: timestamp('edited_at', { withTimezone: true }),
    flagReason: jsonb('flag_reason').$type<FlagReasonEntry[]>(),
    migratedIntervention: boolean('migrated_intervention').default(false),
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
    projectDateRangeIdx: index('intervention_project_date_range_idx')
      .on(table.projectId, table.interventionStartDate, table.status)
      .where(sql`deleted_at IS NULL`),
    projectTypeStatusIdx: index('intervention_project_type_status_idx')
      .on(table.projectId, table.type, table.status)
      .where(sql`deleted_at IS NULL`),
    locationIdx: index('intervention_location_gist_idx').using(
      'gist',
      table.location,
    ),
    userInterventionsIdx: index('intervention_user_idx')
      .on(table.userId, table.interventionEndDate)
      .where(sql`deleted_at IS NULL`),
    validDateRange: check(
      'valid_date_range',
      sql`intervention_start_date <= intervention_end_date`,
    ),
    areaPositive: check('area_positive', sql`area IS NULL OR area >= 0`),
    treeCountsNonNegative: check(
      'tree_counts_non_negative',
      sql`total_tree_count >= 0 AND total_sample_tree_count >= 0`,
    ),
    flaggedHasReason: check(
      'flagged_has_reason',
      sql`flag = false OR flag_reason IS NOT NULL`,
    ),
    registrationNotFuture: check(
      'registration_not_future',
      sql`registration_date <= NOW()`,
    ),
  }),
);

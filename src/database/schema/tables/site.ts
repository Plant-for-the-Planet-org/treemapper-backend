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
} from 'drizzle-orm/pg-core';
import { project } from './project';
import { user } from './user';
import { geometryWithGeoJSON } from '../utils';
import { siteStatusEnum } from '../enums';
import { sql } from 'drizzle-orm';
import { FlagReasonEntry } from '../type';

export const site = pgTable(
  'site',
  {
    id: serial('id').primaryKey(),
    uid: text('uid').notNull().unique(),
    projectId: integer('project_id')
      .notNull()
      .references(() => project.id, { onDelete: 'cascade' }),
    name: text('name').notNull(),
    description: text('description'),
    location: geometryWithGeoJSON(4326)('location'),
    area: doublePrecision('area'),
    status: siteStatusEnum('status').default('planning'),
    soilType: text('soil_type'),
    elevation: doublePrecision('elevation'),
    slope: doublePrecision('slope'),
    aspect: text('aspect'),
    waterAccess: boolean('water_access').default(false),
    accessibility: text('accessibility'),
    plannedPlantingDate: timestamp('planned_planting_date', {
      withTimezone: true,
    }),
    actualPlantingDate: timestamp('actual_planting_date', {
      withTimezone: true,
    }),
    expectedTreeCount: integer('expected_tree_count'),
    image: text('image'),
    createdById: integer('created_by_id')
      .notNull()
      .references(() => user.id, { onDelete: 'set null' }),
    migratedSite: boolean('migrated_site').default(false),
    flag: boolean('flag').default(false),
    flagReason: jsonb('flag_reason').$type<FlagReasonEntry[]>(),
    metadata: jsonb('metadata'),
    originalGeometry: jsonb('original_geometry'),
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
    projectSitesIdx: index('site_project_active_idx')
      .on(table.projectId, table.status)
      .where(sql`deleted_at IS NULL`),
    locationIdx: index('site_location_gist_idx').using('gist', table.location),
    createdByIdx: index('site_created_by_idx').on(table.createdById),
  }),
);

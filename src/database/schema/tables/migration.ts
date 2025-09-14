import {
  pgTable,
  text,
  timestamp,
  integer,
  boolean,
  jsonb,
  serial,
  index,
} from 'drizzle-orm/pg-core';
import { migrationStatusEnum, entityEnum, logLevelEnum } from '../enums';
import { FlagReasonEntry } from '../type';
import { user } from './user';

export const migrationRequest = pgTable(
  'migration_request',
  {
    id: serial('id').primaryKey(),
    uid: text('uid').notNull().unique(),
    userId: integer('user_id')
      .notNull()
      .references(() => user.id, { onDelete: 'cascade' }),
    status: migrationStatusEnum('status').default('in_progress').notNull(),
    createdAt: timestamp('created_at', { withTimezone: true })
      .defaultNow()
      .notNull(),
    updatedAt: timestamp('updated_at', { withTimezone: true })
      .defaultNow()
      .notNull()
      .$onUpdate(() => new Date()),
    flag: boolean('flag').default(false),
    flagReason: jsonb('flag_reason').$type<FlagReasonEntry[]>(),
  },
  (table) => ({
    migrationReqeuestIdIdx: index('migration_request_id_idx').on(table.userId),
  }),
);

export const migration = pgTable(
  'migration',
  {
    id: serial('id').primaryKey(),
    uid: text('uid').notNull().unique(),
    userId: integer('user_id')
      .notNull()
      .references(() => user.id, { onDelete: 'cascade' }),
    planetId: text('planet_id').notNull().unique(),
    status: migrationStatusEnum('status').default('in_progress').notNull(),
    migratedEntities: jsonb('migrated_entities')
      .$type<{
        user: boolean;
        projects: boolean;
        sites: boolean;
        species: boolean;
        interventions: boolean;
        images: boolean;
      }>()
      .default({
        user: false,
        projects: false,
        sites: false,
        species: false,
        interventions: false,
        images: false,
      }),
    migrationCompletedAt: timestamp('migration_completed_at', {
      withTimezone: true,
    }),
    errorMessage: text('error_message'),
    retryCount: integer('retry_count').default(0),
    migrationVersion: text('migration_version').default('1.0'),
    metadata: jsonb('metadata'),
    createdAt: timestamp('created_at', { withTimezone: true })
      .defaultNow()
      .notNull(),
    updatedAt: timestamp('updated_at', { withTimezone: true })
      .defaultNow()
      .notNull()
      .$onUpdate(() => new Date()),
    flag: boolean('flag').default(false),
    flagReason: jsonb('flag_reason').$type<FlagReasonEntry[]>(),
  },
  (table) => ({
    migrationIdIdx: index('migration_id_idx').on(table.userId),
  }),
);

export const migrationLog = pgTable(
  'migration_log',
  {
    id: serial('id').primaryKey(),
    migrationId: integer('migration_id')
      .notNull()
      .references(() => migration.id, { onDelete: 'cascade' }),
    uid: text('uid').notNull(),
    level: logLevelEnum('level').notNull(),
    message: text('message').notNull(),
    entity: entityEnum('entity'),
    entityId: text('entity_id'),
    stackTrace: text('stack_trace'),
    createdAt: timestamp('created_at', { withTimezone: true })
      .defaultNow()
      .notNull(),
  },
  (table) => ({
    migrationLogsIdx: index('migration_logs_idx').on(table.migrationId),
  }),
);

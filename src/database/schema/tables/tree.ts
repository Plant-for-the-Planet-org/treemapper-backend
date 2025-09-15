import {
  pgTable,
  text,
  timestamp,
  integer,
  boolean,
  jsonb,
  decimal,
  serial,
  index,
  doublePrecision,
  check,
} from 'drizzle-orm/pg-core';
import { intervention } from './intervention';
import { interventionSpecies } from './species';
import { user } from './user';
import { treeTypeEnum, treeStatusEnum, recordTypeEnum } from '../enums';
import { geometryWithGeoJSON } from '../utils';
import { sql } from 'drizzle-orm';
import { FlagReasonEntry } from '../type';

export const tree = pgTable(
  'tree',
  {
    id: serial('id').primaryKey(),
    hid: text('hid').notNull().unique(),
    uid: text('uid').notNull().unique(),
    interventionId: integer('intervention_id')
      .notNull()
      .references(() => intervention.id, { onDelete: 'cascade' }),
    interventionSpeciesId: integer('intervention_species_id')
      .notNull()
      .references(() => interventionSpecies.id, { onDelete: 'restrict' }),
    speciesName: text('species_name'),
    commonName: text('common_name'),
    isUknown: boolean('is_unknown'),
    createdById: integer('created_by_id')
      .notNull()
      .references(() => user.id, { onDelete: 'set null' }),
    tag: text('tag'),
    treeType: treeTypeEnum('tree_type').default('sample'),
    location: geometryWithGeoJSON(4326)('location'),
    originalGeometry: jsonb('original_geometry'),
    altitude: decimal('altitude', { precision: 8, scale: 2 }),
    accuracy: decimal('accuracy', { precision: 6, scale: 2 }),
    latitude: doublePrecision('latitude'),
    longitude: doublePrecision('longitude'),
    currentHeight: doublePrecision('current_height'),
    currentWidth: doublePrecision('current_width'),
    currentHealthScore: integer('current_health_score'),
    status: treeStatusEnum('status').default('alive').notNull(),
    statusReason: text('status_reason'),
    statusChangedAt: timestamp('status_changed_at', { withTimezone: true }),
    plantingDate: timestamp('planting_date', { withTimezone: true }),
    lastMeasurementDate: timestamp('last_measurement_date', {
      withTimezone: true,
    }),
    nextMeasurementDate: timestamp('next_measurement_date', {
      withTimezone: true,
    }),
    image: text('image'),
    remeasured: boolean('remeasured').default(false),
    migratedTree: boolean('migrated_tree').default(false),
    flag: boolean('flag').default(false),
    flagReason: jsonb('flag_reason').$type<FlagReasonEntry[]>(),
    createdAt: timestamp('created_at', { withTimezone: true })
      .defaultNow()
      .notNull(),
    updatedAt: timestamp('updated_at', { withTimezone: true })
      .defaultNow()
      .notNull(),
    deletedAt: timestamp('deleted_at', { withTimezone: true }),
  },
  (table) => ({
    remeasuredIdx: index('tree_intervention_remeasured_idx').on(
      table.interventionId,
      table.remeasured,
    ),
    interventionTreesIdx: index('tree_intervention_status_idx')
      .on(table.interventionId, table.status)
      .where(sql`deleted_at IS NULL`),
    speciesTreesIdx: index('tree_species_idx').on(
      table.interventionSpeciesId,
      table.status,
    ),
    measurementScheduleIdxmeasurementScheduleIdx: index(
      'tree_measurement_schedule_idx',
    )
      .on(table.nextMeasurementDate, table.status)
      .where(
        sql`next_measurement_date IS NOT NULL AND status = 'alive' AND deleted_at IS NULL`,
      ),
    healthMonitoringIdx: index('tree_health_monitoring_idx')
      .on(table.currentHealthScore, table.lastMeasurementDate)
      .where(sql`current_health_score IS NOT NULL AND deleted_at IS NULL`),
    heightWidthPositive: check(
      'height_width_positive',
      sql`(current_height IS NULL OR current_height >= 0) AND (current_width IS NULL OR current_width >= 0)`,
    ),
    altitudeRange: check(
      'altitude_range',
      sql`altitude IS NULL OR (altitude >= -500 AND altitude <= 9000)`,
    ),
    accuracyPositive: check(
      'accuracy_positive',
      sql`accuracy IS NULL OR accuracy >= 0`,
    ),
    healthScoreRange: check(
      'health_score_range',
      sql`current_health_score IS NULL OR (current_health_score >= 0 AND current_health_score <= 100)`,
    ),
    deadTreeHasReason: check(
      'dead_tree_has_reason',
      sql`status != 'dead' OR status_reason IS NOT NULL`,
    ),
    statusChangedAtLogic: check(
      'status_changed_at_logic',
      sql`status_changed_at IS NULL OR status_changed_at <= NOW()`,
    ),
    measurementDateLogic: check(
      'measurement_date_logic',
      sql`last_measurement_date IS NULL OR next_measurement_date IS NULL OR next_measurement_date > last_measurement_date`,
    ),
  }),
);

export const treeRecord = pgTable(
  'tree_record',
  {
    id: serial('id').primaryKey(),
    uid: text('uid').notNull().unique(),
    treeId: integer('tree_id')
      .notNull()
      .references(() => tree.id, { onDelete: 'cascade' }),
    recordedById: integer('recorded_by_id')
      .notNull()
      .references(() => user.id, { onDelete: 'set null' }),
    recordType: recordTypeEnum('record_type').notNull(),
    recordedAt: timestamp('recorded_at', { withTimezone: true }).notNull(),
    height: doublePrecision('height'),
    width: doublePrecision('width'),
    healthScore: integer('health_score'),
    vitalityScore: integer('vitality_score'),
    previousStatus: treeStatusEnum('previous_status'),
    newStatus: treeStatusEnum('new_status'),
    statusReason: text('status_reason'),
    findings: text('findings'),
    findingsSeverity: text('findings_severity'),
    notes: text('notes'),
    priorityLevel: text('priority_level'),
    weatherConditions: jsonb('weather_conditions'),
    soilConditions: jsonb('soil_conditions'),
    pestsObserved: jsonb('pests_observed'),
    diseasesObserved: jsonb('diseases_observed'),
    damageObserved: jsonb('damage_observed'),
    growthRate: decimal('growth_rate', { precision: 6, scale: 3 }),
    leafDensity: text('leaf_density'),
    fruitingStatus: text('fruiting_status'),
    surroundingVegetation: text('surrounding_vegetation'),
    recommendedActions: jsonb('recommended_actions'),
    image: text('image'),
    deviceLocation: jsonb('device_location'),
    isPublic: boolean('is_public').default(true).notNull(),
    createdAt: timestamp('created_at', { withTimezone: true })
      .defaultNow()
      .notNull(),
    updatedAt: timestamp('updated_at', { withTimezone: true })
      .defaultNow()
      .notNull(),
    deletedAt: timestamp('deleted_at', { withTimezone: true }),
  },
  (table) => ({
    treeLatestRecordIdx: index('tree_record_latest_idx')
      .on(table.treeId, table.recordedAt)
      .where(sql`deleted_at IS NULL`),
    priorityRecordsIdx: index('tree_record_priority_idx')
      .on(table.priorityLevel, table.recordedAt)
      .where(sql`priority_level IN ('high', 'urgent') AND deleted_at IS NULL`),
    healthTrendsIdx: index('tree_record_health_trends_idx')
      .on(table.treeId, table.healthScore, table.recordedAt)
      .where(sql`health_score IS NOT NULL AND deleted_at IS NULL`),
    healthVitalityRange: check(
      'health_vitality_range',
      sql`(health_score IS NULL OR (health_score >= 0 AND health_score <= 100)) AND (vitality_score IS NULL OR (vitality_score >= 0 AND vitality_score <= 100))`,
    ),
    measurementsPositive: check(
      'measurements_positive',
      sql`(height IS NULL OR height >= 0) AND (width IS NULL OR width >= 0)`,
    ),
    recordedAtNotFuture: check(
      'recorded_at_not_future',
      sql`recorded_at <= NOW()`,
    ),
    statusChangeLogic: check(
      'status_change_logic',
      sql`(previous_status IS NULL AND new_status IS NULL) OR (previous_status IS NOT NULL AND new_status IS NOT NULL)`,
    ),
    validSeverity: check(
      'valid_severity',
      sql`findings_severity IS NULL OR findings_severity IN ('low', 'medium', 'high', 'critical')`,
    ),
    validPriority: check(
      'valid_priority',
      sql`priority_level IS NULL OR priority_level IN ('low', 'normal', 'high', 'urgent')`,
    ),
  }),
);

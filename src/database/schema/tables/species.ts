import {
  pgTable,
  text,
  timestamp,
  integer,
  boolean,
  unique,
  jsonb,
  doublePrecision,
  serial,
  index,
  check,
} from 'drizzle-orm/pg-core';
import { project } from './project';
import { user } from './user';
import { sql } from 'drizzle-orm';
import { speciesRequestStatusEnum } from '../enums';

export const scientificSpecies = pgTable(
  'scientific_species',
  {
    id: serial('id').primaryKey(),
    uid: text('uid').notNull().unique(),
    scientificName: text('scientific_name').notNull().unique(),
    commonName: text('common_name'),
    kingdom: text('kingdom').default('Plantae'),
    phylum: text('phylum').default('Tracheophyta'),
    class: text('class').default('Magnoliopsida'),
    order: text('order'),
    family: text('family'),
    genus: text('genus'),
    species: text('species'),
    subspecies: text('subspecies'),
    cultivar: text('cultivar'),
    habitat: text('habitat').array().default([]),
    nativeRegions: text('native_regions').array().default([]),
    climateZones: text('climate_zones').array().default([]),
    soilTypes: text('soil_types').array().default([]),
    drainagePreference: text('drainage_preference'),
    phTolerance: text('ph_tolerance'),
    saltTolerance: text('salt_tolerance'),
    matureHeight: doublePrecision('mature_height'),
    matureWidth: doublePrecision('mature_width'),
    growthRate: text('growth_rate'),
    lifespan: integer('lifespan'),
    rootSystem: text('root_system'),
    lightRequirement: text('light_requirement'),
    waterRequirement: text('water_requirement'),
    temperatureMinimum: doublePrecision('temperature_minimum'),
    temperatureMaximum: doublePrecision('temperature_maximum'),
    frostTolerance: boolean('frost_tolerance').default(false),
    droughtTolerance: boolean('drought_tolerance').default(false),
    conservationStatus: text('conservation_status'),
    isNative: boolean('is_native').default(true),
    isInvasive: boolean('is_invasive').default(false),
    isEndangered: boolean('is_endangered').default(false),
    isProtected: boolean('is_protected').default(false),
    wildlifeValue: text('wildlife_value'),
    pollinatorFriendly: boolean('pollinator_friendly').default(false),
    carbonSequestration: text('carbon_sequestration'),
    erosionControl: boolean('erosion_control').default(false),
    windbreakSuitability: boolean('windbreak_suitability').default(false),
    bestPlantingMonths: integer('best_planting_months').array().default([]),
    propagationMethod: text('propagation_method').array().default([]),
    seedTreatment: text('seed_treatment'),
    plantingSpacing: doublePrecision('planting_spacing'),
    companionSpecies: text('companion_species').array().default([]),
    description: text('description'),
    image: text('image'),
    additionalImages: text('additional_images').array().default([]),
    gbifId: text('gbif_id'),
    iplantId: text('iucn_id'),
    wikipediaUrl: text('wikipedia_url'),
    dataQuality: text('data_quality').default('pending'),
    verifiedById: integer('verified_by_id').references(() => user.id, {
      onDelete: 'set null',
    }),
    verifiedAt: timestamp('verified_at', { withTimezone: true }),
    dataSource: text('data_source'),
    createdAt: timestamp('created_at', { withTimezone: true })
      .defaultNow()
      .notNull(),
    updatedAt: timestamp('updated_at', { withTimezone: true })
      .defaultNow()
      .notNull(),
    deletedAt: timestamp('deleted_at', { withTimezone: true }),
    metadata: jsonb('metadata'),
  },
  (table) => ({
    scientificNameIdx: index('species_scientific_name_idx').on(
      table.scientificName,
    ),
    commonNameIdx: index('species_common_name_idx').on(table.commonName),
    familyGenusIdx: index('species_family_genus_idx').on(
      table.family,
      table.genus,
    ),
    habitatClimateIdx: index('species_habitat_climate_idx').using(
      'gin',
      table.habitat,
      table.climateZones,
    ),
    soilDrainageIdx: index('species_soil_drainage_idx').on(
      table.soilTypes,
      table.drainagePreference,
    ),
    conservationNativeIdx: index('species_conservation_native_idx').on(
      table.conservationStatus,
      table.isNative,
      table.isEndangered,
    ),
    growthSizeIdx: index('species_growth_size_idx').on(
      table.growthRate,
      table.matureHeight,
      table.lifespan,
    ),
    matureHeightPositive: check(
      'mature_height_positive',
      sql`mature_height IS NULL OR mature_height > 0`,
    ),
    matureWidthPositive: check(
      'mature_width_positive',
      sql`mature_width IS NULL OR mature_width > 0`,
    ),
    lifespanPositive: check(
      'lifespan_positive',
      sql`lifespan IS NULL OR lifespan > 0`,
    ),
    plantingSpacingPositive: check(
      'planting_spacing_positive',
      sql`planting_spacing IS NULL OR planting_spacing > 0`,
    ),
    validTemperatureRange: check(
      'valid_temperature_range',
      sql`temperature_minimum IS NULL OR temperature_maximum IS NULL OR temperature_minimum <= temperature_maximum`,
    ),
    validGrowthRate: check(
      'valid_growth_rate',
      sql`growth_rate IS NULL OR growth_rate IN ('slow', 'moderate', 'fast')`,
    ),
    validLightRequirement: check(
      'valid_light_requirement',
      sql`light_requirement IS NULL OR light_requirement IN ('full-sun', 'partial-shade', 'full-shade', 'adaptable')`,
    ),
    validWaterRequirement: check(
      'valid_water_requirement',
      sql`water_requirement IS NULL OR water_requirement IN ('low', 'moderate', 'high')`,
    ),
    validDataQuality: check(
      'valid_data_quality',
      sql`data_quality IN ('verified', 'pending', 'draft')`,
    ),
    validConservationStatus: check(
      'valid_conservation_status',
      sql`conservation_status IS NULL OR conservation_status IN ('LC', 'NT', 'VU', 'EN', 'CR', 'EW', 'EX', 'DD')`,
    ),
    verifiedHasVerifier: check(
      'verified_has_verifier',
      sql`data_quality != 'verified' OR (verified_by_id IS NOT NULL AND verified_at IS NOT NULL)`,
    ),
    nativeNotInvasive: check(
      'native_not_invasive',
      sql`NOT (is_native = true AND is_invasive = true)`,
    ),
    validPlantingMonths: check(
      'valid_planting_months',
      sql`array_length(best_planting_months, 1) IS NULL OR (array_length(best_planting_months, 1) <= 12 AND best_planting_months <@ ARRAY[1,2,3,4,5,6,7,8,9,10,11,12])`,
    ),
  }),
);

export const projectSpecies = pgTable(
  'project_species',
  {
    id: serial('id').primaryKey(),
    uid: text('uid').notNull().unique(),
    projectId: integer('project_id')
      .notNull()
      .references(() => project.id, { onDelete: 'cascade' }),
    scientificSpeciesId: integer('scientific_species_id').references(
      () => scientificSpecies.id,
      { onDelete: 'set null' },
    ),
    isUnknown: boolean('is_unknown').default(false).notNull(),
    speciesName: text('species_name'),
    commonName: text('common_name'),
    image: text('image'),
    notes: text('notes'),
    favourite: boolean('favourite').default(false).notNull(),
    isDisabled: boolean('is_disabled').default(false),
    addedById: integer('added_by_id')
      .notNull()
      .references(() => user.id, { onDelete: 'set null' }),
    metadata: jsonb('metadata'),
    createdAt: timestamp('created_at', { withTimezone: true })
      .defaultNow()
      .notNull(),
    updatedAt: timestamp('updated_at', { withTimezone: true })
      .defaultNow()
      .notNull(),
    deletedAt: timestamp('deleted_at', { withTimezone: true }),
  },
  (table) => ({
    uniqueProjectSpecies: unique('unique_project_species').on(
      table.projectId,
      table.scientificSpeciesId,
    ),
    scientificSpeciesIdIdx: index('scientific_species_id_Idx').on(
      table.scientificSpeciesId,
    ),
  }),
);
export const speciesRequest = pgTable(
  'species_request',
  {
    id: serial('id').primaryKey(),
    uid: text('uid').notNull().unique(),
    scientificName: text('scientific_name').notNull(),
    commonName: text('common_name'),
    description: text('description'),
    requestReason: text('request_reason').notNull(),
    family: text('family'),
    habitat: text('habitat'),
    nativeRegion: text('native_region'),
    conservationStatus: text('conservation_status'),
    gbifId: text('gbif_id'),
    wikipediaUrl: text('wikipedia_url'),
    sourceUrl: text('source_url'),
    requestedById: integer('requested_by_id')
      .notNull()
      .references(() => user.id, { onDelete: 'cascade' }),
    projectId: integer('project_id').references(() => project.id, {
      onDelete: 'cascade',
    }),
    urgency: text('urgency').default('normal'),
    status: speciesRequestStatusEnum('status').notNull().default('pending'),
    reviewedById: integer('reviewed_by_id').references(() => user.id, {
      onDelete: 'set null',
    }),
    reviewedAt: timestamp('reviewed_at', { withTimezone: true }),
    adminNotes: text('admin_notes'),
    rejectionReason: text('rejection_reason'),
    createdSpeciesId: integer('created_species_id').references(
      () => scientificSpecies.id,
    ),
    duplicateOfRequestId: integer('duplicate_of_request_id').references(
      () => speciesRequest.id,
    ),
    createdAt: timestamp('created_at', { withTimezone: true })
      .defaultNow()
      .notNull(),
    updatedAt: timestamp('updated_at', { withTimezone: true })
      .defaultNow()
      .notNull(),
    deletedAt: timestamp('deleted_at', { withTimezone: true }),
  },
  (table) => ({
    adminReviewQueueIdx: index('species_request_review_queue_idx')
      .on(table.status, table.urgency, table.createdAt)
      .where(sql`status = 'pending'`),
    userRequestsIdx: index('species_request_user_idx').on(
      table.requestedById,
      table.status,
      table.createdAt,
    ),
    projectRequestsIdx: index('species_request_project_idx')
      .on(table.projectId, table.status)
      .where(sql`project_id IS NOT NULL`),
    scientificNameDuplicateIdx: index('species_request_duplicate_idx')
      .on(table.scientificName, table.status)
      .where(sql`status IN ('pending', 'approved')`),
  }),
);

export const interventionSpecies = pgTable(
  'intervention_species',
  {
    id: serial('id').primaryKey(),
    uid: text('uid').notNull().unique(),
    interventionId: integer('intervention_id')
      .notNull()
      .references(() => intervention.id, { onDelete: 'cascade' }),
    scientificSpeciesId: integer('scientific_species_id').references(
      () => scientificSpecies.id,
      { onDelete: 'set null' },
    ),
    isUnknown: boolean('is_unknown').default(false).notNull(),
    speciesName: text('species_name'),
    commonName: text('common_name'),
    speciesCount: integer('species_count').notNull(),
    createdAt: timestamp('created_at', { withTimezone: true })
      .defaultNow()
      .notNull(),
    updatedAt: timestamp('updated_at', { withTimezone: true })
      .defaultNow()
      .notNull(),
    deletedAt: timestamp('deleted_at', { withTimezone: true }),
  },
  (table) => ({
    interventionSpeciesIdx: index('intervention_species_intervention_idx').on(
      table.interventionId,
    ),
    unknownSpeciesLogic: check(
      'unknown_species_logic',
      sql`(is_unknown = false AND scientific_species_id IS NOT NULL) OR (is_unknown = true AND scientific_species_id IS NULL)`,
    ),
    speciesCountPositive: check(
      'species_count_positive',
      sql`species_count > 0`,
    ),
  }),
);

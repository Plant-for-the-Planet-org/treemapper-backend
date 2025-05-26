// src/database/schema/index.ts
import {
  pgTable,
  text,
  timestamp,
  pgEnum,
  integer,
  uuid,
  boolean,
  unique,
  jsonb,
  doublePrecision,
  date,
  varchar,
  decimal,
  real,
  serial,
  index,
  uniqueIndex,
  check,
} from 'drizzle-orm/pg-core';
import { relations, sql } from 'drizzle-orm';
import { customType } from 'drizzle-orm/pg-core';

// ============================================================================
// CUSTOM TYPES
// ============================================================================

const geometry = (srid?: number) =>
  customType<{
    data: any; // GeoJSON object
    driverData: any; // raw string or binary from PostGIS
  }>({
    dataType() {
      return srid ? `geometry(Geometry,${srid})` : 'geometry';
    },
    toDriver(value: any): any {
      return value;
    },
    fromDriver(value: any): any {
      return value;
    },
  });

// ============================================================================
// ENUMS - CONVERTED FROM ARRAYS FOR TYPE SAFETY
// ============================================================================

// User and project enums
export const projectRoleEnum = pgEnum('project_role', ['owner', 'admin', 'manager','contributor','observer','researcher',]);
export const inviteStatusEnum = pgEnum('invite_status', ['pending', 'accepted', 'declined', 'expired']);
export const userTypeEnum = pgEnum('user_type', ['individual', 'education', 'tpo', 'organization', 'student']);

// Site and tree enums
export const siteStatusEnum = pgEnum('site_status', ['planted', 'planting', 'barren', 'reforestation']);
export const treeStatusEnum = pgEnum('tree_status', ['alive', 'dead', 'unknown', 'removed']);

// Intervention enums
export const interventionTypeEnum = pgEnum('intervention_type', [
  'assisting-seed-rain',
  'control-livestock',
  'direct-seeding',
  'enrichment-planting',
  'fencing',
  'fire-patrol',
  'fire-suppression',
  'firebreaks',
  'generic-tree-registration',
  'grass-suppression',
  'liberating-regenerant',
  'maintenance',
  'marking-regenerant',
  'multi-tree-registration',
  'other-intervention',
  'plot-plant-registration',
  'removal-invasive-species',
  'sample-tree-registration',
  'single-tree-registration',
  'soil-improvement',
  'stop-tree-harvesting',
  'multi',
  'single',
  'sample'
]);

export const captureModeEnum = pgEnum('capture_mode', ['on_site', 'off_site', 'external']);
export const captureStatusEnum = pgEnum('capture_status', ['complete', 'partial', 'incomplete']);
export const allocationPriorityEnum = pgEnum('allocation_priority', ['manual', 'automatic', 'high', 'medium', 'low']);
export const interventionDiscriminatorEnum = pgEnum('intervention_discriminator', ['base', 'generic', 'plot', 'sample', 'intervention']);
export const interventionStatusEnum = pgEnum('intervention_status', ['active', 'completed', 'cancelled', 'pending', 'failed']);

// Coordinate and measurement enums
export const coordinateTypeEnum = pgEnum('coordinate_type', ['gps', 'manual', 'estimated']);
export const captureModeMethodEnum = pgEnum('capture_method', ['device', 'map', 'survey']);

// Image and media enums
export const imageTypeEnum = pgEnum('image_type', ['before', 'during', 'after', 'detail', 'overview', 'progress', 'aerial', 'ground']);

// Report enums
export const reportTypeEnum = pgEnum('report_type', ['monthly', 'quarterly', 'annual', 'incident', 'progress']);

// Audit enums
export const auditOperationEnum = pgEnum('audit_operation', ['insert', 'update', 'delete']);

// ============================================================================
// USERS TABLE
// ============================================================================

export const users = pgTable('users', {
  id: serial('id').primaryKey(),
  guid: varchar('guid', { length: 36 }).notNull().unique(),
  auth0Id: text('auth0_id').notNull().unique(),
  email: text('email').notNull().unique(),
  authName: text('auth_name').notNull(),
  name: text('name'),
  firstname: text('firstname'),
  lastname: text('lastname'),
  displayName: text('display_name'),
  avatar: text('avatar'),
  slug: text('slug'),
  type: userTypeEnum('type').default('individual'),
  country: varchar('country', { length: 2 }),
  url: text('url'),
  supportPin: text('support_pin'),
  isPrivate: boolean('is_private').default(false).notNull(),
  bio: text('bio'),
  locale: varchar('locale', { length: 10 }).default('en_US'),
  isActive: boolean('is_active').default(true).notNull(),
  lastLoginAt: timestamp('last_login_at'),
  createdAt: timestamp('created_at', { withTimezone: true }).defaultNow().notNull(),
  updatedAt: timestamp('updated_at', { withTimezone: true }).defaultNow().notNull(),
  deletedAt: timestamp('deleted_at'),
}, (table) => ({
  emailIdx: index('users_email_idx').on(table.email),
  auth0IdIdx: index('users_auth0_id_idx').on(table.auth0Id),
  typeIdx: index('users_type_idx').on(table.type),
  activeIdx: index('users_active_idx').on(table.isActive)
}));

// ============================================================================
// PROJECTS TABLE
// ============================================================================

export const projects = pgTable('projects', {
  id: serial('id').primaryKey(),
  guid: varchar('guid', { length: 36 }).notNull().unique(),
  // uid: varchar('uid', { length: 64 }).unique(),
  // remoteUid: varchar('remote_uid', { length: 255 }),
  discr: varchar('discr', { length: 20 }).notNull().default('base'),
  createdById: integer('created_by_id').notNull().references(() => users.id),
  slug: varchar('slug', { length: 255 }).notNull().unique(),
  purpose: varchar('purpose', { length: 64 }),
  projectName: varchar('name', { length: 255 }).notNull(),
  projectType: text('project_type'),
  ecosystem: text('ecosystem'),
  projectScale: text('project_scale'),
  target: integer('target'),
  projectWebsite: text('project_website'),
  description: text('description'),
  classification: text('classification'),
  image: varchar('image', { length: 255 }),
  videoUrl: text('video_url'),
  country: varchar('country', { length: 2 }),
  location: geometry(4326)('location'),
  originalGeometry: text('original_geometry'),
  geoLatitude: real('geo_latitude'),
  geoLongitude: real('geo_longitude'),
  url: text('url'),
  linkText: text('link_text'),
  isActive: boolean('is_active').notNull().default(true),
  isPublic: boolean('is_public').default(true).notNull(),
  intensity: varchar('intensity', { length: 100 }),
  revisionPeriodicityLevel: varchar('revision_periodicity_level', { length: 100 }),
  metadata: jsonb('metadata'), // Expected: { customFields: object, settings: object }
  createdAt: timestamp('created_at').defaultNow().notNull(),
  updatedAt: timestamp('updated_at').defaultNow().notNull(),
  deletedAt: timestamp('deleted_at'),
}, (table) => ({
  locationIdx: index('projects_location_gist_idx').using('gist', table.location)
}));

// ============================================================================
// PROJECT MEMBERS TABLE
// ============================================================================

export const projectMembers = pgTable('project_members', {
  id: serial('id').primaryKey(),
  projectId: integer('project_id').notNull().references(() => projects.id, { onDelete: 'cascade' }),
  userId: integer('user_id').notNull().references(() => users.id, { onDelete: 'cascade' }),
  role: projectRoleEnum('role').notNull().default('contributor'),
  invitedAt: timestamp('invited_at'),
  joinedAt: timestamp('joined_at').defaultNow(),
  createdAt: timestamp('created_at').defaultNow().notNull(),
  updatedAt: timestamp('updated_at').defaultNow().notNull(),
}, (table) => ({
  uniqueMember: unique('unique_project_member').on(table.projectId, table.userId),
  projectIdIdx: index('project_members_project_idx').on(table.projectId),
  userIdIdx: index('project_members_user_idx').on(table.userId),
  roleIdx: index('project_members_role_idx').on(table.role),
}));

// ============================================================================
// PROJECT INVITES TABLE
// ============================================================================

export const projectInvites = pgTable('project_invites', {
  id: serial('id').primaryKey(),
  projectId: integer('project_id').notNull().references(() => projects.id, { onDelete: 'cascade' }),
  email: text('email').notNull(),
  message: text('message').default(''),
  role: projectRoleEnum('role').notNull().default('contributor'),
  invitedById: integer('invited_by_id').notNull().references(() => users.id),
  status: inviteStatusEnum('status').notNull().default('pending'),
  token: uuid('token').defaultRandom().notNull().unique(),
  expiresAt: timestamp('expires_at').notNull(),
  acceptedAt: timestamp('accepted_at'),
  createdAt: timestamp('created_at').defaultNow().notNull(),
  updatedAt: timestamp('updated_at').defaultNow().notNull(),
}, (table) => ({
  uniqueInvite: unique('unique_project_invite').on(table.projectId, table.email, table.status),
  projectIdIdx: index('project_invites_project_idx').on(table.projectId),
  emailIdx: index('project_invites_email_idx').on(table.email),
  statusIdx: index('project_invites_status_idx').on(table.status),
  tokenIdx: index('project_invites_token_idx').on(table.token),
  expiresAtIdx: index('project_invites_expires_idx').on(table.expiresAt),
}));

// ============================================================================
// SCIENTIFIC SPECIES TABLE
// ============================================================================

export const scientificSpecies = pgTable('scientific_species', {
  id: serial('id').primaryKey(),
  guid: varchar('guid', { length: 36 }).notNull().unique(),

  // Scientific classification
  scientificName: varchar('scientific_name', { length: 255 }).notNull().unique(),
  commonName: varchar('common_name', { length: 255 }),
  family: varchar('family', { length: 100 }),
  genus: varchar('genus', { length: 100 }),
  species: varchar('species', { length: 100 }),

  // Additional taxonomic information
  kingdom: varchar('kingdom', { length: 50 }),
  phylum: varchar('phylum', { length: 50 }),
  class: varchar('class', { length: 50 }),
  order: varchar('order', { length: 50 }),

  // Characteristics
  description: text('description'),
  defaultImage: text('default_image'),
  habitat: text('habitat'),
  nativeRegions: varchar('native_regions', { length: 500 }),

  // Tree-specific data
  maxHeight: varchar('max_height', { length: 50 }),
  maxDiameter: varchar('max_diameter', { length: 50 }),
  lifespan: varchar('lifespan', { length: 50 }),

  // External identifiers
  gbifId: varchar('gbif_id', { length: 50 }), // Global Biodiversity Information Facility
  iplantId: varchar('iplant_id', { length: 50 }),

  // Status and verification
  isVerified: boolean('is_verified').default(false).notNull(),
  isActive: boolean('is_active').default(true).notNull(),

  // Timestamps
  createdAt: timestamp('created_at').defaultNow().notNull(),
  updatedAt: timestamp('updated_at').defaultNow().notNull(),
  deletedAt: timestamp('deleted_at'),
  metadata: jsonb('metadata'), // Expected: { traits: object, references: array }
}, (table) => ({
  scientificNameIdx: index('scientific_species_name_idx').on(table.scientificName),
  familyIdx: index('scientific_species_family_idx').on(table.family),
  genusIdx: index('scientific_species_genus_idx').on(table.genus),
  verifiedIdx: index('scientific_species_verified_idx').on(table.isVerified),
  activeIdx: index('scientific_species_active_idx').on(table.isActive),
  // Composite index for taxonomic searches
  taxonomyIdx: index('scientific_species_taxonomy_idx').on(table.family, table.genus, table.species),
}));

// ============================================================================
// USER SPECIES TABLE
// ============================================================================

export const userSpecies = pgTable('user_species', {
  id: serial('id').primaryKey(),
  guid: varchar('guid', { length: 36 }).notNull().unique(),

  // Foreign keys
  scientificSpeciesId: integer('scientific_species_id').notNull().references(() => scientificSpecies.id),
  userId: integer('user_id').notNull().references(() => users.id, { onDelete: 'cascade' }),

  // User-defined properties
  aliases: varchar('aliases', { length: 255 }),
  localName: varchar('local_name', { length: 255 }),
  customImage: text('custom_image'),
  image: varchar('image', { length: 255 }),
  description: varchar('description', { length: 255 }),
  notes: text('notes'),

  // Additional user-specific metadata
  localUses: text('local_uses'),
  personalNotes: text('personal_notes'),

  // Location-specific information
  localHabitat: text('local_habitat'),
  growthConditions: text('growth_conditions'),

  // User preferences
  isFavorite: boolean('is_favorite').default(false).notNull(),
  isPrivate: boolean('is_private').default(false).notNull(),

  // Timestamps
  createdAt: timestamp('created_at').defaultNow().notNull(),
  updatedAt: timestamp('updated_at').defaultNow().notNull(),
  deletedAt: timestamp('deleted_at'),
  metadata: jsonb('metadata'), // Expected: { customAttributes: object }
}, (table) => ({
  uniqueUserSpecies: uniqueIndex('unique_user_species').on(table.userId, table.scientificSpeciesId),
  scientificSpeciesIdx: index('user_species_scientific_species_idx').on(table.scientificSpeciesId),
  userIdx: index('user_species_user_idx').on(table.userId),
  aliasesIdx: index('user_species_aliases_idx').on(table.aliases),
  favoriteIdx: index('user_species_favorite_idx').on(table.isFavorite),
}));

// ============================================================================
// SPECIES IMAGES TABLE
// ============================================================================

export const speciesImages = pgTable('species_images', {
  id: serial('id').primaryKey(),
  guid: varchar('guid', { length: 36 }).notNull().unique(),
  speciesId: integer('species_id').notNull().references(() => userSpecies.id, { onDelete: 'cascade' }),

  // Image details
  filename: varchar('filename', { length: 255 }).notNull(),
  originalName: varchar('original_name', { length: 255 }),
  mimeType: varchar('mime_type', { length: 100 }),
  size: integer('size'),

  // Image metadata
  caption: varchar('caption', { length: 500 }),
  description: text('description'),
  imageType: imageTypeEnum('image_type').default('detail'),

  // Organization
  isMainImage: boolean('is_main_image').default(false).notNull(),

  // Timestamps
  createdAt: timestamp('created_at').defaultNow().notNull(),
  updatedAt: timestamp('updated_at').defaultNow().notNull(),
}, (table) => ({
  speciesIdIdx: index('species_images_species_id_idx').on(table.speciesId),
  typeIdx: index('species_images_type_idx').on(table.imageType),
  mainImageIdx: index('species_images_main_idx').on(table.speciesId, table.isMainImage),
  // Check constraints
  sizeCheck: check('species_images_size_check', sql`size IS NULL OR size > 0`)
}));

// ============================================================================
// SITES TABLE
// ============================================================================

export const sites = pgTable('sites', {
  id: serial('id').primaryKey(),
  guid: varchar('guid', { length: 36 }).notNull().unique(),
  projectId: integer('project_id').notNull().references(() => projects.id, { onDelete: 'cascade' }),

  // Basic site information
  name: varchar('name', { length: 255 }).notNull(),
  description: text('description'),
  // Geographic data
  location: geometry(4326)('boundary'),
  geometry: jsonb('geometry'), // Expected: GeoJSON Point/Polygon

  status: siteStatusEnum('status').default('barren'),

  // Site metrics
  area: decimal('area', { precision: 12, scale: 4 }), // Area in hectares
  plantingDate: timestamp('planting_date'),
  targetTreeCount: integer('target_tree_count'),
  plantedTreeCount: integer('planted_tree_count').default(0).notNull(),
  survivalRate: decimal('survival_rate', { precision: 5, scale: 2 }),

  // Site characteristics
  soilType: varchar('soil_type', { length: 100 }),
  climate: varchar('climate', { length: 100 }),
  elevation: integer('elevation'), // Meters above sea level
  slope: varchar('slope', { length: 50 }),
  waterSource: varchar('water_source', { length: 100 }),

  // Site conditions
  degradationCause: text('degradation_cause'),
  mainChallenges: text('main_challenges'),
  accessDifficulty: varchar('access_difficulty', { length: 50 }),

  // Planning and management
  plantingMethod: varchar('planting_method', { length: 100 }),
  maintenancePlan: text('maintenance_plan'),
  monitoringFrequency: varchar('monitoring_frequency', { length: 50 }),

  // Site team
  siteManagerName: varchar('site_manager_name', { length: 255 }),
  siteManagerContact: varchar('site_manager_contact', { length: 255 }),
  localPartner: varchar('local_partner', { length: 255 }),

  // Status tracking
  isActive: boolean('is_active').default(true).notNull(),
  isPublic: boolean('is_public').default(true).notNull(),
  lastMonitored: timestamp('last_monitored'),

  // Created by
  createdById: integer('created_by_id').notNull().references(() => users.id),

  // Timestamps
  createdAt: timestamp('created_at').defaultNow().notNull(),
  updatedAt: timestamp('updated_at').defaultNow().notNull(),
  deletedAt: timestamp('deleted_at'),
  metadata: jsonb('metadata'), // Expected: { customFields: object, monitoring: object }
}, (table) => ({
  projectIdIdx: index('sites_project_id_idx').on(table.projectId),
  locationIdx: index('sites_location_gist_idx').using('gist', table.location),
  statusIdx: index('sites_status_idx').on(table.status),
  plantingDateIdx: index('sites_planting_date_idx').on(table.plantingDate),
  activeIdx: index('sites_active_idx').on(table.isActive),
  // Composite indexes for common queries
  projectStatusIdx: index('sites_project_status_idx').on(table.projectId, table.status),
  // Check constraints
  areaCheck: check('sites_area_check', sql`area IS NULL OR area > 0`),
  targetTreeCountCheck: check('sites_target_tree_count_check', sql`target_tree_count IS NULL OR target_tree_count > 0`),
  plantedTreeCountCheck: check('sites_planted_tree_count_check', sql`planted_tree_count >= 0`),
  survivalRateCheck: check('sites_survival_rate_check', sql`survival_rate IS NULL OR (survival_rate >= 0 AND survival_rate <= 100)`),
}));

// ============================================================================
// SITE IMAGES TABLE
// ============================================================================

export const siteImages = pgTable('site_images', {
  id: serial('id').primaryKey(),
  guid: varchar('guid', { length: 36 }).notNull().unique(),
  siteId: integer('site_id').notNull().references(() => sites.id, { onDelete: 'cascade' }),

  // Image details
  filename: varchar('filename', { length: 255 }).notNull(),
  originalName: varchar('original_name', { length: 255 }),
  mimeType: varchar('mime_type', { length: 100 }),
  size: integer('size'),

  // Image metadata
  caption: varchar('caption', { length: 500 }),
  description: text('description'),
  imageType: imageTypeEnum('image_type').default('overview'),

  // Photo context
  coordinatesTaken: jsonb('coordinates_taken'), // Expected: { lat: number, lng: number, accuracy?: number }
  dateTaken: timestamp('date_taken'),
  photographerName: varchar('photographer_name', { length: 255 }),

  // Organization
  isMainImage: boolean('is_main_image').default(false).notNull(),
  isPublic: boolean('is_public').default(true).notNull(),

  // Timestamps
  createdAt: timestamp('created_at').defaultNow().notNull(),
  updatedAt: timestamp('updated_at').defaultNow().notNull(),
}, (table) => ({
  siteIdIdx: index('site_images_site_id_idx').on(table.siteId),
  typeIdx: index('site_images_type_idx').on(table.imageType),
  mainImageIdx: index('site_images_main_idx').on(table.siteId, table.isMainImage),
  dateTakenIdx: index('site_images_date_taken_idx').on(table.dateTaken),
  // Check constraints
  sizeCheck: check('site_images_size_check', sql`size IS NULL OR size > 0`)
}));

// ============================================================================
// SITE SPECIES TABLE
// ============================================================================

export const siteSpecies = pgTable('site_species', {
  id: serial('id').primaryKey(),
  guid: varchar('guid', { length: 36 }).notNull().unique(),
  siteId: integer('site_id').notNull().references(() => sites.id, { onDelete: 'cascade' }),
  speciesId: integer('species_id').references(() => userSpecies.id),

  // Species data (if no reference to species table)
  scientificName: varchar('scientific_name', { length: 255 }),
  commonName: varchar('common_name', { length: 255 }),
  localName: varchar('local_name', { length: 255 }),

  // Planting details
  targetCount: integer('target_count'),
  plantedCount: integer('planted_count').default(0).notNull(),
  survivalCount: integer('survival_count').default(0).notNull(),
  survivalRate: decimal('survival_rate', { precision: 5, scale: 2 }),

  // Species-specific site conditions
  plantingDensity: integer('planting_density'), // trees per hectare
  spacingMeters: decimal('spacing_meters', { precision: 4, scale: 2 }),
  plantingZone: varchar('planting_zone', { length: 100 }),

  // Growth tracking
  averageHeight: decimal('average_height', { precision: 6, scale: 2 }),
  averageDiameter: decimal('average_diameter', { precision: 6, scale: 2 }),

  // Timestamps
  plantedDate: timestamp('planted_date'),
  lastMeasured: timestamp('last_measured'),
  createdAt: timestamp('created_at').defaultNow().notNull(),
  updatedAt: timestamp('updated_at').defaultNow().notNull(),
}, (table) => ({
  siteIdIdx: index('site_species_site_id_idx').on(table.siteId),
  speciesIdIdx: index('site_species_species_id_idx').on(table.speciesId),
  plantedDateIdx: index('site_species_planted_date_idx').on(table.plantedDate),
  // Composite index for site species queries
  siteSpeciesCompoundIdx: index('site_species_compound_idx').on(table.siteId, table.speciesId),
  // Check constraints
  targetCountCheck: check('site_species_target_count_check', sql`target_count IS NULL OR target_count > 0`),
  plantedCountCheck: check('site_species_planted_count_check', sql`planted_count >= 0`),
  survivalCountCheck: check('site_species_survival_count_check', sql`survival_count >= 0 AND survival_count <= planted_count`),
  survivalRateCheck: check('site_species_survival_rate_check', sql`survival_rate IS NULL OR (survival_rate >= 0 AND survival_rate <= 100)`),
  plantingDensityCheck: check('site_species_planting_density_check', sql`planting_density IS NULL OR planting_density > 0`),
  spacingCheck: check('site_species_spacing_check', sql`spacing_meters IS NULL OR spacing_meters > 0`),
  heightCheck: check('site_species_height_check', sql`average_height IS NULL OR average_height > 0`),
  diameterCheck: check('site_species_diameter_check', sql`average_diameter IS NULL OR average_diameter > 0`),
}));

// ============================================================================
// SITE REPORTS TABLE
// ============================================================================

export const siteReports = pgTable('site_reports', {
  id: serial('id').primaryKey(),
  guid: varchar('guid', { length: 36 }).notNull().unique(),
  siteId: integer('site_id').notNull().references(() => sites.id, { onDelete: 'cascade' }),

  // Report details
  reportType: reportTypeEnum('report_type').notNull(),
  title: varchar('title', { length: 255 }).notNull(),
  summary: text('summary'),
  detailedReport: text('detailed_report'),

  // Metrics at time of report
  treesPlantedSinceLastReport: integer('trees_planted_since_last').default(0),
  totalTreesAlive: integer('total_trees_alive').default(0),
  overallSurvivalRate: decimal('overall_survival_rate', { precision: 5, scale: 2 }),

  // Conditions and observations
  weatherConditions: text('weather_conditions'),
  soilConditions: text('soil_conditions'),
  wildlifeObservations: text('wildlife_observations'),
  communityEngagement: text('community_engagement'),

  // Issues and actions
  challengesFaced: text('challenges_faced'),
  actionsRequired: text('actions_required'),
  recommendedInterventions: text('recommended_interventions'),

  // Report metadata
  reporterId: integer('reporter_id').references(() => users.id),
  reportDate: timestamp('report_date').notNull(),
  visitDate: timestamp('visit_date'),
  isPublished: boolean('is_published').default(false).notNull(),

  // Timestamps
  createdAt: timestamp('created_at').defaultNow().notNull(),
  updatedAt: timestamp('updated_at').defaultNow().notNull(),
}, (table) => ({
  siteIdIdx: index('site_reports_site_id_idx').on(table.siteId),
  reportDateIdx: index('site_reports_date_idx').on(table.reportDate),
  typeIdx: index('site_reports_type_idx').on(table.reportType),
  publishedIdx: index('site_reports_published_idx').on(table.isPublished),
  reporterIdx: index('site_reports_reporter_idx').on(table.reporterId),
  // Composite index for site report queries
  siteReportDateIdx: index('site_reports_site_date_idx').on(table.siteId, table.reportDate),
  // Check constraints
  treesPlantedCheck: check('site_reports_trees_planted_check', sql`trees_planted_since_last >= 0`),
  totalTreesCheck: check('site_reports_total_trees_check', sql`total_trees_alive >= 0`),
  survivalRateCheck: check('site_reports_survival_rate_check', sql`overall_survival_rate IS NULL OR (overall_survival_rate >= 0 AND overall_survival_rate <= 100)`),
}));

// ============================================================================
// TREES TABLE
// ============================================================================

export const trees = pgTable('trees', {
  id: serial('id').primaryKey(),
  guid: varchar('guid', { length: 36 }).notNull().unique(),
  siteId: integer('site_id').references(() => sites.id, { onDelete: 'cascade' }),
  userSpeciesId: integer('user_species_id').references(() => userSpecies.id, { onDelete: 'set null' }),
  identifier: varchar('identifier', { length: 100 }), // Tree tag/identifier

  // Location
  latitude: doublePrecision('latitude').notNull(),
  longitude: doublePrecision('longitude').notNull(),
  altitude: decimal('altitude', { precision: 8, scale: 2 }),
  accuracy: decimal('accuracy', { precision: 6, scale: 2 }),

  // Measurements
  height: doublePrecision('height'), // in meters
  diameter: doublePrecision('diameter'), // DBH in cm
  circumference: doublePrecision('circumference'), // in cm
  crownDiameter: doublePrecision('crown_diameter'), // in meters

  // Planting details
  plantingDate: date('planting_date'),
  seedlingAge: integer('seedling_age'), // Age in months when planted
  seedlingHeight: decimal('seedling_height', { precision: 6, scale: 2 }), // Height at planting in cm
  seedlingSource: varchar('seedling_source', { length: 255 }),
  plantingMethod: varchar('planting_method', { length: 100 }),

  // Status and health
  status: treeStatusEnum('status').default('alive').notNull(),
  healthNotes: text('health_notes'),

  // Growth tracking
  lastMeasurementDate: timestamp('last_measurement_date'),
  nextMeasurementDate: timestamp('next_measurement_date'),
  growthRate: decimal('growth_rate', { precision: 6, scale: 2 }), // cm per year

  // Images and media
  images: jsonb('images'), // Expected: Array of image URLs/references
  mainImageUrl: text('main_image_url'),

  // Management
  isMonitored: boolean('is_monitored').default(true).notNull(),
  monitoringFrequency: varchar('monitoring_frequency', { length: 50 }), // monthly, quarterly, etc.

  // Timestamps
  createdById: integer('created_by_id').notNull().references(() => users.id),
  createdAt: timestamp('created_at').defaultNow().notNull(),
  updatedAt: timestamp('updated_at').defaultNow().notNull(),
  deletedAt: timestamp('deleted_at'),
  metadata: jsonb('metadata'), // Expected: { customAttributes: object, measurements: array }
}, (table) => ({
  siteIdIdx: index('trees_site_id_idx').on(table.siteId),
  userSpeciesIdIdx: index('trees_user_species_id_idx').on(table.userSpeciesId),
  statusIdx: index('trees_status_idx').on(table.status),
  plantingDateIdx: index('trees_planting_date_idx').on(table.plantingDate),
  coordsIdx: index('trees_coords_idx').on(table.latitude, table.longitude),
  identifierIdx: index('trees_identifier_idx').on(table.identifier),
  monitoredIdx: index('trees_monitored_idx').on(table.isMonitored),
  nextMeasurementIdx: index('trees_next_measurement_idx').on(table.nextMeasurementDate),
  // Composite indexes for common queries
  siteStatusIdx: index('trees_site_status_idx').on(table.siteId, table.status),
  siteSpeciesIdx: index('trees_site_species_idx').on(table.siteId, table.userSpeciesId),
  // Spatial index for location queries
  locationIdx: index('trees_location_gist_idx').using('gist', sql`ST_Point(longitude, latitude)`),
  // Check constraints
  heightCheck: check('trees_height_check', sql`height IS NULL OR height > 0`),
  diameterCheck: check('trees_diameter_check', sql`diameter IS NULL OR diameter > 0`),
  circumferenceCheck: check('trees_circumference_check', sql`circumference IS NULL OR circumference > 0`),
  crownDiameterCheck: check('trees_crown_diameter_check', sql`crown_diameter IS NULL OR crown_diameter > 0`),
  seedlingAgeCheck: check('trees_seedling_age_check', sql`seedling_age IS NULL OR seedling_age >= 0`),
  seedlingHeightCheck: check('trees_seedling_height_check', sql`seedling_height IS NULL OR seedling_height > 0`),
  growthRateCheck: check('trees_growth_rate_check', sql`growth_rate IS NULL OR growth_rate >= 0`),
  latitudeCheck: check('trees_latitude_check', sql`latitude >= -90 AND latitude <= 90`),
  longitudeCheck: check('trees_longitude_check', sql`longitude >= -180 AND longitude <= 180`),
}));

// ============================================================================
// TREE RECORDS TABLE
// ============================================================================

export const treeRecords = pgTable('tree_records', {
  id: serial('id').primaryKey(),
  guid: varchar('guid', { length: 36 }).notNull().unique(),
  treeId: integer('tree_id').notNull().references(() => trees.id, { onDelete: 'cascade' }),

  // Record details
  recordType: varchar('record_type', { length: 50 }).notNull(), // health_check, maintenance, measurement, treatment
  recordDate: timestamp('record_date').defaultNow().notNull(),
  notes: text('notes'),

  // Measurements (if applicable)
  height: doublePrecision('height'),
  diameter: doublePrecision('diameter'),
  circumference: doublePrecision('circumference'),
  crownDiameter: doublePrecision('crown_diameter'),

  // Status changes
  previousStatus: treeStatusEnum('previous_status'),
  newStatus: treeStatusEnum('new_status'),
  // Maintenance/treatment details
  treatmentType: varchar('treatment_type', { length: 100 }),
  treatmentDescription: text('treatment_description'),
  materialsUsed: text('materials_used'),
  costIncurred: decimal('cost_incurred', { precision: 10, scale: 2 }),

  // Environmental conditions
  weatherConditions: varchar('weather_conditions', { length: 255 }),
  soilMoisture: varchar('soil_moisture', { length: 50 }),
  temperature: decimal('temperature', { precision: 4, scale: 1 }),

  // Images and documentation
  images: jsonb('images'), // Expected: Array of image URLs/references
  documents: jsonb('documents'), // Expected: Array of document URLs/references

  // Record metadata
  recordedById: integer('recorded_by_id').notNull().references(() => users.id),
  verifiedById: integer('verified_by_id').references(() => users.id),
  verifiedAt: timestamp('verified_at'),
  isPublic: boolean('is_public').default(true).notNull(),

  // Timestamps
  createdAt: timestamp('created_at').defaultNow().notNull(),
  metadata: jsonb('metadata'), // Expected: { devices: object, coordinates: object }
}, (table) => ({
  treeIdIdx: index('tree_records_tree_id_idx').on(table.treeId),
  recordTypeIdx: index('tree_records_type_idx').on(table.recordType),
  recordDateIdx: index('tree_records_date_idx').on(table.recordDate),
  recordedByIdx: index('tree_records_recorded_by_idx').on(table.recordedById),
  verifiedByIdx: index('tree_records_verified_by_idx').on(table.verifiedById),
  // Composite indexes for common queries
  treeRecordDateIdx: index('tree_records_tree_date_idx').on(table.treeId, table.recordDate),
  treeRecordTypeIdx: index('tree_records_tree_type_idx').on(table.treeId, table.recordType),
  // Check constraints
  heightCheck: check('tree_records_height_check', sql`height IS NULL OR height > 0`),
  diameterCheck: check('tree_records_diameter_check', sql`diameter IS NULL OR diameter > 0`),
  circumferenceCheck: check('tree_records_circumference_check', sql`circumference IS NULL OR circumference > 0`),
  crownDiameterCheck: check('tree_records_crown_diameter_check', sql`crown_diameter IS NULL OR crown_diameter > 0`),
  costCheck: check('tree_records_cost_check', sql`cost_incurred IS NULL OR cost_incurred >= 0`),
  temperatureCheck: check('tree_records_temperature_check', sql`temperature IS NULL OR (temperature >= -50 AND temperature <= 60)`),
}));

// ============================================================================
// INTERVENTIONS TABLE
// ============================================================================

export const interventions = pgTable('interventions', {
  id: serial('id').primaryKey(),
  guid: varchar('guid', { length: 36 }).notNull().unique(),
  hid: varchar('hid', { length: 16 }),
  discr: interventionDiscriminatorEnum('discr').notNull().default('base'),
  // Foreign keys
  projectId: integer('project_id').references(() => projects.id),
  projectSiteId: integer('project_site_id').references(() => sites.id),
  scientificSpeciesId: integer('scientific_species_id').references(() => scientificSpecies.id),
  userId: integer('user_id').notNull().references(() => users.id),
  parentInterventionId: integer('parent_intervention_id').references(() => interventions.id),

  // Intervention identification
  type: interventionTypeEnum('type').notNull(),
  origin: varchar('origin', { length: 16 }).notNull(),
  idempotencyKey: varchar('idempotency_key', { length: 64 }).notNull().unique(),

  // Dates and timing
  interventionDate: date('intervention_date'),
  registrationDate: date('registration_date'),
  interventionStartDate: timestamp('intervention_start_date'),
  interventionEndDate: timestamp('intervention_end_date'),

  // Capture information
  captureMode: captureModeEnum('capture_mode').notNull(),
  captureStatus: captureStatusEnum('capture_status').notNull().default('complete'),

  // Geometric data
  geometry: jsonb('geometry').notNull(), // Expected: GeoJSON Feature/FeatureCollection
  originalGeometry: jsonb('original_geometry').notNull(),
  deviceLocation: jsonb('device_location'), // Expected: { lat: number, lng: number, accuracy?: number }
  geometryUpdatesCount: integer('geometry_updates_count').default(0).notNull(),

  // Media
  image: varchar('image', { length: 255 }),

  // Tree and species data
  treesPlanted: decimal('trees_planted', { precision: 20, scale: 2 }).notNull().default('0'),
  treesAllocated: integer('trees_allocated').notNull().default(0),
  sampleTreeCount: integer('sample_tree_count'),
  allocationPriority: allocationPriorityEnum('allocation_priority').notNull().default('manual'),

  // Measurements and metadata
  measurements: jsonb('measurements'), // Expected: { height: number, diameter: number, ... }
  metadata: jsonb('metadata'), // Expected: { equipment: object, conditions: object }

  // Description and tagging
  tag: varchar('tag', { length: 255 }),
  description: varchar('description', { length: 2048 }),
  otherSpecies: varchar('other_species', { length: 2048 }),

  // Status tracking
  status: interventionStatusEnum('status').default('active'),
  statusReason: varchar('status_reason', { length: 64 }),

  // Privacy and permissions
  isPrivate: boolean('is_private').default(false).notNull(),

  // Revision and monitoring
  revisionPeriodicity: jsonb('revision_periodicity').default('[]'), // Expected: Array of monitoring schedules
  lastMeasurementDate: timestamp('last_measurement_date'),
  nextMeasurementDate: timestamp('next_measurement_date'),

  // Performance metrics
  successRate: decimal('success_rate', { precision: 5, scale: 2 }),
  growthRate: decimal('growth_rate', { precision: 6, scale: 2 }),
  survivalRate: decimal('survival_rate', { precision: 5, scale: 2 }),

  // Legacy support
  legacyId: integer('legacy_id'),

  // Timestamps
  createdAt: timestamp('created_at').defaultNow().notNull(),
  updatedAt: timestamp('updated_at').defaultNow().notNull(),
  deletedAt: timestamp('deleted_at'),
}, (table) => ({
  discrIdx: index('interventions_discr_idx').on(table.discr),
  projectIdx: index('interventions_project_idx').on(table.projectId),
  projectSiteIdx: index('interventions_project_site_idx').on(table.projectSiteId),
  userIdx: index('interventions_user_idx').on(table.userId),
  typeIdx: index('interventions_type_idx').on(table.type),
  captureModeIdx: index('interventions_capture_mode_idx').on(table.captureMode),
  captureStatusIdx: index('interventions_capture_status_idx').on(table.captureStatus),
  interventionDateIdx: index('interventions_date_idx').on(table.interventionDate),
  statusIdx: index('interventions_status_idx').on(table.status),
  privateIdx: index('interventions_private_idx').on(table.isPrivate),
  parentIdx: index('interventions_parent_idx').on(table.parentInterventionId),
  nextMeasurementIdx: index('interventions_next_measurement_idx').on(table.nextMeasurementDate),
  // Composite indexes for common queries
  projectDateIdx: index('interventions_project_date_idx').on(table.projectId, table.interventionDate),
  userTypeIdx: index('interventions_user_type_idx').on(table.userId, table.type),
  siteStatusIdx: index('interventions_site_status_idx').on(table.projectSiteId, table.status),
  // Partial indexes
  activeInterventionsIdx: index('interventions_active_idx').on(table.projectId).where(sql`status = 'active'`),
  // Check constraints
  treesPlantedCheck: check('interventions_trees_planted_check', sql`trees_planted >= 0`),
  treesAllocatedCheck: check('interventions_trees_allocated_check', sql`trees_allocated >= 0`),
  sampleTreeCountCheck: check('interventions_sample_tree_count_check', sql`sample_tree_count IS NULL OR sample_tree_count > 0`),
  geometryUpdatesCheck: check('interventions_geometry_updates_check', sql`geometry_updates_count >= 0`),
  successRateCheck: check('interventions_success_rate_check', sql`success_rate IS NULL OR (success_rate >= 0 AND success_rate <= 100)`),
  growthRateCheck: check('interventions_growth_rate_check', sql`growth_rate IS NULL OR growth_rate >= 0`),
  survivalRateCheck: check('interventions_survival_rate_check', sql`survival_rate IS NULL OR (survival_rate >= 0 AND survival_rate <= 100)`),
}));

// ============================================================================
// INTERVENTION COORDINATES TABLE
// ============================================================================

export const interventionCoordinates = pgTable('intervention_coordinates', {
  id: serial('id').primaryKey(),
  guid: varchar('guid', { length: 36 }).notNull().unique(),
  interventionId: integer('intervention_id').notNull().references(() => interventions.id, { onDelete: 'cascade' }),

  // Coordinate data
  latitude: decimal('latitude', { precision: 10, scale: 8 }).notNull(),
  longitude: decimal('longitude', { precision: 11, scale: 8 }).notNull(),
  altitude: decimal('altitude', { precision: 8, scale: 2 }),
  accuracy: decimal('accuracy', { precision: 6, scale: 2 }),

  // Coordinate metadata
  coordinateType: coordinateTypeEnum('coordinate_type').default('gps'),
  captureMethod: captureModeMethodEnum('capture_method').default('device'),
  deviceId: varchar('device_id', { length: 100 }),
  deviceInfo: jsonb('device_info'), // Expected: { model: string, os: string, app_version: string }

  // Position in sequence

  // Status
  status: captureStatusEnum('status').default('complete').notNull(),

  // Quality metrics
  horizontalAccuracy: decimal('horizontal_accuracy', { precision: 6, scale: 2 }),
  verticalAccuracy: decimal('vertical_accuracy', { precision: 6, scale: 2 }),
  speed: decimal('speed', { precision: 6, scale: 2 }), // m/s
  heading: decimal('heading', { precision: 5, scale: 2 }), // degrees

  // Timestamps
  capturedAt: timestamp('captured_at'),
  createdAt: timestamp('created_at').defaultNow().notNull(),
  updatedAt: timestamp('updated_at').defaultNow().notNull(),
}, (table) => ({
  interventionIdIdx: index('intervention_coordinates_intervention_idx').on(table.interventionId),
  coordsIdx: index('intervention_coordinates_coords_idx').on(table.latitude, table.longitude),
  capturedAtIdx: index('intervention_coordinates_captured_at_idx').on(table.capturedAt),
  statusIdx: index('intervention_coordinates_status_idx').on(table.status),
  // Spatial index
  locationIdx: index('intervention_coordinates_location_gist_idx').using('gist', sql`ST_Point(longitude::double precision, latitude::double precision)`),
  // Check constraints
  latitudeCheck: check('intervention_coordinates_latitude_check', sql`latitude >= -90 AND latitude <= 90`),
  longitudeCheck: check('intervention_coordinates_longitude_check', sql`longitude >= -180 AND longitude <= 180`),
  accuracyCheck: check('intervention_coordinates_accuracy_check', sql`accuracy IS NULL OR accuracy >= 0`),
  horizontalAccuracyCheck: check('intervention_coordinates_h_accuracy_check', sql`horizontal_accuracy IS NULL OR horizontal_accuracy >= 0`),
  verticalAccuracyCheck: check('intervention_coordinates_v_accuracy_check', sql`vertical_accuracy IS NULL OR vertical_accuracy >= 0`),
  speedCheck: check('intervention_coordinates_speed_check', sql`speed IS NULL OR speed >= 0`),
  headingCheck: check('intervention_coordinates_heading_check', sql`heading IS NULL OR (heading >= 0 AND heading < 360)`),
}));

// ============================================================================
// INTERVENTION PLANTED SPECIES TABLE
// ============================================================================

export const interventionPlantedSpecies = pgTable('intervention_planted_species', {
  id: serial('id').primaryKey(),
  guid: varchar('guid', { length: 36 }).notNull().unique(),
  interventionId: integer('intervention_id').notNull().references(() => interventions.id, { onDelete: 'cascade' }),
  scientificSpeciesId: integer('scientific_species_id').references(() => scientificSpecies.id),

  // Species information (if not linked to scientific species)
  scientificName: varchar('scientific_name', { length: 255 }),
  commonName: varchar('common_name', { length: 255 }),
  localName: varchar('local_name', { length: 255 }),

  // Planting details
  treeCount: integer('tree_count').notNull().default(1),
  seedlingAge: integer('seedling_age'), // Age in months
  seedlingHeight: decimal('seedling_height', { precision: 6, scale: 2 }), // Height in cm
  seedlingSource: varchar('seedling_source', { length: 255 }),

  // Planting specifics
  plantingMethod: varchar('planting_method', { length: 100 }),
  spacing: decimal('spacing', { precision: 6, scale: 2 }), // Spacing in meters
  depth: decimal('depth', { precision: 6, scale: 2 }), // Planting depth in cm

  // Growth tracking
  survivalRate: decimal('survival_rate', { precision: 5, scale: 2 }),
  averageHeight: decimal('average_height', { precision: 6, scale: 2 }),
  averageDiameter: decimal('average_diameter', { precision: 6, scale: 2 }),

  // Cost tracking
  seedlingCost: decimal('seedling_cost', { precision: 10, scale: 2 }),
  plantingCost: decimal('planting_cost', { precision: 10, scale: 2 }),
  maintenanceCost: decimal('maintenance_cost', { precision: 10, scale: 2 }),

  // Additional notes
  notes: text('notes'),
  challenges: text('challenges'),

  // Timestamps
  plantedAt: timestamp('planted_at'),
  lastMeasured: timestamp('last_measured'),
  createdAt: timestamp('created_at').defaultNow().notNull(),
  updatedAt: timestamp('updated_at').defaultNow().notNull(),
}, (table) => ({
  interventionIdIdx: index('planted_species_intervention_idx').on(table.interventionId),
  speciesIdIdx: index('planted_species_species_idx').on(table.scientificSpeciesId),
  plantedAtIdx: index('planted_species_planted_at_idx').on(table.plantedAt),
  // Composite index
  interventionSpeciesIdx: index('planted_species_intervention_species_idx').on(table.interventionId, table.scientificSpeciesId),
  // Check constraints
  treeCountCheck: check('planted_species_tree_count_check', sql`tree_count > 0`),
  seedlingAgeCheck: check('planted_species_seedling_age_check', sql`seedling_age IS NULL OR seedling_age >= 0`),
  seedlingHeightCheck: check('planted_species_seedling_height_check', sql`seedling_height IS NULL OR seedling_height > 0`),
  spacingCheck: check('planted_species_spacing_check', sql`spacing IS NULL OR spacing > 0`),
  depthCheck: check('planted_species_depth_check', sql`depth IS NULL OR depth > 0`),
  survivalRateCheck: check('planted_species_survival_rate_check', sql`survival_rate IS NULL OR (survival_rate >= 0 AND survival_rate <= 100)`),
  averageHeightCheck: check('planted_species_avg_height_check', sql`average_height IS NULL OR average_height > 0`),
  averageDiameterCheck: check('planted_species_avg_diameter_check', sql`average_diameter IS NULL OR average_diameter > 0`),
  seedlingCostCheck: check('planted_species_seedling_cost_check', sql`seedling_cost IS NULL OR seedling_cost >= 0`),
  plantingCostCheck: check('planted_species_planting_cost_check', sql`planting_cost IS NULL OR planting_cost >= 0`),
  maintenanceCostCheck: check('planted_species_maintenance_cost_check', sql`maintenance_cost IS NULL OR maintenance_cost >= 0`),
}));

// ============================================================================
// INTERVENTION HISTORY TABLE
// ============================================================================

export const interventionHistory = pgTable('intervention_history', {
  id: serial('id').primaryKey(),
  guid: varchar('guid', { length: 36 }).notNull().unique(),
  interventionId: integer('intervention_id').notNull().references(() => interventions.id, { onDelete: 'cascade' }),

  // History details
  eventType: varchar('event_type', { length: 50 }).notNull(), // created, updated, measured, status_changed, completed
  eventDescription: text('event_description'),

  // What changed
  fieldName: varchar('field_name', { length: 100 }),
  oldValue: text('old_value'),
  newValue: text('new_value'),

  // Context
  triggeredBy: varchar('triggered_by', { length: 50 }).default('user'), // user, system, api, scheduler
  triggeredById: integer('triggered_by_id').references(() => users.id), // User ID if triggered by user
  deviceInfo: jsonb('device_info'), // Expected: { userAgent: string, ip: string, device: object }

  // Additional context
  sessionId: varchar('session_id', { length: 100 }),
  requestId: varchar('request_id', { length: 100 }),
  apiVersion: varchar('api_version', { length: 20 }),

  // Timestamps
  eventDate: timestamp('event_date').defaultNow().notNull(),
  createdAt: timestamp('created_at').defaultNow().notNull(),
}, (table) => ({
  interventionIdIdx: index('intervention_history_intervention_idx').on(table.interventionId),
  eventTypeIdx: index('intervention_history_event_type_idx').on(table.eventType),
  eventDateIdx: index('intervention_history_event_date_idx').on(table.eventDate),
  triggeredByIdx: index('intervention_history_triggered_by_idx').on(table.triggeredBy),
  triggeredByIdIdx: index('intervention_history_triggered_by_id_idx').on(table.triggeredById),
  // Composite indexes
  interventionEventDateIdx: index('intervention_history_intervention_date_idx').on(table.interventionId, table.eventDate),
  interventionEventTypeIdx: index('intervention_history_intervention_type_idx').on(table.interventionId, table.eventType),
}));

// ============================================================================
// INTERVENTION IMAGES TABLE
// ============================================================================

export const interventionImages = pgTable('intervention_images', {
  id: serial('id').primaryKey(),
  guid: varchar('guid', { length: 36 }).notNull().unique(),
  interventionId: integer('intervention_id').notNull().references(() => interventions.id, { onDelete: 'cascade' }),

  // Image details
  filename: varchar('filename', { length: 255 }).notNull(),
  originalName: varchar('original_name', { length: 255 }),
  mimeType: varchar('mime_type', { length: 100 }),
  size: integer('size'),
  width: integer('width'),
  height: integer('height'),

  // Image metadata
  caption: varchar('caption', { length: 500 }),
  description: text('description'),
  imageType: imageTypeEnum('image_type').default('overview'),

  // Photo context
  coordinatesTaken: jsonb('coordinates_taken'), // Expected: { lat: number, lng: number, accuracy?: number }
  dateTaken: timestamp('date_taken'),
  deviceInfo: jsonb('device_info'), // Expected: { camera: object, settings: object }

  // Image processing
  thumbnailUrl: text('thumbnail_url'),
  compressedUrl: text('compressed_url'),
  originalUrl: text('original_url'),

  // Organization
  isMainImage: boolean('is_main_image').default(false).notNull(),
  isPublic: boolean('is_public').default(true).notNull(),

  // Quality and validation
  isValidated: boolean('is_validated').default(false).notNull(),
  validatedById: integer('validated_by_id').references(() => users.id),
  validatedAt: timestamp('validated_at'),

  // Timestamps
  createdAt: timestamp('created_at').defaultNow().notNull(),
  updatedAt: timestamp('updated_at').defaultNow().notNull(),
}, (table) => ({
  interventionIdIdx: index('intervention_images_intervention_idx').on(table.interventionId),
  typeIdx: index('intervention_images_type_idx').on(table.imageType),
  mainImageIdx: index('intervention_images_main_idx').on(table.interventionId, table.isMainImage),
  dateTakenIdx: index('intervention_images_date_taken_idx').on(table.dateTaken),
  validatedIdx: index('intervention_images_validated_idx').on(table.isValidated),
  // Check constraints
  sizeCheck: check('intervention_images_size_check', sql`size IS NULL OR size > 0`),
  widthCheck: check('intervention_images_width_check', sql`width IS NULL OR width > 0`),
  heightCheck: check('intervention_images_height_check', sql`height IS NULL OR height > 0`)
}));

// ============================================================================
// AUDIT LOG TABLE
// ============================================================================

export const auditLog = pgTable('audit_log', {
  id: serial('id').primaryKey(),
  tableName: varchar('table_name', { length: 100 }).notNull(),
  recordId: integer('record_id').notNull(),
  operation: auditOperationEnum('operation').notNull(),
  oldValues: jsonb('old_values'),
  newValues: jsonb('new_values'),
  changedFields: jsonb('changed_fields'), // Expected: Array of field names that changed
  userId: integer('user_id').references(() => users.id),
  sessionId: varchar('session_id', { length: 100 }),
  requestId: varchar('request_id', { length: 100 }),
  ipAddress: varchar('ip_address', { length: 45 }), // IPv6 compatible
  userAgent: text('user_agent'),
  apiEndpoint: varchar('api_endpoint', { length: 255 }),
  timestamp: timestamp('timestamp').defaultNow().notNull(),
}, (table) => ({
  tableNameIdx: index('audit_log_table_name_idx').on(table.tableName),
  recordIdIdx: index('audit_log_record_id_idx').on(table.recordId),
  operationIdx: index('audit_log_operation_idx').on(table.operation),
  userIdIdx: index('audit_log_user_id_idx').on(table.userId),
  timestampIdx: index('audit_log_timestamp_idx').on(table.timestamp),
  sessionIdIdx: index('audit_log_session_id_idx').on(table.sessionId),
  // Composite indexes for common audit queries
  tableRecordIdx: index('audit_log_table_record_idx').on(table.tableName, table.recordId),
  userTimestampIdx: index('audit_log_user_timestamp_idx').on(table.userId, table.timestamp),
  tableOperationIdx: index('audit_log_table_operation_idx').on(table.tableName, table.operation),
}));

// ============================================================================
// NOTIFICATIONS TABLE
// ============================================================================

export const notifications = pgTable('notifications', {
  id: serial('id').primaryKey(),
  guid: varchar('guid', { length: 36 }).notNull().unique(),
  userId: integer('user_id').notNull().references(() => users.id, { onDelete: 'cascade' }),

  // Notification content
  type: varchar('type', { length: 50 }).notNull(), // reminder, alert, update, invitation, system
  title: varchar('title', { length: 255 }).notNull(),
  message: text('message').notNull(),

  // Related entities
  relatedEntityType: varchar('related_entity_type', { length: 50 }), // project, site, tree, intervention
  relatedEntityId: integer('related_entity_id'),

  // Notification metadata
  priority: varchar('priority', { length: 20 }).default('normal'), // low, normal, high, urgent
  category: varchar('category', { length: 50 }), // monitoring, maintenance, growth, health, system

  // Status tracking
  isRead: boolean('is_read').default(false).notNull(),
  isArchived: boolean('is_archived').default(false).notNull(),

  // Action details
  actionUrl: text('action_url'),
  actionText: varchar('action_text', { length: 100 }),

  // Scheduling
  scheduledFor: timestamp('scheduled_for'),
  expiresAt: timestamp('expires_at'),

  // Delivery tracking
  deliveryMethod: varchar('delivery_method', { length: 50 }).default('in_app'), // in_app, email, sms, push
  sentAt: timestamp('sent_at'),
  deliveredAt: timestamp('delivered_at'),

  // Timestamps
  createdAt: timestamp('created_at').defaultNow().notNull(),
  updatedAt: timestamp('updated_at').defaultNow().notNull(),
}, (table) => ({
  userIdIdx: index('notifications_user_id_idx').on(table.userId),
  typeIdx: index('notifications_type_idx').on(table.type),
  isReadIdx: index('notifications_is_read_idx').on(table.isRead),
  isArchivedIdx: index('notifications_is_archived_idx').on(table.isArchived),
  priorityIdx: index('notifications_priority_idx').on(table.priority),
  scheduledForIdx: index('notifications_scheduled_for_idx').on(table.scheduledFor),
  expiresAtIdx: index('notifications_expires_at_idx').on(table.expiresAt),
  relatedEntityIdx: index('notifications_related_entity_idx').on(table.relatedEntityType, table.relatedEntityId),
  // Composite indexes
  userUnreadIdx: index('notifications_user_unread_idx').on(table.userId, table.isRead),
  userCategoryIdx: index('notifications_user_category_idx').on(table.userId, table.category),
  // Partial indexes
  unreadNotificationsIdx: index('notifications_unread_idx').on(table.userId).where(sql`is_read = false AND is_archived = false`),
}));

// ============================================================================
// MONITORING SCHEDULES TABLE
// ============================================================================

export const monitoringSchedules = pgTable('monitoring_schedules', {
  id: serial('id').primaryKey(),
  guid: varchar('guid', { length: 36 }).notNull().unique(),

  // Related entities
  entityType: varchar('entity_type', { length: 50 }).notNull(), // site, tree, intervention
  entityId: integer('entity_id').notNull(),

  // Schedule details
  name: varchar('name', { length: 255 }).notNull(),
  description: text('description'),
  frequency: varchar('frequency', { length: 50 }).notNull(), // daily, weekly, monthly, quarterly, yearly, custom
  customFrequencyDays: integer('custom_frequency_days'), // For custom frequency

  // Monitoring parameters
  monitoringType: varchar('monitoring_type', { length: 50 }).notNull(), // health_check, measurement, maintenance, inspection
  requiredMeasurements: jsonb('required_measurements'), // Expected: Array of measurement types

  // Timing
  startDate: date('start_date').notNull(),
  endDate: date('end_date'),
  nextDueDate: date('next_due_date').notNull(),
  lastCompletedDate: date('last_completed_date'),

  // Assignment
  assignedToUserId: integer('assigned_to_user_id').references(() => users.id),
  assignedToRole: projectRoleEnum('assigned_to_role'),

  // Status
  isActive: boolean('is_active').default(true).notNull(),
  isOverdue: boolean('is_overdue').default(false).notNull(),

  // Notifications
  reminderDaysBefore: integer('reminder_days_before').default(7),
  escalationDaysAfter: integer('escalation_days_after').default(3),

  // Created by
  createdById: integer('created_by_id').notNull().references(() => users.id),

  // Timestamps
  createdAt: timestamp('created_at').defaultNow().notNull(),
  updatedAt: timestamp('updated_at').defaultNow().notNull(),
}, (table) => ({
  entityIdx: index('monitoring_schedules_entity_idx').on(table.entityType, table.entityId),
  nextDueDateIdx: index('monitoring_schedules_next_due_idx').on(table.nextDueDate),
  assignedToIdx: index('monitoring_schedules_assigned_to_idx').on(table.assignedToUserId),
  isActiveIdx: index('monitoring_schedules_is_active_idx').on(table.isActive),
  isOverdueIdx: index('monitoring_schedules_is_overdue_idx').on(table.isOverdue),
  frequencyIdx: index('monitoring_schedules_frequency_idx').on(table.frequency),
  monitoringTypeIdx: index('monitoring_schedules_monitoring_type_idx').on(table.monitoringType),
  // Composite indexes
  entityActiveIdx: index('monitoring_schedules_entity_active_idx').on(table.entityType, table.entityId, table.isActive),
  dueDateActiveIdx: index('monitoring_schedules_due_active_idx').on(table.nextDueDate, table.isActive),
  // Partial indexes
  activeDueSchedulesIdx: index('monitoring_schedules_active_due_idx').on(table.nextDueDate).where(sql`is_active = true`),
  overdueSchedulesIdx: index('monitoring_schedules_overdue_idx').on(table.nextDueDate).where(sql`is_overdue = true AND is_active = true`),
  // Check constraints
  customFrequencyCheck: check('monitoring_schedules_custom_frequency_check', sql`(frequency != 'custom') OR (custom_frequency_days IS NOT NULL AND custom_frequency_days > 0)`),
  reminderDaysCheck: check('monitoring_schedules_reminder_days_check', sql`reminder_days_before >= 0`),
  escalationDaysCheck: check('monitoring_schedules_escalation_days_check', sql`escalation_days_after >= 0`),
  dateRangeCheck: check('monitoring_schedules_date_range_check', sql`end_date IS NULL OR end_date >= start_date`),
}));


// ============================================================================
// RELATIONS - UPDATED FOR NEW SCHEMA STRUCTURE
// ============================================================================

export const userRelations = relations(users, ({ many }) => ({
  projectMemberships: many(projectMembers),
  createdProjects: many(projects, { relationName: 'createdBy' }),
  userSpecies: many(userSpecies),
  createdSites: many(sites, { relationName: 'createdBy' }),
  createdTrees: many(trees, { relationName: 'createdBy' }),
  createdTreeRecords: many(treeRecords, { relationName: 'recordedBy' }),
  verifiedTreeRecords: many(treeRecords, { relationName: 'verifiedBy' }),
  sentInvites: many(projectInvites, { relationName: 'invitedBy' }),
  interventions: many(interventions, { relationName: 'userInterventions' }),
  notifications: many(notifications),
  createdMonitoringSchedules: many(monitoringSchedules, { relationName: 'createdBy' }),
  assignedMonitoringSchedules: many(monitoringSchedules, { relationName: 'assignedTo' }),
  auditLogs: many(auditLog, { relationName: 'userAuditLogs' }),
  validatedImages: many(interventionImages, { relationName: 'validatedBy' }),
}));

export const projectRelations = relations(projects, ({ one, many }) => ({
  createdBy: one(users, {
    fields: [projects.createdById],
    references: [users.id],
    relationName: 'createdBy',
  }),
  members: many(projectMembers),
  invites: many(projectInvites),
  sites: many(sites),
  interventions: many(interventions),
}));

export const projectMemberRelations = relations(projectMembers, ({ one }) => ({
  project: one(projects, {
    fields: [projectMembers.projectId],
    references: [projects.id],
  }),
  user: one(users, {
    fields: [projectMembers.userId],
    references: [users.id],
  }),
}));

export const projectInviteRelations = relations(projectInvites, ({ one }) => ({
  project: one(projects, {
    fields: [projectInvites.projectId],
    references: [projects.id],
  }),
  invitedBy: one(users, {
    fields: [projectInvites.invitedById],
    references: [users.id],
    relationName: 'invitedBy',
  }),
}));

export const scientificSpeciesRelations = relations(scientificSpecies, ({ many }) => ({
  userSpecies: many(userSpecies),
  interventionPlantedSpecies: many(interventionPlantedSpecies),
  interventions: many(interventions),
}));

export const userSpeciesRelations = relations(userSpecies, ({ one, many }) => ({
  user: one(users, {
    fields: [userSpecies.userId],
    references: [users.id],
  }),
  scientificSpecies: one(scientificSpecies, {
    fields: [userSpecies.scientificSpeciesId],
    references: [scientificSpecies.id],
  }),
  trees: many(trees),
  images: many(speciesImages),
  siteSpecies: many(siteSpecies),
}));

export const speciesImagesRelations = relations(speciesImages, ({ one }) => ({
  species: one(userSpecies, {
    fields: [speciesImages.speciesId],
    references: [userSpecies.id],
  }),
}));

export const siteRelations = relations(sites, ({ one, many }) => ({
  project: one(projects, {
    fields: [sites.projectId],
    references: [projects.id],
  }),
  createdBy: one(users, {
    fields: [sites.createdById],
    references: [users.id],
    relationName: 'createdBy',
  }),
  trees: many(trees),
  images: many(siteImages),
  species: many(siteSpecies),
  reports: many(siteReports),
  interventions: many(interventions),
}));

export const siteImagesRelations = relations(siteImages, ({ one }) => ({
  site: one(sites, {
    fields: [siteImages.siteId],
    references: [sites.id],
  }),
}));

export const siteSpeciesRelations = relations(siteSpecies, ({ one }) => ({
  site: one(sites, {
    fields: [siteSpecies.siteId],
    references: [sites.id],
  }),
  species: one(userSpecies, {
    fields: [siteSpecies.speciesId],
    references: [userSpecies.id],
  }),
}));

export const siteReportsRelations = relations(siteReports, ({ one }) => ({
  site: one(sites, {
    fields: [siteReports.siteId],
    references: [sites.id],
  }),
  reporter: one(users, {
    fields: [siteReports.reporterId],
    references: [users.id],
  }),
}));

export const treeRelations = relations(trees, ({ one, many }) => ({
  site: one(sites, {
    fields: [trees.siteId],
    references: [sites.id],
  }),
  userSpecies: one(userSpecies, {
    fields: [trees.userSpeciesId],
    references: [userSpecies.id],
  }),
  createdBy: one(users, {
    fields: [trees.createdById],
    references: [users.id],
    relationName: 'createdBy',
  }),
  records: many(treeRecords),
}));

export const treeRecordRelations = relations(treeRecords, ({ one }) => ({
  tree: one(trees, {
    fields: [treeRecords.treeId],
    references: [trees.id],
  }),
  recordedBy: one(users, {
    fields: [treeRecords.recordedById],
    references: [users.id],
    relationName: 'recordedBy',
  }),
  verifiedBy: one(users, {
    fields: [treeRecords.verifiedById],
    references: [users.id],
    relationName: 'verifiedBy',
  }),
}));

export const interventionsRelations = relations(interventions, ({ one, many }) => ({
  project: one(projects, {
    fields: [interventions.projectId],
    references: [projects.id],
  }),
  projectSite: one(sites, {
    fields: [interventions.projectSiteId],
    references: [sites.id],
  }),
  scientificSpecies: one(scientificSpecies, {
    fields: [interventions.scientificSpeciesId],
    references: [scientificSpecies.id],
  }),
  user: one(users, {
    fields: [interventions.userId],
    references: [users.id],
    relationName: 'userInterventions',
  }),
  parentIntervention: one(interventions, {
    fields: [interventions.parentInterventionId],
    references: [interventions.id],
  }),
  childInterventions: many(interventions),
  coordinates: many(interventionCoordinates),
  plantedSpecies: many(interventionPlantedSpecies),
  history: many(interventionHistory),
  images: many(interventionImages),
}));

export const interventionCoordinatesRelations = relations(interventionCoordinates, ({ one }) => ({
  intervention: one(interventions, {
    fields: [interventionCoordinates.interventionId],
    references: [interventions.id],
  }),
}));

export const interventionPlantedSpeciesRelations = relations(interventionPlantedSpecies, ({ one }) => ({
  intervention: one(interventions, {
    fields: [interventionPlantedSpecies.interventionId],
    references: [interventions.id],
  }),
  scientificSpecies: one(scientificSpecies, {
    fields: [interventionPlantedSpecies.scientificSpeciesId],
    references: [scientificSpecies.id],
  }),
}));

export const interventionHistoryRelations = relations(interventionHistory, ({ one }) => ({
  intervention: one(interventions, {
    fields: [interventionHistory.interventionId],
    references: [interventions.id],
  }),
  triggeredBy: one(users, {
    fields: [interventionHistory.triggeredById],
    references: [users.id],
  }),
}));

export const interventionImagesRelations = relations(interventionImages, ({ one }) => ({
  intervention: one(interventions, {
    fields: [interventionImages.interventionId],
    references: [interventions.id],
  }),
  validatedBy: one(users, {
    fields: [interventionImages.validatedById],
    references: [users.id],
    relationName: 'validatedBy',
  }),
}));

export const auditLogRelations = relations(auditLog, ({ one }) => ({
  user: one(users, {
    fields: [auditLog.userId],
    references: [users.id],
    relationName: 'userAuditLogs',
  }),
}));

export const notificationsRelations = relations(notifications, ({ one }) => ({
  user: one(users, {
    fields: [notifications.userId],
    references: [users.id],
  }),
}));

export const monitoringSchedulesRelations = relations(monitoringSchedules, ({ one }) => ({
  createdBy: one(users, {
    fields: [monitoringSchedules.createdById],
    references: [users.id],
    relationName: 'createdBy',
  }),
  assignedTo: one(users, {
    fields: [monitoringSchedules.assignedToUserId],
    references: [users.id],
    relationName: 'assignedTo',
  }),
}));


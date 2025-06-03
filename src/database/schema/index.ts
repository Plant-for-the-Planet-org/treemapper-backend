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
  bigint,
  char,
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
// ENUMS - INTERVENTION MANAGEMENT
// ============================================================================

// User and project enums
export const projectRoleEnum = pgEnum('project_role', ['owner', 'admin', 'manager', 'contributor', 'observer', 'researcher']);
export const inviteStatusEnum = pgEnum('invite_status', ['pending', 'accepted', 'declined', 'expired', 'discarded']);
export const userTypeEnum = pgEnum('user_type', ['individual', 'education', 'tpo', 'organization', 'student']);

// Site and tree enums
export const siteStatusEnum = pgEnum('site_status', ['planted', 'planting', 'barren', 'reforestation']);
export const treeStatusEnum = pgEnum('tree_status', ['alive', 'dead', 'unknown', 'removed']);
export const recordTypeEnum = pgEnum('record_type', [
  'planting',
  'measurement',
  'status_change',
  'inspection',
  'maintenance',
  'death',
  'removal',
  'health_assessment',
  'growth_monitoring'
]);

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
]);

export const speciesRequestStatusEnum = pgEnum('species_request_status', ['pending', 'approved', 'rejected']);
export const captureModeEnum = pgEnum('capture_mode', ['on_site', 'off_site']);
export const captureStatusEnum = pgEnum('capture_status', ['complete', 'partial', 'incomplete']);
export const interventionDiscriminatorEnum = pgEnum('intervention_discriminator', ['plot', 'intervention']);
export const treeTypeEnum = pgEnum('tree_enum', ['single', 'sample']);

// Coordinate and measurement enums
export const coordinateTypeEnum = pgEnum('coordinate_type', ['gps', 'manual', 'estimated']);
export const captureModeMethodEnum = pgEnum('capture_method', ['app', 'map', 'survey']);

// Image and media enums
export const imageTypeEnum = pgEnum('image_type', ['before', 'during', 'after', 'detail', 'overview', 'progress', 'aerial', 'ground', 'record']);

// Status enums
export const interventionStatusEnum = pgEnum('intervention_status', ['planned', 'active', 'completed', 'failed', 'on_hold', 'cancelled']);

// ============================================================================
// INTERVENTION CONFIGURATION TABLE
// ============================================================================

export const interventionConfigurations = pgTable('intervention_configurations', {
  id: serial('id').primaryKey(),
  interventionType: interventionTypeEnum('intervention_type').notNull().unique(),

  // Species capabilities
  allowsSpecies: boolean('allows_species').notNull().default(false),
  allowsMultipleSpecies: boolean('allows_multiple_species').notNull().default(false),
  requiresSpecies: boolean('requires_species').notNull().default(false),

  // Tree registration capabilities
  allowsTreeRegistration: boolean('allows_tree_registration').notNull().default(false),
  requiresTreeRegistration: boolean('requires_tree_registration').notNull().default(false),
  allowsSampleTrees: boolean('allows_sample_trees').notNull().default(false),

  // Configuration metadata
  description: text('description'),
  metadata: jsonb('metadata'),

  createdAt: timestamp('created_at', { withTimezone: true }).defaultNow().notNull(),
  updatedAt: timestamp('updated_at', { withTimezone: true }).defaultNow().notNull(),
}, (table) => ({
  interventionTypeIdx: index('intervention_config_type_idx').on(table.interventionType),
}));

// ============================================================================
// User Migrations Table
// ============================================================================

export const userMigrations = pgTable('user_migrations', {
  id: serial('id').primaryKey(),
  uid: varchar('uid', { length: 50 }).notNull().unique(),
  user: integer('user_id').notNull().references(() => users.id),
  planetId: varchar('planet_id', { length: 50 }).notNull().unique(),
  status: varchar('status', { length: 50 }).notNull().default('in_progress'), // completed, stoped
  migratedEntities: jsonb('migrated_entities').$type<{
    user: boolean;
    projects: boolean;
    sites: boolean;
    interventions: boolean;
    images: boolean;
  }>().default({
    "user": false,
    "projects": false,
    "sites": false,
    "interventions": false,
    "images": false,
  }),
  // Timestamps for tracking
  migrationStartedAt: timestamp('migration_started_at'),
  migrationCompletedAt: timestamp('migration_completed_at'),
  lastUpdatedAt: timestamp('last_updated_at'),
  email: varchar('email', { length: 320 }).notNull(),
  errorMessage: text('error_message'),
  retryCount: integer('retry_count').default(0),
  // Metadata
  migrationVersion: varchar('migration_version', { length: 50 }).default('1.0'),
  additionalMetadata: jsonb('additional_metadata'),
  createdAt: timestamp('created_at').defaultNow(),
  updatedAt: timestamp('updated_at').defaultNow(),
}, (table) => ({
  userIdx: index('user_id_idx').on(table.user),
  statusIdx: index('status_idx').on(table.status),
}));

// ============================================================================
// migration_log
// ============================================================================

export const migrationLogs = pgTable('migration_logs', {
  id: serial('id').primaryKey(),
  userMigrationId: integer('user_migration_id').references(() => userMigrations.id),
  uid: varchar('uid', { length: 50 }).notNull(),
  level: varchar('level', { length: 20 }).notNull(), // info, warning, error
  message: text('message').notNull(),
  entity: varchar('entity', { length: 50 }), // project sites
  entityId: varchar('entity_id', { length: 255 }),
  context: jsonb('context'),
  stackTrace: text('stack_trace'),
  createdAt: timestamp('created_at').defaultNow(),
});

// ============================================================================
// Data Conflicts
// ============================================================================

export const dataConflicts = pgTable('data_conflicts', {
  id: uuid('id').defaultRandom().primaryKey(),
  userMigrationId: integer('user_migration_id').references(() => userMigrations.id),

  entity: varchar('entity', { length: 50 }).notNull(),
  entityId: varchar('entity_id', { length: 255 }).notNull(),
  field: varchar('field', { length: 100 }).notNull(),

  oldValue: jsonb('old_value'),
  newValue: jsonb('new_value'),

  resolution: varchar('resolution', { length: 50 }), // keep_old, keep_new, merge, manual
  resolvedAt: timestamp('resolved_at'),
  resolvedBy: varchar('resolved_by', { length: 255 }), // system or user ID

  createdAt: timestamp('created_at').defaultNow(),
});




// ============================================================================
// USERS TABLE
// ============================================================================

export const users = pgTable('users', {
  id: serial('id').primaryKey(),
  uid: varchar('uid', { length: 50 }).notNull().unique(),
  auth0Id: varchar('auth0_id', { length: 500 }).notNull().unique(),
  email: varchar('email', { length: 320 }).notNull().unique(),
  authName: varchar('auth_name', { length: 255 }).notNull(),
  name: varchar('name', { length: 255 }),
  firstname: varchar('firstname', { length: 255 }),
  lastname: varchar('lastname', { length: 255 }),
  displayName: varchar('display_name', { length: 400 }),
  avatar: text('avatar'),
  avatarCdn: text('avatar_cdn'),
  slug: varchar('slug', { length: 100 }),
  type: userTypeEnum('type').default('individual'),
  country: char('country', { length: 2 }),
  url: text('url'),
  supportPin: varchar('support_pin', { length: 20 }),
  isPrivate: boolean('is_private').default(false).notNull(),
  bio: text('bio'),
  locale: varchar('locale', { length: 10 }).default('en_US'),
  isActive: boolean('is_active').default(true).notNull(),
  lastLoginAt: timestamp('last_login_at'),
  createdAt: timestamp('created_at', { withTimezone: true }).defaultNow().notNull(),
  updatedAt: timestamp('updated_at', { withTimezone: true }).defaultNow().notNull(),
  deletedAt: timestamp('deleted_at', { withTimezone: true }),
  migratedAt: timestamp('migrated_at', { withTimezone: true }),
}, (table) => ({
  emailIdx: index('users_email_idx').on(table.email),
  auth0IdIdx: index('users_auth0_id_idx').on(table.auth0Id),
  uidIdx: index('users_uid_idx').on(table.uid),
}));

// ============================================================================
// PROJECTS TABLE
// ============================================================================

export const projects = pgTable('projects', {
  id: serial('id').primaryKey(),
  uid: varchar('uid', { length: 50 }).notNull().unique(),
  createdById: integer('created_by_id').notNull().references(() => users.id),
  slug: varchar('slug', { length: 400 }).notNull().unique(),
  purpose: varchar('purpose', { length: 100 }),
  projectName: varchar('project_name', { length: 255 }).notNull(),
  projectType: varchar('project_type', { length: 100 }),
  ecosystem: varchar('ecosystem', { length: 100 }),
  projectScale: varchar('project_scale', { length: 100 }),
  target: integer('target'),
  projectWebsite: text('project_website'),
  description: text('description'),
  classification: varchar('classification', { length: 100 }),
  image: text('image'),
  imageCdn: text('image_cdn'),
  allImages: jsonb('images'),
  videoUrl: text('video_url'),
  country: varchar('country', { length: 2 }),
  location: geometry(4326)('location'),
  originalGeometry: jsonb('original_geometry'),
  latitude: doublePrecision('latitude'),
  longitude: doublePrecision('longitude'),
  geometryType: varchar('geometry_type', { length: 50 }),
  url: text('url'),
  linkText: varchar('link_text', { length: 100 }),
  isActive: boolean('is_active').notNull().default(true),
  isPublic: boolean('is_public').default(true).notNull(),
  isPrimary: boolean('is_primary').default(false).notNull(),
  isPersonal: boolean('is_personal').default(false).notNull(),
  intensity: varchar('intensity', { length: 100 }),
  revisionPeriodicityLevel: varchar('revision_periodicity_level', { length: 100 }),
  metadata: jsonb('metadata'),
  createdAt: timestamp('created_at', { withTimezone: true }).defaultNow().notNull(),
  updatedAt: timestamp('updated_at', { withTimezone: true }).defaultNow().notNull(),
  deletedAt: timestamp('deleted_at', { withTimezone: true }),
}, (table) => ({
  locationIdx: index('projects_location_gist_idx').using('gist', table.location),
  slugIdx: index('projects_slug_idx').on(table.slug),
  uidIdx: index('project_uid_idx').on(table.uid),
  createdByIdx: index('projects_created_by_idx').on(table.createdById),
  uniquePrimaryPerUser: uniqueIndex('projects_unique_primary_per_user_idx')
    .on(table.createdById)
    .where(sql`${table.isPrimary} = true`)
}));

// ============================================================================
// PROJECT MEMBERS TABLE
// ============================================================================

export const projectMembers = pgTable('project_members', {
  id: serial('id').primaryKey(),
  uid: varchar('uid', { length: 50 }).notNull().unique(),
  projectId: integer('project_id').notNull().references(() => projects.id, { onDelete: 'cascade' }),
  userId: integer('user_id').notNull().references(() => users.id, { onDelete: 'cascade' }),
  role: projectRoleEnum('role').notNull().default('contributor'),
  invitedAt: timestamp('invited_at', { withTimezone: true }),
  joinedAt: timestamp('joined_at', { withTimezone: true }).defaultNow(),
  createdAt: timestamp('created_at', { withTimezone: true }).defaultNow().notNull(),
  updatedAt: timestamp('updated_at', { withTimezone: true }).defaultNow().notNull(),
}, (table) => ({
  uniqueMember: unique('unique_project_member').on(table.projectId, table.userId),
  projectIdIdx: index('project_members_project_idx').on(table.projectId),
  userIdIdx: index('project_members_user_idx').on(table.userId),
  uidIdx: index('project_members_uid_idx').on(table.uid),
}));

// ============================================================================
// PROJECT INVITES TABLE
// ============================================================================

export const projectInvites = pgTable('project_invites', {
  id: serial('id').primaryKey(),
  uid: varchar('uid', { length: 50 }).notNull().unique(),
  projectId: integer('project_id').notNull().references(() => projects.id, { onDelete: 'cascade' }),
  email: varchar('email', { length: 320 }).notNull(),
  message: varchar('message', { length: 400 }),
  role: projectRoleEnum('role').notNull().default('contributor'),
  invitedById: integer('invited_by_id').notNull().references(() => users.id),
  status: inviteStatusEnum('status').notNull().default('pending'),
  token: uuid('token').defaultRandom().notNull().unique(),
  expiresAt: timestamp('expires_at', { withTimezone: true }).notNull(),
  acceptedAt: timestamp('accepted_at', { withTimezone: true }),
  createdAt: timestamp('created_at', { withTimezone: true }).defaultNow().notNull(),
  updatedAt: timestamp('updated_at', { withTimezone: true }).defaultNow().notNull(),
}, (table) => ({
  projectIdIdx: index('project_invites_project_idx').on(table.projectId),
  emailIdx: index('project_invites_email_idx').on(table.email),
  tokenIdx: unique('project_invites_token').on(table.token),
  projectStatusIdx: index('project_invites_project_status_idx').on(table.projectId, table.status)
}));

// ============================================================================
// SCIENTIFIC SPECIES TABLE
// ============================================================================

export const scientificSpecies = pgTable('scientific_species', {
  id: serial('id').primaryKey(),
  uid: varchar('uid', { length: 50 }).notNull().unique(),
  scientificName: varchar('scientific_name', { length: 255 }).notNull().unique(),
  commonName: varchar('common_name', { length: 400 }),
  description: text('description'),
  image: text('image'),
  imageCdn: text('image_cdn'),
  allImages: jsonb('images'),
  gbifId: varchar('gbif_id', { length: 100 }),
  createdAt: timestamp('created_at', { withTimezone: true }).defaultNow().notNull(),
  updatedAt: timestamp('updated_at', { withTimezone: true }).defaultNow().notNull(),
  deletedAt: timestamp('deleted_at', { withTimezone: true }),
  metadata: jsonb('metadata'),
}, (table) => ({
  scientificNameIdx: index('scientific_species_name_idx').on(table.scientificName),
  commonNameIdx: index('scientific_species_common_name_idx').on(table.commonName),
  uidIdx: index('scientific_species_uid_idx').on(table.uid),
}));

// ============================================================================
// PROJECT SPECIES TABLE
// ============================================================================

export const projectSpecies = pgTable('project_species', {
  id: serial('id').primaryKey(),
  uid: varchar('uid', { length: 50 }).notNull().unique(),
  scientificSpeciesId: integer('scientific_species_id').notNull().references(() => scientificSpecies.id),
  isNativeSpecies: boolean('is_native_species').default(false),
  isDisabled: boolean('is_disabled').default(false),
  projectId: integer('project_id').notNull().references(() => projects.id, { onDelete: 'cascade' }),
  addedById: integer('added_by_id').notNull().references(() => users.id, { onDelete: 'cascade' }), // User who added this species to the project
  aliases: varchar('aliases', { length: 255 }),
  commonName: varchar('local_name', { length: 255 }),
  image: text('image'),
  imageCdn: text('image_cdn'),
  allImages: jsonb('images'),
  description: text('description'),
  notes: text('notes'),
  favourite: boolean('favourite').default(false).notNull(),
  createdAt: timestamp('created_at', { withTimezone: true }).defaultNow().notNull(),
  updatedAt: timestamp('updated_at', { withTimezone: true }).defaultNow().notNull(),
  deletedAt: timestamp('deleted_at', { withTimezone: true }),
  metadata: jsonb('metadata'),
}, (table) => ({
  uniqueProjectSpecies: uniqueIndex('unique_project_species').on(table.projectId, table.scientificSpeciesId),
  scientificSpeciesIdx: index('project_species_scientific_species_idx').on(table.scientificSpeciesId),
  projectIdx: index('project_species_project_idx').on(table.projectId),
  addedByIdx: index('project_species_added_by_idx').on(table.addedById),
  uidIdx: index('project_species_uid_idx').on(table.uid),
  nativeSpeciesIdx: index('project_species_native_idx').on(table.isNativeSpecies),
}));

// ============================================================================
// SPECIES IMAGES TABLE
// ============================================================================

export const speciesImages = pgTable('species_images', {
  id: serial('id').primaryKey(),
  speciesId: integer('species_id').notNull().references(() => projectSpecies.id, { onDelete: 'cascade' }),
  filename: varchar('filename', { length: 255 }).notNull(),
  originalName: varchar('original_name', { length: 255 }),
  mimeType: varchar('mime_type', { length: 50 }),
  size: bigint('size', { mode: 'number' }),
  width: integer('width'),
  height: integer('height'),
  image: text('image'),
  imageCdn: text('image_cdn'),
  allImages: jsonb('images'),
  isPrimary: boolean('is_primary').default(false),
  hide: boolean('hide').default(false),
  createdAt: timestamp('created_at', { withTimezone: true }).defaultNow().notNull(),
  updatedAt: timestamp('updated_at', { withTimezone: true }).defaultNow().notNull(),
}, (table) => ({
  speciesIdIdx: index('species_images_species_id_idx').on(table.speciesId),
  primaryImageIdx: index('species_images_primary_idx').on(table.speciesId, table.isPrimary),
  sizeCheck: check('species_images_size_check', sql`size IS NULL OR size > 0`)
}));

// ============================================================================
// SPECIES REQUESTS TABLE
// ============================================================================

export const speciesRequests = pgTable('species_requests', {
  id: serial('id').primaryKey(),
  uid: varchar('uid', { length: 50 }).notNull().unique(),
  scientificName: varchar('scientific_name', { length: 255 }).notNull(),
  commonName: varchar('common_name', { length: 400 }),
  description: text('description'),
  requestReason: text('request_reason'),
  gbifId: varchar('gbif_id', { length: 100 }),

  // Request metadata
  requestedById: integer('requested_by_id').notNull().references(() => users.id, { onDelete: 'cascade' }),
  projectId: integer('project_id').references(() => projects.id, { onDelete: 'cascade' }), // Optional: species request for a specific project
  status: speciesRequestStatusEnum('status').notNull().default('pending'),

  // Admin handling
  reviewedById: integer('reviewed_by_id').references(() => users.id),
  adminNotes: text('admin_notes'),
  reviewedAt: timestamp('reviewed_at', { withTimezone: true }),

  createdAt: timestamp('created_at', { withTimezone: true }).defaultNow().notNull(),
  updatedAt: timestamp('updated_at', { withTimezone: true }).defaultNow().notNull(),
  deletedAt: timestamp('deleted_at', { withTimezone: true }),
}, (table) => ({
  requestedByIdx: index('species_requests_requested_by_idx').on(table.requestedById),
  statusIdx: index('species_requests_status_idx').on(table.status),
  scientificNameIdx: index('species_requests_scientific_name_idx').on(table.scientificName),
  reviewedByIdx: index('species_requests_reviewed_by_idx').on(table.reviewedById),
  projectIdx: index('species_requests_project_idx').on(table.projectId),
}));

// ============================================================================
// SITES TABLE
// ============================================================================

export const sites = pgTable('sites', {
  id: serial('id').primaryKey(),
  uid: varchar('uid', { length: 50 }).notNull().unique(),
  projectId: integer('project_id').notNull().references(() => projects.id, { onDelete: 'cascade' }),
  name: varchar('name', { length: 255 }).notNull(),
  description: text('description'),
  location: geometry(4326)('location'),
  originalGeometry: jsonb('original_geometry'),
  status: siteStatusEnum('status').default('barren'),
  createdById: integer('created_by_id').notNull().references(() => users.id),
  createdAt: timestamp('created_at', { withTimezone: true }).defaultNow().notNull(),
  updatedAt: timestamp('updated_at', { withTimezone: true }).defaultNow().notNull(),
  deletedAt: timestamp('deleted_at', { withTimezone: true }),
  metadata: jsonb('metadata'),
}, (table) => ({
  projectIdIdx: index('sites_project_id_idx').on(table.projectId),
  locationIdx: index('sites_location_gist_idx').using('gist', table.location),
  uidIdx: index('sites_uid_idx').on(table.uid),
}));

// ============================================================================
// SITE IMAGES TABLE
// ============================================================================

export const siteImages = pgTable('site_images', {
  id: serial('id').primaryKey(),
  uid: varchar('uid', { length: 50 }).notNull().unique(),
  siteId: integer('site_id').notNull().references(() => sites.id, { onDelete: 'cascade' }),
  filename: varchar('filename', { length: 255 }).notNull(),
  originalName: varchar('original_name', { length: 255 }),
  mimeType: varchar('mime_type', { length: 50 }),
  size: bigint('size', { mode: 'number' }),
  width: integer('width'),
  height: integer('height'),
  image: text('image'),
  imageCdn: text('image_cdn'),
  isPrimary: boolean('is_primary').default(false),
  caption: text('caption'),
  hide: boolean('hide').default(false),
  createdAt: timestamp('created_at', { withTimezone: true }).defaultNow().notNull(),
  updatedAt: timestamp('updated_at', { withTimezone: true }).defaultNow().notNull(),
  deletedAt: timestamp('deleted_at', { withTimezone: true }),
}, (table) => ({
  siteIdIdx: index('site_images_site_id_idx').on(table.siteId),
  primaryImageIdx: index('site_images_primary_idx').on(table.siteId, table.isPrimary)
}));

// ============================================================================
// ENHANCED INTERVENTIONS TABLE
// ============================================================================

export const interventions = pgTable('interventions', {
  id: serial('id').primaryKey(),
  uid: varchar('uid', { length: 50 }).notNull().unique(),
  hid: varchar('hid', { length: 16 }).notNull().unique(),
  discr: interventionDiscriminatorEnum('discr').notNull().default('intervention'),

  // Core relationships
  userId: integer('user_id').notNull().references(() => users.id),
  projectId: integer('project_id').references(() => projects.id),
  projectSiteId: integer('project_site_id').references(() => sites.id),
  parentInterventionId: integer('parent_intervention_id').references(() => interventions.id),

  // Intervention details
  type: interventionTypeEnum('type').notNull(),
  idempotencyKey: varchar('idempotency_key', { length: 64 }).unique().notNull(),

  // Capture information
  captureMode: captureModeEnum('capture_mode').notNull(),
  captureStatus: captureStatusEnum('capture_status').notNull().default('complete'),

  // Temporal data
  registrationDate: timestamp('registration_date', { withTimezone: true }).notNull(),
  interventionStartDate: timestamp('intervention_start_date', { withTimezone: true }).notNull(),
  interventionEndDate: timestamp('intervention_end_date', { withTimezone: true }).notNull(),

  // Spatial data
  location: geometry(4326)('location').notNull(),
  originalGeometry: jsonb('original_geometry').notNull(),
  geometryType: varchar('geometry_type', { length: 50 }),
  deviceLocation: jsonb('device_location'),

  // Intervention metrics
  treesPlanted: bigint('trees_planted', { mode: 'number' }),
  sampleTreeCount: bigint('sample_tree_count', { mode: 'number' }).default(0),


  // Status and quality
  interventionStatus: interventionStatusEnum('status').default('active'),

  // Content
  description: varchar('description', { length: 2048 }),

  // Images
  image: text('image'),
  imageCdn: text('image_cdn'),

  // Privacy and metadata
  isPrivate: boolean('is_private').default(false).notNull(),
  metadata: jsonb('metadata'),

  createdAt: timestamp('created_at', { withTimezone: true }).defaultNow().notNull(),
  updatedAt: timestamp('updated_at', { withTimezone: true }).defaultNow().notNull(),
  deletedAt: timestamp('deleted_at', { withTimezone: true }),
}, (table) => ({
  // Basic indexes
  discrIdx: index('interventions_discr_idx').on(table.discr),
  projectIdx: index('interventions_project_idx').on(table.projectId),
  projectSiteIdx: index('interventions_project_site_idx').on(table.projectSiteId),
  userIdx: index('interventions_user_idx').on(table.userId),
  typeIdx: index('interventions_type_idx').on(table.type),
  idempotencyKeyIdx: index('interventions_idempotencyKey_idx').on(table.idempotencyKey),
  captureModeIdx: index('interventions_capture_mode_idx').on(table.captureMode),
  captureStatusIdx: index('interventions_capture_status_idx').on(table.captureStatus),
  privateIdx: index('interventions_private_idx').on(table.isPrivate),
  parentIdx: index('interventions_parent_idx').on(table.parentInterventionId),
  uidIdx: index('interventions_uid_idx').on(table.uid),
  hidIdx: index('interventions_hid_idx').on(table.hid),

  // Temporal indexes
  startDateIdx: index('interventions_start_date_idx').on(table.interventionStartDate),
  endDateIdx: index('interventions_end_date_idx').on(table.interventionEndDate),
  dateRangeIdx: index('interventions_date_range_idx').on(table.interventionStartDate, table.interventionEndDate),

  // Metric indexes
  treesPlantedIdx: index('interventions_trees_planted_idx').on(table.treesPlanted),


  // Composite indexes
  userTypeIdx: index('interventions_user_type_idx').on(table.userId, table.type),

  // Performance indexes
  treeInterventionsIdx: index('interventions_with_trees_idx')
    .on(table.type)
    .where(sql`type IN ('multi-tree-registration', 'sample-tree-registration', 'single-tree-registration', 'enrichment-planting')`),

  // Constraints
  sampleTreeCountCheck: check('interventions_sample_tree_count_check', sql`sample_tree_count IS NULL OR sample_tree_count >= 0`),
  dateRangeCheck: check('interventions_date_range_check', sql`intervention_end_date >= intervention_start_date`),
}));

// ============================================================================
// FIXED INTERVENTION-SPECIES TABLE
// ============================================================================

export const interventionSpecies = pgTable('intervention_species', {
  id: serial('id').primaryKey(),
  uid: varchar('uid', { length: 50 }).notNull().unique(),
  interventionId: integer('intervention_id').notNull().references(() => interventions.id, { onDelete: 'cascade' }),

  scientificSpeciesId: integer('scientific_species_id').references(() => scientificSpecies.id),
  isUnknown: boolean('is_unknown').default(false).notNull(),
  customSpeciesName: varchar('custom_species_name', { length: 255 }),

  plantedCount: bigint('planted_count', { mode: 'number' }).default(0),
  survivalRate: decimal('survival_rate', { precision: 5, scale: 2 }), // Percentage
  notes: text('notes'),
  metadata: jsonb('metadata'),
  createdAt: timestamp('created_at', { withTimezone: true }).defaultNow().notNull(),
  updatedAt: timestamp('updated_at', { withTimezone: true }).defaultNow().notNull(),
  deletedAt: timestamp('deleted_at', { withTimezone: true }),
}, (table) => ({
  interventionIdx: index('intervention_species_intervention_idx').on(table.interventionId),
  speciesIdx: index('intervention_species_species_idx').on(table.scientificSpeciesId),
  plantedCountIdx: index('intervention_species_planted_count_idx').on(table.plantedCount),
  uidIdx: index('intervention_species_uid_idx').on(table.uid),
  plantedCountCheck: check('intervention_species_planted_count_check', sql`planted_count >= 0`)
}));

// ============================================================================
// ENHANCED TREES TABLE
// ============================================================================

export const trees = pgTable('trees', {
  id: serial('id').primaryKey(),
  uid: varchar('uid', { length: 50 }).notNull().unique(),
  hid: varchar('hid', { length: 50 }).notNull().unique(),

  // Core relationships
  interventionId: integer('intervention_id').references(() => interventions.id, { onDelete: 'set null' }),
  interventionSpeciesId: integer('intervention_species_id').references(() => interventionSpecies.id, { onDelete: 'set null' }),
  userId: integer('user_id').notNull().references(() => users.id),

  // Tree identification
  tag: varchar('tag', { length: 100 }),
  treeType: treeTypeEnum('tree_type').notNull(),

  // Location data
  latitude: doublePrecision('latitude').notNull(),
  longitude: doublePrecision('longitude').notNull(),
  altitude: decimal('altitude', { precision: 8, scale: 2 }),
  accuracy: decimal('accuracy', { precision: 6, scale: 2 }),

  // Core tree data
  plantingDate: date('planting_date').notNull(),

  // Current measurements
  height: doublePrecision('height'),
  width: doublePrecision('width'), // DBH

  // Capture metadata
  captureMode: captureModeEnum('capture_mode').notNull(),
  captureStatus: captureStatusEnum('capture_status').notNull().default('complete'),

  // Status tracking
  status: treeStatusEnum('status').default('alive').notNull(),
  statusReason: varchar('status_reason', { length: 100 }),
  statusChangedAt: timestamp('status_changed_at', { withTimezone: true }),


  // Measurement tracking
  lastMeasurementDate: timestamp('last_measurement_date', { withTimezone: true }),
  nextMeasurementDate: timestamp('next_measurement_date', { withTimezone: true }),
  measurementFrequency: integer('measurement_frequency_days'),

  // Images
  image: text('image'),

  // Metadata
  createdAt: timestamp('created_at', { withTimezone: true }).defaultNow().notNull(),
  updatedAt: timestamp('updated_at', { withTimezone: true }).defaultNow().notNull(),
  deletedAt: timestamp('deleted_at', { withTimezone: true }),
  metadata: jsonb('metadata'),
}, (table) => ({
  // Core indexes for common queries
  interventionIdx: index('trees_intervention_idx').on(table.interventionId),
  treeUidIdx: index('trees_uid_idx').on(table.uid),
  treeHidIdx: index('trees_hid_idx').on(table.hid),
  interventionSpeciesIdx: index('trees_intervention_species_idx').on(table.interventionSpeciesId),
  userIdIdx: index('trees_user_id_idx').on(table.userId),
  statusIdx: index('trees_status_idx').on(table.status),
  plantingDateIdx: index('trees_planting_date_idx').on(table.plantingDate),
  lastMeasurementIdx: index('trees_last_measurement_idx').on(table.lastMeasurementDate),
  nextMeasurementIdx: index('trees_next_measurement_idx').on(table.nextMeasurementDate),
  coordsIdx: index('trees_coords_idx').on(table.latitude, table.longitude),

  // Composite indexes for common queries
  statusDateIdx: index('trees_status_date_idx').on(table.status, table.statusChangedAt),
  interventionStatusIdx: index('trees_intervention_status_idx').on(table.interventionId, table.status),

  // Spatial index
  locationIdx: index('trees_location_gist_idx').using('gist', sql`ST_Point(longitude, latitude)`),

  // Constraints
  measurementFrequencyCheck: check('trees_measurement_frequency_check', sql`measurement_frequency_days IS NULL OR measurement_frequency_days > 0`),
}));

// ============================================================================
// ENHANCED TREE RECORDS TABLE
// ============================================================================

export const treeRecords = pgTable('tree_records', {
  id: serial('id').primaryKey(),
  uid: varchar('uid', { length: 50 }).notNull().unique(),
  treeId: integer('tree_id').notNull().references(() => trees.id, { onDelete: 'cascade' }),
  recordedById: integer('recorded_by_id').notNull().references(() => users.id),

  // Record metadata
  recordType: recordTypeEnum('record_type').notNull(),
  recordedAt: timestamp('recorded_at', { withTimezone: true }).defaultNow().notNull(),

  // Measurements
  height: doublePrecision('height'),
  width: doublePrecision('width'), // DBH

  // Health assessment
  healthScore: integer('health_score'), // 0-100 scale
  vitalityScore: integer('vitality_score'), // 0-100 scale
  structuralIntegrity: varchar('structural_integrity', { length: 50 }), // Stable, At Risk, Critical

  // Status changes
  previousStatus: treeStatusEnum('previous_status'),
  newStatus: treeStatusEnum('new_status'),
  statusReason: varchar('status_reason', { length: 100 }),

  // Observations
  findings: text('findings'),
  findingsSeverity: varchar('findings_severity', { length: 50 }), // Low, Medium, High, Critical
  findingsComments: text('findings_comments'), // Fixed typo from original
  notes: text('notes'),

  // Environmental conditions
  weatherConditions: jsonb('weather_conditions'),
  soilConditions: jsonb('soil_conditions'),
  surroundingVegetation: text('surrounding_vegetation'),

  // Threats and issues
  pestsObserved: jsonb('pests_observed'), // Array of pest types
  diseasesObserved: jsonb('diseases_observed'), // Array of disease types
  damageObserved: jsonb('damage_observed'), // Physical damage, human impact, etc.

  // Growth metrics
  growthRate: decimal('growth_rate', { precision: 6, scale: 3 }), // cm/month or similar
  leafDensity: varchar('leaf_density', { length: 50 }), // Dense, Moderate, Sparse
  fruitingStatus: varchar('fruiting_status', { length: 50 }), // None, Flowering, Fruiting

  // Intervention recommendations
  recommendedActions: jsonb('recommended_actions'),
  priorityLevel: varchar('priority_level', { length: 20 }), // Low, Medium, High, Urgent

  // Privacy and metadata
  isPublic: boolean('is_public').default(true).notNull(),
  deviceLocation: jsonb('device_location'),
  metadata: jsonb('metadata'),

  createdAt: timestamp('created_at', { withTimezone: true }).defaultNow().notNull(),
  updatedAt: timestamp('updated_at', { withTimezone: true }).defaultNow().notNull(),
  deletedAt: timestamp('deleted_at', { withTimezone: true }),
}, (table) => ({
  // Core relationship indexes
  treeIdIdx: index('tree_records_tree_id_idx').on(table.treeId),
  recordedByIdx: index('tree_records_recorded_by_idx').on(table.recordedById),
  recordTypeIdx: index('tree_records_type_idx').on(table.recordType),
  recordedAtIdx: index('tree_records_recorded_at_idx').on(table.recordedAt),
  uidIdx: index('tree_records_uid_idx').on(table.uid),

  // Composite indexes for common queries
  treeRecordTypeIdx: index('tree_records_tree_type_idx').on(table.treeId, table.recordType),
  treeRecordedAtIdx: index('tree_records_tree_recorded_at_idx').on(table.treeId, table.recordedAt),
  statusChangeIdx: index('tree_records_status_change_idx').on(table.treeId, table.newStatus),
  healthScoreIdx: index('tree_records_health_score_idx').on(table.healthScore),
  priorityLevelIdx: index('tree_records_priority_idx').on(table.priorityLevel),

  // Performance indexes
  latestRecordsIdx: index('tree_records_latest_idx')
    .on(table.treeId, table.recordedAt)
    .where(sql`deleted_at IS NULL`),
  measurementRecordsIdx: index('tree_records_measurements_idx')
    .on(table.treeId, table.recordedAt)
    .where(sql`record_type = 'measurement' AND deleted_at IS NULL`),
  healthRecordsIdx: index('tree_records_health_idx')
    .on(table.treeId, table.healthScore)
    .where(sql`health_score IS NOT NULL`),
  plantingRecordsIdx: index('tree_records_planting_idx')
    .on(table.treeId)
    .where(sql`record_type = 'planting'`),

  // Constraints
  healthScoreCheck: check('tree_records_health_score_check', sql`health_score IS NULL OR (health_score >= 0 AND health_score <= 100)`),
  vitalityScoreCheck: check('tree_records_vitality_score_check', sql`vitality_score IS NULL OR (vitality_score >= 0 AND vitality_score <= 100)`),
  statusChangeConsistency: check('tree_records_status_change_check',
    sql`(record_type = 'status_change' AND previous_status IS NOT NULL AND new_status IS NOT NULL) OR 
        (record_type != 'status_change')`),
}));

// ============================================================================
// INTERVENTION IMAGES TABLE
// ============================================================================

export const interventionImages = pgTable('intervention_images', {
  id: serial('id').primaryKey(),
  uid: varchar('uid', { length: 50 }).notNull().unique(),
  interventionId: integer('intervention_id').notNull().references(() => interventions.id, { onDelete: 'cascade' }),
  filename: varchar('filename', { length: 255 }).notNull(),
  originalName: varchar('original_name', { length: 255 }),
  mimeType: varchar('mime_type', { length: 50 }),
  size: bigint('size', { mode: 'number' }),
  width: integer('width'),
  height: integer('height'),
  image: text('image'),
  imageType: imageTypeEnum('image_type').notNull().default('detail'),
  isPrimary: boolean('is_primary').default(false),
  caption: text('caption'),
  createdAt: timestamp('created_at', { withTimezone: true }).defaultNow().notNull(),
  updatedAt: timestamp('updated_at', { withTimezone: true }).defaultNow().notNull(),
  deletedAt: timestamp('deleted_at', { withTimezone: true }),
}, (table) => ({
  interventionIdx: index('intervention_images_intervention_id_idx').on(table.interventionId),
  primaryImageIdx: index('intervention_images_primary_idx').on(table.interventionId, table.isPrimary),
  imageTypeIdx: index('intervention_images_type_idx').on(table.imageType),
}));

// ============================================================================
// FIXED TREE IMAGES TABLE
// ============================================================================

export const treeImages = pgTable('tree_images', {
  id: serial('id').primaryKey(),
  uid: varchar('uid', { length: 50 }).notNull().unique(),
  treeId: integer('tree_id').notNull().references(() => trees.id, { onDelete: 'cascade' }),
  treeRecordId: integer('tree_record_id').references(() => treeRecords.id, { onDelete: 'cascade' }),

  filename: varchar('filename', { length: 255 }).notNull(),
  originalName: varchar('original_name', { length: 255 }),
  mimeType: varchar('mime_type', { length: 50 }),
  size: bigint('size', { mode: 'number' }),
  width: integer('width'),
  height: integer('height'),

  // Image storage
  image: varchar('image', { length: 300 }), // Removed unique constraint - trees can share images

  // Image metadata
  imageType: imageTypeEnum('image_type').notNull().default('detail'),
  isPrimary: boolean('is_primary').default(false),
  caption: text('caption'),
  shootingAngle: varchar('shooting_angle', { length: 50 }), // Front, Side, Top, etc.

  // Timestamps
  createdAt: timestamp('created_at', { withTimezone: true }).defaultNow().notNull(),
  updatedAt: timestamp('updated_at', { withTimezone: true }).defaultNow().notNull(),
  deletedAt: timestamp('deleted_at', { withTimezone: true }),
}, (table) => ({
  treeIdIdx: index('tree_images_tree_id_idx').on(table.treeId),
  treeRecordIdx: index('tree_images_tree_record_idx').on(table.treeRecordId),
  primaryImageIdx: index('tree_images_primary_idx').on(table.treeId, table.isPrimary),
  imageTypeIdx: index('tree_images_type_idx').on(table.imageType),
}));

// ============================================================================
// NOTIFICATIONS TABLE
// ============================================================================

export const notifications = pgTable('notifications', {
  id: serial('id').primaryKey(),
  uid: varchar('uid', { length: 50 }).notNull().unique(),
  userId: integer('user_id').notNull().references(() => users.id, { onDelete: 'cascade' }),

  // Notification content
  type: varchar('type', { length: 50 }).notNull(),
  title: varchar('title', { length: 255 }).notNull(),
  message: text('message').notNull(),

  // Related entities
  relatedEntityType: varchar('related_entity_type', { length: 50 }),
  relatedEntityId: integer('related_entity_id'),

  // Notification metadata
  priority: varchar('priority', { length: 20 }).default('normal'),
  category: varchar('category', { length: 50 }),

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
  deliveryMethod: varchar('delivery_method', { length: 50 }).default('in_app'),
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
  userUnreadIdx: index('notifications_user_unread_idx').on(table.userId, table.isRead),
  userCategoryIdx: index('notifications_user_category_idx').on(table.userId, table.category),
  unreadNotificationsIdx: index('notifications_unread_idx').on(table.userId).where(sql`is_read = false AND is_archived = false`),
}));

// ============================================================================
// ENHANCED RELATIONS
// ============================================================================

export const userRelations = relations(users, ({ many }) => ({
  projectMemberships: many(projectMembers),
  createdProjects: many(projects, { relationName: 'createdBy' }),
  addedProjectSpecies: many(projectSpecies, { relationName: 'addedBy' }),
  createdSites: many(sites, { relationName: 'createdBy' }),
  createdTrees: many(trees, { relationName: 'createdBy' }),
  recordedTreeRecords: many(treeRecords, { relationName: 'recordedBy' }),
  sentInvites: many(projectInvites, { relationName: 'invitedBy' }),
  interventions: many(interventions, { relationName: 'userInterventions' }),
  notifications: many(notifications),
  speciesRequests: many(speciesRequests, { relationName: 'requestedBy' }),
  reviewedSpeciesRequests: many(speciesRequests, { relationName: 'reviewedBy' }),
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
  projectSpecies: many(projectSpecies),
  speciesRequests: many(speciesRequests),
}));

export const projectMemberRelations = relations(projectMembers, ({ one }) => ({
  project: one(projects, {
    fields: [projectMembers.projectId],
    references: [projects.id],
  }),
  user: one(users, {
    fields: [projectMembers.userId],
    references: [users.id],
  })
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
  projectSpecies: many(projectSpecies),
  interventionSpecies: many(interventionSpecies),
}));

export const projectSpeciesRelations = relations(projectSpecies, ({ one, many }) => ({
  project: one(projects, {
    fields: [projectSpecies.projectId],
    references: [projects.id],
  }),
  addedBy: one(users, {
    fields: [projectSpecies.addedById],
    references: [users.id],
    relationName: 'addedBy',
  }),
  scientificSpecies: one(scientificSpecies, {
    fields: [projectSpecies.scientificSpeciesId],
    references: [scientificSpecies.id],
  }),
  images: many(speciesImages),
}));

export const speciesImagesRelations = relations(speciesImages, ({ one }) => ({
  species: one(projectSpecies, {
    fields: [speciesImages.speciesId],
    references: [projectSpecies.id],
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
  images: many(siteImages),
  interventions: many(interventions),
}));

export const siteImagesRelations = relations(siteImages, ({ one }) => ({
  site: one(sites, {
    fields: [siteImages.siteId],
    references: [sites.id],
  }),
}));

export const interventionConfigurationRelations = relations(interventionConfigurations, ({ many }) => ({
  // No direct relations needed, but could be extended later
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
  user: one(users, {
    fields: [interventions.userId],
    references: [users.id],
    relationName: 'userInterventions',
  }),
  parentIntervention: one(interventions, {
    fields: [interventions.parentInterventionId],
    references: [interventions.id],
    relationName: 'parentIntervention',
  }),
  childInterventions: many(interventions, { relationName: 'parentIntervention' }),
  trees: many(trees),
  images: many(interventionImages),
  interventionSpecies: many(interventionSpecies),
}));

export const interventionSpeciesRelations = relations(interventionSpecies, ({ one, many }) => ({
  intervention: one(interventions, {
    fields: [interventionSpecies.interventionId],
    references: [interventions.id],
  }),
  scientificSpecies: one(scientificSpecies, {
    fields: [interventionSpecies.scientificSpeciesId],
    references: [scientificSpecies.id],
  }),
  trees: many(trees),
}));

export const treeRelations = relations(trees, ({ one, many }) => ({
  intervention: one(interventions, {
    fields: [trees.interventionId],
    references: [interventions.id],
  }),
  interventionSpecies: one(interventionSpecies, {
    fields: [trees.interventionSpeciesId],
    references: [interventionSpecies.id],
  }),
  createdBy: one(users, {
    fields: [trees.userId],
    references: [users.id],
    relationName: 'createdBy',
  }),
  records: many(treeRecords),
  images: many(treeImages),
}));

export const treeRecordRelations = relations(treeRecords, ({ one, many }) => ({
  tree: one(trees, {
    fields: [treeRecords.treeId],
    references: [trees.id],
  }),
  recordedBy: one(users, {
    fields: [treeRecords.recordedById],
    references: [users.id],
    relationName: 'recordedBy',
  }),
  images: many(treeImages),
}));

export const interventionImagesRelations = relations(interventionImages, ({ one }) => ({
  intervention: one(interventions, {
    fields: [interventionImages.interventionId],
    references: [interventions.id],
  })
}));

export const treeImagesRelations = relations(treeImages, ({ one }) => ({
  tree: one(trees, {
    fields: [treeImages.treeId],
    references: [trees.id],
  }),
  treeRecord: one(treeRecords, {
    fields: [treeImages.treeRecordId],
    references: [treeRecords.id],
  })
}));

export const notificationsRelations = relations(notifications, ({ one }) => ({
  user: one(users, {
    fields: [notifications.userId],
    references: [users.id],
  }),
}));

export const speciesRequestRelations = relations(speciesRequests, ({ one }) => ({
  requestedBy: one(users, {
    fields: [speciesRequests.requestedById],
    references: [users.id],
    relationName: 'requestedBy',
  }),
  reviewedBy: one(users, {
    fields: [speciesRequests.reviewedById],
    references: [users.id],
    relationName: 'reviewedBy',
  }),
  project: one(projects, {
    fields: [speciesRequests.projectId],
    references: [projects.id],
  }),
}));

export const userMigrationsRelations = relations(userMigrations, ({ many }) => ({
  logs: many(migrationLogs),
  conflicts: many(dataConflicts),
}));

export const migrationLogsRelations = relations(migrationLogs, ({ one }) => ({
  userMigration: one(userMigrations, {
    fields: [migrationLogs.userMigrationId],
    references: [userMigrations.id],
  }),
}));
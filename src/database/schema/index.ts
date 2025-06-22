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

interface GeoJSONGeometry {
  type: 'Point' | 'Polygon' | 'MultiPolygon';
  coordinates: number[] | number[][] | number[][][];
}

interface TreeRecordEntry {
  uid: string;
  recordedById: number;
  recordType: string; // Your record type enum values
  recordedAt: string;
  image?: string;
  height?: number;
  width?: number;
  healthScore?: number;
  vitalityScore?: number;
  structuralIntegrity?: string;
  previousStatus?: string; // Your tree status enum values
  newStatus?: string;
  statusReason?: string;
  findings?: string;
  findingsSeverity?: string;
  findingsComments?: string;
  notes?: string;
  weatherConditions?: any;
  soilConditions?: any;
  surroundingVegetation?: string;
  pestsObserved?: any;
  diseasesObserved?: any;
  damageObserved?: any;
  growthRate?: string;
  leafDensity?: string;
  fruitingStatus?: string;
  recommendedActions?: any;
  priorityLevel?: string;
  isPublic: boolean;
  deviceLocation?: any;
  metadata?: any;
  createdAt: string;
  updatedAt: string;
  deletedAt?: string;
}

export interface FlagReasonEntry {
  uid: string;
  type: string;
  level: string;
  title: string;
  message: string;
  updatedAt: Date;
  createdAt: Date
}

interface InterventionSpeciesEntry {
  uid: string;
  scientificSpeciesId: number;
  scientificSpeciesUid: string;
  speciesName?: string;
  isUnknown: boolean;
  otherSpeciesName?: string;
  count: number;
  createdAt: string;
  updatedAt: string;
  deletedAt?: string;
}

const geometryWithGeoJSON = (srid?: number) =>
  customType<{
    data: GeoJSONGeometry
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

// ============================================================================
// EXISTING ENUMS
// ============================================================================

export const projectRoleEnum = pgEnum('project_role', ['owner', 'admin', 'contributor', 'observer']);
export const inviteStatusEnum = pgEnum('invite_status', ['pending', 'accepted', 'declined', 'expired', 'discarded']);
export const userTypeEnum = pgEnum('user_type', ['individual', 'education', 'tpo', 'organization', 'student']);
export const siteStatusEnum = pgEnum('site_status', ['planted', 'planting', 'barren', 'reforestation']);
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
export const treeStatusEnum = pgEnum('tree_status', ['alive', 'dead', 'unknown', 'removed', 'sick']);
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
export const speciesRequestStatusEnum = pgEnum('species_request_status', ['pending', 'approved', 'rejected']);
export const captureModeEnum = pgEnum('capture_mode', ['on_site', 'off_site']);
export const captureStatusEnum = pgEnum('capture_status', ['complete', 'partial', 'incomplete']);
export const interventionDiscriminatorEnum = pgEnum('intervention_discriminator', ['plot', 'intervention']);
export const treeTypeEnum = pgEnum('tree_enum', ['single', 'sample', 'plot']);
export const coordinateTypeEnum = pgEnum('coordinate_type', ['gps', 'manual', 'estimated']);
export const captureModeMethodEnum = pgEnum('capture_method', ['app', 'map', 'survey', 'web_import']);
export const imageTypeEnum = pgEnum('image_type', ['before', 'during', 'after', 'detail', 'overview', 'progress', 'aerial', 'ground', 'record']);
export const interventionStatusEnum = pgEnum('intervention_status', ['planned', 'active', 'completed', 'failed', 'on_hold', 'cancelled']);
export const analyticsStatusEnum = pgEnum('analytics_status', ['processing', 'completed', 'failed', 'pending', 'partial']);
export const aggregationPeriodEnum = pgEnum('aggregation_period', ['daily', 'weekly', 'monthly', 'quarterly', 'yearly']);
export const migrationStatusEnum = pgEnum('migration_status', [
  'in_progress', 'completed', 'failed'
]);
export const logLevelEnum = pgEnum('log_level', [
  'debug',
  'info',
  'warning',
  'error',
  'fatal'
]);
export const entityEnum = pgEnum('entity_type', [
  'users',
  'projects',
  'interventions',
  'species',
  'sites',
  'images'
]);

// ============================================================================
// NEW ENUMS FOR ANALYTICS
// ============================================================================

export const deviceTypeEnum = pgEnum('device_type', ['mobile_app', 'web_app', 'tablet', 'desktop', 'api', 'import']);
export const activityTypeEnum = pgEnum('activity_type', [
  'tree_planted',
  'tree_measured',
  'tree_status_changed',
  'intervention_created',
  'intervention_updated',
  'site_created',
  'site_updated',
  'species_added',
  'image_uploaded',
  'project_joined',
  'project_updated'
]);
export const analyticsJobTypeEnum = pgEnum('analytics_job_type', ['on_demand', 'scheduled_monthly', 'manual_trigger']);
export const userActivityTierEnum = pgEnum('user_activity_tier', ['highly_active', 'moderate', 'low_activity', 'inactive']);

// ============================================================================
// User Migrations Table
// ============================================================================

export const userMigrations = pgTable('user_migrations', {
  id: serial('id').primaryKey(),
  uid: varchar('uid', { length: 50 }).notNull().unique(),
  userId: integer('user_id').notNull().references(() => users.id),
  planetId: varchar('planet_id', { length: 50 }).notNull().unique(),
  status: migrationStatusEnum('status').default('in_progress').notNull(),
  migratedEntities: jsonb('migrated_entities').$type<{
    user: boolean;
    projects: boolean;
    sites: boolean;
    species: boolean;
    interventions: boolean;
    images: boolean;
  }>().default({
    "user": false,
    "projects": false,
    "sites": false,
    "species": false,
    "interventions": false,
    "images": false,
  }),
  migrationCompletedAt: timestamp('migration_completed_at', { withTimezone: true }),
  errorMessage: text('error_message'),
  retryCount: integer('retry_count').default(0),
  migrationVersion: varchar('migration_version', { length: 50 }).default('1.0'),
  metadata: jsonb('metadata'),
  createdAt: timestamp('created_at', { withTimezone: true }).defaultNow().notNull(),
  updatedAt: timestamp('updated_at', { withTimezone: true }).defaultNow().notNull().$onUpdate(() => new Date()),
  flag: boolean('flag').default(false),
  flagReason: jsonb('flag_reason').$type<FlagReasonEntry[]>(),
  interventionPageUrl: text('intervention_page_url')
}, (table) => ({
  userIdx: index('user_id_idx').on(table.userId)
}));

// ============================================================================
// migration_log
// ============================================================================

export const migrationLogs = pgTable('migration_logs', {
  id: serial('id').primaryKey(),
  userMigrationId: integer('user_migration_id').notNull().references(() => userMigrations.id),
  uid: varchar('uid', { length: 50 }).notNull(),
  level: logLevelEnum('level').notNull(),
  message: text('message').notNull(),
  entity: entityEnum('entity'),
  entityId: varchar('entity_id', { length: 255 }),
  context: jsonb('context'),
  stackTrace: text('stack_trace'),
  createdAt: timestamp('created_at', { withTimezone: true }).defaultNow().notNull(),
}, (table) => ({
  userMigrationIdx: index('user_migration_id_idx').on(table.userMigrationId)
}))

// ============================================================================
// USERS TABLE
// ============================================================================

export const users = pgTable('users', {
  id: serial('id').primaryKey(),
  uid: varchar('uid', { length: 50 }).notNull().unique(),
  auth0Id: varchar('auth0_id', { length: 255 }).notNull().unique(),
  email: varchar('email', { length: 320 }).notNull().unique(),
  firstname: varchar('firstname', { length: 255 }),
  lastname: varchar('lastname', { length: 255 }),
  displayName: varchar('display_name', { length: 400 }),
  image: text('image'),
  slug: varchar('slug', { length: 100 }).unique(),
  type: userTypeEnum('type').default('individual'),
  country: char('country', { length: 2 }),
  url: text('url'),
  isPrivate: boolean('is_private').default(false).notNull(),
  isActive: boolean('is_active').default(true).notNull(),
  lastLoginAt: timestamp('last_login_at', { withTimezone: true }).defaultNow(),
  bio: text('bio'),
  locale: varchar('locale', { length: 10 }).default('en'),
  createdAt: timestamp('created_at', { withTimezone: true }).defaultNow().notNull(),
  updatedAt: timestamp('updated_at', { withTimezone: true }).defaultNow().notNull().$onUpdate(() => new Date()),
  flag: boolean('flag').default(false),
  flagReason: jsonb('flag_reason').$type<FlagReasonEntry[]>(),
  deletedAt: timestamp('deleted_at', { withTimezone: true }),
  migratedAt: timestamp('migrated_at', { withTimezone: true }),

  existingPlanetUser: boolean('existing_planet_user').default(false)
});

// ============================================================================
// PROJECTS TABLE
// ============================================================================

export const projects = pgTable('projects', {
  id: serial('id').primaryKey(),
  uid: varchar('uid', { length: 50 }).notNull().unique(),
  createdById: integer('created_by_id').notNull().references(() => users.id),
  slug: varchar('slug', { length: 255 }).notNull().unique(),
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
  videoUrl: text('video_url'),
  country: varchar('country', { length: 2 }),
  location: geometryWithGeoJSON(4326)('location'),
  originalGeometry: jsonb('original_geometry'),
  url: text('url'),
  isActive: boolean('is_active').notNull().default(true),
  isPublic: boolean('is_public').default(true).notNull(),
  isPrimary: boolean('is_primary').default(false).notNull(),
  isPersonal: boolean('is_personal').default(false).notNull(),
  intensity: varchar('intensity', { length: 100 }),
  revisionPeriodicityLevel: varchar('revision_periodicity_level', { length: 100 }),
  metadata: jsonb('metadata'),
  migratedProject: boolean('migrated_project').default(false),
  createdAt: timestamp('created_at', { withTimezone: true }).defaultNow().notNull(),
  updatedAt: timestamp('updated_at', { withTimezone: true }).defaultNow().notNull().$onUpdate(() => new Date()),
  flag: boolean('flag').default(false),
  flagReason: jsonb('flag_reason').$type<FlagReasonEntry[]>(),
}, (table) => ({
  locationIdx: index('projects_location_gist_idx').using('gist', table.location),
  createdByIdx: index('projects_created_by_idx').on(table.createdById),
}));

// ============================================================================
// PROJECT MEMBERS TABLE
// ============================================================================

export const projectMembers = pgTable('project_members', {
  id: serial('id').primaryKey(),
  uid: varchar('uid', { length: 50 }).notNull().unique(),
  projectId: integer('project_id').notNull().references(() => projects.id),
  userId: integer('user_id').notNull().references(() => users.id),
  projectRole: projectRoleEnum('project_role').notNull().default('contributor'),
  invitedAt: timestamp('invited_at', { withTimezone: true }),
  joinedAt: timestamp('joined_at', { withTimezone: true }),
  createdAt: timestamp('created_at', { withTimezone: true }).defaultNow().notNull(),
  updatedAt: timestamp('updated_at', { withTimezone: true }).defaultNow().notNull(),
}, (table) => ({
  uniqueMember: unique('unique_project_member').on(table.projectId, table.userId),
  projectIdIdx: index('project_members_project_idx').on(table.projectId),
  userIdIdx: index('project_members_user_idx').on(table.userId),
  projectRoleIdx: index('project_members_role_idx').on(table.projectRole),
}));

// ============================================================================
// PROJECT Images 
// ============================================================================

export const projectImages = pgTable('project_images', {
  id: serial('id').primaryKey(),
  uid: varchar('uid', { length: 50 }).notNull().unique(),
  projectId: integer('project_id').notNull().references(() => projects.id),
  filename: varchar('filename', { length: 255 }),
  originalName: varchar('original_name', { length: 255 }),
  mimeType: varchar('mime_type', { length: 50 }),
  size: bigint('size', { mode: 'number' }),
  width: integer('width'),
  height: integer('height'),
  caption: text('caption'),
  uploadedFrom: varchar('uploaded_from'),
  isPrimary: boolean('is_primary').default(false),
  isPrivate: boolean('is_private').default(false),
  createdAt: timestamp('created_at', { withTimezone: true }).defaultNow().notNull(),
  updatedAt: timestamp('updated_at', { withTimezone: true }).defaultNow().notNull(),
  deletedAt: timestamp('deleted_at', { withTimezone: true }),
}, (table) => ({
  projectIdIdx: index('project_images_site_id_idx').on(table.projectId)
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
  location: geometryWithGeoJSON(4326)('location'),
  originalGeometry: jsonb('original_geometry'),
  status: siteStatusEnum('status').default('planting'),
  createdById: integer('created_by_id').notNull().references(() => users.id),
  createdAt: timestamp('created_at', { withTimezone: true }).defaultNow().notNull(),
  updatedAt: timestamp('updated_at', { withTimezone: true }).defaultNow().notNull().$onUpdate(() => new Date()),
  flag: boolean('flag').default(false),
  flagReason: jsonb('flag_reason').$type<FlagReasonEntry[]>(),
  deletedAt: timestamp('deleted_at', { withTimezone: true }),
  metadata: jsonb('metadata'),
  migratedSite: boolean('migrated_site').default(false),
}, (table) => ({
  projectIdIdx: index('sites_project_id_idx').on(table.projectId),
  locationIdx: index('sites_location_gist_idx').using('gist', table.location),
}));

// ============================================================================
// SITE IMAGES TABLE
// ============================================================================

export const siteImages = pgTable('site_images', {
  id: serial('id').primaryKey(),
  uid: varchar('uid', { length: 50 }).notNull().unique(),
  siteId: integer('site_id').notNull().references(() => sites.id),
  filename: varchar('filename', { length: 255 }),
  originalName: varchar('original_name', { length: 255 }),
  mimeType: varchar('mime_type', { length: 50 }),
  size: bigint('size', { mode: 'number' }),
  width: integer('width'),
  height: integer('height'),
  isPrimary: boolean('is_primary').default(false),
  caption: text('caption'),
  isPrivate: boolean('is_private').default(false),
  createdAt: timestamp('created_at', { withTimezone: true }).defaultNow().notNull(),
  updatedAt: timestamp('updated_at', { withTimezone: true }).defaultNow().notNull(),
  deletedAt: timestamp('deleted_at', { withTimezone: true }),
}, (table) => ({
  siteIdIdx: index('site_images_site_id_idx').on(table.siteId),
  primaryImageIdx: index('site_images_primary_idx').on(table.siteId, table.isPrimary)
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
  discardedBy: integer('discarded_by').references(() => users.id),
  status: inviteStatusEnum('status').notNull().default('pending'),
  token: uuid('token').defaultRandom().notNull().unique(),
  expiresAt: timestamp('expires_at', { withTimezone: true }).notNull(),
  acceptedAt: timestamp('accepted_at', { withTimezone: true }),
  createdAt: timestamp('created_at', { withTimezone: true }).defaultNow().notNull(),
  updatedAt: timestamp('updated_at', { withTimezone: true })
    .defaultNow()
    .notNull()
    .$onUpdate(() => new Date()),
}, (table) => ({
  projectIdIdx: index('project_invites_project_idx').on(table.projectId),
  emailIdx: index('project_invites_email_idx').on(table.email),
  projectStatusIdx: index('project_invites_project_status_idx').on(table.projectId, table.status)
}));

export const projectAudit = pgTable('project_audit', {
  id: serial('id').primaryKey(),
  uid: varchar('uid', { length: 50 }).notNull().unique(),
  projectId: integer('project_id').notNull().references(() => projects.id),
  modifiedBy: integer('modified_by').notNull().references(() => users.id),
  description: text('description'),
  notes: text('notes'),
  title: text('title'),
  createdAt: timestamp('created_at', { withTimezone: true }).defaultNow().notNull(),
  updatedAt: timestamp('updated_at', { withTimezone: true }).defaultNow().notNull(),
  metadata: jsonb('metadata'),
}, (table) => ({
  projectIdx: index('project_species_project_idx').on(table.projectId),
  modifiedByIdx: index('modified_by_idx').on(table.modifiedBy),
}));

// ============================================================================
// SCIENTIFIC SPECIES TABLE
// ============================================================================

export const scientificSpecies = pgTable('scientific_species', {
  id: serial('id').primaryKey(),
  uid: varchar('uid', { length: 50 }).notNull().unique(),
  scientificName: varchar('scientific_name', { length: 255 }).notNull().unique(),
  commonName: varchar('common_name', { length: 255 }),
  family: varchar('family', { length: 100 }),
  genus: varchar('genus', { length: 100 }),
  description: text('description'),
  gbifId: varchar('gbif_id', { length: 100 }),
  createdAt: timestamp('created_at', { withTimezone: true }).defaultNow().notNull(),
  updatedAt: timestamp('updated_at', { withTimezone: true }).defaultNow().notNull(),
  deletedAt: timestamp('deleted_at', { withTimezone: true }),
  metadata: jsonb('metadata'),
}, (table) => ({
  scientificNameIdx: index('scientific_species_name_idx').on(table.scientificName),
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
  isEndangered: boolean('is_endangered').default(false),
  isDisabled: boolean('is_disabled').default(false),
  projectId: integer('project_id').notNull().references(() => projects.id),
  addedById: integer('added_by_id').notNull().references(() => users.id),
  commonName: varchar('common_name', { length: 255 }),
  image: text('image'),
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
  projectIdx: index('project_species_projects_idx').on(table.projectId),
  addedByIdx: index('project_species_added_by_idx').on(table.addedById),
  nativeSpeciesIdx: index('project_species_native_idx').on(table.isNativeSpecies),
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
  requestedById: integer('requested_by_id').notNull().references(() => users.id, { onDelete: 'cascade' }),
  projectId: integer('project_id').references(() => projects.id, { onDelete: 'cascade' }), // Optional: species request for a specific project
  status: speciesRequestStatusEnum('status').notNull().default('pending'),
  reviewedById: integer('reviewed_by_id').references(() => users.id),
  adminNotes: text('admin_notes'),
  reviewedAt: timestamp('reviewed_at', { withTimezone: true }),
  createdAt: timestamp('created_at', { withTimezone: true }).defaultNow().notNull(),
  updatedAt: timestamp('updated_at', { withTimezone: true }).defaultNow().notNull(),
  deletedAt: timestamp('deleted_at', { withTimezone: true }),
}, (table) => ({
  requestedByIdx: index('species_requests_requested_by_idx').on(table.requestedById)
}));

// ============================================================================
// SPECIES IMAGES TABLE
// ============================================================================

export const projectSpeciesImages = pgTable('project_species_images', {
  id: serial('id').primaryKey(),
  uid: varchar('uid', { length: 50 }).notNull().unique(),
  speciesId: integer('species_id').notNull().references(() => projectSpecies.id),
  filename: varchar('filename', { length: 255 }),
  originalName: varchar('original_name', { length: 255 }),
  mimeType: varchar('mime_type', { length: 50 }),
  size: bigint('size', { mode: 'number' }),
  width: integer('width'),
  height: integer('height'),
  isPrimary: boolean('is_primary').default(false),
  isPrivate: boolean('is_private').default(false),
  createdAt: timestamp('created_at', { withTimezone: true }).defaultNow().notNull(),
  updatedAt: timestamp('updated_at', { withTimezone: true }).defaultNow().notNull(),
}, (table) => ({
  uidIdxSpeciesImages: index('uid_species_image_idx').on(table.uid),
  speciesIdIdx: index('species_images_species_id_idx').on(table.speciesId)
}));

// ============================================================================
// ENHANCED INTERVENTIONS TABLE
// ============================================================================

export const interventions = pgTable('interventions', {
  id: serial('id').primaryKey(),
  uid: varchar('uid', { length: 50 }).notNull().unique(),
  hid: varchar('hid', { length: 16 }).notNull().unique(),
  discr: interventionDiscriminatorEnum('discr').notNull().default('intervention'),
  userId: integer('user_id').notNull().references(() => users.id),
  projectId: integer('project_id').references(() => projects.id),
  projectSiteId: integer('project_site_id').references(() => sites.id),
  parentInterventionId: integer('parent_intervention_id').references(() => interventions.id),
  type: interventionTypeEnum('type').notNull(),
  idempotencyKey: varchar('idempotency_key', { length: 64 }).unique().notNull(),
  captureMode: captureModeEnum('capture_mode').notNull(),
  captureStatus: captureStatusEnum('capture_status').notNull().default('complete'),
  registrationDate: timestamp('registration_date', { withTimezone: true }).notNull(),
  interventionStartDate: timestamp('intervention_start_date', { withTimezone: true }).notNull(),
  interventionEndDate: timestamp('intervention_end_date', { withTimezone: true }).notNull(),
  location: geometryWithGeoJSON(4326)('location').notNull(),
  originalGeometry: jsonb('original_geometry').notNull(),
  deviceLocation: jsonb('device_location'),
  treeCount: integer('tree_count').default(0),
  sampleTreeCount: integer('sample_tree_count').default(0),
  interventionStatus: interventionStatusEnum('intervention_status').default('active'),
  description: varchar('description', { length: 2048 }),
  image: text('image'),
  isPrivate: boolean('is_private').default(false).notNull(),
  metadata: jsonb('metadata'),
  createdAt: timestamp('created_at', { withTimezone: true }).defaultNow().notNull(),
  updatedAt: timestamp('updated_at', { withTimezone: true }).defaultNow().notNull().$onUpdate(() => new Date()),
  flag: boolean('flag').default(false),
  flagReason: jsonb('flag_reason').$type<FlagReasonEntry[]>(),
  deletedAt: timestamp('deleted_at', { withTimezone: true }),
  migrated_intervention: boolean('migrated_intervetion').default(false),
  species: jsonb('species').$type<InterventionSpeciesEntry[]>().default([]),
}, (table) => ({
  projectIdx: index('interventions_project_idx').on(table.projectId),
  projectSiteIdx: index('interventions_project_site_idx').on(table.projectSiteId),
  parentIdx: index('parent_idx').on(table.uid),
  userIdx: index('interventions_user_idx').on(table.userId),
  typeIdx: index('interventions_type_idx').on(table.type),
}));



export const trees = pgTable('trees', {
  id: serial('id').primaryKey(),
  hid: varchar('hid', { length: 16 }).notNull().unique(),
  uid: varchar('uid', { length: 50 }).notNull().unique(),
  interventionId: integer('intervention_id').references(() => interventions.id),
  interventionSpeciesId: varchar('intervention_species_id', { length: 50 }),
  speciesName: varchar('species_name'),
  isUnknown: boolean('is_unknown').default(false),
  createdById: integer('created_by_id').notNull().references(() => users.id),
  tag: varchar('tag', { length: 100 }),
  treeType: treeTypeEnum('treeType').default('sample'),
  latitude: doublePrecision('latitude'),
  longitude: doublePrecision('longitude'),
  altitude: decimal('altitude', { precision: 8, scale: 2 }),
  accuracy: decimal('accuracy', { precision: 6, scale: 2 }),
  location: geometryWithGeoJSON(4326)('location'),
  lastMeasuredHeight: doublePrecision('last_measured_height'),
  lastMeasuredWidth: doublePrecision('last_measured_width'),
  status: treeStatusEnum('status').default('alive').notNull(),
  statusReason: varchar('status_reason'),
  plantingDate: date('planting_date'),
  lastMeasurementDate: timestamp('last_measurement_date', { withTimezone: true }),
  nextMeasurementDate: timestamp('next_measurement_date', { withTimezone: true }),
  image: text('image'),
  createdAt: timestamp('created_at', { withTimezone: true }).defaultNow().notNull(),
  updatedAt: timestamp('updated_at', { withTimezone: true }).defaultNow().notNull(),
  deletedAt: timestamp('deleted_at', { withTimezone: true }),
  metadata: jsonb('metadata'),
  flag: boolean('flag').default(false),
  flagReason: jsonb('flag_reason').$type<FlagReasonEntry[]>(),
  records: jsonb('records').$type<TreeRecordEntry[]>().default([]),
}, (table) => ({
  interventionIdx: index('trees_intervention_idx').on(table.interventionId),
  createdByIdx: index('trees_created_by_idx').on(table.createdById),
  statusIdx: index('trees_status_idx').on(table.status),
  typeIdx: index('trees_type_idx').on(table.treeType),
  plantingDateIdx: index('trees_planting_date_idx').on(table.plantingDate),
  lastMeasurementIdx: index('trees_last_measurement_idx').on(table.lastMeasurementDate),
  locationIdx: index('trees_location_gist_idx').using('gist', table.location),
}));


export const interventionRecords = pgTable('intervention_records', {
  id: serial('id').primaryKey(),
  uid: varchar('uid', { length: 50 }).notNull().unique(),
  interventionId: integer('intervention_id').notNull().references(() => interventions.id),
  updatedBy: integer('updated_by').notNull().references(() => users.id),
  title: varchar('title'),
  description: text('description'),
  createdAt: timestamp('created_at', { withTimezone: true }).defaultNow().notNull(),
  updatedAt: timestamp('updated_at', { withTimezone: true }).defaultNow().notNull(),
}, (table) => ({
  interventionIdx: index('intervention_records_intervention_idx').on(table.interventionId),
  updatedByIdx: index('intervention_updated_by_idx').on(table.updatedBy),
}));

export const interventionImages = pgTable('intervention_images', {
  id: serial('id').primaryKey(),
  uid: varchar('uid', { length: 50 }).notNull().unique(),
  interventionId: integer('intervention_id').notNull().references(() => interventions.id),
  filename: varchar('filename', { length: 255 }),
  originalName: varchar('original_name', { length: 255 }),
  mimeType: varchar('mime_type', { length: 50 }),
  size: bigint('size', { mode: 'number' }),
  width: integer('width'),
  height: integer('height'),
  imageType: imageTypeEnum('image_type').notNull().default('detail'),
  isPrimary: boolean('is_primary').default(false),
  isPrivate: boolean('is_private').default(false),
  caption: text('caption'),
  createdAt: timestamp('created_at', { withTimezone: true }).defaultNow().notNull(),
  updatedAt: timestamp('updated_at', { withTimezone: true }).defaultNow().notNull(),
  deletedAt: timestamp('deleted_at', { withTimezone: true }),
}, (table) => ({
  interventionIdx: index('intervention_images_intervention_id_idx').on(table.interventionId)
}));

// ============================================================================
// USER ACTIVITY TABLE (NEW)
// ============================================================================

export const userActivity = pgTable('user_activity', {
  id: serial('id').primaryKey(),
  uid: varchar('uid', { length: 50 }).notNull().unique(),
  userId: integer('user_id').notNull().references(() => users.id),
  projectId: integer('project_id').references(() => projects.id),
  activityType: activityTypeEnum('activity_type').notNull(),
  entityType: varchar('entity_type', { length: 50 }),
  entityId: varchar('entity_id', { length: 50 }),
  entityUid: varchar('entity_uid', { length: 50 }),
  deviceType: deviceTypeEnum('device_type').notNull(),
  deviceInfo: jsonb('device_info'), // OS, browser, app version, etc.
  location: geometryWithGeoJSON(4326)('location'),
  ipAddress: varchar('ip_address', { length: 45 }),
  userAgent: text('user_agent'),
  metadata: jsonb('metadata'),
  createdAt: timestamp('created_at', { withTimezone: true }).defaultNow().notNull(),
}, (table) => ({
  userIdx: index('user_activity_user_idx').on(table.userId),
  projectIdx: index('user_activity_project_idx').on(table.projectId),
  activityTypeIdx: index('user_activity_type_idx').on(table.activityType),
  deviceTypeIdx: index('user_activity_device_idx').on(table.deviceType),
  createdAtIdx: index('user_activity_created_at_idx').on(table.createdAt),
  userProjectIdx: index('user_activity_user_project_idx').on(table.userId, table.projectId),
}));

// ============================================================================
// ANALYTICS JOBS TABLE
// ============================================================================

export const analyticsJobs = pgTable('analytics_jobs', {
  id: serial('id').primaryKey(),
  uid: varchar('uid', { length: 50 }).notNull().unique(),
  projectId: integer('project_id').notNull().references(() => projects.id),
  triggeredById: integer('triggered_by_id').references(() => users.id),
  jobType: analyticsJobTypeEnum('job_type').notNull(),
  status: analyticsStatusEnum('status').default('pending').notNull(),
  progress: integer('progress').default(0), // 0-100
  currentStep: varchar('current_step', { length: 100 }),
  totalSteps: integer('total_steps'),
  startedAt: timestamp('started_at', { withTimezone: true }),
  completedAt: timestamp('completed_at', { withTimezone: true }),
  errorMessage: text('error_message'),
  processingTime: integer('processing_time'), // seconds
  memoryUsage: bigint('memory_usage', { mode: 'number' }), // bytes
  version: varchar('version', { length: 20 }).default('1.0'),
  metadata: jsonb('metadata'),
  createdAt: timestamp('created_at', { withTimezone: true }).defaultNow().notNull(),
  updatedAt: timestamp('updated_at', { withTimezone: true }).defaultNow().notNull(),
}, (table) => ({
  projectIdx: index('analytics_jobs_project_idx').on(table.projectId),
  statusIdx: index('analytics_jobs_status_idx').on(table.status),
  triggeredByIdx: index('analytics_jobs_triggered_by_idx').on(table.triggeredById),
  jobTypeIdx: index('analytics_jobs_type_idx').on(table.jobType),
  createdAtIdx: index('analytics_jobs_created_at_idx').on(table.createdAt),
}));

// ============================================================================
// PROJECT ANALYTICS TABLE
// ============================================================================

export const projectAnalytics = pgTable('project_analytics', {
  id: serial('id').primaryKey(),
  uid: varchar('uid', { length: 50 }).notNull().unique(),
  projectId: integer('project_id').notNull().references(() => projects.id).unique(),
  analyticsJobId: integer('analytics_job_id').references(() => analyticsJobs.id),
  version: varchar('version', { length: 20 }).default('1.0'),

  // Core Tree Metrics
  totalTrees: integer('total_trees'),
  aliveTrees: integer('alive_trees'),
  deadTrees: integer('dead_trees'),
  sickTrees: integer('sick_trees'),
  unknownStatusTrees: integer('unknown_status_trees'),
  removedTrees: integer('removed_trees'),
  survivalRate: decimal('survival_rate', { precision: 5, scale: 2 }), // percentage

  // Growth Metrics
  averageHeight: decimal('average_height', { precision: 8, scale: 2 }),
  averageWidth: decimal('average_width', { precision: 8, scale: 2 }),
  averageHealthScore: decimal('average_health_score', { precision: 5, scale: 2 }),
  averageVitalityScore: decimal('average_vitality_score', { precision: 5, scale: 2 }),
  totalGrowthRate: decimal('total_growth_rate', { precision: 8, scale: 3 }),

  // Species Metrics
  totalSpecies: integer('total_species'),
  nativeSpeciesCount: integer('native_species_count'),
  endangeredSpeciesCount: integer('endangered_species_count'),
  speciesDiversityIndex: decimal('species_diversity_index', { precision: 6, scale: 3 }),

  // Site Metrics
  totalSites: integer('total_sites'),
  activeSites: integer('active_sites'),
  totalArea: decimal('total_area', { precision: 12, scale: 2 }), // square meters
  treeDensity: decimal('tree_density', { precision: 8, scale: 2 }), // trees per hectare

  // Intervention Metrics
  totalInterventions: integer('total_interventions'),
  completedInterventions: integer('completed_interventions'),
  activeInterventions: integer('active_interventions'),
  interventionSuccessRate: decimal('intervention_success_rate', { precision: 5, scale: 2 }),

  // Team Metrics
  totalMembers: integer('total_members'),
  activeMembers: integer('active_members'), // active in last 30 days
  ownerCount: integer('owner_count'),
  adminCount: integer('admin_count'),
  contributorCount: integer('contributor_count'),
  observerCount: integer('observer_count'),

  // Activity Metrics
  totalActivities: integer('total_activities'),
  activitiesLast30Days: integer('activities_last_30_days'),
  activitiesLast7Days: integer('activities_last_7_days'),
  treesPlantedLast30Days: integer('trees_planted_last_30_days'),
  measurementsTakenLast30Days: integer('measurements_taken_last_30_days'),

  // Target Progress
  targetTrees: integer('target_trees'),
  targetProgress: decimal('target_progress', { precision: 5, scale: 2 }), // percentage
  projectedCompletionDate: date('projected_completion_date'),

  // Device Usage
  mobileAppUsage: decimal('mobile_app_usage', { precision: 5, scale: 2 }), // percentage
  webAppUsage: decimal('web_app_usage', { precision: 5, scale: 2 }), // percentage
  tabletUsage: decimal('tablet_usage', { precision: 5, scale: 2 }), // percentage

  // Trends (month over month)
  treeGrowthTrend: decimal('tree_growth_trend', { precision: 5, scale: 2 }), // percentage change
  survivalRateTrend: decimal('survival_rate_trend', { precision: 5, scale: 2 }),
  activityTrend: decimal('activity_trend', { precision: 5, scale: 2 }),
  membershipTrend: decimal('membership_trend', { precision: 5, scale: 2 }),

  calculatedAt: timestamp('calculated_at', { withTimezone: true }).defaultNow().notNull(),
  createdAt: timestamp('created_at', { withTimezone: true }).defaultNow().notNull(),
  updatedAt: timestamp('updated_at', { withTimezone: true }).defaultNow().notNull(),
}, (table) => ({
  projectIdx: index('project_analytics_project_idx').on(table.projectId),
  calculatedAtIdx: index('project_analytics_calculated_at_idx').on(table.calculatedAt),
  versionIdx: index('project_analytics_version_idx').on(table.version),
}));

// ============================================================================
// PROJECT ANALYTICS HISTORY TABLE
// ============================================================================

export const projectAnalyticsHistory = pgTable('project_analytics_history', {
  id: serial('id').primaryKey(),
  uid: varchar('uid', { length: 50 }).notNull().unique(),
  projectId: integer('project_id').notNull().references(() => projects.id),
  analyticsJobId: integer('analytics_job_id').references(() => analyticsJobs.id),
  version: varchar('version', { length: 20 }).default('1.0'),
  period: aggregationPeriodEnum('period').notNull().default('monthly'),
  periodStart: date('period_start').notNull(),
  periodEnd: date('period_end').notNull(),

  // Snapshot of key metrics for this period
  totalTrees: integer('total_trees'),
  aliveTrees: integer('alive_trees'),
  deadTrees: integer('dead_trees'),
  survivalRate: decimal('survival_rate', { precision: 5, scale: 2 }),
  averageHeight: decimal('average_height', { precision: 8, scale: 2 }),
  averageWidth: decimal('average_width', { precision: 8, scale: 2 }),
  averageHealthScore: decimal('average_health_score', { precision: 5, scale: 2 }),
  totalSpecies: integer('total_species'),
  totalMembers: integer('total_members'),
  activeMembers: integer('active_members'),
  totalActivities: integer('total_activities'),
  treesPlanted: integer('trees_planted'),
  measurementsTaken: integer('measurements_taken'),
  interventionsCompleted: integer('interventions_completed'),
  targetProgress: decimal('target_progress', { precision: 5, scale: 2 }),

  createdAt: timestamp('created_at', { withTimezone: true }).defaultNow().notNull(),
}, (table) => ({
  projectIdx: index('project_analytics_history_project_idx').on(table.projectId),
  periodIdx: index('project_analytics_history_period_idx').on(table.periodStart, table.periodEnd),
  projectPeriodIdx: index('project_analytics_history_project_period_idx').on(table.projectId, table.periodStart),
}));

// ============================================================================
// SPECIES ANALYTICS TABLE
// ============================================================================

export const speciesAnalytics = pgTable('species_analytics', {
  id: serial('id').primaryKey(),
  uid: varchar('uid', { length: 50 }).notNull().unique(),
  projectId: integer('project_id').notNull().references(() => projects.id),
  scientificSpeciesId: integer('scientific_species_id').notNull().references(() => scientificSpecies.id),
  analyticsJobId: integer('analytics_job_id').references(() => analyticsJobs.id),
  version: varchar('version', { length: 20 }).default('1.0'),

  // Tree Counts
  totalTrees: integer('total_trees'),
  aliveTrees: integer('alive_trees'),
  deadTrees: integer('dead_trees'),
  sickTrees: integer('sick_trees'),
  survivalRate: decimal('survival_rate', { precision: 5, scale: 2 }),

  // Growth Performance
  averageHeight: decimal('average_height', { precision: 8, scale: 2 }),
  averageWidth: decimal('average_width', { precision: 8, scale: 2 }),
  averageGrowthRate: decimal('average_growth_rate', { precision: 8, scale: 3 }),
  averageHealthScore: decimal('average_health_score', { precision: 5, scale: 2 }),
  averageVitalityScore: decimal('average_vitality_score', { precision: 5, scale: 2 }),

  // Performance Rankings
  survivalRank: integer('survival_rank'),
  growthRateRank: integer('growth_rate_rank'),
  healthScoreRank: integer('health_score_rank'),
  overallPerformanceRank: integer('overall_performance_rank'),
  performanceScore: decimal('performance_score', { precision: 5, scale: 2 }), // composite score 0-100

  // Site Performance
  bestPerformingSiteId: integer('best_performing_site_id').references(() => sites.id),
  worstPerformingSiteId: integer('worst_performing_site_id').references(() => sites.id),
  sitesPlantedIn: integer('sites_planted_in'),

  // Temporal Data
  firstPlantingDate: date('first_planting_date'),
  lastPlantingDate: date('last_planting_date'),
  averageAge: integer('average_age'), // days

  // Activity
  totalMeasurements: integer('total_measurements'),
  lastMeasurementDate: timestamp('last_measurement_date', { withTimezone: true }),
  measurementFrequency: decimal('measurement_frequency', { precision: 5, scale: 2 }), // measurements per tree

  // Classification
  isNative: boolean('is_native'),
  isEndangered: boolean('is_endangered'),
  isFavourite: boolean('is_favourite'),

  // Recommendations
  recommendationScore: varchar('recommendation_score', { length: 20 }), // excellent, good, fair, poor
  recommendationNotes: text('recommendation_notes'),

  calculatedAt: timestamp('calculated_at', { withTimezone: true }).defaultNow().notNull(),
  createdAt: timestamp('created_at', { withTimezone: true }).defaultNow().notNull(),
  updatedAt: timestamp('updated_at', { withTimezone: true }).defaultNow().notNull(),
}, (table) => ({
  projectSpeciesIdx: uniqueIndex('species_analytics_project_species_idx').on(table.projectId, table.scientificSpeciesId),
  projectIdx: index('species_analytics_project_idx').on(table.projectId),
  survivalRankIdx: index('species_analytics_survival_rank_idx').on(table.survivalRank),
  performanceRankIdx: index('species_analytics_performance_rank_idx').on(table.overallPerformanceRank),
  calculatedAtIdx: index('species_analytics_calculated_at_idx').on(table.calculatedAt),
}));

// ============================================================================
// SITE ANALYTICS TABLE
// ============================================================================

export const siteAnalytics = pgTable('site_analytics', {
  id: serial('id').primaryKey(),
  uid: varchar('uid', { length: 50 }).notNull().unique(),
  projectId: integer('project_id').notNull().references(() => projects.id),
  siteId: integer('site_id').notNull().references(() => sites.id).unique(),
  analyticsJobId: integer('analytics_job_id').references(() => analyticsJobs.id),
  version: varchar('version', { length: 20 }).default('1.0'),

  // Tree Metrics
  totalTrees: integer('total_trees'),
  aliveTrees: integer('alive_trees'),
  deadTrees: integer('dead_trees'),
  sickTrees: integer('sick_trees'),
  survivalRate: decimal('survival_rate', { precision: 5, scale: 2 }),

  // Density and Area
  siteArea: decimal('site_area', { precision: 12, scale: 2 }), // square meters
  treeDensity: decimal('tree_density', { precision: 8, scale: 2 }), // trees per hectare
  plantedArea: decimal('planted_area', { precision: 12, scale: 2 }), // square meters
  coveragePercentage: decimal('coverage_percentage', { precision: 5, scale: 2 }),

  // Species Diversity
  totalSpecies: integer('total_species'),
  nativeSpeciesCount: integer('native_species_count'),
  endangeredSpeciesCount: integer('endangered_species_count'),
  speciesDiversityIndex: decimal('species_diversity_index', { precision: 6, scale: 3 }),
  dominantSpeciesId: integer('dominant_species_id').references(() => scientificSpecies.id),

  // Growth Performance
  averageHeight: decimal('average_height', { precision: 8, scale: 2 }),
  averageWidth: decimal('average_width', { precision: 8, scale: 2 }),
  averageGrowthRate: decimal('average_growth_rate', { precision: 8, scale: 3 }),
  averageHealthScore: decimal('average_health_score', { precision: 5, scale: 2 }),
  averageVitalityScore: decimal('average_vitality_score', { precision: 5, scale: 2 }),

  // Environmental Data (derived from location)
  averageElevation: decimal('average_elevation', { precision: 8, scale: 2 }),
  averageSlope: decimal('average_slope', { precision: 5, scale: 2 }),
  aspectDirection: varchar('aspect_direction', { length: 2 }), // N, NE, E, SE, S, SW, W, NW

  // Activity and Engagement
  totalInterventions: integer('total_interventions'),
  totalActivities: integer('total_activities'),
  activitiesLast30Days: integer('activities_last_30_days'),
  uniqueContributors: integer('unique_contributors'),
  lastActivityDate: timestamp('last_activity_date', { withTimezone: true }),

  // Performance Rankings
  survivalRateRank: integer('survival_rate_rank'),
  growthRateRank: integer('growth_rate_rank'),
  diversityRank: integer('diversity_rank'),
  activityRank: integer('activity_rank'),
  overallPerformanceRank: integer('overall_performance_rank'),
  performanceScore: decimal('performance_score', { precision: 5, scale: 2 }),

  // Temporal Data
  firstPlantingDate: date('first_planting_date'),
  lastPlantingDate: date('last_planting_date'),
  establishmentDuration: integer('establishment_duration'), // days

  calculatedAt: timestamp('calculated_at', { withTimezone: true }).defaultNow().notNull(),
  createdAt: timestamp('created_at', { withTimezone: true }).defaultNow().notNull(),
  updatedAt: timestamp('updated_at', { withTimezone: true }).defaultNow().notNull(),
}, (table) => ({
  projectIdx: index('site_analytics_project_idx').on(table.projectId),
  siteIdx: index('site_analytics_site_idx').on(table.siteId),
  survivalRateRankIdx: index('site_analytics_survival_rank_idx').on(table.survivalRateRank),
  performanceRankIdx: index('site_analytics_performance_rank_idx').on(table.overallPerformanceRank),
  calculatedAtIdx: index('site_analytics_calculated_at_idx').on(table.calculatedAt),
}));

// ============================================================================
// GEOSPATIAL ANALYTICS TABLE
// ============================================================================

export const geospatialAnalytics = pgTable('geospatial_analytics', {
  id: serial('id').primaryKey(),
  uid: varchar('uid', { length: 50 }).notNull().unique(),
  projectId: integer('project_id').notNull().references(() => projects.id).unique(),
  analyticsJobId: integer('analytics_job_id').references(() => analyticsJobs.id),
  version: varchar('version', { length: 20 }).default('1.0'),

  // Spatial Coverage
  totalProjectArea: decimal('total_project_area', { precision: 12, scale: 2 }), // square meters
  plantedArea: decimal('planted_area', { precision: 12, scale: 2 }),
  unplantedArea: decimal('unplanted_area', { precision: 12, scale: 2 }),
  coveragePercentage: decimal('coverage_percentage', { precision: 5, scale: 2 }),

  // Density Analysis
  averageTreeDensity: decimal('average_tree_density', { precision: 8, scale: 2 }), // trees per hectare
  highDensityZones: integer('high_density_zones'), // areas > 1000 trees/hectare
  mediumDensityZones: integer('medium_density_zones'), // 500-1000 trees/hectare
  lowDensityZones: integer('low_density_zones'), // < 500 trees/hectare

  // Performance Zones
  highSurvivalZones: integer('high_survival_zones'), // > 80% survival
  mediumSurvivalZones: integer('medium_survival_zones'), // 60-80% survival
  lowSurvivalZones: integer('low_survival_zones'), // < 60% survival

  // Clustering Analysis
  treeClusters: integer('tree_clusters'),
  averageClusterSize: decimal('average_cluster_size', { precision: 8, scale: 2 }),
  largestClusterSize: integer('largest_cluster_size'),
  isolatedTrees: integer('isolated_trees'), // trees > 100m from nearest neighbor

  // Environmental Correlation
  elevationRange: jsonb('elevation_range'), // {min, max, avg}
  slopeRange: jsonb('slope_range'), // {min, max, avg}
  aspectDistribution: jsonb('aspect_distribution'), // distribution by direction

  // Spatial Performance
  bestPerformingArea: geometryWithGeoJSON(4326)('best_performing_area'),
  worstPerformingArea: geometryWithGeoJSON(4326)('worst_performing_area'),
  highGrowthZones: geometryWithGeoJSON(4326)('high_growth_zones'),

  // Boundary Analysis
  boundaryLength: decimal('boundary_length', { precision: 12, scale: 2 }), // meters
  perimeterToAreaRatio: decimal('perimeter_to_area_ratio', { precision: 8, scale: 4 }),
  compactnessIndex: decimal('compactness_index', { precision: 6, scale: 3 }),

  // Distribution Metrics
  spatialDistributionIndex: decimal('spatial_distribution_index', { precision: 6, scale: 3 }),
  uniformityScore: decimal('uniformity_score', { precision: 5, scale: 2 }),

  calculatedAt: timestamp('calculated_at', { withTimezone: true }).defaultNow().notNull(),
  createdAt: timestamp('created_at', { withTimezone: true }).defaultNow().notNull(),
  updatedAt: timestamp('updated_at', { withTimezone: true }).defaultNow().notNull(),
}, (table) => ({
  projectIdx: index('geospatial_analytics_project_idx').on(table.projectId),
  calculatedAtIdx: index('geospatial_analytics_calculated_at_idx').on(table.calculatedAt),
  bestPerformingAreaIdx: index('geospatial_analytics_best_area_gist_idx').using('gist', table.bestPerformingArea),
  worstPerformingAreaIdx: index('geospatial_analytics_worst_area_gist_idx').using('gist', table.worstPerformingArea),
}));

// ============================================================================
// USER ENGAGEMENT ANALYTICS TABLE
// ============================================================================

export const userEngagementAnalytics = pgTable('user_engagement_analytics', {
  id: serial('id').primaryKey(),
  uid: varchar('uid', { length: 50 }).notNull().unique(),
  projectId: integer('project_id').notNull().references(() => projects.id).unique(),
  analyticsJobId: integer('analytics_job_id').references(() => analyticsJobs.id),
  version: varchar('version', { length: 20 }).default('1.0'),

  // Overall Activity
  totalActivities: integer('total_activities'),
  activitiesLast7Days: integer('activities_last_7_days'),
  activitiesLast30Days: integer('activities_last_30_days'),
  activitiesLast90Days: integer('activities_last_90_days'),

  // User Tiers
  highlyActiveUsers: integer('highly_active_users'), // > 10 activities/month
  moderateUsers: integer('moderate_users'), // 3-10 activities/month
  lowActivityUsers: integer('low_activity_users'), // 1-3 activities/month
  inactiveUsers: integer('inactive_users'), // 0 activities in last 30 days

  // Device Usage Distribution
  mobileAppActivities: integer('mobile_app_activities'),
  webAppActivities: integer('web_app_activities'),
  tabletActivities: integer('tablet_activities'),
  desktopActivities: integer('desktop_activities'),
  apiActivities: integer('api_activities'),
  importActivities: integer('import_activities'),

  // Device Usage Percentages
  mobileUsagePercentage: decimal('mobile_usage_percentage', { precision: 5, scale: 2 }),
  webUsagePercentage: decimal('web_usage_percentage', { precision: 5, scale: 2 }),
  tabletUsagePercentage: decimal('tablet_usage_percentage', { precision: 5, scale: 2 }),

  // Activity Types
  treesPlantedCount: integer('trees_planted_count'),
  treesMeasuredCount: integer('trees_measured_count'),
  statusChangesCount: integer('status_changes_count'),
  interventionsCreatedCount: integer('interventions_created_count'),
  sitesCreatedCount: integer('sites_created_count'),
  speciesAddedCount: integer('species_added_count'),
  imagesUploadedCount: integer('images_uploaded_count'),

  // Temporal Patterns
  mostActiveHour: integer('most_active_hour'), // 0-23
  mostActiveDayOfWeek: integer('most_active_day_of_week'), // 1-7
  mostActiveMonth: integer('most_active_month'), // 1-12

  // Collaboration Metrics
  teamCollaborationScore: decimal('team_collaboration_score', { precision: 5, scale: 2 }),
  crossMemberInteractions: integer('cross_member_interactions'),
  averageResponseTime: decimal('average_response_time', { precision: 8, scale: 2 }), // hours

  // Recent Activity Summary
  recentActivities: jsonb('recent_activities'), // Array of recent activity summaries
  topContributors: jsonb('top_contributors'), // Array of {userId, activityCount, lastActivity}

  // Retention Metrics
  newMembersLast30Days: integer('new_members_last_30_days'),
  activeMembersRetention: decimal('active_members_retention', { precision: 5, scale: 2 }),
  memberEngagementScore: decimal('member_engagement_score', { precision: 5, scale: 2 }),

  calculatedAt: timestamp('calculated_at', { withTimezone: true }).defaultNow().notNull(),
  createdAt: timestamp('created_at', { withTimezone: true }).defaultNow().notNull(),
  updatedAt: timestamp('updated_at', { withTimezone: true }).defaultNow().notNull(),
}, (table) => ({
  projectIdx: index('user_engagement_analytics_project_idx').on(table.projectId),
  calculatedAtIdx: index('user_engagement_analytics_calculated_at_idx').on(table.calculatedAt),
  mostActiveHourIdx: index('user_engagement_analytics_hour_idx').on(table.mostActiveHour),
  mostActiveDayIdx: index('user_engagement_analytics_day_idx').on(table.mostActiveDayOfWeek),
}));

// ============================================================================
// INTERVENTION ANALYTICS TABLE
// ============================================================================

export const interventionAnalytics = pgTable('intervention_analytics', {
  id: serial('id').primaryKey(),
  uid: varchar('uid', { length: 50 }).notNull().unique(),
  projectId: integer('project_id').notNull().references(() => projects.id).unique(),
  analyticsJobId: integer('analytics_job_id').references(() => analyticsJobs.id),
  version: varchar('version', { length: 20 }).default('1.0'),

  // Overall Intervention Metrics
  totalInterventions: integer('total_interventions'),
  completedInterventions: integer('completed_interventions'),
  activeInterventions: integer('active_interventions'),
  failedInterventions: integer('failed_interventions'),
  plannedInterventions: integer('planned_interventions'),
  onHoldInterventions: integer('on_hold_interventions'),
  cancelledInterventions: integer('cancelled_interventions'),

  // Success Rates by Type
  directSeedingSuccessRate: decimal('direct_seeding_success_rate', { precision: 5, scale: 2 }),
  enrichmentPlantingSuccessRate: decimal('enrichment_planting_success_rate', { precision: 5, scale: 2 }),
  maintenanceSuccessRate: decimal('maintenance_success_rate', { precision: 5, scale: 2 }),
  fencingSuccessRate: decimal('fencing_success_rate', { precision: 5, scale: 2 }),
  otherInterventionSuccessRate: decimal('other_intervention_success_rate', { precision: 5, scale: 2 }),

  // Temporal Analysis
  averageInterventionDuration: decimal('average_intervention_duration', { precision: 8, scale: 2 }), // days
  shortestInterventionDuration: decimal('shortest_intervention_duration', { precision: 8, scale: 2 }),
  longestInterventionDuration: decimal('longest_intervention_duration', { precision: 8, scale: 2 }),

  // Resource Analysis
  averageTreesPerIntervention: decimal('average_trees_per_intervention', { precision: 8, scale: 2 }),
  totalTreesFromInterventions: integer('total_trees_from_interventions'),
  interventionDensity: decimal('intervention_density', { precision: 8, scale: 2 }), // interventions per hectare

  // Seasonal Patterns
  springInterventions: integer('spring_interventions'),
  summerInterventions: integer('summer_interventions'),
  autumnInterventions: integer('autumn_interventions'),
  winterInterventions: integer('winter_interventions'),
  mostEffectiveSeason: varchar('most_effective_season', { length: 10 }),

  // Effectiveness Rankings
  mostSuccessfulInterventionType: varchar('most_successful_intervention_type', { length: 50 }),
  leastSuccessfulInterventionType: varchar('least_successful_intervention_type', { length: 50 }),

  // Follow-up Analysis
  interventionsWithFollowUp: integer('interventions_with_follow_up'),
  averageFollowUpTime: decimal('average_follow_up_time', { precision: 8, scale: 2 }), // days
  followUpSuccessRate: decimal('follow_up_success_rate', { precision: 5, scale: 2 }),

  // Site Distribution
  sitesWithInterventions: integer('sites_with_interventions'),
  averageInterventionsPerSite: decimal('average_interventions_per_site', { precision: 8, scale: 2 }),

  calculatedAt: timestamp('calculated_at', { withTimezone: true }).defaultNow().notNull(),
  createdAt: timestamp('created_at', { withTimezone: true }).defaultNow().notNull(),
  updatedAt: timestamp('updated_at', { withTimezone: true }).defaultNow().notNull(),
}, (table) => ({
  projectIdx: index('intervention_analytics_project_idx').on(table.projectId),
  calculatedAtIdx: index('intervention_analytics_calculated_at_idx').on(table.calculatedAt),
  mostSuccessfulTypeIdx: index('intervention_analytics_most_successful_idx').on(table.mostSuccessfulInterventionType),
}));

// ============================================================================
// NOTIFICATIONS TABLE
// ============================================================================

export const notifications = pgTable('notifications', {
  id: serial('id').primaryKey(),
  uid: varchar('uid', { length: 50 }).notNull().unique(),
  userId: integer('user_id').notNull().references(() => users.id, { onDelete: 'cascade' }),
  type: varchar('type', { length: 50 }).notNull(),
  title: varchar('title', { length: 255 }).notNull(),
  message: text('message').notNull(),
  relatedEntityType: varchar('related_entity_type', { length: 50 }),
  relatedEntityId: integer('related_entity_id'),
  priority: varchar('priority', { length: 20 }).default('normal'),
  category: varchar('category', { length: 50 }),
  isRead: boolean('is_read').default(false).notNull(),
  isArchived: boolean('is_archived').default(false).notNull(),
  actionUrl: text('action_url'),
  actionText: varchar('action_text', { length: 100 }),
  scheduledFor: timestamp('scheduled_for'),
  expiresAt: timestamp('expires_at'),
  deliveryMethod: varchar('delivery_method', { length: 50 }).default('in_app'),
  sentAt: timestamp('sent_at'),
  deliveredAt: timestamp('delivered_at'),
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

export const auditLogs = pgTable('audit_logs', {
  id: serial('id').primaryKey(),
  tableName: varchar('table_name', { length: 100 }).notNull(),
  recordUid: varchar('record_uid', { length: 50 }).notNull(),
  operation: varchar('operation', { length: 10 }).notNull(), // INSERT, UPDATE, DELETE
  oldValues: jsonb('old_values'),
  newValues: jsonb('new_values'),
  changedBy: integer('changed_by').references(() => users.id),
  changedAt: timestamp('changed_at').defaultNow().notNull(),
  ipAddress: varchar('ip_address', { length: 45 }),
  userAgent: text('user_agent'),
  metadata: jsonb('metadata'),
}, (table) => ({
  tableRecordIdx: index('audit_logs_table_record_idx').on(table.tableName, table.recordUid),
  userIdx: index('audit_logs_user_idx').on(table.changedBy),
  timeIdx: index('audit_logs_time_idx').on(table.changedAt),
}));

// ============================================================================
// RELATIONS
// ============================================================================

export const userRelations = relations(users, ({ many }) => ({
  projectMemberships: many(projectMembers),
  createdProjects: many(projects, { relationName: 'createdBy' }),
  addedProjectSpecies: many(projectSpecies, { relationName: 'addedBy' }),
  createdSites: many(sites, { relationName: 'createdBy' }),
  recordedIntervention: many(interventionRecords, { relationName: 'recordedBy' }),
  sentInvites: many(projectInvites, { relationName: 'invitedBy' }),
  interventions: many(interventions, { relationName: 'userInterventions' }),
  notifications: many(notifications),
  speciesRequests: many(speciesRequests, { relationName: 'requestedBy' }),
  reviewedSpeciesRequests: many(speciesRequests, { relationName: 'reviewedBy' }),
  triggeredAnalyticsJobs: many(analyticsJobs, { relationName: 'triggeredBy' }),
  activities: many(userActivity),
  createdTrees: many(trees, { relationName: 'createdBy' }),
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
  images: many(projectImages),
  analytics: one(projectAnalytics),
  analyticsHistory: many(projectAnalyticsHistory),
  speciesAnalytics: many(speciesAnalytics),
  siteAnalytics: many(siteAnalytics),
  geospatialAnalytics: one(geospatialAnalytics),
  userEngagementAnalytics: one(userEngagementAnalytics),
  interventionAnalytics: one(interventionAnalytics),
  analyticsJobs: many(analyticsJobs),
  activities: many(userActivity),
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
  speciesAnalytics: many(speciesAnalytics),
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
  images: many(projectSpeciesImages),
}));

export const projectSpeciesImagesRelations = relations(projectSpeciesImages, ({ one }) => ({
  species: one(projectSpecies, {
    fields: [projectSpeciesImages.speciesId],
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
  analytics: one(siteAnalytics),
}));

export const siteImagesRelations = relations(siteImages, ({ one }) => ({
  site: one(sites, {
    fields: [siteImages.siteId],
    references: [sites.id],
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
  images: many(interventionImages),
  records: many(interventionRecords),
  trees: many(trees),
}));



export const treesRelations = relations(trees, ({ one, many }) => ({
  intervention: one(interventions, {
    fields: [trees.interventionId],
    references: [interventions.id],
  }),
  createdBy: one(users, {
    fields: [trees.createdById],
    references: [users.id],
    relationName: 'createdBy',
  }),
}));



export const interventionRecordRelations = relations(interventionRecords, ({ one }) => ({
  intervention: one(interventions, {
    fields: [interventionRecords.interventionId],
    references: [interventions.id],
  }),
  updatedBy: one(users, {
    fields: [interventionRecords.updatedBy],
    references: [users.id],
    relationName: 'recordedBy',
  }),
}));

export const interventionImagesRelations = relations(interventionImages, ({ one }) => ({
  intervention: one(interventions, {
    fields: [interventionImages.interventionId],
    references: [interventions.id],
  })
}));

export const projectImagesRelations = relations(projectImages, ({ one }) => ({
  project: one(projects, {
    fields: [projectImages.projectId],
    references: [projects.id],
  })
}));

export const userActivityRelations = relations(userActivity, ({ one }) => ({
  user: one(users, {
    fields: [userActivity.userId],
    references: [users.id],
  }),
  project: one(projects, {
    fields: [userActivity.projectId],
    references: [projects.id],
  }),
}));

export const analyticsJobsRelations = relations(analyticsJobs, ({ one, many }) => ({
  project: one(projects, {
    fields: [analyticsJobs.projectId],
    references: [projects.id],
  }),
  triggeredBy: one(users, {
    fields: [analyticsJobs.triggeredById],
    references: [users.id],
    relationName: 'triggeredBy',
  }),
  projectAnalytics: many(projectAnalytics),
  projectAnalyticsHistory: many(projectAnalyticsHistory),
  speciesAnalytics: many(speciesAnalytics),
  siteAnalytics: many(siteAnalytics),
  geospatialAnalytics: many(geospatialAnalytics),
  userEngagementAnalytics: many(userEngagementAnalytics),
  interventionAnalytics: many(interventionAnalytics),
}));

export const projectAnalyticsRelations = relations(projectAnalytics, ({ one }) => ({
  project: one(projects, {
    fields: [projectAnalytics.projectId],
    references: [projects.id],
  }),
  analyticsJob: one(analyticsJobs, {
    fields: [projectAnalytics.analyticsJobId],
    references: [analyticsJobs.id],
  }),
}));

export const projectAnalyticsHistoryRelations = relations(projectAnalyticsHistory, ({ one }) => ({
  project: one(projects, {
    fields: [projectAnalyticsHistory.projectId],
    references: [projects.id],
  }),
  analyticsJob: one(analyticsJobs, {
    fields: [projectAnalyticsHistory.analyticsJobId],
    references: [analyticsJobs.id],
  }),
}));

export const speciesAnalyticsRelations = relations(speciesAnalytics, ({ one }) => ({
  project: one(projects, {
    fields: [speciesAnalytics.projectId],
    references: [projects.id],
  }),
  scientificSpecies: one(scientificSpecies, {
    fields: [speciesAnalytics.scientificSpeciesId],
    references: [scientificSpecies.id],
  }),
  analyticsJob: one(analyticsJobs, {
    fields: [speciesAnalytics.analyticsJobId],
    references: [analyticsJobs.id],
  }),
  bestPerformingSite: one(sites, {
    fields: [speciesAnalytics.bestPerformingSiteId],
    references: [sites.id],
  }),
  worstPerformingSite: one(sites, {
    fields: [speciesAnalytics.worstPerformingSiteId],
    references: [sites.id],
  }),
}));

export const siteAnalyticsRelations = relations(siteAnalytics, ({ one }) => ({
  project: one(projects, {
    fields: [siteAnalytics.projectId],
    references: [projects.id],
  }),
  site: one(sites, {
    fields: [siteAnalytics.siteId],
    references: [sites.id],
  }),
  analyticsJob: one(analyticsJobs, {
    fields: [siteAnalytics.analyticsJobId],
    references: [analyticsJobs.id],
  }),
  dominantSpecies: one(scientificSpecies, {
    fields: [siteAnalytics.dominantSpeciesId],
    references: [scientificSpecies.id],
  }),
}));

export const geospatialAnalyticsRelations = relations(geospatialAnalytics, ({ one }) => ({
  project: one(projects, {
    fields: [geospatialAnalytics.projectId],
    references: [projects.id],
  }),
  analyticsJob: one(analyticsJobs, {
    fields: [geospatialAnalytics.analyticsJobId],
    references: [analyticsJobs.id],
  }),
}));

export const userEngagementAnalyticsRelations = relations(userEngagementAnalytics, ({ one }) => ({
  project: one(projects, {
    fields: [userEngagementAnalytics.projectId],
    references: [projects.id],
  }),
  analyticsJob: one(analyticsJobs, {
    fields: [userEngagementAnalytics.analyticsJobId],
    references: [analyticsJobs.id],
  }),
}));

export const interventionAnalyticsRelations = relations(interventionAnalytics, ({ one }) => ({
  project: one(projects, {
    fields: [interventionAnalytics.projectId],
    references: [projects.id],
  }),
  analyticsJob: one(analyticsJobs, {
    fields: [interventionAnalytics.analyticsJobId],
    references: [analyticsJobs.id],
  }),
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
}));

export const migrationLogsRelations = relations(migrationLogs, ({ one }) => ({
  userMigration: one(userMigrations, {
    fields: [migrationLogs.userMigrationId],
    references: [userMigrations.id],
  }),
}));

export const projectAuditRelations = relations(projectAudit, ({ one }) => ({
  project: one(projects, {
    fields: [projectAudit.projectId],
    references: [projects.id],
  }),
  modifiedBy: one(users, {
    fields: [projectAudit.modifiedBy],
    references: [users.id],
  }),
}));
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
export const treeTypeEnum = pgEnum('tree_enum', ['single', 'sample','plot']);
export const coordinateTypeEnum = pgEnum('coordinate_type', ['gps', 'manual', 'estimated']);
export const captureModeMethodEnum = pgEnum('capture_method', ['app', 'map', 'survey', 'web_import']);
export const imageTypeEnum = pgEnum('image_type', ['before', 'during', 'after', 'detail', 'overview', 'progress', 'aerial', 'ground', 'record']);
export const interventionStatusEnum = pgEnum('intervention_status', ['planned', 'active', 'completed', 'failed', 'on_hold', 'cancelled']);
export const analyticsStatusEnum = pgEnum('analytics_status', ['processing', 'completed', 'failed', 'pending']);
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
  updatedAt: timestamp('updated_at', { withTimezone: true }).defaultNow().notNull(),
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
  projectIdx: index('project_species_project_idx').on(table.projectId),
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
  updatedAt: timestamp('updated_at', { withTimezone: true }).defaultNow().notNull(),
  deletedAt: timestamp('deleted_at', { withTimezone: true }),
  migrated_intervention: boolean('migrated_intervetion').default(false),
}, (table) => ({
  projectIdx: index('interventions_project_idx').on(table.projectId),
  projectSiteIdx: index('interventions_project_site_idx').on(table.projectSiteId),
  parentIdx: index('parent_idx').on(table.uid),
  userIdx: index('interventions_user_idx').on(table.userId),
  typeIdx: index('interventions_type_idx').on(table.type),
}));

export const interventionSpecies = pgTable('intervention_species', {
  id: serial('id').primaryKey(),
  uid: varchar('uid', { length: 50 }).notNull().unique(),
  interventionId: integer('intervention_id').notNull().references(() => interventions.id),
  scientificSpeciesId: integer('scientific_species_id').notNull().references(() => scientificSpecies.id),
  speciesName: varchar('species_name'),
  isUnknown:boolean('is_unknown').default(false),
  otherSpeciesName:varchar('other_species_name'),
  count: integer('count').default(1),
  createdAt: timestamp('created_at', { withTimezone: true }).defaultNow().notNull(),
  updatedAt: timestamp('updated_at', { withTimezone: true }).defaultNow().notNull(),
  deletedAt: timestamp('deleted_at', { withTimezone: true }),
}, (table) => ({
  interventionIdx: index('intervention_images_intervention_id_idx').on(table.interventionId)
}));

export const trees = pgTable('trees', {
  id: serial('id').primaryKey(),
  uid: varchar('uid', { length: 50 }).notNull().unique(),
  interventionId: integer('intervention_id').references(() => interventions.id),
  interventionSpeciesId: integer('intervention_species_id').references(() => interventionSpecies.id),
  createdById: integer('created_by_id').notNull().references(() => users.id),
  tag: varchar('tag', { length: 100 }),
  treeType: treeTypeEnum('treeType').default('sample'),
  latitude: doublePrecision('latitude').notNull(),
  longitude: doublePrecision('longitude').notNull(),
  altitude: decimal('altitude', { precision: 8, scale: 2 }),
  accuracy: decimal('accuracy', { precision: 6, scale: 2 }),
  location: geometryWithGeoJSON(4326)('location').notNull(),
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
}, (table) => ({
  interventionIdx: index('trees_intervention_idx').on(table.interventionId),
  interventionSpeciesIdx: index('trees_intervention_species_idx').on(table.interventionSpeciesId),
  createdByIdx: index('trees_created_by_idx').on(table.createdById),
  statusIdx: index('trees_status_idx').on(table.status),
  typeIdx: index('trees_type_idx').on(table.treeType),
  plantingDateIdx: index('trees_planting_date_idx').on(table.plantingDate),
  lastMeasurementIdx: index('trees_last_measurement_idx').on(table.lastMeasurementDate),
  locationIdx: index('projects_location_gist_idx').using('gist', table.location),
}));

// ============================================================================
// ENHANCED TREE RECORDS TABLE
// ============================================================================

export const treeRecords = pgTable('tree_records', {
  id: serial('id').primaryKey(),
  uid: varchar('uid', { length: 50 }).notNull().unique(),
  treeId: integer('tree_id').notNull().references(() => trees.id, { onDelete: 'cascade' }),
  recordedById: integer('recorded_by_id').notNull().references(() => users.id),
  recordType: recordTypeEnum('record_type').notNull(),
  recordedAt: timestamp('recorded_at', { withTimezone: true }).defaultNow().notNull(),
  image: text('image'),
  height: doublePrecision('height'),
  width: doublePrecision('width'),
  healthScore: integer('health_score'),
  vitalityScore: integer('vitality_score'),
  structuralIntegrity: varchar('structural_integrity', { length: 50 }),
  previousStatus: treeStatusEnum('previous_status'),
  newStatus: treeStatusEnum('new_status'),
  statusReason: varchar('status_reason', { length: 100 }),
  findings: text('findings'),
  findingsSeverity: varchar('findings_severity', { length: 50 }), // Low, Medium, High, Critical
  findingsComments: text('findings_comments'),
  notes: text('notes'),
  weatherConditions: jsonb('weather_conditions'),
  soilConditions: jsonb('soil_conditions'),
  surroundingVegetation: text('surrounding_vegetation'),
  pestsObserved: jsonb('pests_observed'),
  diseasesObserved: jsonb('diseases_observed'),
  damageObserved: jsonb('damage_observed'),
  growthRate: decimal('growth_rate', { precision: 6, scale: 3 }),
  leafDensity: varchar('leaf_density', { length: 50 }),
  fruitingStatus: varchar('fruiting_status', { length: 50 }),
  recommendedActions: jsonb('recommended_actions'),
  priorityLevel: varchar('priority_level', { length: 20 }),
  isPublic: boolean('is_public').default(true).notNull(),
  deviceLocation: jsonb('device_location'),
  metadata: jsonb('metadata'),
  createdAt: timestamp('created_at', { withTimezone: true }).defaultNow().notNull(),
  updatedAt: timestamp('updated_at', { withTimezone: true }).defaultNow().notNull(),
  deletedAt: timestamp('deleted_at', { withTimezone: true }),
}, (table) => ({
  treeIdIdx: index('tree_records_tree_id_idx').on(table.treeId),
  recordedByIdx: index('tree_records_recorded_by_idx').on(table.recordedById)
}));

export const interventionRecords = pgTable('intervention_records', {
  id: serial('id').primaryKey(),
  uid: varchar('uid', { length: 50 }).notNull().unique(),
  interventionId: integer('intervention_id').notNull().references(() => interventions.id),
  updatedBy: integer('updated_by').notNull().references(() => users.id),
  title:varchar('title'),
  description:text('description'),
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
// ANALYTICS TABLES - NEW ADDITIONS
// ============================================================================

// ============================================================================
// PROJECT ANALYTICS - Current snapshot of all KPIs per project
// ============================================================================

export const projectAnalytics = pgTable('project_analytics', {
  id: serial('id').primaryKey(),
  uid: varchar('uid', { length: 50 }).notNull().unique(),
  projectId: integer('project_id').notNull().references(() => projects.id, { onDelete: 'cascade' }),

  // Basic KPIs
  totalTreesPlanted: integer('total_trees_planted').default(0).notNull(),
  totalSpeciesPlanted: integer('total_species_planted').default(0).notNull(),
  areaCovered: decimal('area_covered', { precision: 12, scale: 2 }).default('0'), // in square meters
  totalActiveSites: integer('total_active_sites').default(0).notNull(),
  totalNativeSpecies: integer('total_native_species').default(0).notNull(),
  totalNonNativeSpecies: integer('total_non_native_species').default(0).notNull(),

  // Field data contributors
  totalContributors: integer('total_contributors').default(0).notNull(),
  activeContributors30Days: integer('active_contributors_30_days').default(0).notNull(),

  // Survival and growth metrics
  aliveTreesCount: integer('alive_trees_count').default(0).notNull(),
  deadTreesCount: integer('dead_trees_count').default(0).notNull(),
  unknownTreesCount: integer('unknown_trees_count').default(0).notNull(),
  overallSurvivalRate: decimal('overall_survival_rate', { precision: 5, scale: 2 }).default('0'), // percentage

  // Intervention distribution
  interventionTypesDistribution: jsonb('intervention_types_distribution').$type<Record<string, number>>().default({}),

  // Recent activity (last 30 days)
  recentTreesPlanted: integer('recent_trees_planted').default(0).notNull(),
  recentInterventions: integer('recent_interventions').default(0).notNull(),
  recentMeasurements: integer('recent_measurements').default(0).notNull(),

  // Monthly comparison data
  previousMonthTreesPlanted: integer('previous_month_trees_planted').default(0).notNull(),
  treesPlantedGrowthRate: decimal('trees_planted_growth_rate', { precision: 5, scale: 2 }).default('0'), // percentage change
  previousMonthInterventions: integer('previous_month_interventions').default(0).notNull(),
  interventionsGrowthRate: decimal('interventions_growth_rate', { precision: 5, scale: 2 }).default('0'),

  // Time-based data for graphs (last 12 months)
  monthlyTreesPlanted: jsonb('monthly_trees_planted').$type<Record<string, number>>().default({}), // {'2024-01': 150, '2024-02': 200}
  weeklyTreesPlanted: jsonb('weekly_trees_planted').$type<Record<string, number>>().default({}), // {'2024-W01': 35, '2024-W02': 45}
  dailyTreesPlanted: jsonb('daily_trees_planted').$type<Record<string, number>>().default({}), // last 30 days

  // Member activity summary
  memberActivitySummary: jsonb('member_activity_summary').$type<Array<{
    userId: number;
    userName: string;
    treesPlanted: number;
    interventions: number;
    lastActivity: string;
  }>>().default([]),

  // Calculation metadata
  calculatedAt: timestamp('calculated_at', { withTimezone: true }).defaultNow().notNull(),
  calculationDuration: integer('calculation_duration'), // milliseconds
  dataQualityScore: decimal('data_quality_score', { precision: 3, scale: 2 }), // 0-1 scale

  createdAt: timestamp('created_at', { withTimezone: true }).defaultNow().notNull(),
  updatedAt: timestamp('updated_at', { withTimezone: true }).defaultNow().notNull(),
}, (table) => ({
  projectIdUniqueIdx: uniqueIndex('project_analytics_project_unique').on(table.projectId),
  calculatedAtIdx: index('project_analytics_calculated_at_idx').on(table.calculatedAt),
}));

// ============================================================================
// PROJECT ANALYTICS HISTORY - Monthly snapshots for trend analysis
// ============================================================================

export const projectAnalyticsHistory = pgTable('project_analytics_history', {
  id: serial('id').primaryKey(),
  uid: varchar('uid', { length: 50 }).notNull().unique(),
  projectId: integer('project_id').notNull().references(() => projects.id, { onDelete: 'cascade' }),

  // Snapshot period
  snapshotYear: integer('snapshot_year').notNull(),
  snapshotMonth: integer('snapshot_month').notNull(), // 1-12
  snapshotDate: date('snapshot_date').notNull(), // YYYY-MM-DD format

  // Same KPIs as current analytics but as historical snapshots
  totalTreesPlanted: integer('total_trees_planted').default(0).notNull(),
  totalSpeciesPlanted: integer('total_species_planted').default(0).notNull(),
  areaCovered: decimal('area_covered', { precision: 12, scale: 2 }).default('0'),
  totalActiveSites: integer('total_active_sites').default(0).notNull(),
  totalNativeSpecies: integer('total_native_species').default(0).notNull(),
  totalNonNativeSpecies: integer('total_non_native_species').default(0).notNull(),
  totalContributors: integer('total_contributors').default(0).notNull(),
  aliveTreesCount: integer('alive_trees_count').default(0).notNull(),
  deadTreesCount: integer('dead_trees_count').default(0).notNull(),
  overallSurvivalRate: decimal('overall_survival_rate', { precision: 5, scale: 2 }).default('0'),

  // Month-specific metrics
  treesPlantedThisMonth: integer('trees_planted_this_month').default(0).notNull(),
  interventionsThisMonth: integer('interventions_this_month').default(0).notNull(),
  newMembersThisMonth: integer('new_members_this_month').default(0).notNull(),

  createdAt: timestamp('created_at', { withTimezone: true }).defaultNow().notNull(),
}, (table) => ({
  projectSnapshotIdx: uniqueIndex('project_analytics_history_project_snapshot').on(table.projectId, table.snapshotYear, table.snapshotMonth),
  snapshotDateIdx: index('project_analytics_history_snapshot_date_idx').on(table.snapshotDate),
  projectDateIdx: index('project_analytics_history_project_date_idx').on(table.projectId, table.snapshotDate),
}));

// ============================================================================
// SPECIES ANALYTICS - Species-specific metrics (survival, growth rates)
// ============================================================================

export const speciesAnalytics = pgTable('species_analytics', {
  id: serial('id').primaryKey(),
  uid: varchar('uid', { length: 50 }).notNull().unique(),
  projectId: integer('project_id').notNull().references(() => projects.id, { onDelete: 'cascade' }),
  scientificSpeciesId: integer('scientific_species_id').notNull().references(() => scientificSpecies.id),

  // Species identification
  scientificName: varchar('scientific_name', { length: 255 }).notNull(),
  commonName: varchar('common_name', { length: 400 }),
  isNative: boolean('is_native').default(false).notNull(),

  // Planting metrics
  totalPlanted: integer('total_planted').default(0).notNull(),
  currentAlive: integer('current_alive').default(0).notNull(),
  currentDead: integer('current_dead').default(0).notNull(),
  currentUnknown: integer('current_unknown').default(0).notNull(),

  // Survival metrics
  survivalRate: decimal('survival_rate', { precision: 5, scale: 2 }).default('0').notNull(), // percentage
  survivalRank: integer('survival_rank'), // rank among all species in project (1 = highest survival)

  // Growth metrics
  averageHeight: decimal('average_height', { precision: 8, scale: 2 }), // in cm
  averageWidth: decimal('average_width', { precision: 8, scale: 2 }), // in cm
  averageGrowthRate: decimal('average_growth_rate', { precision: 6, scale: 3 }), // cm per month
  growthRateRank: integer('growth_rate_rank'), // rank among all species (1 = fastest growing)

  // Measurement statistics
  totalMeasurements: integer('total_measurements').default(0).notNull(),
  lastMeasurementDate: timestamp('last_measurement_date', { withTimezone: true }),
  measurementFrequency: decimal('measurement_frequency', { precision: 5, scale: 2 }), // measurements per tree on average

  // Health metrics
  averageHealthScore: decimal('average_health_score', { precision: 5, scale: 2 }), // 0-100
  averageVitalityScore: decimal('average_vitality_score', { precision: 5, scale: 2 }), // 0-100

  // Performance indicators
  recommendedSpecies: boolean('recommended_species').default(false).notNull(), // based on survival + growth
  riskCategory: varchar('risk_category', { length: 20 }).default('low'), // low, medium, high

  // Calculation metadata
  calculatedAt: timestamp('calculated_at', { withTimezone: true }).defaultNow().notNull(),

  createdAt: timestamp('created_at', { withTimezone: true }).defaultNow().notNull(),
  updatedAt: timestamp('updated_at', { withTimezone: true }).defaultNow().notNull(),
}, (table) => ({
  projectSpeciesUniqueIdx: uniqueIndex('species_analytics_project_species').on(table.projectId, table.scientificSpeciesId),
  survivalRankIdx: index('species_analytics_survival_rank_idx').on(table.projectId, table.survivalRank),
  growthRankIdx: index('species_analytics_growth_rank_idx').on(table.projectId, table.growthRateRank),
  calculatedAtIdx: index('species_analytics_calculated_at_idx').on(table.calculatedAt),
}));

// ============================================================================
// SITE ANALYTICS - Site-level aggregations
// ============================================================================

export const siteAnalytics = pgTable('site_analytics', {
  id: serial('id').primaryKey(),
  uid: varchar('uid', { length: 50 }).notNull().unique(),
  projectId: integer('project_id').notNull().references(() => projects.id, { onDelete: 'cascade' }),
  siteId: integer('site_id').notNull().references(() => sites.id, { onDelete: 'cascade' }),

  // Basic metrics
  siteName: varchar('site_name', { length: 255 }).notNull(),
  siteArea: decimal('site_area', { precision: 12, scale: 2 }), // square meters
  totalInterventions: integer('total_interventions').default(0).notNull(),
  totalTreesPlanted: integer('total_trees_planted').default(0).notNull(),

  // Status distribution
  aliveTreesCount: integer('alive_trees_count').default(0).notNull(),
  deadTreesCount: integer('dead_trees_count').default(0).notNull(),
  unknownTreesCount: integer('unknown_trees_count').default(0).notNull(),
  survivalRate: decimal('survival_rate', { precision: 5, scale: 2 }).default('0'),

  // Species diversity
  uniqueSpeciesCount: integer('unique_species_count').default(0).notNull(),
  nativeSpeciesCount: integer('native_species_count').default(0).notNull(),
  nativeSpeciesPercentage: decimal('native_species_percentage', { precision: 5, scale: 2 }).default('0'),

  // Activity metrics
  lastInterventionDate: timestamp('last_intervention_date', { withTimezone: true }),
  lastMeasurementDate: timestamp('last_measurement_date', { withTimezone: true }),
  activeContributors: integer('active_contributors').default(0).notNull(),

  // Performance metrics
  densityPerHectare: decimal('density_per_hectare', { precision: 8, scale: 2 }), // trees per hectare
  siteProductivityScore: decimal('site_productivity_score', { precision: 5, scale: 2 }), // 0-100 based on survival + growth

  calculatedAt: timestamp('calculated_at', { withTimezone: true }).defaultNow().notNull(),
  createdAt: timestamp('created_at', { withTimezone: true }).defaultNow().notNull(),
  updatedAt: timestamp('updated_at', { withTimezone: true }).defaultNow().notNull(),
}, (table) => ({
  projectSiteUniqueIdx: uniqueIndex('site_analytics_project_site').on(table.projectId, table.siteId),
  survivalRateIdx: index('site_analytics_survival_rate_idx').on(table.projectId, table.survivalRate),
  calculatedAtIdx: index('site_analytics_calculated_at_idx').on(table.calculatedAt),
}));

// ============================================================================
// ANALYTICS CALCULATION JOBS - Track analytics refresh operations
// ============================================================================

export const analyticsJobs = pgTable('analytics_jobs', {
  id: serial('id').primaryKey(),
  uid: varchar('uid', { length: 50 }).notNull().unique(),
  projectId: integer('project_id').notNull().references(() => projects.id, { onDelete: 'cascade' }),

  jobType: varchar('job_type', { length: 50 }).notNull(), // 'full_refresh', 'incremental_update'
  status: analyticsStatusEnum('status').notNull().default('processing'),
  triggeredBy: integer('triggered_by').references(() => users.id), // user who triggered the refresh

  // Execution details
  startedAt: timestamp('started_at', { withTimezone: true }).defaultNow().notNull(),
  completedAt: timestamp('completed_at', { withTimezone: true }),
  duration: integer('duration'), // milliseconds

  // Progress tracking
  totalSteps: integer('total_steps').default(0),
  completedSteps: integer('completed_steps').default(0),
  currentStep: varchar('current_step', { length: 100 }),

  // Results
  recordsProcessed: integer('records_processed').default(0),
  errorsEncountered: integer('errors_encountered').default(0),
  errorMessage: text('error_message'),

  // Metadata
  metadata: jsonb('metadata'), // additional job-specific data

  createdAt: timestamp('created_at', { withTimezone: true }).defaultNow().notNull(),
  updatedAt: timestamp('updated_at', { withTimezone: true }).defaultNow().notNull(),
}, (table) => ({
  projectStatusIdx: index('analytics_jobs_project_status_idx').on(table.projectId, table.status),
  startedAtIdx: index('analytics_jobs_started_at_idx').on(table.startedAt),
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
  // Analytics relations
  analytics: one(projectAnalytics),
  analyticsHistory: many(projectAnalyticsHistory),
  speciesAnalytics: many(speciesAnalytics),
  siteAnalytics: many(siteAnalytics),
  analyticsJobs: many(analyticsJobs),
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
  images: many(speciesImages),
}));

export const speciesImagesRelations = relations(projectSpeciesImages, ({ one }) => ({
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
}));

export const interventionRecordRelations = relations(interventionRecords, ({ one }) => ({
  intervention: one(interventions, {
    fields: [interventionRecords.interventionId],
    references: [interventions.id],
    relationName: 'interventionId',
  }),
  recordedBy: one(users, {
    fields: [interventionRecords.recordedById],
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
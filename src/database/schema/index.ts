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
export const projectRoleEnum = pgEnum('project_role', ['owner', 'admin', 'manager', 'contributor', 'observer', 'researcher',]);
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

export const captureModeEnum = pgEnum('capture_mode', ['on_site', 'off_site']);
export const captureStatusEnum = pgEnum('capture_status', ['complete', 'partial', 'incomplete']);
export const allocationPriorityEnum = pgEnum('allocation_priority', ['manual', 'automatic', 'high', 'medium', 'low']);
export const interventionDiscriminatorEnum = pgEnum('intervention_discriminator', ['base', 'generic', 'plot', 'sample', 'intervention']);
export const interventionStatusEnum = pgEnum('intervention_status', ['active', 'completed', 'cancelled', 'pending', 'failed']);

// Coordinate and measurement enums
export const coordinateTypeEnum = pgEnum('coordinate_type', ['gps', 'manual', 'estimated']);
export const captureModeMethodEnum = pgEnum('capture_method', ['device', 'map', 'survey']);

// Image and media enums
export const imageTypeEnum = pgEnum('image_type', ['before', 'during', 'after', 'detail', 'overview', 'progress', 'aerial', 'ground']);

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
  migratedAt: timestamp('migrated_at'),
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
  scientificName: varchar('scientific_name', { length: 255 }).notNull().unique(),
  commonName: varchar('common_name', { length: 255 }),
  description: text('description'),
  defaultImage: text('default_image'),
  gbifId: varchar('gbif_id', { length: 50 }), // Global Biodiversity Information Facility
  createdAt: timestamp('created_at').defaultNow().notNull(),
  updatedAt: timestamp('updated_at').defaultNow().notNull(),
  deletedAt: timestamp('deleted_at'),
  metadata: jsonb('metadata'), // Expected: { traits: object, references: array }
}, (table) => ({
  scientificNameIdx: index('scientific_species_name_idx').on(table.scientificName)
}));

// ============================================================================
// USER SPECIES TABLE
// ============================================================================

export const userSpecies = pgTable('user_species', {
  id: serial('id').primaryKey(),
  guid: varchar('guid', { length: 36 }).notNull().unique(),
  scientificSpeciesId: integer('scientific_species_id').notNull().references(() => scientificSpecies.id),
  userId: integer('user_id').notNull().references(() => users.id, { onDelete: 'cascade' }),
  aliases: varchar('aliases', { length: 255 }),
  localName: varchar('local_name', { length: 255 }),
  image: varchar('image', { length: 255 }),
  description: varchar('description', { length: 255 }),
  notes: text('notes'),
  createdAt: timestamp('created_at').defaultNow().notNull(),
  updatedAt: timestamp('updated_at').defaultNow().notNull(),
  deletedAt: timestamp('deleted_at'),
  metadata: jsonb('metadata'), // Expected: { customAttributes: object }
}, (table) => ({
  uniqueUserSpecies: uniqueIndex('unique_user_species').on(table.userId, table.scientificSpeciesId),
  scientificSpeciesIdx: index('user_species_scientific_species_idx').on(table.scientificSpeciesId),
  userIdx: index('user_species_user_idx').on(table.userId),
  aliasesIdx: index('user_species_aliases_idx').on(table.aliases),
}));

// ============================================================================
// SPECIES IMAGES TABLE
// ============================================================================

export const speciesImages = pgTable('species_images', {
  id: serial('id').primaryKey(),
  speciesId: integer('species_id').notNull().references(() => userSpecies.id, { onDelete: 'cascade' }),
  // Image details
  filename: varchar('filename', { length: 255 }).notNull(),
  originalName: varchar('original_name', { length: 255 }),
  mimeType: varchar('mime_type', { length: 100 }),
  size: integer('size'),
  createdAt: timestamp('created_at').defaultNow().notNull(),
  updatedAt: timestamp('updated_at').defaultNow().notNull(),
}, (table) => ({
  speciesIdIdx: index('species_images_species_id_idx').on(table.speciesId),
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
  // Composite indexes for common queries
  projectStatusIdx: index('sites_project_status_idx').on(table.projectId, table.status),
  // Check constraints
  areaCheck: check('sites_area_check', sql`area IS NULL OR area > 0`)
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
  // Timestamps
  createdAt: timestamp('created_at').defaultNow().notNull(),
  updatedAt: timestamp('updated_at').defaultNow().notNull(),
}, (table) => ({
  siteIdIdx: index('site_images_site_id_idx').on(table.siteId),
  sizeCheck: check('site_images_size_check', sql`size IS NULL OR size > 0`)
}));

// ============================================================================
// TREES TABLE
// ============================================================================

export const trees = pgTable('trees', {
  id: serial('id').primaryKey(),
  interventionId: integer('intervention_id').references(() => interventions.id, { onDelete: 'set null' }),
  guid: varchar('guid', { length: 36 }).notNull().unique(),
  speciesId: integer('species_id').references(() => userSpecies.id, { onDelete: 'set null' }),
  tag: varchar('tag', { length: 100 }), // Tree tag/identifier
  latitude: doublePrecision('latitude').notNull(),
  longitude: doublePrecision('longitude').notNull(),
  altitude: decimal('altitude', { precision: 8, scale: 2 }),
  accuracy: decimal('accuracy', { precision: 6, scale: 2 }),
  height: doublePrecision('height'), // in meters
  diameter: doublePrecision('diameter'), // DBH in cm
  plantingDate: date('planting_date'),
  status: treeStatusEnum('status').default('alive').notNull(),
  lastMeasurementDate: timestamp('last_measurement_date'),
  nextMeasurementDate: timestamp('next_measurement_date'),
  images: jsonb('images'), // Expected: Array of image URLs/references
  mainImageUrl: text('main_image_url'),
  createdById: integer('created_by_id').notNull().references(() => users.id),
  createdAt: timestamp('created_at').defaultNow().notNull(),
  updatedAt: timestamp('updated_at').defaultNow().notNull(),
  deletedAt: timestamp('deleted_at'),
  metadata: jsonb('metadata'), // Expected: { customAttributes: object, measurements: array }
}, (table) => ({
  interventionIdx: index('trees_intervention_idx').on(table.interventionId),
  statusIdx: index('trees_status_idx').on(table.status),
  plantingDateIdx: index('trees_planting_date_idx').on(table.plantingDate),
  coordsIdx: index('trees_coords_idx').on(table.latitude, table.longitude),
  nextMeasurementIdx: index('trees_next_measurement_idx').on(table.nextMeasurementDate),
  locationIdx: index('trees_location_gist_idx').using('gist', sql`ST_Point(longitude, latitude)`),
  diameterCheck: check('trees_diameter_check', sql`diameter IS NULL OR diameter > 0`),
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
  notes: text('notes'),
  height: doublePrecision('height'),
  diameter: doublePrecision('diameter'),
  previousStatus: treeStatusEnum('previous_status'),
  newStatus: treeStatusEnum('new_status'),
  images: jsonb('images'), // Expected: Array of image URLs/references
  mainImageUrl: text('main_image_url'),
  recordedById: integer('recorded_by_id').notNull().references(() => users.id),
  isPublic: boolean('is_public').default(true).notNull(),
  createdAt: timestamp('created_at').defaultNow().notNull(),
  metadata: jsonb('metadata'), // Expected: { devices: object, coordinates: object }
}, (table) => ({
  treeIdIdx: index('tree_records_tree_id_idx').on(table.treeId),
  recordedByIdx: index('tree_records_recorded_by_idx').on(table.recordedById),
  heightCheck: check('tree_records_height_check', sql`height IS NULL OR height > 0`),
  diameterCheck: check('tree_records_diameter_check', sql`diameter IS NULL OR diameter > 0`)
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

  // Media
  image: varchar('image', { length: 255 }),

  // Tree and species data
  treesPlanted: decimal('trees_planted', { precision: 20, scale: 2 }).notNull().default('0'),
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
  statusIdx: index('interventions_status_idx').on(table.status),
  privateIdx: index('interventions_private_idx').on(table.isPrivate),
  parentIdx: index('interventions_parent_idx').on(table.parentInterventionId),
  // Composite indexes for common queries
  userTypeIdx: index('interventions_user_type_idx').on(table.userId, table.type),
  siteStatusIdx: index('interventions_site_status_idx').on(table.projectSiteId, table.status),
  // Partial indexes
  activeInterventionsIdx: index('interventions_active_idx').on(table.projectId).where(sql`status = 'active'`),
  // Check constraints
  treesPlantedCheck: check('interventions_trees_planted_check', sql`trees_planted >= 0`),
  sampleTreeCountCheck: check('interventions_sample_tree_count_check', sql`sample_tree_count IS NULL OR sample_tree_count > 0`),
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
  mainImageIdx: index('intervention_images_main_idx').on(table.interventionId, table.isMainImage),
  validatedIdx: index('intervention_images_validated_idx').on(table.isValidated),
  // Check constraints
  sizeCheck: check('intervention_images_size_check', sql`size IS NULL OR size > 0`),
  widthCheck: check('intervention_images_width_check', sql`width IS NULL OR width > 0`),
  heightCheck: check('intervention_images_height_check', sql`height IS NULL OR height > 0`)
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
// RELATIONS - CLEANED UP FOR REMAINING TABLES
// ============================================================================

export const userRelations = relations(users, ({ many }) => ({
  projectMemberships: many(projectMembers),
  createdProjects: many(projects, { relationName: 'createdBy' }),
  userSpecies: many(userSpecies),
  createdSites: many(sites, { relationName: 'createdBy' }),
  createdTrees: many(trees, { relationName: 'createdBy' }),
  recordedTreeRecords: many(treeRecords, { relationName: 'recordedBy' }),
  sentInvites: many(projectInvites, { relationName: 'invitedBy' }),
  invitedMembers: many(projectMembers, { relationName: 'invitedBy' }),
  interventions: many(interventions, { relationName: 'userInterventions' }),
  notifications: many(notifications),
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
  userSpecies: many(userSpecies),
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
  images: many(siteImages),
  interventions: many(interventions),
}));

export const siteImagesRelations = relations(siteImages, ({ one }) => ({
  site: one(sites, {
    fields: [siteImages.siteId],
    references: [sites.id],
  }),
}));

export const treeRelations = relations(trees, ({ one, many }) => ({
  intervention: one(interventions, {
    fields: [trees.interventionId],
    references: [interventions.id],
  }),
  userSpecies: one(userSpecies, {
    fields: [trees.speciesId],
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
  trees: many(trees),
  images: many(interventionImages),
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

export const notificationsRelations = relations(notifications, ({ one }) => ({
  user: one(users, {
    fields: [notifications.userId],
    references: [users.id],
  }),
}));
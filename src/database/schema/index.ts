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
  bigint,
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
export const inviteStatusEnum = pgEnum('invite_status', ['pending', 'accepted', 'declined', 'expired', 'discarded']);
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
  auth0Id: varchar('auth0_id', { length: 500 }).notNull().unique(),
  email: varchar('email', { length: 320 }).notNull().unique(),
  authName: varchar('auth_name', { length: 255 }).notNull(),
  name: varchar('name', { length: 255 }),
  firstname: varchar('firstname', { length: 255 }),
  lastname: varchar('lastname', { length: 255 }),
  displayName: varchar('display_name', { length: 400 }), // Change to varchar
  avatar: text('avatar'),
  avatarCdn: text('avatar_cdn'),
  slug: varchar('slug', { length: 100 }),
  type: userTypeEnum('type').default('individual'),
  country: varchar('country', { length: 2 }),
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
  auth0IdIdx: index('users_auth0_id_idx').on(table.auth0Id)
}));

// ============================================================================
// PROJECTS TABLE
// ============================================================================

export const projects = pgTable('projects', {
  id: serial('id').primaryKey(),
  guid: varchar('guid', { length: 36 }).notNull().unique(),
  discr: varchar('discr', { length: 255 }).notNull().unique(),
  createdById: integer('created_by_id').notNull().references(() => users.id),
  slug: varchar('slug', { length: 400 }).notNull().unique(),
  purpose: varchar('purpose', { length: 100 }),
  projectName: varchar('name', { length: 255 }).notNull(),
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
  originalGeometry: jsonb('original_geometry').notNull(),
  latitude: doublePrecision('latitude'),
  longitude: doublePrecision('longitude'),
  geometryType: varchar('geometry_type', { length: 50 }),
  url: text('url'),
  linkText: varchar('link_text', { length: 100 }),
  isActive: boolean('is_active').notNull().default(true),
  isPublic: boolean('is_public').default(true).notNull(),
  intensity: varchar('intensity', { length: 100 }),
  revisionPeriodicityLevel: varchar('revision_periodicity_level', { length: 100 }),
  metadata: jsonb('metadata'),
  createdAt: timestamp('created_at', { withTimezone: true }).defaultNow().notNull(),
  updatedAt: timestamp('updated_at', { withTimezone: true }).defaultNow().notNull(),
  deletedAt: timestamp('deleted_at', { withTimezone: true }),
}, (table) => ({
  locationIdx: index('projects_location_gist_idx').using('gist', table.location),
  slugIdx: index('projects_slug_idx').on(table.slug),
  guidx: index('user_guid_idx').on(table.guid),
  createdByIdx: index('projects_created_by_idx').on(table.createdById)
}));
// ============================================================================
// PROJECT MEMBERS TABLE
// ============================================================================

export const projectMembers = pgTable('project_members', {
  id: serial('id').primaryKey(),
  guid: varchar('guid', { length: 36 }).notNull().unique(),
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
  guidIdx: index('project_members_guid_idx').on(table.guid),
}));

// ============================================================================
// PROJECT INVITES TABLE
// ============================================================================

export const projectInvites = pgTable('project_invites', {
  id: serial('id').primaryKey(),
  guid: varchar('guid', { length: 36 }).notNull().unique(),
  projectId: integer('project_id').notNull().references(() => projects.id, { onDelete: 'cascade' }),
  email: varchar('email', { length: 320 }).notNull(),
  message: varchar('email', { length: 400 }).notNull(),
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
  tokenIdx: unique('project_invites_token_unique').on(table.token),
  projectStatusIdx: index('project_invites_project_status_idx').on(table.projectId, table.status)
}));
// ============================================================================
// SCIENTIFIC SPECIES TABLE
// ============================================================================

export const scientificSpecies = pgTable('scientific_species', {
  id: serial('id').primaryKey(),
  guid: varchar('guid', { length: 36 }).notNull().unique(),
  scientificName: varchar('scientific_name', { length: 255 }).notNull().unique(),
  commonName: varchar('common_name', { length: 400 }),
  description: text('description'),
  image: text('image'),
  imageCdn: text('image_cdn'),
  allImages: jsonb('images'),
  gbifId: varchar('gbif_id', { length: 100 }), // Global Biodiversity Information Facility
  createdAt: timestamp('created_at', { withTimezone: true }).defaultNow().notNull(),
  updatedAt: timestamp('updated_at', { withTimezone: true }).defaultNow().notNull(),
  deletedAt: timestamp('deleted_at', { withTimezone: true }),
  metadata: jsonb('metadata'),
}, (table) => ({
  scientificNameIdx: index('scientific_species_name_idx').on(table.scientificName),
  commonNameIdx: index('scientific_species_common_name_idx').on(table.commonName),
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
  image: text('image'),
  imageCdn: text('image_cdn'),
  allImages: jsonb('images'),
  description: text('description'),
  notes: text('notes'),
  favourite: boolean('favourite').default(false).notNull(),
  createdAt: timestamp('created_at', { withTimezone: true }).defaultNow().notNull(),
  updatedAt: timestamp('updated_at', { withTimezone: true }).defaultNow().notNull(),
  deletedAt: timestamp('deleted_at', { withTimezone: true }),
  metadata: jsonb('metadata'), // Expected: { customAttributes: object }
}, (table) => ({
  uniqueUserSpecies: uniqueIndex('unique_user_species').on(table.userId, table.scientificSpeciesId),
  scientificSpeciesIdx: index('user_species_scientific_species_idx').on(table.scientificSpeciesId),
  favouriteIdx: index('user_species_favourite_species_idx').on(table.favourite),
  userIdx: index('user_species_user_idx').on(table.userId),
}));

// ============================================================================
// SPECIES IMAGES TABLE
// ============================================================================

export const speciesImages = pgTable('species_images', {
  id: serial('id').primaryKey(),
  speciesId: integer('species_id').notNull().references(() => userSpecies.id, { onDelete: 'cascade' }),
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
  createdAt: timestamp('created_at', { withTimezone: true }).defaultNow().notNull(),
  updatedAt: timestamp('updated_at', { withTimezone: true }).defaultNow().notNull(),
}, (table) => ({
  speciesIdIdx: index('species_images_species_id_idx').on(table.speciesId),
  primaryImageIdx: index('species_images_primary_idx').on(table.speciesId, table.isPrimary),
  sizeCheck: check('species_images_size_check', sql`size IS NULL OR size > 0`)
}));

// ============================================================================
// SITES TABLE
// ============================================================================

export const sites = pgTable('sites', {
  id: serial('id').primaryKey(),
  guid: varchar('guid', { length: 36 }).notNull().unique(),
  projectId: integer('project_id').notNull().references(() => projects.id, { onDelete: 'cascade' }),
  name: varchar('name', { length: 255 }).notNull(),
  description: text('description'),
  location: geometry(4326)('location'),
  originalGeometry: jsonb('original_geometry').notNull(),
  status: siteStatusEnum('status').default('barren'),
  createdById: integer('created_by_id').notNull().references(() => users.id),
  createdAt: timestamp('created_at', { withTimezone: true }).defaultNow().notNull(),
  updatedAt: timestamp('updated_at', { withTimezone: true }).defaultNow().notNull(),
  deletedAt: timestamp('deleted_at', { withTimezone: true }),
  metadata: jsonb('metadata'), // Expected: { customFields: object, monitoring: object }
}, (table) => ({
  projectIdIdx: index('sites_project_id_idx').on(table.projectId),
  locationIdx: index('sites_location_gist_idx').using('gist', table.location),
}));

// ============================================================================
// SITE IMAGES TABLE
// ============================================================================

export const siteImages = pgTable('site_images', {
  id: serial('id').primaryKey(),
  guid: varchar('guid', { length: 36 }).notNull().unique(),
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
  createdAt: timestamp('created_at', { withTimezone: true }).defaultNow().notNull(),
  updatedAt: timestamp('updated_at', { withTimezone: true }).defaultNow().notNull(),
  deletedAt: timestamp('deleted_at', { withTimezone: true }),
}, (table) => ({
  siteIdIdx: index('site_images_site_id_idx').on(table.siteId),
  primaryImageIdx: index('site_images_primary_idx').on(table.siteId, table.isPrimary)
}));

// ============================================================================
// TREES TABLE
// ============================================================================

export const trees = pgTable('trees', {
  id: serial('id').primaryKey(),
  interventionId: integer('intervention_id').references(() => interventions.id, { onDelete: 'set null' }),
  guid: varchar('guid', { length: 36 }).notNull().unique(),
  scientificSpecies: integer('scientific_species').references(() => scientificSpecies.id, { onDelete: 'set null' }),
  speciesName: varchar('species_name', { length: 100 }),
  otherSpecies: varchar('other_species', { length: 100 }),
  tag: varchar('tag', { length: 100 }), // Tree tag/identifier
  latitude: doublePrecision('latitude').notNull(),
  longitude: doublePrecision('longitude').notNull(),
  altitude: decimal('altitude', { precision: 8, scale: 2 }),
  accuracy: decimal('accuracy', { precision: 6, scale: 2 }),
  height: doublePrecision('height').notNull(),
  diameter: doublePrecision('diameter').notNull(),
  plantingDate: date('planting_date'),
  status: treeStatusEnum('status').default('alive').notNull(),
  lastMeasurementDate: timestamp('last_measurement_date', { withTimezone: true }).defaultNow(),
  nextMeasurementDate: timestamp('next_measurement_date', { withTimezone: true }),
  allImages: jsonb('images'),
  type: varchar('type', { length: 100 }), // Tree tag/identifier
  image: text('image'),
  imageCdn: text('image_cdn'),
  history: integer('histroy').references(() => treeRecords.id, { onDelete: 'set null' }),
  createdById: integer('created_by_id').notNull().references(() => users.id),
  createdAt: timestamp('created_at', { withTimezone: true }).defaultNow().notNull(),
  updatedAt: timestamp('updated_at', { withTimezone: true }).defaultNow().notNull(),
  deletedAt: timestamp('deleted_at', { withTimezone: true }),
  metadata: jsonb('metadata'),
}, (table) => ({
  interventionIdx: index('trees_intervention_idx').on(table.interventionId),
  statusIdx: index('trees_status_idx').on(table.status),
  plantingDateIdx: index('trees_planting_date_idx').on(table.plantingDate),
  coordsIdx: index('trees_coords_idx').on(table.latitude, table.longitude),
  nextMeasurementIdx: index('trees_next_measurement_idx').on(table.nextMeasurementDate),
  locationIdx: index('trees_location_gist_idx').using('gist', sql`ST_Point(longitude, latitude)`)
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
  statusReason: varchar('status_reason', { length: 64 }),
  allImages: jsonb('images'),
  image: text('image'),
  imageCdn: text('image_cdn'),
  recordedById: integer('recorded_by_id').notNull().references(() => users.id),
  isPublic: boolean('is_public').default(true).notNull(),
  createdAt: timestamp('created_at', { withTimezone: true }).defaultNow().notNull(),
  updatedAt: timestamp('updated_at', { withTimezone: true }).defaultNow().notNull(),
  deletedAt: timestamp('deleted_at', { withTimezone: true }),
  metadata: jsonb('metadata'),
}, (table) => ({
  treeIdIdx: index('tree_records_tree_id_idx').on(table.treeId),
  recordedByIdx: index('tree_records_recorded_by_idx').on(table.recordedById),
  guidIdx: index('tree_records_guid_idx').on(table.guid),
}));

// ============================================================================
// INTERVENTIONS TABLE
// ============================================================================

export const interventions = pgTable('interventions', {
  id: serial('id').primaryKey(),
  guid: varchar('guid', { length: 36 }).notNull().unique(),
  hid: varchar('hid', { length: 16 }).notNull().unique(),
  discr: interventionDiscriminatorEnum('discr').notNull().default('base'),
  projectId: integer('project_id').references(() => projects.id),
  projectSiteId: integer('project_site_id').references(() => sites.id),
  scientificSpecies: integer('scientific_species').references(() => scientificSpecies.id),
  speciesName: varchar('sepcies_name', { length: 100 }),
  otherSpecies: varchar('other_species', { length: 100 }),
  userId: integer('user_id').notNull().references(() => users.id),
  parentInterventionId: integer('parent_intervention_id').references(() => interventions.id),
  type: interventionTypeEnum('type').notNull(),
  idempotencyKey: varchar('idempotency_key', { length: 64 }).notNull().unique(),
  statusReason: varchar('status_reason', { length: 64 }),
  plantedSpecies: jsonb('planted_species'),
  registrationDate: date('registration_date'),
  interventionStartDate: timestamp('intervention_start_date', { withTimezone: true }).notNull(),
  interventionEndDate: timestamp('intervention_end_date', { withTimezone: true }).notNull(),
  captureMode: captureModeEnum('capture_mode').notNull(),
  captureStatus: captureStatusEnum('capture_status').notNull().default('complete'),
  location: geometry(4326)('location').notNull(),
  originalGeometry: jsonb('original_geometry').notNull(),
  latitude: doublePrecision('latitude'),
  longitude: doublePrecision('longitude'),
  geometryType: varchar('geometry_type', { length: 50 }),
  deviceLocation: jsonb('device_location'),
  allImages: jsonb('images'),
  image: text('image'),
  imageCdn: text('image_cdn'),
  treesPlanted: bigint('trees_planted', { mode: 'number' }).notNull().default(0),
  sampleTreeCount: bigint('trees_planted', { mode: 'number' }),
  allocationPriority: allocationPriorityEnum('allocation_priority').notNull().default('manual'),
  metadata: jsonb('metadata'),
  tag: varchar('tag', { length: 255 }),
  description: varchar('description', { length: 2048 }),
  status: interventionStatusEnum('status').default('active'),
  isPrivate: boolean('is_private').default(false).notNull(),
  legacyId: integer('legacy_id'),
  createdAt: timestamp('created_at', { withTimezone: true }).defaultNow().notNull(),
  updatedAt: timestamp('updated_at', { withTimezone: true }).defaultNow().notNull(),
  deletedAt: timestamp('deleted_at', { withTimezone: true }),
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
  createdAt: timestamp('created_at', { withTimezone: true }).defaultNow().notNull(),
  updatedAt: timestamp('updated_at', { withTimezone: true }).defaultNow().notNull(),
  deletedAt: timestamp('deleted_at', { withTimezone: true }),
}, (table) => ({
  intervention: index('intervention_images_site_id_idx').on(table.interventionId)
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
  })
}));

export const notificationsRelations = relations(notifications, ({ one }) => ({
  user: one(users, {
    fields: [notifications.userId],
    references: [users.id],
  }),
}));
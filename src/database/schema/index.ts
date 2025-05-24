// src/database/schema/index.ts
import { pgTable, text, timestamp, pgEnum, integer, uuid, boolean, unique, jsonb, doublePrecision, date } from 'drizzle-orm/pg-core';
import { relations } from 'drizzle-orm';
import { customType } from 'drizzle-orm/pg-core';

const geometry = (srid?: number) =>
  customType<{
    data: any; // actual JS object (GeoJSON or similar)
    driverData: any; // raw string or binary from Postgres
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

// Create enums
export const projectRoleEnum = pgEnum('project_role', ['owner', 'admin', 'contributor', 'viewer']);
export const inviteStatusEnum = pgEnum('invite_status', ['pending', 'accepted', 'declined']);
export const treeStatusEnum = pgEnum('tree_status', ['alive', 'dead', 'unknown']);

// Users table with Auth0 integration
export const users = pgTable('users', {
  id: uuid('id').defaultRandom().primaryKey(),
  auth0Id: text('auth0_id').notNull().unique(),
  email: text('email').notNull().unique(),
  authName: text('auth_name'),
  name: text('name'),
  avatar: text('avatar'),
  planetId: text('planet_id').default(''),
  roUser: boolean('ro_user').default(false),
  createdAt: timestamp('created_at').defaultNow().notNull(),
  updatedAt: timestamp('updated_at').defaultNow().notNull(),
});

// Projects table
export const projects = pgTable('projects', {
  id: uuid('id').defaultRandom().primaryKey(),
  projectName: text('project_name').notNull(),
  projectType: text('project_type').notNull(),
  ecosystem: text('ecosystem').notNull(),
  projectScale: text('project_scale').notNull(),
  target: integer('target').notNull(),
  projectWebsite: text('project_website').notNull(),
  description: text('description'),
  isPublic: boolean('is_public').default(false).notNull(),
  createdById: uuid('created_by_id').notNull().references(() => users.id),
  createdAt: timestamp('created_at').defaultNow().notNull(),
  updatedAt: timestamp('updated_at').defaultNow().notNull(),
  metadata: jsonb('metadata'),
  location: geometry(4326)('location')
});

// Project Members table (join table with roles)
export const projectMembers = pgTable('project_members', {
  id: uuid('id').defaultRandom().primaryKey(),
  projectId: uuid('project_id').notNull().references(() => projects.id, { onDelete: 'cascade' }),
  userId: uuid('user_id').notNull().references(() => users.id, { onDelete: 'cascade' }),
  role: projectRoleEnum('role').notNull().default('viewer'),
  createdAt: timestamp('created_at').defaultNow().notNull(),
  updatedAt: timestamp('updated_at').defaultNow().notNull(),
}, (table) => {
  return {
    // Ensure a user can only be added once to a project
    uniqueMember: unique().on(table.projectId, table.userId),
  };
});

// Project Invites table
export const projectInvites = pgTable('project_invites', {
  id: uuid('id').defaultRandom().primaryKey(),
  projectId: uuid('project_id').notNull().references(() => projects.id, { onDelete: 'cascade' }),
  email: text('email').notNull(),
  message: text('message').default(''),
  role: projectRoleEnum('role').notNull().default('contributor'),
  invitedById: uuid('invited_by_id').notNull().references(() => users.id),
  status: inviteStatusEnum('status').notNull().default('pending'),
  token: uuid('token').defaultRandom().notNull().unique(),
  expiresAt: timestamp('expires_at').notNull(),
  createdAt: timestamp('created_at').defaultNow().notNull(),
  updatedAt: timestamp('updated_at').defaultNow().notNull(),
}, (table) => {
  return {
    // Ensure only one active invite per email per project
    uniqueInvite: unique().on(table.projectId, table.email, table.status),
  };
});

// Global Species table - managed by super admin/developer
export const species = pgTable('species', {
  id: uuid('id').defaultRandom().primaryKey(),
  scientificName: text('scientific_name').notNull().unique(),
  commonName: text('common_name'),
  description: text('description'),
  defaultImage: text('default_image'), // Default image URL for this species
  isActive: boolean('is_active').default(true).notNull(), // To soft delete/deactivate species
  createdAt: timestamp('created_at').defaultNow().notNull(),
  updatedAt: timestamp('updated_at').defaultNow().notNull(),
  metadata: jsonb('metadata'), // For species-specific attributes
});

// User Species table - user's customized version of global species
export const userSpecies = pgTable('user_species', {
  id: uuid('id').defaultRandom().primaryKey(),
  userId: uuid('user_id').notNull().references(() => users.id, { onDelete: 'cascade' }),
  speciesId: uuid('species_id').notNull().references(() => species.id, { onDelete: 'cascade' }),
  localName: text('local_name'), // User's custom local name for this species
  customImage: text('custom_image'), // User's custom image URL
  notes: text('notes'), // User's personal notes about this species
  createdAt: timestamp('created_at').defaultNow().notNull(),
  updatedAt: timestamp('updated_at').defaultNow().notNull(),
  metadata: jsonb('metadata'), // For user-specific species attributes
}, (table) => {
  return {
    // Ensure a user can only have one customization per species
    uniqueUserSpecies: unique().on(table.userId, table.speciesId),
  };
});

// Sites table - NO SITE MEMBERS, access controlled via project membership
export const sites = pgTable('sites', {
  id: uuid('id').defaultRandom().primaryKey(),
  projectId: uuid('project_id').notNull().references(() => projects.id, { onDelete: 'cascade' }),
  name: text('name').notNull(),
  description: text('description'),
  location: text('location'), // Keep this as a text description of location
  // Replace the JSONB coordinates with PostGIS geometry
  boundary: geometry(4326)('boundary'),
  coordinates: jsonb('coordinates'), // GeoJSON for site boundaries
  createdById: uuid('created_by_id').notNull().references(() => users.id),
  createdAt: timestamp('created_at').defaultNow().notNull(),
  updatedAt: timestamp('updated_at').defaultNow().notNull(),
  metadata: jsonb('metadata'), // For site-specific attributes
});

// Trees table - now references userSpecies instead of species directly
export const trees = pgTable('trees', {
  id: uuid('id').defaultRandom().primaryKey(),
  siteId: uuid('site_id').notNull().references(() => sites.id, { onDelete: 'cascade' }),
  userSpeciesId: uuid('user_species_id').references(() => userSpecies.id, { onDelete: 'set null' }),
  identifier: text('identifier'), // Optional tree identifier/tag
  latitude: doublePrecision('latitude').notNull(),
  longitude: doublePrecision('longitude').notNull(),
  height: doublePrecision('height'), // in meters
  diameter: doublePrecision('diameter'), // DBH (Diameter at Breast Height) in cm
  plantingDate: date('planting_date'),
  status: treeStatusEnum('status').default('alive'),
  healthNotes: text('health_notes'),
  images: jsonb('images'), // Array of image URLs or references
  createdById: uuid('created_by_id').notNull().references(() => users.id),
  createdAt: timestamp('created_at').defaultNow().notNull(),
  updatedAt: timestamp('updated_at').defaultNow().notNull(),
  metadata: jsonb('metadata'), // For tree-specific attributes
});

// Tree Inventory Records (for tracking changes, health checks, etc.)
export const treeRecords = pgTable('tree_records', {
  id: uuid('id').defaultRandom().primaryKey(),
  treeId: uuid('tree_id').notNull().references(() => trees.id, { onDelete: 'cascade' }),
  recordType: text('record_type').notNull(), // e.g., 'health_check', 'maintenance', 'measurement'
  recordDate: timestamp('record_date').defaultNow().notNull(),
  notes: text('notes'),
  height: doublePrecision('height'), // Updated height if measured
  diameter: doublePrecision('diameter'), // Updated DBH if measured
  status: treeStatusEnum('status'), // Updated status if changed
  createdById: uuid('created_by_id').notNull().references(() => users.id),
  createdAt: timestamp('created_at').defaultNow().notNull(),
  metadata: jsonb('metadata'), // For record-specific data
});

// ============================================================================
// RELATIONS - UPDATED FOR NEW SPECIES STRUCTURE
// ============================================================================

export const userRelations = relations(users, ({ many }) => ({
  projectMemberships: many(projectMembers),
  createdProjects: many(projects, { relationName: 'createdBy' }),
  userSpecies: many(userSpecies),
  createdSites: many(sites, { relationName: 'createdBy' }),
  createdTrees: many(trees, { relationName: 'createdBy' }),
  createdTreeRecords: many(treeRecords, { relationName: 'createdBy' }),
  sentInvites: many(projectInvites, { relationName: 'invitedBy' }),
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

// Global species relations - no user/project dependencies
export const speciesRelations = relations(species, ({ many }) => ({
  userSpecies: many(userSpecies),
}));

// User species relations - connects users to global species with customizations
export const userSpeciesRelations = relations(userSpecies, ({ one, many }) => ({
  user: one(users, {
    fields: [userSpecies.userId],
    references: [users.id],
  }),
  species: one(species, {
    fields: [userSpecies.speciesId],
    references: [species.id],
  }),
  trees: many(trees),
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
  createdBy: one(users, {
    fields: [treeRecords.createdById],
    references: [users.id],
    relationName: 'createdBy',
  }),
}));
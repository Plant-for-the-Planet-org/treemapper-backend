// src/database/schema/index.ts
import { pgTable, serial, text, timestamp, pgEnum, integer, uuid, boolean, unique, jsonb, doublePrecision, date } from 'drizzle-orm/pg-core';
import { relations } from 'drizzle-orm';

// Create enums
export const projectRoleEnum = pgEnum('project_role', ['owner', 'admin', 'contributor', 'viewer']);
export const siteRoleEnum = pgEnum('site_role', ['admin', 'editor', 'viewer']);
export const inviteStatusEnum = pgEnum('invite_status', ['pending', 'accepted', 'declined']);
export const treeStatusEnum = pgEnum('tree_status', ['alive', 'dead', 'unknown']);

// Users table with Auth0 integration
export const users = pgTable('users', {
  id: serial('id').primaryKey(),
  auth0Id: text('auth0_id').notNull().unique(),
  email: text('email').notNull().unique(),
  authName: text('auth_name'),
  name: text('name'),
  avatar: text('avatar'),
  createdAt: timestamp('created_at').defaultNow().notNull(),
  updatedAt: timestamp('updated_at').defaultNow().notNull(),
});

// Projects table
export const projects = pgTable('projects', {
  id: serial('id').primaryKey(),
  name: text('name').notNull(),
  description: text('description'),
  isPublic: boolean('is_public').default(false).notNull(),
  createdById: integer('created_by_id').notNull().references(() => users.id),
  createdAt: timestamp('created_at').defaultNow().notNull(),
  updatedAt: timestamp('updated_at').defaultNow().notNull(),
  metadata: jsonb('metadata'), // For any extra project-specific data
});

// Project Members table (join table with roles)
export const projectMembers = pgTable('project_members', {
  id: serial('id').primaryKey(),
  projectId: integer('project_id').notNull().references(() => projects.id, { onDelete: 'cascade' }),
  userId: integer('user_id').notNull().references(() => users.id, { onDelete: 'cascade' }),
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
  id: serial('id').primaryKey(),
  projectId: integer('project_id').notNull().references(() => projects.id, { onDelete: 'cascade' }),
  email: text('email').notNull(),
  role: projectRoleEnum('role').notNull().default('contributor'),
  invitedById: integer('invited_by_id').notNull().references(() => users.id),
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

// Species table
export const species = pgTable('species', {
  id: serial('id').primaryKey(),
  projectId: integer('project_id').notNull().references(() => projects.id, { onDelete: 'cascade' }),
  scientificName: text('scientific_name').notNull(),
  commonName: text('common_name'),
  description: text('description'),
  createdById: integer('created_by_id').notNull().references(() => users.id),
  createdAt: timestamp('created_at').defaultNow().notNull(),
  updatedAt: timestamp('updated_at').defaultNow().notNull(),
  metadata: jsonb('metadata'), // For species-specific attributes
}, (table) => {
  return {
    // Ensure unique scientific names within a project
    uniqueSpecies: unique().on(table.projectId, table.scientificName),
  };
});

// Sites table
export const sites = pgTable('sites', {
  id: serial('id').primaryKey(),
  projectId: integer('project_id').notNull().references(() => projects.id, { onDelete: 'cascade' }),
  name: text('name').notNull(),
  description: text('description'),
  location: text('location'),
  coordinates: jsonb('coordinates'), // GeoJSON for site boundaries
  createdById: integer('created_by_id').notNull().references(() => users.id),
  createdAt: timestamp('created_at').defaultNow().notNull(),
  updatedAt: timestamp('updated_at').defaultNow().notNull(),
  metadata: jsonb('metadata'), // For site-specific attributes
});

// Site Members table
export const siteMembers = pgTable('site_members', {
  id: serial('id').primaryKey(),
  siteId: integer('site_id').notNull().references(() => sites.id, { onDelete: 'cascade' }),
  userId: integer('user_id').notNull().references(() => users.id, { onDelete: 'cascade' }),
  role: siteRoleEnum('role').notNull().default('viewer'),
  createdAt: timestamp('created_at').defaultNow().notNull(),
  updatedAt: timestamp('updated_at').defaultNow().notNull(),
}, (table) => {
  return {
    // Ensure a user can only be added once to a site
    uniqueMember: unique().on(table.siteId, table.userId),
  };
});

// Trees table
export const trees = pgTable('trees', {
  id: serial('id').primaryKey(),
  siteId: integer('site_id').notNull().references(() => sites.id, { onDelete: 'cascade' }),
  speciesId: integer('species_id').references(() => species.id, { onDelete: 'set null' }),
  identifier: text('identifier'), // Optional tree identifier/tag
  latitude: doublePrecision('latitude').notNull(),
  longitude: doublePrecision('longitude').notNull(),
  height: doublePrecision('height'), // in meters
  diameter: doublePrecision('diameter'), // DBH (Diameter at Breast Height) in cm
  plantingDate: date('planting_date'),
  status: treeStatusEnum('status').default('alive'),
  healthNotes: text('health_notes'),
  images: jsonb('images'), // Array of image URLs or references
  createdById: integer('created_by_id').notNull().references(() => users.id),
  createdAt: timestamp('created_at').defaultNow().notNull(),
  updatedAt: timestamp('updated_at').defaultNow().notNull(),
  metadata: jsonb('metadata'), // For tree-specific attributes
});

// Tree Inventory Records (for tracking changes, health checks, etc.)
export const treeRecords = pgTable('tree_records', {
  id: serial('id').primaryKey(),
  treeId: integer('tree_id').notNull().references(() => trees.id, { onDelete: 'cascade' }),
  recordType: text('record_type').notNull(), // e.g., 'health_check', 'maintenance', 'measurement'
  recordDate: timestamp('record_date').defaultNow().notNull(),
  notes: text('notes'),
  height: doublePrecision('height'), // Updated height if measured
  diameter: doublePrecision('diameter'), // Updated DBH if measured
  status: treeStatusEnum('status'), // Updated status if changed
  createdById: integer('created_by_id').notNull().references(() => users.id),
  createdAt: timestamp('created_at').defaultNow().notNull(),
  metadata: jsonb('metadata'), // For record-specific data
});

// Define relationships
export const userRelations = relations(users, ({ many }) => ({
  projectMemberships: many(projectMembers),
  siteMemberships: many(siteMembers),
  createdProjects: many(projects, { relationName: 'createdBy' }),
  createdSpecies: many(species, { relationName: 'createdBy' }),
  createdSites: many(sites, { relationName: 'createdBy' }),
  createdTrees: many(trees, { relationName: 'createdBy' }),
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
  species: many(species),
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

export const speciesRelations = relations(species, ({ one, many }) => ({
  project: one(projects, {
    fields: [species.projectId],
    references: [projects.id],
  }),
  createdBy: one(users, {
    fields: [species.createdById],
    references: [users.id],
    relationName: 'createdBy',
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
  members: many(siteMembers),
  trees: many(trees),
}));

export const siteMemberRelations = relations(siteMembers, ({ one }) => ({
  site: one(sites, {
    fields: [siteMembers.siteId],
    references: [sites.id],
  }),
  user: one(users, {
    fields: [siteMembers.userId],
    references: [users.id],
  }),
}));

export const treeRelations = relations(trees, ({ one, many }) => ({
  site: one(sites, {
    fields: [trees.siteId],
    references: [sites.id],
  }),
  species: one(species, {
    fields: [trees.speciesId],
    references: [species.id],
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

// Export all schemas
export default {
  users,
  projects,
  projectMembers,
  projectInvites,
  species,
  sites,
  siteMembers,
  trees,
  treeRecords,
  // Enums
  projectRoleEnum,
  siteRoleEnum,
  inviteStatusEnum,
  treeStatusEnum,
};
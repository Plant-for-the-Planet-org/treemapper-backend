import { pgTable, uuid, varchar, text, jsonb, boolean, timestamp, pgEnum, index, uniqueIndex, integer } from 'drizzle-orm/pg-core';

// Enums
export const projectUserRoleEnum = pgEnum('project_user_role', [
  'owner',        // Full control + can delete project
  'admin',        // Full control over project
  'manager',      // Can manage users and content
  'contributor',  // Can create and edit content
  'viewer'        // Read-only access
]);

export const inviteStatusEnum = pgEnum('invite_status', [
  'pending',
  'accepted',
  'rejected',
  'expired'
]);

export const entityStatusEnum = pgEnum('entity_status', [
  'active',
  'archived',
  'suspended',
  'deleted'
]);

export const visibilityEnum = pgEnum('visibility', [
  'public',      // Visible to anyone
  'private',     // Visible only to specific members
  'organization' // Visible to all organization members
]);

// Users table
export const users = pgTable('users', {
  id: uuid('id').primaryKey().defaultRandom(),
  email: varchar('email').notNull().unique(),
  fullName: varchar('full_name').notNull(),
  firstName: varchar('first_name').notNull(),
  lastName: varchar('last_name'),
  avatarUrl: varchar('avatar_url'),
  emailVerified: boolean('email_verified').notNull().default(false),
  status: entityStatusEnum('status').notNull().default('active'),
  preferences: jsonb('preferences').default({}),
  lastLoginAt: timestamp('last_login_at'),
  createdAt: timestamp('created_at').notNull().defaultNow(),
  updatedAt: timestamp('updated_at').notNull().defaultNow(),
  deletedAt: timestamp('deleted_at'),
  sub: varchar('sub').unique(),
}, (table) => {
  return {
    emailIdx: index('users_email_idx').on(table.email),
    statusIdx: index('users_status_idx').on(table.status)
  };
});

// Projects table
export const projects = pgTable('projects', {
  id: uuid('id').primaryKey().defaultRandom(),
  name: varchar('name').notNull(),
  slug: varchar('slug').notNull(),
  description: text('description'),
  settings: jsonb('settings').default({}),
  metadata: jsonb('metadata').default({}),
  status: entityStatusEnum('status').notNull().default('active'),
  visibility: visibilityEnum('visibility').notNull().default('private'),
  isDefault: boolean('is_default').notNull().default(false), // New field to mark default project
  createdBy: uuid('created_by').notNull().references(() => users.id),
  createdAt: timestamp('created_at').notNull().defaultNow(),
  updatedAt: timestamp('updated_at').notNull().defaultNow(),
  deletedAt: timestamp('deleted_at')
}, (table) => {
  return {
    statusIdx: index('project_status_idx').on(table.status),
    slugIdx: uniqueIndex('project_slug_idx').on(table.slug),
    defaultProjectIdx: index('default_project_idx').on(table.createdBy, table.isDefault),
  };
});

// Project Users (Team Members) table
export const projectUsers = pgTable('project_users', {
  id: uuid('id').primaryKey().defaultRandom(),
  projectId: uuid('project_id').notNull().references(() => projects.id),
  userId: uuid('user_id').notNull().references(() => users.id),
  role: projectUserRoleEnum('role').notNull(),
  status: entityStatusEnum('status').notNull().default('active'),
  metadata: jsonb('metadata').default({}),
  joinedAt: timestamp('joined_at').notNull().defaultNow(),
  lastAccessAt: timestamp('last_access_at'),
  expiresAt: timestamp('expires_at')
}, (table) => {
  return {
    projectIdIdx: index('project_users_project_id_idx').on(table.projectId),
    userIdIdx: index('project_users_user_id_idx').on(table.userId),
    uniqueUserProject: uniqueIndex('unique_user_project_idx').on(table.projectId, table.userId),
    roleIdx: index('project_users_role_idx').on(table.role) // New index for role-based queries
  };
});

// Project Invites table
export const projectInvites = pgTable('project_invites', {
  id: uuid('id').primaryKey().defaultRandom(),
  projectId: uuid('project_id').notNull().references(() => projects.id),
  email: varchar('email').notNull(),
  token: varchar('token').notNull().unique(),
  invitedByUserId: uuid('invited_by_user_id').notNull().references(() => users.id),
  role: projectUserRoleEnum('role').notNull(),
  status: inviteStatusEnum('status').notNull().default('pending'),
  message: text('message'),
  metadata: jsonb('metadata').default({}),
  resendCount: integer('resend_count').default(0),
  lastResendAt: timestamp('last_resend_at'),
  createdAt: timestamp('created_at').notNull().defaultNow(),
  expiresAt: timestamp('expires_at').notNull(),
  acceptedAt: timestamp('accepted_at'),
  rejectedAt: timestamp('rejected_at')
}, (table) => {
  return {
    tokenIdx: uniqueIndex('project_invites_token_idx').on(table.token),
    projectIdIdx: index('project_invites_project_id_idx').on(table.projectId),
    emailIdx: index('project_invites_email_idx').on(table.email),
    statusIdx: index('project_invites_status_idx').on(table.status) // New index for status queries
  };
});

// Project Sites table
export const projectSites = pgTable('project_sites', {
  id: uuid('id').primaryKey().defaultRandom(),
  projectId: uuid('project_id').notNull().references(() => projects.id),
  name: varchar('name').notNull(),
  slug: varchar('slug').notNull(),
  description: text('description'),
  status: entityStatusEnum('status').notNull().default('active'),
  visibility: visibilityEnum('visibility').notNull().default('private'),
  // Location data
  latitude: varchar('latitude'),
  longitude: varchar('longitude'),
  address: jsonb('address'),
  // Additional fields
  metadata: jsonb('metadata').default({}),
  createdBy: uuid('created_by').notNull().references(() => users.id),
  createdAt: timestamp('created_at').notNull().defaultNow(),
  updatedAt: timestamp('updated_at').notNull().defaultNow(),
  deletedAt: timestamp('deleted_at')
}, (table) => {
  return {
    slugIdx: uniqueIndex('project_sites_slug_project_idx').on(table.projectId, table.slug), // Scoped to project
    projectIdIdx: index('project_sites_project_id_idx').on(table.projectId),
    statusIdx: index('project_sites_status_idx').on(table.status)
  };
});

// Audit Logs table
export const auditLogs = pgTable('audit_logs', {
  id: uuid('id').primaryKey().defaultRandom(),
  projectId: uuid('project_id').references(() => projects.id),
  entityType: varchar('entity_type').notNull(),
  entityId: uuid('entity_id').notNull(),
  action: varchar('action').notNull(),
  actorId: uuid('actor_id').notNull().references(() => users.id),
  changes: jsonb('changes'),
  metadata: jsonb('metadata').default({}),
  ipAddress: varchar('ip_address'),
  userAgent: varchar('user_agent'),
  createdAt: timestamp('created_at').notNull().defaultNow()
}, (table) => {
  return {
    projectIdIdx: index('audit_logs_project_id_idx').on(table.projectId),
    entityTypeIdx: index('audit_logs_entity_type_idx').on(table.entityType),
    actorIdIdx: index('audit_logs_actor_id_idx').on(table.actorId),
    createdAtIdx: index('audit_logs_created_at_idx').on(table.createdAt)
  };
});

// User metadata table
export const userMetadata = pgTable('user_metadata', {
  userId: uuid('user_id').primaryKey().references(() => users.id),
  roles: jsonb('roles').notNull().default(['user']),
  lastLogin: timestamp('last_login').notNull().defaultNow(),
  updatedAt: timestamp('updated_at').notNull().defaultNow(),
}, (table) => {
  return {
    userIdIdx: index('user_metadata_user_id_idx').on(table.userId)
  };
});
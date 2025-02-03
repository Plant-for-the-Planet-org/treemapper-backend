import { pgTable, uuid, varchar, text, jsonb, boolean, timestamp, pgEnum, index, uniqueIndex } from 'drizzle-orm/pg-core';

// Enum definitions
export const workspaceUserRoleEnum = pgEnum('workspace_user_role', ['admin', 'member']);
export const projectUserRoleEnum = pgEnum('project_user_role', [
  'owner',        // Full control + can delete project
  'admin',        // Full control over project
  'manager',      // Can manage users and content
  'contributor',  // Can create and edit content
  'viewer'        // Read-only access
]);
export const inviteStatusEnum = pgEnum('invite_status', ['pending', 'accepted', 'rejected']);
export const entityStatusEnum = pgEnum('entity_status', ['active', 'archived', 'suspended']);
export const visibilityEnum = pgEnum('visibility', ['public', 'private', 'workspace']);

// Users table
export const users = pgTable('users', {
  id: uuid('id').primaryKey(),
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
  // Auth0 specific fields
  sub: varchar('sub').unique(),
}, (table) => {
  return {
    emailIdx: index('email_idx').on(table.email),
    statusIdx: index('user_status_idx').on(table.status)
  };
});

// Workspaces table
export const workspaces = pgTable('workspaces', {
  id: uuid('id').primaryKey(),
  name: varchar('name').notNull(),
  slug: varchar('slug').notNull().unique(),
  description: text('description'),
  settings: jsonb('settings').default({}),
  status: entityStatusEnum('status').notNull().default('active'),
  createdBy: uuid('created_by').notNull().references(() => users.id),
  createdAt: timestamp('created_at').notNull().defaultNow(),
  updatedAt: timestamp('updated_at').notNull().defaultNow(),
  deletedAt: timestamp('deleted_at')
}, (table) => {
  return {
    slugIdx: index('workspace_slug_idx').on(table.slug),
    statusIdx: index('workspace_status_idx').on(table.status)
  };
});

// Workspace users table
export const workspaceUsers = pgTable('workspace_users', {
  id: uuid('id').primaryKey(),
  workspaceId: uuid('workspace_id').notNull().references(() => workspaces.id),
  userId: uuid('user_id').notNull().references(() => users.id),
  role: workspaceUserRoleEnum('role').notNull(),
  createdAt: timestamp('created_at').notNull().defaultNow()
}, (table) => {
  return {
    workspaceIdIdx: index('workspace_users_workspace_id_idx').on(table.workspaceId),
    userIdIdx: index('workspace_users_user_id_idx').on(table.userId),
    uniqueUserWorkspace: uniqueIndex('unique_user_workspace_idx').on(table.workspaceId, table.userId) // ✅ Fixed!
  };
});

// Projects table
export const projects = pgTable('projects', {
  id: uuid('id').primaryKey(),
  workspaceId: uuid('workspace_id').notNull().references(() => workspaces.id),
  name: varchar('name').notNull(),
  slug: varchar('slug').notNull().unique(),
  description: text('description'),
  settings: jsonb('settings').default({}),
  status: entityStatusEnum('status').notNull().default('active'),
  visibility: visibilityEnum('visibility').notNull().default('private'),
  createdBy: uuid('created_by').notNull().references(() => users.id),
  createdAt: timestamp('created_at').notNull().defaultNow(),
  updatedAt: timestamp('updated_at').notNull().defaultNow(),
  deletedAt: timestamp('deleted_at')
}, (table) => {
  return {
    slugIdx: index('project_slug_idx').on(table.slug),
    workspaceIdIdx: index('project_workspace_id_idx').on(table.workspaceId),
    statusIdx: index('project_status_idx').on(table.status)
  };
});

// Project users junction table
export const projectUsers = pgTable('project_users', {
  id: uuid('id').primaryKey(),
  projectId: uuid('project_id').notNull().references(() => projects.id),
  userId: uuid('user_id').notNull().references(() => users.id),
  role: projectUserRoleEnum('role').notNull(),
  joinedAt: timestamp('joined_at').notNull().defaultNow()
}, (table) => {
  return {
    projectIdIdx: index('project_users_project_id_idx').on(table.projectId),
    userIdIdx: index('project_users_user_id_idx').on(table.userId),
    uniqueUserProject: uniqueIndex('unique_user_project_idx').on(table.projectId, table.userId) // ✅ Fixed!
  };
});


// Project invites table
export const projectInvites = pgTable('project_invites', {
  id: uuid('id').primaryKey(),
  projectId: uuid('project_id').notNull().references(() => projects.id),
  workspaceId: uuid('workspace_id').notNull().references(() => workspaces.id),
  email: varchar('email').notNull(),
  token: varchar('token').notNull().unique(),
  invitedByUserId: uuid('invited_by_user_id').notNull().references(() => users.id),
  role: projectUserRoleEnum('role').notNull(),
  status: inviteStatusEnum('status').notNull().default('pending'),
  message: text('message'),
  resendCount: jsonb('resend_count').default(0),
  createdAt: timestamp('created_at').notNull().defaultNow(),
  expiresAt: timestamp('expires_at').notNull(),
  acceptedAt: timestamp('accepted_at'),
  rejectedAt: timestamp('rejected_at')
}, (table) => {
  return {
    tokenIdx: index('project_invites_token_idx').on(table.token),
    projectIdIdx: index('project_invites_project_id_idx').on(table.projectId),
    workspaceIdIdx: index('project_invites_workspace_id_idx').on(table.workspaceId),
    emailIdx: index('project_invites_email_idx').on(table.email)
  };
});

// Project sites table
export const projectSites = pgTable('project_sites', {
  id: uuid('id').primaryKey(),
  projectId: uuid('project_id').notNull().references(() => projects.id),
  name: varchar('name').notNull(),
  slug: varchar('slug').notNull().unique(),
  description: text('description'),
  status: entityStatusEnum('status').notNull().default('active'),
  visibility: visibilityEnum('visibility').notNull().default('private'),
  // Structured location data
  latitude: varchar('latitude'),
  longitude: varchar('longitude'),
  address: jsonb('address'),
  // Additional metadata
  metadata: jsonb('metadata').default({}),
  createdBy: uuid('created_by').notNull().references(() => users.id),
  createdAt: timestamp('created_at').notNull().defaultNow(),
  updatedAt: timestamp('updated_at').notNull().defaultNow(),
  deletedAt: timestamp('deleted_at')
}, (table) => {
  return {
    slugIdx: index('project_sites_slug_idx').on(table.slug),
    projectIdIdx: index('project_sites_project_id_idx').on(table.projectId),
    statusIdx: index('project_sites_status_idx').on(table.status)
  };
});

// Audit logs table
export const auditLogs = pgTable('audit_logs', {
  id: uuid('id').primaryKey(),
  workspaceId: uuid('workspace_id').references(() => workspaces.id),
  projectId: uuid('project_id').references(() => projects.id),
  entityType: varchar('entity_type').notNull(),
  entityId: uuid('entity_id').notNull(),
  action: varchar('action').notNull(),
  actorId: uuid('actor_id').notNull().references(() => users.id),
  changes: jsonb('changes'),
  metadata: jsonb('metadata').default({}),
  createdAt: timestamp('created_at').notNull().defaultNow()
}, (table) => {
  return {
    workspaceIdIdx: index('audit_logs_workspace_id_idx').on(table.workspaceId),
    projectIdIdx: index('audit_logs_project_id_idx').on(table.projectId),
    entityTypeIdx: index('audit_logs_entity_type_idx').on(table.entityType),
    actorIdIdx: index('audit_logs_actor_id_idx').on(table.actorId)
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
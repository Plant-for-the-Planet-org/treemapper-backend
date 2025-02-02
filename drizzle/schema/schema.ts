import { pgTable, uuid, varchar, text, jsonb, boolean, timestamp, pgEnum } from 'drizzle-orm/pg-core';

// Enum definitions
export const projectUserRoleEnum = pgEnum('project_user_role', ['admin', 'editor']);
export const inviteStatusEnum = pgEnum('invite_status', ['pending', 'accepted', 'rejected']);

// Users table
export const users = pgTable('users', {
  id: uuid('id').primaryKey(),
  email: varchar('email').notNull().unique(),
  fullName: varchar('full_name').notNull(), // Note: This matches the column name in DB
  avatarUrl: varchar('avatar_url'),
  createdAt: timestamp('created_at').notNull().defaultNow(),
  updatedAt: timestamp('updated_at').notNull().defaultNow()
});

// Projects table
export const projects = pgTable('projects', {
  id: uuid('id').primaryKey(),
  name: varchar('name').notNull(),
  description: text('description'),
  settings: jsonb('settings'),
  isArchived: boolean('is_archived').notNull().default(false),
  createdBy: uuid('created_by').notNull().references(() => users.id),
  createdAt: timestamp('created_at').notNull().defaultNow(),
  updatedAt: timestamp('updated_at').notNull().defaultNow()
});

// Project users junction table
export const projectUsers = pgTable('project_users', {
  id: uuid('id').primaryKey(),
  projectId: uuid('project_id').notNull().references(() => projects.id),
  userId: uuid('user_id').notNull().references(() => users.id),
  role: projectUserRoleEnum('role').notNull(),
  joinedAt: timestamp('joined_at').notNull().defaultNow()
});

// Project invites table
export const projectInvites = pgTable('project_invites', {
  id: uuid('id').primaryKey(),
  projectId: uuid('project_id').notNull().references(() => projects.id),
  email: varchar('email').notNull(),
  invitedByUserId: uuid('invited_by_user_id').notNull().references(() => users.id),
  role: projectUserRoleEnum('role').notNull(),
  status: inviteStatusEnum('status').notNull().default('pending'),
  createdAt: timestamp('created_at').notNull().defaultNow(),
  expiresAt: timestamp('expires_at').notNull()
});

// Project sites table
export const projectSites = pgTable('project_sites', {
  id: uuid('id').primaryKey(),
  projectId: uuid('project_id').notNull().references(() => projects.id),
  name: varchar('name').notNull(),
  description: text('description'),
  location: jsonb('location'),
  metadata: jsonb('metadata'),
  createdBy: uuid('created_by').notNull().references(() => users.id),
  createdAt: timestamp('created_at').notNull().defaultNow(),
  updatedAt: timestamp('updated_at').notNull().defaultNow()
});

export const userMetadata = pgTable('user_metadata', {
  userId: uuid('user_id').primaryKey().references(() => users.id),
  roles: jsonb('roles').notNull().default(['user']),
  // Add other frequently accessed metadata
  lastLogin: timestamp('last_login').notNull().defaultNow(),
  updatedAt: timestamp('updated_at').notNull().defaultNow(),
});
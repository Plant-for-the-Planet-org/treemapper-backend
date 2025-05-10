// src/database/schema/index.ts
import { pgTable, serial, text, timestamp, pgEnum, integer, uuid, boolean, unique } from 'drizzle-orm/pg-core';
import { relations } from 'drizzle-orm';

// Create a project role enum
export const projectRoleEnum = pgEnum('project_role', ['owner', 'admin', 'editor', 'viewer']);

// Users table with Auth0 integration
export const users = pgTable('users', {
  id: serial('id').primaryKey(),
  auth0Id: text('auth0_id').notNull().unique(),
  email: text('email').notNull().unique(),
  name: text('name'),
  createdAt: timestamp('created_at').defaultNow().notNull(),
  updatedAt: timestamp('updated_at').defaultNow().notNull(),
});

// Projects table
export const projects = pgTable('projects', {
  id: serial('id').primaryKey(),
  name: text('name').notNull(),
  description: text('description'),
  createdById: integer('created_by_id').notNull().references(() => users.id),
  createdAt: timestamp('created_at').defaultNow().notNull(),
  updatedAt: timestamp('updated_at').defaultNow().notNull(),
});

// Project Members table (join table with roles)
export const projectMembers = pgTable('project_members', {
  id: serial('id').primaryKey(),
  projectId: integer('project_id').notNull().references(() => projects.id),
  userId: integer('user_id').notNull().references(() => users.id),
  role: projectRoleEnum('role').notNull().default('viewer'),
  createdAt: timestamp('created_at').defaultNow().notNull(),
  updatedAt: timestamp('updated_at').defaultNow().notNull(),
}, (table) => {
  return {
    // Ensure a user can only be added once to a project
    uniqueMember: unique().on(table.projectId, table.userId),
  };
});

// Define relationships
export const userRelations = relations(users, ({ many }) => ({
  projects: many(projectMembers),
}));

export const projectRelations = relations(projects, ({ one, many }) => ({
  createdBy: one(users, {
    fields: [projects.createdById],
    references: [users.id],
  }),
  members: many(projectMembers),
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

// Export all schemas
export default { users, projects, projectMembers };
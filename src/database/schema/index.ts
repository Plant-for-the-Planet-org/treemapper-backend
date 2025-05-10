// src/database/schema/index.ts
import { pgTable, serial, text, timestamp, pgEnum, integer } from 'drizzle-orm/pg-core';
import { relations } from 'drizzle-orm';

// Create a role enum
export const roleEnum = pgEnum('role', ['superadmin', 'admin', 'viewer', 'contributor']);

// Users table with Auth0 integration
export const users = pgTable('users', {
  id: serial('id').primaryKey(),
  auth0Id: text('auth0_id'), // Store Auth0 user ID
  email: text('email').notNull().unique(),
  name: text('name'),
  role: roleEnum('role').notNull().default('viewer'), // Default role
  createdAt: timestamp('created_at').defaultNow().notNull(),
  updatedAt: timestamp('updated_at').defaultNow().notNull(),
});

// You can add more tables as needed for your specific app
export const userRelations = relations(users, ({ many }) => ({
  // Define relationships if needed
}));

// Export all schemas
export default { users };
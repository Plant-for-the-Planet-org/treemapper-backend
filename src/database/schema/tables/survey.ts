import {
  pgTable,
  text,
  timestamp,
  integer,
  boolean,
  jsonb,
  serial,
  index,
} from 'drizzle-orm/pg-core';
import { user } from './user';

export const survey = pgTable(
  'survey',
  {
    id: serial('id').primaryKey(),
    uid: text('uid').notNull().unique(),
    userId: integer('user_id')
      .notNull()
      .references(() => user.id, { onDelete: 'cascade' }),
    isCompleted: boolean('is_completed').notNull().default(false),
    organizationName: text('organizationName'),
    primaryGoal: text('primary_goal'),
    role: text('role'),
    requestedDemo: boolean('requested_demo').default(false),
    metadata: jsonb('metadata'),
    createdAt: timestamp('created_at', { withTimezone: true })
      .defaultNow()
      .notNull(),
    updatedAt: timestamp('updated_at', { withTimezone: true })
      .defaultNow()
      .notNull(),
  },
  (table) => ({
    userIdx: index('survey_user_idx').on(table.userId),
  }),
);

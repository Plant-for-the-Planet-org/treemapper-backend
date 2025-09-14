import {
  pgTable,
  text,
  timestamp,
  integer,
  boolean,
  serial,
  index,
  check,
} from 'drizzle-orm/pg-core';
import { sql } from 'drizzle-orm';
import { notificationTypeEnum } from '../enums';
import { user } from './user';

export const notifications = pgTable(
  'notifications',
  {
    id: serial('id').primaryKey(),
    uid: text('uid').notNull().unique(),
    userId: integer('user_id')
      .notNull()
      .references(() => user.id, { onDelete: 'cascade' }),
    type: notificationTypeEnum('type').notNull().default('other'),
    title: text('title').notNull(),
    message: text('message').notNull(),
    entityId: integer('entity_id'),
    priority: text('priority').default('normal'),
    category: text('category'),
    isRead: boolean('is_read').default(false).notNull(),
    isArchived: boolean('is_archived').default(false).notNull(),
    actionUrl: text('action_url'),
    actionText: text('action_text'),
    scheduledFor: timestamp('scheduled_for'),
    expiresAt: timestamp('expires_at'),
    deliveryMethod: text('delivery_method'),
    sentAt: timestamp('sent_at'),
    deliveredAt: timestamp('delivered_at'),
    image: text('image'),
    batchId: text('batch_id'),
    retryCount: integer('retry_count').default(0),
    createdAt: timestamp('created_at', { withTimezone: true })
      .defaultNow()
      .notNull(),
    updatedAt: timestamp('updated_at', { withTimezone: true })
      .defaultNow()
      .notNull(),
  },
  (table) => ({
    userUnreadActiveIdx: index('notifications_user_unread_active_idx')
      .on(table.userId, table.isRead, table.isArchived)
      .where(sql`is_read = false AND is_archived = false`),
    userNotificationsIdx: index('notifications_user_list_idx').on(
      table.userId,
      table.createdAt,
    ),
    scheduledProcessingIdx: index('notifications_scheduled_processing_idx')
      .on(table.scheduledFor)
      .where(sql`scheduled_for IS NOT NULL AND sent_at IS NULL`),
    validPriority: check(
      'valid_priority',
      sql`priority IN ('low', 'normal', 'high', 'urgent')`,
    ),
    scheduledInFuture: check(
      'scheduled_in_future',
      sql`scheduled_for IS NULL OR scheduled_for >= created_at`,
    ),
    expiresAfterCreation: check(
      'expires_after_creation',
      sql`expires_at IS NULL OR expires_at > created_at`,
    ),
    deliveredAfterSent: check(
      'delivered_after_sent',
      sql`delivered_at IS NULL OR sent_at IS NULL OR delivered_at >= sent_at`,
    ),
    retryCountValid: check(
      'retry_count_valid',
      sql`retry_count >= 0 AND retry_count <= 10`,
    ),
  }),
);

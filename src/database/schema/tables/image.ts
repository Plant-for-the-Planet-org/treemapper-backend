import {
  pgTable,
  text,
  timestamp,
  integer,
  boolean,
  decimal,
  serial,
  index,
  bigint,
} from 'drizzle-orm/pg-core';
import {
  imageTypeEnum,
  imageEntityEnum,
  imageUploadDeviceEnum,
} from '../enums';
import { sql } from 'drizzle-orm';
import { user } from './user';

export const image = pgTable(
  'image',
  {
    id: serial('id').primaryKey(),
    uid: text('uid').notNull().unique(),
    type: imageTypeEnum('type').notNull().default('overview'),
    entityId: integer('entity_id').notNull(),
    entityType: imageEntityEnum('entity_type').notNull(),
    filename: text('filename'),
    originalName: text('original_name'),
    mimeType: text('mime_type'),
    size: bigint('size', { mode: 'number' }),
    width: integer('width'),
    height: integer('height'),
    notes: text('notes'),
    deviceType: imageUploadDeviceEnum('device_type').notNull(),
    isPrimary: boolean('is_primary').default(false),
    isPrivate: boolean('is_private').default(false),
    storageProvider: text('storage_provider').default('r2'),
    storagePath: text('storage_path'),
    thumbnailPath: text('thumbnail_path'),
    compressionRatio: decimal('compression_ratio', { precision: 4, scale: 2 }),
    uploadedById: integer('uploaded_by_id').references(() => user.id, {
      onDelete: 'set null',
    }),
    altText: text('alt_text'),
    createdAt: timestamp('created_at', { withTimezone: true })
      .defaultNow()
      .notNull(),
    updatedAt: timestamp('updated_at', { withTimezone: true })
      .defaultNow()
      .notNull(),
    deletedAt: timestamp('deleted_at', { withTimezone: true }),
  },
  (table) => ({
    entityTypeEntityIdIdx: index('image_entity_lookup_idx').on(
      table.entityType,
      table.entityId,
    ),
    primaryImageIdx: index('image_primary_idx')
      .on(table.entityType, table.entityId, table.isPrimary)
      .where(sql`is_primary = true AND deleted_at IS NULL`),
  }),
);

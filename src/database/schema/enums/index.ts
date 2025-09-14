import { pgEnum } from 'drizzle-orm/pg-core';

export const auditActionEnum = pgEnum('audit_action', [
  'create',
  'update',
  'delete',
  'soft_delete',
  'restore',
  'login',
  'logout',
  'invite',
  'accept_invite',
  'decline_invite',
  'role_change',
  'permission_change',
  'export',
  'import',
  'archive',
  'unarchive',
  'impersonation',
]);

export const auditEntityEnum = pgEnum('audit_entity', [
  'user',
  'workspace',
  'workspace_member',
  'project',
  'project_member',
  'site',
  'intervention',
  'tree',
  'tree_record',
  'scientific_species',
  'project_species',
  'species_request',
  'project_invite',
  'bulk_invite',
  'image',
  'notification',
  'migration',
]);

export const userTypeEnum = pgEnum('user_type', [
  'individual',
  'tpo',
  'organization',
  'other',
  'school',
  'superadmin',
]);
export const workspaceTypeEnum = pgEnum('workspace_type', [
  'platform',
  'private',
  'development',
  'premium',
]);

export const logLevelEnum = pgEnum('log_level', [
  'debug',
  'info',
  'warning',
  'error',
  'fatal',
]);
export const entityEnum = pgEnum('entity_type', [
  'users',
  'projects',
  'interventions',
  'species',
  'sites',
  'images',
]);

export const projectRoleEnum = pgEnum('project_role', [
  'owner',
  'admin',
  'contributor',
  'observer',
]);
export const inviteStatusEnum = pgEnum('invite_status', [
  'pending',
  'accepted',
  'declined',
  'expired',
  'discarded',
]);
export const imageUploadDeviceEnum = pgEnum('image_upload_device', [
  'web',
  'mobile',
  'server',
]);
export const siteStatusEnum = pgEnum('site_status', [
  'planted',
  'planting',
  'barren',
  'reforestation',
  'planning',
]);
export const siteAccessEnum = pgEnum('site_access', [
  'all_sites',
  'deny_all',
  'read_only',
  'limited_access',
]);
export const speciesRequestStatusEnum = pgEnum('species_request_status', [
  'pending',
  'approved',
  'rejected',
]);
export const interventionDiscriminatorEnum = pgEnum(
  'intervention_discriminator',
  ['plot', 'intervention'],
);
export const captureModeEnum = pgEnum('capture_mode', [
  'on-site',
  'off-site',
  'external',
  'unknown',
  'web-upload',
]);
export const captureStatusEnum = pgEnum('capture_status', [
  'complete',
  'partial',
  'incomplete',
]);
export const notificationTypeEnum = pgEnum('notification_type', [
  'project',
  'site',
  'member',
  'intervention',
  'tree',
  'species',
  'user',
  'invite',
  'system',
  'other',
]);
export const workspaceRoleEnum = pgEnum('workspace_role', [
  'owner',
  'admin',
  'member',
]);
export const memberStatusEnum = pgEnum('member_status', [
  'active',
  'inactive',
  'suspended',
  'pending',
]);

export const interventionTypeEnum = pgEnum('intervention_type', [
  'assisting-seed-rain',
  'control-livestock',
  'direct-seeding',
  'enrichment-planting',
  'fencing',
  'fire-patrol',
  'fire-suppression',
  'firebreaks',
  'generic-tree-registration',
  'grass-suppression',
  'liberating-regenerant',
  'maintenance',
  'marking-regenerant',
  'multi-tree-registration',
  'other-intervention',
  'plot-plant-registration',
  'removal-invasive-species',
  'sample-tree-registration',
  'single-tree-registration',
  'soil-improvement',
  'stop-tree-harvesting',
]);
export const treeStatusEnum = pgEnum('tree_status', [
  'alive',
  'dead',
  'unknown',
  'removed',
  'sick',
]);
export const recordTypeEnum = pgEnum('record_type', [
  'planting',
  'measurement',
  'status_change',
  'inspection',
  'maintenance',
  'death',
  'removal',
  'health_assessment',
  'growth_monitoring',
]);

export const imageEntityEnum = pgEnum('image_entity', [
  'project',
  'site',
  'user',
  'intervention',
  'tree',
  'species',
]);
export const treeTypeEnum = pgEnum('tree_enum', ['single', 'sample', 'plot']);
export const imageTypeEnum = pgEnum('image_type', [
  'before',
  'during',
  'after',
  'detail',
  'overview',
  'progress',
  'aerial',
  'ground',
  'record',
]);
export const interventionStatusEnum = pgEnum('intervention_status', [
  'planned',
  'active',
  'completed',
  'failed',
  'on-hold',
  'cancelled',
]);
export const migrationStatusEnum = pgEnum('migration_status', [
  'in_progress',
  'completed',
  'failed',
  'started',
]);

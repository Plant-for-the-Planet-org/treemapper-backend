import { relations } from 'drizzle-orm';
import { user } from '../tables/user';
import { project, projectMember, projectInvites } from '../tables/project';
import {
  projectSpecies,
  speciesRequest,
  scientificSpecies,
  interventionSpecies,
} from '../tables/species';
import { site } from '../tables/site';
import { bulkInvite } from '../tables/bulkInvite';
import { intervention } from '../tables/intervention';
import { migration, migrationRequest } from '../tables/migration';
import { workspace, workspaceMember } from '../tables/workspace';
import { tree, treeRecord } from '../tables/tree';
import { notifications } from '../tables/notification';
import { survey } from '../tables/survey';
import { image } from '../tables/image';
import { migrationLog } from '../tables/migration';
import { auditLog } from '../tables/audit';

export const userRelations = relations(user, ({ many }) => ({
  projectMemberships: many(projectMember),
  createdProjects: many(project, { relationName: 'createdBy' }),
  addedProjectSpecies: many(projectSpecies, { relationName: 'addedBy' }),
  createdSites: many(site, { relationName: 'createdBy' }),
  createdTrees: many(tree, { relationName: 'createdBy' }),
  recordedTreeRecords: many(treeRecord, { relationName: 'recordedBy' }),
  sentProjectInvites: many(projectInvites, { relationName: 'invitedBy' }),
  bulkInvites: many(bulkInvite, { relationName: 'invitedBy' }),
  interventions: many(intervention, { relationName: 'userInterventions' }),
  notifications: many(notifications),
  migrations: many(migration),
  migrationRequest: many(migrationRequest),
  speciesRequests: many(speciesRequest, { relationName: 'requestedBy' }),
  reviewedSpeciesRequests: many(speciesRequest, { relationName: 'reviewedBy' }),
  workspaceMemberships: many(workspaceMember),
  createdWorkspaces: many(workspace, { relationName: 'createdBy' }),
  sentWorkspaceInvites: many(workspaceMember, { relationName: 'invitedBy' }),
  surveys: many(survey),

  verifiedSpecies: many(scientificSpecies, { relationName: 'verifiedBy' }),
  uploadedImages: many(image, { relationName: 'uploadedBy' }),
}));

export const scientificSpeciesRelations = relations(
  scientificSpecies,
  ({ one, many }) => ({
    projectSpecies: many(projectSpecies),
    interventionSpecies: many(interventionSpecies),
    verifiedBy: one(user, {
      fields: [scientificSpecies.verifiedById],
      references: [user.id],
      relationName: 'verifiedBy',
    }),
  }),
);

export const interventionSpeciesRelations = relations(
  interventionSpecies,
  ({ one, many }) => ({
    intervention: one(intervention, {
      fields: [interventionSpecies.interventionId],
      references: [intervention.id],
    }),
    scientificSpecies: one(scientificSpecies, {
      fields: [interventionSpecies.scientificSpeciesId],
      references: [scientificSpecies.id],
    }),
    trees: many(tree),
  }),
);

export const interventionRelations = relations(
  intervention,
  ({ one, many }) => ({
    project: one(project, {
      fields: [intervention.projectId],
      references: [project.id],
    }),
    site: one(site, {
      fields: [intervention.siteId],
      references: [site.id],
    }),
    user: one(user, {
      fields: [intervention.userId],
      references: [user.id],
      relationName: 'userInterventions',
    }),

    trees: many(tree),
    species: many(interventionSpecies),
  }),
);

export const treeRelations = relations(tree, ({ one, many }) => ({
  intervention: one(intervention, {
    fields: [tree.interventionId],
    references: [intervention.id],
  }),
  interventionSpecies: one(interventionSpecies, {
    fields: [tree.interventionSpeciesId],
    references: [interventionSpecies.id],
  }),
  createdBy: one(user, {
    fields: [tree.createdById],
    references: [user.id],
    relationName: 'createdBy',
  }),
  records: many(treeRecord),
}));

export const imageRelations = relations(image, ({ one }) => ({
  uploadedBy: one(user, {
    fields: [image.uploadedById],
    references: [user.id],
    relationName: 'uploadedBy',
  }),
}));

export const projectInviteRelations = relations(projectInvites, ({ one }) => ({
  project: one(project, {
    fields: [projectInvites.projectId],
    references: [project.id],
  }),
  invitedBy: one(user, {
    fields: [projectInvites.invitedById],
    references: [user.id],
    relationName: 'invitedBy',
  }),
  discardedBy: one(user, {
    fields: [projectInvites.discardedById],
    references: [user.id],
  }),
}));

export const bulkInviteRelations = relations(bulkInvite, ({ one, many }) => ({
  project: one(project, {
    fields: [bulkInvite.projectId],
    references: [project.id],
  }),
  invitedBy: one(user, {
    fields: [bulkInvite.invitedById],
    references: [user.id],
    relationName: 'invitedBy',
  }),
  discardedBy: one(user, {
    fields: [bulkInvite.discardedById],
    references: [user.id],
  }),
  members: many(projectMember),
}));

export const speciesRequestRelations = relations(speciesRequest, ({ one }) => ({
  requestedBy: one(user, {
    fields: [speciesRequest.requestedById],
    references: [user.id],
    relationName: 'requestedBy',
  }),
  reviewedBy: one(user, {
    fields: [speciesRequest.reviewedById],
    references: [user.id],
    relationName: 'reviewedBy',
  }),
  project: one(project, {
    fields: [speciesRequest.projectId],
    references: [project.id],
  }),
  createdSpecies: one(scientificSpecies, {
    fields: [speciesRequest.createdSpeciesId],
    references: [scientificSpecies.id],
  }),
  duplicateOf: one(speciesRequest, {
    fields: [speciesRequest.duplicateOfRequestId],
    references: [speciesRequest.id],
  }),
}));

export const surveyRelations = relations(survey, ({ one }) => ({
  user: one(user, {
    fields: [survey.userId],
    references: [user.id],
  }),
}));

export const migrationRelations = relations(migration, ({ one, many }) => ({
  user: one(user, {
    fields: [migration.userId],
    references: [user.id],
  }),
  logs: many(migrationLog),
}));

export const migrationRequestRelation = relations(
  migrationRequest,
  ({ one }) => ({
    user: one(user, {
      fields: [migrationRequest.userId],
      references: [user.id],
    }),
  }),
);

export const migrationLogRelations = relations(migrationLog, ({ one }) => ({
  migration: one(migration, {
    fields: [migrationLog.migrationId],
    references: [migration.id],
  }),
}));

export const workspaceRelations = relations(workspace, ({ one, many }) => ({
  createdBy: one(user, {
    fields: [workspace.createdById],
    references: [user.id],
    relationName: 'createdBy',
  }),
  members: many(workspaceMember),
  projects: many(project),
}));

export const workspaceMemberRelations = relations(
  workspaceMember,
  ({ one }) => ({
    workspace: one(workspace, {
      fields: [workspaceMember.workspaceId],
      references: [workspace.id],
    }),
    user: one(user, {
      fields: [workspaceMember.userId],
      references: [user.id],
    }),
    invitedBy: one(user, {
      fields: [workspaceMember.invitedById],
      references: [user.id],
      relationName: 'invitedBy',
    }),
  }),
);

export const projectRelations = relations(project, ({ one, many }) => ({
  createdBy: one(user, {
    fields: [project.createdById],
    references: [user.id],
    relationName: 'createdBy',
  }),
  workspace: one(workspace, {
    fields: [project.workspaceId],
    references: [workspace.id],
  }),
  members: many(projectMember),
  invites: many(projectInvites),
  bulkInvites: many(bulkInvite),
  sites: many(site),
  interventions: many(intervention),
  projectSpecies: many(projectSpecies),
  speciesRequests: many(speciesRequest),
}));

export const projectMemberRelations = relations(projectMember, ({ one }) => ({
  project: one(project, {
    fields: [projectMember.projectId],
    references: [project.id],
  }),
  user: one(user, {
    fields: [projectMember.userId],
    references: [user.id],
  }),
  invitedBy: one(user, {
    // 🔧 ADD: Missing relation
    fields: [projectMember.invitedById],
    references: [user.id],
    relationName: 'invitedBy',
  }),
  bulkInvite: one(bulkInvite, {
    fields: [projectMember.bulkInviteId],
    references: [bulkInvite.id],
  }),
}));

export const projectSpeciesRelations = relations(projectSpecies, ({ one }) => ({
  project: one(project, {
    fields: [projectSpecies.projectId],
    references: [project.id],
  }),
  addedBy: one(user, {
    fields: [projectSpecies.addedById],
    references: [user.id],
    relationName: 'addedBy',
  }),
  scientificSpecies: one(scientificSpecies, {
    fields: [projectSpecies.scientificSpeciesId],
    references: [scientificSpecies.id],
  }),
}));

export const siteRelations = relations(site, ({ one, many }) => ({
  project: one(project, {
    fields: [site.projectId],
    references: [project.id],
  }),
  createdBy: one(user, {
    fields: [site.createdById],
    references: [user.id],
    relationName: 'createdBy',
  }),
  interventions: many(intervention),
}));

export const treeRecordRelations = relations(treeRecord, ({ one }) => ({
  tree: one(tree, {
    fields: [treeRecord.treeId],
    references: [tree.id],
  }),
  recordedBy: one(user, {
    fields: [treeRecord.recordedById],
    references: [user.id],
    relationName: 'recordedBy',
  }),
}));

export const notificationsRelations = relations(notifications, ({ one }) => ({
  user: one(user, {
    fields: [notifications.userId],
    references: [user.id],
  }),
}));

export const auditLogRelations = relations(auditLog, ({ one }) => ({
  user: one(user, {
    fields: [auditLog.userId],
    references: [user.id],
  }),
  workspace: one(workspace, {
    fields: [auditLog.workspaceId],
    references: [workspace.id],
  }),
  project: one(project, {
    fields: [auditLog.projectId],
    references: [project.id],
  }),
}));

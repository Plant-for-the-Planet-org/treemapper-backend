// src/project-invite/project-invite.service.ts
import { Injectable, NotFoundException, ForbiddenException } from '@nestjs/common';
import { DrizzleService } from '../database/database.service';
import { eq, and } from 'drizzle-orm';
import { projectInvites, projects, projectUsers } from '../../drizzle/schema/schema';
import { v4 as uuidv4 } from 'uuid';

@Injectable()
export class ProjectInviteService {
  constructor(private readonly drizzle: DrizzleService) {}

  async createInvite(invitedByUserId: string, projectId: string, email: string, role: string) {
    const db = this.drizzle.database;
    
    // Check if user has permission to invite
    const userProject = await db
      .select()
      .from(projectUsers)
      .where(
        and(
          eq(projectUsers.projectId, projectId),
          eq(projectUsers.userId, invitedByUserId)
        )
      );

    if (!userProject.length || !['owner', 'admin'].includes(userProject[0].role)) {
      throw new ForbiddenException('You do not have permission to invite users');
    }

    // Check if project exists
    const project = await db
      .select()
      .from(projects)
      .where(eq(projects.id, projectId));

    if (!project.length) {
      throw new NotFoundException('Project not found');
    }

    // Check if invite already exists
    const existingInvite = await db
      .select()
      .from(projectInvites)
      .where(
        and(
          eq(projectInvites.projectId, projectId),
          eq(projectInvites.email, email),
          eq(projectInvites.status, 'pending')
        )
      );

    if (existingInvite.length) {
      return existingInvite[0];
    }

    // Create new invite
    const invite = await db
      .insert(projectInvites)
      .values({
        id: uuidv4(),
        projectId,
        email,
        invitedByUserId,
        role: role as 'owner' | 'admin' | 'manager' | 'contributor' | 'viewer',
        status: 'pending',
        expiresAt: new Date(Date.now() + 7 * 24 * 60 * 60 * 1000) // 7 days expiry
      })
      .returning();

    return invite[0];
  }

  async acceptInvite(inviteId: string, userId: string) {
    const db = this.drizzle.database;

    // Get invite
    const invite = await db
      .select()
      .from(projectInvites)
      .where(eq(projectInvites.id, inviteId));

    if (!invite.length || invite[0].status !== 'pending') {
      throw new NotFoundException('Invalid or expired invite');
    }

    // Check if user already in project
    const existingMember = await db
      .select()
      .from(projectUsers)
      .where(
        and(
          eq(projectUsers.projectId, invite[0].projectId),
          eq(projectUsers.userId, userId)
        )
      );

    if (existingMember.length) {
      throw new ForbiddenException('You are already a member of this project');
    }

    // Begin transaction
    return await db.transaction(async (tx) => {
      // Update invite status
      await tx
        .update(projectInvites)
        .set({ status: 'accepted' })
        .where(eq(projectInvites.id, inviteId));

      // Add user to project
      const projectUser = await tx
        .insert(projectUsers)
        .values({
          id: uuidv4(),
          projectId: invite[0].projectId,
          userId,
          role: invite[0].role
        })
        .returning();

      return projectUser[0];
    });
  }

  async getInvites(projectId: string) {
    const db = this.drizzle.database;
    
    return await db
      .select()
      .from(projectInvites)
      .where(eq(projectInvites.projectId, projectId));
  }

  async rejectInvite(inviteId: string, userId: string) {
    const db = this.drizzle.database;

    const invite = await db
      .select()
      .from(projectInvites)
      .where(eq(projectInvites.id, inviteId));

    if (!invite.length || invite[0].status !== 'pending') {
      throw new NotFoundException('Invalid or expired invite');
    }

    return await db
      .update(projectInvites)
      .set({ status: 'rejected' })
      .where(eq(projectInvites.id, inviteId))
      .returning();
  }
}
// src/projects/projects.service.ts modifications

import { Injectable, NotFoundException, ForbiddenException, ConflictException, BadRequestException } from '@nestjs/common';
import { DrizzleService } from '../database/drizzle.service';
import { projects, projectMembers, users, projectInvites } from '../database/schema';
import { CreateProjectDto } from './dto/create-project.dto';
import { UpdateProjectDto } from './dto/update-project.dto';
import { AddProjectMemberDto } from './dto/add-project-member.dto';
import { UpdateProjectRoleDto } from './dto/update-project-role.dto';
import { eq, and } from 'drizzle-orm';
import { sql } from 'drizzle-orm';
import { NotificationService } from '../notification/notification.service';

@Injectable()
export class ProjectsService {
  constructor(
    private drizzleService: DrizzleService,
    private notificationService: NotificationService,
  ) { }
  private getGeoJSONForPostGIS(locationInput: any): any {
    if (!locationInput) {
      return null;
    }

    // If it's a Feature, extract the geometry
    if (locationInput.type === 'Feature' && locationInput.geometry) {
      return locationInput.geometry;
    }

    // If it's a FeatureCollection, extract the first geometry
    if (locationInput.type === 'FeatureCollection' &&
      locationInput.features &&
      locationInput.features.length > 0 &&
      locationInput.features[0].geometry) {
      return locationInput.features[0].geometry;
    }

    // If it's already a geometry object, use it directly
    if (['Point', 'LineString', 'Polygon', 'MultiPoint', 'MultiLineString', 'MultiPolygon', 'GeometryCollection'].includes(locationInput.type)) {
      return locationInput;
    }

    throw new BadRequestException('Invalid GeoJSON format');

  }
  async create(createProjectDto: CreateProjectDto, userId: string) {
    try {
      let locationValue: any = null;
      if (createProjectDto.location) {
        try {
          // Extract the geometry part if it's a Feature
          const geometry = this.getGeoJSONForPostGIS(createProjectDto.location);

          // Use SQL raw to convert GeoJSON to PostGIS geometry
          locationValue = sql`ST_SetSRID(ST_GeomFromGeoJSON(${JSON.stringify(geometry)}), 4326)`;
        } catch (error) {
          return {
            message: 'Invalid geoJSON provide',
            statusCode: 400,
            error: "Error",
            data: null,
            code: 'invalid_project_geoJSON',
          }
        }
      }

      // Create project with updated schema fields
      const projectResult = await this.drizzleService.db
        .insert(projects)
        .values({
          projectName: createProjectDto.projectName,
          projectType: createProjectDto.projectType,
          ecosystem: createProjectDto.ecosystem,
          projectScale: createProjectDto.projectScale,
          target: createProjectDto.target,
          projectWebsite: createProjectDto.projectWebsite,
          description: createProjectDto.description,
          isPublic: createProjectDto.isPublic || false,
          createdById: userId,
          metadata: createProjectDto.metadata || {},
          location: locationValue,
        })
        .returning();

      const project = projectResult[0];

      // Add creator as project owner
      await this.drizzleService.db
        .insert(projectMembers)
        .values({
          projectId: project.id,
          userId: userId,
          role: 'owner',
        });

      return {
        message: 'Project created successfully',
        statusCode: 200,
        error: null,
        data: project,
        code: 'project_created',
      };
    } catch (error) {
      return {
        message: 'Failed to create Project',
        statusCode: 500,
        error: "Error",
        data: null,
        code: 'failed_creating_project',
      }
    }
  }


  async findAll(userId: string) {
    try {
      const result = await this.drizzleService.db
        .select({
          project: {
            ...projects,
            // Convert PostGIS location to GeoJSON
            location: sql`ST_AsGeoJSON(${projects.location})::json`.as('location')
          },
          role: projectMembers.role,
        })
        .from(projectMembers)
        .innerJoin(projects, eq(projectMembers.projectId, projects.id))
        .innerJoin(users, eq(projectMembers.userId, users.id))
        .where(eq(users.id, userId));
      return {
        message: 'User projects',
        statusCode: 200,
        error: null,
        data: result.map(({ project, role }) => ({
          ...project,
          userRole: role,
        })),
        code: 'fetched_user_project',
      }
    } catch (error) {
      return {
        message: 'Failed to fetch user Projects',
        statusCode: 500,
        error: "Error",
        data: null,
        code: 'failed_fetching_user_project',
      }
    }
  }

  async findOne(projectId: string) {
    // Get project
    try {
      const projectQuery = await this.drizzleService.db
      .select()
      .from(projects)
      .where(eq(projects.id, projectId));

    if (projectQuery.length === 0) {
      throw new NotFoundException('Project not found');
    }

    return  {
        message: 'Fetched project details',
        statusCode: 200,
        error: null,
        data: projectQuery[0],
        code: 'fetch_single_project_details',
    };
    } catch (error) {
      return {
        message: 'Failed to fetch Project details',
        statusCode: 500,
        error: "Error",
        data: null,
        code: 'failed_fetching_project_details',
      }
    }
  }

  async update(projectId: string, updateProjectDto: UpdateProjectDto, userId: string) {
    // Check if user has permission (only owner/admin can update project details)
    const membership = await this.getMemberRole(projectId, userId);

    if (!membership || !['owner', 'admin'].includes(membership.role)) {
      throw new ForbiddenException('You do not have permission to update this project');
    }

    // Update project
    const result = await this.drizzleService.db
      .update(projects)
      .set(updateProjectDto)
      .where(eq(projects.id, projectId))
      .returning();

    return result[0];
  }

  async remove(projectId: string, userId: string) {
    // Only owner can delete a project
    const membership = await this.getMemberRole(projectId, userId);

    if (!membership || membership.role !== 'owner') {
      throw new ForbiddenException('Only the project owner can delete the project');
    }

    // Delete the project
    await this.drizzleService.db
      .delete(projects)
      .where(eq(projects.id, projectId));

    return { success: true };
  }

  async getMembers(projectId: string) {
    // Get all members of a project with their roles
    const result = await this.drizzleService.db
      .select({
        id: users.id,
        name: users.name,
        email: users.email,
        role: projectMembers.role,
        joinedAt: projectMembers.createdAt,
      })
      .from(projectMembers)
      .innerJoin(users, eq(projectMembers.userId, users.id))
      .where(eq(projectMembers.projectId, projectId));

    return result;
  }

  async addMember(projectId: string, addMemberDto: AddProjectMemberDto, currentUserId: string) {
    // Only owner/admin can add members
    const membership = await this.getMemberRole(projectId, currentUserId);

    if (!membership || !['owner', 'admin'].includes(membership.role)) {
      throw new ForbiddenException('You do not have permission to add members to this project');
    }

    // Check if project exists
    const projectQuery = await this.drizzleService.db
      .select()
      .from(projects)
      .where(eq(projects.id, projectId));

    if (projectQuery.length === 0) {
      throw new NotFoundException('Project not found');
    }

    // Find user by email
    const userQuery = await this.drizzleService.db
      .select()
      .from(users)
      .where(eq(users.email, addMemberDto.email));

    if (userQuery.length === 0) {
      throw new NotFoundException('User not found');
    }

    const userToAdd = userQuery[0];

    // Check if user is already a member
    const existingMemberQuery = await this.drizzleService.db
      .select()
      .from(projectMembers)
      .where(
        and(
          eq(projectMembers.projectId, projectId),
          eq(projectMembers.userId, userToAdd.id)
        )
      );

    if (existingMemberQuery.length > 0) {
      throw new ConflictException('User is already a member of this project');
    }

    // Cannot change owner's role
    if (addMemberDto.role === 'owner') {
      throw new ForbiddenException('Cannot assign owner role');
    }

    // Add member
    const result = await this.drizzleService.db
      .insert(projectMembers)
      .values({
        projectId: projectId,
        userId: userToAdd.id,
        role: addMemberDto.role as 'owner' | 'admin' | 'contributor' | 'viewer',
      })
      .returning();

    return {
      ...userToAdd,
      role: result[0].role,
      joinedAt: result[0].createdAt,
    };
  }

  async updateMemberRole(
    projectId: string,
    memberId: string,
    updateRoleDto: UpdateProjectRoleDto,
    currentUserId: string
  ) {
    // Only owner/admin can update roles
    const membership = await this.getMemberRole(projectId, currentUserId);

    if (!membership || !['owner', 'admin'].includes(membership.role)) {
      throw new ForbiddenException('You do not have permission to update member roles');
    }

    // Find the member to update
    const memberQuery = await this.drizzleService.db
      .select()
      .from(projectMembers)
      .innerJoin(users, eq(projectMembers.userId, users.id))
      .where(
        and(
          eq(projectMembers.projectId, projectId),
          eq(projectMembers.userId, memberId)
        )
      );

    if (memberQuery.length === 0) {
      throw new NotFoundException('Member not found in this project');
    }

    const memberToUpdate = memberQuery[0];

    // Cannot change owner's role
    if (memberToUpdate.project_members.role === 'owner') {
      throw new ForbiddenException('Cannot change the role of the project owner');
    }

    // Cannot assign owner role
    if (updateRoleDto.role === 'owner') {
      throw new ForbiddenException('Cannot assign owner role');
    }

    // Admin cannot change another admin's role (only owner can)
    if (membership.role === 'admin' && memberToUpdate.project_members.role === 'admin') {
      throw new ForbiddenException('Admin cannot change another admin\'s role');
    }

    // Update role
    const result = await this.drizzleService.db
      .update(projectMembers)
      .set({ role: updateRoleDto.role as 'owner' | 'admin' | 'contributor' | 'viewer' })
      .where(
        and(
          eq(projectMembers.projectId, projectId),
          eq(projectMembers.userId, memberId)
        )
      )
      .returning();

    return {
      userId: memberId,
      name: memberToUpdate.users.name,
      email: memberToUpdate.users.email,
      role: result[0].role,
    };
  }

  async removeMember(projectId: string, memberId: string, currentUserId: string) {
    // Only owner/admin can remove members
    const membership = await this.getMemberRole(projectId, currentUserId);

    if (!membership || !['owner', 'admin'].includes(membership.role)) {
      throw new ForbiddenException('You do not have permission to remove members');
    }

    // Find the member to remove
    const memberQuery = await this.drizzleService.db
      .select()
      .from(projectMembers)
      .where(
        and(
          eq(projectMembers.projectId, projectId),
          eq(projectMembers.userId, memberId)
        )
      );

    if (memberQuery.length === 0) {
      throw new NotFoundException('Member not found in this project');
    }

    const memberToRemove = memberQuery[0];

    // Cannot remove the owner
    if (memberToRemove.role === 'owner') {
      throw new ForbiddenException('Cannot remove the project owner');
    }

    // Admin cannot remove another admin (only owner can)
    if (membership.role === 'admin' && memberToRemove.role === 'admin') {
      throw new ForbiddenException('Admin cannot remove another admin');
    }

    // Remove member
    await this.drizzleService.db
      .delete(projectMembers)
      .where(
        and(
          eq(projectMembers.projectId, projectId),
          eq(projectMembers.userId, memberId)
        )
      );

    return { success: true };
  }

  async inviteMember(projectId: string, email: string, role: string, currentUserId: string, inviterName, message: string) {
    try {
      const project = await this.drizzleService.db
        .select()
        .from(projects)
        .where(eq(projects.id, projectId))
        .then(results => {
          if (results.length === 0) throw new NotFoundException('Project not found');
          return results[0];
        });

      // Check if user already exists by email
      const existingUser = await this.drizzleService.db
        .select()
        .from(users)
        .where(eq(users.email, email))
        .then(results => results[0] || null);

      if (existingUser) {
        const existingMembership = await this.drizzleService.db
          .select()
          .from(projectMembers)
          .where(
            and(
              eq(projectMembers.projectId, projectId),
              eq(projectMembers.userId, existingUser.id)
            )
          )
          .then(results => results[0] || null);

        if (existingMembership) {
          throw new ConflictException('User is already a member of this project');
        }
      }

      // Check for existing pending invitation
      const existingInvite = await this.drizzleService.db
        .select()
        .from(projectInvites)
        .where(
          and(
            eq(projectInvites.projectId, projectId),
            eq(projectInvites.email, email),
            eq(projectInvites.status, 'pending')
          )
        )
        .then(results => results[0] || null);

      if (existingInvite) {
        throw new ConflictException('An invite has already been sent to this email');
      }

      // Cannot assign owner role via invite
      if (role === 'owner') {
        throw new ForbiddenException('Cannot assign owner role via invitation');
      }

      // Create invitation
      const expiryDate = new Date();
      expiryDate.setDate(expiryDate.getDate() + 7); // 7 days expiry

      const [invitation] = await this.drizzleService.db
        .insert(projectInvites)
        .values({
          projectId,
          email,
          role: role as 'owner' | 'admin' | 'contributor' | 'viewer',
          invitedById: currentUserId,
          expiresAt: expiryDate,
          message: message || ''
        })
        .returning();

      this.notificationService.sendProjectInviteEmail({
        email,
        projectName: project.projectName,
        role,
        inviterName: inviterName,
        token: invitation.token,
        expiresAt: expiryDate,
        projectId
      })
      return {
        message: 'Invitation sent',
        statusCode: 200,
        error: null,
        data: invitation,
        code: 'invitation_sent',
      };
    } catch (error) {
      return {
        message: 'Failed to send invitation',
        statusCode: 500,
        error: "Error",
        data: null,
        code: 'invitation_sent_failed',
      };
    }
  }

  async getMemberRole(projectId: string, userId: string) {
    const membershipQuery = await this.drizzleService.db
      .select()
      .from(projectMembers)
      .where(
        and(
          eq(projectMembers.projectId, projectId),
          eq(projectMembers.userId, userId)
        )
      );

    if (membershipQuery.length === 0) {
      return null;
    }

    return membershipQuery[0];
  }

  async acceptInvite(token: string, userId: string) {
    // Find the invitation
    const invite = await this.drizzleService.db
      .select({
        invite: projectInvites,
        project: projects,
        inviter: users,
      })
      .from(projectInvites)
      .innerJoin(projects, eq(projectInvites.projectId, projects.id))
      .innerJoin(users, eq(projectInvites.invitedById, users.id))
      .where(
        and(
          eq(projectInvites.token, token),
          eq(projectInvites.status, 'pending'),
        )
      )
      .then(results => results[0] || null);

    if (!invite) {
      throw new NotFoundException('Invitation not found or already processed');
    }

    if (new Date(invite.invite.expiresAt) < new Date()) {
      throw new BadRequestException('Invitation has expired');
    }

    // Get the accepting user
    const [user] = await this.drizzleService.db
      .select()
      .from(users)
      .where(eq(users.auth0Id, userId));

    if (!user) {
      throw new NotFoundException('User not found');
    }

    // Check if already a member
    const existingMember = await this.drizzleService.db
      .select()
      .from(projectMembers)
      .where(
        and(
          eq(projectMembers.projectId, invite.invite.projectId),
          eq(projectMembers.userId, user.id),
        )
      )
      .then(results => results[0] || null);

    if (existingMember) {
      throw new ConflictException('You are already a member of this project');
    }

    // Use a transaction to ensure data consistency
    return await this.drizzleService.db.transaction(async (tx) => {
      // Update invite status
      await tx
        .update(projectInvites)
        .set({ status: 'accepted', updatedAt: new Date() })
        .where(eq(projectInvites.id, invite.invite.id));

      // Add user as project member
      const [membership] = await tx
        .insert(projectMembers)
        .values({
          projectId: invite.invite.projectId,
          userId: user.id,
          role: invite.invite.role,
        })
        .returning();

      // Send notifications
      await this.notificationService.sendInviteAcceptedEmail({
        inviterEmail: invite.inviter.email,
        inviterName: invite.inviter.name || invite.inviter.authName || '',
        memberName: user.name || user.authName || user.email,
        memberEmail: user.email,
        projectName: invite.project.projectName,
        projectId: invite.project.id,
      });

      await this.notificationService.sendNewMemberWelcomeEmail({
        email: user.email,
        name: user.name || user.authName || 'there',
        projectName: invite.project.projectName,
        projectId: invite.project.id,
      });

      return {
        message: `You have successfully joined ${invite.project.projectName}`,
        projectId: invite.project.id,
        role: membership.role,
      };
    });
  }

  // Decline invite method
  async declineInvite(token: string) {
    // Find the invitation
    const invite = await this.drizzleService.db
      .select({
        invite: projectInvites,
        project: projects,
        inviter: users,
      })
      .from(projectInvites)
      .innerJoin(projects, eq(projectInvites.projectId, projects.id))
      .innerJoin(users, eq(projectInvites.invitedById, users.id))
      .where(
        and(
          eq(projectInvites.token, token),
          eq(projectInvites.status, 'pending'),
        )
      )
      .then(results => results[0] || null);

    if (!invite) {
      throw new NotFoundException('Invitation not found or already processed');
    }

    // Update invite status
    await this.drizzleService.db
      .update(projectInvites)
      .set({ status: 'declined', updatedAt: new Date() })
      .where(eq(projectInvites.id, invite.invite.id));

    // Send notification
    await this.notificationService.sendInviteDeclinedEmail({
      inviterEmail: invite.inviter.email,
      inviterName: invite.inviter.name || invite.inviter.authName || '',
      memberEmail: invite.invite.email,
      projectName: invite.project.projectName,
    });

    return {
      message: `You have declined the invitation to join ${invite.project.projectName}`,
    };
  }
}
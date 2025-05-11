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

@Injectable()
export class ProjectsService {
  constructor(private drizzleService: DrizzleService) {}
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
    // Find the user by Auth0 ID
 // Format location as PostGIS geometry if provided
    let locationValue: any = null;
    if (createProjectDto.location) {
      try {
        // Extract the geometry part if it's a Feature
        const geometry = this.getGeoJSONForPostGIS(createProjectDto.location);
        
        // Use SQL raw to convert GeoJSON to PostGIS geometry
        locationValue = sql`ST_SetSRID(ST_GeomFromGeoJSON(${JSON.stringify(geometry)}), 4326)`;
      } catch (error) {
        throw new BadRequestException('Invalid GeoJSON: ' + error.message);
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
    
    return project;
  }


  async findAll(userId: string) {
    const result = await this.drizzleService.db
      .select({
        project: projects,
        role: projectMembers.role,
      })
      .from(projectMembers)
      .innerJoin(projects, eq(projectMembers.projectId, projects.id))
      .innerJoin(users, eq(projectMembers.userId, users.id))
      .where(eq(users.auth0Id, userId));
    
    return result.map(({ project, role }) => ({
      ...project,
      userRole: role,
    }));
  }

  async findOne(projectId: string, userId: string) {
    // Find user
    const userQuery = await this.drizzleService.db
      .select()
      .from(users)
      .where(eq(users.auth0Id, userId));
    
    const user = userQuery[0];
    
    if (!user) {
      throw new NotFoundException('User not found');
    }
    
    // Check if user is a member of the project
    const membershipQuery = await this.drizzleService.db
      .select()
      .from(projectMembers)
      .where(
        and(
          eq(projectMembers.projectId, projectId),
          eq(projectMembers.userId, user.id)
        )
      );
    
    if (membershipQuery.length === 0) {
      throw new ForbiddenException('You do not have access to this project');
    }
    
    // Get project
    const projectQuery = await this.drizzleService.db
      .select()
      .from(projects)
      .where(eq(projects.id, projectId));
    
    if (projectQuery.length === 0) {
      throw new NotFoundException('Project not found');
    }
    
    return {
      ...projectQuery[0],
      userRole: membershipQuery[0].role,
    };
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

  // New method for project invites
  async inviteMember(projectId: string, email: string, role: string, currentUserId: string) {
    // Only owner/admin can invite members
    const membership = await this.getMemberRole(projectId, currentUserId);
    
    if (!membership || !['owner', 'admin'].includes(membership.role)) {
      throw new ForbiddenException('You do not have permission to invite members');
    }
    
    // Get current user ID
    const userQuery = await this.drizzleService.db
      .select()
      .from(users)
      .where(eq(users.auth0Id, currentUserId));
    
    if (userQuery.length === 0) {
      throw new NotFoundException('User not found');
    }
    
    const inviter = userQuery[0];
    
    // Check if project exists
    const projectQuery = await this.drizzleService.db
      .select()
      .from(projects)
      .where(eq(projects.id, projectId));
    
    if (projectQuery.length === 0) {
      throw new NotFoundException('Project not found');
    }
    
    // Check if user is already a member by email
    const existingUserQuery = await this.drizzleService.db
      .select()
      .from(users)
      .where(eq(users.email, email));
    
    if (existingUserQuery.length > 0) {
      const existingUser = existingUserQuery[0];
      
      const existingMemberQuery = await this.drizzleService.db
        .select()
        .from(projectMembers)
        .where(
          and(
            eq(projectMembers.projectId, projectId),
            eq(projectMembers.userId, existingUser.id)
          )
        );
      
      if (existingMemberQuery.length > 0) {
        throw new ConflictException('User is already a member of this project');
      }
    }
    
    // Check for existing invitation
    const existingInviteQuery = await this.drizzleService.db
      .select()
      .from(projectInvites)
      .where(
        and(
          eq(projectInvites.projectId, projectId),
          eq(projectInvites.email, email),
          eq(projectInvites.status, 'pending')
        )
      );
    
    if (existingInviteQuery.length > 0) {
      throw new ConflictException('An invite has already been sent to this email');
    }
    
    // Cannot assign owner role via invite
    if (role === 'owner') {
      throw new ForbiddenException('Cannot assign owner role via invitation');
    }
    
    // Create invitation
    const expiryDate = new Date();
    expiryDate.setDate(expiryDate.getDate() + 7); // 7 days expiry
    
    const result = await this.drizzleService.db
      .insert(projectInvites)
      .values({
        projectId,
        email,
        role: role as any,
        invitedById: inviter.id,
        expiresAt: expiryDate,
      })
      .returning();
    
    return result[0];
  }

  async getMemberRole(projectId: string, auth0UserId: string) {
    // Find user by Auth0 ID
    const userQuery = await this.drizzleService.db
      .select()
      .from(users)
      .where(eq(users.auth0Id, auth0UserId));
    
    if (userQuery.length === 0) {
      return null;
    }
    
    const user = userQuery[0];
    
    // Find user's role in the project
    const membershipQuery = await this.drizzleService.db
      .select()
      .from(projectMembers)
      .where(
        and(
          eq(projectMembers.projectId, projectId),
          eq(projectMembers.userId, user.id)
        )
      );
    
    if (membershipQuery.length === 0) {
      return null;
    }
    
    return membershipQuery[0];
  }
}
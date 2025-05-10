
// src/projects/projects.service.ts
import { Injectable, NotFoundException, ForbiddenException, ConflictException } from '@nestjs/common';
import { DrizzleService } from '../database/drizzle.service';
import { projects, projectMembers, users } from '../database/schema';
import { CreateProjectDto } from './dto/create-project.dto';
import { UpdateProjectDto } from './dto/update-project.dto';
import { AddProjectMemberDto } from './dto/add-project-member.dto';
import { UpdateProjectRoleDto } from './dto/update-project-role.dto';
import { eq, and } from 'drizzle-orm';

@Injectable()
export class ProjectsService {
  constructor(private drizzleService: DrizzleService) {}

  async create(createProjectDto: CreateProjectDto, userId: string) {
    // Find the user by Auth0 ID
    const userQuery = await this.drizzleService.db
      .select()
      .from(users)
      .where(eq(users.auth0Id, userId));
    
    const user = userQuery[0];
    
    if (!user) {
      throw new NotFoundException('User not found');
    }
    
    // Create project
    const projectResult = await this.drizzleService.db
      .insert(projects)
      .values({
        name: createProjectDto.name,
        description: createProjectDto.description,
        createdById: user.id,
      })
      .returning();
    
    const project = projectResult[0];
    
    // Add creator as project owner
    await this.drizzleService.db
      .insert(projectMembers)
      .values({
        projectId: project.id,
        userId: user.id,
        role: 'owner',
      });
    
    return project;
  }

  async findAll(userId: string) {
    // Find user
    const userQuery = await this.drizzleService.db
      .select()
      .from(users)
      .where(eq(users.auth0Id, userId));
    
    const user = userQuery[0];
    
    if (!user) {
      throw new NotFoundException('User not found');
    }
    
    // Get all projects where user is a member
    const result = await this.drizzleService.db
      .select({
        project: projects,
        role: projectMembers.role,
      })
      .from(projectMembers)
      .innerJoin(projects, eq(projectMembers.projectId, projects.id))
      .where(eq(projectMembers.userId, user.id));
    
    return result.map(({ project, role }) => ({
      ...project,
      userRole: role,
    }));
  }

  async findOne(projectId: number, userId: string) {
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

  async update(projectId: number, updateProjectDto: UpdateProjectDto, userId: string) {
    // Check if user has permission (only owner/admin can update project details)
    const membership = await this.getMemberRole(projectId, userId);
    
    if (!membership || !['owner', 'admin', 'editor'].includes(membership.role)) {
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

  async remove(projectId: number, userId: string) {
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

  async getMembers(projectId: number) {
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

  async addMember(projectId: number, addMemberDto: AddProjectMemberDto, currentUserId: string) {
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
        projectId,
        userId: userToAdd.id,
        role: addMemberDto.role as any,
      })
      .returning();
    
    return {
      ...userToAdd,
      role: result[0].role,
      joinedAt: result[0].createdAt,
    };
  }

  async updateMemberRole(
    projectId: number,
    memberId: number,
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
      .set({ role: updateRoleDto.role as any })
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

  async removeMember(projectId: number, memberId: number, currentUserId: string) {
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

  async getMemberRole(projectId: number, auth0UserId: string) {
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
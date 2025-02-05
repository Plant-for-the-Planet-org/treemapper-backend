import { Injectable, ForbiddenException, NotFoundException } from '@nestjs/common';
import { DrizzleService } from '../database/database.service';
import { CreateProjectDto } from './dto/create-project'
import { and, eq, sql } from 'drizzle-orm';
import { projects, projectUsers, workspaces, workspaceUsers } from '../../drizzle/schema/schema';
import { UserData } from '../auth/jwt.strategy';
import {v4 as uuid4} from 'uuid'

@Injectable()
export class ProjectService {
  constructor(private readonly drizzle: DrizzleService) {}

  async createProject(dto: CreateProjectDto, user: UserData) {
    // Check if user has admin access to the workspace
    const [workspaceUser] = await this.drizzle.database
      .select()
      .from(workspaceUsers)
      .where(and(
        eq(workspaceUsers.userId, user.internalId),
        eq(workspaceUsers.workspaceId, dto.workspaceId),
        eq(workspaceUsers.status, 'active')
      ))
      .limit(1);

    if (!workspaceUser || workspaceUser.role !== 'admin') {
      throw new ForbiddenException('You do not have permission to create projects in this workspace');
    }

    // Use database transaction
    const project = await this.drizzle.database.transaction(async (tx) => {
      // Create the project
      const [newProject] = await tx
        .insert(projects)
        .values({
          id: uuid4(),
          name: dto.name,
          slug: dto.slug,
          description: dto.description,
          workspaceId: dto.workspaceId,
          settings: dto.settings || {},
          metadata: dto.metadata || {},
          visibility: dto.visibility || 'private',
          createdBy: user.internalId,
          status: 'active'
        })
        .returning();

      // Add the creator as project owner
      await tx
        .insert(projectUsers)
        .values({
          id: uuid4(),
          projectId: newProject.id,
          userId: user.internalId,
          role: 'owner',
          status: 'active'
        });

      return newProject;
    });

    return project;
  }

  async validateProjectAccess(projectId: string, user: UserData, requiredRole: 'owner' | 'admin' | 'manager' | 'contributor' | 'viewer') {
    const [projectUser] = await this.drizzle.database
      .select()
      .from(projectUsers)
      .where(and(
        eq(projectUsers.projectId, projectId),
        eq(projectUsers.userId, user.internalId),
        eq(projectUsers.status, 'active')
      ))
      .limit(1);

    if (!projectUser) {
      throw new NotFoundException('Project not found or access denied');
    }

    const roles = ['owner', 'admin', 'manager', 'contributor', 'viewer'];
    const userRoleIndex = roles.indexOf(projectUser.role);
    const requiredRoleIndex = roles.indexOf(requiredRole);

    if (userRoleIndex === -1 || requiredRoleIndex === -1 || userRoleIndex > requiredRoleIndex) {
      throw new ForbiddenException('Insufficient permissions');
    }

    return projectUser;
  }


  async getUserProjects(userId: string) {
    // Get all active projects where user has access
    const userProjects = await this.drizzle.database
      .select({
        project: {
          id: projects.id,
          name: projects.name,
          slug: projects.slug,
          description: projects.description,
          workspaceId: projects.workspaceId,
          settings: projects.settings,
          metadata: projects.metadata,
          status: projects.status,
          visibility: projects.visibility,
          createdAt: projects.createdAt,
          updatedAt: projects.updatedAt,
        },
        workspace: {
          name: workspaces.name,
          slug: workspaces.slug,
        },
        role: projectUsers.role,
        lastAccess: projectUsers.lastAccessAt,
      })
      .from(projectUsers)
      .innerJoin(projects, and(
        eq(projects.id, projectUsers.projectId),
        eq(projects.status, 'active')
      ))
      .innerJoin(workspaces, and(
        eq(workspaces.id, projects.workspaceId),
        eq(workspaces.status, 'active')
      ))
      .where(and(
        eq(projectUsers.userId, userId),
        eq(projectUsers.status, 'active')
      ))
      .orderBy(sql`${projects.updatedAt} DESC`);

    // Transform the data to a more friendly format
    return userProjects.map(({ project, workspace, role, lastAccess }) => ({
      ...project,
      workspace: {
        id: project.workspaceId,
        name: workspace.name,
        slug: workspace.slug,
      },
      userRole: role,
      lastAccess,
    }));
  }
}

import { Injectable } from '@nestjs/common';
import { DrizzleService } from '../database/database.service';
import { projects, projectUsers } from '../../drizzle/schema/schema';
import { eq } from 'drizzle-orm';
import { v4 as uuidv4 } from 'uuid';

@Injectable()
export class ProjectsService {
  constructor(private readonly drizzle: DrizzleService) {}

  async getUserProjects(userId: string) {
    try {
      // Get all projects where user is a member
      const userProjects = await this.drizzle.database
        .select({
          id: projects.id,
          name: projects.name,
          description: projects.description,
          settings: projects.settings,
          createdAt: projects.createdAt,
          updatedAt: projects.updatedAt,
        })
        .from(projects)
        .innerJoin(
          projectUsers,
          eq(projects.id, projectUsers.projectId),
        )
        .where(eq(projectUsers.userId, userId));

      // If no projects exist, create a default project
      if (userProjects.length === 0) {
        const defaultProject = await this.createDefaultProject(userId);
        return [defaultProject];
      }

      return userProjects;
    } catch (error) {
      console.error('Error in getUserProjects:', error);
      throw error;
    }
  }

  private async createDefaultProject(userId: string) {
    return await this.drizzle.database.transaction(async (tx) => {
      // Create default project
      const [project] = await tx
        .insert(projects)
        .values({
          id: uuidv4(),
          name: 'My First Project',
          slug: 'my-first-project',
          description: 'This is your default project',
          createdBy: userId,
          settings: {},
          workspaceId: 'default-workspace-id',
        })
        .returning();

      // Add user as project admin
      await tx.insert(projectUsers).values({
        id: uuidv4(),
        projectId: project.id,
        userId: userId,
        role: 'admin',
      });

      return project;
    });
  }
}
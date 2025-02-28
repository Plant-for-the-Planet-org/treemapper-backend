import {
  Injectable,
  ForbiddenException,
  NotFoundException,
} from '@nestjs/common';
import { DrizzleService } from '../database/database.service';
import { CreateProjectDto } from './dto/create-project';
import { and, eq, sql, desc, asc, or } from 'drizzle-orm';
import {
  projectInvites,
  projects,
  projectSites,
  projectUsers,
} from '../../drizzle/schema/schema';
import { UserData } from '../auth/jwt.strategy';
import { v4 as uuid4 } from 'uuid';
import {
  GetUserProjectsParams,
  ProjectWithMembership,
} from './project.interface';
import {
  generateProjectName,
  generateProjectSlug,
} from 'src/util/nameGeneration';

@Injectable()
export class ProjectService {
  constructor(private readonly drizzle: DrizzleService) {}

  async createProject(dto: CreateProjectDto, user: UserData) {
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
          settings: dto.settings || {},
          metadata: dto.metadata || {},
          visibility: dto.visibility || 'private',
          createdBy: user.internalId,
          status: 'active',
        })
        .returning();

      // Add the creator as project owner
      await tx.insert(projectUsers).values({
        id: uuid4(),
        projectId: newProject.id,
        userId: user.internalId,
        role: 'owner',
        status: 'active',
      });

      return newProject;
    });

    return project;
  }

  async validateProjectAccess(
    projectId: string,
    user: UserData,
    requiredRole: 'owner' | 'admin' | 'manager' | 'contributor' | 'viewer',
  ) {
    const [projectUser] = await this.drizzle.database
      .select()
      .from(projectUsers)
      .where(
        and(
          eq(projectUsers.projectId, projectId),
          eq(projectUsers.userId, user.internalId),
          eq(projectUsers.status, 'active'),
        ),
      )
      .limit(1);

    if (!projectUser) {
      throw new NotFoundException('Project not found or access denied');
    }

    const roles = ['owner', 'admin', 'manager', 'contributor', 'viewer'];
    const userRoleIndex = roles.indexOf(projectUser.role);
    const requiredRoleIndex = roles.indexOf(requiredRole);

    if (
      userRoleIndex === -1 ||
      requiredRoleIndex === -1 ||
      userRoleIndex > requiredRoleIndex
    ) {
      throw new ForbiddenException('Insufficient permissions');
    }

    return projectUser;
  }

  async getUserProjects(
    user: UserData,
    params: GetUserProjectsParams = {},
  ): Promise<{ data: ProjectWithMembership[]; total: number }> {
    const {
      status = 'active',
      sort = 'updatedAt',
      order = 'desc',
      page = 1,
      limit = 10,
      search,
    } = params;

    // Calculate offset for pagination
    const offset = (page - 1) * limit;

    // Build the base query conditions
    const conditions = [
      eq(projectUsers.userId, user.internalId),
      eq(projectUsers.status, 'active'),
    ];

    if (status) {
      conditions.push(eq(projects.status, status));
    }

    if (search) {
      conditions.push(
        or(
          sql`${projects.name} ILIKE ${`%${search}%`}`,
          sql`${projects.description} ILIKE ${`%${search}%`}`,
        ) as any,
      );
    }

    // Get total count for pagination
    const [{ count }] = await this.drizzle.database
      .select({
        count: sql<number>`count(*)::int`,
      })
      .from(projects)
      .innerJoin(projectUsers, eq(projects.id, projectUsers.projectId))
      .where(and(...conditions));

    // If user has no projects, create a default project
    if (count === 0) {
      const defaultProject = await this.createDefaultProject(user);
      return {
        data: [
          {
            ...defaultProject,
            userRole: 'admin',
            totalMembers: 1,
          },
        ],
        total: 1,
      };
    }

    // Build the sorting expression
    const sortExpression = order === 'asc' ? asc : desc;
    const sortColumn =
      sort === 'name'
        ? projects.name
        : sort === 'createdAt'
          ? projects.createdAt
          : projects.updatedAt;

    // Main query to fetch projects with user role and member count
    const projectsData = await this.drizzle.database
      .select({
        id: projects.id,
        name: projects.name,
        slug: projects.slug,
        description: projects.description,
        settings: projects.settings as Record<string, any>,
        metadata: projects.metadata as Record<string, any>,
        status: projects.status,
        visibility: projects.visibility,
        isDefault: projects.isDefault,
        createdAt: projects.createdAt,
        updatedAt: projects.updatedAt,
        userRole: projectUsers.role,
        totalMembers: sql<number>`(
          SELECT COUNT(*)::int 
          FROM ${projectUsers} pu2 
          WHERE pu2.project_id = ${projects.id} 
          AND pu2.status = 'active'
        )`,
      })
      .from(projects)
      .innerJoin(projectUsers, eq(projects.id, projectUsers.projectId))
      .where(and(...conditions))
      .orderBy(sortExpression(sortColumn))
      .limit(limit)
      .offset(offset);

    return {
      data: projectsData,
      total: Number(count),
    };
  }

  // Add this new method to create a default project
  private async createDefaultProject(user: UserData): Promise<any> {
    return await this.drizzle.database.transaction(async (tx) => {
      const projName = generateProjectName();
      // Create default project
      const [newProject] = await tx
        .insert(projects)
        .values({
          id: uuid4(),
          name: projName,
          slug: generateProjectSlug(projName), // Ensure unique slug
          description: 'This is your default project',
          settings: {},
          metadata: {},
          visibility: 'private',
          createdBy: user.internalId,
          status: 'active',
          isDefault: true,
        })
        .returning();

      // Add user as admin
      await tx.insert(projectUsers).values({
        id: uuid4(),
        projectId: newProject.id,
        userId: user.internalId,
        role: 'admin',
        status: 'active',
      });

      return newProject;
    });
  }
}

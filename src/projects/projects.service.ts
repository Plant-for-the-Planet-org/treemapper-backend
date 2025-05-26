import {
  Injectable,
  NotFoundException,
  ConflictException,
  BadRequestException,
  ForbiddenException
} from '@nestjs/common';
import { DrizzleService } from '../database/drizzle.service';
import { projects, users, projectMembers, sites } from '../database/schema';
import { CreateProjectDto } from './dto/create-project.dto';
import { UpdateProjectDto } from './dto/update-project.dto';
import { ProjectQueryDto } from './dto/project-query.dto';
import { Project, PublicProject } from './entities/project.entity';
import {
  eq,
  and,
  or,
  like,
  desc,
  asc,
  count,
  isNull,
  sql
} from 'drizzle-orm';
import { randomUUID } from 'crypto';

@Injectable()
export class ProjectsService {
  constructor(private drizzleService: DrizzleService) { }

  // ============================================================================
  // CREATE OPERATIONS
  // ============================================================================

  async create(createProjectDto: CreateProjectDto, userId: number): Promise<Project> {
    // Check if slug already exists
    const existingProject = await this.findBySlug(createProjectDto.slug);
    if (existingProject) {
      throw new ConflictException({
        message: 'Project with this slug already exists',
        error: { slug: createProjectDto.slug },
        code: 'slug_already_exists',
      });
    }

    try {
      const result = await this.drizzleService.db
        .insert(projects)
        .values({
          ...createProjectDto,
          guid: createProjectDto.guid || randomUUID(),
          createdById: userId,
          createdAt: new Date(),
          updatedAt: new Date(),
        })
        .returning();

      const project = result[0];

      // Add creator as owner to project members
      await this.drizzleService.db
        .insert(projectMembers)
        .values({
          projectId: project.id,
          userId: userId,
          role: 'owner',
          joinedAt: new Date(),
          createdAt: new Date(),
          updatedAt: new Date(),
        });

      return project;
    } catch (error) {
      throw new BadRequestException({
        message: 'Failed to create project',
        error: error.message,
        code: 'project_creation_failed',
      });
    }
  }

  // ============================================================================
  // READ OPERATIONS
  // ============================================================================

  async findAll(query: ProjectQueryDto): Promise<{
    projects: PublicProject[];
    total: number;
    page: number;
    limit: number;
  }> {
    const {
      page = 1,
      limit = 20,
      search,
      projectType,
      ecosystem,
      projectScale,
      classification,
      country,
      purpose,
      isActive,
      isPublic,
      sortBy,
      sortOrder,
      createdById
    } = query;

    const offset = (page - 1) * limit;

    // Build WHERE conditions
    const conditions: any[] = [];

    conditions.push(isNull(projects.deletedAt)); // Only non-deleted projects

    if (search) {
      conditions.push(
        or(
          like(projects.projectName, `%${search}%`),
          like(projects.description, `%${search}%`),
          like(projects.slug, `%${search}%`)
        )
      );
    }

    if (projectType) conditions.push(eq(projects.projectType, projectType));
    if (ecosystem) conditions.push(eq(projects.ecosystem, ecosystem));
    if (projectScale) conditions.push(eq(projects.projectScale, projectScale));
    if (classification) conditions.push(eq(projects.classification, classification));
    if (country) conditions.push(eq(projects.country, country));
    if (purpose) conditions.push(eq(projects.purpose, purpose));
    if (isActive !== undefined) conditions.push(eq(projects.isActive, isActive));
    if (isPublic !== undefined) conditions.push(eq(projects.isPublic, isPublic));
    if (createdById) conditions.push(eq(projects.createdById, createdById));

    const whereClause = conditions.length > 0 ? and(...conditions) : undefined;

    // Get total count
    const totalResult = await this.drizzleService.db
      .select({ count: count() })
      .from(projects)
      .where(whereClause);

    const total = totalResult[0].count;

    // Get projects with pagination
    // Ensure sortBy is a valid key of projects, fallback to 'createdAt' if not provided or invalid
    const validSortKeys = [
      'id', 'guid', 'discr', 'createdById', 'slug', 'purpose', 'projectName', 'projectType',
      'ecosystem', 'projectScale', 'target', 'projectWebsite', 'description', 'classification',
      'image', 'videoUrl', 'country', 'location', 'originalGeometry', 'geoLatitude', 'geoLongitude',
      'url', 'linkText', 'isActive', 'isPublic', 'intensity', 'revisionPeriodicityLevel', 'metadata',
      'createdAt', 'updatedAt'
    ] as const;
    type ProjectSortKey = typeof validSortKeys[number];
    const sortKey: ProjectSortKey = (sortBy && validSortKeys.includes(sortBy as ProjectSortKey))
      ? (sortBy as ProjectSortKey)
      : 'createdAt';
    const orderBy = sortOrder === 'asc' ? asc(projects[sortKey]) : desc(projects[sortKey]);

    const result = await this.drizzleService.db
      .select({
        id: projects.id,
        guid: projects.guid,
        discr: projects.discr,
        createdById: projects.createdById,
        slug: projects.slug,
        purpose: projects.purpose,
        projectName: projects.projectName,
        projectType: projects.projectType,
        ecosystem: projects.ecosystem,
        projectScale: projects.projectScale,
        target: projects.target,
        projectWebsite: projects.projectWebsite,
        description: projects.description,
        classification: projects.classification,
        image: projects.image,
        videoUrl: projects.videoUrl,
        country: projects.country,
        location: projects.location,
        originalGeometry: projects.originalGeometry,
        geoLatitude: projects.geoLatitude,
        geoLongitude: projects.geoLongitude,
        url: projects.url,
        linkText: projects.linkText,
        isActive: projects.isActive,
        isPublic: projects.isPublic,
        intensity: projects.intensity,
        revisionPeriodicityLevel: projects.revisionPeriodicityLevel,
        metadata: projects.metadata,
        createdAt: projects.createdAt,
        updatedAt: projects.updatedAt,
        // Creator info
        creatorName: users.name,
        creatorEmail: users.email,
      })
      .from(projects)
      .leftJoin(users, eq(projects.createdById, users.id))
      .where(whereClause)
      .orderBy(orderBy)
      .limit(limit)
      .offset(offset);

    // Add member and site counts
    const projectsWithCounts = await Promise.all(
      result.map(async (project) => {
        const [memberCountResult, siteCountResult] = await Promise.all([
          this.drizzleService.db
            .select({ count: count() })
            .from(projectMembers)
            .where(eq(projectMembers.projectId, project.id)),

          this.drizzleService.db
            .select({ count: count() })
            .from(sites)
            .where(and(eq(sites.projectId, project.id), isNull(sites.deletedAt)))
        ]);

        return {
          ...project,
          createdBy: {
            id: project.createdById,
            name: project.creatorName,
            email: project.creatorEmail,
          },
          memberCount: memberCountResult[0].count,
          siteCount: siteCountResult[0].count,
        };
      })
    );

    return {
      projects: projectsWithCounts,
      total,
      page,
      limit,
    };
  }

  async findOne(id: number): Promise<PublicProject> {
    const result = await this.drizzleService.db
      .select({
        id: projects.id,
        guid: projects.guid,
        discr: projects.discr,
        createdById: projects.createdById,
        slug: projects.slug,
        purpose: projects.purpose,
        projectName: projects.projectName,
        projectType: projects.projectType,
        ecosystem: projects.ecosystem,
        projectScale: projects.projectScale,
        target: projects.target,
        projectWebsite: projects.projectWebsite,
        description: projects.description,
        classification: projects.classification,
        image: projects.image,
        videoUrl: projects.videoUrl,
        country: projects.country,
        location: projects.location,
        originalGeometry: projects.originalGeometry,
        geoLatitude: projects.geoLatitude,
        geoLongitude: projects.geoLongitude,
        url: projects.url,
        linkText: projects.linkText,
        isActive: projects.isActive,
        isPublic: projects.isPublic,
        intensity: projects.intensity,
        revisionPeriodicityLevel: projects.revisionPeriodicityLevel,
        metadata: projects.metadata,
        createdAt: projects.createdAt,
        updatedAt: projects.updatedAt,
        // Creator info
        creatorName: users.name,
        creatorEmail: users.email,
      })
      .from(projects)
      .leftJoin(users, eq(projects.createdById, users.id))
      .where(and(eq(projects.id, id), isNull(projects.deletedAt)));

    if (result.length === 0) {
      throw new NotFoundException({
        message: `Project with ID ${id} not found`,
        error: { projectId: id },
        code: 'project_not_found',
      });
    }

    const project = result[0];

    // Get member and site counts
    const [memberCountResult, siteCountResult] = await Promise.all([
      this.drizzleService.db
        .select({ count: count() })
        .from(projectMembers)
        .where(eq(projectMembers.projectId, project.id)),

      this.drizzleService.db
        .select({ count: count() })
        .from(sites)
        .where(and(eq(sites.projectId, project.id), isNull(sites.deletedAt)))
    ]);

    return {
      ...project,
      createdById: project.createdById,
    };
  }

  async findByGuid(guid: string): Promise<PublicProject> {
    const result = await this.drizzleService.db
      .select()
      .from(projects)
      .where(and(eq(projects.guid, guid), isNull(projects.deletedAt)));

    if (result.length === 0) {
      throw new NotFoundException({
        message: `Project with GUID ${guid} not found`,
        error: { projectGuid: guid },
        code: 'project_not_found',
      });
    }

    return result[0];
  }

  async findBySlug(slug: string): Promise<Project | null> {
    const result = await this.drizzleService.db
      .select()
      .from(projects)
      .where(and(eq(projects.slug, slug), isNull(projects.deletedAt)))
      .limit(1);

    return result[0] || null;
  }

  async findUserProjects(userId: number, query: Omit<ProjectQueryDto, 'createdById'>): Promise<{
    projects: PublicProject[];
    total: number;
    page: number;
    limit: number;
  }> {
    return this.findAll({ ...query, createdById: userId });
  }

  // ============================================================================
  // UPDATE OPERATIONS
  // ============================================================================

  async update(id: number, updateProjectDto: UpdateProjectDto, userId: number): Promise<PublicProject> {
    // Check if project exists and user has permission
    const project = await this.findOne(id);
    await this.checkUserPermission(id, userId, ['owner', 'admin', 'manager']);

    try {
      const result = await this.drizzleService.db
        .update(projects)
        .set({
          ...updateProjectDto,
          updatedAt: new Date(),
        })
        .where(eq(projects.id, id))
        .returning();

      return result[0];
    } catch (error) {
      throw new BadRequestException({
        message: 'Failed to update project',
        error: error.message,
        code: 'project_update_failed',
      });
    }
  }

  async updateBySlug(slug: string, updateProjectDto: UpdateProjectDto, userId: number): Promise<PublicProject> {
    const project = await this.findBySlug(slug);
    if (!project) {
      throw new NotFoundException({
        message: `Project with slug ${slug} not found`,
        error: { slug },
        code: 'project_not_found',
      });
    }

    return this.update(project.id, updateProjectDto, userId);
  }

  async deactivate(id: number, userId: number): Promise<PublicProject> {
    await this.checkUserPermission(id, userId, ['owner', 'admin']);
    return this.update(id, { isActive: false }, userId);
  }

  async activate(id: number, userId: number): Promise<PublicProject> {
    await this.checkUserPermission(id, userId, ['owner', 'admin']);
    return this.update(id, { isActive: true }, userId);
  }

  async makePrivate(id: number, userId: number): Promise<PublicProject> {
    await this.checkUserPermission(id, userId, ['owner', 'admin']);
    return this.update(id, { isPublic: false }, userId);
  }

  async makePublic(id: number, userId: number): Promise<PublicProject> {
    await this.checkUserPermission(id, userId, ['owner', 'admin']);
    return this.update(id, { isPublic: true }, userId);
  }

  // ============================================================================
  // DELETE OPERATIONS
  // ============================================================================

  async remove(id: number, userId: number): Promise<{ success: boolean; id: number }> {
    // Only owners can delete projects
    await this.checkUserPermission(id, userId, ['owner']);

    // Soft delete
    const result = await this.drizzleService.db
      .update(projects)
      .set({
        deletedAt: new Date(),
        updatedAt: new Date(),
      })
      .where(eq(projects.id, id))
      .returning({ id: projects.id });

    return { success: true, id: result[0].id };
  }

  async hardDelete(id: number, userId: number): Promise<{ success: boolean; id: number }> {
    // Only owners can hard delete projects
    await this.checkUserPermission(id, userId, ['owner']);

    const result = await this.drizzleService.db
      .delete(projects)
      .where(eq(projects.id, id))
      .returning({ id: projects.id });

    if (result.length === 0) {
      throw new NotFoundException({
        message: `Project with ID ${id} not found`,
        error: { projectId: id },
        code: 'project_not_found',
      });
    }

    return { success: true, id: result[0].id };
  }

  async getMemberRole(projectId: string | number, userId: number): Promise<{ role: string } | null> {
    try {
      // Convert projectId to number if it's a string
      const numericProjectId = typeof projectId === 'string' ? parseInt(projectId, 10) : projectId;

      // Validate that projectId is a valid number
      if (isNaN(numericProjectId)) {
        return null;
      }

      // Query the project_members table
      const result = await  this.drizzleService.db
        .select({ role: projectMembers.role })
        .from(projectMembers)
        .where(
          and(
            eq(projectMembers.projectId, numericProjectId),
            eq(projectMembers.userId, userId)
          )
        )
        .limit(1);

      // Return the first result or null if no membership found
      return result.length > 0 ? result[0] : null;
    } catch (error) {
      // Log the error for debugging
      console.error('Error fetching member role:', error);
      return null;
    }
  }

  // Alternative version that returns the full membership object if you need more details
  async getMembershipDetails(projectId: string | number, userId: number) {
    try {
      const numericProjectId = typeof projectId === 'string' ? parseInt(projectId, 10) : projectId;

      if (isNaN(numericProjectId)) {
        return null;
      }

      const result = await this.drizzleService.db
        .select({
          id: projectMembers.id,
          role: projectMembers.role,
          joinedAt: projectMembers.joinedAt,
          invitedAt: projectMembers.invitedAt,
        })
        .from(projectMembers)
        .where(
          and(
            eq(projectMembers.projectId, numericProjectId),
            eq(projectMembers.userId, userId)
          )
        )
        .limit(1);

      return result.length > 0 ? result[0] : null;
    } catch (error) {
      console.error('Error fetching membership details:', error);
      return null;
    }
  }

  // ============================================================================
  // UTILITY METHODS
  // ============================================================================

  async generateUniqueSlug(baseName: string): Promise<string> {
    const baseSlug = baseName.toLowerCase().replace(/[^a-z0-9]+/g, '-');
    let slug = baseSlug;
    let counter = 1;

    while (await this.findBySlug(slug)) {
      slug = `${baseSlug}-${counter}`;
      counter++;
    }

    return slug;
  }

  async checkSlugExists(slug: string): Promise<boolean> {
    const project = await this.findBySlug(slug);
    return !!project;
  }

  async checkUserPermission(
    projectId: number,
    userId: number,
    allowedRoles: string[] = []
  ): Promise<void> {
    const membership = await this.drizzleService.db
      .select()
      .from(projectMembers)
      .where(
        and(
          eq(projectMembers.projectId, projectId),
          eq(projectMembers.userId, userId)
        )
      )
      .limit(1);

    if (membership.length === 0) {
      throw new ForbiddenException({
        message: 'You do not have access to this project',
        error: { projectId, userId },
        code: 'project_access_denied',
      });
    }

    if (allowedRoles.length > 0 && !allowedRoles.includes(membership[0].role)) {
      throw new ForbiddenException({
        message: `Insufficient permissions. Required: ${allowedRoles.join(', ')}`,
        error: {
          projectId,
          userId,
          userRole: membership[0].role,
          requiredRoles: allowedRoles
        },
        code: 'insufficient_permissions',
      });
    }
  }

  async getProjectStats(): Promise<{
    total: number;
    active: number;
    inactive: number;
    public: number;
    private: number;
    byType: Record<string, number>;
    byCountry: Record<string, number>;
  }> {
    const [
      totalResult,
      activeResult,
      inactiveResult,
      publicResult,
      privateResult
    ] = await Promise.all([
      this.drizzleService.db
        .select({ count: count() })
        .from(projects)
        .where(isNull(projects.deletedAt)),

      this.drizzleService.db
        .select({ count: count() })
        .from(projects)
        .where(and(eq(projects.isActive, true), isNull(projects.deletedAt))),

      this.drizzleService.db
        .select({ count: count() })
        .from(projects)
        .where(and(eq(projects.isActive, false), isNull(projects.deletedAt))),

      this.drizzleService.db
        .select({ count: count() })
        .from(projects)
        .where(and(eq(projects.isPublic, true), isNull(projects.deletedAt))),

      this.drizzleService.db
        .select({ count: count() })
        .from(projects)
        .where(and(eq(projects.isPublic, false), isNull(projects.deletedAt))),
    ]);

    // Get counts by type
    const typeResults = await this.drizzleService.db
      .select({
        type: projects.projectType,
        count: count(),
      })
      .from(projects)
      .where(isNull(projects.deletedAt))
      .groupBy(projects.projectType);

    const byType = typeResults.reduce((acc, curr) => {
      acc[curr.type || 'unknown'] = curr.count;
      return acc;
    }, {} as Record<string, number>);

    // Get counts by country
    const countryResults = await this.drizzleService.db
      .select({
        country: projects.country,
        count: count(),
      })
      .from(projects)
      .where(isNull(projects.deletedAt))
      .groupBy(projects.country);

    const byCountry = countryResults.reduce((acc, curr) => {
      acc[curr.country || 'unknown'] = curr.count;
      return acc;
    }, {} as Record<string, number>);

    return {
      total: totalResult[0].count,
      active: activeResult[0].count,
      inactive: inactiveResult[0].count,
      public: publicResult[0].count,
      private: privateResult[0].count,
      byType,
      byCountry,
    };
  }
}




import { Injectable, NotFoundException, ForbiddenException, BadRequestException } from '@nestjs/common';
import { DrizzleService } from '../database/drizzle.service';
import { CreateSiteDto } from './dto/create-site.dto';
import { UpdateSiteDto } from './dto/update-site.dto';
import { SiteQueryDto } from './dto/site-query.dto';
import { sites, projects, projectMembers, users, trees } from '../database/schema';
import { eq, and, like, or, desc, asc, count } from 'drizzle-orm';
import { Site } from './entities/site.entity';

@Injectable()
export class SitesService {
  constructor(private readonly drizzle: DrizzleService) {}

  async create(createSiteDto: CreateSiteDto, projectId: string, userId: string): Promise<Site> {
    const db = this.drizzle.db;

    // Verify project exists and user has access
    await this.verifyProjectAccess(projectId, userId);

    try {
      const [newSite] = await db
        .insert(sites)
        .values({
          ...createSiteDto,
          projectId,
          createdById: userId,
        })
        .returning();

      return this.findOne(newSite.id, userId);
    } catch (error) {
      if (error.code === '23505') { // Unique constraint violation
        throw new BadRequestException('Site with this name already exists in the project');
      }
      throw error;
    }
  }

async findAll(query: SiteQueryDto, userId: string): Promise<{ sites: Site[]; total: number; page: number; limit: number }> {
    const db = this.drizzle.db;
    const { projectId, search, page = 1, limit = 10 } = query;
    const offset = (page - 1) * limit;

    // Build where conditions
    let whereConditions: any[] = [];

    if (projectId) {
      // Verify user has access to the project
      await this.verifyProjectAccess(projectId, userId);
      whereConditions.push(eq(sites.projectId, projectId));
    } else {
      // If no specific project, get sites from all projects user has access to
      const userProjectIds = await this.getUserProjectIds(userId);
      if (userProjectIds.length === 0) {
        return { sites: [], total: 0, page, limit };
      }
      
      if (userProjectIds.length === 1) {
        whereConditions.push(eq(sites.projectId, userProjectIds[0]));
      } else {
        whereConditions.push(or(...userProjectIds.map(id => eq(sites.projectId, id))));
      }
    }

    if (search) {
      const searchConditions = [
        like(sites.name, `%${search}%`),
        ...(sites.description ? [like(sites.description, `%${search}%`)] : []),
        ...(sites.location ? [like(sites.location, `%${search}%`)] : []),
      ];
      
      if (searchConditions.length === 1) {
        whereConditions.push(searchConditions[0]);
      } else if (searchConditions.length > 1) {
        whereConditions.push(or(...searchConditions));
      }
    }

    const whereClause = whereConditions.length === 1 
      ? whereConditions[0] 
      : whereConditions.length > 1 
        ? and(...whereConditions) 
        : undefined;

    // Get total count
    const [{ count: total }] = await db
      .select({ count: count() })
      .from(sites)
      .where(whereClause);

    // Get sites with relations
    const sitesList = await db
      .select({
        site: sites,
        project: {
          id: projects.id,
          projectName: projects.projectName,
          projectType: projects.projectType,
        },
        createdBy: {
          id: users.id,
          name: users.name,
          email: users.email,
        },
      })
      .from(sites)
      .leftJoin(projects, eq(sites.projectId, projects.id))
      .leftJoin(users, eq(sites.createdById, users.id))
      .where(whereClause)
      .orderBy(desc(sites.createdAt))
      .limit(limit)
      .offset(offset);

    const sitesWithRelations = sitesList.map(row => ({
      ...row.site,
      description: row.site.description ?? undefined,
      location: row.site.location ?? undefined,
      boundary: row.site.boundary ?? undefined,
      coordinates: row.site.coordinates ?? undefined,
      metadata: row.site.metadata ?? undefined,
      project: row.project,
      createdBy: row.createdBy,
    }));

    return {
      sites: sitesWithRelations,
      total,
      page,
      limit,
    };
  }
  async findOne(id: string, userId: string): Promise<Site> {
    const db = this.drizzle.db;

    const [siteWithRelations] = await db
      .select({
        site: sites,
        project: {
          id: projects.id,
          projectName: projects.projectName,
          projectType: projects.projectType,
        },
        createdBy: {
          id: users.id,
          name: users.name,
          email: users.email,
        },
      })
      .from(sites)
      .leftJoin(projects, eq(sites.projectId, projects.id))
      .leftJoin(users, eq(sites.createdById, users.id))
      .where(eq(sites.id, id));

    if (!siteWithRelations) {
      throw new NotFoundException('Site not found');
    }

    // Verify user has access to the project
    await this.verifyProjectAccess(siteWithRelations.site.projectId, userId);

    return {
      ...siteWithRelations.site,
      description: siteWithRelations.site.description ?? undefined,
      location: siteWithRelations.site.location ?? undefined,
      boundary: siteWithRelations.site.boundary ?? undefined,
      coordinates: siteWithRelations.site.coordinates ?? undefined,
      metadata: siteWithRelations.site.metadata ?? undefined,
      project: siteWithRelations.project,
      createdBy: siteWithRelations.createdBy,
    };
  }

  async findByProject(projectId: string, userId: string): Promise<Site[]> {
    // Verify project access
    await this.verifyProjectAccess(projectId, userId);

    const db = this.drizzle.db;

    const sitesList = await db
      .select({
        site: sites,
        createdBy: {
          id: users.id,
          name: users.name,
          email: users.email,
        },
      })
      .from(sites)
      .leftJoin(users, eq(sites.createdById, users.id))
      .where(eq(sites.projectId, projectId))
      .orderBy(asc(sites.name));

    return sitesList.map(row => ({
      ...row.site,
      description: row.site.description ?? undefined,
      location: row.site.location ?? undefined,
      boundary: row.site.boundary ?? undefined,
      coordinates: row.site.coordinates ?? undefined,
      metadata: row.site.metadata ?? undefined,
      createdBy: row.createdBy,
    }));
  }

  async update(id: string, updateSiteDto: UpdateSiteDto, userId: string): Promise<Site> {
    const db = this.drizzle.db;

    // Verify site exists and user has access
    const existingSite = await this.findOne(id, userId);
    await this.verifyProjectAccess(existingSite.projectId, userId, ['owner', 'admin', 'contributor']);

    try {
      const [updatedSite] = await db
        .update(sites)
        .set({
          ...updateSiteDto,
          updatedAt: new Date(),
        })
        .where(eq(sites.id, id))
        .returning();

      return this.findOne(updatedSite.id, userId);
    } catch (error) {
      if (error.code === '23505') {
        throw new BadRequestException('Site with this name already exists in the project');
      }
      throw error;
    }
  }

  async remove(id: string, userId: string): Promise<void> {
    const db = this.drizzle.db;

    // Verify site exists and user has access
    const existingSite = await this.findOne(id, userId);
    await this.verifyProjectAccess(existingSite.projectId, userId, ['owner', 'admin']);

    // Check if site has trees
    const [treeCount] = await db
      .select({ count: count() })
      .from(trees)
      .where(eq(trees.siteId, id));

    if (treeCount.count > 0) {
      throw new BadRequestException('Cannot delete site that contains trees');
    }

    await db.delete(sites).where(eq(sites.id, id));
  }

  async getSiteStats(id: string, userId: string): Promise<{
    treeCount: number;
    speciesCount: number;
    aliveTreesCount: number;
    deadTreesCount: number;
  }> {
    const db = this.drizzle.db;

    // Verify site exists and user has access
    await this.findOne(id, userId);

    // Get tree statistics
    const treeStats = await db
      .select({
        total: count(),
        alive: count(eq(trees.status, 'alive')),
        dead: count(eq(trees.status, 'dead')),
      })
      .from(trees)
      .where(eq(trees.siteId, id));

    // Get unique species count
    const speciesStats = await db
      .select({
        count: count(),
      })
      .from(trees)
      .where(and(eq(trees.siteId, id), eq(trees.speciesId, trees.speciesId)))
      .groupBy(trees.speciesId);

    return {
      treeCount: treeStats[0]?.total || 0,
      speciesCount: speciesStats.length,
      aliveTreesCount: treeStats[0]?.alive || 0,
      deadTreesCount: treeStats[0]?.dead || 0,
    };
  }

  // Helper methods
  private async verifyProjectAccess(
    projectId: string, 
    userId: string, 
    allowedRoles: string[] = ['owner', 'admin', 'contributor', 'viewer']
  ): Promise<void> {
    const db = this.drizzle.db;

    const [membership] = await db
      .select({
        role: projectMembers.role,
      })
      .from(projectMembers)
      .where(
        and(
          eq(projectMembers.projectId, projectId),
          eq(projectMembers.userId, userId)
        )
      );

    if (!membership) {
      throw new ForbiddenException('Access denied to this project');
    }

    if (!allowedRoles.includes(membership.role)) {
      throw new ForbiddenException('Insufficient permissions for this action');
    }
  }

  private async getUserProjectIds(userId: string): Promise<string[]> {
    const db = this.drizzle.db;

    const userProjects = await db
      .select({
        projectId: projectMembers.projectId,
      })
      .from(projectMembers)
      .where(eq(projectMembers.userId, userId));

    return userProjects.map(p => p.projectId);
  }
}

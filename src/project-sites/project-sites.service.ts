// src/project-sites/project-sites.service.ts
import { Injectable, NotFoundException, BadRequestException } from '@nestjs/common';
import { DrizzleService } from '../database/database.service';
import { and, eq, ilike, desc } from 'drizzle-orm';
import { projectSites, projects } from '../../drizzle/schema/schema';
import { v4 as uuidv4 } from 'uuid';
import { CreateSiteDto } from './dto/create-site.dto';
import { UpdateSiteDto } from './dto/update-site.dto';
import { GetSitesQueryDto } from './dto/get-sites-query.dto'
@Injectable()
export class ProjectSitesService {
  constructor(private readonly drizzle: DrizzleService) {}

  private async validateProject(projectId: string) {
    const [project] = await this.drizzle.database
      .select()
      .from(projects)
      .where(and(
        eq(projects.id, projectId),
        eq(projects.status, 'active')
      ))
      .limit(1);

    if (!project) {
      throw new NotFoundException('Project not found or inactive');
    }

    return project;
  }

  async createSite(projectId: string, userId: string, createSiteDto: CreateSiteDto) {
    await this.validateProject(projectId);

    // Generate slug if not provided
    const slug = createSiteDto.slug || this.generateSlug(createSiteDto.name);

    // Validate slug uniqueness within project
    const [existingSite] = await this.drizzle.database
      .select()
      .from(projectSites)
      .where(and(
        eq(projectSites.projectId, projectId),
        eq(projectSites.slug, slug),
        eq(projectSites.status, 'active')
      ))
      .limit(1);

    if (existingSite) {
      throw new BadRequestException('Site with this slug already exists in the project');
    }

    // Create new site
    const [site] = await this.drizzle.database
      .insert(projectSites)
      .values({
        id: uuidv4(),
        projectId,
        name: createSiteDto.name,
        slug,
        description: createSiteDto.description,
        visibility: createSiteDto.visibility || 'private',
        status: 'active',
        latitude: createSiteDto.latitude,
        longitude: createSiteDto.longitude,
        address: createSiteDto.address,
        metadata: createSiteDto.metadata || {},
        createdBy: userId
      })
      .returning();

    return site;
  }

  async getProjectSites(projectId: string, query?: GetSitesQueryDto) {
    await this.validateProject(projectId);

    let conditions = [
      eq(projectSites.projectId, projectId),
      eq(projectSites.status, 'active')
    ];

    if (query?.search) {
      conditions.push(ilike(projectSites.name, `%${query.search}%`));
    }

    if (query?.status) {
      conditions.push(eq(projectSites.status, query.status));
    }

    return await this.drizzle.database
      .select()
      .from(projectSites)
      .where(and(...conditions))
      .orderBy(desc(projectSites.createdAt));
  }

  async getSiteById(projectId: string, siteId: string) {
    await this.validateProject(projectId);

    const [site] = await this.drizzle.database
      .select()
      .from(projectSites)
      .where(and(
        eq(projectSites.id, siteId),
        eq(projectSites.projectId, projectId),
        eq(projectSites.status, 'active')
      ))
      .limit(1);

    if (!site) {
      throw new NotFoundException('Site not found');
    }

    return site;
  }

  async updateSite(projectId: string, siteId: string, userId: string, updateSiteDto: UpdateSiteDto) {
    await this.validateProject(projectId);

    // Check if site exists and belongs to project
    const [existingSite] = await this.drizzle.database
      .select()
      .from(projectSites)
      .where(and(
        eq(projectSites.id, siteId),
        eq(projectSites.projectId, projectId),
        eq(projectSites.status, 'active')
      ))
      .limit(1);

    if (!existingSite) {
      throw new NotFoundException('Site not found');
    }

    // If slug is being updated, check for uniqueness
    if (updateSiteDto.slug && updateSiteDto.slug !== existingSite.slug) {
      const [siteWithSlug] = await this.drizzle.database
        .select()
        .from(projectSites)
        .where(and(
          eq(projectSites.projectId, projectId),
          eq(projectSites.slug, updateSiteDto.slug),
          eq(projectSites.status, 'active')
        ))
        .limit(1);

      if (siteWithSlug) {
        throw new BadRequestException('Site with this slug already exists in the project');
      }
    }

    // Update site
    const [updatedSite] = await this.drizzle.database
      .update(projectSites)
      .set({
        ...updateSiteDto,
        updatedAt: new Date()
      })
      .where(and(
        eq(projectSites.id, siteId),
        eq(projectSites.projectId, projectId)
      ))
      .returning();

    return updatedSite;
  }

  async deleteSite(projectId: string, siteId: string, userId: string) {
    await this.validateProject(projectId);

    const [site] = await this.drizzle.database
      .update(projectSites)
      .set({
        status: 'deleted',
        deletedAt: new Date()
      })
      .where(and(
        eq(projectSites.id, siteId),
        eq(projectSites.projectId, projectId),
        eq(projectSites.status, 'active')
      ))
      .returning();

    if (!site) {
      throw new NotFoundException('Site not found or already deleted');
    }

    return site;
  }

  private generateSlug(name: string): string {
    return name
      .toLowerCase()
      .replace(/[^a-z0-9]+/g, '-')
      .replace(/(^-|-$)/g, '');
  }
}
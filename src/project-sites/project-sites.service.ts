// src/project-sites/project-sites.service.ts
import { Injectable, NotFoundException } from '@nestjs/common';
import { DrizzleService } from '../database/database.service';
import { eq } from 'drizzle-orm';
import { projectSites, projects } from '../../drizzle/schema/schema';
import { v4 as uuidv4 } from 'uuid';
import { CreateSiteDto } from './dto/create-site.dto';

@Injectable()
export class ProjectSitesService {
  constructor(private readonly drizzle: DrizzleService) {}

  async createSite(projectId: string, userId: string, createSiteDto: CreateSiteDto) {
    const db = this.drizzle.database;

    // Check if project exists
    const project = await db
      .select()
      .from(projects)
      .where(eq(projects.id, projectId));

    if (!project.length) {
      throw new NotFoundException('Project not found');
    }

    // Create new site
    const site = await db
      .insert(projectSites)
      .values({
        id: uuidv4(),
        projectId,
        name: createSiteDto.name,
        description: createSiteDto.description,
        location: createSiteDto.location,
        metadata: createSiteDto.metadata,
        createdBy: userId
      })
      .returning();

    return site[0];
  }

  async getProjectSites(projectId: string) {
    const db = this.drizzle.database;
    
    return await db
      .select()
      .from(projectSites)
      .where(eq(projectSites.projectId, projectId));
  }

  async getSiteById(siteId: string) {
    const db = this.drizzle.database;
    
    const site = await db
      .select()
      .from(projectSites)
      .where(eq(projectSites.id, siteId));

    if (!site.length) {
      throw new NotFoundException('Site not found');
    }

    return site[0];
  }
}
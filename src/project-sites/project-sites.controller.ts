// src/project-sites/project-sites.controller.ts
import { 
    Controller, 
    Get, 
    Post, 
    Body, 
    Param, 
    UseGuards,
    ForbiddenException 
  } from '@nestjs/common';
  import { JwtAuthGuard } from '../auth/jwt-auth.guard';
  import { ProjectRoleGuard } from '../auth/project-role.guard';
  import { ProjectRoles } from '../auth/project-roles.decorator';
  import { User } from '../auth/user.decorator';
  import { ProjectSitesService } from './project-sites.service';
  import { CreateSiteDto } from './dto/create-site.dto';
  import { RolesGuard } from '../auth/roles.guard';
  
  interface AuthUser {
    id: string;
    internalId: string;
    email: string;
    emailVerified: boolean;
    roles: string[];
    permissions: string[];
    metadata: Record<string, any>;
  }
  
  @Controller('projects/:projectId/sites')
  @UseGuards(JwtAuthGuard, RolesGuard, ProjectRoleGuard)
  export class ProjectSitesController {
    constructor(private readonly projectSitesService: ProjectSitesService) {}
  
    @Post()
    @ProjectRoles('admin', 'contributor')
    async createSite(
      @User() user: AuthUser,
      @Param('projectId') projectId: string,
      @Body() createSiteDto: CreateSiteDto
    ) {
      try {
        return await this.projectSitesService.createSite(
          projectId,
          user.internalId,
          createSiteDto
        );
      } catch (error) {
        console.error('Error creating site:', error);
        throw new ForbiddenException('Unable to create site');
      }
    }
  
    @Get()
    @ProjectRoles('admin', 'contributor', 'viewer')
    async getProjectSites(
      @Param('projectId') projectId: string,
      @User() user: AuthUser
    ) {
      try {
        return await this.projectSitesService.getProjectSites(projectId);
      } catch (error) {
        console.error('Error getting sites:', error);
        throw new ForbiddenException('Unable to fetch sites');
      }
    }
  
    @Get(':siteId')
    @ProjectRoles('admin', 'contributor', 'viewer')
    async getSiteById(
      @Param('siteId') siteId: string,
      @User() user: AuthUser
    ) {
      try {
        return await this.projectSitesService.getSiteById(siteId);
      } catch (error) {
        console.error('Error getting site:', error);
        throw new ForbiddenException('Unable to fetch site');
      }
    }
  }
// src/project-sites/project-sites.controller.ts
import { 
  Controller, 
  Get, 
  Post, 
  Patch,
  Delete,
  Body, 
  Param, 
  Query,
  UseGuards,
  ForbiddenException,
  NotFoundException,
  BadRequestException
} from '@nestjs/common';
import { JwtAuthGuard } from '../auth/jwt-auth.guard';
import { ProjectRoleGuard } from '../auth/project-role.guard';
import { ProjectRoles } from '../auth/project-roles.decorator';
import { User } from '../auth/user.decorator';
import { ProjectSitesService } from './project-sites.service';
import { CreateSiteDto } from './dto/create-site.dto';
import { UpdateSiteDto } from './dto/update-site.dto';
import { GetSitesQueryDto } from './dto/get-sites-query.dto'
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
  // @ProjectRoles('admin', 'contributor')
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
      if (error instanceof NotFoundException) {
        throw error;
      }
      if (error.code === '23505') { // Postgres unique violation
        throw new BadRequestException('Site with this slug already exists');
      }
      console.error('Error creating site:', error);
      throw new ForbiddenException('Unable to create site');
    }
  }

  @Get()
  // @ProjectRoles('admin', 'contributor', 'viewer')
  async getProjectSites(
    @Param('projectId') projectId: string,
    @Query() query: GetSitesQueryDto,
    @User() user: AuthUser
  ) {
    try {
      return await this.projectSitesService.getProjectSites(projectId, query);
    } catch (error) {
      console.error('Error getting sites:', error);
      throw new ForbiddenException('Unable to fetch sites');
    }
  }

  @Get(':siteId')
  // @ProjectRoles('admin', 'contributor', 'viewer')
  async getSiteById(
    @Param('projectId') projectId: string,
    @Param('siteId') siteId: string,
    @User() user: AuthUser
  ) {
    try {
      return await this.projectSitesService.getSiteById(projectId, siteId);
    } catch (error) {
      if (error instanceof NotFoundException) {
        throw error;
      }
      console.error('Error getting site:', error);
      throw new ForbiddenException('Unable to fetch site');
    }
  }

  @Patch(':siteId')
  // @ProjectRoles('admin', 'contributor')
  async updateSite(
    @Param('projectId') projectId: string,
    @Param('siteId') siteId: string,
    @Body() updateSiteDto: UpdateSiteDto,
    @User() user: AuthUser
  ) {
    try {
      return await this.projectSitesService.updateSite(
        projectId,
        siteId,
        user.internalId,
        updateSiteDto
      );
    } catch (error) {
      if (error instanceof NotFoundException) {
        throw error;
      }
      if (error.code === '23505') {
        throw new BadRequestException('Site with this slug already exists');
      }
      console.error('Error updating site:', error);
      throw new ForbiddenException('Unable to update site');
    }
  }

  @Delete(':siteId')
  // @ProjectRoles('admin')
  async deleteSite(
    @Param('projectId') projectId: string,
    @Param('siteId') siteId: string,
    @User() user: AuthUser
  ) {
    try {
      await this.projectSitesService.deleteSite(projectId, siteId, user.internalId);
      return { success: true };
    } catch (error) {
      if (error instanceof NotFoundException) {
        throw error;
      }
      console.error('Error deleting site:', error);
      throw new ForbiddenException('Unable to delete site');
    }
  }
}
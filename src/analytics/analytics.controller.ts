// src/analytics/analytics.controller.ts
import {
  Controller,
  Get,
  Post,
  Param,
  Query,
  UseGuards,
  Request,
  ParseIntPipe,
  HttpException,
  HttpStatus,
} from '@nestjs/common';
import { JwtAuthGuard } from '../auth/jwt-auth.guard';
import { ProjectPermissionsGuard } from '../projects/guards/project-permissions.guard';
import { ProjectRoles } from '../projects/decorators/project-roles.decorator';
import { AnalyticsService } from './analytics.service';
import {
  AnalyticsQueryDto,
  SpeciesAnalyticsQueryDto,
  GraphDataQueryDto,
  ProjectAnalyticsResponse,
  SpeciesAnalyticsResponse,
  SiteAnalyticsResponse,
  GraphDataResponse,
  HistoricalAnalyticsResponse,
  CsvExportDataResponse,
} from './dto/analytics.dto';
import { Membership } from 'src/projects/decorators/membership.decorator';

@Controller('analytics')
@UseGuards(JwtAuthGuard)
export class AnalyticsController {
  constructor(private readonly analyticsService: AnalyticsService) { }

  @Post('projects/:id/refresh')
  @ProjectRoles('owner', 'admin')
  @UseGuards(ProjectPermissionsGuard)
  async refreshProjectAnalytics(
    @Membership() membership: any
  ) {
    try {
      await this.analyticsService.queueAnalyticsRefresh(membership.projectId, membership.userId);
      return {
        message: 'Analytics refresh queued successfully',
        projectId: membership.projectId,
      };
    } catch (error) {
      if (error.message && error.message.includes('Rate limit')) {
        throw new HttpException(
          {
            message: error.message,
            retryAfter: error.retryAfter,
          },
          HttpStatus.TOO_MANY_REQUESTS,
        );
      }
      throw error;
    }
  }

  @Get('projects/:id/overview')
  @ProjectRoles('owner', 'admin')
  @UseGuards(ProjectPermissionsGuard)
  async getProjectAnalytics(
    @Membership() membership: any
  ): Promise<any> {
    return this.analyticsService.getProjectAnalytics(membership.projectId);
  }

  @Get('projects/:projectId/species')
  @ProjectRoles('owner', 'admin')
  @UseGuards(ProjectPermissionsGuard)
  async getSpeciesAnalytics(
    @Param('projectId', ParseIntPipe) projectId: number,
    @Query() query: SpeciesAnalyticsQueryDto,
    @Request() req: any,
  ): Promise<SpeciesAnalyticsResponse[]> {
    return this.analyticsService.getSpeciesAnalytics(projectId, query);
  }

  @Get('projects/:projectId/sites')
  @ProjectRoles('owner', 'admin')
  @UseGuards(ProjectPermissionsGuard)
  async getSiteAnalytics(
    @Param('projectId', ParseIntPipe) projectId: number,
    @Query() query: AnalyticsQueryDto,
    @Request() req: any,
  ): Promise<SiteAnalyticsResponse[]> {
    return this.analyticsService.getSiteAnalytics(projectId);
  }

  @Get('projects/:projectId/graphs/trees-planted')
  @ProjectRoles('owner', 'admin')
  @UseGuards(ProjectPermissionsGuard)
  async getTreesPlantedGraphData(
    @Param('projectId', ParseIntPipe) projectId: number,
    @Query() query: GraphDataQueryDto,
    @Request() req: any,
  ): Promise<GraphDataResponse> {
    return this.analyticsService.getTreesPlantedGraphData(projectId, query);
  }

  @Get('projects/:projectId/graphs/intervention-distribution')
  @ProjectRoles('owner', 'admin')
  @UseGuards(ProjectPermissionsGuard)
  async getInterventionDistributionData(
    @Param('projectId', ParseIntPipe) projectId: number,
    @Request() req: any,
  ): Promise<{ distribution: Record<string, number> }> {
    return this.analyticsService.getInterventionDistributionData(projectId);
  }

  @Get('projects/:projectId/historical')
  @ProjectRoles('owner', 'admin')
  @UseGuards(ProjectPermissionsGuard)
  async getHistoricalAnalytics(
    @Param('projectId', ParseIntPipe) projectId: number,
    @Query() query: AnalyticsQueryDto,
    @Request() req: any,
  ): Promise<HistoricalAnalyticsResponse> {
    return this.analyticsService.getHistoricalAnalytics(projectId, query);
  }

  @Get('projects/:projectId/export/csv-data')
  @ProjectRoles('owner', 'admin')
  @UseGuards(ProjectPermissionsGuard)
  async getCsvExportData(
    @Param('projectId', ParseIntPipe) projectId: number,
    @Request() req: any,
  ): Promise<CsvExportDataResponse> {
    return this.analyticsService.getCsvExportData(projectId);
  }

  @Get('projects/:projectId/status')
  @ProjectRoles('owner', 'admin')
  @UseGuards(ProjectPermissionsGuard)
  async getAnalyticsStatus(
    @Param('projectId', ParseIntPipe) projectId: number,
    @Request() req: any,
  ) {
    return this.analyticsService.getAnalyticsStatus(projectId);
  }
}

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
import { AnalyticsService, RecentAdditionsResponse, ProjectAnalyticsDto, ProjectKPIsResponse, PlantingOverviewDto, PlantingOverviewResponse, RecentAdditionsDto } from './analytics.service';
import { Membership } from 'src/projects/decorators/membership.decorator';
import { ProjectGuardResponse } from 'src/projects/projects.service';

export enum TimeInterval {
  DAILY = 'daily',
  WEEKLY = 'weekly',
  MONTHLY = 'monthly',
}


@Controller('analytics')
@UseGuards(JwtAuthGuard)
export class AnalyticsController {
  constructor(private readonly analyticsService: AnalyticsService) { }

  @Get('planting-overview')
  async getPlantingOverview(@Query() dto: PlantingOverviewDto): Promise<PlantingOverviewResponse> {
    return this.analyticsService.getPlantingOverview(dto);
  }

    @Get('recent-additions')
  async getRecentAdditions(@Query() dto: RecentAdditionsDto): Promise<RecentAdditionsResponse> {
    return this.analyticsService.getRecentAdditions(dto);
  }

  @Get('project-kpis')
  async getProjectKPIs(@Query() dto: ProjectAnalyticsDto): Promise<ProjectKPIsResponse> {
    return this.analyticsService.getProjectKPIs(dto);
  }

  
}

// src/modules/interventions/interventions.controller.ts
import {
  Controller,
  Get,
  Post,
  Body,
  UseGuards,
} from '@nestjs/common';
import { InterventionsService, PaginatedInterventionsResponse } from './interventions.service';
import {
  CreateInterventionDto,
  InterventionResponseDto,
  CreateInterventionBulkDto,
} from './dto/interventions.dto';
import { JwtAuthGuard } from '../auth/jwt-auth.guard'; // Adjust import path
import { ProjectPermissionsGuard } from '../projects/guards/project-permissions.guard'; // Adjust import path
import { ProjectRoles } from 'src/projects/decorators/project-roles.decorator';
import { Membership } from 'src/projects/decorators/membership.decorator';


@UseGuards(JwtAuthGuard)
@Controller('interventions')
export class InterventionsController {
  constructor(private readonly interventionsService: InterventionsService) { }

  @Post('/projects/:id/web')
  @ProjectRoles('owner', 'admin')
  @UseGuards(ProjectPermissionsGuard)
  async createNewInterventionWeb(
    @Body() createInterventionDto: any,
    @Membership() membership: any
  ): Promise<InterventionResponseDto> {
    return this.interventionsService.createNewInterventionWeb(createInterventionDto, membership);
  }

  @Get('/projects/:id')
  @ProjectRoles('owner', 'admin')
  @UseGuards(ProjectPermissionsGuard)
  async findAllintervention(
    @Membership() membership: any
  ): Promise<PaginatedInterventionsResponse> {
    return this.interventionsService.findAll(membership);
  }

  @Post('/projects/:id/bulk')
  @ProjectRoles('owner', 'admin')
  @UseGuards(ProjectPermissionsGuard)
  async bulkUpload(
    @Body() interventionData: CreateInterventionBulkDto[],
    @Membership() membership: any
  ): Promise<InterventionResponseDto> {
    return this.interventionsService.bulk(interventionData, membership);
  }

}
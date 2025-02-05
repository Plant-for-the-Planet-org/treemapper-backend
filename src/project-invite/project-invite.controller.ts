// src/project-invite/project-invite.controller.ts
import { Controller, Post, Get, Body, Param, UseGuards, Query } from '@nestjs/common';
import { JwtAuthGuard } from '../auth/jwt-auth.guard';
import { User } from '../auth/user.decorator';
import { ProjectInviteService } from './project-invite.service';
import { CreateProjectInviteDto } from './dto/create-invite.dto';
import { UserData } from 'src/auth/jwt.strategy';
import { GetProjectInvitesQueryDto } from './dto/get-project-invites-query.dto';

// Reuse the same AuthUser interface
interface AuthUser {
  id: string;
  internalId: string;
  email: string;
  emailVerified: boolean;
  roles: string[];
  permissions: string[];
  metadata: Record<string, any>;
}

@Controller('project-invites')
@UseGuards(JwtAuthGuard)  // Apply JwtAuthGuard to all routes
export class ProjectInviteController {
  constructor(private readonly projectInviteService: ProjectInviteService) {}

  @Post()
  async createProjectInvite(
    @Body() createInviteDto: CreateProjectInviteDto,
    @User() user: UserData
  ) {
    return await this.projectInviteService.createInvite(
      {
        ...createInviteDto
      },
      user
    );
  }

  @Get(':projectId')
  async getProjectInvites(
    @Param('projectId') projectId: string,
    @Query() query: GetProjectInvitesQueryDto,
    @User() user: UserData
  ) {
    return await this.projectInviteService.getProjectInvites(projectId, user, query);
  }
}
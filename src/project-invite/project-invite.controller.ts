// src/project-invite/project-invite.controller.ts
import { Controller, Post, Get, Body, Param, UseGuards } from '@nestjs/common';
import { JwtAuthGuard } from '../auth/jwt-auth.guard';
import { User } from '../auth/user.decorator';
import { ProjectInviteService } from './project-invite.service';

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

  @Post(':projectId/invite')
  async createInvite(
    @User() user: AuthUser,
    @Param('projectId') projectId: string,
    @Body() inviteData: { email: string; role: string }
  ) {
    return await this.projectInviteService.createInvite(
      user.internalId,  // Use internalId instead of id
      projectId,
      inviteData.email,
      inviteData.role
    );
  }

  @Post('accept/:inviteId')
  async acceptInvite(
    @User() user: AuthUser,
    @Param('inviteId') inviteId: string
  ) {
    return await this.projectInviteService.acceptInvite(inviteId, user.internalId);
  }

  @Post('reject/:inviteId')
  async rejectInvite(
    @User() user: AuthUser,
    @Param('inviteId') inviteId: string
  ) {
    return await this.projectInviteService.rejectInvite(inviteId, user.internalId);
  }

  @Get(':projectId')
  async getProjectInvites(
    @User() user: AuthUser,
    @Param('projectId') projectId: string
  ) {
    // You might want to add a check in the service to ensure the user has access to this project
    return await this.projectInviteService.getInvites(projectId);
  }
}
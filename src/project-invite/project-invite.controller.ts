// src/project-invite/project-invite.controller.ts
import {
  Controller,
  Post,
  Get,
  Body,
  Param,
  UseGuards,
  Query,
  Patch,
} from '@nestjs/common';
import { JwtAuthGuard } from '../auth/jwt-auth.guard';
import { User } from '../auth/user.decorator';
import { ProjectInviteService } from './project-invite.service';
import { CreateProjectInviteDto } from './dto/create-invite.dto';
import { UserData } from 'src/auth/jwt.strategy';
import { GetProjectInvitesQueryDto } from './dto/get-project-invites-query.dto';
import { UpdateProjectInviteDto } from './dto/accept-invite.dto';
import { AcceptProjectInviteDto } from './dto/update-invite.dto';
import { Public } from 'src/auth/public.decorator';

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
@UseGuards(JwtAuthGuard) // Apply JwtAuthGuard to all routes
export class ProjectInviteController {
  constructor(private readonly projectInviteService: ProjectInviteService) {}

  @Post()
  async createProjectInvite(
    @Body() createInviteDto: CreateProjectInviteDto,
    @User() user: UserData,
  ) {
    return await this.projectInviteService.createInvite(
      {
        ...createInviteDto,
      },
      user,
    );
  }

  @Get(':projectId')
  async getProjectInvites(
    @Param('projectId') projectId: string,
    @Query() query: GetProjectInvitesQueryDto,
    @User() user: UserData,
  ) {
    return await this.projectInviteService.getProjectInvites(
      projectId,
      user,
      query,
    );
  }

  @Patch(':id')
  @UseGuards(JwtAuthGuard)
  updateInvite(
    @Param('id') id: string,
    @Body() dto: UpdateProjectInviteDto,
    @User() user: UserData,
  ) {
    return this.projectInviteService.updateInvite(id, dto, user);
  }

  @Public()
  @Post('accept/:token')
  acceptInvite(
    @Param('token') token: string,
    @Body() dto: AcceptProjectInviteDto,
  ) {
    return this.projectInviteService.acceptInvite(token, dto);
  }
}

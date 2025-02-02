// src/project-invite/dto/create-invite.dto.ts
import { IsEmail, IsEnum } from 'class-validator';
import { projectUserRoleEnum } from '../../../drizzle/schema/schema';
import { Body, Controller, Param, Post } from '@nestjs/common';
import { ProjectInviteService } from '../project-invite.service';
import { User } from 'src/auth/user.decorator';



interface AuthUser {
    id: string;
    internalId: string;
    email: string;
    emailVerified: boolean;
    roles: string[];
    permissions: string[];
    metadata: Record<string, any>;
  }
  
export class CreateInviteDto {
  @IsEmail()
  email: string;

  @IsEnum(projectUserRoleEnum)
  role: string;
}

// Then in your controller:
@Controller('project-invite')
export class ProjectInviteController {
  constructor(private readonly projectInviteService: ProjectInviteService) {}

  @Post(':projectId/invite')
  async createInvite(
    @User() user: AuthUser,
    @Param('projectId') projectId: string,
    @Body() inviteData: CreateInviteDto  // Use the DTO here
  ) {
    return await this.projectInviteService.createInvite(
      user.internalId,
      projectId,
      inviteData.email,
      inviteData.role
    );
  }
}
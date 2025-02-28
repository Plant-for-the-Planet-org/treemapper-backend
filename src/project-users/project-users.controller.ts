// src/project-users/project-users.controller.ts
import {
    Controller,
    Get,
    Patch,
    Delete,
    Body,
    Param,
    UseGuards,
    Query,
  } from '@nestjs/common';
  import { JwtAuthGuard } from '../auth/jwt-auth.guard';
  import { User } from '../auth/user.decorator';
  import { ProjectUsersService } from './project-users.service';
  import { UpdateProjectUserDto } from './dto/update-project-user.dto';
  import { GetProjectUsersQueryDto } from './dto/get-project-users-query.dto';
  import { UserData } from 'src/auth/jwt.strategy';
  
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
  
  @Controller('projects/:projectId/users')
  @UseGuards(JwtAuthGuard) // Apply JwtAuthGuard to all routes
  export class ProjectUsersController {
    constructor(private readonly projectUsersService: ProjectUsersService) {}
  
    @Get()
    async getProjectUsers(
      @Param('projectId') projectId: string,
      @Query() query: GetProjectUsersQueryDto,
      @User() user: UserData,
    ) {
      return await this.projectUsersService.getProjectUsers(
        projectId,
        query,
        user,
      );
    }
  
    @Get(':userId')
    async getProjectUser(
      @Param('projectId') projectId: string,
      @Param('userId') userId: string,
      @User() user: UserData,
    ) {
      return await this.projectUsersService.getProjectUser(
        projectId,
        userId,
        user,
      );
    }
  
    @Patch(':userId')
    async updateProjectUser(
      @Param('projectId') projectId: string,
      @Param('userId') userId: string,
      @Body() dto: UpdateProjectUserDto,
      @User() user: UserData,
    ) {
      return await this.projectUsersService.updateProjectUser(
        projectId,
        userId,
        dto,
        user,
      );
    }
  
    @Delete(':userId')
    async removeProjectUser(
      @Param('projectId') projectId: string,
      @Param('userId') userId: string,
      @User() user: UserData,
    ) {
      return await this.projectUsersService.removeProjectUser(
        projectId,
        userId,
        user,
      );
    }
  }
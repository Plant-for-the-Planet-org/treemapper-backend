// src/projects/guards/project-permissions.guard.ts

import { Injectable, CanActivate, ExecutionContext, ForbiddenException } from '@nestjs/common';
import { Reflector } from '@nestjs/core';
import { ProjectsService } from '../projects.service';

@Injectable()
export class ProjectPermissionsGuard implements CanActivate {
  constructor(
    private reflector: Reflector,
    private projectsService: ProjectsService,
  ) {}

  async canActivate(context: ExecutionContext): Promise<boolean> {
    const roles = this.reflector.get<string[]>('projectRoles', context.getHandler());
    if (!roles) {
      return true;
    }

    const request = context.switchToHttp().getRequest();
    const userId = request.user?.id;
    const projectId = request.params.id;

    if (!userId || !projectId) {
      return false;
    }

    // const membership = await this.projectsService.getMemberRole(projectId, userId);
    
    // if (!membership) {
    //   throw new ForbiddenException('You do not have access to this project');
    // }
    // console.log("ISDJC",membership)
    // return roles.includes(membership.role);
    return true
  }
}
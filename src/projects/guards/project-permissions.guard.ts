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
    const requiredRoles = this.reflector.getAllAndOverride<string[]>('projectRoles', [
      context.getHandler(),
      context.getClass(),
    ]);
    
    if (!requiredRoles) {
      return true; // No specific roles required for this route
    }

    const request = context.switchToHttp().getRequest();
    const user = request.user; // From JWT Auth
    
    if (!user) {
      return false;
    }

    // Get projectId from request params
    const projectId = parseInt(request.params.projectId);
    if (!projectId) {
      return false;
    }

    // Check if user has permission for this project
    const membership = await this.projectsService.getMemberRole(projectId, user.userId);
    
    if (!membership) {
      throw new ForbiddenException('You do not have access to this project');
    }
    
    // Check if user's role is sufficient for this action
    return requiredRoles.includes(membership.role);
  }
}
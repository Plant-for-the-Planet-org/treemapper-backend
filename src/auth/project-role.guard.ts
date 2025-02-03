// src/auth/project-role.guard.ts
import { CanActivate, ExecutionContext, Injectable } from '@nestjs/common';
import { Reflector } from '@nestjs/core';
import { DrizzleService } from '../database/database.service';
import { eq, and } from 'drizzle-orm';
import { projectUsers } from '../../drizzle/schema/schema';

@Injectable()
export class ProjectRoleGuard implements CanActivate {
  constructor(
    private reflector: Reflector,
    private drizzle: DrizzleService
  ) {}

  async canActivate(context: ExecutionContext): Promise<boolean> {
    const allowedRoles = this.reflector.get<string[]>('projectRoles', context.getHandler());
    if (!allowedRoles) {
      return true;
    }

    const request = context.switchToHttp().getRequest();
    const user = request.user;
    
    // Check if user exists and has required metadata
    if (!user || !user.internalId) {
      return false;
    }

    const projectId = request.params.projectId;
    if (!projectId) {
      return false;
    }

    try {
      // Check user's project role
      const userProject = await this.drizzle.database
        .select()
        .from(projectUsers)
        .where(
          and(
            eq(projectUsers.projectId, projectId),
            eq(projectUsers.userId, user.internalId)
          )
        )
        .limit(1);

      if (!userProject.length) {
        return false;
      }

      return allowedRoles.includes(userProject[0].role);
    } catch (error) {
      console.error('Error in ProjectRoleGuard:', error);
      return false;
    }
  }
}
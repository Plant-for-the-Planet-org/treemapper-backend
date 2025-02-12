import {
  Injectable,
  ForbiddenException,
  NotFoundException,
} from '@nestjs/common';
import { DrizzleService } from '../database/database.service';
import { and, eq } from 'drizzle-orm';
import { projectUsers, projects, users } from '../../drizzle/schema/schema';
import { UserData } from 'src/auth/jwt.strategy';
import { GetProjectUsersQueryDto } from './dto/get-project-users-query.dto';
import { UpdateProjectUserDto } from './dto/update-project-user.dto';

@Injectable()
export class ProjectUsersService {
  constructor(private readonly drizzle: DrizzleService) {}

  private async validateUserPermission(
    projectId: string,
    userId: string,
    requiredRoles: string[],
  ) {
    const [userRole] = await this.drizzle.database
      .select()
      .from(projectUsers)
      .where(
        and(
          eq(projectUsers.projectId, projectId),
          eq(projectUsers.userId, userId),
          eq(projectUsers.status, 'active'),
        ),
      )
      .limit(1);

    if (!userRole || !requiredRoles.includes(userRole.role)) {
      throw new ForbiddenException('Insufficient permissions');
    }

    return userRole;
  }

  async getProjectUsers(
    projectId: string,
    query: GetProjectUsersQueryDto,
    user: UserData,
  ) {
    // Validate user has access to view project users
    await this.validateUserPermission(projectId, user.internalId, [
      'owner',
      'admin',
      'manager',
      'contributor',
      'viewer',
    ]);

    // Build where conditions
    let conditions = [eq(projectUsers.projectId, projectId)];

    if (query.role) {
      conditions.push(eq(projectUsers.role, query.role));
    }
    if (query.status) {
      conditions.push(eq(projectUsers.status, query.status));
    }

    // Execute query with conditions
    const projectMembers = await this.drizzle.database
      .select({
        user: {
          id: users.id,
          email: users.email,
          fullName: users.fullName,
          avatarUrl: users.avatarUrl,
        },
        membership: {
          role: projectUsers.role,
          status: projectUsers.status,
          joinedAt: projectUsers.joinedAt,
          lastAccessAt: projectUsers.lastAccessAt,
        },
      })
      .from(projectUsers)
      .innerJoin(users, eq(users.id, projectUsers.userId))
      .where(and(...conditions));

    return projectMembers;
  }

  async getProjectUser(projectId: string, userId: string, user: UserData) {
    // Validate user has access to view project users
    await this.validateUserPermission(projectId, user.internalId, [
      'owner',
      'admin',
      'manager',
      'contributor',
      'viewer',
    ]);

    const [projectMember] = await this.drizzle.database
      .select({
        user: {
          id: users.id,
          email: users.email,
          fullName: users.fullName,
          avatarUrl: users.avatarUrl,
        },
        membership: {
          role: projectUsers.role,
          status: projectUsers.status,
          joinedAt: projectUsers.joinedAt,
          lastAccessAt: projectUsers.lastAccessAt,
        },
      })
      .from(projectUsers)
      .innerJoin(users, eq(users.id, projectUsers.userId))
      .where(
        and(
          eq(projectUsers.projectId, projectId),
          eq(projectUsers.userId, userId),
        ),
      )
      .limit(1);

    if (!projectMember) {
      throw new NotFoundException('Project member not found');
    }

    return projectMember;
  }

  async updateProjectUser(
    projectId: string,
    targetUserId: string,
    dto: UpdateProjectUserDto,
    user: UserData,
  ) {
    // Validate user has permission to update project users
    const userRole = await this.validateUserPermission(
      projectId,
      user.internalId,
      ['owner', 'admin', 'manager'],
    );

    // Get target user's current role
    const [targetUser] = await this.drizzle.database
      .select()
      .from(projectUsers)
      .where(
        and(
          eq(projectUsers.projectId, projectId),
          eq(projectUsers.userId, targetUserId),
        ),
      )
      .limit(1);

    if (!targetUser) {
      throw new NotFoundException('User not found in project');
    }

    // Validate role hierarchy
    if (dto.role) {
      const roles = ['viewer', 'contributor', 'manager', 'admin', 'owner'];
      const currentUserRoleIndex = roles.indexOf(userRole.role);
      const targetUserRoleIndex = roles.indexOf(dto.role);

      if (targetUserRoleIndex >= currentUserRoleIndex) {
        throw new ForbiddenException(
          'Cannot assign role higher or equal to your own',
        );
      }
    }

    // Prepare update data
    const updateData: Partial<typeof projectUsers.$inferInsert> = {
      ...(dto.role && { role: dto.role }),
      ...(dto.status && { status: dto.status }),
      lastAccessAt: new Date(), // Update last access time
    };

    // Update user role/status
    const [updatedMembership] = await this.drizzle.database
      .update(projectUsers)
      .set(updateData)
      .where(
        and(
          eq(projectUsers.projectId, projectId),
          eq(projectUsers.userId, targetUserId),
        ),
      )
      .returning();

    return {
      role: updatedMembership.role,
      status: updatedMembership.status,
      lastAccessAt: updatedMembership.lastAccessAt,
    };
  }

  async removeProjectUser(
    projectId: string,
    targetUserId: string,
    user: UserData,
  ) {
    // Validate user has permission to remove project users
    const userRole = await this.validateUserPermission(
      projectId,
      user.internalId,
      ['owner', 'admin', 'manager'],
    );

    // Get target user's current role
    const [targetUser] = await this.drizzle.database
      .select()
      .from(projectUsers)
      .where(
        and(
          eq(projectUsers.projectId, projectId),
          eq(projectUsers.userId, targetUserId),
        ),
      )
      .limit(1);

    if (!targetUser) {
      throw new NotFoundException('User not found in project');
    }

    // Prevent removal of users with higher or equal roles
    const roles = ['viewer', 'contributor', 'manager', 'admin', 'owner'];
    const currentUserRoleIndex = roles.indexOf(userRole.role);
    const targetUserRoleIndex = roles.indexOf(targetUser.role);

    if (targetUserRoleIndex >= currentUserRoleIndex) {
      throw new ForbiddenException(
        'Cannot remove user with higher or equal role',
      );
    }

    // Soft delete the user from project
    const [removedMembership] = await this.drizzle.database
      .update(projectUsers)
      .set({
        status: 'deleted',
        lastAccessAt: new Date(), // Update last access time
      })
      .where(
        and(
          eq(projectUsers.projectId, projectId),
          eq(projectUsers.userId, targetUserId),
        ),
      )
      .returning();

    return {
      success: true,
      role: removedMembership.role,
      status: removedMembership.status,
    };
  }
}

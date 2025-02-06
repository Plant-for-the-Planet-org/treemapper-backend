import { Injectable, ForbiddenException, BadRequestException, NotFoundException } from '@nestjs/common';
import { DrizzleService } from '../database/database.service';
import { and, eq, desc } from 'drizzle-orm';
import { 
  projectInvites, 
  projectUsers, 
  projects,
  users,
} from '../../drizzle/schema/schema';
import { CreateProjectInviteDto } from './dto/create-invite.dto';
import { UserData } from '../auth/jwt.strategy';
import { GetProjectInvitesQueryDto } from './dto/get-project-invites-query.dto'
import { v4 as uuid } from 'uuid';

@Injectable()
export class ProjectInviteService {
  constructor(private readonly drizzle: DrizzleService) {}

  async createInvite(dto: CreateProjectInviteDto, inviter: UserData) {
    // Get project details including workspace
    const [project] = await this.drizzle.database
      .select({
        id: projects.id,
        status: projects.status
      })
      .from(projects)
      .where(and(
        eq(projects.id, dto.projectId),
        eq(projects.status, 'active')
      ))
      .limit(1);

    if (!project) {
      throw new BadRequestException('Project not found or inactive');
    }

    // Check if inviter has permission to invite (must be owner, admin, or manager)
    const [inviterProjectRole] = await this.drizzle.database
      .select()
      .from(projectUsers)
      .where(and(
        eq(projectUsers.projectId, dto.projectId),
        eq(projectUsers.userId, inviter.internalId),
        eq(projectUsers.status, 'active')
      ))
      .limit(1);

    if (!inviterProjectRole || !['owner', 'admin', 'manager'].includes(inviterProjectRole.role)) {
      throw new ForbiddenException('You do not have permission to invite users to this project');
    }

    // Validate role hierarchy (can't invite with higher role than self)
    const roles = ['viewer', 'contributor', 'manager', 'admin', 'owner'];
    const inviterRoleIndex = roles.indexOf(inviterProjectRole.role);
    const newRoleIndex = roles.indexOf(dto.role);

    if (newRoleIndex > inviterRoleIndex) {
      throw new ForbiddenException('Cannot invite user with higher role than your own');
    }

    // Check if user already exists
    const [existingUser] = await this.drizzle.database
      .select()
      .from(users)
      .where(eq(users.email, dto.email))
      .limit(1);

    // Check for existing invites
    const [existingInvite] = await this.drizzle.database
      .select()
      .from(projectInvites)
      .where(and(
        eq(projectInvites.projectId, dto.projectId),
        eq(projectInvites.email, dto.email),
        eq(projectInvites.status, 'pending')
      ))
      .limit(1);

    if (existingInvite) {
      throw new BadRequestException('User already has a pending invite for this project');
    }

    // If user exists, check if they're already a member
    if (existingUser) {
      const [existingMember] = await this.drizzle.database
        .select()
        .from(projectUsers)
        .where(and(
          eq(projectUsers.projectId, dto.projectId),
          eq(projectUsers.userId, existingUser.id),
          eq(projectUsers.status, 'active')
        ))
        .limit(1);

      if (existingMember) {
        throw new BadRequestException('User is already a member of this project');
      }
    }

    // Create invite
    const invite = await this.drizzle.database.transaction(async (tx) => {
      // Create the project invite
      const [newInvite] = await tx
        .insert(projectInvites)
        .values({
          id: uuid(),
          projectId: dto.projectId,
          email: dto.email,
          role: dto.role,
          status: 'pending',
          token: uuid(),
          message: dto.message,
          invitedByUserId: inviter.internalId,
          expiresAt: new Date(Date.now() + 7 * 24 * 60 * 60 * 1000) // 7 days expiry
        })
        .returning();
      return newInvite;
    });

    return {
      id: invite.id,
      email: invite.email,
      role: invite.role,
      status: invite.status,
      expiresAt: invite.expiresAt
    };
  }
  async getProjectInvites(projectId: string, user: UserData, query?: GetProjectInvitesQueryDto) {
    // First check if user has access to view invites (must be owner, admin, or manager)
    const [projectAccess] = await this.drizzle.database
      .select()
      .from(projectUsers)
      .where(and(
        eq(projectUsers.projectId, projectId),
        eq(projectUsers.userId, user.internalId),
        eq(projectUsers.status, 'active')
      ))
      .limit(1);

    if (!projectAccess || !['owner', 'admin', 'manager'].includes(projectAccess.role)) {
      throw new ForbiddenException('You do not have permission to view project invites');
    }

    // Verify project exists and is active
    const [project] = await this.drizzle.database
      .select()
      .from(projects)
      .where(and(
        eq(projects.id, projectId),
        eq(projects.status, 'active')
      ))
      .limit(1);

    if (!project) {
      throw new NotFoundException('Project not found or inactive');
    }

    // Build the query for invites
    let invitesQuery = this.drizzle.database
      .select({
        invite: {
          id: projectInvites.id,
          email: projectInvites.email,
          role: projectInvites.role,
          status: projectInvites.status,
          message: projectInvites.message,
          createdAt: projectInvites.createdAt,
          expiresAt: projectInvites.expiresAt,
          acceptedAt: projectInvites.acceptedAt,
          rejectedAt: projectInvites.rejectedAt,
          resendCount: projectInvites.resendCount,
          lastResendAt: projectInvites.lastResendAt
        },
        invitedBy: {
          id: users.id,
          fullName: users.fullName,
          email: users.email
        }
      })
      .from(projectInvites)
      .innerJoin(users, eq(users.id, projectInvites.invitedByUserId))
      .where(eq(projectInvites.projectId, projectId));

    // Apply status filter if provided
    if (query?.status) {
      invitesQuery = this.drizzle.database
        .select({
          invite: {
            id: projectInvites.id,
            email: projectInvites.email,
            role: projectInvites.role,
            status: projectInvites.status,
            message: projectInvites.message,
            createdAt: projectInvites.createdAt,
            expiresAt: projectInvites.expiresAt,
            acceptedAt: projectInvites.acceptedAt,
            rejectedAt: projectInvites.rejectedAt,
            resendCount: projectInvites.resendCount,
            lastResendAt: projectInvites.lastResendAt
          },
          invitedBy: {
            id: users.id,
            fullName: users.fullName,
            email: users.email
          }
        })
        .from(projectInvites)
        .innerJoin(users, eq(users.id, projectInvites.invitedByUserId))
        .where(and(
          eq(projectInvites.projectId, projectId),
          eq(projectInvites.status, query.status)
        ));
    }

    // Get invites ordered by creation date
    const invites = await invitesQuery.orderBy(desc(projectInvites.createdAt));

    // Transform the data for response
    return invites.map(({ invite, invitedBy }) => ({
      id: invite.id,
      email: invite.email,
      role: invite.role,
      status: invite.status,
      message: invite.message,
      invitedBy: {
        id: invitedBy.id,
        fullName: invitedBy.fullName,
        email: invitedBy.email
      },
      createdAt: invite.createdAt,
      expiresAt: invite.expiresAt,
      acceptedAt: invite.acceptedAt,
      rejectedAt: invite.rejectedAt,
      resendCount: invite.resendCount,
      lastResendAt: invite.lastResendAt
    }));
  }
}
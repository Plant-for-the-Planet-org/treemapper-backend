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
import { UpdateProjectInviteDto } from './dto/accept-invite.dto';
import { AcceptProjectInviteDto } from './dto/update-invite.dto';

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

  async updateInvite(inviteId: string, dto: UpdateProjectInviteDto, user: UserData) {
    // Get the invite with project details
    const [invite] = await this.drizzle.database
      .select({
        invite: projectInvites,
        project: {
          id: projects.id,
          status: projects.status
        }
      })
      .from(projectInvites)
      .innerJoin(projects, eq(projects.id, projectInvites.projectId))
      .where(and(
        eq(projectInvites.id, inviteId),
        eq(projectInvites.status, 'pending')
      ))
      .limit(1);

    if (!invite) {
      throw new NotFoundException('Invite not found or already processed');
    }

    if (invite.project.status !== 'active') {
      throw new BadRequestException('Project is not active');
    }

    // Check if user has permission to update invite
    const [userProjectRole] = await this.drizzle.database
      .select()
      .from(projectUsers)
      .where(and(
        eq(projectUsers.projectId, invite.invite.projectId),
        eq(projectUsers.userId, user.internalId),
        eq(projectUsers.status, 'active')
      ))
      .limit(1);

    if (!userProjectRole || !['owner', 'admin', 'manager'].includes(userProjectRole.role)) {
      throw new ForbiddenException('You do not have permission to update this invite');
    }

    // Validate role hierarchy
    if (dto.role) {
      const roles = ['viewer', 'contributor', 'manager', 'admin', 'owner'];
      const updaterRoleIndex = roles.indexOf(userProjectRole.role);
      const newRoleIndex = roles.indexOf(dto.role);

      if (newRoleIndex > updaterRoleIndex) {
        throw new ForbiddenException('Cannot set role higher than your own');
      }
    }

    // Update the invite
    const [updatedInvite] = await this.drizzle.database
      .update(projectInvites)
      .set({
        ...(dto.role && { role: dto.role }),
        ...(dto.message && { message: dto.message }),
        ...(dto.expiresAt && { expiresAt: new Date(dto.expiresAt) })
      })
      .where(eq(projectInvites.id, inviteId))
      .returning();

    return {
      id: updatedInvite.id,
      email: updatedInvite.email,
      role: updatedInvite.role,
      status: updatedInvite.status,
      message: updatedInvite.message,
      expiresAt: updatedInvite.expiresAt
    };
  }

  async acceptInvite(token: string, acceptDto: AcceptProjectInviteDto) {
    console.log("LKSJDC")
    return await this.drizzle.database.transaction(async (tx) => {
      // Get the invite
      const [invite] = await tx
        .select({
          invite: projectInvites,
          project: {
            id: projects.id,
            status: projects.status
          }
        })
        .from(projectInvites)
        .innerJoin(projects, eq(projects.id, projectInvites.projectId))
        .where(and(
          eq(projectInvites.token, token),
          eq(projectInvites.status, 'pending')
        ))
        .limit(1);

      if (!invite) {
        throw new NotFoundException('Invite not found or already processed');
      }

      if (invite.project.status !== 'active') {
        throw new BadRequestException('Project is not active');
      }

      // Check if invite is expired
      if (new Date() > invite.invite.expiresAt) {
        await tx
          .update(projectInvites)
          .set({ status: 'expired' })
          .where(eq(projectInvites.id, invite.invite.id));
        throw new BadRequestException('Invite has expired');
      }

      // Get or create user
      let userId: string;
      const [existingUser] = await tx
        .select()
        .from(users)
        .where(eq(users.email, invite.invite.email))
        .limit(1);

      if (existingUser) {
        userId = existingUser.id;
      } else {
        // Create new user
        const [newUser] = await tx
          .insert(users)
          .values({
            id: uuid(),
            email: invite.invite.email,
            fullName: acceptDto.fullName,
            firstName: acceptDto.firstName,
            lastName: acceptDto.lastName || null,
            emailVerified: true, // Since they accessed the invite link
            status: 'active'
          })
          .returning();
        userId = newUser.id;
      }

      // Check if user is already a member
      const [existingMember] = await tx
        .select()
        .from(projectUsers)
        .where(and(
          eq(projectUsers.projectId, invite.invite.projectId),
          eq(projectUsers.userId, userId),
          eq(projectUsers.status, 'active')
        ))
        .limit(1);

      if (existingMember) {
        throw new BadRequestException('You are already a member of this project');
      }

      // Create project membership
      const [projectMembership] = await tx
        .insert(projectUsers)
        .values({
          id: uuid(),
          projectId: invite.invite.projectId,
          userId: userId,
          role: invite.invite.role,
          status: 'active',
          metadata: { acceptedFromInvite: invite.invite.id }
        })
        .returning();

      // Update invite status
      await tx
        .update(projectInvites)
        .set({
          status: 'accepted',
          acceptedAt: new Date()
        })
        .where(eq(projectInvites.id, invite.invite.id));

      return {
        userId,
        projectId: invite.invite.projectId,
        role: projectMembership.role,
        status: projectMembership.status
      };
    });
  }
}
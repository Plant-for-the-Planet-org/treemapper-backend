import { Injectable, NotFoundException, BadRequestException, ForbiddenException } from '@nestjs/common';
import { DrizzleService } from '../database/drizzle.service';
import { NotificationService } from '../notification/notification.service';
import { projectInvites, projects, projectMembers, users } from '../database/schema';
import { eq, and, desc, count } from 'drizzle-orm';
import { v4 as uuidv4 } from 'uuid';
import { CreateInviteDto, BulkInviteDto } from './dto/create-invite.dto';
import { InviteResponseDto } from './dto/invite-response.dto';
import { QueryInvitesDto } from './dto/query-invites.dto';

@Injectable()
export class ProjectInvitesService {
    constructor(
        private readonly drizzle: DrizzleService,
        private readonly notificationService: NotificationService,
    ) { }

    async createInvite(
        projectId: number,
        createInviteDto: CreateInviteDto,
        invitedById: number
    ) {
        const db = this.drizzle.db;

        // Check if user has permission to invite (owner or admin)
        await this.checkInvitePermission(projectId, invitedById);

        // Check if project exists
        const project = await this.getProject(projectId);

        // Check if user is already a member
        const existingMember = await db
            .select()
            .from(projectMembers)
            .where(
                and(
                    eq(projectMembers.projectId, projectId),
                    eq(projectMembers.userId, await this.getUserIdByEmail(createInviteDto.email))
                )
            )
            .limit(1);

        if (existingMember.length > 0) {
            throw new BadRequestException('User is already a member of this project');
        }

        // Check if there's already a pending invite
        const existingInvite = await db
            .select()
            .from(projectInvites)
            .where(
                and(
                    eq(projectInvites.projectId, projectId),
                    eq(projectInvites.email, createInviteDto.email),
                    eq(projectInvites.status, 'pending')
                )
            )
            .limit(1);

        if (existingInvite.length > 0) {
            throw new BadRequestException('There is already a pending invite for this email');
        }

        // Create the invite
        const expiresAt = new Date();
        expiresAt.setDate(expiresAt.getDate() + 7); // Expires in 7 days

        const [invite] = await db
            .insert(projectInvites)
            .values({
                projectId,
                email: createInviteDto.email,
                role: createInviteDto.role as any,
                message: createInviteDto.message || '',
                invitedById,
                token: uuidv4(),
                expiresAt,
                status: 'pending',
            })
            .returning();

        // Send notification
        await this.sendInviteNotification({
            projectId,
            email: createInviteDto.email,
            role: createInviteDto.role as any,
            message: createInviteDto.message || '',
            invitedById,
            token: uuidv4(),
            expiresAt,
            status: 'pending',
        });

        return {
            success: true,
            message: 'Invite sent successfully',
            invite: {
                id: invite.id,
                email: invite.email,
                role: invite.role,
                status: invite.status,
                expiresAt: invite.expiresAt,
            },
        };
    }

    async createBulkInvites(
        projectId: number,
        bulkInviteDto: BulkInviteDto,
        invitedById: number
    ) {
        const results: { email: string; status: 'success'; data: any }[] = [];
        const errors: { email: string; status: 'error'; message: any }[] = [];

        for (const email of bulkInviteDto.emails) {
            try {
                const result = await this.createInvite(
                    projectId,
                    {
                        email,
                        role: bulkInviteDto.role,
                        message: bulkInviteDto.message,
                    },
                    invitedById
                );
                results.push({ email, status: 'success', data: result });
            } catch (error) {
                errors.push({ email, status: 'error', message: error.message });
            }
        }

        return {
            success: true,
            message: `Sent ${results.length} invites successfully, ${errors.length} failed`,
            results,
            errors,
        };
    }

    async getProjectInvites(projectId: number, query: QueryInvitesDto, userId: number) {
        const db = this.drizzle.db;

        // Check if user has permission to view invites
        await this.checkInvitePermission(projectId, userId);

        const limit = query.limit ?? 10;
        const page = query.page ?? 1;
        const offset = (page - 1) * limit;

        // Build where conditions
        const whereConditions = [eq(projectInvites.projectId, projectId)];

        if (query.status) {
            whereConditions.push(eq(projectInvites.status, query.status as any));
        }

        if (query.role) {
            whereConditions.push(eq(projectInvites.role, query.role as any));
        }

        // Get invites with pagination
        const invites = await db
            .select({
                id: projectInvites.id,
                email: projectInvites.email,
                role: projectInvites.role,
                message: projectInvites.message,
                status: projectInvites.status,
                expiresAt: projectInvites.expiresAt,
                createdAt: projectInvites.createdAt,
                acceptedAt: projectInvites.acceptedAt,
                invitedBy: {
                    id: users.id,
                    name: users.name,
                    email: users.email,
                },
            })
            .from(projectInvites)
            .leftJoin(users, eq(projectInvites.invitedById, users.id))
            .where(and(...whereConditions))
            .orderBy(desc(projectInvites.createdAt))
            .limit(limit)
            .offset(offset);

        // Get total count
        const [totalCount] = await db
            .select({ count: count() })
            .from(projectInvites)
            .where(and(...whereConditions));

        return {
            invites,
            pagination: {
                page: query.page,
                limit: query.limit,
                total: totalCount.count,
                pages: Math.ceil(totalCount.count / (query.limit ?? 10)),
            },
        };
    }

    async respondToInvite(inviteResponseDto: InviteResponseDto) {
        const db = this.drizzle.db;

        // Find the invite
        const [invite] = await db
            .select({
                id: projectInvites.id,
                projectId: projectInvites.projectId,
                email: projectInvites.email,
                role: projectInvites.role,
                status: projectInvites.status,
                expiresAt: projectInvites.expiresAt,
                project: {
                    id: projects.id,
                    name: projects.projectName,
                },
            })
            .from(projectInvites)
            .leftJoin(projects, eq(projectInvites.projectId, projects.id))
            .where(eq(projectInvites.token, inviteResponseDto.token))
            .limit(1);

        if (!invite) {
            throw new NotFoundException('Invite not found');
        }

        if (invite.status !== 'pending') {
            throw new BadRequestException('This invite has already been responded to');
        }

        if (new Date() > invite.expiresAt) {
            // Mark as expired
            await db
                .update(projectInvites)
                .set({ status: 'expired' })
                .where(eq(projectInvites.id, invite.id));

            throw new BadRequestException('This invite has expired');
        }

        // Update invite status
        await db
            .update(projectInvites)
            .set({
                status: inviteResponseDto.response as any,
                acceptedAt: inviteResponseDto.response === 'accepted' ? new Date() : null,
            })
            .where(eq(projectInvites.id, invite.id));

        if (inviteResponseDto.response === 'accepted') {
            // Find or create user account
            let user = await this.getUserByEmail(invite.email);

            if (!user) {
                // If user doesn't exist, create a placeholder account
                // They'll complete registration when they first log in
                [user] = await db
                    .insert(users)
                    .values({
                        guid: uuidv4(),
                        auth0Id: `placeholder_${Date.now()}`, // Will be updated on first login
                        email: invite.email,
                        authName: invite.email,
                        name: invite.email.split('@')[0],
                        isActive: false, // Will be activated on first login
                    })
                    .returning();
            }

            // Add user to project
            await db
                .insert(projectMembers)
                .values({
                    projectId: invite.projectId,
                    userId: user.id,
                    role: invite.role as any,
                    joinedAt: new Date(),
                });

            // Send welcome notification
            await this.notificationService.sendProjectInviteEmail({
                email: user.email,
                projectName: invite.project?.name || 'Project',
                projectId: invite.project?.id || '',
                inviterName: user?.name || '',
                token: inviteResponseDto.token,
                expiresAt: invite.expiresAt,
                role: invite.role,
            });
        }

        return {
            success: true,
            message: inviteResponseDto.response === 'accepted'
                ? 'Invite accepted successfully'
                : 'Invite declined',
            invite: {
                status: inviteResponseDto.response,
                projectName: invite.project?.name || '',
            },
        };
    }

    async cancelInvite(projectId: number, inviteId: number, userId: number) {
        const db = this.drizzle.db;

        // Check permissions
        await this.checkInvitePermission(projectId, userId);

        // Find the invite
        const [invite] = await db
            .select()
            .from(projectInvites)
            .where(
                and(
                    eq(projectInvites.id, inviteId),
                    eq(projectInvites.projectId, projectId)
                )
            )
            .limit(1);

        if (!invite) {
            throw new NotFoundException('Invite not found');
        }

        if (invite.status !== 'pending') {
            throw new BadRequestException('Can only cancel pending invites');
        }

        // Update status to expired (we use expired to indicate cancelled)
        await db
            .update(projectInvites)
            .set({ status: 'expired' })
            .where(eq(projectInvites.id, inviteId));

        return {
            success: true,
            message: 'Invite cancelled successfully',
        };
    }

    async resendInvite(projectId: number, inviteId: number, userId: number) {
        const db = this.drizzle.db;

        // Check permissions
        await this.checkInvitePermission(projectId, userId);

        // Find the invite
        const [invite] = await db
            .select()
            .from(projectInvites)
            .where(
                and(
                    eq(projectInvites.id, inviteId),
                    eq(projectInvites.projectId, projectId)
                )
            )
            .limit(1);

        if (!invite) {
            throw new NotFoundException('Invite not found');
        }

        if (invite.status !== 'pending') {
            throw new BadRequestException('Can only resend pending invites');
        }

        // Update expiry date and generate new token
        const newExpiresAt = new Date();
        newExpiresAt.setDate(newExpiresAt.getDate() + 7);

        await db
            .update(projectInvites)
            .set({
                token: uuidv4(),
                expiresAt: newExpiresAt,
            })
            .where(eq(projectInvites.id, inviteId));

        // Get updated invite and project info
        const [updatedInvite] = await db
            .select()
            .from(projectInvites)
            .where(eq(projectInvites.id, inviteId))
            .limit(1);

        const project = await this.getProject(projectId);

        // Send notification again
        // await this.sendInviteNotification();

        return {
            success: true,
            message: 'Invite resent successfully',
        };
    }

    // Helper methods
    private async checkInvitePermission(projectId: number, userId: number) {
        const db = this.drizzle.db;

        const [member] = await db
            .select()
            .from(projectMembers)
            .where(
                and(
                    eq(projectMembers.projectId, projectId),
                    eq(projectMembers.userId, userId)
                )
            )
            .limit(1);

        if (!member || !['owner', 'admin'].includes(member.role)) {
            throw new ForbiddenException('Only project owners and admins can manage invites');
        }
    }

    private async getProject(projectId: number) {
        const db = this.drizzle.db;

        const [project] = await db
            .select()
            .from(projects)
            .where(eq(projects.id, projectId))
            .limit(1);

        if (!project) {
            throw new NotFoundException('Project not found');
        }

        return project;
    }

    private async getUserByEmail(email: string) {
        const db = this.drizzle.db;

        const [user] = await db
            .select()
            .from(users)
            .where(eq(users.email, email))
            .limit(1);

        return user;
    }

    private async getUserIdByEmail(email: string): Promise<number> {
        const user = await this.getUserByEmail(email);
        if (!user) {
            throw new NotFoundException(`User with email ${email} not found`);
        }
        return user.id;
    }

    private async sendInviteNotification(data) {
        try {
            // Here you would integrate with your notification service
            // This could be email, push notification, etc.
            await this.notificationService.sendProjectInviteEmail(data);
        } catch (error) {
            // Log error but don't fail the invite creation
            console.error('Failed to send invite notification:', error);
        }
    }
}

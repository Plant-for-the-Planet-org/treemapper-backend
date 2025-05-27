// src/projects/projects.service.ts
import { Injectable, NotFoundException, ForbiddenException, ConflictException, BadRequestException, UnauthorizedException } from '@nestjs/common';
import { DrizzleService } from '../database/drizzle.service';
import { projects, projectMembers, users, projectInvites } from '../database/schema';
import { CreateProjectDto } from './dto/create-project.dto';
import { UpdateProjectDto } from './dto/update-project.dto';
import { AddProjectMemberDto } from './dto/add-project-member.dto';
import { UpdateProjectRoleDto } from './dto/update-project-role.dto';
import { eq, and, desc } from 'drizzle-orm';
import { sql } from 'drizzle-orm';
import { NotificationService } from '../notification/notification.service';
import { v4 as uuidv4 } from 'uuid';


export interface ProjectMemberResponse {
  id: number;
  userId: number;
  role: string;
  joinedAt: Date | null;
  invitedAt: Date | null;
  user: {
    id: number;
    name: string | null;
    email: string;
    displayName: string | null;
    avatar: string | null;
    isActive: boolean;
  };
}

export interface ProjectInviteResponse {
  id: number;
  email: string;
  role: string;
  status: string;
  message: string | null;
  expiresAt: Date;
  acceptedAt: Date | null;
  createdAt: Date;
  invitedBy: {
    id: number;
    name: string | null;
    email: string;
    displayName: string | null;
  };
}

export interface ProjectInviteStatusResponse {
  id: number;
  email: string;
  role: string;
  message: string | null;
  status: string;
  expiresAt: Date;
  createdAt: Date;
  isExpired: boolean;
  project: {
    id: number;
    name: string;
    description: string | null;
    slug: string;
    country: string | null;
    image: string | null;
  };
  invitedBy: {
    id: number;
    name: string | null;
    email: string;
    displayName: string | null;
    avatar: string | null;
  };
}

export interface ProjectMembersAndInvitesResponse {
  members: ProjectMemberResponse[];
  invitations: ProjectInviteResponse[];
}

@Injectable()
export class ProjectsService {
  constructor(
    private drizzleService: DrizzleService,
    private notificationService: NotificationService,
  ) { }

  private getGeoJSONForPostGIS(locationInput: any): any {
    if (!locationInput) {
      return null;
    }

    // If it's a Feature, extract the geometry
    if (locationInput.type === 'Feature' && locationInput.geometry) {
      return locationInput.geometry;
    }

    // If it's a FeatureCollection, extract the first geometry
    if (locationInput.type === 'FeatureCollection' &&
      locationInput.features &&
      locationInput.features.length > 0 &&
      locationInput.features[0].geometry) {
      return locationInput.features[0].geometry;
    }

    // If it's already a geometry object, use it directly
    if (['Point', 'LineString', 'Polygon', 'MultiPoint', 'MultiLineString', 'MultiPolygon', 'GeometryCollection'].includes(locationInput.type)) {
      return locationInput;
    }

    throw new BadRequestException('Invalid GeoJSON format');
  }

  private generateSlug(projectName: string): string {
    return projectName
      .toLowerCase()
      .replace(/[^a-z0-9\s-]/g, '') // Remove special chars
      .replace(/\s+/g, '-')         // Replace spaces with hyphens
      .replace(/-+/g, '-')          // Replace multiple hyphens with single
      .trim()
      .substring(0, 255); // Ensure it fits in varchar(255)
  }

  async create(createProjectDto: CreateProjectDto, userId: number) {
    try {
      let locationValue: any = null;
      if (createProjectDto.location) {
        try {
          const geometry = this.getGeoJSONForPostGIS(createProjectDto.location);
          // Use SQL raw to convert GeoJSON to PostGIS geometry
          locationValue = sql`ST_SetSRID(ST_GeomFromGeoJSON(${JSON.stringify(geometry)}), 4326)`;
        } catch (error) {
          return {
            message: 'Invalid GeoJSON provided',
            statusCode: 400,
            error: "invalid_geojson",
            data: null,
            code: 'invalid_project_geojson',
          };
        }
      }

      // Generate slug if not provided
      const slug = createProjectDto.slug || this.generateSlug(createProjectDto.projectName);

      // Check if slug is unique
      const existingProject = await this.drizzleService.db
        .select({ id: projects.id })
        .from(projects)
        .where(eq(projects.slug, slug))
        .limit(1);

      if (existingProject.length > 0) {
        // Generate unique slug by appending timestamp
        const uniqueSlug = `${slug}-${Date.now()}`;
        createProjectDto.slug = uniqueSlug;
      } else {
        createProjectDto.slug = slug;
      }

      // Use transaction to ensure data consistency
      const result = await this.drizzleService.db.transaction(async (tx) => {
        // Create project with updated schema fields
        const [project] = await tx
          .insert(projects)
          .values({
            // Only include fields that exist in your Drizzle schema for 'projects'
            guid: createProjectDto.guid ?? uuidv4(),
            discr: createProjectDto.discr ?? 'base',
            createdById: userId,
            slug: createProjectDto.slug ?? this.generateSlug(createProjectDto.projectName),
            purpose: createProjectDto.purpose ?? '',
            projectName: createProjectDto.projectName ?? '',
            projectType: createProjectDto.projectType ?? '',
            ecosystem: createProjectDto.ecosystem ?? '',
            projectScale: createProjectDto.projectScale ?? '',
            projectWebsite: createProjectDto.projectWebsite ?? '',
            description: createProjectDto.description ?? '',
            classification: createProjectDto.classification ?? '',
            image: createProjectDto.image ?? '',
            videoUrl: createProjectDto.videoUrl ?? '',
            country: createProjectDto.country ?? '',
            location: locationValue,
            originalGeometry: createProjectDto.originalGeometry ?? null,
            geoLatitude: typeof createProjectDto.geoLatitude === 'number' ? createProjectDto.geoLatitude : null,
            geoLongitude: typeof createProjectDto.geoLongitude === 'number' ? createProjectDto.geoLongitude : null,
            url: createProjectDto.url ?? '',
            linkText: createProjectDto.linkText ?? '',
            isActive: typeof createProjectDto.isActive === 'boolean' ? createProjectDto.isActive : true,
            isPublic: typeof createProjectDto.isPublic === 'boolean' ? createProjectDto.isPublic : true,
            intensity: createProjectDto.intensity ?? '',
            revisionPeriodicityLevel: createProjectDto.revisionPeriodicityLevel ?? '',
            metadata: createProjectDto.metadata ?? {},
          })
          .returning();

        // Add creator as project owner
        await tx
          .insert(projectMembers)
          .values({
            projectId: project.id,
            userId: userId,
            role: 'owner',
            joinedAt: new Date(),
          });

        return project;
      });

      return {
        message: 'Project created successfully',
        statusCode: 201,
        error: null,
        data: result,
        code: 'project_created',
      };
    } catch (error) {
      console.error('Error creating project:', error);
      return {
        message: 'Failed to create project',
        statusCode: 500,
        error: error.message || "internal_server_error",
        data: null,
        code: 'project_creation_failed',
      };
    }
  }

  async findAll(userId: number) {
    try {
      const result = await this.drizzleService.db
        .select({
          project: {
            id: projects.id,
            guid: projects.guid,
            slug: projects.slug,
            projectName: projects.projectName,
            projectType: projects.projectType,
            ecosystem: projects.ecosystem,
            projectScale: projects.projectScale,
            target: projects.target,
            description: projects.description,
            image: projects.image,
            country: projects.country,
            isActive: projects.isActive,
            isPublic: projects.isPublic,
            createdAt: projects.createdAt,
            updatedAt: projects.updatedAt,
            // Convert PostGIS location to GeoJSON
            location: sql`ST_AsGeoJSON(${projects.location})::json`.as('location')
          },
          role: projectMembers.role,
        })
        .from(projectMembers)
        .innerJoin(projects, eq(projectMembers.projectId, projects.id))
        .where(eq(projectMembers.userId, userId));

      return {
        message: 'User projects fetched successfully',
        statusCode: 200,
        error: null,
        data: result.map(({ project, role }) => ({
          ...project,
          userRole: role,
        })),
        code: 'user_projects_fetched',
      };
    } catch (error) {
      console.error('Error fetching user projects:', error);
      return {
        message: 'Failed to fetch user projects',
        statusCode: 500,
        error: error.message || "internal_server_error",
        data: null,
        code: 'user_projects_fetch_failed',
      };
    }
  }

  async findOne(projectId: number) {
    try {
      const projectQuery = await this.drizzleService.db
        .select({
          id: projects.id,
          guid: projects.guid,
          slug: projects.slug,
          projectName: projects.projectName,
          projectType: projects.projectType,
          ecosystem: projects.ecosystem,
          projectScale: projects.projectScale,
          target: projects.target,
          projectWebsite: projects.projectWebsite,
          description: projects.description,
          classification: projects.classification,
          image: projects.image,
          videoUrl: projects.videoUrl,
          country: projects.country,
          originalGeometry: projects.originalGeometry,
          geoLatitude: projects.geoLatitude,
          geoLongitude: projects.geoLongitude,
          url: projects.url,
          linkText: projects.linkText,
          isActive: projects.isActive,
          isPublic: projects.isPublic,
          intensity: projects.intensity,
          revisionPeriodicityLevel: projects.revisionPeriodicityLevel,
          metadata: projects.metadata,
          createdById: projects.createdById,
          discr: projects.discr,
          createdAt: projects.createdAt,
          updatedAt: projects.updatedAt,
          deletedAt: projects.deletedAt,
          // Convert PostGIS location to GeoJSON
          location: sql`ST_AsGeoJSON(${projects.location})::json`.as('location')
        })
        .from(projects)
        .where(eq(projects.id, projectId));

      if (projectQuery.length === 0) {
        return {
          message: 'Project not found',
          statusCode: 404,
          error: "not_found",
          data: null,
          code: 'project_not_found',
        };
      }

      return {
        message: 'Project details fetched successfully',
        statusCode: 200,
        error: null,
        data: projectQuery[0],
        code: 'project_details_fetched',
      };
    } catch (error) {
      console.error('Error fetching project details:', error);
      return {
        message: 'Failed to fetch project details',
        statusCode: 500,
        error: error.message || "internal_server_error",
        data: null,
        code: 'project_details_fetch_failed',
      };
    }
  }

  async update(projectId: number, updateProjectDto: UpdateProjectDto, userId: number) {
    try {
      // Check if user has permission (only owner/admin can update project details)
      const membership = await this.getMemberRole(projectId, userId);

      if (!membership || !['owner', 'admin'].includes(membership.role)) {
        return {
          message: 'You do not have permission to update this project',
          statusCode: 403,
          error: "forbidden",
          data: null,
          code: 'update_permission_denied',
        };
      }

      let locationValue: any = undefined;
      if (updateProjectDto.location) {
        try {
          const geometry = this.getGeoJSONForPostGIS(updateProjectDto.location);
          locationValue = sql`ST_SetSRID(ST_GeomFromGeoJSON(${JSON.stringify(geometry)}), 4326)`;
        } catch (error) {
          return {
            message: 'Invalid GeoJSON provided',
            statusCode: 400,
            error: "invalid_geojson",
            data: null,
            code: 'invalid_update_geojson',
          };
        }
      }

      // Prepare update data
      const updateData: any = {
        ...updateProjectDto,
        updatedAt: new Date(),
      };

      if (locationValue !== undefined) {
        updateData.location = locationValue;
      }

      // Remove undefined values
      Object.keys(updateData).forEach(key =>
        updateData[key] === undefined && delete updateData[key]
      );

      // Update project
      const [result] = await this.drizzleService.db
        .update(projects)
        .set(updateData)
        .where(eq(projects.id, projectId))
        .returning();

      return {
        message: 'Project updated successfully',
        statusCode: 200,
        error: null,
        data: result,
        code: 'project_updated',
      };
    } catch (error) {
      console.error('Error updating project:', error);
      return {
        message: 'Failed to update project',
        statusCode: 500,
        error: error.message || "internal_server_error",
        data: null,
        code: 'project_update_failed',
      };
    }
  }

  async remove(projectId: number, userId: number) {
    try {
      // Only owner can delete a project
      const membership = await this.getMemberRole(projectId, userId);

      if (!membership || membership.role !== 'owner') {
        return {
          message: 'Only the project owner can delete the project',
          statusCode: 403,
          error: "forbidden",
          data: null,
          code: 'delete_permission_denied',
        };
      }

      // Soft delete the project
      await this.drizzleService.db
        .update(projects)
        .set({
          deletedAt: new Date(),
          isActive: false
        })
        .where(eq(projects.id, projectId));

      return {
        message: 'Project deleted successfully',
        statusCode: 200,
        error: null,
        data: { success: true },
        code: 'project_deleted',
      };
    } catch (error) {
      console.error('Error deleting project:', error);
      return {
        message: 'Failed to delete project',
        statusCode: 500,
        error: error.message || "internal_server_error",
        data: null,
        code: 'project_delete_failed',
      };
    }
  }

  async getMembers(projectId: number) {
    try {
      const result = await this.drizzleService.db
        .select({
          id: users.id,
          guid: users.guid,
          name: users.name,
          email: users.email,
          avatar: users.avatar,
          role: projectMembers.role,
          joinedAt: projectMembers.joinedAt,
          invitedAt: projectMembers.invitedAt,
        })
        .from(projectMembers)
        .innerJoin(users, eq(projectMembers.userId, users.id))
        .where(eq(projectMembers.projectId, projectId));

      return {
        message: 'Project members fetched successfully',
        statusCode: 200,
        error: null,
        data: result,
        code: 'project_members_fetched',
      };
    } catch (error) {
      console.error('Error fetching project members:', error);
      return {
        message: 'Failed to fetch project members',
        statusCode: 500,
        error: error.message || "internal_server_error",
        data: null,
        code: 'project_members_fetch_failed',
      };
    }
  }

  async addMember(projectId: number, addMemberDto: AddProjectMemberDto, currentUserId: number) {
    try {
      // Only owner/admin can add members
      const membership = await this.getMemberRole(projectId, currentUserId);

      if (!membership || !['owner', 'admin'].includes(membership.role)) {
        return {
          message: 'You do not have permission to add members to this project',
          statusCode: 403,
          error: "forbidden",
          data: null,
          code: 'add_member_permission_denied',
        };
      }

      // Check if project exists
      const projectQuery = await this.drizzleService.db
        .select({ id: projects.id })
        .from(projects)
        .where(eq(projects.id, projectId));

      if (projectQuery.length === 0) {
        return {
          message: 'Project not found',
          statusCode: 404,
          error: "not_found",
          data: null,
          code: 'project_not_found',
        };
      }

      // Find user by email
      const userQuery = await this.drizzleService.db
        .select()
        .from(users)
        .where(eq(users.email, addMemberDto.email));

      if (userQuery.length === 0) {
        return {
          message: 'User not found',
          statusCode: 404,
          error: "not_found",
          data: null,
          code: 'user_not_found',
        };
      }

      const userToAdd = userQuery[0];

      // Check if user is already a member
      const existingMemberQuery = await this.drizzleService.db
        .select()
        .from(projectMembers)
        .where(
          and(
            eq(projectMembers.projectId, projectId),
            eq(projectMembers.userId, userToAdd.id)
          )
        );

      if (existingMemberQuery.length > 0) {
        return {
          message: 'User is already a member of this project',
          statusCode: 409,
          error: "conflict",
          data: null,
          code: 'user_already_member',
        };
      }

      // Add member
      const [result] = await this.drizzleService.db
        .insert(projectMembers)
        .values({
          projectId: projectId,
          userId: userToAdd.id,
          role: addMemberDto.role,
          joinedAt: new Date(),
        })
        .returning();

      return {
        message: 'Member added successfully',
        statusCode: 201,
        error: null,
        data: {
          ...userToAdd,
          role: result.role,
          joinedAt: result.joinedAt,
        },
        code: 'member_added',
      };
    } catch (error) {
      console.error('Error adding member:', error);
      return {
        message: 'Failed to add member',
        statusCode: 500,
        error: error.message || "internal_server_error",
        data: null,
        code: 'add_member_failed',
      };
    }
  }

  async updateMemberRole(
    projectId: number,
    memberId: number,
    updateRoleDto: UpdateProjectRoleDto,
    currentUserId: number
  ) {
    try {
      // Only owner/admin can update roles
      const membership = await this.getMemberRole(projectId, currentUserId);

      if (!membership || !['owner', 'admin'].includes(membership.role)) {
        return {
          message: 'You do not have permission to update member roles',
          statusCode: 403,
          error: "forbidden",
          data: null,
          code: 'update_role_permission_denied',
        };
      }

      // Find the member to update
      const memberQuery = await this.drizzleService.db
        .select({
          member: projectMembers,
          user: users,
        })
        .from(projectMembers)
        .innerJoin(users, eq(projectMembers.userId, users.id))
        .where(
          and(
            eq(projectMembers.projectId, projectId),
            eq(projectMembers.userId, memberId)
          )
        );

      if (memberQuery.length === 0) {
        return {
          message: 'Member not found in this project',
          statusCode: 404,
          error: "not_found",
          data: null,
          code: 'member_not_found',
        };
      }

      const memberToUpdate = memberQuery[0];

      // Cannot change owner's role
      if (memberToUpdate.member.role === 'owner') {
        return {
          message: 'Cannot change the role of the project owner',
          statusCode: 403,
          error: "forbidden",
          data: null,
          code: 'cannot_change_owner_role',
        };
      }

      // Admin cannot change another admin's role (only owner can)
      if (membership.role === 'admin' && memberToUpdate.member.role === 'admin') {
        return {
          message: 'Admin cannot change another admin\'s role',
          statusCode: 403,
          error: "forbidden",
          data: null,
          code: 'admin_cannot_change_admin_role',
        };
      }

      // Update role
      const [result] = await this.drizzleService.db
        .update(projectMembers)
        .set({
          role: updateRoleDto.role,
          updatedAt: new Date(),
        })
        .where(
          and(
            eq(projectMembers.projectId, projectId),
            eq(projectMembers.userId, memberId)
          )
        )
        .returning();

      return {
        message: 'Member role updated successfully',
        statusCode: 200,
        error: null,
        data: {
          userId: memberId,
          name: memberToUpdate.user.name,
          email: memberToUpdate.user.email,
          role: result.role,
        },
        code: 'member_role_updated',
      };
    } catch (error) {
      console.error('Error updating member role:', error);
      return {
        message: 'Failed to update member role',
        statusCode: 500,
        error: error.message || "internal_server_error",
        data: null,
        code: 'update_member_role_failed',
      };
    }
  }

  async removeMember(projectId: number, memberId: number, currentUserId: number) {
    try {
      // Only owner/admin can remove members
      const membership = await this.getMemberRole(projectId, currentUserId);

      if (!membership || !['owner', 'admin'].includes(membership.role)) {
        return {
          message: 'You do not have permission to remove members',
          statusCode: 403,
          error: "forbidden",
          data: null,
          code: 'remove_member_permission_denied',
        };
      }

      // Find the member to remove
      const memberQuery = await this.drizzleService.db
        .select()
        .from(projectMembers)
        .where(
          and(
            eq(projectMembers.projectId, projectId),
            eq(projectMembers.userId, memberId)
          )
        );

      if (memberQuery.length === 0) {
        return {
          message: 'Member not found in this project',
          statusCode: 404,
          error: "not_found",
          data: null,
          code: 'member_not_found',
        };
      }

      const memberToRemove = memberQuery[0];

      // Cannot remove the owner
      if (memberToRemove.role === 'owner') {
        return {
          message: 'Cannot remove the project owner',
          statusCode: 403,
          error: "forbidden",
          data: null,
          code: 'cannot_remove_owner',
        };
      }

      // Admin cannot remove another admin (only owner can)
      if (membership.role === 'admin' && memberToRemove.role === 'admin') {
        return {
          message: 'Admin cannot remove another admin',
          statusCode: 403,
          error: "forbidden",
          data: null,
          code: 'admin_cannot_remove_admin',
        };
      }

      // Remove member
      await this.drizzleService.db
        .delete(projectMembers)
        .where(
          and(
            eq(projectMembers.projectId, projectId),
            eq(projectMembers.userId, memberId)
          )
        );

      return {
        message: 'Member removed successfully',
        statusCode: 200,
        error: null,
        data: { success: true },
        code: 'member_removed',
      };
    } catch (error) {
      console.error('Error removing member:', error);
      return {
        message: 'Failed to remove member',
        statusCode: 500,
        error: error.message || "internal_server_error",
        data: null,
        code: 'remove_member_failed',
      };
    }
  }

  async inviteMember(projectId: string, email: string, role: string, currentUserId: number, inviterName: string, message?: string) {
    try {

      const project = await this.drizzleService.db
        .select()
        .from(projects)
        .where(eq(projects.guid, projectId))
        .then(results => {
          if (results.length === 0) throw new NotFoundException('Project not found');
          return results[0];
        });


      // Only owner/admin can invite members
      const membership = await this.getMemberRole(project.id, currentUserId);

      if (!membership || !['owner', 'admin'].includes(membership.role)) {
        return {
          message: 'You do not have permission to invite members',
          statusCode: 403,
          error: "forbidden",
          data: null,
          code: 'invite_permission_denied',
        };
      }


      // Check if user already exists by email
      const existingUser = await this.drizzleService.db
        .select()
        .from(users)
        .where(eq(users.email, email))
        .then(results => results[0] || null);

      if (existingUser) {
        const existingMembership = await this.drizzleService.db
          .select()
          .from(projectMembers)
          .where(
            and(
              eq(projectMembers.projectId, project.id),
              eq(projectMembers.userId, existingUser.id)
            )
          )
          .then(results => results[0] || null);

        if (existingMembership) {
          return {
            message: 'User is already a member of this project',
            statusCode: 409,
            error: "conflict",
            data: null,
            code: 'user_already_member',
          };
        }
      }

      // Check for existing pending invitation
      const existingInvite = await this.drizzleService.db
        .select()
        .from(projectInvites)
        .where(
          and(
            eq(projectInvites.projectId, project.id),
            eq(projectInvites.email, email),
            eq(projectInvites.status, 'pending')
          )
        )
        .then(results => results[0] || null);

      if (existingInvite) {
        return {
          message: 'An invite has already been sent to this email',
          statusCode: 409,
          error: "conflict",
          data: null,
          code: 'invite_already_sent',
        };
      }

      // Create invitation
      const expiryDate = new Date();
      expiryDate.setDate(expiryDate.getDate() + 7); // 7 days expiry

      const [invitation] = await this.drizzleService.db
        .insert(projectInvites)
        .values({
          projectId: project.id,
          email,
          role: role as 'admin' | 'manager' | 'contributor' | 'observer' | 'researcher',
          invitedById: currentUserId,
          expiresAt: expiryDate,
          message: message || '',
          token: uuidv4(),
        })
        .returning();

      // Send invitation email
      await this.notificationService.sendProjectInviteEmail({
        email,
        projectName: project.projectName,
        role,
        inviterName: inviterName,
        token: invitation.token,
        expiresAt: expiryDate,
      });

      return {
        message: 'Invitation sent successfully',
        statusCode: 201,
        error: null,
        data: invitation,
        code: 'invitation_sent',
      };
    } catch (error) {
      console.error('Error sending invitation:', error);
      return {
        message: 'Failed to send invitation',
        statusCode: 500,
        error: error.message || "internal_server_error",
        data: null,
        code: 'invitation_send_failed',
      };
    }
  }

  async getMemberRole(projectId: number, userId: number): Promise<{ role: string } | null> {
    try {
      const membershipQuery = await this.drizzleService.db
        .select({ role: projectMembers.role })
        .from(projectMembers)
        .where(
          and(
            eq(projectMembers.projectId, projectId),
            eq(projectMembers.userId, userId)
          )
        )
        .limit(1);

      return membershipQuery.length > 0 ? membershipQuery[0] : null;
    } catch (error) {
      console.error('Error fetching member role:', error);
      return null;
    }
  }

  async getMemberRoleFromGuid(projectId: string, userId: number): Promise<{ role: string } | null> {
    try {
      const project = await this.drizzleService.db
        .select()
        .from(projects)
        .where(eq(projects.guid, projectId))
        .then(results => {
          if (results.length === 0) throw new NotFoundException('Project not found');
          return results[0];
        });

      const membershipQuery = await this.drizzleService.db
        .select({ role: projectMembers.role })
        .from(projectMembers)
        .where(
          and(
            eq(projectMembers.projectId, project.id),
            eq(projectMembers.userId, userId)
          )
        )
        .limit(1);

      return membershipQuery.length > 0 ? membershipQuery[0] : null;
    } catch (error) {
      console.error('Error fetching member role:', error);
      return null;
    }
  }

  async acceptInvite(token: string, userId: number, email: string) {
    try {
      // Find the invitation
      const invite = await this.drizzleService.db
        .select({
          invite: projectInvites,
          project: projects,
          inviter: users,
        })
        .from(projectInvites)
        .innerJoin(projects, eq(projectInvites.projectId, projects.id))
        .innerJoin(users, eq(projectInvites.invitedById, users.id))
        .where(
          and(
            eq(projectInvites.token, token),
            eq(projectInvites.email, email),
            eq(projectInvites.status, 'pending'),
          )
        )
        .then(results => results[0] || null);

      if (!invite) {
        return {
          message: 'Invitation not found or already processed',
          statusCode: 404,
          error: "not_found",
          data: null,
          code: 'invitation_not_found',
        };
      }

      if (new Date(invite.invite.expiresAt) < new Date()) {
        return {
          message: 'Invitation has expired',
          statusCode: 400,
          error: "expired",
          data: null,
          code: 'invitation_expired',
        };
      }

      // Get the accepting user
      const [user] = await this.drizzleService.db
        .select()
        .from(users)
        .where(eq(users.id, userId));

      if (!user) {
        return {
          message: 'User not found',
          statusCode: 404,
          error: "not_found",
          data: null,
          code: 'user_not_found',
        };
      }

      // Check if already a member
      const existingMember = await this.drizzleService.db
        .select()
        .from(projectMembers)
        .where(
          and(
            eq(projectMembers.projectId, invite.invite.projectId),
            eq(projectMembers.userId, user.id),
          )
        )
        .then(results => results[0] || null);

      if (existingMember) {
        return {
          message: 'You are already a member of this project',
          statusCode: 409,
          error: "conflict",
          data: null,
          code: 'already_member',
        };
      }

      // Use a transaction to ensure data consistency
      const result = await this.drizzleService.db.transaction(async (tx) => {
        // Update invite status
        await tx
          .update(projectInvites)
          .set({
            status: 'accepted',
            acceptedAt: new Date(),
            updatedAt: new Date()
          })
          .where(eq(projectInvites.id, invite.invite.id));

        // Add user as project member
        const [membership] = await tx
          .insert(projectMembers)
          .values({
            projectId: invite.invite.projectId,
            userId: user.id,
            role: invite.invite.role,
            joinedAt: new Date(),
          })
          .returning();

        return membership;
      });

      // // Send notifications
      // await this.notificationService.sendInviteAcceptedEmail({
      //   inviterEmail: invite.inviter.email,
      //   inviterName: invite.inviter.name || invite.inviter.authName || '',
      //   memberName: user.name || user.authName || user.email,
      //   memberEmail: user.email,
      //   projectName: invite.project.projectName,
      //   projectId: invite.project.id,
      // });

      // await this.notificationService.sendNewMemberWelcomeEmail({
      //   email: user.email,
      //   name: user.name || user.authName || 'there',
      //   projectName: invite.project.projectName,
      //   projectId: invite.project.id,
      // });

      return {
        message: `You have successfully joined ${invite.project.projectName}`,
        statusCode: 200,
        error: null,
        data: {
          projectId: invite.project.id,
          role: result.role,
        },
        code: 'invite_accepted',
      };
    } catch (error) {
      console.error('Error accepting invite:', error);
      return {
        message: 'Failed to accept invitation',
        statusCode: 500,
        error: error.message || "internal_server_error",
        data: null,
        code: 'accept_invite_failed',
      };
    }
  }

  async declineInvite(token: string, email: string) {
    try {
      // Find the invitation
      const invite = await this.drizzleService.db
        .select({
          invite: projectInvites,
          project: projects,
          inviter: users,
        })
        .from(projectInvites)
        .innerJoin(projects, eq(projectInvites.projectId, projects.id))
        .innerJoin(users, eq(projectInvites.invitedById, users.id))
        .where(
          and(
            eq(projectInvites.token, token),
            eq(projectInvites.email, email),
            eq(projectInvites.status, 'pending'),
          )
        )
        .then(results => results[0] || null);

      if (!invite) {
        return {
          message: 'Invitation not found or already processed',
          statusCode: 404,
          error: "not_found",
          data: null,
          code: 'invitation_not_found',
        };
      }

      // Update invite status
      await this.drizzleService.db
        .update(projectInvites)
        .set({
          status: 'declined',
          updatedAt: new Date()
        })
        .where(eq(projectInvites.id, invite.invite.id));

      // // Send notification
      // await this.notificationService.sendInviteDeclinedEmail({
      //   inviterEmail: invite.inviter.email,
      //   inviterName: invite.inviter.name || invite.inviter.authName || '',
      //   memberEmail: invite.invite.email,
      //   projectName: invite.project.projectName,
      // });

      return {
        message: `You have declined the invitation to join ${invite.project.projectName}`,
        statusCode: 200,
        error: null,
        data: null,
        code: 'invite_declined',
      };
    } catch (error) {
      console.error('Error declining invite:', error);
      return {
        message: 'Failed to decline invitation',
        statusCode: 500,
        error: error.message || "internal_server_error",
        data: null,
        code: 'decline_invite_failed',
      };
    }
  }

  // Get project invites (pending invitations)
  async getProjectInvites(projectId: number, currentUserId: number) {
    try {
      // Only owner/admin can view invites
      const membership = await this.getMemberRole(projectId, currentUserId);

      if (!membership || !['owner', 'admin'].includes(membership.role)) {
        return {
          message: 'You do not have permission to view invitations',
          statusCode: 403,
          error: "forbidden",
          data: null,
          code: 'view_invites_permission_denied',
        };
      }

      const invites = await this.drizzleService.db
        .select({
          id: projectInvites.id,
          email: projectInvites.email,
          role: projectInvites.role,
          message: projectInvites.message,
          status: projectInvites.status,
          expiresAt: projectInvites.expiresAt,
          createdAt: projectInvites.createdAt,
          inviterName: users.name,
        })
        .from(projectInvites)
        .innerJoin(users, eq(projectInvites.invitedById, users.id))
        .where(eq(projectInvites.projectId, projectId));

      return {
        message: 'Project invitations fetched successfully',
        statusCode: 200,
        error: null,
        data: invites,
        code: 'project_invites_fetched',
      };
    } catch (error) {
      console.error('Error fetching project invites:', error);
      return {
        message: 'Failed to fetch project invitations',
        statusCode: 500,
        error: error.message || "internal_server_error",
        data: null,
        code: 'project_invites_fetch_failed',
      };
    }
  }

  async getProjectInviteStatus(token: string, email: string): Promise<ProjectInviteStatusResponse> {
    try {
      // Get invite details with project and inviter information
      const inviteResult = await this.drizzleService.db
        .select({
          invite: {
            id: projectInvites.id,
            email: projectInvites.email,
            role: projectInvites.role,
            message: projectInvites.message,
            status: projectInvites.status,
            expiresAt: projectInvites.expiresAt,
            createdAt: projectInvites.createdAt,
            projectId: projectInvites.projectId,
          },
          project: {
            id: projects.id,
            name: projects.projectName,
            description: projects.description,
            slug: projects.slug,
            country: projects.country,
            image: projects.image,
          },
          invitedBy: {
            id: users.id,
            name: users.name,
            email: users.email,
            displayName: users.displayName,
            avatar: users.avatar,
          }
        })
        .from(projectInvites)
        .innerJoin(projects, eq(projectInvites.projectId, projects.id))
        .innerJoin(users, eq(projectInvites.invitedById, users.id))
        .where(eq(projectInvites.token, token))
        .limit(1);

      // Check if invite exists
      if (!inviteResult.length) {
        throw new NotFoundException('Invitation not found');
      }

      const result = inviteResult[0];

      // Verify email matches
      if (result.invite.email.toLowerCase() !== email.toLowerCase()) {
        throw new UnauthorizedException('Email does not match invitation');
      }

      // Check if invite is expired
      const now = new Date();
      const isExpired = result.invite.expiresAt < now;

      // Prepare and return response data
      return {
        id: result.invite.id,
        email: result.invite.email,
        role: result.invite.role,
        message: result.invite.message,
        status: result.invite.status,
        expiresAt: result.invite.expiresAt,
        createdAt: result.invite.createdAt,
        isExpired,
        project: {
          id: result.project.id,
          name: result.project.name,
          description: result.project.description,
          slug: result.project.slug,
          country: result.project.country,
          image: result.project.image,
        },
        invitedBy: {
          id: result.invitedBy.id,
          name: result.invitedBy.name,
          email: result.invitedBy.email,
          displayName: result.invitedBy.displayName,
          avatar: result.invitedBy.avatar,
        }
      };

    } catch (error) {
      if (error instanceof UnauthorizedException || error instanceof NotFoundException) {
        throw error;
      }

      console.error('Error fetching project invite status:', error);
      throw new Error('Failed to fetch invitation details');
    }
  }


  async getProjectMembersAndInvitations(projectId: string): Promise<ProjectMembersAndInvitesResponse> {
    // Verify project exists
    const project = await this.drizzleService.db
      .select()
      .from(projects)
      .where(eq(projects.guid, projectId))
      .limit(1)
      .then(results => {
        if (results.length === 0) throw new NotFoundException('Project not found');
        return results[0];
      });

    // Get all members with user details
    const members = await this.drizzleService.db
      .select({
        id: projectMembers.id,
        userId: projectMembers.userId,
        role: projectMembers.role,
        joinedAt: projectMembers.joinedAt,
        invitedAt: projectMembers.invitedAt,
        user: {
          id: users.id,
          name: users.name,
          email: users.email,
          displayName: users.displayName,
          avatar: users.avatar,
          isActive: users.isActive,
        }
      })
      .from(projectMembers)
      .innerJoin(users, eq(projectMembers.userId, users.id))
      .where(eq(projectMembers.projectId, project.id))
      .orderBy(desc(projectMembers.joinedAt));

    // Get all invitations with inviter details
    const invitations = await this.drizzleService.db
      .select({
        id: projectInvites.id,
        email: projectInvites.email,
        role: projectInvites.role,
        status: projectInvites.status,
        message: projectInvites.message,
        expiresAt: projectInvites.expiresAt,
        acceptedAt: projectInvites.acceptedAt,
        createdAt: projectInvites.createdAt,
        invitedBy: {
          id: users.id,
          name: users.name,
          email: users.email,
          displayName: users.displayName,
        }
      })
      .from(projectInvites)
      .innerJoin(users, eq(projectInvites.invitedById, users.id))
      .where(eq(projectInvites.projectId, project.id))
      .orderBy(desc(projectInvites.createdAt));

    // Calculate summary statistics
    return {
      members,
      invitations
    };
  }

  /**
   * Calculate summary statistics for members and invitations
   */
  private calculateSummary(
    members: ProjectMemberResponse[],
    invitations: ProjectInviteResponse[]
  ) {
    const now = new Date();

    // Count invitations by status
    const pendingInvitations = invitations.filter(inv => inv.status === 'pending').length;
    const acceptedInvitations = invitations.filter(inv => inv.status === 'accepted').length;
    const expiredInvitations = invitations.filter(inv =>
      inv.status === 'pending' && inv.expiresAt < now
    ).length;

    // Count members by role
    const roleDistribution: Record<string, number> = {};
    members.forEach(member => {
      roleDistribution[member.role] = (roleDistribution[member.role] || 0) + 1;
    });

    return {
      totalMembers: members.length,
      totalPendingInvitations: pendingInvitations,
      totalAcceptedInvitations: acceptedInvitations,
      totalExpiredInvitations: expiredInvitations,
      roleDistribution
    };
  }



}

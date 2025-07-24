// src/organizations/organizations.service.ts
import { Injectable, ConflictException, NotFoundException, BadRequestException } from '@nestjs/common';
import { eq, and, isNull, sql, count } from 'drizzle-orm';
import { NodePgDatabase } from 'drizzle-orm/node-postgres';
import { v4 as uuidv4 } from 'uuid';
import { CreateOrganizationDto } from './dto/create-organization.dto';
import { OrganizationResponseDto, SelectOrganizationDto, UserOrganizationResponseDto } from './dto/organization-response.dto';
import { organizations, organizationMembers, users, projects } from '../database/schema/index';
import { DrizzleService } from 'src/database/drizzle.service';
import { generateUid } from 'src/util/uidGenerator';
import { And } from 'typeorm';
import { UsersService } from 'src/users/users.service';
import { CacheService } from 'src/cache/cache.service';
import { CACHE_KEYS } from 'src/cache/cache-keys';

@Injectable()
export class OrganizationsService {
  constructor(
    private readonly drizzle: DrizzleService,
    private cacheService: CacheService,
  ) { }

  /**
   * Create a new organization
   */
  async create(createOrgDto: CreateOrganizationDto, userId: number): Promise<OrganizationResponseDto> {
    // Generate unique slug from organization name
    const slug = await this.generateUniqueSlug(createOrgDto.name);

    // Check if organization name already exists (globally unique)
    const existingOrg = await this.drizzle.db
      .select()
      .from(organizations)
      .where(
        and(
          eq(organizations.name, createOrgDto.name),
          isNull(organizations.deletedAt)
        )
      )
      .limit(1);

    if (existingOrg.length > 0) {
      throw new ConflictException('Organization with this name already exists');
    }

    const orgUid = `org_${uuidv4().replace(/-/g, '').substring(0, 20)}`;
    const memberUid = `orgmem_${uuidv4().replace(/-/g, '').substring(0, 16)}`;

    try {
      // Start transaction to create organization and add creator as owner
      const result = await this.drizzle.db.transaction(async (tx) => {
        // Create organization
        const orgInsertResult = await tx
          .insert(organizations)
          .values({
            uid: orgUid,
            name: createOrgDto.name,
            slug,
            description: createOrgDto.description,
            logo: createOrgDto.logo,
            primaryColor: createOrgDto.primaryColor,
            secondaryColor: createOrgDto.secondaryColor,
            email: createOrgDto.email,
            phone: createOrgDto.phone,
            website: createOrgDto.website,
            address: createOrgDto.address,
            country: createOrgDto.country,
            timezone: createOrgDto.timezone || 'UTC',
            createdById: userId,
          })
          .returning();

        const [newOrg] = Array.isArray(orgInsertResult) ? orgInsertResult : [];

        // Add creator as organization owner
        await tx
          .insert(organizationMembers)
          .values({
            uid: memberUid,
            organizationId: newOrg.id,
            userId: userId,
            role: 'owner',
            status: 'active',
            joinedAt: new Date(),
          });

        return newOrg;
      });

      // Return the created organization with counts
      return this.getOrganizationWithCounts(result.id);
    } catch (error) {
      if (error.code === '23505') { // PostgreSQL unique constraint violation
        throw new ConflictException('Organization with this name or slug already exists');
      }
      throw error;
    }
  }


  async selectOrg(createOrgDto: SelectOrganizationDto, userId: number, auth0Id: string): Promise<any> {
    try {
      const result = await this.drizzle.db.transaction(async (tx) => {
        let organizationId: number;

        if (createOrgDto.devMode) {
          organizationId = 3;
        } else if (createOrgDto.selectedOrg) {
          const orgResult = await tx
            .select({ id: organizations.id })
            .from(organizations)
            .where(eq(organizations.uid, createOrgDto.selectedOrg))
            .limit(1);

          if (orgResult.length === 0) {
            throw new NotFoundException(`Organization not found`);
          }
          organizationId = orgResult[0].id;
        } else {
          organizationId = 2;
        }

        // Batch operations
        const [userUpdate] = await Promise.allSettled([
          tx.update(users)
            .set({ primaryOrg: organizationId })
            .where(eq(users.id, userId)),

          tx.insert(organizationMembers)
            .values({
              uid: generateUid('orgm'),
              organizationId,
              userId,
              createdAt: new Date(),
            })
            .onConflictDoNothing({
              target: [organizationMembers.organizationId, organizationMembers.userId]
            })
        ]);
        await this.cacheService.delete(CACHE_KEYS.USER.BY_AUTH0_ID(auth0Id));
        return { organizationId, userUpdated: userUpdate.status === 'fulfilled' };
      });

      return { success: true, ...result };
    } catch (error) {
      if (error.code === '23505') { // PostgreSQL unique constraint violation
        throw new ConflictException('Organization with this name or slug already exists');
      }
      throw error;
    }
  }

  /**
   * Get all organizations that a user belongs to
   */
  async findAllByUser(userId: number): Promise<any[]> {
    const userOrganizations = await this.drizzle.db
      .select({
        uid: organizations.uid,
        name: organizations.name,
        slug: organizations.slug,
        description: organizations.description,
        logo: organizations.logo,
        primaryColor: organizations.primaryColor,
        secondaryColor: organizations.secondaryColor,
        email: organizations.email,
        phone: organizations.phone,
        website: organizations.website,
        address: organizations.address,
        country: organizations.country,
        timezone: organizations.timezone,
        isActive: organizations.isActive,
        createdAt: organizations.createdAt,
        updatedAt: organizations.updatedAt,
        deletedAt: organizations.deletedAt,
        // User's membership details
        userRole: organizationMembers.role,
        userStatus: organizationMembers.status,
        joinedAt: organizationMembers.joinedAt,
      })
      .from(organizationMembers)
      .innerJoin(organizations, eq(organizationMembers.organizationId, organizations.id))
      .where(and(
        eq(organizationMembers.userId, userId),
        eq(organizations.type, 'private'),
      ))
      .orderBy(organizations.name);



    return userOrganizations;
  }

  /**
   * Get organization by ID with member and project counts
   */
  async findById(orgId: number): Promise<OrganizationResponseDto> {
    return this.getOrganizationWithCounts(orgId);
  }

  /**
   * Get organization by UID with member and project counts
   */
  async findByUid(orgUid: string): Promise<OrganizationResponseDto> {
    const org = await this.drizzle.db
      .select()
      .from(organizations)
      .where(eq(organizations.uid, orgUid))
      .limit(1);

    if (org.length === 0) {
      throw new NotFoundException('Organization not found');
    }

    return this.getOrganizationWithCounts(org[0].id);
  }

  /**
   * Generate unique slug from organization name
   */
  private async generateUniqueSlug(name: string): Promise<string> {
    // Convert name to slug format (lowercase, replace spaces with hyphens, remove special chars)
    let baseSlug = name
      .toLowerCase()
      .trim()
      .replace(/[^\w\s-]/g, '') // Remove special characters
      .replace(/\s+/g, '-') // Replace spaces with hyphens
      .replace(/--+/g, '-') // Replace multiple hyphens with single
      .replace(/^-|-$/g, ''); // Remove leading/trailing hyphens

    if (!baseSlug) {
      throw new BadRequestException('Organization name must contain valid characters for slug generation');
    }

    let slug = baseSlug;
    let counter = 1;

    // Keep trying until we find a unique slug
    while (true) {
      const existing = await this.drizzle.db
        .select()
        .from(organizations)
        .where(
          and(
            eq(organizations.slug, slug),
            isNull(organizations.deletedAt)
          )
        )
        .limit(1);

      if (existing.length === 0) {
        return slug;
      }

      // If slug exists, append counter
      slug = `${baseSlug}-${counter}`;
      counter++;

      // Prevent infinite loop
      if (counter > 1000) {
        throw new ConflictException('Unable to generate unique slug for organization');
      }
    }
  }

  /**
   * Get organization with member and project counts
   */
  private async getOrganizationWithCounts(orgId: number): Promise<any> {
    const [org] = await this.drizzle.db
      .select()
      .from(organizations)
      .where(eq(organizations.id, orgId))
      .limit(1);

    if (!org) {
      throw new NotFoundException('Organization not found');
    }

    const counts = await this.getOrganizationCounts(orgId);

    return {
      ...org,
      ...counts,
    };
  }

  /**
   * Get member and project counts for an organization
   */
  private async getOrganizationCounts(orgId: number): Promise<{ memberCount: number; projectCount: number }> {
    // Get member count
    const [memberCountResult] = await this.drizzle.db
      .select({ count: count() })
      .from(organizationMembers)
      .where(eq(organizationMembers.organizationId, orgId));

    // Get project count (including soft-deleted projects in count as per your requirement)
    const [projectCountResult] = await this.drizzle.db
      .select({ count: count() })
      .from(projects)
      .where(eq(projects.organizationId, orgId));

    return {
      memberCount: memberCountResult.count || 0,
      projectCount: projectCountResult.count || 0,
    };
  }
}
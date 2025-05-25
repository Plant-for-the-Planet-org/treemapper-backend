import { Injectable, NotFoundException, ConflictException, BadRequestException } from '@nestjs/common';
import { DrizzleService } from '../database/drizzle.service';
import { users } from '../database/schema';
import { CreateUserDto } from './dto/create-user.dto';
import { CreateAuth0UserDto } from './dto/create-auth0-user.dto';
import { UpdateUserDto } from './dto/update-user.dto';
import { UserQueryDto } from './dto/user-query.dto';
import { UserResponseDto } from './dto/user-response.dto';
import { User, PublicUser } from './entities/user.entity';
import { eq, and, or, like, desc, asc, count, isNull } from 'drizzle-orm';
import { randomUUID } from 'crypto';

@Injectable()
export class UsersService {
  constructor(private drizzleService: DrizzleService) { }

  // ============================================================================
  // CREATE OPERATIONS
  // ============================================================================

  async create(createUserDto: CreateUserDto): Promise<User> {
    // Check if user with email already exists
    const existingUser = await this.findByEmail(createUserDto.email);
    if (existingUser) {
      throw new ConflictException('User with this email already exists');
    }

    // Check if auth0Id already exists
    if (createUserDto.auth0Id) {
      const existingAuth0User = await this.findByAuth0Id(createUserDto.auth0Id);
      if (existingAuth0User) {
        throw new ConflictException('User with this Auth0 ID already exists');
      }
    }

    const result = await this.drizzleService.db
      .insert(users)
      .values({
        ...createUserDto,
        guid: createUserDto.guid || randomUUID(),
        createdAt: new Date(),
        updatedAt: new Date(),
        lastLoginAt: new Date()
      })
      .returning();

    return result[0];
  }

  async createFromAuth0(userData: CreateAuth0UserDto): Promise<User> {
    // Check if user with this email already exists
    const existingUser = await this.findByEmail(userData.email);
    if (existingUser) {
      // If user exists but doesn't have auth0Id, update it
      // if (!existingUser.auth0Id) {
      //   return await this.updateByEmail(userData.email, {
      //     auth0Id: userData.auth0Id,
      //     lastLoginAt: new Date(),
      //   });
      // }

      // // Update last login
      // await this.updateLastLogin(existingUser.id);
      return existingUser;
    }

    // Create new user
    const result = await this.drizzleService.db
      .insert(users)
      .values({
        guid: randomUUID(),
        auth0Id: userData.auth0Id,
        email: userData.email,
        authName: userData.name || userData.email.split('@')[0],
        name: userData.name,
        isActive: true,
        lastLoginAt: new Date(),
        createdAt: new Date(),
        updatedAt: new Date(),
      })
      .returning();

    return result[0];
  }

  // ============================================================================
  // READ OPERATIONS
  // ============================================================================

  async findAll(query: UserQueryDto): Promise<{ users: PublicUser[]; total: number; page: number; limit: number }> {
    const {
      page = 1,
      limit = 10,
      search,
      type,
      country,
      isActive,
      isPrivate,
      sortBy,
      sortOrder,
    } = query;
    const offset = (page - 1) * limit;

    // Build WHERE conditions
    const conditions: any[] = [];

    conditions.push(isNull(users.deletedAt)); // Only active users

    if (search) {
      conditions.push(
        or(
          like(users.name, `%${search}%`),
          like(users.email, `%${search}%`),
          like(users.displayName, `%${search}%`)
        )
      );
    }

    if (type) conditions.push(eq(users.type, type));
    if (country) conditions.push(eq(users.country, country));
    if (isActive !== undefined) conditions.push(eq(users.isActive, isActive));
    if (isPrivate !== undefined) conditions.push(eq(users.isPrivate, isPrivate));

    const whereClause = conditions.length > 0 ? and(...conditions) : undefined;

    // Get total count
    const totalResult = await this.drizzleService.db
      .select({ count: count() })
      .from(users)
      .where(whereClause);

    const total = totalResult[0].count;

    // Get users with pagination
    const sortField = sortBy && users.hasOwnProperty(sortBy) ? users[sortBy] : users.createdAt;
    const orderBy = sortOrder === 'asc' ? asc(sortField) : desc(sortField);

    const result = await this.drizzleService.db
      .select({
        id: users.id,
        guid: users.guid,
        email: users.email,
        name: users.name,
        firstname: users.firstname,
        lastname: users.lastname,
        displayName: users.displayName,
        avatar: users.avatar,
        slug: users.slug,
        authName: users.authName,
        type: users.type,
        country: users.country,
        url: users.url,
        isPrivate: users.isPrivate,
        bio: users.bio,
        locale: users.locale,
        isActive: users.isActive,
        lastLoginAt: users.lastLoginAt,
        createdAt: users.createdAt,
        updatedAt: users.updatedAt,
      })
      .from(users)
      .where(whereClause)
      .orderBy(orderBy)
      .limit(limit)
      .offset(offset);

    return {
      users: result,
      total,
      page,
      limit,
    };
  }

  async findOne(id: number): Promise<PublicUser> {
    const result = await this.drizzleService.db
      .select({
        id: users.id,
        guid: users.guid,
        email: users.email,
        name: users.name,
        firstname: users.firstname,
        lastname: users.lastname,
        displayName: users.displayName,
        avatar: users.avatar,
        slug: users.slug,
        authName: users.authName,
        type: users.type,
        country: users.country,
        url: users.url,
        isPrivate: users.isPrivate,
        bio: users.bio,
        locale: users.locale,
        isActive: users.isActive,
        lastLoginAt: users.lastLoginAt,
        createdAt: users.createdAt,
        updatedAt: users.updatedAt,
      })
      .from(users)
      .where(and(eq(users.id, id), isNull(users.deletedAt)));

    if (result.length === 0) {
      throw new NotFoundException(`User with ID ${id} not found`);
    }

    return result[0];
  }

  async findByGuid(guid: string): Promise<PublicUser> {
    const result = await this.drizzleService.db
      .select({
        id: users.id,
        guid: users.guid,
        email: users.email,
        name: users.name,
        firstname: users.firstname,
        lastname: users.lastname,
        displayName: users.displayName,
        avatar: users.avatar,
        slug: users.slug,
        type: users.type,
        country: users.country,
        url: users.url,
        isPrivate: users.isPrivate,
        bio: users.bio,
        locale: users.locale,
        isActive: users.isActive,
        lastLoginAt: users.lastLoginAt,
        createdAt: users.createdAt,
        updatedAt: users.updatedAt,
        authName: users.authName,
      })
      .from(users)
      .where(and(eq(users.guid, guid), isNull(users.deletedAt)));

    if (result.length === 0) {
      throw new NotFoundException(`User with GUID ${guid} not found`);
    }

    return result[0];
  }

  async findByEmail(email: string): Promise<User | null> {
    const result = await this.drizzleService.db
      .select()
      .from(users)
      .where(and(eq(users.email, email), isNull(users.deletedAt)))
      .limit(1);

    return result[0] || null;
  }

  async findByAuth0Id(auth0Id: string): Promise<User | null> {
    const result = await this.drizzleService.db
      .select({
        id: users.id,
        guid: users.guid,
        auth0Id: users.auth0Id,
        email: users.email,
        authName: users.authName,
        name: users.name,
        firstname: users.firstname,
        lastname: users.lastname,
        displayName: users.displayName,
        avatar: users.avatar,
        slug: users.slug,
        type: users.type,
        country: users.country,
        url: users.url,
        isPrivate: users.isPrivate,
        bio: users.bio,
        locale: users.locale,
        isActive: users.isActive,
        lastLoginAt: users.lastLoginAt,
        createdAt: users.createdAt,
        updatedAt: users.updatedAt,
        deletedAt: users.deletedAt,
        supportPin: users.supportPin
      })
      .from(users)
      .where(and(eq(users.auth0Id, auth0Id), isNull(users.deletedAt)))
      .limit(1);

    return result[0] || null;
  }

  // ============================================================================
  // UPDATE OPERATIONS
  // ============================================================================

  async update(id: number, updateUserDto: UpdateUserDto): Promise<PublicUser> {
    // Check if user exists
    await this.findOne(id);
    const result = await this.drizzleService.db
      .update(users)
      .set({
        ...updateUserDto,
        updatedAt: new Date(),
      })
      .where(eq(users.id, id))
      .returning({
        id: users.id,
        guid: users.guid,
        email: users.email,
        name: users.name,
        firstname: users.firstname,
        lastname: users.lastname,
        displayName: users.displayName,
        avatar: users.avatar,
        slug: users.slug,
        authName: users.authName,
        type: users.type,
        country: users.country,
        url: users.url,
        isPrivate: users.isPrivate,
        bio: users.bio,
        locale: users.locale,
        isActive: users.isActive,
        lastLoginAt: users.lastLoginAt,
        createdAt: users.createdAt,
        updatedAt: users.updatedAt,
      });

    return result[0];
  }

  async updateByAuth0Id(auth0Id: string, updateData: Partial<UpdateUserDto>): Promise<User> {
    const result = await this.drizzleService.db
      .update(users)
      .set({
        ...updateData,
        updatedAt: new Date(),
      })
      .where(eq(users.auth0Id, auth0Id))
      .returning();

    if (result.length === 0) {
      throw new NotFoundException(`User with Auth0 ID ${auth0Id} not found`);
    }

    return result[0];
  }

  async updateByEmail(email: string, updateData: Partial<UpdateUserDto & { auth0Id?: string }>): Promise<User> {
    const result = await this.drizzleService.db
      .update(users)
      .set({
        ...updateData,
        updatedAt: new Date(),
      })
      .where(eq(users.email, email))
      .returning();

    if (result.length === 0) {
      throw new NotFoundException(`User with email ${email} not found`);
    }

    return result[0];
  }

  async updateLastLogin(id: number): Promise<void> {
    await this.drizzleService.db
      .update(users)
      .set({
        lastLoginAt: new Date(),
        updatedAt: new Date(),
      })
      .where(eq(users.id, id));
  }

  async deactivate(id: number): Promise<PublicUser> {
    return await this.update(id, { isActive: false });
  }

  async activate(id: number): Promise<PublicUser> {
    return await this.update(id, { isActive: true });
  }

  // ============================================================================
  // DELETE OPERATIONS
  // ============================================================================

  async remove(id: number): Promise<{ success: boolean; id: number }> {
    // Check if user exists
    await this.findOne(id);

    // Soft delete
    const result = await this.drizzleService.db
      .update(users)
      .set({
        deletedAt: new Date(),
        updatedAt: new Date(),
      })
      .where(eq(users.id, id))
      .returning({ id: users.id });

    return { success: true, id: result[0].id };
  }

  async hardDelete(id: number): Promise<{ success: boolean; id: number }> {
    const result = await this.drizzleService.db
      .delete(users)
      .where(eq(users.id, id))
      .returning({ id: users.id });

    if (result.length === 0) {
      throw new NotFoundException(`User with ID ${id} not found`);
    }

    return { success: true, id: result[0].id };
  }

  // ============================================================================
  // UTILITY METHODS
  // ============================================================================

  // async generateUniqueSlug(baseName: string): Promise<string> {
  //   const baseSlug = baseName.toLowerCase().replace(/[^a-z0-9]+/g, '-');
  //   let slug = baseSlug;
  //   let counter = 1;

  //   while (await this.findBySlug(slug)) {
  //     slug = `${baseSlug}-${counter}`;
  //     counter++;
  //   }

  //   return slug;
  // }

  async checkEmailExists(email: string): Promise<boolean> {
    const user = await this.findByEmail(email);
    return !!user;
  }

  async getUserStats(): Promise<{
    total: number;
    active: number;
    inactive: number;
    byType: Record<string, number>;
  }> {
    const [totalResult, activeResult, inactiveResult] = await Promise.all([
      this.drizzleService.db
        .select({ count: count() })
        .from(users)
        .where(isNull(users.deletedAt)),

      this.drizzleService.db
        .select({ count: count() })
        .from(users)
        .where(and(eq(users.isActive, true), isNull(users.deletedAt))),

      this.drizzleService.db
        .select({ count: count() })
        .from(users)
        .where(and(eq(users.isActive, false), isNull(users.deletedAt))),
    ]);

    // Get counts by type
    const typeResults = await this.drizzleService.db
      .select({
        type: users.type,
        count: count(),
      })
      .from(users)
      .where(isNull(users.deletedAt))
      .groupBy(users.type);

    const byType = typeResults.reduce((acc, curr) => {
      acc[curr.type || 'unknown'] = curr.count;
      return acc;
    }, {} as Record<string, number>);

    return {
      total: totalResult[0].count,
      active: activeResult[0].count,
      inactive: inactiveResult[0].count,
      byType,
    };
  }
}
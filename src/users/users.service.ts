import { Injectable, ConflictException, BadRequestException, Logger } from '@nestjs/common';
import { DrizzleService } from '../database/drizzle.service';
import { users } from '../database/schema';
import { UpdateUserDto } from './dto/update-user.dto';
import { User, PublicUser } from './entities/user.entity';
import { eq, and, or, like, desc, asc, count, isNull } from 'drizzle-orm';
import { generateUid } from 'src/util/uidGenerator';

import { CacheService } from '../cache/cache.service';
import { CACHE_KEYS, CACHE_TTL } from '../cache/cache-keys';
import { R2Service } from 'src/common/services/r2.service';
import { CreatePresignedUrlDto } from './dto/signed-url.dto';

@Injectable()
export class UsersService {
  private readonly logger = new Logger(UsersService.name);
  constructor(
    private drizzleService: DrizzleService,
    private cacheService: CacheService,
    private readonly r2Service: R2Service
  ) { }

  // Consistent user selection for full user data
  private readonly FULL_USER_SELECT = {
    id: users.id,
    uid: users.uid,
    auth0Id: users.auth0Id,
    email: users.email,
    firstname: users.firstname,
    lastname: users.lastname,
    displayName: users.displayName,
    image: users.image,
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
    migratedAt: users.migratedAt,
    existingPlanetUser: users.existingPlanetUser
  } as const;

  // Public user selection (excludes sensitive fields)
  private readonly PUBLIC_USER_SELECT = {
    uid: users.uid,
    email: users.email,
    firstname: users.firstname,
    lastname: users.lastname,
    displayName: users.displayName,
    image: users.image,
    slug: users.slug,
    type: users.type,
    country: users.country,
    url: users.url,
    isPrivate: users.isPrivate,
    bio: users.bio,
    locale: users.locale,
    isActive: users.isActive,
    migratedAt: users.migratedAt,
  } as const;


  async createFromAuth0(auth0Id: string, email: string, name: string): Promise<User> {
    try {
      const existingUser = await this.drizzleService.db
        .select(this.FULL_USER_SELECT)
        .from(users)
        .where(and(eq(users.auth0Id, auth0Id), isNull(users.deletedAt)))
        .limit(1);
      if (existingUser.length > 0) {
        this.cacheNewUser(existingUser[0]);
        return existingUser[0];
      }
      const user = await this.drizzleService.db.transaction(async (tx) => {
        const result = await tx
          .insert(users)
          .values({
            uid: generateUid('usr'),
            auth0Id: auth0Id,
            email: email,
            displayName: name || email.split('@')[0],
            isActive: true,
            lastLoginAt: new Date(),
          })
          .returning(this.FULL_USER_SELECT);
        return result[0];
      });
      if (!user) {
        throw new ConflictException(`User not created`);
      }
      return user;
    } catch (error) {
      throw error;
    }
  }

  async findByEmail(email: string): Promise<User | null> {
    const cacheKey = CACHE_KEYS.USER.BY_EMAIL(email);

    return await this.cacheService.getOrSet(
      cacheKey,
      async () => {
        const result = await this.drizzleService.db
          .select(this.FULL_USER_SELECT)
          .from(users)
          .where(and(eq(users.email, email), isNull(users.deletedAt)))
          .limit(1);

        return result[0] || null;
      },
      CACHE_TTL.MEDIUM
    );
  }

  async findByAuth0Id(auth0Id: string): Promise<User | null> {
    return await this.cacheService.get(CACHE_KEYS.USER.BY_AUTH0_ID(auth0Id));
  }

  async findById(id: number): Promise<User | null> {
    const cacheKey = CACHE_KEYS.USER.BY_ID(id);

    return await this.cacheService.get(
      cacheKey
    );
  }



  // Private helper methods
  private async cacheNewUser(user: User): Promise<void> {
    try {
      await Promise.all([
        this.cacheService.set(CACHE_KEYS.USER.BY_AUTH0_ID(user.auth0Id), user, CACHE_TTL.MEDIUM),
        this.cacheService.set(CACHE_KEYS.USER.BY_EMAIL(user.email), user, CACHE_TTL.MEDIUM),
        this.cacheService.set(CACHE_KEYS.USER.BY_ID(user.id), user, CACHE_TTL.MEDIUM),
      ]);
      this.logger.debug(`Cached user: ${user.auth0Id}`);
    } catch (error) {
      this.logger.error(`Failed to cache user: ${user.auth0Id}`, error);
      // Don't throw - cache failure shouldn't break user operations
    }
  }




  async migrateSuccess(id: number): Promise<Boolean> {
    return await this.updateUseMigration(id);
  }

  async generateR2Url(udi: number, dto: CreatePresignedUrlDto): Promise<any> {
    try {
      if (!dto.fileName || !dto.fileType) {
        throw new BadRequestException('fileName and fileType are required');
      }

      // Validate file type (optional)
      const allowedTypes = ['image/'];
      if (!allowedTypes.some(type => dto.fileType.startsWith(type))) {
        throw new BadRequestException('File type not allowed');
      }

      // Validate file size through filename or add size parameter
      // This is a simple check - you might want more sophisticated validation

      const result = await this.r2Service.generatePresignedUrl({
        fileName: dto.fileName,
        fileType: dto.fileType,
        folder: dto.folder || 'uploads', // default folder
      });

      return {
        success: true,
        data: result,
      };
    } catch (error) {
      return {
        success: false,
        data: null,
      }
    }
  }

  async updateUseMigration(id: number): Promise<Boolean> {
    const result = await this.drizzleService.db
      .update(users)
      .set({
        updatedAt: new Date(),
        migratedAt: new Date(),
      })
      .where(eq(users.id, id))
      .returning({
        users: users.id,
        email: users.email,
        authID: users.auth0Id,
      });
    this.cacheService.delete(CACHE_KEYS.USER.BY_ID(id));
    this.cacheService.delete(CACHE_KEYS.USER.BY_AUTH0_ID(result[0].authID));
    this.cacheService.delete(CACHE_KEYS.USER.BY_EMAIL(result[0].email));
    return true;
  }


  async update(id: number, updateUserDto: UpdateUserDto): Promise<PublicUser> {
    const result = await this.drizzleService.db
      .update(users)
      .set({
        ...updateUserDto,
        updatedAt: new Date(),
      })
      .where(eq(users.id, id))
      .returning({
        uid: users.uid,
        email: users.email,
        firstname: users.firstname,
        lastname: users.lastname,
        displayName: users.displayName,
        image: users.image,
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
        migratedAt: users.migratedAt,
        existingPlanetUser: users.existingPlanetUser
      });

    return result[0];
  }
}
import { Injectable, NotFoundException, ConflictException, ForbiddenException } from '@nestjs/common';
import { eq, and, or, ilike, desc, sql, SQL } from 'drizzle-orm';
import { DrizzleService } from '../database/drizzle.service';
import { userSpecies, species } from '../database/schema';
import { CreateUserSpeciesDto } from './dto/create-user-species.dto';
import { UpdateUserSpeciesDto } from './dto/update-user-species.dto';
import { SpeciesService } from './species.service';

@Injectable()
export class UserSpeciesService {
  constructor(
    private readonly drizzle: DrizzleService,
    private readonly speciesService: SpeciesService,
  ) { }

  async create(userId: string, createUserSpeciesDto: CreateUserSpeciesDto) {
    // Verify the global species exists
    await this.speciesService.findOne(createUserSpeciesDto.speciesId);

    try {
      const [newUserSpecies] = await this.drizzle.db
        .insert(userSpecies)
        .values({
          userId,
          ...createUserSpeciesDto,
        })
        .returning();

      return this.findOneWithSpecies(newUserSpecies.id);
    } catch (error) {
      if (error.code === '23505') {
        throw new ConflictException('You already have this species in your collection');
      }
      throw error;
    }
  }

  async findAllByUser(
    userId: string,
    query: { search?: string; page?: number; limit?: number }
  ) {
    const { search, page = 1, limit = 20 } = query;
    const offset = (page - 1) * limit;

    const whereConditions = [eq(userSpecies.userId, userId)];

    if (search) {
      const searchConditions = [
        search ? ilike(species.scientificName, `%${search}%`) : undefined,
        search ? ilike(species.commonName, `%${search}%`) : undefined,
        search ? ilike(userSpecies.localName, `%${search}%`) : undefined,
      ].filter((c): c is SQL<unknown> => c !== undefined);

      if (searchConditions.length > 0) {
        // whereConditions.push(or(...searchConditions));
      }
    }

    const whereClause = and(...whereConditions);

    const [userSpeciesData, totalCount] = await Promise.all([
      this.drizzle.db
        .select({
          id: userSpecies.id,
          userId: userSpecies.userId,
          speciesId: userSpecies.speciesId,
          localName: userSpecies.localName,
          customImage: userSpecies.customImage,
          notes: userSpecies.notes,
          createdAt: userSpecies.createdAt,
          updatedAt: userSpecies.updatedAt,
          metadata: userSpecies.metadata,
          species: {
            id: species.id,
            scientificName: species.scientificName,
            commonName: species.commonName,
            description: species.description,
            defaultImage: species.defaultImage,
            isActive: species.isActive,
          },
        })
        .from(userSpecies)
        .innerJoin(species, eq(userSpecies.speciesId, species.id))
        .where(whereClause)
        .orderBy(desc(userSpecies.createdAt))
        .limit(limit)
        .offset(offset),

      this.drizzle.db
        .select({ count: sql<number>`count(*)` })
        .from(userSpecies)
        .innerJoin(species, eq(userSpecies.speciesId, species.id))
        .where(whereClause)
        .then((result) => Number(result[0].count)),
    ]);

    return {
      data: userSpeciesData,
      pagination: {
        page,
        limit,
        total: totalCount,
        totalPages: Math.ceil(totalCount / limit),
      },
    };
  }

  async findOneWithSpecies(id: string) {
    const userSpeciesData = await this.drizzle.db
      .select({
        id: userSpecies.id,
        userId: userSpecies.userId,
        speciesId: userSpecies.speciesId,
        localName: userSpecies.localName,
        customImage: userSpecies.customImage,
        notes: userSpecies.notes,
        createdAt: userSpecies.createdAt,
        updatedAt: userSpecies.updatedAt,
        metadata: userSpecies.metadata,
        species: {
          id: species.id,
          scientificName: species.scientificName,
          commonName: species.commonName,
          description: species.description,
          defaultImage: species.defaultImage,
          isActive: species.isActive,
        },
      })
      .from(userSpecies)
      .innerJoin(species, eq(userSpecies.speciesId, species.id))
      .where(eq(userSpecies.id, id))
      .limit(1);

    if (!userSpeciesData.length) {
      throw new NotFoundException('User species not found');
    }

    return userSpeciesData[0];
  }

  async findOne(userId: string, id: string) {
    const userSpeciesData = await this.findOneWithSpecies(id);

    if (userSpeciesData.userId !== userId) {
      throw new ForbiddenException('You can only access your own species');
    }

    return userSpeciesData;
  }

  async update(userId: string, id: string, updateUserSpeciesDto: UpdateUserSpeciesDto) {
    const existingUserSpecies = await this.findOne(userId, id);

    const [updatedUserSpecies] = await this.drizzle.db
      .update(userSpecies)
      .set({
        ...updateUserSpeciesDto,
        updatedAt: new Date(),
      })
      .where(eq(userSpecies.id, id))
      .returning();

    return this.findOneWithSpecies(updatedUserSpecies.id);
  }

  async remove(userId: string, id: string) {
    const existingUserSpecies = await this.findOne(userId, id);

    await this.drizzle.db
      .delete(userSpecies)
      .where(eq(userSpecies.id, id));

    return { message: 'User species removed successfully' };
  }

  async findByUserAndSpecies(userId: string, speciesId: string) {
    const userSpeciesData = await this.drizzle.db
      .select()
      .from(userSpecies)
      .where(and(
        eq(userSpecies.userId, userId),
        eq(userSpecies.speciesId, speciesId)
      ))
      .limit(1);

    return userSpeciesData[0] || null;
  }
}
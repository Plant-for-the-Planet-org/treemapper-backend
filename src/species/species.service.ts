import { Injectable, NotFoundException, ConflictException } from '@nestjs/common';
import { eq, and, or, ilike, desc, sql } from 'drizzle-orm';
import { DrizzleService } from '../database/drizzle.service';
import { species } from '../database/schema'; // Adjust import path
import { CreateSpeciesDto } from './dto/create-species.dto';
import { UpdateSpeciesDto } from './dto/update-species.dto';
import { SpeciesQueryDto } from './dto/species-query.dto';

@Injectable()
export class SpeciesService {
  constructor(private readonly drizzle: DrizzleService) {}

  async create(createSpeciesDto: CreateSpeciesDto) {
    try {
      const [newSpecies] = await this.drizzle.db
        .insert(species)
        .values({
          ...createSpeciesDto,
          isActive: createSpeciesDto.isActive ?? true,
        })
        .returning();

      return newSpecies;
    } catch (error) {
      if (error.code === '23505') { // Unique constraint violation
        throw new ConflictException('Species with this scientific name already exists');
      }
      throw error;
    }
  }

  async findAll(query: SpeciesQueryDto) {
    const { search, isActive, page = 1, limit = 20 } = query;
    const offset = (page - 1) * limit;

    const whereConditions: any[] = [];

    if (search) {
      whereConditions.push(
        or(
          ilike(species.scientificName, `%${search}%`),
          ilike(species.commonName, `%${search}%`)
        )
      );
    }

    if (typeof isActive === 'boolean') {
      whereConditions.push(eq(species.isActive, isActive));
    }

    const whereClause = whereConditions.length > 0
      ? and(...whereConditions)
      : undefined;

    const [speciesData, totalCount] = await Promise.all([
      this.drizzle.db
        .select()
        .from(species)
        .where(whereClause)
        .orderBy(desc(species.createdAt))
        .limit(limit)
        .offset(offset),
      
      this.drizzle.db
        .select({ count: sql<number>`count(*)` })
        .from(species)
        .where(whereClause)
        .then(result => Number(result[0].count))
    ]);

    return {
      data: speciesData,
      pagination: {
        page,
        limit,
        total: totalCount,
        totalPages: Math.ceil(totalCount / limit),
      },
    };
  }

  async findOne(id: string) {
    const speciesData = await this.drizzle.db
      .select()
      .from(species)
      .where(eq(species.id, id))
      .limit(1);

    if (!speciesData.length) {
      throw new NotFoundException('Species not found');
    }

    return speciesData[0];
  }

  async findByScientificName(scientificName: string) {
    const speciesData = await this.drizzle.db
      .select()
      .from(species)
      .where(eq(species.scientificName, scientificName))
      .limit(1);

    return speciesData[0] || null;
  }

  async update(id: string, updateSpeciesDto: UpdateSpeciesDto) {
    const existingSpecies = await this.findOne(id);

    try {
      const [updatedSpecies] = await this.drizzle.db
        .update(species)
        .set({
          ...updateSpeciesDto,
          updatedAt: new Date(),
        })
        .where(eq(species.id, id))
        .returning();

      return updatedSpecies;
    } catch (error) {
      if (error.code === '23505') {
        throw new ConflictException('Species with this scientific name already exists');
      }
      throw error;
    }
  }

  async remove(id: string) {
    const existingSpecies = await this.findOne(id);

    await this.drizzle.db
      .delete(species)
      .where(eq(species.id, id));

    return { message: 'Species deleted successfully' };
  }

  async deactivate(id: string) {
    return this.update(id, { isActive: false });
  }

  async activate(id: string) {
    return this.update(id, { isActive: true });
  }
}

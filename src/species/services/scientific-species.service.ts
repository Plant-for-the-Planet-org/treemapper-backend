import { Injectable, ConflictException, BadRequestException } from '@nestjs/common';
import { DrizzleService } from '../../database/drizzle.service';
import { scientificSpecies } from '../../database/schema/index';
import { BulkUploadScientificSpeciesDto, ScientificSpeciesFilterDto } from './../dto/scientific-species.dto';
import { eq, ilike, or, desc, asc, sql } from 'drizzle-orm';
import { v4 as uuidv4 } from 'uuid';

@Injectable()
export class ScientificSpeciesService {
  constructor(private readonly drizzle: DrizzleService) {}

  async bulkUpload(bulkUploadDto: BulkUploadScientificSpeciesDto) {
    const { species } = bulkUploadDto;
  
    // Check for existing species in database
    // const existingSpecies = await this.drizzle.db
    //   .select({ scientificName: scientificSpecies.scientificName })
    //   .from(scientificSpecies)
    //   .where(
    //     or(...scientificNames.map(name => 
    //       eq(scientificSpecies.scientificName, name)
    //     ))
    //   );

    // const existingNames = existingSpecies.map(s => s.scientificName.toLowerCase());
    // const conflicts = species.filter(s => 
    //   existingNames.includes(s.scientificName.toLowerCase())
    // );

    // if (conflicts.length > 0) {
    //   throw new ConflictException(
    //     `The following species already exist: ${conflicts.map(c => c.scientificName).join(', ')}`
    //   );
    // }

    // Use transaction for rollback capability
    const result = await this.drizzle.db.transaction(async (tx) => {
      const insertedSpecies: typeof scientificSpecies.$inferSelect[] = [];
      
      for (const speciesData of species) {
        const inserted = await tx
          .insert(scientificSpecies)
          .values({
            uid: uuidv4(),
            ...speciesData,
          })
          .returning();
        insertedSpecies.push(inserted[0]);
      }
      return insertedSpecies;
    });

    return {
      message: `Successfully uploaded ${result.length} species`,
      uploadedCount: result.length,
      species: result,
    };
  }

  async getAll(filterDto: ScientificSpeciesFilterDto) {
    const { page = 1, limit = 10, search } = filterDto;
    const offset = (page - 1) * limit;

    let whereCondition;
    if (search) {
      whereCondition = or(
        ilike(scientificSpecies.scientificName, `%${search}%`),
        ilike(scientificSpecies.commonName, `%${search}%`),
      );
    }

    const [data, totalResult] = await Promise.all([
      this.drizzle.db
        .select()
        .from(scientificSpecies)
        .where(whereCondition)
        .orderBy(desc(scientificSpecies.createdAt))
        .limit(limit)
        .offset(offset),

      this.drizzle.db
        .select({ count: sql<number>`count(*)` })
        .from(scientificSpecies)
        .where(whereCondition),
    ]);

    const total = totalResult[0]?.count || 0;

    return {
      data,
      total,
      page,
      limit,
      totalPages: Math.ceil(total / limit),
    };
  }

   async searchSpecies(searchTerm: string, limit: number = 10) {
    try {
      // Trim and validate search term
      const trimmedSearch = searchTerm.trim();
      
      if (!trimmedSearch) {
        return {
          success: false,
          message: 'Search term cannot be empty',
          data: [],
          count: 0,
        };
      }

      const species = await this.drizzle.db
        .select({
          id: scientificSpecies.id,
          uid: scientificSpecies.uid,
          scientificName: scientificSpecies.scientificName,
          commonName: scientificSpecies.commonName,
          description: scientificSpecies.description,
          image: scientificSpecies.image,
        })
        .from(scientificSpecies)
        .where(ilike(scientificSpecies.scientificName, `%${trimmedSearch}%`))
        .orderBy(asc(scientificSpecies.scientificName))
        .limit(limit);

      return species;
    } catch (error) {
      console.error('Error searching species:', error);
      throw new Error('Failed to search species');
    }
  }

}
// src/modules/interventions/interventions.service.ts
import { Injectable, NotFoundException, BadRequestException, ConflictException } from '@nestjs/common';
import { and, eq, desc, asc, like, gte, lte, inArray, sql, count } from 'drizzle-orm';
import { DrizzleService } from '../database/drizzle.service';
import {
  interventions,
  interventionSpecies,
  scientificSpecies,
  projects,
  sites,
  users,
  interventionConfigurations,
  trees
} from '../database/schema/index';
import {
  CreateInterventionDto,
  UpdateInterventionDto,
  QueryInterventionDto,
  BulkImportResultDto,
  InterventionResponseDto
} from './dto/interventions.dto';
import * as XLSX from 'xlsx';
import { generateUid } from 'src/util/uidGenerator';
import { generateParentHID } from 'src/util/hidGenerator';
import { ProjectGuardResponse } from 'src/projects/projects.service';
import { uuid } from 'drizzle-orm/pg-core';
import { generateIdempotencyKey } from 'src/util/idempotencyKeyGenerator';
import { interventionConfigurationSeedData } from 'src/database/schema/interventionConfig';
import { int } from 'drizzle-orm/mysql-core';

export enum CaptureStatus {
  COMPLETE = 'complete',
  PARTIAL = 'partial',
  INCOMPLETE = 'incomplete',
}

@Injectable()
export class InterventionsService {
  constructor(
    private drizzleService: DrizzleService,
  ) { }

  async create(createInterventionDto: CreateInterventionDto, membership: ProjectGuardResponse): Promise<InterventionResponseDto> {
    try {
      let newHID = generateParentHID();
      let projectSiteNumId = 0;

      const existingHid = await this.drizzleService.db
        .select()
        .from(interventions)
        .where(eq(interventions.hid, newHID))
        .limit(1);

      if (existingHid.length > 0) {
        newHID = generateParentHID();
        const existingHid = await this.drizzleService.db
          .select()
          .from(interventions)
          .where(eq(interventions.hid, newHID))
          .limit(1);
        if (existingHid.length > 0) {
          throw new ConflictException('Intervention with this HID already exists');
        }
      }

      const interventionConfig = interventionConfigurationSeedData.find(el => el.interventionType === createInterventionDto.type);
      if (!interventionConfig) {
        throw new BadRequestException('Invalid intervention type');
      }

      // Early validation for species configuration
      if (interventionConfig.allowsMultipleSpecies) {
        // For multi-species: only plantedSpecies should be present
        if (createInterventionDto.scientificSpecies || createInterventionDto.otherSpecies) {
          throw new BadRequestException('For multi-species interventions, only plantedSpecies should be provided');
        }
        if (interventionConfig.requiresSpecies && (!createInterventionDto.plantedSpecies || createInterventionDto.plantedSpecies.length === 0)) {
          throw new BadRequestException('This intervention type requires at least one species in plantedSpecies');
        }
      } else if (interventionConfig.allowsSpecies) {
        // For single-species: either scientificSpecies OR otherSpecies, not plantedSpecies
        if (createInterventionDto.plantedSpecies && createInterventionDto.plantedSpecies.length > 0) {
          throw new BadRequestException('For single-species interventions, use scientificSpecies or otherSpecies instead of plantedSpecies');
        }
        if (createInterventionDto.scientificSpecies && createInterventionDto.otherSpecies) {
          throw new BadRequestException('For single-species interventions, provide either scientificSpecies OR otherSpecies, not both');
        }
        if (interventionConfig.requiresSpecies && !createInterventionDto.scientificSpecies && !createInterventionDto.otherSpecies) {
          throw new BadRequestException('This intervention type requires either scientificSpecies or otherSpecies');
        }
      } else {
        // No species allowed
        if (createInterventionDto.plantedSpecies && createInterventionDto.plantedSpecies.length > 0) {
          throw new BadRequestException('This intervention type does not allow species');
        }
        if (createInterventionDto.scientificSpecies) {
          throw new BadRequestException('This intervention type does not allow species');
        }
        if (createInterventionDto.otherSpecies) {
          throw new BadRequestException('This intervention type does not allow species');
        }
      }

      // Project site validation
      if (createInterventionDto.plantProjectSite && !createInterventionDto.plantProject) {
        throw new BadRequestException('Project site ID provided without project ID');
      }

      if (createInterventionDto.plantProject && createInterventionDto.plantProjectSite) {
        const site = await this.drizzleService.db
          .select()
          .from(sites)
          .where(eq(sites.uid, createInterventionDto.plantProjectSite))
          .limit(1);
        if (site.length === 0) {
          throw new NotFoundException('Site not found');
        }
        projectSiteNumId = site[0].id;
      }

      // Use allowed literal values for captureStatus
      const captureStatus: CaptureStatus = interventionConfig.allowsSampleTrees ? CaptureStatus.INCOMPLETE : CaptureStatus.COMPLETE;
      const sampleTreeCount = createInterventionDto.sampleTreeCount || 0;
      const geometryType = createInterventionDto.geometry.type || 'Point';

      // Start transaction for intervention creation
      return await this.drizzleService.db.transaction(async (tx) => {
        // Generate UID
        const uid = generateUid('inv');

        // Prepare intervention data matching your schema exactly
        const interventionData = {
          uid: uid,
          hid: newHID,
          discr: 'intervention' as const,
          userId: membership.userId,
          idempotencyKey: generateUid('inv'),
          type: createInterventionDto.type,
          interventionStartDate: new Date(createInterventionDto.interventionStartDate),
          interventionEndDate: new Date(createInterventionDto.interventionEndDate),
          captureMode: 'on_site' as const,
          captureStatus: captureStatus,
          location: sql`ST_GeomFromGeoJSON(${JSON.stringify(createInterventionDto.geometry)})`,
          originalGeometry: createInterventionDto.geometry,
          sampleTreeCount: sampleTreeCount,
          projectId: membership.projectId,
          deviceLocation: createInterventionDto.deviceLocation,
          metaData: createInterventionDto.metadata || {},
          projectSiteId: projectSiteNumId,
          geometryType: geometryType,
          registrationDate: new Date(createInterventionDto.registrationDate),
          createdAt: new Date(),
          updatedAt: new Date(),
        };

        // Create intervention
        const result = await tx
          .insert(interventions)
          .values(interventionData)
          .returning();

        const newIntervention = Array.isArray(result) ? result[0] : undefined;
        if (!newIntervention) {
          throw new Error('Failed to create intervention');
        }

        console.log('New intervention created:', newIntervention);

        // Handle species creation based on intervention configuration
        if (interventionConfig.allowsSpecies) {
          if (interventionConfig.allowsMultipleSpecies) {
            // Multi-species handling
            if (createInterventionDto.plantedSpecies && createInterventionDto.plantedSpecies.length > 0) {
              // Validate that all scientific species exist
              const checkIfSciExists = createInterventionDto.plantedSpecies.filter(s => s.scientificSpeciesId);
              const speciesIds = checkIfSciExists.map(s => s.scientificSpeciesId);

              if (speciesIds.length > 0) {
                const existingSpecies = await tx
                  .select()
                  .from(scientificSpecies)
                  .where(inArray(scientificSpecies.id, speciesIds));

                if (existingSpecies.length !== speciesIds.length) {
                  throw new BadRequestException('One or more species not found');
                }
              }

              // Insert intervention species
              const speciesData = createInterventionDto.plantedSpecies.map(species => {
                const payload = {
                  uid: generateUid('invspc'),
                  interventionId: newIntervention.id,
                  plantedCount: species.treeCount
                }
                if (species.scientificSpeciesId) {
                  payload['scientificSpeciesId'] = species.scientificSpeciesId;
                }
                if (species.otherSpecies) {
                  payload['isUnknown'] = true;
                  payload['customSpeciesName'] = 'Unknown'
                }
                return payload
              });

              console.log('Intervention data:', "Here is the species data", speciesData);
              await tx.insert(interventionSpecies).values(speciesData);
            }
          } else {
            // Single-species handling
            if (createInterventionDto.otherSpecies) {
              const speciesData = {
                uid: generateUid('invspc'),
                interventionId: newIntervention.id,
                isUnknown: true,
                customSpeciesName: 'Unknown',
                plantedCount: 1
              };
              await tx.insert(interventionSpecies).values(speciesData);
            }

            if (createInterventionDto.scientificSpecies) {
              const existingSpecies = await tx
                .select()
                .from(scientificSpecies)
                .where(eq(scientificSpecies.id, createInterventionDto.scientificSpecies))
                .limit(1);

              if (existingSpecies.length === 0) {
                throw new BadRequestException('Scientific species not found');
              }

              const speciesData = {
                uid: generateUid('invspc'),
                interventionId: newIntervention.id,
                scientificSpeciesId: createInterventionDto.scientificSpecies,
                plantedCount: 1
              };
              await tx.insert(interventionSpecies).values(speciesData);
            }
          }
        }

        return { uid: newIntervention.uid, hid: newIntervention.hid } as InterventionResponseDto;
      });
    } catch (error) {
      throw new BadRequestException(`Failed to create intervention: ${error.message}`);
    }
  }

  async findOne(id: number): Promise<InterventionResponseDto> {
    const data = await this.drizzleService.db
      .select({
        id: interventions.id,
      })
      .from(interventions)
      .where(and(
        eq(interventions.id, id)
      ))
      .limit(1);
    console.log('Intervention data:', data);
    if (data.length === 0) {
      throw new NotFoundException('Intervention not found');
    }

    const intervention = data[0];

    // Get species data
    const speciesData = await this.getInterventionSpecies([id]);

    return {
      ...intervention,
      species: speciesData[id] || [],
    } as unknown as InterventionResponseDto;
  }

  private async getInterventionSpecies(interventionIds: number[]): Promise<Record<number, any[]>> {
    if (interventionIds.length === 0) return {};

    const speciesData = await this.drizzleService.db
      .select({
        interventionId: interventionSpecies.interventionId,
        scientificSpeciesId: interventionSpecies.scientificSpeciesId,
        scientificName: scientificSpecies.scientificName,
        commonName: scientificSpecies.commonName,
        plantedCount: interventionSpecies.plantedCount,
        survivalRate: interventionSpecies.survivalRate,
        notes: interventionSpecies.notes,
      })
      .from(interventionSpecies)
      .leftJoin(scientificSpecies, eq(interventionSpecies.scientificSpeciesId, scientificSpecies.id))
      .where(and(
        inArray(interventionSpecies.interventionId, interventionIds),
        sql`${interventionSpecies.deletedAt} IS NULL`
      ));

    const grouped: Record<number, any[]> = {};
    for (const species of speciesData) {
      if (!grouped[species.interventionId]) {
        grouped[species.interventionId] = [];
      }
      grouped[species.interventionId].push(species);
    }
    return grouped;
  }



  // async findAll(query: QueryInterventionDto, userId?: number): Promise<{ data: InterventionResponseDto[]; total: number; page: number; limit: number }> {
  //   const { page, limit, ...filters } = query;
  //   const offset = (page - 1) * limit;

  //   // Build where conditions
  //   const conditions = [];

  //   if (filters.projectId) {
  //     conditions.push(eq(interventions.projectId, filters.projectId));
  //   }

  //   if (filters.projectSiteId) {
  //     conditions.push(eq(interventions.projectSiteId, filters.projectSiteId));
  //   }

  //   if (filters.userId) {
  //     conditions.push(eq(interventions.userId, filters.userId));
  //   }

  //   if (filters.type) {
  //     conditions.push(eq(interventions.type, filters.type));
  //   }

  //   if (filters.status) {
  //     conditions.push(eq(interventions.status, filters.status));
  //   }

  //   if (filters.captureMode) {
  //     conditions.push(eq(interventions.captureMode, filters.captureMode));
  //   }

  //   if (filters.startDate) {
  //     conditions.push(gte(interventions.interventionStartDate, new Date(filters.startDate)));
  //   }

  //   if (filters.endDate) {
  //     conditions.push(lte(interventions.interventionEndDate, new Date(filters.endDate)));
  //   }

  //   if (filters.search) {
  //     conditions.push(
  //       sql`(${interventions.hid} ILIKE ${'%' + filters.search + '%'} OR 
  //           ${interventions.description} ILIKE ${'%' + filters.search + '%'} OR 
  //           ${interventions.tag} ILIKE ${'%' + filters.search + '%'})`
  //     );
  //   }

  //   // Handle privacy filter
  //   if (!filters.includePrivate) {
  //     conditions.push(eq(interventions.isPrivate, false));
  //   }

  //   // Add deleted filter
  //   conditions.push(sql`${interventions.deletedAt} IS NULL`);

  //   const whereClause = conditions.length > 0 ? and(...conditions) : undefined;

  //   // Get total count
  //   const [{ total }] = await this.db
  //     .select({ total: count() })
  //     .from(interventions)
  //     .where(whereClause);

  //   // Get data with sorting
  //   const sortColumn = this.getSortColumn(filters.sortBy);
  //   const sortDirection = filters.sortOrder === 'asc' ? asc(sortColumn) : desc(sortColumn);

  //   const data = await this.db
  //     .select({
  //       id: interventions.id,
  //       uid: interventions.uid,
  //       hid: interventions.hid,
  //       type: interventions.type,
  //       projectId: interventions.projectId,
  //       projectSiteId: interventions.projectSiteId,
  //       userId: interventions.userId,
  //       interventionStartDate: interventions.interventionStartDate,
  //       interventionEndDate: interventions.interventionEndDate,
  //       captureMode: interventions.captureMode,
  //       captureStatus: interventions.captureStatus,
  //       location: interventions.location,
  //       latitude: interventions.latitude,
  //       longitude: interventions.longitude,
  //       treesPlanted: interventions.treesPlanted,
  //       sampleTreeCount: interventions.sampleTreeCount,
  //       status: interventions.status,
  //       description: interventions.description,
  //       isPrivate: interventions.isPrivate,
  //       createdAt: interventions.createdAt,
  //       updatedAt: interventions.updatedAt,
  //       // Related data
  //       projectName: projects.projectName,
  //       siteName: sites.name,
  //       userName: users.name,
  //     })
  //     .from(interventions)
  //     .leftJoin(projects, eq(interventions.projectId, projects.id))
  //     .leftJoin(sites, eq(interventions.projectSiteId, sites.id))
  //     .leftJoin(users, eq(interventions.userId, users.id))
  //     .where(whereClause)
  //     .orderBy(sortDirection)
  //     .limit(limit)
  //     .offset(offset);

  //   // Get species for each intervention
  //   const interventionIds = data.map(item => item.id);
  //   const speciesData = await this.getInterventionSpecies(interventionIds);

  //   const formattedData = data.map(item => ({
  //     ...item,
  //     species: speciesData[item.id] || [],
  //   }));

  //   return {
  //     data: formattedData as InterventionResponseDto[],
  //     total: Number(total),
  //     page,
  //     limit,
  //   };
  // }

  // async findOne(id: number): Promise<InterventionResponseDto> {
  //   const data = await this.db
  //     .select({
  //       id: interventions.id,
  //       uid: interventions.uid,
  //       hid: interventions.hid,
  //       type: interventions.type,
  //       projectId: interventions.projectId,
  //       projectSiteId: interventions.projectSiteId,
  //       userId: interventions.userId,
  //       parentInterventionId: interventions.parentInterventionId,
  //       registrationDate: interventions.registrationDate,
  //       interventionStartDate: interventions.interventionStartDate,
  //       interventionEndDate: interventions.interventionEndDate,
  //       captureMode: interventions.captureMode,
  //       captureStatus: interventions.captureStatus,
  //       location: interventions.location,
  //       originalGeometry: interventions.originalGeometry,
  //       latitude: interventions.latitude,
  //       longitude: interventions.longitude,
  //       geometryType: interventions.geometryType,
  //       deviceLocation: interventions.deviceLocation,
  //       treesPlanted: interventions.treesPlanted,
  //       sampleTreeCount: interventions.sampleTreeCount,
  //       allocationPriority: interventions.allocationPriority,
  //       description: interventions.description,
  //       tag: interventions.tag,
  //       status: interventions.status,
  //       statusReason: interventions.statusReason,
  //       isPrivate: interventions.isPrivate,
  //       metadata: interventions.metadata,
  //       allImages: interventions.allImages,
  //       image: interventions.image,
  //       imageCdn: interventions.imageCdn,
  //       createdAt: interventions.createdAt,
  //       updatedAt: interventions.updatedAt,
  //       // Related data
  //       projectName: projects.projectName,
  //       siteName: sites.name,
  //       userName: users.name,
  //     })
  //     .from(interventions)
  //     .leftJoin(projects, eq(interventions.projectId, projects.id))
  //     .leftJoin(sites, eq(interventions.projectSiteId, sites.id))
  //     .leftJoin(users, eq(interventions.userId, users.id))
  //     .where(and(
  //       eq(interventions.id, id),
  //       sql`${interventions.deletedAt} IS NULL`
  //     ))
  //     .limit(1);

  //   if (data.length === 0) {
  //     throw new NotFoundException('Intervention not found');
  //   }

  //   const intervention = data[0];

  //   // Get species data
  //   const speciesData = await this.getInterventionSpecies([id]);

  //   return {
  //     ...intervention,
  //     species: speciesData[id] || [],
  //   } as InterventionResponseDto;
  // }

  // async update(id: number, updateInterventionDto: UpdateInterventionDto): Promise<InterventionResponseDto> {
  //   const existingIntervention = await this.db
  //     .select()
  //     .from(interventions)
  //     .where(and(
  //       eq(interventions.id, id),
  //       sql`${interventions.deletedAt} IS NULL`
  //     ))
  //     .limit(1);

  //   if (existingIntervention.length === 0) {
  //     throw new NotFoundException('Intervention not found');
  //   }

  //   // Validate HID uniqueness if being updated
  //   if (updateInterventionDto.hid && updateInterventionDto.hid !== existingIntervention[0].hid) {
  //     const existingHid = await this.db
  //       .select()
  //       .from(interventions)
  //       .where(and(
  //         eq(interventions.hid, updateInterventionDto.hid),
  //         sql`${interventions.id} != ${id}`
  //       ))
  //       .limit(1);

  //     if (existingHid.length > 0) {
  //       throw new ConflictException('Intervention with this HID already exists');
  //     }
  //   }

  //   // Validate intervention type configuration if type is being changed
  //   if (updateInterventionDto.type && updateInterventionDto.type !== existingIntervention[0].type) {
  //     const config = await this.db
  //       .select()
  //       .from(interventionConfigurations)
  //       .where(eq(interventionConfigurations.interventionType, updateInterventionDto.type))
  //       .limit(1);

  //     if (config.length === 0) {
  //       throw new BadRequestException('Invalid intervention type');
  //     }
  //   }

  //   return await this.db.transaction(async (tx) => {
  //     // Update intervention
  //     const updateData: any = {
  //       ...updateInterventionDto,
  //       updatedAt: new Date(),
  //     };

  //     // Handle date conversions
  //     if (updateInterventionDto.registrationDate) {
  //       updateData.registrationDate = new Date(updateInterventionDto.registrationDate);
  //     }
  //     if (updateInterventionDto.interventionStartDate) {
  //       updateData.interventionStartDate = new Date(updateInterventionDto.interventionStartDate);
  //     }
  //     if (updateInterventionDto.interventionEndDate) {
  //       updateData.interventionEndDate = new Date(updateInterventionDto.interventionEndDate);
  //     }

  //     await tx
  //       .update(interventions)
  //       .set(updateData)
  //       .where(eq(interventions.id, id));

  //     // Update species if provided
  //     if (updateInterventionDto.species) {
  //       // Delete existing species associations
  //       await tx
  //         .delete(interventionSpecies)
  //         .where(eq(interventionSpecies.interventionId, id));

  //       // Insert new species associations
  //       if (updateInterventionDto.species.length > 0) {
  //         const speciesData = updateInterventionDto.species.map(species => ({
  //           uid: this.generateUID(),
  //           interventionId: id,
  //           scientificSpeciesId: species.scientificSpeciesId,
  //           plantedCount: species.plantedCount || 0,
  //           targetCount: species.targetCount,
  //           survivalRate: species.survivalRate ? species.survivalRate.toString() : null,
  //           notes: species.notes,
  //           metadata: species.metadata,
  //         }));

  //         await tx.insert(interventionSpecies).values(speciesData);
  //       }
  //     }

  //     return this.findOne(id);
  //   });
  // }

  // async remove(id: number): Promise<void> {
  //   const existingIntervention = await this.db
  //     .select()
  //     .from(interventions)
  //     .where(and(
  //       eq(interventions.id, id),
  //       sql`${interventions.deletedAt} IS NULL`
  //     ))
  //     .limit(1);

  //   if (existingIntervention.length === 0) {
  //     throw new NotFoundException('Intervention not found');
  //   }

  //   // Soft delete - update deletedAt timestamp
  //   await this.db
  //     .update(interventions)
  //     .set({
  //       deletedAt: new Date(),
  //       updatedAt: new Date()
  //     })
  //     .where(eq(interventions.id, id));
  // }

  // async bulkImport(file: Express.Multer.File, projectId?: number, validateOnly: boolean = false): Promise<BulkImportResultDto> {
  //   if (!file) {
  //     throw new BadRequestException('No file provided');
  //   }

  //   let workbook: XLSX.WorkBook;
  //   try {
  //     workbook = XLSX.read(file.buffer, { type: 'buffer' });
  //   } catch (error) {
  //     throw new BadRequestException('Invalid file format. Please provide a valid Excel file.');
  //   }

  //   const sheetName = workbook.SheetNames[0];
  //   const worksheet = workbook.Sheets[sheetName];
  //   const jsonData = XLSX.utils.sheet_to_json(worksheet);

  //   if (jsonData.length === 0) {
  //     throw new BadRequestException('File is empty or contains no valid data');
  //   }

  //   const result: BulkImportResultDto = {
  //     totalRecords: jsonData.length,
  //     successCount: 0,
  //     errorCount: 0,
  //     errors: [],
  //     successfulIds: [],
  //   };

  //   const validInterventions: CreateInterventionDto[] = [];

  //   // Validate each row
  //   for (let i = 0; i < jsonData.length; i++) {
  //     const row = jsonData[i] as any;
  //     const rowNumber = i + 2; // Excel row number (1-indexed + header)

  //     try {
  //       const interventionData = this.mapRowToIntervention(row, projectId);
  //       await this.validateInterventionData(interventionData);
  //       validInterventions.push(interventionData);
  //     } catch (error) {
  //       result.errorCount++;
  //       result.errors.push(`Row ${rowNumber}: ${error.message}`);
  //     }
  //   }

  //   result.successCount = validInterventions.length;

  //   // If validation only, return results without importing
  //   if (validateOnly) {
  //     return result;
  //   }

  //   // Import valid interventions
  //   if (validInterventions.length > 0) {
  //     try {
  //       await this.db.transaction(async (tx) => {
  //         for (const interventionData of validInterventions) {
  //           try {
  //             const created = await this.create(interventionData, 1); // TODO: Get actual user ID
  //             result.successfulIds.push(created.hid);
  //           } catch (error) {
  //             result.successCount--;
  //             result.errorCount++;
  //             result.errors.push(`Failed to create intervention ${interventionData.hid}: ${error.message}`);
  //           }
  //         }
  //       });
  //     } catch (error) {
  //       throw new BadRequestException(`Bulk import failed: ${error.message}`);
  //     }
  //   }

  //   return result;
  // }

  // async bulkExport(query: QueryInterventionDto): Promise<Buffer> {
  //   // Get all interventions based on query (without pagination)
  //   const exportQuery = { ...query, page: 1, limit: 10000 };
  //   const { data } = await this.findAll(exportQuery);

  //   // Transform data for export
  //   const exportData = data.map(intervention => ({
  //     HID: intervention.hid,
  //     Type: intervention.type,
  //     'Project Name': intervention.projectName,
  //     'Site Name': intervention.siteName,
  //     'User Name': intervention.userName,
  //     'Start Date': intervention.interventionStartDate,
  //     'End Date': intervention.interventionEndDate,
  //     'Capture Mode': intervention.captureMode,
  //     'Capture Status': intervention.captureStatus,
  //     Latitude: intervention.latitude,
  //     Longitude: intervention.longitude,
  //     'Trees Planted': intervention.treesPlanted,
  //     'Sample Tree Count': intervention.sampleTreeCount,
  //     Status: intervention.status,
  //     Description: intervention.description,
  //     'Is Private': intervention.isPrivate,
  //     'Created At': intervention.createdAt,
  //     'Species Count': intervention.species.length,
  //     'Species Names': intervention.species.map(s => s.scientificName).join(', '),
  //   }));

  //   // Create workbook and worksheet
  //   const workbook = XLSX.utils.book_new();
  //   const worksheet = XLSX.utils.json_to_sheet(exportData);

  //   // Add worksheet to workbook
  //   XLSX.utils.book_append_sheet(workbook, worksheet, 'Interventions');

  //   // Generate buffer
  //   return XLSX.write(workbook, { type: 'buffer', bookType: 'xlsx' });
  // }

  // async getInterventionTrees(interventionId: number): Promise<any[]> {
  //   const intervention = await this.db
  //     .select()
  //     .from(interventions)
  //     .where(and(
  //       eq(interventions.id, interventionId),
  //       sql`${interventions.deletedAt} IS NULL`
  //     ))
  //     .limit(1);

  //   if (intervention.length === 0) {
  //     throw new NotFoundException('Intervention not found');
  //   }

  //   return await this.db
  //     .select({
  //       id: trees.id,
  //       uid: trees.uid,
  //       tag: trees.tag,
  //       type: trees.type,
  //       latitude: trees.latitude,
  //       longitude: trees.longitude,
  //       altitude: trees.altitude,
  //       accuracy: trees.accuracy,
  //       currentHeight: trees.currentHeight,
  //       currentDiameter: trees.currentDiameter,
  //       status: trees.status,
  //       plantingDate: trees.plantingDate,
  //       lastMeasurementDate: trees.lastMeasurementDate,
  //       scientificSpeciesId: trees.scientificSpeciesId,
  //       scientificName: scientificSpecies.scientificName,
  //       commonName: scientificSpecies.commonName,
  //       createdAt: trees.createdAt,
  //       updatedAt: trees.updatedAt,
  //     })
  //     .from(trees)
  //     .leftJoin(scientificSpecies, eq(trees.scientificSpeciesId, scientificSpecies.id))
  //     .where(and(
  //       eq(trees.interventionId, interventionId),
  //       sql`${trees.deletedAt} IS NULL`
  //     ))
  //     .orderBy(desc(trees.createdAt));
  // }

  // async updateTreeCounts(interventionId: number): Promise<void> {
  //   // Get tree counts for the intervention
  //   const [result] = await this.db
  //     .select({
  //       totalTrees: count(),
  //       sampleTrees: sql<number>`COUNT(*) FILTER (WHERE ${trees.type} = 'sample')`,
  //     })
  //     .from(trees)
  //     .where(and(
  //       eq(trees.interventionId, interventionId),
  //       sql`${trees.deletedAt} IS NULL`
  //     ));

  //   // Update intervention with current tree counts
  //   await this.db
  //     .update(interventions)
  //     .set({
  //       treesPlanted: Number(result.totalTrees),
  //       sampleTreeCount: Number(result.sampleTrees),
  //       updatedAt: new Date(),
  //     })
  //     .where(eq(interventions.id, interventionId));
  // }

  // // Private helper methods
  // private generateUID(): string {
  //   return `int_${Date.now()}_${Math.random().toString(36).substr(2, 9)}`;
  // }

  // private getSortColumn(sortBy: string) {
  //   const sortColumns = {
  //     createdAt: interventions.createdAt,
  //     updatedAt: interventions.updatedAt,
  //     hid: interventions.hid,
  //     type: interventions.type,
  //     startDate: interventions.interventionStartDate,
  //     endDate: interventions.interventionEndDate,
  //     status: interventions.status,
  //     treesPlanted: interventions.treesPlanted,
  //   };

  //   return sortColumns[sortBy] || interventions.createdAt;
  // }

  // private async getInterventionSpecies(interventionIds: number[]): Promise<Record<number, any[]>> {
  //   if (interventionIds.length === 0) return {};

  //   const speciesData = await this.db
  //     .select({
  //       interventionId: interventionSpecies.interventionId,
  //       id: interventionSpecies.id,
  //       scientificSpeciesId: interventionSpecies.scientificSpeciesId,
  //       scientificName: scientificSpecies.scientificName,
  //       commonName: scientificSpecies.commonName,
  //       plantedCount: interventionSpecies.plantedCount,
  //       targetCount: interventionSpecies.targetCount,
  //       survivalRate: interventionSpecies.survivalRate,
  //       notes: interventionSpecies.notes,
  //     })
  //     .from(interventionSpecies)
  //     .leftJoin(scientificSpecies, eq(interventionSpecies.scientificSpeciesId, scientificSpecies.id))
  //     .where(and(
  //       inArray(interventionSpecies.interventionId, interventionIds),
  //       sql`${interventionSpecies.deletedAt} IS NULL`
  //     ));

  //   const grouped: Record<number, any[]> = {};
  //   for (const species of speciesData) {
  //     if (!grouped[species.interventionId]) {
  //       grouped[species.interventionId] = [];
  //     }
  //     grouped[species.interventionId].push(species);
  //   }

  //   return grouped;
  // }

  // private mapRowToIntervention(row: any, projectId?: number): CreateInterventionDto {
  //   // Map Excel row to CreateInterventionDto
  //   return {
  //     hid: row['HID'] || row['hid'] || '',
  //     type: row['Type'] || row['type'] || '',
  //     idempotencyKey: `${row['HID'] || row['hid']}_${Date.now()}`,
  //     projectId: projectId || row['Project ID'] || row['projectId'],
  //     projectSiteId: row['Site ID'] || row['siteId'],
  //     parentInterventionId: row['Parent Intervention ID'] || row['parentInterventionId'],
  //     registrationDate: row['Registration Date'] || row['registrationDate'],
  //     interventionStartDate: row['Start Date'] || row['interventionStartDate'] || row['startDate'],
  //     interventionEndDate: row['End Date'] || row['interventionEndDate'] || row['endDate'],
  //     captureMode: row['Capture Mode'] || row['captureMode'] || 'off_site',
  //     captureStatus: row['Capture Status'] || row['captureStatus'] || 'complete',
  //     location: {
  //       type: 'Point',
  //       coordinates: [
  //         parseFloat(row['Longitude'] || row['longitude'] || '0'),
  //         parseFloat(row['Latitude'] || row['latitude'] || '0')
  //       ]
  //     },
  //     originalGeometry: {
  //       type: 'Point',
  //       coordinates: [
  //         parseFloat(row['Longitude'] || row['longitude'] || '0'),
  //         parseFloat(row['Latitude'] || row['latitude'] || '0')
  //       ]
  //     },
  //     latitude: parseFloat(row['Latitude'] || row['latitude'] || '0'),
  //     longitude: parseFloat(row['Longitude'] || row['longitude'] || '0'),
  //     geometryType: 'Point',
  //     deviceLocation: row['Device Latitude'] && row['Device Longitude'] ? {
  //       latitude: parseFloat(row['Device Latitude']),
  //       longitude: parseFloat(row['Device Longitude']),
  //       accuracy: parseFloat(row['Device Accuracy'] || '0'),
  //       altitude: parseFloat(row['Device Altitude'] || '0'),
  //     } : undefined,
  //     treesPlanted: parseInt(row['Trees Planted'] || row['treesPlanted'] || '0'),
  //     sampleTreeCount: parseInt(row['Sample Tree Count'] || row['sampleTreeCount'] || '0'),
  //     allocationPriority: row['Allocation Priority'] || row['allocationPriority'] || 'manual',
  //     description: row['Description'] || row['description'],
  //     tag: row['Tag'] || row['tag'],
  //     status: row['Status'] || row['status'] || 'active',
  //     statusReason: row['Status Reason'] || row['statusReason'],
  //     isPrivate: Boolean(row['Is Private'] || row['isPrivate'] || false),
  //     metadata: row['Metadata'] ? JSON.parse(row['Metadata']) : undefined,
  //   };
  // }

  // private async validateInterventionData(data: CreateInterventionDto): Promise<void> {
  //   // Validate required fields
  //   if (!data.hid) throw new Error('HID is required');
  //   if (!data.type) throw new Error('Type is required');
  //   if (!data.interventionStartDate) throw new Error('Start date is required');
  //   if (!data.interventionEndDate) throw new Error('End date is required');
  //   if (!data.latitude || !data.longitude) throw new Error('Coordinates are required');

  //   // Validate coordinate ranges
  //   if (data.latitude < -90 || data.latitude > 90) {
  //     throw new Error('Latitude must be between -90 and 90');
  //   }
  //   if (data.longitude < -180 || data.longitude > 180) {
  //     throw new Error('Longitude must be between -180 and 180');
  //   }

  //   // Validate dates
  //   const startDate = new Date(data.interventionStartDate);
  //   const endDate = new Date(data.interventionEndDate);
  //   if (endDate < startDate) {
  //     throw new Error('End date must be after start date');
  //   }

  //   // Additional validations can be added here
  // }
}
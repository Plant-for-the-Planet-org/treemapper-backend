// src/modules/interventions/interventions.service.ts
import { Injectable, NotFoundException, BadRequestException, ConflictException } from '@nestjs/common';
import { and, eq, desc, asc, like, gte, lte, inArray, sql, count } from 'drizzle-orm';
import { DrizzleService } from '../database/drizzle.service';
import {
  interventions,
  scientificSpecies,
  projects,
  sites,
  users
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

  async create(createInterventionDto: CreateInterventionDto, membership: ProjectGuardResponse): Promise<any> {
    try {
      let newHID = generateParentHID();
      let projectSiteId: null | number = null;

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
        projectSiteId = site[0].id;
      }

      const sampleTreeCount = createInterventionDto.sampleTreeCount || 0;
      const geometryType = createInterventionDto.geometry.type || 'Point';


      const geometry = this.getGeoJSONForPostGIS(createInterventionDto.geometry);
      const locationValue = sql`ST_SetSRID(ST_GeomFromGeoJSON(${JSON.stringify(geometry)}), 4326)`;
      let plantedSpecies: { uid: string; plantedCount: any; scientificSpeciesId?: any; isUnknown?: boolean; customSpeciesName?: string }[] = [];
      const uid = generateUid('inv');
      if (interventionConfig.allowsSpecies) {
        if (interventionConfig.allowsMultipleSpecies) {
          if (createInterventionDto.plantedSpecies && createInterventionDto.plantedSpecies.length > 0) {
            // Validate that all scientific species exist
            const checkIfSciExists = createInterventionDto.plantedSpecies.filter(s => s.scientificSpeciesId);
            const speciesIds = checkIfSciExists.map(s => s.scientificSpeciesId);
            if (speciesIds.length > 0) {
              const existingSpecies = await this.drizzleService.db
                .select()
                .from(scientificSpecies)
                .where(inArray(scientificSpecies.id, speciesIds));

              if (existingSpecies.length !== speciesIds.length) {
                throw new BadRequestException('One or more species not found');
              }
            }

            // Insert intervention species
            // const speciesData = createInterventionDto.plantedSpecies.map(species => {
            //   const payload = {
            //     uid: generateUid('invspc'),
            //     plantedCount: species.treeCount
            //   }
            //   if (species.scientificSpeciesId) {
            //     payload['scientificSpeciesId'] = species.scientificSpeciesId;
            //   }
            //   if (species.otherSpecies) {
            //     payload['isUnknown'] = true;
            //     payload['customSpeciesName'] = 'Unknown'
            //   }
            //   return payload
            // });
            // plantedSpecies = speciesData
          }
        } else {
          // Single-species handling
          if (createInterventionDto.otherSpecies) {
            const speciesData = {
              uid: generateUid('invspc'),
              isUnknown: true,
              customSpeciesName: 'Unknown',
              plantedCount: 1
            };
          }

          if (createInterventionDto.scientificSpecies) {
            const existingSpecies = await this.drizzleService.db
              .select()
              .from(scientificSpecies)
              .where(eq(scientificSpecies.id, createInterventionDto.scientificSpecies))
              .limit(1);

            if (existingSpecies.length === 0) {
              throw new BadRequestException('Scientific species not found');
            }

            const speciesData = {
              uid: generateUid('invspc'),
              scientificSpeciesId: createInterventionDto.scientificSpecies,
              plantedCount: 1
            };
          }
        }
      }

      const interventionData = {
        uid: uid,
        hid: newHID,
        discr: 'intervention' as const,
        userId: membership.userId,
        idempotencyKey: generateUid('inv'), //Dosomething
        type: createInterventionDto.type,
        interventionStartDate: new Date(createInterventionDto.interventionStartDate),
        interventionEndDate: new Date(createInterventionDto.interventionEndDate),
        captureMode: 'on_site' as const, //dosomething
        captureStatus: sampleTreeCount > 0 ? CaptureStatus.INCOMPLETE : CaptureStatus.COMPLETE,
        location: locationValue,
        originalGeometry: createInterventionDto.geometry,
        sampleTreeCount: sampleTreeCount || null,
        projectId: membership.projectId,
        deviceLocation: createInterventionDto.deviceLocation,
        metaData: createInterventionDto.metadata || null,
        projectSiteId: projectSiteId || null,
        geometryType: geometryType,
        registrationDate: new Date(createInterventionDto.registrationDate),
        treesPlanted: createInterventionDto.sampleTreeCount || null,
        scientificSpeciesId: createInterventionDto.scientificSpecies,
        otherSpecies: createInterventionDto.otherSpecies,
        tag: createInterventionDto.tag,
        height: createInterventionDto.height,
        width: createInterventionDto.width,
        latitude: createInterventionDto.latitude,
        longitude: createInterventionDto.longitude,
        has_records: false,
        plantedSpecies: plantedSpecies
      };

      // Create intervention
      const result = await this.drizzleService.db
        .insert(interventions)
        .values(interventionData)
        .returning();

      const newIntervention = Array.isArray(result) ? result[0] : undefined;
      if (!newIntervention) {
        throw new Error('Failed to create intervention');
      }

      console.log('New intervention created:', newIntervention);

      // Handle species creation based on intervention configuration

      return { uid: newIntervention.uid, hid: newIntervention.hid } as InterventionResponseDto;
    } catch (error) {
      throw new BadRequestException(`Failed to create intervention: ${error.message}`);
    }
  }

  async findAll(membership: ProjectGuardResponse): Promise<any> {
    const AllInterventions = await this.drizzleService.db
      .select()
      .from(interventions)
      .where(eq(interventions.projectId, membership.projectId))
      .leftJoin(users, eq(interventions.userId, membership.userId))
    return AllInterventions
  }
}
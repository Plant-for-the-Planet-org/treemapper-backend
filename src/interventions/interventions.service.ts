// src/modules/interventions/interventions.service.ts
import { Injectable, NotFoundException, BadRequestException, ConflictException } from '@nestjs/common';
import { and, eq, desc, asc, like, gte, lte, inArray, sql, count, isNull, or } from 'drizzle-orm';
import { DrizzleService } from '../database/drizzle.service';
import {
  interventions,
  sites,
  users,
  treeRecords,
  trees,
} from '../database/schema/index';
import {
  InterventionResponseDto,
  CreateInterventionBulkDto
} from './dto/interventions.dto';
import { generateUid } from 'src/util/uidGenerator';
import { generateParentHID } from 'src/util/hidGenerator';
import { ProjectGuardResponse } from 'src/projects/projects.service';
import { interventionConfigurationSeedData } from 'src/database/schema/interventionConfig';
import { error } from 'console';


type InterventionStatus = "planned" | "active" | "completed" | "failed" | "on_hold" | "cancelled";

interface FindAllInterventionsParams {
  page?: number;
  limit?: number;
  status?: InterventionStatus;
  siteId?: number;
}

export interface PaginatedInterventionsResponse {
  data: any[];
  pagination: {
    page: number;
    limit: number;
    total: number;
    totalPages: number;
    hasNext: boolean;
    hasPrev: boolean;
  };
}

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

  async createNewInterventionWeb(createInterventionDto: any, membership: ProjectGuardResponse): Promise<any> {
    try {
      let newHID = generateParentHID();
      let projectSiteId: null | number = null;
      if (createInterventionDto.plantProjectSite) {
        const site = await this.drizzleService.db
          .select({ id: sites.id })
          .from(sites)
          .where(eq(sites.uid, createInterventionDto.plantProjectSite))
          .limit(1);
        if (site.length === 0) {
          throw new NotFoundException('Site not found');
        }
        projectSiteId = site[0].id;
      }
      const geometryType = createInterventionDto.geometry.type || 'Point';
      const geometry = this.getGeoJSONForPostGIS(createInterventionDto.geometry);
      const locationValue = sql`ST_SetSRID(ST_GeomFromGeoJSON(${JSON.stringify(geometry)}), 4326)`;
      const uid = generateUid('inv');
      const interventionData = {
        uid: uid,
        hid: newHID,
        userId: membership.userId,
        projectId: membership.projectId,
        projectSiteId: projectSiteId || null,
        idempotencyKey: generateUid('ide'),
        type: createInterventionDto.type,
        registrationDate: new Date(createInterventionDto.registrationDate),
        interventionStartDate: new Date(createInterventionDto.interventionStartDate),
        interventionEndDate: new Date(createInterventionDto.interventionEndDate),
        location: locationValue,
        originalGeometry: createInterventionDto.geometry,
        captureMode: createInterventionDto.captureMode,
        captureStatus: CaptureStatus.COMPLETE,
        metaData: createInterventionDto.metadata || null,
        geometryType: geometryType,
        image: createInterventionDto.image || null,
        treeCount: createInterventionDto.sampleTreeCount || null,
        tag: createInterventionDto.tag,
        has_records: false,
        species: createInterventionDto.species || [],
      }
      const result = await this.drizzleService.db
        .insert(interventions)
        .values(interventionData)
        .returning();
      if (!result) {
        throw new Error('Failed to create intervention');
      }

      if (createInterventionDto.type === 'single-tree-registration') {
        const payload = {
          hid: generateParentHID(),
          uid: generateUid('tree'),
          interventionId: result[0].id,
          interventionSpeciesId: createInterventionDto.species[0].uid,
          speciesName: createInterventionDto.species[0].speciesName,
          isUnknown: createInterventionDto.species[0].isUnknown,
          createdById: membership.userId,
          tag: createInterventionDto.tag,
          treeType: 'single' as const,
          altitude: null,
          accuracy: null,
          location: locationValue,
          originalGeometry: createInterventionDto.geometry,
          height: createInterventionDto.height,
          width: createInterventionDto.width,
          plantingDate: new Date(createInterventionDto.interventionStartDate),
          metadata: createInterventionDto.metadata || null,
        }
        const singleResult = await this.drizzleService.db
          .insert(trees)
          .values(payload)
          .returning();
        if (!singleResult) {
          throw new Error('Failed to create singleResult intervention');
        }
      }
      return {} as InterventionResponseDto;
    } catch (error) {
      throw new BadRequestException(`Failed to create intervention: ${error.message}`);
    }
  }



  async bulkInterventionUpload(createInterventionDto: CreateInterventionBulkDto[], membership: ProjectGuardResponse): Promise<any> {
    try {
      let projectSiteId: null | number = null;
      if (createInterventionDto[0].plantProjectSite && !createInterventionDto[0].plantProject) {
        throw new NotFoundException('Project not found');
      }
      if (createInterventionDto[0].plantProjectSite) {
        const site = await this.drizzleService.db
          .select()
          .from(sites)
          .where(eq(sites.uid, createInterventionDto[0].plantProjectSite ?? ''))
          .limit(1);
        if (site.length === 0) {
          throw new NotFoundException('Site not found');
        }
        projectSiteId = site[0].id;
      }
      console.log("createInterventionDto s", createInterventionDto)

      const tranformedData: any = [];
      createInterventionDto.forEach(async (el: CreateInterventionBulkDto) => {
        let newHID = generateParentHID();
        let failed = false;
        let failedReason: string[] = []
        const interventionConfig = interventionConfigurationSeedData.find(p => p.interventionType === el.type);
        if (!interventionConfig) {
          throw 'One or more intervention dont have valid type'
        }
        if (el.species && el.species.length === 0) {
          failed = true;
          failedReason = ['No Species Data found'];
        }
        const geometry = this.getGeoJSONForPostGIS(el.geometry);
        const locationValue = sql`ST_SetSRID(ST_GeomFromGeoJSON(${JSON.stringify(geometry)}), 4326)`;
        tranformedData.push({
          uid: el.clientId,
          hid: newHID,
          userId: membership.userId,
          idempotencyKey: generateUid('ide'),
          type: el.type,
          interventionStartDate: new Date(el.interventionStartDate),
          interventionEndDate: new Date(el.interventionEndDate),
          registrationDate: new Date(),
          captureMode: 'external' as const,
          captureStatus: CaptureStatus.COMPLETE,
          location: locationValue,
          originalGeometry: el.geometry,
          projectId: membership.projectId,
          projectSiteId: projectSiteId || null,
          metaData: el.metadata || null,
          geometryType: 'Point',
          treesPlanted: el.type === 'single-tree-registration' ? 1 : el.treesPlanted || 1,
          species: el.species || [],
        })
      })
      console.log("tranformedData s", tranformedData)

      const finalInterventionIDMapping: any = []
      try {
        const result = await this.drizzleService.db
          .insert(interventions)
          .values(tranformedData)
          .returning({ id: interventions.id, uid: interventions.uid });
        console.log("SKDLc", result)
        const finalParentIntervention = result.map(el => ({ id: el.id, uid: el.uid, success: true, error: false }))
        finalInterventionIDMapping.push(...finalParentIntervention)
      } catch (error) {
        const chunkResults = await this.insertChunkIndividually(tranformedData);
        finalInterventionIDMapping.push(...chunkResults.filter(res => res.error === null));
      }
      const singleTreeUpload: any = []
      createInterventionDto.forEach(el => {
        if (el.type === 'single-tree-registration') {
          const parentId = finalInterventionIDMapping.find(obj => obj.uid === el.clientId);
          if (parentId && parentId.id && el.species.length > 0) {
            const geometry = this.getGeoJSONForPostGIS(el.geometry);
            const locationValue = sql`ST_SetSRID(ST_GeomFromGeoJSON(${JSON.stringify(geometry)}), 4326)`;
            singleTreeUpload.push({
              hid: generateParentHID(),
              uid: generateUid('tree'),
              interventionId: parentId.id,
              interventionSpeciesId: el.species[0].uid,
              speciesName: el.species[0].speciesName,
              isUnknown: true,
              createdById: membership.userId,
              tag: el.tag || null,
              treeType: 'single' as const,
              altitude: null,
              accuracy: null,
              location: locationValue,
              originalGeometry: el.geometry,
              height: el.height,
              width: el.width,
              plantingDate: new Date(el.interventionStartDate),
              metadata: el.metadata || null,
            })
          }
        }
      })
      try {
        await this.drizzleService.db
          .insert(trees)
          .values(singleTreeUpload)
          .returning({ id: trees.id, uid: trees.uid });
      } catch (error) {
        console.log("LSKDc s", error)
        await this.insertTreeChunkIndividually(singleTreeUpload);
      }
      const failedIntervention = finalInterventionIDMapping.filter(el => !el.success)
      return {
        totalProccessed: finalInterventionIDMapping.length,
        passed: finalInterventionIDMapping.length - failedIntervention.length,
        failed: failedIntervention.length,
        failedInterventionUid: failedIntervention
      }
    } catch (error) {
      console.log("LSKDc", error)
      throw new BadRequestException(`Failed to create interventions: ${error.message}`);
    }
  }

  private async insertChunkIndividually(chunk: any[]) {
    const interventionIds: any = []
    for (let j = 0; j < chunk.length; j++) {
      try {
        const result = await this.drizzleService.db
          .insert(interventions)
          .values(chunk[j])
          .returning();

        interventionIds.push({
          id: result[0].id,
          uid: chunk[j].uid,
          success: true,
          error: null
        });
      } catch (error) {
        interventionIds.push({
          id: null,
          uid: chunk[j].uid,
          success: false,
          error: JSON.stringify(error)
        });
      }
    }
    return interventionIds;
  }

  private async insertTreeChunkIndividually(chunk: any[]) {
    const interventionIds: any = []
    for (let j = 0; j < chunk.length; j++) {
      try {
        const result = await this.drizzleService.db
          .insert(trees)
          .values(chunk[j])
          .returning();

        interventionIds.push({
          id: result[0].id,
          uid: chunk[j].uid,
          success: true,
          error: null
        });
      } catch (error) {
        interventionIds.push({
          id: null,
          uid: chunk[j].uid,
          success: false,
          error: JSON.stringify(error)
        });
      }
    }
    return interventionIds;
  }



  async findAll(
    membership: ProjectGuardResponse,
    params: FindAllInterventionsParams = {}
  ): Promise<PaginatedInterventionsResponse> {
    const {
      page = 1,
      limit = 20,
      status,
      siteId
    } = params;

    // Calculate offset for pagination
    const offset = (page - 1) * limit;

    // Build where conditions
    const whereConditions = [
      eq(interventions.projectId, membership.projectId),
      // Only include non-deleted interventions
      isNull(interventions.deletedAt)
    ];

    // Add status filter if provided
    // if (status) {
    //   whereConditions.push(eq(interventions.interventionStatus, status));
    // }

    // Add site filter if provided (if no siteId, it includes all sites)
    if (siteId) {
      whereConditions.push(eq(interventions.projectSiteId, siteId));
    }

    // Get total count for pagination
    const totalResult = await this.drizzleService.db
      .select({
        count: sql<number>`COUNT(*)::int`
      })
      .from(interventions)
      .where(and(...whereConditions));

    const total = totalResult[0]?.count || 0;

    // Get paginated interventions with basic info first
    const allInterventions = await this.drizzleService.db
      .select({
        id: interventions.id,
        uid: interventions.uid,
        hid: interventions.hid,
        type: interventions.type,
        interventionStatus: interventions.interventionStatus,
        originalGeometry: interventions.originalGeometry,
        treeCount: interventions.treeCount,
        registrationDate: interventions.registrationDate,
        interventionStartDate: interventions.interventionStartDate,
        interventionEndDate: interventions.interventionEndDate,
        description: interventions.description,
        projectSiteId: interventions.projectSiteId,
        captureMode: interventions.captureMode,
        captureStatus: interventions.captureStatus,
        isPrivate: interventions.isPrivate,
        createdAt: interventions.createdAt,
        updatedAt: interventions.updatedAt,
        // Add user info
        user: {
          uid: users.uid,
          displayName: users.displayName,
          firstname: users.firstname,
          lastname: users.lastname,
          image: users.image
        },
        // Add site info if exists
        site: {
          uid: sites.uid,
          name: sites.name,
          status: sites.status
        }
      })
      .from(interventions)
      .leftJoin(users, eq(interventions.userId, users.id))
      .leftJoin(sites, eq(interventions.projectSiteId, sites.id))
      .where(and(...whereConditions))
      .orderBy(desc(interventions.registrationDate))
      .limit(limit)
      .offset(offset);

    // Get intervention IDs for fetching related data
    const interventionIds = allInterventions.map(intervention => intervention.id);

    // Fetch intervention species for all interventions
    // const interventionSpeciesData = interventionIds.length > 0 ? await this.drizzleService.db
    //   .select({
    //     interventionId: interventionSpecies.interventionId,
    //     uid: interventionSpecies.uid,
    //     scientificSpeciesId: interventionSpecies.scientificSpeciesId,
    //     scientificSpeciesUid: interventionSpecies.scientificSpeciesUid,
    //     speciesName: interventionSpecies.speciesName,
    //     isUnknown: interventionSpecies.isUnknown,
    //     otherSpeciesName: interventionSpecies.otherSpeciesName,
    //     count: interventionSpecies.count,
    //     createdAt: interventionSpecies.createdAt,
    //     updatedAt: interventionSpecies.updatedAt,
    //     // Include scientific species details
    //     scientificSpecies: {
    //       uid: scientificSpecies.uid,
    //       scientificName: scientificSpecies.scientificName,
    //       commonName: scientificSpecies.commonName,
    //       family: scientificSpecies.family,
    //       genus: scientificSpecies.genus
    //     }
    //   })
    //   .from(interventionSpecies)
    //   .leftJoin(scientificSpecies, eq(interventionSpecies.scientificSpeciesId, scientificSpecies.id))
    //   .where(
    //     and(
    //       inArray(interventionSpecies.interventionId, interventionIds),
    //       isNull(interventionSpecies.deletedAt),
    //       isNull(scientificSpecies.deletedAt)
    //     )
    //   ) : [];

    // Fetch trees and their records for all interventions
    const treesWithRecords = interventionIds.length > 0 ? await this.drizzleService.db
      .select({
        interventionId: trees.interventionId,
        tree: {
          id: trees.id,
          uid: trees.uid,
          hid: trees.hid,
          tag: trees.tag,
          treeType: trees.treeType,
          status: trees.status,
          statusReason: trees.statusReason,
          plantingDate: trees.plantingDate,
          height: trees.height,
          width: trees.width,
          lastMeasurementDate: trees.lastMeasurementDate,
          nextMeasurementDate: trees.nextMeasurementDate,
          createdAt: trees.createdAt,
          updatedAt: trees.updatedAt
        },
        treeRecord: {
          uid: treeRecords.uid,
          recordType: treeRecords.recordType,
          recordedAt: treeRecords.recordedAt,
          height: treeRecords.height,
          width: treeRecords.width,
          healthScore: treeRecords.healthScore,
          vitalityScore: treeRecords.vitalityScore,
          structuralIntegrity: treeRecords.structuralIntegrity,
          previousStatus: treeRecords.previousStatus,
          newStatus: treeRecords.newStatus,
          statusReason: treeRecords.statusReason,
          findings: treeRecords.findings,
          findingsSeverity: treeRecords.findingsSeverity,
          notes: treeRecords.notes,
          isPublic: treeRecords.isPublic,
          createdAt: treeRecords.createdAt
        },
        recordedBy: {
          uid: users.uid,
          displayName: users.displayName,
          firstname: users.firstname,
          lastname: users.lastname
        }
      })
      .from(trees)
      .leftJoin(treeRecords, eq(trees.id, treeRecords.treeId))
      .leftJoin(users, eq(treeRecords.recordedById, users.id))
      .where(
        and(
          inArray(trees.interventionId, interventionIds),
          isNull(trees.deletedAt),
          or(
            isNull(treeRecords.deletedAt),
            isNull(treeRecords.uid) // Handle case where no records exist
          )
        )
      )
      .orderBy(trees.id, desc(treeRecords.recordedAt)) : [];

    // Group and structure the data
    const interventionsWithRelatedData = allInterventions.map(intervention => {
      // Group species by intervention
      // const species = interventionSpeciesData.filter(
      //   s => s.interventionId === intervention.id
      // );

      // Group trees and their records by intervention
      const treesData = treesWithRecords.filter(
        t => t.interventionId === intervention.id
      );

      // Structure trees with their records
      const treesMap = new Map();
      treesData.forEach(item => {
        if (!treesMap.has(item.tree.id)) {
          treesMap.set(item.tree.id, {
            ...item.tree,
            records: []
          });
        }

        // Only add record if it exists and has a uid
        if (item.treeRecord?.uid) {
          treesMap.get(item.tree.id).records.push({
            ...item.treeRecord,
            recordedBy: item.recordedBy
          });
        }
      });

      const trees = Array.from(treesMap.values());

      return {
        ...intervention,
        species: [],
        trees
      };
    });

    // Calculate pagination metadata
    const totalPages = Math.ceil(total / limit);
    const hasNext = page < totalPages;
    const hasPrev = page > 1;

    return {
      data: interventionsWithRelatedData,
      pagination: {
        page,
        limit,
        total,
        totalPages,
        hasNext,
        hasPrev
      }
    };
  }
}
import { BadRequestException, HttpException, HttpStatus, Injectable, Logger } from '@nestjs/common';
import { HttpService } from '@nestjs/axios';
import { async, firstValueFrom, generate } from 'rxjs';



import {
  userMigrations,
  migrationLogs,
  projects,
  sites,
  interventions,
  projectSpecies,
  projectMembers,
  scientificSpecies,
  FlagReasonEntry,
  trees
} from '../database/schema/index';
import { eq, inArray, sql } from 'drizzle-orm';
import { DrizzleService } from 'src/database/drizzle.service';
import { generateUid } from 'src/util/uidGenerator';
import { UsersService } from 'src/users/users.service';
import { ProjectsService } from 'src/projects/projects.service';
import { createProjectTitle, removeDuplicatesByScientificSpeciesId } from 'src/common/utils/projectName.util';
import booleanValid from '@turf/boolean-valid';
import { nodeKeyToRedisOptions } from 'ioredis/built/cluster/util';
import { generateParentHID } from 'src/util/hidGenerator';




interface GeoJSONValidationResult {
  isValid: boolean;
  geoJSONType: 'Point' | 'LineString' | 'Polygon' | 'MultiPoint' | 'MultiLineString' | 'MultiPolygon' | 'GeometryCollection' | null;
  validatedGeoJSON: any | null;
}

interface LogEntry {
  uid: string,
  userMigrationId: number,
  level: 'info' | 'warning' | 'error',
  message: string,
  entity: 'users' | 'projects' | 'interventions' | 'species' | 'sites' | 'images',
  stackTrace?: string
}

interface CreatePointGeoJSONResult {
  validatedGeoJSON: any | null;
  error: string | null;
}



export interface MigrationProgress {
  userId: number;
  currentStep: string;
  completed: boolean;
  error?: string;
  progress: {
    user: boolean;
    projects: boolean;
    sites: boolean;
    species: boolean;
    interventions: boolean;
    images: boolean;
  };
}
export interface MigrationCheckResult {
  migrationNeeded: boolean;
  planetId: string
}

@Injectable()
export class MigrationService {
  private readonly logger = new Logger(MigrationService.name);
  private currentOperationLogs: LogEntry[] = [];

  constructor(
    private drizzleService: DrizzleService,
    private httpService: HttpService,
    private usersetvice: UsersService,
    private projectService: ProjectsService,
  ) { }


  async checkUserInttc(accessToken: string, userId: number): Promise<MigrationCheckResult> {
    try {
      const response = await firstValueFrom(
        this.httpService.get('https://app.plant-for-the-planet.org/app/profile', {
          headers: {
            Authorization: accessToken,
          },
          validateStatus: (status) => {
            // Accept both 200 and 303 as valid responses
            return status === 200 || status === 303;
          },
        })
      );

      // If status is 303, return migrate: false
      if (response.status === 303) {
        await this.usersetvice.migrateSuccess(userId)
        return { migrationNeeded: false, planetId: '' };
      }


      // If status is 200, return migrate: true
      return { migrationNeeded: true, planetId: response.data.id };

    } catch (error) {
      // Handle network errors or other HTTP errors (not 200/303)
      if (error.response) {
        // The request was made and the server responded with a status code
        // that falls out of the range of 2xx and is not 303
        throw new HttpException(
          `External API returned status: ${error.response.status}`,
          HttpStatus.BAD_GATEWAY
        );
      } else if (error.request) {
        // The request was made but no response was received
        throw new HttpException(
          'No response from external API',
          HttpStatus.SERVICE_UNAVAILABLE
        );
      } else {
        // Something happened in setting up the request
        throw new HttpException(
          'Error setting up request to external API',
          HttpStatus.INTERNAL_SERVER_ERROR
        );
      }
    }
  }

  async getMigrationStatus(userId: number): Promise<any> {
    const migrationRecord = await this.drizzleService.db
      .select()
      .from(userMigrations)
      .where(eq(userMigrations.userId, userId))
      .limit(1);
    if (migrationRecord.length === 0) {
      return {
        migrationFound: false,
      }
    }
    const record = migrationRecord[0];
    return {
      migrationFound: true,
      currentStep: record.status,
      updatedAt: record.updatedAt,
      errorMessage: record.errorMessage,
      userMigrated: record.migratedEntities?.user,
      projectMigrated: record.migratedEntities?.projects,
      speciesMigrated: record.migratedEntities?.species,
      sitesMigrated: record.migratedEntities?.sites,
      interventionMigrated: record.migratedEntities?.interventions,
      imagesMigrated: record.migratedEntities?.images,
    };
  }

  async startUserMigration(
    userId: number,
    planetId: string,
    email: string,
    authToken: string
  ): Promise<void> {
    let userMigrationRecord;
    try {
      this.logger.log('Migrating started')
      userMigrationRecord = await this.createMigrationRecord(userId, planetId, email);

      if (userMigrationRecord.status === 'completed') {
        this.logger.log('Migrating already completed')
        this.addLog(userMigrationRecord.id, 'info', 'Migration already done', 'users');
        this.logMigration()
        return;
      }

      if (userMigrationRecord.status === 'failed') {
        await this.continueMigration(userMigrationRecord.id)
        this.addLog(userMigrationRecord.id, 'info', 'Migration resumed', 'users');
      }



      let stop = false;


      const personalProject = await this.drizzleService.db
        .select({ id: projects.id })
        .from(projects)
        .where(eq(projects.isPersonal, true))
        .limit(1);

      if (personalProject.length > 0) {
        this.addLog(userMigrationRecord.id, 'info', 'Persoanl Project Found', 'projects');
      } else {
        const name = email.split('@')[0]
        const projectName = createProjectTitle(name)
        const payload = {
          projectName,
          projectType: 'personal',
          "description": "This is your personal project, you can add species to it. You can invite other users to this project.",
        }
        this.addLog(userMigrationRecord.id, 'warning', `Personal project not found. Created new`, 'projects');
        const newPersonalProject = await this.projectService.createPersonalProject(payload, userId)
        if (newPersonalProject.statusCode === 201 || newPersonalProject.statusCode === 200) {
          this.addLog(userMigrationRecord.id, 'info', 'Persoanl Project Created', 'projects');
        } else {
          stop = true
        }
      }


      if (stop) {
        this.addLog(userMigrationRecord.id, 'error', 'Migration stopped for user and will not proceed further', 'projects');
        await this.updateMigrationProgress(userMigrationRecord.id, 'user', false, true);
        return;
      }


      // // Step 1: Migrate user
      if (!userMigrationRecord.migratedEntities.user) {
        console.log('Migrating user');
        stop = await this.migrateUserData(userId, authToken, userMigrationRecord.id);
      }

      if (stop) {
        this.addLog(userMigrationRecord.id, 'error', 'Migration stopped for user and will not proceed further', 'users');
        return;
      }


      // // Step 2: Migrate Projects
      if (!userMigrationRecord.migratedEntities.projects) {
        console.log('Migrating projects');
        stop = await this.migrateUserProjects(userId, authToken, userMigrationRecord.id);
      }


      if (stop) {
        this.addLog(userMigrationRecord.id, 'error', 'Migration stopped for project', 'projects');
        return
      }
      console.log('User project migrated');

      // // Step 3: Migrate sites
      if (!userMigrationRecord.migratedEntities.sites) {
        console.log('Migrating sites');
        stop = await this.migrateUserSites(userId, authToken, userMigrationRecord.id);
      }


      if (stop) {
        console.log('Issue in  site migration');
        this.addLog(userMigrationRecord.id, 'error', 'Migration stopped for site', 'sites');
        return
      }
      console.log('Sites  migrated');


      // Step 4: Migrate User Species
      if (!userMigrationRecord.migratedEntities.species) {
        stop = await this.migrateUserSpecies(userId, authToken, userMigrationRecord.id, email);
      }


      if (stop) {
        console.log('Issue in  species migration');
        this.addLog(userMigrationRecord.id, 'error', 'Migration stopped for species', 'species');
        return
      }
      console.log('Species  migrated');


      if (!userMigrationRecord.migratedEntities.intervention) {
        stop = await this.migrateUserInterventions(userId, authToken, userMigrationRecord.id);
      }


      if (stop) {
        console.log('Issue in  intervention migration');
        this.addLog(userMigrationRecord.id, 'error', 'Migration stopped for species', 'interventions');
        return
      }
      console.log('Intervention  migrated');




      await this.updateMigrationProgress(userMigrationRecord.id, 'images', true, false);
      await this.completeMigration(userMigrationRecord.id);
      this.addLog(userMigrationRecord.id, 'info', 'Migration completed successfully', 'images');
    } catch (error) {
      await this.handleMigrationError(userId, userMigrationRecord?.id, error);
      throw error;
    }
  }

  private getGeoJSONForPostGIS(locationInput: any): GeoJSONValidationResult {
    // Default invalid result
    const invalidResult: GeoJSONValidationResult = {
      isValid: false,
      geoJSONType: null,
      validatedGeoJSON: null
    };

    if (!locationInput) {
      return invalidResult;
    }

    let geometry: any = null;

    try {
      // If it's a Feature, extract the geometry
      if (locationInput.type === 'Feature' && locationInput.geometry) {
        geometry = locationInput.geometry;
      }
      // If it's a FeatureCollection, extract the first geometry
      else if (locationInput.type === 'FeatureCollection' &&
        locationInput.features &&
        locationInput.features.length > 0) {

        if (locationInput.features.length > 1) {
          this.logger.warn(`FeatureCollection contains ${locationInput.features.length} features. Only using the first feature.`);
        }

        if (locationInput.features[0].geometry) {
          geometry = locationInput.features[0].geometry;
        } else {
          return invalidResult;
        }
      }
      // If it's already a geometry object, use it directly
      else if (['Point', 'LineString', 'Polygon', 'MultiPoint', 'MultiLineString', 'MultiPolygon', 'GeometryCollection'].includes(locationInput.type)) {
        geometry = locationInput;
      }
      else {
        return invalidResult;
      }

      // Validate the extracted geometry
      if (!geometry) {
        return invalidResult;
      }

      // Check if geometry has required properties
      if (!geometry.type || !geometry.coordinates) {
        return invalidResult;
      }

      // Remove Z dimension if present
      geometry = this.removeZDimension(geometry);

      // Validate using Turf
      if (!booleanValid(geometry)) {
        return invalidResult;
      }

      // If we reach here, the geometry is valid
      return {
        isValid: true,
        geoJSONType: geometry.type,
        validatedGeoJSON: geometry
      };

    } catch (error) {
      this.logger.error(`GeoJSON validation error: ${error.message}`);
      return invalidResult;
    }
  }

  private removeZDimension(geometry: any): any {
    const removeZ = (coords: any): any => {
      if (Array.isArray(coords) && coords.length > 0) {
        // Check if this is a nested array (for MultiPoint, LineString, etc.)
        if (Array.isArray(coords[0])) {
          return coords.map(removeZ);
        }
        // If it's a coordinate pair/triple, keep only X and Y
        if (typeof coords[0] === 'number' && typeof coords[1] === 'number') {
          return [coords[0], coords[1]];
        }
      }
      return coords;
    };

    return {
      ...geometry,
      coordinates: removeZ(geometry.coordinates)
    };
  }

  private async createMigrationRecord(userId: number, planetId: string, email: string) {
    const existingMigrtion = await this.drizzleService.db
      .select()
      .from(userMigrations)
      .where(eq(userMigrations.userId, userId))
      .limit(1);
    if (existingMigrtion.length > 0) {
      this.addLog(existingMigrtion[0].id, 'warning', 'Migration already exists', 'users');
      this.addLog(existingMigrtion[0].id, 'info', 'Migration Resumed', 'users');
      return existingMigrtion[0];
    }
    const migrationRecord = await this.drizzleService.db
      .insert(userMigrations)
      .values({
        uid: generateUid('mgr'),
        userId: userId,
        planetId,
        status: 'in_progress',
        migratedEntities: {
          user: false,
          projects: false,
          sites: false,
          interventions: false,
          species: false,
          images: false,
        }
      })
      .returning();
    this.addLog(migrationRecord[0].id, 'info', 'Migration started', 'users');
    return migrationRecord[0];
  }

  private async migrateUserData(userId: number, authToken: string, migrationId: number): Promise<boolean> {
    try {
      this.addLog(migrationId, 'info', 'Starting user data migration', 'users');

      const userResponse = await this.makeApiCall(`/app/profile`, authToken);
      if (!userResponse || userResponse === null) {
        await this.updateMigrationProgress(migrationId, 'user', false, true);
        this.addLog(migrationId, 'error', `User migration failed. No response recieved`, 'users');
        return true;
      }
      const oldUserData = userResponse.data;

      const transformedUser = this.transformUserData(oldUserData, userId);
      await this.usersetvice.update(userId, transformedUser).catch(async () => {
        await this.updateMigrationProgress(migrationId, 'user', false, true);
        this.addLog(migrationId, 'error', `User migration stopped while wrtiting to db`, 'users', JSON.stringify(transformedUser));
        throw ''
      })

      await this.updateMigrationProgress(migrationId, 'user', true);
      this.addLog(migrationId, 'info', 'User data migration completed', 'users');
      return false;
    } catch (error) {
      await this.updateMigrationProgress(migrationId, 'user', false, true);
      this.addLog(migrationId, 'error', `User migration failed`, 'users', JSON.stringify(error.stack));
      return true;
    }
  }

  private async continueMigration(migrationId: number): Promise<void> {
    await this.drizzleService.db
      .update(userMigrations)
      .set({
        status: 'in_progress',
        migrationCompletedAt: new Date()
      })
      .where(eq(userMigrations.id, migrationId));
  }

  private transformUserData(oldUserData: any, userId: number): any {
    const transformedUser = {
      uid: oldUserData.id, // Use old ID as UID
      firstname: oldUserData.firstname || null,
      lastname: oldUserData.lastname || null,
      displayName: oldUserData.displayName || null,
      image: oldUserData.image || '',
      slug: oldUserData.slug || null,
      type: oldUserData.type,
      country: oldUserData.country,
      url: oldUserData.url,
      supportPin: oldUserData.supportPin,
      isPrivate: oldUserData.isPrivate || false,
      bio: oldUserData.bio || null,
      locale: oldUserData.locale || 'en',
      isActive: true,
      lastLoginAt: null,
      createdAt: new Date(oldUserData.created) || new Date(),
      updatedAt: new Date(),
      deletedAt: null,
      migratedAt: new Date(),
      planetRecord: true
    };
    return transformedUser;
  }

  private addLog(mgId: number,
    level: 'info' | 'warning' | 'error',
    message: string,
    entity: 'users' | 'projects' | 'interventions' | 'species' | 'sites' | 'images',
    stackTrace?: any) {
    this.currentOperationLogs.push({
      uid: generateUid('log'),
      userMigrationId: mgId,
      level,
      message,
      entity,
      stackTrace
    });
  }

  private async flushLogs() {
    if (this.currentOperationLogs.length > 0) {
      this.currentOperationLogs = [];
    }
  }

  private async handleMigrationError(userId: number, migrationId: number, error: any): Promise<void> {
    if (migrationId) {
      await this.drizzleService.db
        .update(userMigrations)
        .set({
          status: 'failed',
          errorMessage: error.message
        })
        .where(eq(userMigrations.id, migrationId));
      this.logMigration()
    }
  }

  private async logMigration(): Promise<void> {
    try {
      if (this.currentOperationLogs.length > 0) {
        await this.drizzleService.db.insert(migrationLogs).values(this.currentOperationLogs);
        this.flushLogs()
      }
    } catch (error) {
      this.logger.error(`Failed to log migration: ${error.message}`);
    }
  }

  private async updateMigrationProgress(migrationId: number, entity: keyof MigrationProgress['progress'], completed: boolean, stop?: boolean): Promise<void> {
    const currentRecord = await this.drizzleService.db
      .select()
      .from(userMigrations)
      .where(eq(userMigrations.id, migrationId))
      .limit(1);

    if (currentRecord.length > 0) {
      const updatedEntities = {
        ...currentRecord[0].migratedEntities,
        [entity]: completed
      };

      await this.drizzleService.db
        .update(userMigrations)
        .set({
          migratedEntities: {
            'user': updatedEntities.user || false,
            'projects': updatedEntities.projects || false,
            'sites': updatedEntities.sites || false,
            'interventions': updatedEntities.interventions || false,
            'images': updatedEntities.images || false,
            "species": updatedEntities.species || false,
          },
          status: stop ? 'failed' : 'in_progress'
        })
        .where(eq(userMigrations.id, migrationId));
      await this.logMigration()
    }
  }

  private async makeApiCall(endpoint: string, authToken: string, retries = 3): Promise<any> {
    const baseUrl = process.env.OLD_BACKEND_URL
    for (let attempt = 1; attempt <= retries; attempt++) {
      try {
        const response = await firstValueFrom(
          this.httpService.get(`${baseUrl}${endpoint} `, {
            headers: {
              'Authorization': `Bearer ${authToken} `,
              'Content-Type': 'application/json',
              "User-Agent": 'treemapper'
            },
            timeout: 30000 // 30 second timeout
          })
        );

        return response;
      } catch (error) {
        if (attempt === retries) {
          return null
        }
        // Wait before retry (exponential backoff)
        await new Promise(resolve => setTimeout(resolve, Math.pow(2, attempt) * 1000));
      }
    }
  }

  private async migrateUserProjects(userId: number, authToken: string, migrationId: number): Promise<boolean> {
    try {
      this.addLog(migrationId, 'info', 'Starting projects migration', 'projects');
      const projectsResponse = await this.makeApiCall(`/app/profile/projects?_scope=extended`, authToken);
      console.log("Response", projectsResponse)
      if (!projectsResponse || projectsResponse === null) {
        this.addLog(migrationId, 'error', `Project migration failed. No response recieved`, 'projects');
        await this.updateMigrationProgress(migrationId, 'projects', false, true);
        return true;
      }
      const oldProjects = projectsResponse.data;
      console.log("step 1")

      let stop = false;
      for (const oldProject of oldProjects) {
        if (stop) {
          console.log("step 2")

          this.addLog(migrationId, 'error', `Project loop stopped`, 'projects');
          return true
        }
        try {
          console.log("step 3")

          const transformedProject = this.transformProjectData(oldProject, userId);
          console.log("step 5")

          const existingProject = await this.drizzleService.db
            .select()
            .from(projects)
            .where(eq(projects.uid, transformedProject.uid))
            .limit(1);

          if (existingProject.length > 0) {
            console.log("step 6")
            this.addLog(migrationId, 'warning', `Project already exist`, 'projects', JSON.stringify(transformedProject));
          } else {
            console.log("step 7")
            await this.drizzleService.db.transaction(async (tx) => {
              try {
                const projectResult = await tx
                  .insert(projects)
                  .values(transformedProject)
                  .returning({ id: projects.id, uid: projects.uid });

                if (!projectResult) {
                  throw new Error('Project insertion returned no results');
                }

                const newProjectId = projectResult[0].id;

                // Insert project membership
                await tx
                  .insert(projectMembers)
                  .values({
                    projectId: newProjectId,
                    userId: userId,
                    uid: generateUid('mem'),
                    projectRole: 'owner',
                    joinedAt: new Date(),
                  });

                this.addLog(
                  migrationId,
                  'info',
                  `Successfully migrated project '${projectResult[0].uid}'`,
                  'projects',
                  projectResult[0].uid
                );
                stop = false;
              } catch (error) {
                console.log("step 8", error)
                this.addLog(migrationId, 'error', `Projects migration failed: At 12837`, 'projects', JSON.stringify(error.stack));
                await this.updateMigrationProgress(migrationId, 'projects', false, true);
                stop = true
              }
            })
          }
          console.log("step 89")

          this.addLog(migrationId, 'info', `Project with id:${transformedProject.uid} migrated.Moving to next project`, 'projects');
        } catch (error) {
          this.addLog(migrationId, 'error', `Project migration failed for project at catch block`, 'projects', JSON.stringify(oldProject));
          stop = true;
        }
      }
      await this.updateMigrationProgress(migrationId, 'projects', true);
      this.addLog(migrationId, 'info', `All projects migrated`, 'projects', 'null');
      return false
    } catch (error) {
      console.log("step 10")

      this.addLog(migrationId, 'error', `Projects migration failed: ${error.message}`, 'projects', JSON.stringify(error.stack));
      this.updateMigrationProgress(migrationId, 'projects', false, true);
      return true;
    }
  }

  private transformProjectData(oldProjectData: any, userId: number): any {
    console.log("step 4")

    const projectData = oldProjectData.properties
    const geometry = oldProjectData.geometry;
    const getTarget = (unitsTargeted, countTarget) => {
      try {
        if (unitsTargeted && unitsTargeted.tree) {
          return unitsTargeted.tree;
        }
        return countTarget || 1;
      } catch (error) {
        return 1
      }
    };
    const getProjectScale = (classification) => {
      const scaleMap = {
        'large-scale-planting': 'large',
        'small-scale-planting': 'small',
        'medium-scale-planting': 'medium',
        'restoration': 'medium',
        'conservation': 'large'
      };
      return scaleMap[classification] || 'medium';
    };
    let flag = false
    let flagReason: FlagReasonEntry[] = []
    let locationValue;
    const projectGeometry = this.getGeoJSONForPostGIS(geometry);
    if (projectGeometry.isValid) {
      locationValue = sql`ST_SetSRID(ST_GeomFromGeoJSON(${JSON.stringify(projectGeometry.validatedGeoJSON)}), 4326)`
    } else {
      flag = true,
        flagReason = [{
          uid: generateUid('flag'),
          type: 'geolocation',
          level: 'high',
          title: 'Location need fix',
          message: 'Please update your project location that is accepted by the system. ',
          updatedAt: new Date(),
          createdAt: new Date()
        }]
    }

    const transformedProject = {
      uid: projectData.id,
      createdById: userId,
      slug: projectData.slug,
      projectName: projectData.name,
      purpose: projectData.classification || 'Unknown',
      projectType: getProjectScale(projectData.classification),
      ecosystem: projectData.metadata?.ecosystem || 'Unknown',
      projectScale: getProjectScale(projectData.classification),
      target: getTarget(projectData.unitsTargeted, projectData.countTarget),
      description: projectData.description || 'No description provided',
      classification: projectData.classification || null,
      image: projectData.image || '',
      location: locationValue,
      country: projectData.country || 'de',
      originalGeometry: geometry ? geometry : null,
      isActive: true, // Default
      isPublic: projectData.isPublished || false,
      isPrimary: projectData.isFeatured || false,
      isPersonal: false,
      intensity: projectData.intensity || null,
      revisionPeriodicityLevel: projectData.revisionPeriodicityLevel || null,
      metadata: projectData.metadata || {},
      createdAt: projectData.created,
      migratedProject: true,
      updatedAt: new Date(),
      flag,
      flagReason
    };
    return transformedProject;
  }

  private async migrateUserSites(uid: number, authToken: string, migrationId: number): Promise<boolean> {
    try {
      this.addLog(migrationId, 'info', 'Starting sites migration', 'sites');
      const sitesResponse = await this.makeApiCall(`/app/profile/projects?_scope=extended`, authToken);
      if (!sitesResponse || sitesResponse === null) {
        this.addLog(migrationId, 'error', `Site migration failed. No response recieved`, 'projects');
        await this.updateMigrationProgress(migrationId, 'sites', false, true);
        return true;
      }
      const allProjects = sitesResponse.data;
      let stopProcess = false
      for (const oldSite of allProjects) {
        try {
          const stopParentLoop = await this.transformSiteData(oldSite, uid, migrationId);
          if (stopParentLoop || stopProcess) {
            this.addLog(migrationId, 'error', `Site Parent loop stopped`, 'sites', JSON.stringify(oldSite));
            await this.updateMigrationProgress(migrationId, 'sites', false);
            return true
          }
          this.addLog(migrationId, 'info', `Project Sites migrated for id ${oldSite.properties.id}`, 'sites');
          await this.updateMigrationProgress(migrationId, 'sites', false);
        } catch (error) {
          this.addLog(migrationId, 'error', `Site migration failed for project ${oldSite.properties.id}: ${error.message}`, 'sites', JSON.stringify(oldSite));
          await this.updateMigrationProgress(migrationId, 'sites', false);
          stopProcess = true
        }
      }
      await this.updateMigrationProgress(migrationId, 'sites', true);
      this.addLog(migrationId, 'info', `Sites migration completed`, 'sites');
      return false
    } catch (error) {
      this.addLog(migrationId, 'error', `Sites migration failed at parent catch ${error.message}`, 'sites');
      return true
    }
  }

  private async transformSiteData(oldProject: any, userId: number, migrationId: number): Promise<boolean> {
    const projectData = oldProject.properties;
    const projectExist = await this.drizzleService.db
      .select()
      .from(projects)
      .where(eq(projects.uid, projectData.id))
      .limit(1);
    if (projectExist.length === 0) {
      this.addLog(migrationId, 'error', `Stoping site migration for project:${projectData.id}. Project dont exist in new backend`, 'sites', JSON.stringify(projectData));
      return true
    }
    if (!projectData.sites || !Array.isArray(projectData.sites)) {
      this.addLog(migrationId, 'warning', `skipping site migration for project:${projectData.id}. No sites in response`, 'sites', JSON.stringify(projectData));
      return false
    }
    let stopProcess = false
    for (const site of projectData.sites) {
      if (stopProcess) {
        this.addLog(migrationId, 'error', `Site loop stopped for project:${projectData.id} `, 'sites', JSON.stringify(projectData));
        return true
      }
      const siteExist = await this.drizzleService.db
        .select()
        .from(sites)
        .where(eq(sites.uid, site.id))
        .limit(1);
      if (siteExist.length > 0) {
        this.addLog(migrationId, 'warning', `Skipping site migration for project:${projectData.id}. Site already migreated`, 'sites', JSON.stringify(projectData));
        return false
      }
      try {
        let flag = false
        let flagReason: FlagReasonEntry[] = []
        let locationValue: any = null;
        const siteGeometry = this.getGeoJSONForPostGIS(site.geometry);
        if (siteGeometry.isValid) {
          locationValue = sql`ST_SetSRID(ST_GeomFromGeoJSON(${JSON.stringify(siteGeometry.validatedGeoJSON)}), 4326)`
        } else {
          flag = true,
            flagReason = [{
              uid: generateUid('flag'),
              type: 'geolocation',
              level: 'high',
              title: 'Location need fix',
              message: 'Please update your project location that is accepted by the system. ',
              updatedAt: new Date(),
              createdAt: new Date()
            }]
        }

        const insertValues: any = {
          uid: site.id,
          projectId: projectExist[0].id,
          name: site.name,
          createdById: userId,
          description: site.description,
          status: site.status,
          flag,
          flagReason
        };
        if (siteGeometry) {
          insertValues.location = locationValue
        }
        if (site.geometry) {
          insertValues.originalGeometry = site.geometry;
        }
        await this.drizzleService.db
          .insert(sites)
          .values(insertValues)
        // .catch(() => {
        //   throw ''
        // });

        this.addLog(migrationId, 'info', `Sites with siteID:${site.id} in project:${projectData.id} migrated`, 'sites');
      } catch (error) {
        console.log("Error aty", error)
        this.addLog(migrationId, 'error', `Failed to insert site ${site.id} from project ${projectData.slug}: `, 'sites', JSON.stringify(site));
        stopProcess = true;
      }
    }
    this.addLog(migrationId, 'info', `All sites are migrated for project:${projectData.id}.`, 'sites');
    return false
  }
  private async migrateUserSpecies(uid: number, authToken: string, migrationId: number, email: string): Promise<boolean> {
    try {
      this.addLog(migrationId, 'info', 'Starting User Species migration', 'sites');
      const speciesResponse = await this.makeApiCall(`/treemapper/species`, authToken);
      if (!speciesResponse || speciesResponse === null) {
        await this.updateMigrationProgress(migrationId, 'species', false, true);
        this.addLog(migrationId, 'error', `Species migration failed. No response recieved`, 'species');
        return true;
      }
      let projectId;
      const personalProject = await this.drizzleService.db
        .select({ id: projects.id })
        .from(projects)
        .where(eq(projects.isPersonal, true))
        .limit(1);

      if (personalProject.length > 0) {
        projectId = personalProject[0].id
      } else {
        const name = email.split('@')[0]
        const projectName = createProjectTitle(name)
        const payload = {
          projectName,
          projectType: 'personal',
          "description": "This is your personal project, you can add species to it. You can invite other users to this project.",
        }
        this.addLog(migrationId, 'warning', `Personal project not found. Created new`, 'species');
        const newPersonalProject = await this.projectService.createPersonalProject(payload, uid)
        if (newPersonalProject) {
          projectId = newPersonalProject.data?.id
        }
      }
      if (speciesResponse.data.length === 0) {
        this.addLog(migrationId, 'info', `Species migration done. No species found`, 'species');
        await this.updateMigrationProgress(migrationId, 'species', true, false);
        return false
      }
      const cleanData = removeDuplicatesByScientificSpeciesId(speciesResponse.data)
      const speciesIds = cleanData.map(el => el.scientificSpecies);
      const existingSciSpecies = await this.drizzleService.db
        .select({
          uid: scientificSpecies.uid,
          id: scientificSpecies.id
        })
        .from(scientificSpecies)
        .where(inArray(scientificSpecies.uid, speciesIds));

      const existingSpeciesMap = new Map(
        existingSciSpecies.map(species => [species.uid, species.id])
      );
      const transformedData = this.transformSpeciesDataWithMapping(
        cleanData,
        projectId,
        uid,
        existingSpeciesMap
      );

      const filteredData = transformedData.filter(el => el.scientificSpeciesId)
      console.log("OPIOP", JSON.stringify(filteredData, null, 2))
      const result = await this.drizzleService.db
        .insert(projectSpecies)
        .values(filteredData)
        .onConflictDoNothing({
          target: [projectSpecies.projectId, projectSpecies.scientificSpeciesId]
        });
      if (result) {
        this.addLog(migrationId, 'info', `Species migration done`, 'species');
        await this.updateMigrationProgress(migrationId, 'species', true, false);
        return false
      }
      this.addLog(migrationId, 'error', `Species migration failed.(After running bulk)`, 'species');
      await this.updateMigrationProgress(migrationId, 'species', false, true);
      return true
    } catch (error) {
      console.log("SDC", error)
      this.addLog(migrationId, 'error', `Species migration failed.(Catch bolck)`, 'species');
      await this.updateMigrationProgress(migrationId, 'species', false, true);
      return true
    }
  }

  private transformSpeciesDataWithMapping(
    cleanData: any[],
    projectId: number,
    uid: number,
    existingSpeciesMap: Map<string, number>
  ) {
    return cleanData.map(species => {
      const internalId = existingSpeciesMap.get(species.scientificSpecies);
      return {
        uid: species.id,
        scientificSpeciesId: Number(internalId),
        projectId: projectId,
        addedById: uid,
        isNativeSpecies: false,
        isDisabled: false,
        commonName: species.aliases || null,
        image: species.image || null,
        description: species.description || null,
        notes: null, // Not provided in input
        favourite: true,
        createdAt: new Date(),
        updatedAt: new Date(),
        metadata: {
          scientificName: species.scientificName,
          importedAt: new Date().toISOString(),
          planet_record: true,
          planet_uid: species.id
        }
      };
    });
  }
  private async migrateUserInterventions(uid: number, authToken: string, migrationId: number): Promise<boolean> {
    try {
      console.log("Started Intervetnion  Migration")
      this.addLog(migrationId, 'info', 'Starting User intervention migration', 'interventions');
      const { projectMapping, personalProjectId } = await this.buildProjectMapping(uid);
      const { siteMapping } = await this.buildSiteMapping(uid);
      const needToStop = await this.migrateInterventionWithSampleTrees(uid, projectMapping, authToken, migrationId, personalProjectId, siteMapping)
      if (needToStop) {
        throw 'needToStop activated'
      }
      this.addLog(migrationId, 'info', `Interventions migration completed`, 'interventions');
      await this.updateMigrationProgress(migrationId, 'interventions', true, false);
      return false
    } catch (error) {
      this.addLog(migrationId, 'error', `Interventions migration failed`, 'interventions');
      await this.updateMigrationProgress(migrationId, 'interventions', false, true);
      return true
    }
  }
  private async buildProjectMapping(userId: number): Promise<{ projectMapping: Map<string, number>, personalProjectId: any }> {
    let personalProjectId: null | number = null
    const projectMapping = new Map<string, number>();
    // Get all migrated projects for this user
    const migratedProjects = await this.drizzleService.db
      .select({
        id: projects.id,
        oldUuid: projects.uid,
        isPersonal: projects.isPersonal
      })
      .from(projects)
      .where(eq(projects.createdById, userId));

    // Build the mapping
    for (const project of migratedProjects) {
      if (project.isPersonal) {
        personalProjectId = project.id
      }
      projectMapping.set(project.oldUuid, project.id);
    }

    return { projectMapping, personalProjectId };
  }

  private async buildSiteMapping(userId: number): Promise<{ siteMapping: Map<string, number>, personalProjectId: any }> {
    const siteMapping = new Map<string, number>();
    // Get all migrated projects for this user
    const migratedProjects = await this.drizzleService.db
      .select({
        id: sites.id,
        oldUuid: sites.uid,
      })
      .from(sites)
      .where(eq(sites.createdById, userId));
    // Build the mapping
    for (const project of migratedProjects) {
      siteMapping.set(project.oldUuid, project.id);
    }
    return { siteMapping, personalProjectId: null };
  }


  private async migrateInterventionWithSampleTrees(
    userId: number,
    projectMapping: Map<string, number>,
    authToken: string,
    migrationId: number,
    personalProjectId: number,
    siteMapping: Map<string, number>,
  ) {
    const batchSize = 100;
    let currentPage = 1;
    let hasMore = true;
    let totalProcessed = 0;
    let lastPage: number | null = null;
    console.log("Started Intervetnion  currentPage", currentPage)
    while (hasMore) {
      // Check if we already know the last page and we've exceeded it
      if (lastPage && currentPage > lastPage) {
        console.log(`Reached last page (${lastPage}). Stopping migration.`);
        break;
      }

      // Calculate correct page number based on batch size
      const interventionResponse = await this.makeApiCall(
        `/treemapper/interventions?limit=${batchSize}&_scope=extended&page=${currentPage}`,
        authToken
      );
      console.log(" interventionResponse ", Boolean(interventionResponse))


      if (!interventionResponse || interventionResponse === null) {
        // Check if this is a pagination error (page exceeded)
        if (lastPage && currentPage > lastPage) {
          console.log(`Migration completed. Processed all ${lastPage} pages.`);
          break;
        }

        // If it's the first page or an unexpected error
        this.addLog(migrationId, 'error', `interventions migration failed. No response`, 'interventions');
        await this.updateMigrationProgress(migrationId, 'interventions', false, false);
        return true;
      }

      console.log(`Processing page ${currentPage}`);
      const oldInterventions = interventionResponse.data;

      // Extract last page info from _links if available
      if (!lastPage && oldInterventions._links?.last) {
        const lastPageMatch = oldInterventions._links.last.match(/page=(\d+)/);
        if (lastPageMatch) {
          lastPage = parseInt(lastPageMatch[1]);
          console.log(`Detected last page: ${lastPage}`);
        }
      }

      // Check if we have more data to process
      const itemsCount = oldInterventions.items?.length || 0;

      // Determine if there are more pages using multiple checks
      hasMore = oldInterventions._links?.next ? true : false;

      // Additional safety checks
      if (itemsCount === 0) {
        console.log("No items in current page. Stopping migration.");
        break;
      }

      if (lastPage && currentPage >= lastPage) {
        hasMore = false;
      }

      console.log(`Processing ${itemsCount} items from page ${currentPage}`);

      // Process in transaction
      const parentIntervention: any[] = [];
      const interventionoParentRelatedData = {};


      for (const oldIntervention of oldInterventions.items) {
        console.log(`Processing intervention: ${oldIntervention.id}`);

        let newProjectId = personalProjectId;
        let siteId = oldIntervention.plantProjectSite ? siteMapping.get(oldIntervention.plantProjectSite) : null;

        if (oldIntervention.plantProject) {
          const projectExist = projectMapping.get(oldIntervention.plantProject);
          if (projectExist) {
            newProjectId = projectExist;
          } else {
            this.addLog(
              migrationId,
              'warning',
              `Interventions Project not found for: ${oldIntervention.id}`,
              'interventions',
              JSON.stringify(oldIntervention)
            );
          }
        }

        const { parentFinalData, treeData } = await this.transformParentIntervention(
          oldIntervention,
          newProjectId,
          userId,
          siteId
        );
        parentIntervention.push(parentFinalData)
        interventionoParentRelatedData[`${parentFinalData.uid}`] = treeData
      }

      console.log(`Inserting ${parentIntervention.length} interventions`);
      const finalInterventionIDMapping: any = [];


      try {
        const result = await this.drizzleService.db
          .insert(interventions)
          .values(parentIntervention)
          .returning({ id: interventions.id, uid: interventions.uid });

        if (Array.isArray(result)) {
          result.forEach(element => {
            finalInterventionIDMapping.push({
              id: element.id,
              uid: element.uid,
              success: true,
              error: null
            });
          });
        }
      } catch (error) {
        const chunkResults = await this.insertChunkIndividually(parentIntervention);
        finalInterventionIDMapping.push(...chunkResults)
      }

      finalInterventionIDMapping.forEach(async inv => {
        if (inv.error) {
          this.addLog(migrationId, 'error', `Failed to add intervention with id ${inv.uid}`, 'interventions')
        } else {
          const treeMappedData = interventionoParentRelatedData[inv.uid].map(e => ({ ...e, interventionId: e.id }))
          console.log("SKLDcj", treeMappedData)
          try {
            await this.drizzleService.db
              .insert(trees)
              .values(treeMappedData)
              .returning({ id: trees.id, uid: trees.uid });
          } catch (error) {
            await this.insertTreeChunkIndividually(treeMappedData, migrationId);
          }
        }
      });

      totalProcessed += itemsCount;
      currentPage++;

      // Final check before next iteration
      if (lastPage && currentPage > lastPage) {
        hasMore = false;
      }
      console.log(`Completed page ${currentPage - 1}. Total processed: ${totalProcessed}/${oldInterventions.total || 'unknown'}`);
    }
    console.log(`Migration completed. Total processed: ${totalProcessed} interventions for user ${userId}`);
    return false;
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



  private async insertTreeChunkIndividually(chunk: any[], migrationId) {
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
        console.log("SDC", error)
        this.addLog(migrationId, 'error', `Indivdually Failed to add intervention with id ${chunk[j].uid}`, 'interventions')
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


  private async transformParentIntervention(parentData: any, newProjectId: number, userId: number, siteId: any) {
    let parentFinalData: any = {}
    let interventionSpecies: any = []
    let plantLocationDate = parentData.interventionStartDate || parentData.plantDate || parentData.registrationDate
    let treesPlanted = 0; //todo
    let flag = false
    let flagReason: FlagReasonEntry[] = []
    let locationValue;
    const parentGeometry = this.getGeoJSONForPostGIS(parentData.geometry);
    if (parentGeometry.isValid) {
      locationValue = sql`ST_SetSRID(ST_GeomFromGeoJSON(${JSON.stringify(parentGeometry.validatedGeoJSON)}), 4326)`
    } else {
      console.log("SDc", parentGeometry)
      flag = true,
        flagReason = [{
          uid: generateUid('flag'),
          type: 'geolocation',
          level: 'high',
          title: 'Location need fix',
          message: 'Please update your project location that is accepted by the system. ',
          updatedAt: new Date(),
          createdAt: new Date()
        }]
    }

    const interventionSampleTree: any = []

    for (let index = 0; index < parentData.plantedSpecies.length; index++) {
      const el = parentData.plantedSpecies[index];
      treesPlanted = + el.treeCount
      interventionSpecies.push({
        "uid": el.id,
        "speciesName": el.scientificName || null,
        "createdAt": el.created ? new Date(el.created) : new Date(),
        "scientificSpeciesId": el.scientificSpecies || null,
        "isUnknown": el.otherSpecies ? true : false,
        "otherSpeciesName": el.otherSpecies,
        "count": el.treeCount,
      })
    }

    if (parentData.scientificSpecies) {
      treesPlanted = +1
      interventionSpecies.push({
        "uid": generateUid("invspc"),
        "speciesName": parentData.scientificName || null,
        "createdAt": plantLocationDate || new Date(),
        "scientificSpeciesId": parentData.scientificSpecies || null,
        "isUnknown": parentData.otherSpecies ? true : false,
        "otherSpeciesName": parentData.otherSpecies || 'Unknown',
        "count": 1,
      })
    }

    if (parentData.otherSpecies) {
      treesPlanted = +1
      interventionSpecies.push({
        "uid": generateUid("invspc"),
        "speciesName": null,
        "createdAt": plantLocationDate || new Date(),
        "scientificSpeciesId": null,
        "isUnknown": parentData.otherSpecies ? true : false,
        "otherSpeciesName": parentData.otherSpecies || 'Unknown',
        "count": 1,
      })
    }

    parentFinalData['hid'] = parentData.hid
    parentFinalData['uid'] = parentData.id
    parentFinalData['userId'] = userId
    parentFinalData['projectId'] = newProjectId
    parentFinalData['projectSiteId'] = siteId
    parentFinalData['type'] = parentData.type
    parentFinalData['idempotencyKey'] = parentData.idempotencyKey
    parentFinalData['captureMode'] = 'on_site'
    parentFinalData['captureStatus'] = parentData.captureStatus
    parentFinalData['registrationDate'] = parentData.registrationDate ? new Date(parentData.registrationDate) : new Date()
    parentFinalData['interventionStartDate'] = parentData.interventionStartDate !== null ? new Date(parentData.interventionStartDate) : new Date()
    parentFinalData['interventionEndDate'] = parentData.interventionEndDate !== null ? new Date(parentData.interventionEndDate) : new Date()
    parentFinalData['location'] = locationValue
    parentFinalData['originalGeometry'] = parentData.originalGeometry
    parentFinalData['deviceLocation'] = parentData.deviceLocation
    parentFinalData['treeCount'] = treesPlanted
    parentFinalData['sampleTreeCount'] = parentData.sampleTreeCount
    parentFinalData['metadata'] = parentData.metadata
    parentFinalData['flag'] = flag
    parentFinalData['flagReason'] = flagReason
    parentFinalData['species'] = interventionSpecies

    if (parentData.type === "single-tree-registration") {
      let treeFinalData = {}
      let singleTreeflag = false
      let singleTreeFlagreason: any = []
      let singleTreeLocation;
      const singleTreeGeometry = this.getGeoJSONForPostGIS(parentData.geometry);
      if (singleTreeGeometry.isValid) {
        singleTreeLocation = sql`ST_SetSRID(ST_GeomFromGeoJSON(${JSON.stringify(singleTreeGeometry.validatedGeoJSON)}), 4326)`;
      } else {
        singleTreeflag = true
        singleTreeFlagreason.push({
          uid: generateUid('flag'),
          type: 'geolocation',
          level: 'high',
          title: 'Location need fix',
          message: 'Please update your tree location that is accepted by the system. ',
          updatedAt: new Date(),
          createdAt: new Date()
        })
      }

      if (parentData.measurements && parentData.measurements.height) {
        treeFinalData['lastMeasuredHeight'] = parentData.measurements.height
      } else {
        singleTreeflag = true
        singleTreeFlagreason.push({
          uid: generateUid('flag'),
          type: 'measurements',
          level: 'high',
          title: 'Measurements height fix',
          message: 'height of the tree is missing ',
          updatedAt: new Date(),
          createdAt: new Date()
        })
        treeFinalData['lastMeasuredHeight'] = 0

      }

      if (parentData.measurements && parentData.measurements.width) {
        treeFinalData['lastMeasuredHeight'] = parentData.measurements.width
      } else {
        singleTreeflag = true
        singleTreeFlagreason.push({
          uid: generateUid('flag'),
          type: 'measurements',
          level: 'high',
          title: 'Measurements width fix',
          message: 'height of the tree is missing ',
          updatedAt: new Date(),
          createdAt: new Date()
        })
        treeFinalData['lastMeasuredWidth'] = 0
      }

      if (interventionSpecies[0].scientificSpeciesId) {
        treeFinalData['scientificSpeciesId'] = interventionSpecies[0].scientificSpeciesId
        treeFinalData['speciesName'] = interventionSpecies[0].speciesName
      }

      if (interventionSpecies[0].isUnknown) {
        treeFinalData['isUnknown'] = true
      }

      let newHID = generateParentHID();
      treeFinalData['hid'] = newHID
      treeFinalData['uid'] = generateUid('tree')
      treeFinalData['createdById'] = userId
      treeFinalData['interventionSpeciesId'] = interventionSpecies[0].uid
      treeFinalData['tag'] = parentData.tag
      treeFinalData['treeType'] = 'single'
      treeFinalData['location'] = singleTreeLocation
      treeFinalData['status'] = parentData.status || 'alive'
      treeFinalData['statusReason'] = parentData.statusReason || null
      treeFinalData['plantingDate'] = parentData.planting_date || parentData.interventionStartDate || parentData.registrationDate || new Date()
      treeFinalData['flag'] = singleTreeflag
      treeFinalData['flagReason'] = singleTreeFlagreason
      interventionSampleTree.push(treeFinalData)
    }
    let transofrmedSample = []
    if (parentData.sampleInterventions && parentData.sampleInterventions.length > 0) {
      transofrmedSample = await this.transformSampleIntervention(parentData, newProjectId, userId, siteId, interventionSpecies)
    }
    interventionSampleTree.push(...transofrmedSample)
    return {
      parentFinalData,
      treeData: interventionSampleTree,
      interventionSpecies
    }
  }

  private async transformSampleIntervention(parentData: any, newProjectId: number, userId: number, siteId: any, allSpecies) {
    try {
      const allTranformedSampleTrees: any = []

      for (const sampleIntervention of parentData.sampleInterventions) {
        let plantLocationDate = sampleIntervention.interventionStartDate || sampleIntervention.plantDate || sampleIntervention.registrationDate
        let treeFinalData = {}
        let singleTreeflag = false
        let singleTreeFlagreason: any = []
        let invSpeciesId
        if (sampleIntervention.otherSpecies) {
          invSpeciesId = allSpecies.find(el => el.isUnknown === true)
        }
        if (sampleIntervention.scientificSpecies) {
          invSpeciesId = allSpecies.find(el => el.scientificSpeciesId === sampleIntervention.scientificSpecies)
        }
        let singleTreeLocation;
        const singleTreeGeometry = this.getGeoJSONForPostGIS(sampleIntervention.geometry);

        if (singleTreeGeometry.isValid) {
          singleTreeLocation = sql`ST_SetSRID(ST_GeomFromGeoJSON(${JSON.stringify(singleTreeGeometry.validatedGeoJSON)}), 4326)`;
        } else {
          singleTreeflag = true
          singleTreeFlagreason.push({
            uid: generateUid('flag'),
            type: 'geolocation',
            level: 'high',
            title: 'Location need fix',
            message: 'Please update your ptreeroject location that is accepted by the system. ',
            updatedAt: new Date(),
            createdAt: new Date()
          })
        }

        if (sampleIntervention.measurements && sampleIntervention.measurements.height) {
          treeFinalData['lastMeasuredHeight'] = sampleIntervention.measurements.height
        } else {
          singleTreeflag = true
          singleTreeFlagreason.push({
            uid: generateUid('flag'),
            type: 'measurements',
            level: 'high',
            title: 'Measurements height fix',
            message: 'height of the tree is missing ',
            updatedAt: new Date(),
            createdAt: new Date()
          })
          treeFinalData['lastMeasuredHeight'] = 0

        }

        if (sampleIntervention.measurements && sampleIntervention.measurements.width) {
          treeFinalData['lastMeasuredHeight'] = sampleIntervention.measurements.width
        } else {
          singleTreeflag = true
          singleTreeFlagreason.push({
            uid: generateUid('flag'),
            type: 'measurements',
            level: 'high',
            title: 'Measurements width fix',
            message: 'height of the tree is missing ',
            updatedAt: new Date(),
            createdAt: new Date()
          })
          treeFinalData['lastMeasuredWidth'] = 0
        }

        if (sampleIntervention.scientificSpeciesId) {
          treeFinalData['scientificSpeciesId'] = sampleIntervention.scientificSpeciesId
          treeFinalData['speciesName'] = sampleIntervention.speciesName || ''
        } else {
          treeFinalData['isUnknown'] = true

        }


        treeFinalData['hid'] = sampleIntervention.hid
        treeFinalData['uid'] = sampleIntervention.id
        treeFinalData['createdById'] = userId
        treeFinalData['tag'] = sampleIntervention.tag
        treeFinalData['treeType'] = 'sample'
        treeFinalData['interventionSpeciesId'] = invSpeciesId.uid
        treeFinalData['location'] = singleTreeLocation
        treeFinalData['status'] = sampleIntervention.status || 'alive'
        treeFinalData['statusReason'] = sampleIntervention.statusReason || null
        treeFinalData['metadata'] = sampleIntervention.metadata || null
        treeFinalData['plantingDate'] = plantLocationDate
        treeFinalData['flag'] = singleTreeflag
        treeFinalData['flagReason'] = singleTreeFlagreason
        allTranformedSampleTrees.push(treeFinalData);
      }
      return allTranformedSampleTrees
    } catch (error) {
      console.log("sdc", error)
      return []
    }
  }

  private createPointGeoJSON(latitude: number, longitude: number): CreatePointGeoJSONResult {
    // Validate inputs exist
    if (latitude === undefined || latitude === null) {
      return {
        validatedGeoJSON: null,
        error: 'Latitude is required'
      };
    }

    if (longitude === undefined || longitude === null) {
      return {
        validatedGeoJSON: null,
        error: 'Longitude is required'
      };
    }

    // Validate inputs are numbers
    if (typeof latitude !== 'number' || isNaN(latitude)) {
      return {
        validatedGeoJSON: null,
        error: 'Latitude must be a valid number'
      };
    }

    if (typeof longitude !== 'number' || isNaN(longitude)) {
      return {
        validatedGeoJSON: null,
        error: 'Longitude must be a valid number'
      };
    }

    // Validate coordinate ranges
    if (latitude < -90 || latitude > 90) {
      return {
        validatedGeoJSON: null,
        error: 'Latitude must be between -90 and 90 degrees'
      };
    }

    if (longitude < -180 || longitude > 180) {
      return {
        validatedGeoJSON: null,
        error: 'Longitude must be between -180 and 180 degrees'
      };
    }

    // Create Point GeoJSON
    const pointGeoJSON: GeoJSON.Point = {
      type: 'Point',
      coordinates: [longitude, latitude] // Note: GeoJSON uses [longitude, latitude] order
    };

    try {
      // Validate using Turf (optional, since we've already validated the structure)
      if (!booleanValid(pointGeoJSON as any)) {
        return {
          validatedGeoJSON: null,
          error: 'Generated GeoJSON failed validation'
        };
      }

      return {
        validatedGeoJSON: pointGeoJSON,
        error: null
      };

    } catch (error) {
      return {
        validatedGeoJSON: null,
        error: `GeoJSON creation failed: ${error.message}`
      };
    }
  }
  private async completeMigration(migrationId: number): Promise<void> {
    await this.drizzleService.db
      .update(userMigrations)
      .set({
        status: 'completed',
        migrationCompletedAt: new Date()
      })
      .where(eq(userMigrations.id, migrationId));
  }
}

























//   await this.logMigration(migrationId, 'error', `Migration failed: ${error.message} `, 'migration', 'migrationId');
// }

// // Placeholder transformation methods - you'll implement the actual logic








// private transformSpeciesData(inputData, projectId, addedById) {
//   if (!projectId || !addedById) {
//     throw new Error('projectId and addedById are required in options');
//   }

//   return inputData.map(species => {
//     return {
//       uid: generateUid('psp'),
//       scientificSpeciesId: species.scientificSpecies,
//       projectId: projectId,
//       addedById: addedById,
//       isNativeSpecies: false,
//       isDisabled: false,
//       aliases: species.aliases || null,
//       commonName: species.aliases || null, // Using aliases as common name since that's what we have
//       image: species.image || null,
//       description: species.description || null,
//       notes: null, // Not provided in input
//       favourite: true,
//       createdAt: new Date(),
//       updatedAt: new Date(),
//       metadata: {
//         originalId: species.id,
//         scientificName: species.scientificName,
//         importedAt: new Date().toISOString(),
//         planet_record: true,
//         planet_uid: species.id
//       }
//     };
//   });
// }




// // Method to get migration logs for a user
// async getMigrationLogs(uid: string, limit = 100): Promise<any[]> {
//   return await this.dataSource
//     .select()
//     .from(migrationLogs)
//     .where(eq(migrationLogs.uid, uid))
//     .orderBy(migrationLogs.createdAt)
//     .limit(limit);
// }


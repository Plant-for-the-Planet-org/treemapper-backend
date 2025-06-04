import { BadRequestException, HttpException, HttpStatus, Injectable, Logger } from '@nestjs/common';
import { HttpService } from '@nestjs/axios';
import { async, firstValueFrom, generate } from 'rxjs';



import {
  userMigrations,
  migrationLogs,
  projects,
  sites,
  interventions,
  projectSpecies
} from '../database/schema/index';
import { eq, sql } from 'drizzle-orm';
import { DrizzleService } from 'src/database/drizzle.service';
import { generateUid } from 'src/util/uidGenerator';
import { UsersService } from 'src/users/users.service';
import { error } from 'console';
import { boolean } from 'drizzle-orm/gel-core';
import { ProjectsService } from 'src/projects/projects.service';
import { createProjectTitle, removeDuplicatesByScientificSpeciesId } from 'src/common/utils/projectName.util';

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
}

@Injectable()
export class MigrationService {
  private readonly logger = new Logger(MigrationService.name);

  constructor(
    private drizzleService: DrizzleService,
    private httpService: HttpService,
    private usersetvice: UsersService,
    private projectService: ProjectsService,

  ) { }


  async checkUserInttc(accessToken: string): Promise<MigrationCheckResult> {
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
        return { migrationNeeded: false };
      }

      // If status is 200, return migrate: true
      return { migrationNeeded: true };

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


  async startUserMigration(
    userId: number,
    planetId: string,
    email: string,
    authToken: string
  ): Promise<void> {
    let userMigrationRecord;

    try {
      console.log('Migrating started');
      // Create migration record
      userMigrationRecord = await this.createMigrationRecord(userId, planetId, email);

      if (userMigrationRecord.status === 'completed') {
        await this.logMigration(userMigrationRecord.id, 'info', 'Migration already done', 'migration');
        return;
      }

      let stop = false;
      // // Step 1: Migrate user
      if (!userMigrationRecord.migratedEntities.user) {
        console.log('Migrating user');
        stop = await this.migrateUserData(userId, authToken, userMigrationRecord.id);
      }

      if (stop) {
        await this.logMigration(userMigrationRecord.id, 'error', 'Migration stoped for user and will not proceed further', 'migration');
        return;
      }
      console.log('Migrating done for "user"');

      // // Step 2: Migrate Projects
      if (!userMigrationRecord.migratedEntities.projects) {
        console.log('Migrating projects');
        stop = await this.migrateUserProjects(userId, authToken, userMigrationRecord.id);
      }


      if (stop) {
        await this.logMigration(userMigrationRecord.id, 'error', 'Migration stoped for project', 'migration');
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
        await this.logMigration(userMigrationRecord.id, 'error', 'Migration stoped for site', 'migration');
        return
      }
      console.log('Sites  migrated');


      // Step 4: Migrate User Species
      if (!userMigrationRecord.migratedEntities.species) {
        stop = await this.migrateUserSpecies(userId, authToken, userMigrationRecord.id, email);
      }


      if (stop) {
        console.log('Issue in  species migration');
        await this.logMigration(userMigrationRecord.id, 'error', 'Migration stoped for species', 'migration');
        return
      }
      console.log('Species  migrated');



      // Step 4: Migrate Interventions
      // await this.migrateUserInterventions(userId, authToken, userMigrationRecord.id);

      // // Step 5: Handle Images (placeholder for S3 copy)
      // await this.handleImageMigration(uid, userMigrationRecord.id);

      // Mark migration as complete
      await this.completeMigration(userMigrationRecord.id);

      await this.logMigration(userMigrationRecord.id, 'info', 'Migration completed successfully', 'migration');

    } catch (error) {
      await this.handleMigrationError(userId, userMigrationRecord?.id, error);
      throw error;
    }
  }

  private async createMigrationRecord(uid: number, planetId: string, email: string) {
    const existingMigrtion = await this.drizzleService.db
      .select()
      .from(userMigrations)
      .where(eq(userMigrations.user, uid))
      .limit(1);
    if (existingMigrtion.length > 0) {
      await this.logMigration(existingMigrtion[0].id, 'warning', 'Migration already exists', 'migration');
      await this.logMigration(existingMigrtion[0].id, 'info', 'Migration Resumed', 'migration');
      return existingMigrtion[0];
    }
    const migrationRecord = await this.drizzleService.db
      .insert(userMigrations)
      .values({
        uid: generateUid('mglog'),
        user: uid,
        planetId,
        email,
        status: 'in_progress',
        migrationStartedAt: new Date(),
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
    await this.logMigration(migrationRecord[0].id, 'info', 'Migration started', 'migration');
    return migrationRecord[0];
  }



  private async migrateUserData(userId: number, authToken: string, migrationId: number): Promise<boolean> {
    try {
      await this.logMigration(migrationId, 'info', 'Starting user data migration', 'user');

      // Fetch user data from old API
      const userResponse = await this.makeApiCall(`/app/profile`, authToken);
      if (!userResponse || userResponse === null) {
        await this.updateMigrationProgress(migrationId, 'user', false, true);
        await this.logMigration(migrationId, 'error', `User migration failed. No response recieved`, 'user');
        return true;
      }
      const oldUserData = userResponse.data;

      // Transform and insert user data
      const transformedUser = this.transformUserData(oldUserData, userId);
      console.log("Before")
      const updatedResult = await this.usersetvice.update(userId, transformedUser).catch(async () => {
        await this.updateMigrationProgress(migrationId, 'user', false, true);
        await this.logMigration(migrationId, 'error', `User migration stoped while wrtiting to db`, 'user', JSON.stringify(transformedUser));
        throw ''
      })
      console.log("After", updatedResult)

      await this.updateMigrationProgress(migrationId, 'user', true);

      await this.logMigration(migrationId, 'info', 'User data migration completed', 'user');
      return false;
    } catch (error) {
      await this.updateMigrationProgress(migrationId, 'user', false, true);
      await this.logMigration(migrationId, 'error', `User migration failed`, 'user', JSON.stringify(error.stack));
      return true;
    }
  }

  private async migrateUserProjects(userId: number, authToken: string, migrationId: number): Promise<boolean> {
    try {
      await this.logMigration(migrationId, 'info', 'Starting projects migration', 'projects');
      const projectsResponse = await this.makeApiCall(`/app/profile/projects?_scope=extended`, authToken);
      if (!projectsResponse || projectsResponse === null) {
        await this.updateMigrationProgress(migrationId, 'projects', false, true);
        await this.logMigration(migrationId, 'error', `Project migration failed. No response recieved`, 'projects');
        return true;
      }
      const oldProjects = projectsResponse.data;
      let stop = false;
      for (const oldProject of oldProjects) {
        if (stop) {
          await this.logMigration(migrationId, 'error', `Project loop stopped`, 'projects');
          return true
        }
        try {
          const transformedProject = this.transformProjectData(oldProject, userId);
          // Check for existing project
          const existingProject = await this.drizzleService.db
            .select()
            .from(projects)
            .where(eq(projects.uid, transformedProject.uid))
            .limit(1);

          if (existingProject.length > 0) {
            await this.logMigration(migrationId, 'warning', `Project already exist`, 'projects', JSON.stringify(transformedProject));
          } else {
            await this.drizzleService.db.insert(projects).values(transformedProject).catch(async () => {
              await this.updateMigrationProgress(migrationId, 'projects', false, true);
              await this.logMigration(migrationId, 'error', `Projects migration stoped. Error in DB insertion`, 'projects', JSON.stringify(transformedProject));
              stop = true;
            });
          }
          await this.logMigration(migrationId, 'info', `Project with id:${transformedProject.uid} migrated.Moving to next project`, 'projects');
        } catch (error) {
          await this.logMigration(migrationId, 'error', `Project migration failed for project at catch block`, 'project', JSON.stringify(oldProject));
          stop = true;
        }
      }
      await this.updateMigrationProgress(migrationId, 'projects', true);
      await this.logMigration(migrationId, 'info', `All projects migrated`, 'projects', 'null');
      return false
    } catch (error) {
      await this.logMigration(migrationId, 'error', `Projects migration failed: ${error.message}`, 'projects', JSON.stringify(error.stack));
      await this.updateMigrationProgress(migrationId, 'projects', false, true);
      return true;
    }
  }

  private async migrateUserSites(uid: number, authToken: string, migrationId: number): Promise<boolean> {
    try {
      await this.logMigration(migrationId, 'info', 'Starting sites migration', 'sites');
      const sitesResponse = await this.makeApiCall(`/app/profile/projects?_scope=extended`, authToken);
      if (!sitesResponse || sitesResponse === null) {
        await this.updateMigrationProgress(migrationId, 'sites', false, true);
        await this.logMigration(migrationId, 'error', `Site migration failed. No response recieved`, 'projects');
        return true;
      }
      const allProjects = sitesResponse.data;
      let stopProcess = false
      for (const oldSite of allProjects) {
        try {
          const stopParentLoop = await this.transformSiteData(oldSite, uid, migrationId);
          if (stopParentLoop || stopProcess) {
            await this.logMigration(migrationId, 'error', `Site Parent loop stopped`, 'sites', JSON.stringify(oldSite));
            await this.updateMigrationProgress(migrationId, 'sites', false);
            return true
          }
          await this.logMigration(migrationId, 'info', `Project Sites migrated for id ${oldSite.properties.id}`, 'sites');
          await this.updateMigrationProgress(migrationId, 'sites', false);
        } catch (error) {
          await this.logMigration(migrationId, 'error', `Site migration failed for project ${oldSite.properties.id}: ${error.message}`, 'site', JSON.stringify(oldSite));
          await this.updateMigrationProgress(migrationId, 'sites', false);
          stopProcess = true
        }
      }
      await this.updateMigrationProgress(migrationId, 'sites', true);
      await this.logMigration(migrationId, 'info', `Sites migration completed`, 'sites');
      return false
    } catch (error) {
      await this.logMigration(migrationId, 'error', `Sites migration failed at parent catch ${error.message}`, 'sites');
      return true
    }
  }

  private async migrateUserSpecies(uid: number, authToken: string, migrationId: number, email: string): Promise<boolean> {
    try {
      await this.logMigration(migrationId, 'info', 'Starting User Species migration', 'interventions');
      const speciesResponse = await this.makeApiCall(`/treemapper/species`, authToken);
      if (!speciesResponse || speciesResponse === null) {
        await this.updateMigrationProgress(migrationId, 'species', false, true);
        await this.logMigration(migrationId, 'error', `Species migration failed. No response recieved`, 'species');
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
        await this.logMigration(migrationId, 'warning', `Personal project not found. Created new`, 'species');
        const newPersonalProject = await this.projectService.createPersonalProject(payload, uid)
        if (newPersonalProject) {
          projectId = newPersonalProject.data?.id
        }
      }
      if (speciesResponse.data.length === 0) {
        await this.updateMigrationProgress(migrationId, 'species', true, false);
        await this.logMigration(migrationId, 'info', `Species migration done. No species found`, 'species');
        return false
      }
      const tranformedData = this.transformSpeciesData(speciesResponse.data, projectId, uid)
      const uniqueSpecies = removeDuplicatesByScientificSpeciesId(tranformedData)
      const result = await this.drizzleService.db.transaction(async (tx) => {
        const insertedSpecies = await tx
          .insert(projectSpecies)
          .values(uniqueSpecies)
          .returning();
        return insertedSpecies;
      })
      if (result) {
        await this.logMigration(migrationId, 'info', `Species migration done`, 'species');
        await this.updateMigrationProgress(migrationId, 'species', true, false);
        return false
      }
      await this.logMigration(migrationId, 'error', `Species migration failed.(After running bulk)`, 'species');
      await this.updateMigrationProgress(migrationId, 'species', false, true);
      return true
    } catch (error) {
      await this.logMigration(migrationId, 'error', `Species migration failed.(Catch bolck)`, 'species');
      await this.updateMigrationProgress(migrationId, 'species', false, true);
      return true
    }
  }


  // private async migrateUserInterventions(uid: number, authToken: string, migrationId: number): Promise<boolean> {
  //   try {
  //     await this.logMigration(uid, 'info', 'Starting User intervention migration', 'interventions');
  //     const species = await this.makeApiCall(`/treemapper/species`, authToken);
  //     if (!interventionsResponse || interventionsResponse === null) {
  //       await this.updateMigrationProgress(migrationId, 'species', false, false);
  //       await this.logMigration(migrationId, 'error', `Species migration failed. No response recieved`, 'species');
  //       return true;
  //     }
  //     const oldInterventions = interventionsResponse.data;

  //     let migratedCount = 0;
  //     let failedCount = 0;

  //     // Process in batches to avoid memory issues
  //     const batchSize = 50;
  //     for (let i = 0; i < oldInterventions.length; i += batchSize) {
  //       const batch = oldInterventions.slice(i, i + batchSize);

  //       for (const oldIntervention of batch) {
  //         try {
  //           const transformedIntervention = this.transformInterventionData(oldIntervention, uid);

  //           const existingIntervention = await this.dataSource
  //             .select()
  //             .from(interventions)
  //             .where(eq(interventions.uid, oldIntervention.id))
  //             .limit(1);

  //           if (existingIntervention.length > 0) {
  //             await this.handleDataConflict(migrationId, 'intervention', oldIntervention.id, 'intervention_exists', {
  //               existing: existingIntervention[0],
  //               new: transformedIntervention
  //             });
  //           } else {
  //             await this.dataSource.insert(interventions).values(transformedIntervention);
  //             migratedCount++;
  //           }

  //         } catch (error) {
  //           failedCount++;
  //           await this.logMigration(uid, 'error', `Intervention migration failed for intervention ${oldIntervention.id}: ${error.message}`, 'intervention', oldIntervention.id);
  //         }
  //       }

  //       // Log batch progress
  //       await this.logMigration(uid, 'info', `Processed batch ${Math.floor(i / batchSize) + 1}/${Math.ceil(oldInterventions.length / batchSize)}`, 'interventions');
  //     }

  //     await this.updateMigrationProgress(migrationId, 'interventions', true);
  //     await this.logMigration(uid, 'info', `Interventions migration completed: ${migratedCount} succeeded, ${failedCount} failed`, 'interventions');

  //   } catch (error) {
  //     await this.logMigration(uid, 'error', `Interventions migration failed: ${error.message}`, 'interventions', null, error.stack);
  //     throw error;
  //   }
  // }

  // private async handleImageMigration(uid: string, migrationId: string): Promise<void> {
  //   try {
  //     await this.logMigration(uid, 'info', 'Starting image migration (S3 folder copy)', 'images');

  //     // TODO: Implement S3 folder copy logic here
  //     // This would involve copying from old-bucket/user-uid/* to new-bucket/user-uid/*

  //     await this.updateMigrationProgress(migrationId, 'images', true);
  //     await this.logMigration(uid, 'info', 'Image migration completed', 'images');

  //   } catch (error) {
  //     await this.logMigration(uid, 'error', `Image migration failed: ${error.message}`, 'images', null, error.stack);
  //     throw error;
  //   }
  // }

  private async makeApiCall(endpoint: string, authToken: string, retries = 3): Promise<any> {
    const baseUrl = process.env.OLD_BACKEND_URL
    for (let attempt = 1; attempt <= retries; attempt++) {
      try {
        const response = await firstValueFrom(
          this.httpService.get(`${baseUrl}${endpoint}`, {
            headers: {
              'Authorization': `Bearer ${authToken}`,
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

  private async logMigration(
    mgId: number,
    level: 'info' | 'warning' | 'error',
    message: string,
    entity?: string,
    stackTrace?: string
  ): Promise<void> {
    try {
      await this.drizzleService.db.insert(migrationLogs).values({
        uid: generateUid('mgl'),
        userMigrationId: mgId,
        level,
        message,
        entity,
        stackTrace,
        context: {
          timestamp: new Date().toISOString()
        }
      });
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
          status: stop ? 'stoped' : 'in_progress',
          lastUpdatedAt: new Date()
        })
        .where(eq(userMigrations.id, migrationId));
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

  private async handleMigrationError(userId: number, migrationId: number, error: any): Promise<void> {
    if (migrationId) {
      await this.drizzleService.db
        .update(userMigrations)
        .set({
          status: 'failed',
          errorMessage: error.message
        })
        .where(eq(userMigrations.id, migrationId));
    }

    await this.logMigration(migrationId, 'error', `Migration failed: ${error.message}`, 'migration', 'migrationId');
  }

  // Placeholder transformation methods - you'll implement the actual logic
  private transformUserData(oldUserData: any, userId: number): any {
    const transformedUser = {
      uid: oldUserData.id, // Use old ID as UID
      name: oldUserData.name || null,
      firstname: oldUserData.firstname || null,
      lastname: oldUserData.lastname || null,
      displayName: oldUserData.displayName || null,
      avatar: oldUserData.image || '',
      avatarCdn: oldUserData.image || '', // Same as avatar for now
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
    };
    return transformedUser;
  }

  private transformProjectData(oldProjectData: any, userId: number): any {
    const projectData = oldProjectData.properties
    const geometry = oldProjectData.geometry;

    // Extract coordinates from geometry
    let latitude = null;
    let longitude = null;
    let geometryType = null;

    if (geometry && geometry.coordinates) {
      geometryType = geometry.type?.toLowerCase();
      if (geometry.type === 'Point' && Array.isArray(geometry.coordinates)) {
        longitude = geometry.coordinates[0];
        latitude = geometry.coordinates[1];
      }
    }

    // Handle image URL transformation


    // Extract target from unitsTargeted (prioritize tree count)
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

    // Map project scale based on classification
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

    const projectGeometry = this.getGeoJSONForPostGIS(geometry);
    const locationValue = sql`ST_SetSRID(ST_GeomFromGeoJSON(${JSON.stringify(projectGeometry)}), 4326)`;
    // Create the transformed project object
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
      imageCdn: projectData.image || '',
      location: locationValue,
      country: projectData.country || 'de',
      originalGeometry: geometry ? geometry : null,
      geometryType: geometryType,
      isActive: true, // Default
      isPublic: projectData.isPublished || false,
      isPrimary: projectData.isFeatured || false,
      isPersonal: false,
      intensity: projectData.intensity || null,
      revisionPeriodicityLevel: projectData.revisionPeriodicityLevel || null,
      metadata: projectData.metadata || {},
      createdAt: projectData.created,
      updatedAt: new Date(),
    };
    return transformedProject;
  }

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

  private async transformSiteData(oldProject: any, userId: number, migrationId): Promise<boolean> {
    const projectData = oldProject.properties;
    const projectExist = await this.drizzleService.db
      .select()
      .from(projects)
      .where(eq(projects.uid, projectData.id))
      .limit(1);
    if (projectExist.length === 0) {
      await this.logMigration(migrationId, 'error', `Stoping site migration for project:${projectData.id}. Project dont exist in new backend`, 'sites', JSON.stringify(projectData));
      return true
    }
    if (!projectData.sites || !Array.isArray(projectData.sites)) {
      await this.logMigration(migrationId, 'warning', `skipping site migration for project:${projectData.id}. No sites in response`, 'sites', JSON.stringify(projectData));
      return false
    }
    let stopProcess = false
    for (const site of projectData.sites) {
      if (stopProcess) {
        await this.logMigration(migrationId, 'error', `Site loop stoped for project:${projectData.id}`, 'sites', JSON.stringify(projectData));
        return true
      }
      const siteExist = await this.drizzleService.db
        .select()
        .from(sites)
        .where(eq(sites.uid, site.id))
        .limit(1);
      if (siteExist.length > 0) {
        await this.logMigration(migrationId, 'warning', `Skipping site migration for project:${projectData.id}. Site already migreated`, 'sites', JSON.stringify(projectData));
        return false
      }
      try {
        const siteGeometry = this.getGeoJSONForPostGIS(site.geometry);
        const insertValues: any = {
          uid: site.id,
          projectId: projectExist[0].id,
          name: site.name,
          createdById: userId,
          description: site.description,
          status: site.status,
        };
        if (siteGeometry) {
          insertValues.location = sql`ST_Force2D(ST_SetSRID(ST_GeomFromGeoJSON(${JSON.stringify(siteGeometry)}), 4326))`;
        }
        if (site.geometry) {
          insertValues.originalGeometry = site.geometry;
        }
        await this.drizzleService.db
          .insert(sites)
          .values(insertValues)
          .catch(() => {
            throw ''
          });

        await this.logMigration(migrationId, 'info', `Sites with siteID:${site.id} in project:${projectData.id} migrated`, 'sites');
      } catch (error) {
        await this.logMigration(migrationId, 'error', `Failed to insert site ${site.id} from project ${projectData.slug}:`, 'site', JSON.stringify(site));
        stopProcess = true;
      }
    }
    await this.logMigration(migrationId, 'info', `All sites are migrated for project:${projectData.id}.`, 'sites');
    return false
  }

  private transformSpeciesData(inputData, projectId, addedById) {
    if (!projectId || !addedById) {
      throw new Error('projectId and addedById are required in options');
    }

    return inputData.map(species => {
      return {
        uid: generateUid('psp'),
        scientificSpeciesId: species.scientificSpecies,
        projectId: projectId,
        addedById: addedById,
        isNativeSpecies: false,
        isDisabled: false,
        aliases: species.aliases || null,
        commonName: species.aliases || null, // Using aliases as common name since that's what we have
        image: species.image || null,
        description: species.description || null,
        notes: null, // Not provided in input
        favourite: true,
        createdAt: new Date(),
        updatedAt: new Date(),
        metadata: {
          originalId: species.id,
          scientificName: species.scientificName,
          importedAt: new Date().toISOString()
        }
      };
    });
  }


  // private transformInterventionData(oldInterventionData: any, uid: string): any {
  //   // TODO: Implement intervention data transformation
  //   return {
  //     uid: oldInterventionData.id,
  //     // ... other fields
  //   };
  // }

  // // Public method to get migration status
  // async getMigrationStatus(uid: string): Promise<MigrationProgress | null> {
  //   const migrationRecord = await this.dataSource
  //     .select()
  //     .from(userMigrations)
  //     .where(eq(userMigrations.uid, uid))
  //     .limit(1);

  //   if (migrationRecord.length === 0) {
  //     return null;
  //   }

  //   const record = migrationRecord[0];
  //   return {
  //     userId: record.planetId,
  //     currentStep: record.status,
  //     completed: record.status === 'completed',
  //     error: record.errorMessage,
  //     progress: record.migratedEntities
  //   };
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

}
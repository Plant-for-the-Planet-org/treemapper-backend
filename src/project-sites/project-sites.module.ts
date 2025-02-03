// src/project-sites/project-sites.module.ts
import { Module } from '@nestjs/common';
import { ProjectSitesController } from './project-sites.controller';
import { ProjectSitesService } from './project-sites.service';
import { DrizzleService } from '../database/database.service';
import { DatabaseModule } from '../database/database.module';

@Module({
  imports: [DatabaseModule],  // Import DatabaseModule
  controllers: [ProjectSitesController],
  providers: [
    ProjectSitesService,
    DrizzleService  // Add DrizzleService to providers
  ]
})
export class ProjectSitesModule {}
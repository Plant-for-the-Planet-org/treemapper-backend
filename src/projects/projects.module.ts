// src/projects/projects.module.ts
import { Module } from '@nestjs/common';
import { ProjectsService } from './projects.service';
import { ProjectsController } from './projects.controller';
import { DatabaseModule } from '../database/database.module';
import { ProjectPermissionsGuard } from './guards/project-permissions.guard';
import { NotificationModule } from '../notification/notification.module';

@Module({
  imports: [DatabaseModule,NotificationModule],
  controllers: [ProjectsController],
  providers: [ProjectsService, ProjectPermissionsGuard],
  exports: [ProjectsService],
})
export class ProjectsModule {}
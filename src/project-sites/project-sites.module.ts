import { Module } from '@nestjs/common';
import { ProjectSitesController } from './project-sites.controller';
import { ProjectSitesService } from './project-sites.service';

@Module({
  controllers: [ProjectSitesController],
  providers: [ProjectSitesService]
})
export class ProjectSitesModule {}

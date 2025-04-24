import { Module } from '@nestjs/common';
import { ProjectsController } from './projects.controller';
import { ProjectService } from './projects.service';
import { DatabaseModule } from '../database/database.module';

@Module({
  imports: [DatabaseModule],
  controllers: [ProjectsController],
  providers: [ProjectService],
  exports: [ProjectService],
})
export class ProjectsModule {}
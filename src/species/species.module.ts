import { Module } from '@nestjs/common';
import { SpeciesController } from './species.controller';
import { SpeciesService } from './species.service';
import { UserSpeciesController } from './user-species.controller';
import { UserSpeciesService } from './user-species.service';
import { DatabaseModule } from '../database/database.module';

@Module({
  imports: [DatabaseModule],
  controllers: [SpeciesController, UserSpeciesController],
  providers: [SpeciesService, UserSpeciesService],
  exports: [SpeciesService, UserSpeciesService],
})
export class SpeciesModule { }

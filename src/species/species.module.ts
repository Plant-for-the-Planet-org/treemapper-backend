import { Module } from '@nestjs/common';
import { SpeciesService } from './species.service';
import { Species } from './species';

@Module({
  providers: [SpeciesService, Species]
})
export class SpeciesModule {}

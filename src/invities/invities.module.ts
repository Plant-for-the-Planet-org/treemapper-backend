import { Module } from '@nestjs/common';
import { InvitiesController } from './invities.controller';
import { InvitiesService } from './invities.service';

@Module({
  controllers: [InvitiesController],
  providers: [InvitiesService]
})
export class InvitiesModule {}

import { Module } from '@nestjs/common';
import { ProjectInvitesService } from './project-invites.service';
import { ProjectInvitesController, PublicInvitesController } from './project-invites.controller';
import { DatabaseModule } from '../database/database.module';
import { NotificationModule } from '../notification/notification.module';

@Module({
  imports: [DatabaseModule, NotificationModule],
  controllers: [ProjectInvitesController, PublicInvitesController],
  providers: [ProjectInvitesService],
  exports: [ProjectInvitesService],
})
export class ProjectInvitesModule {}
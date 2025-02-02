import { Module } from '@nestjs/common';
import { ProjectInviteController } from './project-invite.controller';
import { ProjectInviteService } from './project-invite.service';

@Module({
  controllers: [ProjectInviteController],
  providers: [ProjectInviteService]
})
export class ProjectInviteModule {}

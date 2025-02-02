// src/project-invite/project-invite.module.ts
import { Module } from '@nestjs/common';
import { ProjectInviteController } from './project-invite.controller';
import { ProjectInviteService } from './project-invite.service';
import { DrizzleService } from '../database/database.service';
import { DatabaseModule } from '../database/database.module'; // Add this import

@Module({
  imports: [DatabaseModule], // Import DatabaseModule
  controllers: [ProjectInviteController],
  providers: [ProjectInviteService, DrizzleService],
  exports: [ProjectInviteService]
})
export class ProjectInviteModule {}
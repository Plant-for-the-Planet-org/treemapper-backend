import { Module } from '@nestjs/common';
import { ProjectUsersService } from './project-users.service';
import { ProjectUsersController } from './project-users.controller';
import { DatabaseModule } from '../database/database.module';

@Module({
  imports: [DatabaseModule],
  providers: [ProjectUsersService],
  controllers: [ProjectUsersController],
  exports: [ProjectUsersService]
})
export class ProjectUsersModule {}
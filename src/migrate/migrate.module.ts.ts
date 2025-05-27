import { Module } from '@nestjs/common';
import { HttpModule } from '@nestjs/axios';
import { UserController } from './migrate.controller';
import { UserMigrationService } from './migrate.service';

@Module({
  imports: [HttpModule],
  controllers: [UserController],
  providers: [UserMigrationService],
  exports: [UserMigrationService],
})
export class UserMigrationModule {}
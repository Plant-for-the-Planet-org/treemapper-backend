import { Module } from '@nestjs/common';
import { HttpModule } from '@nestjs/axios';
import { MigrationService } from './migrate.service'
import { MigrationController } from './migrate.controller'
import { DatabaseModule } from '../database/database.module';
import { UsersModule } from 'src/users/users.module';


@Module({
  imports: [
    HttpModule.register({
      timeout: 30000,
      maxRedirects: 5,
    }),
    DatabaseModule,
    UsersModule
  ],
  controllers: [MigrationController],
  providers: [MigrationService],
  exports: [MigrationService]
})
export class MigrationModule { }
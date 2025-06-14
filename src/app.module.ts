// src/app.module.ts
import { Module } from '@nestjs/common';
import { ConfigModule } from '@nestjs/config';
import { AppController } from './app.controller';
import { AppService } from './app.service';
import { DatabaseModule } from './database/database.module';
import { UsersModule } from './users/users.module';
import { CacheService } from './cache/cache.service';
import { AuthModule } from './auth/auth.module';
import { ProjectsModule } from './projects/projects.module';
import { MigrationModule } from './migrate/migrate.module.ts';
import { SpeciesModule } from './species/species.module';
import { SitesModule } from './sites/sites.module';
import { InterventionsModule } from './interventions/interventions.module';
import { NotificationModule } from './notification/notification.module';
@Module({
  imports: [
    ConfigModule.forRoot({
      isGlobal: true,
    }),
    DatabaseModule,
    AuthModule,
    UsersModule,
    MigrationModule,
    ProjectsModule,
    SpeciesModule,
    SitesModule,
    InterventionsModule,
    NotificationModule
  ],
  controllers: [AppController],
  providers: [AppService, CacheService],
})
export class AppModule { }
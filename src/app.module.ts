import { Module } from '@nestjs/common';
import { ConfigModule } from '@nestjs/config';
import { AppController } from './app.controller';
import { AppService } from './app.service';
import { DatabaseModule } from './database/database.module';
import { AuthModule } from './auth/auth.module';
import { UsersModule } from './users/users.module';
import { MemoryCacheMoudle } from './cache/cache.module';
import { WorkspaceModule } from './workspace/workspace.module';

@Module({
  imports: [
    ConfigModule.forRoot({
      isGlobal: true,
    }),
    DatabaseModule,
    AuthModule,
    UsersModule,
    MemoryCacheMoudle,
    WorkspaceModule
    // MigrationModule,
    // ProjectsModule,
    // SpeciesModule,
    // EmailModule,
    // NotificationModule,
    // SitesModule,
    // SpeciesModule,
    // InterventionsModule,
    // AnalyticsModule,
    // MobileModule,
    // OrganizationsModule
  ],
  controllers: [AppController],
  providers: [AppService],
})
export class AppModule { }
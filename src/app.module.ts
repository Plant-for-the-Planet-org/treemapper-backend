import { Module } from '@nestjs/common';
import { CacheModule } from '@nestjs/cache-manager';
import { DatabaseModule } from './database/database.module';
import { ConfigModule } from '@nestjs/config';
import { UsersModule } from './users/users.module';
import { APP_GUARD } from '@nestjs/core';
import { ProjectsModule } from './projects/projects.module';
import { CommonModule } from './common/common.module';
import { ProjectInviteModule } from './project-invite/project-invite.module';
import { ProjectSitesModule } from './project-sites/project-sites.module';
import { AuthModule } from './auth/auth.module';
import { JwtAuthGuard } from './auth/jwt-auth.guard';
import { RolesGuard } from './auth/roles.guard';


@Module({
  imports: [
    CacheModule.register({
      ttl: 3600, // Time to live in seconds (1 hour)
      max: 100,  // Maximum number of items in cache
      isGlobal: true // Make cache available everywhere
    }),
    AuthModule,
    ConfigModule.forRoot({ isGlobal: true }),
    DatabaseModule,
    UsersModule,
    ProjectsModule,
    CommonModule,
    ProjectInviteModule,
    ProjectSitesModule
  ],
  controllers: [],
  providers: [
    {
      provide: APP_GUARD,
      useClass: JwtAuthGuard,
    },
    {
      provide: APP_GUARD,
      useClass: RolesGuard,
    },
  ],
})
export class AppModule {}

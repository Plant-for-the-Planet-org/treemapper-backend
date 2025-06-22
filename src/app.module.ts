import { Module } from '@nestjs/common';
import { ConfigModule, ConfigService } from '@nestjs/config';
import { AppController } from './app.controller';
import { AppService } from './app.service';
import { RedisCacheModule } from './redis/redis.module';
import { DatabaseModule } from './database/database.module';
import { UsersModule } from './users/users.module';
import { AuthModule } from './auth/auth.module';
import { MemoryCacheMoudle } from './cache/cache.module';
import { MigrationModule } from './migrate/migrate.module.ts';
import { ProjectsModule } from './projects/projects.module';
import { SpeciesModule } from './species/species.module';

@Module({
  imports: [
    ConfigModule.forRoot({
      isGlobal: true,
    }),
    RedisCacheModule,
    DatabaseModule,
    AuthModule,
    UsersModule,
    MemoryCacheMoudle,
    MigrationModule,
    ProjectsModule,
    SpeciesModule
  ],
  controllers: [AppController],
  providers: [AppService],
})
export class AppModule { }
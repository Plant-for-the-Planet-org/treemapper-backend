import { Module } from '@nestjs/common';
import { DatabaseModule } from './database/database.module';
import { ConfigModule } from '@nestjs/config';
import { UsersModule } from './users/users.module';
import { AuthModule } from './auth/auth.module';
import { ProjectsModule } from './projects/projects.module';
import { CommonModule } from './common/common.module';
import { ProjectInviteModule } from './project-invite/project-invite.module';
import { ProjectSitesModule } from './project-sites/project-sites.module';


@Module({
  imports: [
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
  providers: [],
})
export class AppModule {}

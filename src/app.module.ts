import { Module } from '@nestjs/common';
import { DatabaseModule } from './database/database.module';
import { ConfigModule } from '@nestjs/config';
import { UsersModule } from './users/users.module';
import { AuthModule } from './auth/auth.module';
import { WorkspacesModule } from './workspaces/workspaces.module';
import { ProjectsModule } from './projects/projects.module';
import { InvitiesModule } from './invities/invities.module';
import { CommonModule } from './common/common.module';
import { WorkspaceService } from './workspace/workspace.service';


@Module({
  imports: [
    AuthModule,
    ConfigModule.forRoot({ isGlobal: true }),
    DatabaseModule,
    UsersModule,
    WorkspacesModule,
    ProjectsModule,
    InvitiesModule,
    CommonModule
  ],
  controllers: [],
  providers: [WorkspaceService],
})
export class AppModule {}

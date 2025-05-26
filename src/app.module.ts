// src/app.module.ts
import { Module } from '@nestjs/common';
import { ConfigModule } from '@nestjs/config';
import { AppController } from './app.controller';
import { AppService } from './app.service';
import { DatabaseModule } from './database/database.module';
import { UsersModule } from './users/users.module';
import { AuthModule } from './auth/auth.module';
// import { ProjectsModule } from './projects/projects.module';
// import { EmailModule } from './email/email.module';
// import { SitesModule } from './sites/sites.module';
// import { SpeciesModule } from './species/species.module';
// import { TreeModule } from './trees/trees.module';


@Module({
  imports: [
    ConfigModule.forRoot({
      isGlobal: true,
    }),
    DatabaseModule,
    AuthModule,
    UsersModule,
    // ProjectsModule,
    // EmailModule,
    // SitesModule,
    // SpeciesModule,
    // TreeModule
  ],
  controllers: [AppController],
  providers: [AppService],
})
export class AppModule { }
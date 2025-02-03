import { Module } from '@nestjs/common';
import { drizzle } from 'drizzle-orm/node-postgres';
import { DATABASE_CONNECTION } from './database-connection';
import { ConfigService } from '@nestjs/config';
import * as schema from '../../drizzle/schema/schema';
import { Pool } from 'pg';
import { DrizzleService } from './database.service';

@Module({
  providers: [
    {
      provide: DATABASE_CONNECTION,
      useFactory: (configService: ConfigService) => {
        const pool = new Pool({
          connectionString: configService.getOrThrow('DATABASE_URL'),
        });
        return drizzle(pool, {
          schema: {
            ...schema
          },
        });
      },
      inject: [ConfigService],
    },
    DrizzleService,
  ],
  exports: [DATABASE_CONNECTION, DrizzleService],
})
export class DatabaseModule {}
import { Inject, Injectable } from '@nestjs/common';
import { DATABASE_CONNECTION } from './database-connection';
import { NodePgDatabase } from 'drizzle-orm/node-postgres';
import * as schema from '../../drizzle/schema/schema';

@Injectable()
export class DrizzleService {
  constructor(
    @Inject(DATABASE_CONNECTION)
    private db: NodePgDatabase<typeof schema>
  ) {}

  // Expose the raw database instance
  get database() {
    return this.db;
  }
}
import { Injectable, Inject, BadRequestException } from '@nestjs/common';
import { InjectQueue } from '@nestjs/bull';
import { Queue } from 'bull';
import { DrizzleService } from '../database/drizzle.service';
import { NodePgDatabase } from 'drizzle-orm/node-postgres';
import * as schema from '../database/schema';
import { eq, and, sql, desc, asc, gte, lte, isNull, count, avg, sum, isNotNull } from 'drizzle-orm';
import {
  AnalyticsQueryDto,
  SpeciesAnalyticsQueryDto,
  GraphDataQueryDto,
  ProjectAnalyticsResponse,
  SpeciesAnalyticsResponse,
  SiteAnalyticsResponse,
  GraphDataResponse,
  HistoricalAnalyticsResponse,
  CsvExportDataResponse,
  AnalyticsPeriod,
} from './dto/analytics.dto';
import { interventions, interventionSpecies, trees, users } from '../database/schema';


export interface ProjectKPIs {
  totalTreesPlanted: number;
  totalSpeciesPlanted: number;
  areaCovered: number; // in square meters
  totalContributors: number;
}

interface TreesPlantedParams {
  projectId: number;
  interval: 'daily' | 'weekly' | 'monthly';
  startDate?: Date;
  endDate?: Date;
}

export interface TreesPlantedResult {
  period: string;
  count: number;
  date: Date;
}

interface RecentAddition {
  uid: string;
  hid: string;
  type: string;
  treeCount: number | null;
  registrationDate: Date;
  user: {
    uid: string;
    displayName: any;
    firstname: any;
    lastname: any;
    image: string | null;
  };
}

export interface RecentAdditionsResponse {
  recentAdditions: RecentAddition[];
  totalThisMonth: number;
}




@Injectable()
export class AnalyticsService {
  private rateLimitMap = new Map<number, { count: number; resetTime: number }>();

  constructor(
    private readonly drizzleService: DrizzleService,
    @InjectQueue('analytics') private analyticsQueue: Queue,
  ) {

    // Clean up rate limit map every hour
    // setInterval(() => this.cleanupRateLimit(), 60 * 60 * 1000);
  }


  async getTreesPlantedOverTime(params: TreesPlantedParams): Promise<TreesPlantedResult[]> {
    const { projectId, interval, startDate, endDate } = params;

    // Determine the date field to use (prefer plantingDate, fallback to createdAt)
    const dateField = sql`COALESCE(${trees.plantingDate}, ${trees.createdAt})`;

    // Build date truncation based on interval
    let dateTrunc: any;
    let dateFormat: string;

    switch (interval) {
      case 'daily':
        dateTrunc = sql`DATE_TRUNC('day', ${dateField})`;
        dateFormat = 'YYYY-MM-DD';
        break;
      case 'weekly':
        dateTrunc = sql`DATE_TRUNC('week', ${dateField})`;
        dateFormat = 'YYYY-"W"WW';
        break;
      case 'monthly':
        dateTrunc = sql`DATE_TRUNC('month', ${dateField})`;
        dateFormat = 'YYYY-MM';
        break;
      default:
        throw new Error(`Invalid interval: ${interval}`);
    }

    // Build where conditions
    const whereConditions = [
      eq(interventions.projectId, projectId),
      // Only count alive trees (exclude dead/removed from planted count)
      sql`${trees.status} IN ('alive', 'sick', 'unknown')`,
      // Exclude soft-deleted records
      sql`${trees.deletedAt} IS NULL`
    ];

    // Add date range filters if provided
    if (startDate) {
      whereConditions.push(gte(dateField, startDate));
    }

    if (endDate) {
      whereConditions.push(lte(dateField, endDate));
    }

    // Execute the query
    const result = await this.drizzleService.db
      .select({
        period: sql<string>`TO_CHAR(${dateTrunc}, '${sql.raw(dateFormat)}')`,
        count: sql<number>`COUNT(*)::int`,
        date: sql<Date>`${dateTrunc}`,
      })
      .from(trees)
      .innerJoin(interventions, eq(trees.interventionId, interventions.id))
      .where(and(...whereConditions))
      .groupBy(dateTrunc)
      .orderBy(desc(sql`${dateTrunc}`));

    return result;
  }

  async getRecentAdditions(projectId: number): Promise<RecentAdditionsResponse> {
    // Get the first and last day of current month
    const now = new Date();
    const firstDayOfMonth = new Date(now.getFullYear(), now.getMonth(), 1);
    const lastDayOfMonth = new Date(now.getFullYear(), now.getMonth() + 1, 0, 23, 59, 59);

    // Get recent 20 interventions
    const recentAdditions = await this.drizzleService.db
      .select({
        uid: interventions.uid,
        hid: interventions.hid,
        type: interventions.type,
        treeCount: interventions.treeCount,
        registrationDate: interventions.registrationDate,
        user: {
          uid: users.uid,
          displayName: users.displayName,
          firstname: users.firstname,
          lastname: users.lastname,
          image: users.image,
        },
      })
      .from(interventions)
      .innerJoin(users, eq(interventions.userId, users.id))
      .where(
        and(
          eq(interventions.projectId, projectId),
          sql`${interventions.deletedAt} IS NULL`
        )
      )
      .orderBy(desc(interventions.registrationDate))
      .limit(20);

    // Get total count for this month
    const monthlyCount = await this.drizzleService.db
      .select({
        count: sql<number>`COUNT(*)::int`,
      })
      .from(interventions)
      .where(
        and(
          eq(interventions.projectId, projectId),
          gte(interventions.registrationDate, firstDayOfMonth),
          lte(interventions.registrationDate, lastDayOfMonth),
          sql`${interventions.deletedAt} IS NULL`
        )
      );

    return {
      recentAdditions,
      totalThisMonth: monthlyCount[0]?.count || 0,
    };
  }


  async getProjectKPIs(projectId: number): Promise<ProjectKPIs> {
    // 1. Total Trees Planted (sum of treeCount from interventions)
    const treesResult = await this.drizzleService.db
      .select({
        total: sql<number>`COALESCE(SUM(${interventions.treeCount}), 0)::int`,
      })
      .from(interventions)
      .where(eq(interventions.projectId, projectId));

    // 2. Total Unique Species Planted (excluding unknown species)
    const speciesResult = await this.drizzleService.db
      .select({
        total: sql<number>`COUNT(DISTINCT ${interventionSpecies.scientificSpeciesId})::int`,
      })
      .from(interventionSpecies)
      .innerJoin(interventions, eq(interventionSpecies.interventionId, interventions.id))
      .where(
        and(
          eq(interventions.projectId, projectId),
          eq(interventionSpecies.isUnknown, false),
          isNotNull(interventionSpecies.scientificSpeciesId)
        )
      );

    // 3. Area Covered (sum of intervention areas in square meters)
    const areaResult = await this.drizzleService.db
      .select({
        total: sql<number>`COALESCE(SUM(ST_Area(ST_Transform(${interventions.location}, 3857))), 0)::int`,
      })
      .from(interventions)
      .where(
        and(
          eq(interventions.projectId, projectId),
          isNotNull(interventions.location)
        )
      );

    // 4. Total Contributors (users who have created interventions or trees)
    const contributorsResult = await this.drizzleService.db
      .select({
        total: sql<number>`COUNT(DISTINCT user_id)::int`,
      })
      .from(
        sql`(
          SELECT ${interventions.userId} as user_id FROM ${interventions} 
          WHERE ${interventions.projectId} = ${projectId}
          UNION
          SELECT ${trees.createdById} as user_id FROM ${trees}
          INNER JOIN ${interventions} ON ${trees.interventionId} = ${interventions.id}
          WHERE ${interventions.projectId} = ${projectId}
        ) as contributors`
      );

    return {
      totalTreesPlanted: treesResult[0]?.total || 0,
      totalSpeciesPlanted: speciesResult[0]?.total || 0,
      areaCovered: areaResult[0]?.total || 0,
      totalContributors: contributorsResult[0]?.total || 0,
    };
  }



  // Helper method to get default date range if not provided
  private getDefaultDateRange(interval: string): { startDate: Date; endDate: Date } {
    const endDate = new Date();
    const startDate = new Date();

    switch (interval) {
      case 'daily':
        startDate.setDate(startDate.getDate() - 30); // Last 30 days
        break;
      case 'weekly':
        startDate.setDate(startDate.getDate() - 84); // Last 12 weeks
        break;
      case 'monthly':
        startDate.setMonth(startDate.getMonth() - 12); // Last 12 months
        break;
    }

    return { startDate, endDate };
  }
}
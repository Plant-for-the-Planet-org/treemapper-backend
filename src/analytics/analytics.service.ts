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
import { interventions, projectMembers, trees, users } from '../database/schema';

export interface RecentAdditionsDto {
  projectId: number;
  page: number;
  limit: number;
}

export interface RecentActivity {
  id: string;
  activityType: 'intervention' | 'species' | 'site' | 'member';
  user: {
    id: number;
    name: string;
    image: string | null;
  };
  timeOfActivity: string; // ISO date string
  description: string;
  details?: {
    treeCount?: number;
    areaInHa?: number;
    speciesName?: string;
    memberName?: string;
  };
}

export interface RecentAdditionsResponse {
  projectId: number;
  activities: RecentActivity[];
  pagination: {
    page: number;
    limit: number;
    total: number;
    hasMore: boolean;
  };
}


export interface PlantingOverviewData {
  period: string; // Date string for the period
  treeCount: number;
}

export interface PlantingOverviewResponse {
  projectId: number;
  interval: string;
  data: PlantingOverviewData[];
}

export interface ProjectAnalyticsDto {
  startDate: string; // ISO date string
  endDate: string;   // ISO date string
  projectId: number;
}

export interface ProjectKPIsResponse {
  projectId: number;
  dateRange: {
    startDate: string;
    endDate: string;
  };
  kpis: {
    totalTreesPlanted: number;
    totalSpeciesPlanted: number;
    totalAreaCovered: number; // in square meters
    totalContributors: number;
  };
}

export interface ProjectKPIs {
  totalTreesPlanted: number;
  totalSpeciesPlanted: number;
  areaCovered: number; // in square meters
  totalContributors: number;
}


export interface PlantingOverviewDto {
  projectId: number;
  interval: '1week' | '7weeks' | '12months';
}



@Injectable()
export class AnalyticsService {
  private rateLimitMap = new Map<number, { count: number; resetTime: number }>();

  constructor(
    private readonly drizzleService: DrizzleService,
    @InjectQueue('analytics') private analyticsQueue: Queue,
  ) {
  }


  async getPlantingOverview(dto: PlantingOverviewDto): Promise<PlantingOverviewResponse> {
    const { projectId, interval } = dto;
    const today = new Date();

    let data: PlantingOverviewData[] = [];

    switch (interval) {
      case '1week':
        data = await this.getDailyData(projectId, today, 7);
        break;
      case '7weeks':
        data = await this.getWeeklyData(projectId, today, 7);
        break;
      case '12months':
        data = await this.getMonthlyData(projectId, today, 12);
        break;
    }

    return {
      projectId,
      interval,
      data,
    };
  }

  private async getDailyData(projectId: number, today: Date, days: number): Promise<PlantingOverviewData[]> {
    const result = await this.drizzleService.db
      .select({
        period: sql<string>`DATE(${interventions.interventionStartDate})::text`,
        treeCount: sql<number>`COALESCE(SUM(${interventions.treeCount}), 0)`
      })
      .from(interventions)
      .where(
        and(
          eq(interventions.projectId, projectId),
          gte(interventions.interventionStartDate, this.subtractDays(today, days - 1)),
          lte(interventions.interventionStartDate, today),
          sql`${interventions.deletedAt} IS NULL`
        )
      )
      .groupBy(sql`DATE(${interventions.interventionStartDate})`)
      .orderBy(sql`DATE(${interventions.interventionStartDate})`);

    // Fill missing days with 0 count
    return this.fillMissingPeriods(result, today, days, 'daily');
  }

  private async getWeeklyData(projectId: number, today: Date, weeks: number): Promise<PlantingOverviewData[]> {
    const result = await this.drizzleService.db
      .select({
        period: sql<string>`DATE_TRUNC('week', ${interventions.interventionStartDate})::date::text`,
        treeCount: sql<number>`COALESCE(SUM(${interventions.treeCount}), 0)`
      })
      .from(interventions)
      .where(
        and(
          eq(interventions.projectId, projectId),
          gte(interventions.interventionStartDate, this.subtractWeeks(today, weeks - 1)),
          lte(interventions.interventionStartDate, today),
          sql`${interventions.deletedAt} IS NULL`
        )
      )
      .groupBy(sql`DATE_TRUNC('week', ${interventions.interventionStartDate})`)
      .orderBy(sql`DATE_TRUNC('week', ${interventions.interventionStartDate})`);

    return this.fillMissingPeriods(result, today, weeks, 'weekly');
  }

  private async getMonthlyData(projectId: number, today: Date, months: number): Promise<PlantingOverviewData[]> {
    const result = await this.drizzleService.db
      .select({
        period: sql<string>`DATE_TRUNC('month', ${interventions.interventionStartDate})::date::text`,
        treeCount: sql<number>`COALESCE(SUM(${interventions.treeCount}), 0)`
      })
      .from(interventions)
      .where(
        and(
          eq(interventions.projectId, projectId),
          gte(interventions.interventionStartDate, this.subtractMonths(today, months - 1)),
          lte(interventions.interventionStartDate, today),
          sql`${interventions.deletedAt} IS NULL`
        )
      )
      .groupBy(sql`DATE_TRUNC('month', ${interventions.interventionStartDate})`)
      .orderBy(sql`DATE_TRUNC('month', ${interventions.interventionStartDate})`);

    return this.fillMissingPeriods(result, today, months, 'monthly');
  }

  private fillMissingPeriods(
    dbResult: { period: string; treeCount: number }[],
    today: Date,
    count: number,
    type: 'daily' | 'weekly' | 'monthly'
  ): PlantingOverviewData[] {
    const resultMap = new Map(dbResult.map(r => [r.period, r.treeCount]));
    const periods: PlantingOverviewData[] = [];

    for (let i = count - 1; i >= 0; i--) {
      let periodDate: Date;
      let periodKey: string;

      switch (type) {
        case 'daily':
          periodDate = this.subtractDays(today, i);
          periodKey = periodDate.toISOString().split('T')[0]; // YYYY-MM-DD
          break;
        case 'weekly':
          periodDate = this.subtractWeeks(today, i);
          periodDate = this.getWeekStart(periodDate); // Get Monday of that week
          periodKey = periodDate.toISOString().split('T')[0];
          break;
        case 'monthly':
          periodDate = this.subtractMonths(today, i);
          periodDate = new Date(periodDate.getFullYear(), periodDate.getMonth(), 1); // First day of month
          periodKey = periodDate.toISOString().split('T')[0];
          break;
      }

      periods.push({
        period: periodKey,
        treeCount: resultMap.get(periodKey) || 0
      });
    }

    return periods;
  }

  private subtractDays(date: Date, days: number): Date {
    const result = new Date(date);
    result.setDate(result.getDate() - days);
    return result;
  }

  private subtractWeeks(date: Date, weeks: number): Date {
    const result = new Date(date);
    result.setDate(result.getDate() - (weeks * 7));
    return result;
  }

  private subtractMonths(date: Date, months: number): Date {
    const result = new Date(date);
    result.setMonth(result.getMonth() - months);
    return result;
  }

  private getWeekStart(date: Date): Date {
    const result = new Date(date);
    const day = result.getDay();
    const diff = result.getDate() - day + (day === 0 ? -6 : 1); // Monday as start of week
    result.setDate(diff);
    return result;
  }


  async getProjectKPIs(dto: ProjectAnalyticsDto): Promise<ProjectKPIsResponse> {
    const { startDate, endDate, projectId } = dto;
    const startDateTime = new Date(startDate);
    const endDateTime = new Date(endDate);

    // Single query to get trees, species, and area from interventions
    const interventionStats = await this.drizzleService.db
      .select({
        totalTrees: sql<number>`COALESCE(SUM(${interventions.treeCount}), 0)`,
        totalArea: sql<number>`COALESCE(SUM(ST_Area(${interventions.location}::geography)), 0)`,
        uniqueSpecies: sql<number>`(
          SELECT COUNT(DISTINCT species_element->>'speciesName')
          FROM (
            SELECT jsonb_array_elements(${interventions.species}) as species_element
            FROM ${interventions}
            WHERE ${interventions.projectId} = ${projectId}
              AND ${interventions.interventionStartDate} >= ${startDateTime}
              AND ${interventions.interventionStartDate} <= ${endDateTime}
              AND ${interventions.deletedAt} IS NULL
          ) species_data
          WHERE species_element->>'speciesName' IS NOT NULL
        )`
      })
      .from(interventions)
      .where(
        and(
          eq(interventions.projectId, projectId),
          gte(interventions.interventionStartDate, startDateTime),
          lte(interventions.interventionStartDate, endDateTime),
          sql`${interventions.deletedAt} IS NULL`
        )
      );

    // Separate query for contributors count
    const contributorStats = await this.drizzleService.db
      .select({
        totalContributors: sql<number>`COUNT(DISTINCT ${projectMembers.userId})`
      })
      .from(projectMembers)
      .where(eq(projectMembers.projectId, projectId));

    const interventionResult = interventionStats[0];
    const contributorResult = contributorStats[0];

    return {
      projectId,
      dateRange: {
        startDate,
        endDate,
      },
      kpis: {
        totalTreesPlanted: interventionResult?.totalTrees || 0,
        totalSpeciesPlanted: interventionResult?.uniqueSpecies || 0,
        totalAreaCovered: Math.round(interventionResult?.totalArea || 0),
        totalContributors: contributorResult?.totalContributors || 0,
      },
    };
  }

  async getRecentAdditions(dto: RecentAdditionsDto): Promise<RecentAdditionsResponse> {
    const { projectId, page, limit } = dto;
    const offset = (page - 1) * limit;

    // Get all activities using UNION ALL
    const activitiesQuery = sql`
      (
        SELECT 
          i.uid as id,
          'intervention' as activity_type,
          i.created_at as time_of_activity,
          u.id as user_id,
          u.display_name as user_name,
          u.image as user_image,
          i.tree_count as tree_count,
          NULL as area_in_ha,
          NULL as species_name,
          NULL as member_name
        FROM ${interventions} i
        JOIN ${users} u ON i.user_id = u.id
        WHERE i.project_id = ${projectId} AND i.deleted_at IS NULL
      )
      UNION ALL
      (
        SELECT 
          ps.uid as id,
          'species' as activity_type,
          ps.created_at as time_of_activity,
          u.id as user_id,
          u.display_name as user_name,
          u.image as user_image,
          NULL as tree_count,
          NULL as area_in_ha,
          COALESCE(ps.common_name, ss.scientific_name) as species_name,
          NULL as member_name
        FROM ${schema.projectSpecies} ps
        JOIN ${users} u ON ps.added_by_id = u.id
        JOIN ${schema.scientificSpecies} ss ON ps.scientific_species_id = ss.id
        WHERE ps.project_id = ${projectId} AND ps.deleted_at IS NULL
      )
      UNION ALL
      (
        SELECT 
          s.uid as id,
          'site' as activity_type,
          s.created_at as time_of_activity,
          u.id as user_id,
          u.display_name as user_name,
          u.image as user_image,
          NULL as tree_count,
          ROUND(ST_Area(s.location::geography) / 10000.0, 2) as area_in_ha,
          NULL as species_name,
          NULL as member_name
        FROM ${schema.sites} s
        JOIN ${users} u ON s.created_by_id = u.id
        WHERE s.project_id = ${projectId} AND s.deleted_at IS NULL
      )
      UNION ALL
      (
        SELECT 
          pm.uid as id,
          'member' as activity_type,
          pm.created_at as time_of_activity,
          invited_by.id as user_id,
          invited_by.display_name as user_name,
          invited_by.image as user_image,
          NULL as tree_count,
          NULL as area_in_ha,
          NULL as species_name,
          new_member.display_name as member_name
        FROM ${projectMembers} pm
        JOIN ${users} new_member ON pm.user_id = new_member.id
        LEFT JOIN ${users} invited_by ON pm.user_id = invited_by.id
        WHERE pm.project_id = ${projectId}
      )
      ORDER BY time_of_activity DESC
      LIMIT ${limit} OFFSET ${offset}
    `;

    const countQuery = sql`
      SELECT COUNT(*) as total FROM (
        (SELECT uid FROM ${interventions} WHERE project_id = ${projectId} AND deleted_at IS NULL)
        UNION ALL
        (SELECT uid FROM ${schema.projectSpecies} WHERE project_id = ${projectId} AND deleted_at IS NULL)
        UNION ALL
        (SELECT uid FROM ${schema.sites} WHERE project_id = ${projectId} AND deleted_at IS NULL)
        UNION ALL
        (SELECT uid FROM ${projectMembers} WHERE project_id = ${projectId})
      ) combined
    `;

    const [activitiesResult, countResult] = await Promise.all([
      this.drizzleService.db.execute(activitiesQuery),
      this.drizzleService.db.execute(countQuery)
    ]);

    const total = Number(countResult.rows[0]?.total || 0);
    const hasMore = offset + limit < total;

    const activities: RecentActivity[] = activitiesResult.rows.map((row: any) => {
      const activity: RecentActivity = {
        id: row.id,
        activityType: row.activity_type,
        user: {
          id: row.user_id,
          name: row.user_name || 'Unknown User',
          image: row.user_image,
        },
        timeOfActivity: new Date(row.time_of_activity).toISOString(),
        description: this.generateActivityDescription(row),
        details: {}
      };

      // Add relevant details based on activity type
      if (row.activity_type === 'intervention' && row.tree_count) {
        activity.details!.treeCount = row.tree_count;
      }
      if (row.activity_type === 'site' && row.area_in_ha) {
        activity.details!.areaInHa = row.area_in_ha;
      }
      if (row.activity_type === 'species' && row.species_name) {
        activity.details!.speciesName = row.species_name;
      }
      if (row.activity_type === 'member' && row.member_name) {
        activity.details!.memberName = row.member_name;
      }

      return activity;
    });

    return {
      projectId,
      activities,
      pagination: {
        page,
        limit,
        total,
        hasMore,
      },
    };
  }

  private generateActivityDescription(row: any): string {
    switch (row.activity_type) {
      case 'intervention':
        const treeText = row.tree_count === 1 ? 'tree' : 'trees';
        return `Created intervention with ${row.tree_count} ${treeText}`;
      
      case 'species':
        return `Added ${row.species_name} species to project`;
      
      case 'site':
        return `Created new site covering ${row.area_in_ha} ha`;
      
      case 'member':
        return row.member_name 
          ? `Invited ${row.member_name} to project`
          : `Joined the project`;
      
      default:
        return 'Unknown activity';
    }
  }
  
}
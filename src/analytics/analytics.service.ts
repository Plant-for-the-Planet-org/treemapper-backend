import { Injectable, Inject, BadRequestException } from '@nestjs/common';
import { InjectQueue } from '@nestjs/bull';
import { Queue } from 'bull';
import { DrizzleService } from '../database/drizzle.service';
import { NodePgDatabase } from 'drizzle-orm/node-postgres';
import * as schema from '../database/schema';
import { eq, and, sql, desc, asc, gte, lte, isNull, count, avg, sum } from 'drizzle-orm';
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

@Injectable()
export class AnalyticsService {
  private rateLimitMap = new Map<number, { count: number; resetTime: number }>();

  constructor(
    private readonly drizzleService: DrizzleService,
    @InjectQueue('analytics') private analyticsQueue: Queue,
  ) {
    // Clean up rate limit map every hour
    setInterval(() => this.cleanupRateLimit(), 60 * 60 * 1000);
  }


  async queueAnalyticsRefresh(projectId: number, userId: number): Promise<void> {
    // Check rate limit
    this.checkRateLimit(projectId);

    // Update rate limit
    this.updateRateLimit(projectId);

    // Queue the analytics refresh job
    await this.analyticsQueue.add(
      'refresh-project-analytics',
      {
        projectId,
        userId,
        timestamp: new Date().toISOString(),
      },
      {
        attempts: 3,
        backoff: {
          type: 'exponential',
          delay: 2000,
        },
      },
    );

    await this.drizzleService.db
      .update(schema.projects)
      .set({
        analyticsStatus: 'processing',
        updatedAt: new Date(),
      })
      .where(eq(schema.projects.id, projectId));
  }

  private checkRateLimit(projectId: number): void {
    const now = Date.now();
    const hourInMs = 60 * 60 * 1000;

    const record = this.rateLimitMap.get(projectId);

    if (!record) {
      return; // No previous attempts
    }

    if (now > record.resetTime) {
      this.rateLimitMap.delete(projectId);
      return; // Reset time has passed
    }

    if (record.count >= 2) {
      const retryAfter = Math.ceil((record.resetTime - now) / 1000);
      const error: any = new BadRequestException('Rate limit exceeded');
      error.message = `Rate limit exceeded. Analytics can only be refreshed 2 times per hour.`;
      error.retryAfter = retryAfter;
      throw error;
    }
  }

  private updateRateLimit(projectId: number): void {
    const now = Date.now();
    const hourInMs = 60 * 60 * 1000;

    const record = this.rateLimitMap.get(projectId);

    if (!record || now > record.resetTime) {
      this.rateLimitMap.set(projectId, {
        count: 1,
        resetTime: now + hourInMs,
      });
    } else {
      record.count += 1;
    }
  }

  private cleanupRateLimit(): void {
    const now = Date.now();
    for (const [projectId, record] of this.rateLimitMap.entries()) {
      if (now > record.resetTime) {
        this.rateLimitMap.delete(projectId);
      }
    }
  }

  async getProjectAnalytics(projectId: number): Promise<ProjectAnalyticsResponse> {
    // Get current analytics data
    const analyticsData = await this.drizzleService.db
      .select()
      .from(schema.projectAnalytics)
      .where(eq(schema.projectAnalytics.projectId, projectId))
      .limit(1);

    if (!analyticsData.length) {
      // If no analytics data exists, return empty structure
      return this.getEmptyAnalyticsResponse(projectId);
    }

    const analytics = analyticsData[0];

    // Get project name
    const project = await this.drizzleService.db
      .select({ name: schema.projects.projectName })
      .from(schema.projects)
      .where(eq(schema.projects.id, projectId))
      .limit(1);

    return {
      projectId,
      projectName: project[0]?.name || 'Unknown Project',
      lastRefresh: analytics.calculatedAt.toISOString(),
      basicKpis: {
        totalTreesPlanted: analytics.totalTreesPlanted,
        totalSpeciesPlanted: analytics.totalSpeciesPlanted,
        areaCovered: Number(analytics.areaCovered),
        totalActiveSites: analytics.totalActiveSites,
        totalNativeSpecies: analytics.totalNativeSpecies,
        totalNonNativeSpecies: analytics.totalNonNativeSpecies,
        totalContributors: analytics.totalContributors,
        activeContributors30Days: analytics.activeContributors30Days,
      },
      survivalMetrics: {
        aliveTreesCount: analytics.aliveTreesCount,
        deadTreesCount: analytics.deadTreesCount,
        unknownTreesCount: analytics.unknownTreesCount,
        overallSurvivalRate: Number(analytics.overallSurvivalRate),
      },
      growthComparison: {
        treesPlantedGrowthRate: Number(analytics.treesPlantedGrowthRate),
        interventionsGrowthRate: Number(analytics.interventionsGrowthRate),
        previousMonthTreesPlanted: analytics.previousMonthTreesPlanted,
        previousMonthInterventions: analytics.previousMonthInterventions,
      },
      recentActivity: {
        recentTreesPlanted: analytics.recentTreesPlanted,
        recentInterventions: analytics.recentInterventions,
        recentMeasurements: analytics.recentMeasurements,
      },
      memberActivity: analytics.memberActivitySummary as any[],
      interventionDistribution: analytics.interventionTypesDistribution as Record<string, number>,
    };
  }

  async getSpeciesAnalytics(
    projectId: number,
    query: SpeciesAnalyticsQueryDto,
  ): Promise<SpeciesAnalyticsResponse[]> {
    // Build where conditions array
    const whereConditions = [eq(schema.speciesAnalytics.projectId, projectId)];

    // Add conditional where clause
    if (query.nativeOnly) {
      whereConditions.push(eq(schema.speciesAnalytics.isNative, true));
    }

    // Build the complete query
    const speciesQuery = this.drizzleService.db
      .select()
      .from(schema.speciesAnalytics)
      .where(and(...whereConditions))
      .orderBy(
        query.sortBy === 'asc'
          ? asc(schema.speciesAnalytics.survivalRate)
          : desc(schema.speciesAnalytics.survivalRate)
      )
      .limit(query.limit || 10);

    const results = await speciesQuery;

    return results.map(species => ({
      speciesId: species.scientificSpeciesId,
      scientificName: species.scientificName,
      commonName: species.commonName || '',
      isNative: species.isNative,
      totalPlanted: species.totalPlanted,
      currentAlive: species.currentAlive,
      currentDead: species.currentDead,
      survivalRate: Number(species.survivalRate),
      survivalRank: species.survivalRank || 0,
      averageHeight: Number(species.averageHeight) || 0,
      averageGrowthRate: Number(species.averageGrowthRate) || 0,
      growthRateRank: species.growthRateRank || 0,
      totalMeasurements: species.totalMeasurements,
      averageHealthScore: Number(species.averageHealthScore) || 0,
      recommendedSpecies: species.recommendedSpecies,
      riskCategory: species.riskCategory || 'low',
    }));
  }

  async getSiteAnalytics(projectId: number): Promise<SiteAnalyticsResponse[]> {
    const results = await this.drizzleService.db
      .select()
      .from(schema.siteAnalytics)
      .where(eq(schema.siteAnalytics.projectId, projectId))
      .orderBy(desc(schema.siteAnalytics.survivalRate));

    return results.map(site => ({
      siteId: site.siteId,
      siteName: site.siteName,
      siteArea: Number(site.siteArea) || 0,
      totalInterventions: site.totalInterventions,
      totalTreesPlanted: site.totalTreesPlanted,
      aliveTreesCount: site.aliveTreesCount,
      deadTreesCount: site.deadTreesCount,
      survivalRate: Number(site.survivalRate),
      uniqueSpeciesCount: site.uniqueSpeciesCount,
      nativeSpeciesCount: site.nativeSpeciesCount,
      nativeSpeciesPercentage: Number(site.nativeSpeciesPercentage),
      lastInterventionDate: site.lastInterventionDate?.toISOString() || '',
      lastMeasurementDate: site.lastMeasurementDate?.toISOString() || '',
      activeContributors: site.activeContributors,
      densityPerHectare: Number(site.densityPerHectare) || 0,
      siteProductivityScore: Number(site.siteProductivityScore) || 0,
    }));
  }

  async getTreesPlantedGraphData(
    projectId: number,
    query: GraphDataQueryDto,
  ): Promise<GraphDataResponse> {
    const analytics = await this.drizzleService.db
      .select()
      .from(schema.projectAnalytics)
      .where(eq(schema.projectAnalytics.projectId, projectId))
      .limit(1);

    if (!analytics.length) {
      return this.getEmptyGraphData(query.period ?? AnalyticsPeriod.MONTHLY);
    }

    const data = analytics[0];
    let graphData: Record<string, number> = {};
    let dateRange = { start: '', end: '' };

    switch (query.period) {
      case AnalyticsPeriod.DAILY:
        graphData = data.dailyTreesPlanted as Record<string, number>;
        break;
      case AnalyticsPeriod.WEEKLY:
        graphData = data.weeklyTreesPlanted as Record<string, number>;
        break;
      case AnalyticsPeriod.MONTHLY:
      default:
        graphData = data.monthlyTreesPlanted as Record<string, number>;
        break;
    }

    // Calculate date range
    const dates = Object.keys(graphData).sort();
    if (dates.length > 0) {
      dateRange.start = dates[0];
      dateRange.end = dates[dates.length - 1];
    }

    return {
      period: query.period ?? AnalyticsPeriod.MONTHLY,
      data: graphData,
      totalDataPoints: Object.keys(graphData).length,
      dateRange,
    };
  }

  async getInterventionDistributionData(
    projectId: number,
  ): Promise<{ distribution: Record<string, number> }> {
    const analytics = await this.drizzleService.db
      .select({
        distribution: schema.projectAnalytics.interventionTypesDistribution,
      })
      .from(schema.projectAnalytics)
      .where(eq(schema.projectAnalytics.projectId, projectId))
      .limit(1);

    return {
      distribution: (analytics[0]?.distribution as Record<string, number>) || {},
    };
  }

  async getHistoricalAnalytics(
    projectId: number,
    query: AnalyticsQueryDto,
  ): Promise<HistoricalAnalyticsResponse> {
    const months = query.months || 3;

    const results = await this.drizzleService.db
      .select()
      .from(schema.projectAnalyticsHistory)
      .where(eq(schema.projectAnalyticsHistory.projectId, projectId))
      .orderBy(desc(schema.projectAnalyticsHistory.snapshotDate))
      .limit(months);

    return {
      projectId,
      historicalData: results.map(record => ({
        year: record.snapshotYear,
        month: record.snapshotMonth,
        date: record.snapshotDate,
        totalTreesPlanted: record.totalTreesPlanted,
        totalSpeciesPlanted: record.totalSpeciesPlanted,
        areaCovered: Number(record.areaCovered),
        totalActiveSites: record.totalActiveSites,
        aliveTreesCount: record.aliveTreesCount,
        deadTreesCount: record.deadTreesCount,
        overallSurvivalRate: Number(record.overallSurvivalRate),
        treesPlantedThisMonth: record.treesPlantedThisMonth,
        interventionsThisMonth: record.interventionsThisMonth,
        newMembersThisMonth: record.newMembersThisMonth,
      })),
      months,
    };
  }

  async getCsvExportData(projectId: number): Promise<CsvExportDataResponse> {
    // Get project analytics
    const projectAnalytics = await this.getProjectAnalytics(projectId);

    // Get species data
    const speciesData = await this.getSpeciesAnalytics(projectId, { limit: 100 });

    // Get site data
    const siteData = await this.getSiteAnalytics(projectId);

    // Get monthly trends
    const historicalData = await this.getHistoricalAnalytics(projectId, { months: 12 });

    return {
      projectSummary: {
        projectName: projectAnalytics.projectName,
        exportDate: new Date().toISOString(),
        totalTreesPlanted: projectAnalytics.basicKpis.totalTreesPlanted,
        totalSpeciesPlanted: projectAnalytics.basicKpis.totalSpeciesPlanted,
        areaCovered: projectAnalytics.basicKpis.areaCovered,
        overallSurvivalRate: projectAnalytics.survivalMetrics.overallSurvivalRate,
      },
      speciesData: speciesData.map(species => ({
        scientificName: species.scientificName,
        commonName: species.commonName,
        isNative: species.isNative ? 'Yes' : 'No',
        totalPlanted: species.totalPlanted,
        survivalRate: species.survivalRate,
        averageGrowthRate: species.averageGrowthRate,
        averageHeight: species.averageHeight,
        totalMeasurements: species.totalMeasurements,
      })),
      siteData: siteData.map(site => ({
        siteName: site.siteName,
        totalTreesPlanted: site.totalTreesPlanted,
        survivalRate: site.survivalRate,
        uniqueSpeciesCount: site.uniqueSpeciesCount,
        nativeSpeciesPercentage: site.nativeSpeciesPercentage,
        densityPerHectare: site.densityPerHectare,
      })),
      monthlyTrends: historicalData.historicalData.map(record => ({
        date: record.date,
        treesPlanted: record.treesPlantedThisMonth,
        interventions: record.interventionsThisMonth,
        survivalRate: record.overallSurvivalRate,
      })),
    };
  }

  async getAnalyticsStatus(projectId: number) {
    const project = await this.drizzleService.db
      .select({
        analyticsStatus: schema.projects.analyticsStatus,
        lastAnalyticsRefresh: schema.projects.lastAnalyticsRefresh,
      })
      .from(schema.projects)
      .where(eq(schema.projects.id, projectId))
      .limit(1);

    if (!project.length) {
      throw new BadRequestException('Project not found');
    }

    // Check for running jobs
    const waitingJobs = await this.analyticsQueue.getWaiting();
    const activeJobs = await this.analyticsQueue.getActive();

    const isProcessing = [...waitingJobs, ...activeJobs].some(
      job => job.data.projectId === projectId
    );

    return {
      status: isProcessing ? 'processing' : project[0].analyticsStatus,
      lastRefresh: project[0].lastAnalyticsRefresh?.toISOString() || null,
      isProcessing,
    };
  }

  private getEmptyAnalyticsResponse(projectId: number): ProjectAnalyticsResponse {
    return {
      projectId,
      projectName: 'Unknown Project',
      lastRefresh: new Date().toISOString(),
      basicKpis: {
        totalTreesPlanted: 0,
        totalSpeciesPlanted: 0,
        areaCovered: 0,
        totalActiveSites: 0,
        totalNativeSpecies: 0,
        totalNonNativeSpecies: 0,
        totalContributors: 0,
        activeContributors30Days: 0,
      },
      survivalMetrics: {
        aliveTreesCount: 0,
        deadTreesCount: 0,
        unknownTreesCount: 0,
        overallSurvivalRate: 0,
      },
      growthComparison: {
        treesPlantedGrowthRate: 0,
        interventionsGrowthRate: 0,
        previousMonthTreesPlanted: 0,
        previousMonthInterventions: 0,
      },
      recentActivity: {
        recentTreesPlanted: 0,
        recentInterventions: 0,
        recentMeasurements: 0,
      },
      memberActivity: [],
      interventionDistribution: {},
    };
  }

  private getEmptyGraphData(period: AnalyticsPeriod): GraphDataResponse {
    return {
      period,
      data: {},
      totalDataPoints: 0,
      dateRange: {
        start: '',
        end: '',
      },
    };
  }
}

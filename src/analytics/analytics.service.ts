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
    // setInterval(() => this.cleanupRateLimit(), 60 * 60 * 1000);
  }

  // async queueAnalyticsRefresh(projectId: number, userId: number): Promise<void> {
  //   // Check rate limit
  //   this.checkRateLimit(projectId);

  //   // Update rate limit
  //   this.updateRateLimit(projectId);

  //   // Queue the analytics refresh job
  //   await this.analyticsQueue.add(
  //     'refresh-project-analytics',
  //     {
  //       projectId,
  //       userId,
  //       timestamp: new Date().toISOString(),
  //     },
  //     {
  //       attempts: 3,
  //       backoff: {
  //         type: 'exponential',
  //         delay: 2000,
  //       },
  //     },
  //   );

  //   // Note: Remove analyticsStatus update since it doesn't exist in schema
  //   // If you need status tracking, add it to the schema or use metadata field
  // }

  // private checkRateLimit(projectId: number): void {
  //   const now = Date.now();
  //   const hourInMs = 60 * 60 * 1000;

  //   const record = this.rateLimitMap.get(projectId);

  //   if (!record) {
  //     return; // No previous attempts
  //   }

  //   if (now > record.resetTime) {
  //     this.rateLimitMap.delete(projectId);
  //     return; // Reset time has passed
  //   }

  //   if (record.count >= 2) {
  //     const retryAfter = Math.ceil((record.resetTime - now) / 1000);
  //     const error: any = new BadRequestException('Rate limit exceeded');
  //     error.message = `Rate limit exceeded. Analytics can only be refreshed 2 times per hour.`;
  //     error.retryAfter = retryAfter;
  //     throw error;
  //   }
  // }

  // private updateRateLimit(projectId: number): void {
  //   const now = Date.now();
  //   const hourInMs = 60 * 60 * 1000;

  //   const record = this.rateLimitMap.get(projectId);

  //   if (!record || now > record.resetTime) {
  //     this.rateLimitMap.set(projectId, {
  //       count: 1,
  //       resetTime: now + hourInMs,
  //     });
  //   } else {
  //     record.count += 1;
  //   }
  // }

  // private cleanupRateLimit(): void {
  //   const now = Date.now();
  //   for (const [projectId, record] of this.rateLimitMap.entries()) {
  //     if (now > record.resetTime) {
  //       this.rateLimitMap.delete(projectId);
  //     }
  //   }
  // }

  // async getProjectAnalytics(projectId: number): Promise<ProjectAnalyticsResponse> {
  //   // Get current analytics data
  //   const analyticsData = await this.drizzleService.db
  //     .select()
  //     .from(schema.projectAnalytics)
  //     .where(eq(schema.projectAnalytics.projectId, projectId))
  //     .limit(1);

  //   if (!analyticsData.length) {
  //     // If no analytics data exists, return empty structure
  //     return this.getEmptyAnalyticsResponse(projectId);
  //   }

  //   const analytics = analyticsData[0];

  //   // Get project name
  //   const project = await this.drizzleService.db
  //     .select({ name: schema.projects.projectName })
  //     .from(schema.projects)
  //     .where(eq(schema.projects.id, projectId))
  //     .limit(1);
      

  //   return {
  //     projectId,
  //     projectName: project[0]?.name || 'Unknown Project',
  //     lastRefresh: analytics.calculatedAt.toISOString(),
  //     basicKpis: {
  //       // Fixed: Use correct field names from schema
  //       totalTreesPlanted: analytics.totalTrees || 0,
  //       totalSpeciesPlanted: analytics.totalSpecies || 0,
  //       areaCovered: Number(analytics.totalArea) || 0,
  //       totalActiveSites: analytics.activeSites || 0,
  //       totalNativeSpecies: analytics.nativeSpeciesCount || 0,
  //       totalNonNativeSpecies: (analytics.totalSpecies || 0) - (analytics.nativeSpeciesCount || 0),
  //       totalContributors: analytics.totalMembers || 0,
  //       activeContributors30Days: analytics.activeMembers || 0,
  //     },
  //     survivalMetrics: {
  //       aliveTreesCount: analytics.aliveTrees || 0,
  //       deadTreesCount: analytics.deadTrees || 0,
  //       unknownTreesCount: analytics.unknownStatusTrees || 0,
  //       overallSurvivalRate: Number(analytics.survivalRate) || 0,
  //     },
  //     growthComparison: {
  //       // Fixed: Use correct field names or calculate from trends
  //       treesPlantedGrowthRate: Number(analytics.treeGrowthTrend) || 0,
  //       interventionsGrowthRate: Number(analytics.activityTrend) || 0,
  //       previousMonthTreesPlanted: analytics.treesPlantedLast30Days || 0,
  //       previousMonthInterventions: analytics.completedInterventions || 0,
  //     },
  //     recentActivity: {
  //       recentTreesPlanted: analytics.treesPlantedLast30Days || 0,
  //       recentInterventions: analytics.activitiesLast30Days || 0,
  //       recentMeasurements: analytics.measurementsTakenLast30Days || 0,
  //     },
  //     // Parse JSONB fields safely
  //     memberActivity: [],
  //     interventionDistribution: {},
  //   };
  // }

  // async getSpeciesAnalytics(
  //   projectId: number,
  //   query: SpeciesAnalyticsQueryDto,
  // ): Promise<SpeciesAnalyticsResponse[]> {
  //   // Fixed: Join with scientific_species to get names
  //   const whereConditions = [eq(schema.speciesAnalytics.projectId, projectId)];

  //   if (query.nativeOnly) {
  //     whereConditions.push(eq(schema.speciesAnalytics.isNative, true));
  //   }

  //   const results = await this.drizzleService.db
  //     .select({
  //       // Species analytics fields
  //       speciesAnalytics: schema.speciesAnalytics,
  //       // Join with scientific species for names
  //       scientificSpecies: schema.scientificSpecies,
  //     })
  //     .from(schema.speciesAnalytics)
  //     .leftJoin(
  //       schema.scientificSpecies,
  //       eq(schema.speciesAnalytics.scientificSpeciesId, schema.scientificSpecies.id)
  //     )
  //     .where(and(...whereConditions))
  //     .orderBy(
  //       query.sortBy === 'asc'
  //         ? asc(schema.speciesAnalytics.survivalRate)
  //         : desc(schema.speciesAnalytics.survivalRate)
  //     )
  //     .limit(query.limit || 10);

  //   return results.map(row => ({
  //     speciesId: row.speciesAnalytics.scientificSpeciesId,
  //     scientificName: row.scientificSpecies?.scientificName || 'Unknown',
  //     commonName: row.scientificSpecies?.commonName || '',
  //     isNative: row.speciesAnalytics.isNative || false,
  //     totalPlanted: row.speciesAnalytics.totalTrees || 0,
  //     currentAlive: row.speciesAnalytics.aliveTrees || 0,
  //     currentDead: row.speciesAnalytics.deadTrees || 0,
  //     survivalRate: Number(row.speciesAnalytics.survivalRate) || 0,
  //     survivalRank: row.speciesAnalytics.survivalRank || 0,
  //     averageHeight: Number(row.speciesAnalytics.averageHeight) || 0,
  //     averageGrowthRate: Number(row.speciesAnalytics.averageGrowthRate) || 0,
  //     growthRateRank: row.speciesAnalytics.growthRateRank || 0,
  //     totalMeasurements: row.speciesAnalytics.totalMeasurements || 0,
  //     averageHealthScore: Number(row.speciesAnalytics.averageHealthScore) || 0,
  //     recommendedSpecies: row.speciesAnalytics.recommendationScore === 'excellent',
  //     riskCategory: this.calculateRiskCategory(Number(row.speciesAnalytics.survivalRate)),
  //   }));
  // }

  // async getSiteAnalytics(projectId: number): Promise<SiteAnalyticsResponse[]> {
  //   // Fixed: Join with sites table to get site names
  //   const results = await this.drizzleService.db
  //     .select({
  //       siteAnalytics: schema.siteAnalytics,
  //       site: schema.sites,
  //     })
  //     .from(schema.siteAnalytics)
  //     .leftJoin(schema.sites, eq(schema.siteAnalytics.siteId, schema.sites.id))
  //     .where(eq(schema.siteAnalytics.projectId, projectId))
  //     .orderBy(desc(schema.siteAnalytics.survivalRate));

  //   return results.map(row => ({
  //     siteId: row.siteAnalytics.siteId,
  //     siteName: row.site?.name || 'Unknown Site',
  //     siteArea: Number(row.siteAnalytics.siteArea) || 0,
  //     totalInterventions: row.siteAnalytics.totalInterventions || 0,
  //     totalTreesPlanted: row.siteAnalytics.totalTrees || 0,
  //     aliveTreesCount: row.siteAnalytics.aliveTrees || 0,
  //     deadTreesCount: row.siteAnalytics.deadTrees || 0,
  //     survivalRate: Number(row.siteAnalytics.survivalRate) || 0,
  //     uniqueSpeciesCount: row.siteAnalytics.totalSpecies || 0,
  //     nativeSpeciesCount: row.siteAnalytics.nativeSpeciesCount || 0,
  //     nativeSpeciesPercentage: Number(row.siteAnalytics.nativeSpeciesCount) / Number(row.siteAnalytics.totalSpecies) * 100 || 0,
  //     lastInterventionDate: row.siteAnalytics.lastActivityDate?.toISOString() || '',
  //     lastMeasurementDate: row.siteAnalytics.lastActivityDate?.toISOString() || '',
  //     activeContributors: row.siteAnalytics.uniqueContributors || 0,
  //     densityPerHectare: Number(row.siteAnalytics.treeDensity) || 0,
  //     siteProductivityScore: Number(row.siteAnalytics.performanceScore) || 0,
  //   }));
  // }

  // async getTreesPlantedGraphData(
  //   projectId: number,
  //   query: GraphDataQueryDto,
  // ): Promise<GraphDataResponse> {
  //   // For now, generate data from project analytics history
  //   // This should be replaced with proper time-series data
  //   const historyData = await this.drizzleService.db
  //     .select()
  //     .from(schema.projectAnalyticsHistory)
  //     .where(eq(schema.projectAnalyticsHistory.projectId, projectId))
  //     .orderBy(asc(schema.projectAnalyticsHistory.periodStart))
  //     .limit(12); // Last 12 periods

  //   const graphData: Record<string, number> = {};
  //   let dateRange = { start: '', end: '' };

  //   historyData.forEach(record => {
  //     const key = this.formatDateKey(new Date(record.periodStart), query.period || AnalyticsPeriod.MONTHLY);
  //     graphData[key] = record.treesPlanted || 0;
  //   });

  //   // Calculate date range
  //   const dates = Object.keys(graphData).sort();
  //   if (dates.length > 0) {
  //     dateRange.start = dates[0];
  //     dateRange.end = dates[dates.length - 1];
  //   }

  //   return {
  //     period: query.period ?? AnalyticsPeriod.MONTHLY,
  //     data: graphData,
  //     totalDataPoints: Object.keys(graphData).length,
  //     dateRange,
  //   };
  // }

  // async getInterventionDistributionData(
  //   projectId: number,
  // ): Promise<{ distribution: Record<string, number> }> {
  //   // Calculate from interventions table directly since metadata might not have this
  //   const results = await this.drizzleService.db
  //     .select({
  //       type: schema.interventions.type,
  //       count: count(),
  //     })
  //     .from(schema.interventions)
  //     .where(eq(schema.interventions.projectId, projectId))
  //     .groupBy(schema.interventions.type);

  //   const distribution: Record<string, number> = {};
  //   results.forEach(row => {
  //     distribution[row.type] = Number(row.count);
  //   });

  //   return { distribution };
  // }

  // async getHistoricalAnalytics(
  //   projectId: number,
  //   query: AnalyticsQueryDto,
  // ): Promise<HistoricalAnalyticsResponse> {
  //   const months = query.months || 3;

  //   const results = await this.drizzleService.db
  //     .select()
  //     .from(schema.projectAnalyticsHistory)
  //     .where(eq(schema.projectAnalyticsHistory.projectId, projectId))
  //     .orderBy(desc(schema.projectAnalyticsHistory.periodStart))
  //     .limit(months);

  //   return {
  //     projectId,
  //     historicalData: results.map(record => {
  //       const periodStartDate = new Date(record.periodStart);
  //       return {
  //         year: periodStartDate.getFullYear(),
  //         month: periodStartDate.getMonth() + 1,
  //         date: periodStartDate.toISOString().split('T')[0],
  //         totalTreesPlanted: record.totalTrees || 0,
  //         totalSpeciesPlanted: record.totalSpecies || 0,
  //         areaCovered: Number(record.targetProgress) || 0, // Approximation
  //         totalActiveSites: record.activeMembers || 0, // Approximation
  //         aliveTreesCount: record.aliveTrees || 0,
  //         deadTreesCount: record.deadTrees || 0,
  //         overallSurvivalRate: Number(record.survivalRate) || 0,
  //         treesPlantedThisMonth: record.treesPlanted || 0,
  //         interventionsThisMonth: record.interventionsCompleted || 0,
  //         newMembersThisMonth: record.totalMembers || 0, // Approximation
  //       };
  //     }),
  //     months,
  //   };
  // }

  // async getCsvExportData(projectId: number): Promise<CsvExportDataResponse> {
  //   const projectAnalytics = await this.getProjectAnalytics(projectId);
  //   const speciesData = await this.getSpeciesAnalytics(projectId, { limit: 100 });
  //   const siteData = await this.getSiteAnalytics(projectId);
  //   const historicalData = await this.getHistoricalAnalytics(projectId, { months: 12 });

  //   return {
  //     projectSummary: {
  //       projectName: projectAnalytics.projectName,
  //       exportDate: new Date().toISOString(),
  //       totalTreesPlanted: projectAnalytics.basicKpis.totalTreesPlanted,
  //       totalSpeciesPlanted: projectAnalytics.basicKpis.totalSpeciesPlanted,
  //       areaCovered: projectAnalytics.basicKpis.areaCovered,
  //       overallSurvivalRate: projectAnalytics.survivalMetrics.overallSurvivalRate,
  //     },
  //     speciesData: speciesData.map(species => ({
  //       scientificName: species.scientificName,
  //       commonName: species.commonName,
  //       isNative: species.isNative ? 'Yes' : 'No',
  //       totalPlanted: species.totalPlanted,
  //       survivalRate: species.survivalRate,
  //       averageGrowthRate: species.averageGrowthRate,
  //       averageHeight: species.averageHeight,
  //       totalMeasurements: species.totalMeasurements,
  //     })),
  //     siteData: siteData.map(site => ({
  //       siteName: site.siteName,
  //       totalTreesPlanted: site.totalTreesPlanted,
  //       survivalRate: site.survivalRate,
  //       uniqueSpeciesCount: site.uniqueSpeciesCount,
  //       nativeSpeciesPercentage: site.nativeSpeciesPercentage,
  //       densityPerHectare: site.densityPerHectare,
  //     })),
  //     monthlyTrends: historicalData.historicalData.map(record => ({
  //       date: record.date,
  //       treesPlanted: record.treesPlantedThisMonth,
  //       interventions: record.interventionsThisMonth,
  //       survivalRate: record.overallSurvivalRate,
  //     })),
  //   };
  // }

  // async getAnalyticsStatus(projectId: number) {
  //   // Since analyticsStatus doesn't exist in schema, check analytics job queue instead
  //   const waitingJobs = await this.analyticsQueue.getWaiting();
  //   const activeJobs = await this.analyticsQueue.getActive();

  //   const isProcessing = [...waitingJobs, ...activeJobs].some(
  //     job => job.data.projectId === projectId
  //   );

  //   // Get last analytics calculation time
  //   const analytics = await this.drizzleService.db
  //     .select({ calculatedAt: schema.projectAnalytics.calculatedAt })
  //     .from(schema.projectAnalytics)
  //     .where(eq(schema.projectAnalytics.projectId, projectId))
  //     .limit(1);

  //   return {
  //     status: isProcessing ? 'processing' : 'completed',
  //     lastRefresh: analytics[0]?.calculatedAt?.toISOString() || null,
  //     isProcessing,
  //   };
  // }

  // // Helper methods
  // private parseJsonField(metadata: any, field: string): any {
  //   try {
  //     if (metadata && typeof metadata === 'object' && metadata[field]) {
  //       return metadata[field];
  //     }
  //     return null;
  //   } catch {
  //     return null;
  //   }
  // }

  // private calculateRiskCategory(survivalRate: number): string {
  //   if (survivalRate >= 80) return 'low';
  //   if (survivalRate >= 60) return 'medium';
  //   return 'high';
  // }

  // private formatDateKey(date: Date, period: AnalyticsPeriod): string {
  //   switch (period) {
  //     case AnalyticsPeriod.DAILY:
  //       return date.toISOString().split('T')[0];
  //     case AnalyticsPeriod.WEEKLY:
  //       const week = this.getWeekNumber(date);
  //       return `${date.getFullYear()}-W${week.toString().padStart(2, '0')}`;
  //     case AnalyticsPeriod.MONTHLY:
  //     default:
  //       return `${date.getFullYear()}-${(date.getMonth() + 1).toString().padStart(2, '0')}`;
  //   }
  // }

  // private getWeekNumber(date: Date): number {
  //   const firstDayOfYear = new Date(date.getFullYear(), 0, 1);
  //   const pastDaysOfYear = (date.getTime() - firstDayOfYear.getTime()) / 86400000;
  //   return Math.ceil((pastDaysOfYear + firstDayOfYear.getDay() + 1) / 7);
  // }

  // private getEmptyAnalyticsResponse(projectId: number): ProjectAnalyticsResponse {
  //   return {
  //     projectId,
  //     projectName: 'Unknown Project',
  //     lastRefresh: new Date().toISOString(),
  //     basicKpis: {
  //       totalTreesPlanted: 0,
  //       totalSpeciesPlanted: 0,
  //       areaCovered: 0,
  //       totalActiveSites: 0,
  //       totalNativeSpecies: 0,
  //       totalNonNativeSpecies: 0,
  //       totalContributors: 0,
  //       activeContributors30Days: 0,
  //     },
  //     survivalMetrics: {
  //       aliveTreesCount: 0,
  //       deadTreesCount: 0,
  //       unknownTreesCount: 0,
  //       overallSurvivalRate: 0,
  //     },
  //     growthComparison: {
  //       treesPlantedGrowthRate: 0,
  //       interventionsGrowthRate: 0,
  //       previousMonthTreesPlanted: 0,
  //       previousMonthInterventions: 0,
  //     },
  //     recentActivity: {
  //       recentTreesPlanted: 0,
  //       recentInterventions: 0,
  //       recentMeasurements: 0,
  //     },
  //     memberActivity: [],
  //     interventionDistribution: {},
  //   };
  // }

  // private getEmptyGraphData(period: AnalyticsPeriod): GraphDataResponse {
  //   return {
  //     period,
  //     data: {},
  //     totalDataPoints: 0,
  //     dateRange: {
  //       start: '',
  //       end: '',
  //     },
  //   };
  // }
}
import {
  Controller,
  Get,
  Post,
  Body,
  Patch,
  Param,
  Delete,
  Query,
  UseGuards,
  Request,
  HttpStatus,
} from '@nestjs/common';
import {
  ApiTags,
  ApiOperation,
  ApiResponse,
  ApiBearerAuth,
  ApiParam,
  ApiQuery,
} from '@nestjs/swagger';
import { SitesService } from './sites.service';
import { CreateSiteDto } from './dto/create-site.dto';
import { UpdateSiteDto } from './dto/update-site.dto';
import { SiteQueryDto } from './dto/site-query.dto';
import { Site } from './entities/site.entity';
import { JwtAuthGuard } from '../auth/jwt-auth.guard';

@ApiTags('Sites')
@ApiBearerAuth()
@UseGuards(JwtAuthGuard)
@Controller('sites')
export class SitesController {
  constructor(private readonly sitesService: SitesService) {}

  @Post('projects/:projectId')
  @ApiOperation({ summary: 'Create a new site in a project' })
  @ApiParam({ name: 'projectId', description: 'Project ID' })
  @ApiResponse({
    status: HttpStatus.CREATED,
    description: 'Site created successfully',
    type: Site,
  })
  @ApiResponse({
    status: HttpStatus.BAD_REQUEST,
    description: 'Invalid input data',
  })
  @ApiResponse({
    status: HttpStatus.FORBIDDEN,
    description: 'Access denied to project',
  })
  async create(
    @Param('projectId') projectId: string,
    @Body() createSiteDto: CreateSiteDto,
    @Request() req: any,
  ): Promise<Site> {
    return this.sitesService.create(createSiteDto, projectId, req.user.id);
  }

  @Get()
  @ApiOperation({ summary: 'Get all sites with filtering and pagination' })
  @ApiQuery({ name: 'projectId', required: false, description: 'Filter by project ID' })
  @ApiQuery({ name: 'search', required: false, description: 'Search by site name' })
  @ApiQuery({ name: 'page', required: false, description: 'Page number' })
  @ApiQuery({ name: 'limit', required: false, description: 'Items per page' })
  @ApiResponse({
    status: HttpStatus.OK,
    description: 'Sites retrieved successfully',
  })
  async findAll(
    @Query() query: SiteQueryDto,
    @Request() req: any,
  ): Promise<{ sites: Site[]; total: number; page: number; limit: number }> {
    return this.sitesService.findAll(query, req.user.id);
  }

  @Get('projects/:projectId')
  @ApiOperation({ summary: 'Get all sites in a specific project' })
  @ApiParam({ name: 'projectId', description: 'Project ID' })
  @ApiResponse({
    status: HttpStatus.OK,
    description: 'Project sites retrieved successfully',
    type: [Site],
  })
  @ApiResponse({
    status: HttpStatus.FORBIDDEN,
    description: 'Access denied to project',
  })
  async findByProject(
    @Param('projectId') projectId: string,
    @Request() req: any,
  ): Promise<Site[]> {
    return this.sitesService.findByProject(projectId, req.user.sub);
  }

  @Get(':id')
  @ApiOperation({ summary: 'Get a site by ID' })
  @ApiParam({ name: 'id', description: 'Site ID' })
  @ApiResponse({
    status: HttpStatus.OK,
    description: 'Site retrieved successfully',
    type: Site,
  })
  @ApiResponse({
    status: HttpStatus.NOT_FOUND,
    description: 'Site not found',
  })
  @ApiResponse({
    status: HttpStatus.FORBIDDEN,
    description: 'Access denied to site',
  })
  async findOne(@Param('id') id: string, @Request() req: any): Promise<Site> {
    return this.sitesService.findOne(id, req.user.sub);
  }

  @Get(':id/stats')
  @ApiOperation({ summary: 'Get site statistics' })
  @ApiParam({ name: 'id', description: 'Site ID' })
  @ApiResponse({
    status: HttpStatus.OK,
    description: 'Site statistics retrieved successfully',
  })
  @ApiResponse({
    status: HttpStatus.NOT_FOUND,
    description: 'Site not found',
  })
  @ApiResponse({
    status: HttpStatus.FORBIDDEN,
    description: 'Access denied to site',
  })
  async getSiteStats(
    @Param('id') id: string,
    @Request() req: any,
  ): Promise<{
    treeCount: number;
    speciesCount: number;
    aliveTreesCount: number;
    deadTreesCount: number;
  }> {
    return this.sitesService.getSiteStats(id, req.user.sub);
  }

  @Patch(':id')
  @ApiOperation({ summary: 'Update a site' })
  @ApiParam({ name: 'id', description: 'Site ID' })
  @ApiResponse({
    status: HttpStatus.OK,
    description: 'Site updated successfully',
    type: Site,
  })
  @ApiResponse({
    status: HttpStatus.NOT_FOUND,
    description: 'Site not found',
  })
  @ApiResponse({
    status: HttpStatus.FORBIDDEN,
    description: 'Insufficient permissions',
  })
  async update(
    @Param('id') id: string,
    @Body() updateSiteDto: UpdateSiteDto,
    @Request() req: any,
  ): Promise<Site> {
    return this.sitesService.update(id, updateSiteDto, req.user.sub);
  }

  @Delete(':id')
  @ApiOperation({ summary: 'Delete a site' })
  @ApiParam({ name: 'id', description: 'Site ID' })
  @ApiResponse({
    status: HttpStatus.NO_CONTENT,
    description: 'Site deleted successfully',
  })
  @ApiResponse({
    status: HttpStatus.NOT_FOUND,
    description: 'Site not found',
  })
  @ApiResponse({
    status: HttpStatus.FORBIDDEN,
    description: 'Insufficient permissions',
  })
  @ApiResponse({
    status: HttpStatus.BAD_REQUEST,
    description: 'Cannot delete site with trees',
  })
  async remove(@Param('id') id: string, @Request() req: any): Promise<void> {
    return this.sitesService.remove(id, req.user.sub);
  }
}

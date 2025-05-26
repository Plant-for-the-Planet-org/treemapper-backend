// src/projects/projects.controller.ts
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
  ParseIntPipe,
  NotFoundException,
} from '@nestjs/common';
import {
  ApiTags,
  ApiOperation,
  ApiBearerAuth,
  ApiParam,
} from '@nestjs/swagger';
import { ProjectsService } from './projects.service';
import { CreateProjectDto } from './dto/create-project.dto';
import { UpdateProjectDto } from './dto/update-project.dto';
import { ProjectQueryDto } from './dto/project-query.dto';
import { JwtAuthGuard } from '../auth/jwt-auth.guard';
import { CurrentUser } from '../auth/current-user.decorator';
import { User } from '../users/entities/user.entity';
import { ResponseUtil } from '../common/utils/response.util';
import { 
  ApiSuccessResponse, 
  ApiErrorResponse 
} from '../common/decorator/api-response.decorator';

@ApiTags('Projects')
@ApiBearerAuth()
@UseGuards(JwtAuthGuard)
@Controller('projects')
export class ProjectsController {
  constructor(private readonly projectsService: ProjectsService) {}

  // ============================================================================
  // CREATE OPERATIONS
  // ============================================================================

  @Post()
  @ApiOperation({ summary: 'Create a new project' })
  @ApiSuccessResponse({ 
    description: 'Project created successfully', 
    code: 'project_created' 
  })
  @ApiErrorResponse({ 
    status: 409, 
    description: 'Slug already exists', 
    code: 'slug_already_exists' 
  })
  async create(
    @Body() createProjectDto: CreateProjectDto,
    @CurrentUser() user: User
  ) {
    const project = await this.projectsService.create(createProjectDto, user.id);
    return ResponseUtil.success(
      project,
      'Project created successfully',
      'project_created'
    );
  }

  // ============================================================================
  // READ OPERATIONS
  // ============================================================================

  @Get()
  @ApiOperation({ summary: 'Get all projects with filtering and pagination' })
  @ApiSuccessResponse({ 
    description: 'Projects retrieved successfully', 
    code: 'projects_fetched' 
  })
  async findAll(@Query() query: ProjectQueryDto) {
    const result = await this.projectsService.findAll(query);
    return ResponseUtil.success(
      result,
      'Projects retrieved successfully',
      'projects_fetched'
    );
  }

  @Get('my-projects')
  @ApiOperation({ summary: 'Get current user projects' })
  @ApiSuccessResponse({ 
    description: 'User projects retrieved successfully', 
    code: 'user_projects_fetched' 
  })
  async getMyProjects(
    @Query() query: Omit<ProjectQueryDto, 'createdById'>,
    @CurrentUser() user: User
  ) {
    const result = await this.projectsService.findUserProjects(user.id, query);
    return ResponseUtil.success(
      result,
      'User projects retrieved successfully',
      'user_projects_fetched'
    );
  }

  @Get('stats')
  @ApiOperation({ summary: 'Get project statistics' })
  @ApiSuccessResponse({ 
    description: 'Project statistics retrieved successfully', 
    code: 'project_stats_fetched' 
  })
  async getStats() {
    const stats = await this.projectsService.getProjectStats();
    return ResponseUtil.success(
      stats,
      'Project statistics retrieved successfully',
      'project_stats_fetched'
    );
  }

  @Get('check-slug')
  @ApiOperation({ summary: 'Check if slug exists' })
  @ApiSuccessResponse({ 
    description: 'Slug check completed', 
    code: 'slug_check_completed' 
  })
  async checkSlug(@Query('slug') slug: string) {
    const exists = await this.projectsService.checkSlugExists(slug);
    return ResponseUtil.success(
      { exists },
      exists ? 'Slug already exists' : 'Slug is available',
      'slug_check_completed'
    );
  }

  @Get('by-slug/:slug')
  @ApiOperation({ summary: 'Get project by slug' })
  @ApiParam({ name: 'slug', type: String, description: 'Project slug' })
  @ApiSuccessResponse({ 
    description: 'Project found successfully', 
    code: 'project_found_by_slug' 
  })
  @ApiErrorResponse({ 
    status: 404, 
    description: 'Project not found', 
    code: 'project_not_found' 
  })
  async findBySlug(@Param('slug') slug: string) {
    const project = await this.projectsService.findBySlug(slug);
    if (!project) {
      throw new NotFoundException({
        message: `Project with slug ${slug} not found`,
        error: { slug },
        code: 'project_not_found',
      });
    }
    return ResponseUtil.success(
      project,
      'Project found successfully',
      'project_found_by_slug'
    );
  }

  @Get('by-guid/:guid')
  @ApiOperation({ summary: 'Get project by GUID' })
  @ApiParam({ name: 'guid', type: String, description: 'Project GUID' })
  @ApiSuccessResponse({ 
    description: 'Project found successfully', 
    code: 'project_found_by_guid' 
  })
  @ApiErrorResponse({ 
    status: 404, 
    description: 'Project not found', 
    code: 'project_not_found' 
  })
  async findByGuid(@Param('guid') guid: string) {
    const project = await this.projectsService.findByGuid(guid);
    return ResponseUtil.success(
      project,
      'Project found successfully',
      'project_found_by_guid'
    );
  }

  @Get(':id')
  @ApiOperation({ summary: 'Get project by ID' })
  @ApiParam({ name: 'id', type: Number, description: 'Project ID' })
  @ApiSuccessResponse({ 
    description: 'Project found successfully', 
    code: 'project_found_by_id' 
  })
  @ApiErrorResponse({ 
    status: 404, 
    description: 'Project not found', 
    code: 'project_not_found' 
  })
  async findOne(@Param('id', ParseIntPipe) id: number) {
    const project = await this.projectsService.findOne(id);
    return ResponseUtil.success(
      project,
      'Project found successfully',
      'project_found_by_id'
    );
  }

  // ============================================================================
  // UPDATE OPERATIONS
  // ============================================================================

  @Patch(':id')
  @ApiOperation({ summary: 'Update project by ID' })
  @ApiParam({ name: 'id', type: Number, description: 'Project ID' })
  @ApiSuccessResponse({ 
    description: 'Project updated successfully', 
    code: 'project_updated' 
  })
  @ApiErrorResponse({ 
    status: 404, 
    description: 'Project not found', 
    code: 'project_not_found' 
  })
  @ApiErrorResponse({ 
    status: 403, 
    description: 'Insufficient permissions', 
    code: 'insufficient_permissions' 
  })
  async update(
    @Param('id', ParseIntPipe) id: number,
    @Body() updateProjectDto: UpdateProjectDto,
    @CurrentUser() user: User
  ) {
    const project = await this.projectsService.update(id, updateProjectDto, user.id);
    return ResponseUtil.success(
      project,
      'Project updated successfully',
      'project_updated'
    );
  }

  @Patch('by-slug/:slug')
  @ApiOperation({ summary: 'Update project by slug' })
  @ApiParam({ name: 'slug', type: String, description: 'Project slug' })
  @ApiSuccessResponse({ 
    description: 'Project updated successfully', 
    code: 'project_updated' 
  })
  async updateBySlug(
    @Param('slug') slug: string,
    @Body() updateProjectDto: UpdateProjectDto,
    @CurrentUser() user: User
  ) {
    const project = await this.projectsService.updateBySlug(slug, updateProjectDto, user.id);
    return ResponseUtil.success(
      project,
      'Project updated successfully',
      'project_updated'
    );
  }

  @Patch(':id/deactivate')
  @ApiOperation({ summary: 'Deactivate project' })
  @ApiParam({ name: 'id', type: Number, description: 'Project ID' })
  @ApiSuccessResponse({ 
    description: 'Project deactivated successfully', 
    code: 'project_deactivated' 
  })
  async deactivate(
    @Param('id', ParseIntPipe) id: number,
    @CurrentUser() user: User
  ) {
    const project = await this.projectsService.deactivate(id, user.id);
    return ResponseUtil.success(
      project,
      'Project deactivated successfully',
      'project_deactivated'
    );
  }

  @Patch(':id/activate')
  @ApiOperation({ summary: 'Activate project' })
  @ApiParam({ name: 'id', type: Number, description: 'Project ID' })
  @ApiSuccessResponse({ 
    description: 'Project activated successfully', 
    code: 'project_activated' 
  })
  async activate(
    @Param('id', ParseIntPipe) id: number,
    @CurrentUser() user: User
  ) {
    const project = await this.projectsService.activate(id, user.id);
    return ResponseUtil.success(
      project,
      'Project activated successfully',
      'project_activated'
    );
  }

  @Patch(':id/make-private')
  @ApiOperation({ summary: 'Make project private' })
  @ApiParam({ name: 'id', type: Number, description: 'Project ID' })
  @ApiSuccessResponse({ 
    description: 'Project made private successfully', 
    code: 'project_made_private' 
  })
  async makePrivate(
    @Param('id', ParseIntPipe) id: number,
    @CurrentUser() user: User
  ) {
    const project = await this.projectsService.makePrivate(id, user.id);
    return ResponseUtil.success(
      project,
      'Project made private successfully',
      'project_made_private'
    );
  }

  @Patch(':id/make-public')
  @ApiOperation({ summary: 'Make project public' })
  @ApiParam({ name: 'id', type: Number, description: 'Project ID' })
  @ApiSuccessResponse({ 
    description: 'Project made public successfully', 
    code: 'project_made_public' 
  })
  async makePublic(
    @Param('id', ParseIntPipe) id: number,
    @CurrentUser() user: User
  ) {
    const project = await this.projectsService.makePublic(id, user.id);
    return ResponseUtil.success(
      project,
      'Project made public successfully',
      'project_made_public'
    );
  }

  // ============================================================================
  // DELETE OPERATIONS
  // ============================================================================

  @Delete(':id')
  @ApiOperation({ summary: 'Soft delete project' })
  @ApiParam({ name: 'id', type: Number, description: 'Project ID' })
  @ApiSuccessResponse({ 
    description: 'Project deleted successfully', 
    code: 'project_deleted' 
  })
  @ApiErrorResponse({ 
    status: 403, 
    description: 'Only project owners can delete projects', 
    code: 'insufficient_permissions' 
  })
  async remove(
    @Param('id', ParseIntPipe) id: number,
    @CurrentUser() user: User
  ) {
    const result = await this.projectsService.remove(id, user.id);
    return ResponseUtil.success(
      result,
      'Project deleted successfully',
      'project_deleted'
    );
  }

  @Delete(':id/hard')
  @ApiOperation({ 
    summary: 'Hard delete project',
    description: 'Permanently deletes project from database. Use with caution!'
  })
  @ApiParam({ name: 'id', type: Number, description: 'Project ID' })
  @ApiSuccessResponse({ 
    description: 'Project permanently deleted', 
    code: 'project_hard_deleted' 
  })
  async hardDelete(
    @Param('id', ParseIntPipe) id: number,
    @CurrentUser() user: User
  ) {
    const result = await this.projectsService.hardDelete(id, user.id);
    return ResponseUtil.success(
      result,
      'Project permanently deleted',
      'project_hard_deleted'
    );
  }
}

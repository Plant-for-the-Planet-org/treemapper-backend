
import {
  Controller,
  Get,
  Post,
  Body,
  Patch,
  Param,
  Delete,
  UseGuards,
  Request,
  ParseIntPipe,
} from '@nestjs/common';
import { ProjectsService } from './projects.service';
import { CreateProjectDto } from './dto/create-project.dto';
import { UpdateProjectDto } from './dto/update-project.dto';
import { AddProjectMemberDto } from './dto/add-project-member.dto';
import { UpdateProjectRoleDto } from './dto/update-project-role.dto';
import { JwtAuthGuard } from '../auth/jwt-auth.guard';
import { ProjectPermissionsGuard } from './guards/project-permissions.guard';
import { ProjectRoles } from './decorators/project-roles.decorator';

@Controller('projects')
@UseGuards(JwtAuthGuard)
export class ProjectsController {
  constructor(private readonly projectsService: ProjectsService) {}

  @Post()
  create(@Body() createProjectDto: CreateProjectDto, @Request() req) {
    return this.projectsService.create(createProjectDto, req.user.userId);
  }

  @Get()
  findAll(@Request() req) {
    return this.projectsService.findAll(req.user.userId);
  }

  @Get(':projectId')
  @UseGuards(ProjectPermissionsGuard)
  @ProjectRoles('owner', 'admin', 'editor', 'viewer')
  findOne(@Param('projectId', ParseIntPipe) projectId: number, @Request() req) {
    return this.projectsService.findOne(projectId, req.user.userId);
  }

  @Patch(':projectId')
  @UseGuards(ProjectPermissionsGuard)
  @ProjectRoles('owner', 'admin', 'editor')
  update(
    @Param('projectId', ParseIntPipe) projectId: number,
    @Body() updateProjectDto: UpdateProjectDto,
    @Request() req,
  ) {
    return this.projectsService.update(projectId, updateProjectDto, req.user.userId);
  }

  @Delete(':projectId')
  @UseGuards(ProjectPermissionsGuard)
  @ProjectRoles('owner')
  remove(@Param('projectId', ParseIntPipe) projectId: number, @Request() req) {
    return this.projectsService.remove(projectId, req.user.userId);
  }

  @Get(':projectId/members')
  @UseGuards(ProjectPermissionsGuard)
  @ProjectRoles('owner', 'admin', 'editor', 'viewer')
  getMembers(@Param('projectId', ParseIntPipe) projectId: number) {
    return this.projectsService.getMembers(projectId);
  }

  @Post(':projectId/members')
  @UseGuards(ProjectPermissionsGuard)
  @ProjectRoles('owner', 'admin')
  addMember(
    @Param('projectId', ParseIntPipe) projectId: number,
    @Body() addMemberDto: AddProjectMemberDto,
    @Request() req,
  ) {
    return this.projectsService.addMember(projectId, addMemberDto, req.user.userId);
  }

  @Patch(':projectId/members/:memberId')
  @UseGuards(ProjectPermissionsGuard)
  @ProjectRoles('owner', 'admin')
  updateMemberRole(
    @Param('projectId', ParseIntPipe) projectId: number,
    @Param('memberId', ParseIntPipe) memberId: number,
    @Body() updateRoleDto: UpdateProjectRoleDto,
    @Request() req,
  ) {
    return this.projectsService.updateMemberRole(
      projectId,
      memberId,
      updateRoleDto,
      req.user.userId,
    );
  }

  @Delete(':projectId/members/:memberId')
  @UseGuards(ProjectPermissionsGuard)
  @ProjectRoles('owner', 'admin')
  removeMember(
    @Param('projectId', ParseIntPipe) projectId: number,
    @Param('memberId', ParseIntPipe) memberId: number,
    @Request() req,
  ) {
    return this.projectsService.removeMember(projectId, memberId, req.user.userId);
  }
}
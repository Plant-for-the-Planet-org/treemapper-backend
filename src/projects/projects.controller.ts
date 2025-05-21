// src/projects/projects.controller.ts

import { Controller, Get, Post, Body, Patch, Param, Delete, UseGuards, Req } from '@nestjs/common';
import { ProjectsService } from './projects.service';
import { CreateProjectDto } from './dto/create-project.dto';
import { UpdateProjectDto } from './dto/update-project.dto';
import { AddProjectMemberDto } from './dto/add-project-member.dto';
import { UpdateProjectRoleDto } from './dto/update-project-role.dto';
import { InviteProjectMemberDto } from './dto/invite-project-member.dto';
import { JwtAuthGuard } from '../auth/jwt-auth.guard';
import { ProjectRoles } from './decorators/project-roles.decorator';
import { ProjectPermissionsGuard } from './guards/project-permissions.guard';
import { Public } from 'src/auth/public.decorator';

@Controller('projects')
@UseGuards(JwtAuthGuard)
export class ProjectsController {
  constructor(private readonly projectsService: ProjectsService) {}

  @Post()
  create(@Body() createProjectDto: CreateProjectDto, @Req() req) {
    return this.projectsService.create(createProjectDto, req.user.id);
  }

  @Get()
  findAll(@Req() req) {
    return this.projectsService.findAll(req.user.id);
  }

  @Get(':id')
  @Public()
  findOne(@Param('id') id: string, @Req() req) {
    return this.projectsService.findOne(id);
  }

  @Patch(':id')
  @ProjectRoles('owner', 'admin', 'editor')
  @UseGuards(ProjectPermissionsGuard)
  update(@Param('id') id: string, @Body() updateProjectDto: UpdateProjectDto, @Req() req) {
    return this.projectsService.update(id, updateProjectDto, req.user.sub);
  }

  @Delete(':id')
  @ProjectRoles('owner')
  @UseGuards(ProjectPermissionsGuard)
  remove(@Param('id') id: string, @Req() req) {
    return this.projectsService.remove(id, req.user.sub);
  }

  @Get(':id/members')
  @ProjectRoles('owner', 'admin', 'contributor', 'viewer')
  @UseGuards(ProjectPermissionsGuard)
  getMembers(@Param('id') id: string) {
    return this.projectsService.getMembers(id);
  }

  @Post(':id/members')
  @ProjectRoles('owner', 'admin')
  @UseGuards(ProjectPermissionsGuard)
  addMember(
    @Param('id') id: string,
    @Body() addMemberDto: AddProjectMemberDto,
    @Req() req,
  ) {
    return this.projectsService.addMember(id, addMemberDto, req.user.sub);
  }

  @Post(':id/invites')
  @ProjectRoles('owner', 'admin')
  @UseGuards(ProjectPermissionsGuard)
  inviteMember(
    @Param('id') id: string,
    @Body() inviteDto: InviteProjectMemberDto,
    @Req() req,
  ) {
    console.log("I am not here")
    return this.projectsService.inviteMember(id, inviteDto.email, inviteDto.role, req.user.id, req.user.authName, inviteDto.message);
  }

  @Patch(':id/members/:memberId/role')
  @ProjectRoles('owner', 'admin')
  @UseGuards(ProjectPermissionsGuard)
  updateMemberRole(
    @Param('id') id: string,
    @Param('memberId') memberId: string,
    @Body() updateRoleDto: UpdateProjectRoleDto,
    @Req() req,
  ) {
    return this.projectsService.updateMemberRole(id, memberId, updateRoleDto, req.user.sub);
  }

  @Delete(':id/members/:memberId')
  @ProjectRoles('owner', 'admin')
  @UseGuards(ProjectPermissionsGuard)
  removeMember(
    @Param('id') id: string,
    @Param('memberId') memberId: string,
    @Req() req,
  ) {
    return this.projectsService.removeMember(id, memberId, req.user.sub);
  }
}
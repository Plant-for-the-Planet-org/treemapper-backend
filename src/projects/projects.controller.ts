// src/projects/projects.controller.ts
import { 
  Controller, 
  Get, 
  Post, 
  Body, 
  Patch, 
  Param, 
  Delete, 
  UseGuards, 
  Req,
  ParseIntPipe,
  Query
} from '@nestjs/common';
import { ProjectsService } from './projects.service';
import { CreateProjectDto } from './dto/create-project.dto';
import { UpdateProjectDto } from './dto/update-project.dto';
import { AddProjectMemberDto } from './dto/add-project-member.dto';
import { UpdateProjectRoleDto } from './dto/update-project-role.dto';
import { InviteProjectMemberDto } from './dto/invite-project-member.dto';
import { AcceptInviteDto } from './dto/accept-invite.dto';
import { DeclineInviteDto } from './dto/decline-invite.dto';
import { JwtAuthGuard } from '../auth/jwt-auth.guard';
import { ProjectRoles } from './decorators/project-roles.decorator';
import { ProjectPermissionsGuard } from './guards/project-permissions.guard';
import { Public } from '../auth/public.decorator';

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
  findOne(@Param('id', ParseIntPipe) id: number) {
    return this.projectsService.findOne(id);
  }

  @Patch(':id')
  @ProjectRoles('owner', 'admin')
  @UseGuards(ProjectPermissionsGuard)
  update(
    @Param('id', ParseIntPipe) id: number, 
    @Body() updateProjectDto: UpdateProjectDto, 
    @Req() req
  ) {
    return this.projectsService.update(id, updateProjectDto, req.user.id);
  }

  @Delete(':id')
  @ProjectRoles('owner')
  @UseGuards(ProjectPermissionsGuard)
  remove(@Param('id', ParseIntPipe) id: number, @Req() req) {
    return this.projectsService.remove(id, req.user.id);
  }

  @Get(':id/members')
  @ProjectRoles('owner', 'admin', 'manager' ,'contributor','observer','researcher')
  @UseGuards(ProjectPermissionsGuard)
  getMembers(@Param('id', ParseIntPipe) id: number) {
    return this.projectsService.getMembers(id);
  }

  @Post(':id/members')
  @ProjectRoles('owner', 'admin')
  @UseGuards(ProjectPermissionsGuard)
  addMember(
    @Param('id', ParseIntPipe) id: number,
    @Body() addMemberDto: AddProjectMemberDto,
    @Req() req,
  ) {
    return this.projectsService.addMember(id, addMemberDto, req.user.id);
  }

  @Get(':id/invites')
  @ProjectRoles('owner', 'admin')
  @UseGuards(ProjectPermissionsGuard)
  getProjectInvites(@Param('id', ParseIntPipe) id: number, @Req() req) {
    return this.projectsService.getProjectInvites(id, req.user.id);
  }

  @Post(':id/invites')
  @ProjectRoles('owner', 'admin')
  @UseGuards(ProjectPermissionsGuard)
  inviteMember(
    @Param('id', ParseIntPipe) id: number,
    @Body() inviteDto: InviteProjectMemberDto,
    @Req() req,
  ) {
    return this.projectsService.inviteMember(
      id, 
      inviteDto.email, 
      inviteDto.role, 
      req.user.id, 
      req.user.name || req.user.authName || req.user.email,
      inviteDto.message
    );
  }

  @Post('invites/accept')
  acceptInvite(@Body() acceptInviteDto: AcceptInviteDto, @Req() req) {
    return this.projectsService.acceptInvite(acceptInviteDto.token, req.user.id);
  }

  @Post('invites/decline')
  @Public()
  declineInvite(@Body() declineInviteDto: DeclineInviteDto) {
    return this.projectsService.declineInvite(declineInviteDto.token);
  }

  @Patch(':id/members/:memberId/role')
  @ProjectRoles('owner', 'admin')
  @UseGuards(ProjectPermissionsGuard)
  updateMemberRole(
    @Param('id', ParseIntPipe) id: number,
    @Param('memberId', ParseIntPipe) memberId: number,
    @Body() updateRoleDto: UpdateProjectRoleDto,
    @Req() req,
  ) {
    return this.projectsService.updateMemberRole(id, memberId, updateRoleDto, req.user.id);
  }

  @Delete(':id/members/:memberId')
  @ProjectRoles('owner', 'admin')
  @UseGuards(ProjectPermissionsGuard)
  removeMember(
    @Param('id', ParseIntPipe) id: number,
    @Param('memberId', ParseIntPipe) memberId: number,
    @Req() req,
  ) {
    return this.projectsService.removeMember(id, memberId, req.user.id);
  }
}
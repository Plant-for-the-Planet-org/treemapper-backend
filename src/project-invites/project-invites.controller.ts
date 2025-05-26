import {
  Controller,
  Post,
  Get,
  Put,
  Delete,
  Body,
  Param,
  Query,
  UseGuards,
  Req,
  ParseIntPipe,
} from '@nestjs/common';
import {
  ApiTags,
  ApiOperation,
  ApiResponse,
  ApiBearerAuth,
  ApiParam,
} from '@nestjs/swagger';
import { JwtAuthGuard } from '../auth/jwt-auth.guard';
import { ProjectInvitesService } from './project-invites.service';
import { CreateInviteDto, BulkInviteDto } from './dto/create-invite.dto';
import { InviteResponseDto } from './dto/invite-response.dto';
import { QueryInvitesDto } from './dto/query-invites.dto';

@ApiTags('Project Invites')
@ApiBearerAuth()
@UseGuards(JwtAuthGuard)
@Controller('projects/:projectId/invites')
export class ProjectInvitesController {
  constructor(private readonly projectInvitesService: ProjectInvitesService) {}

  @Post()
  @ApiOperation({ summary: 'Send a project invite' })
  @ApiParam({ name: 'projectId', description: 'Project ID' })
  @ApiResponse({ status: 201, description: 'Invite sent successfully' })
  @ApiResponse({ status: 400, description: 'Bad request' })
  @ApiResponse({ status: 403, description: 'Forbidden' })
  async createInvite(
    @Param('projectId', ParseIntPipe) projectId: number,
    @Body() createInviteDto: CreateInviteDto,
    @Req() req: any,
  ) {
    return this.projectInvitesService.createInvite(
      projectId,
      createInviteDto,
      req.user.id,
    );
  }

  @Post('bulk')
  @ApiOperation({ summary: 'Send multiple project invites' })
  @ApiParam({ name: 'projectId', description: 'Project ID' })
  @ApiResponse({ status: 201, description: 'Bulk invites processed' })
  async createBulkInvites(
    @Param('projectId', ParseIntPipe) projectId: number,
    @Body() bulkInviteDto: BulkInviteDto,
    @Req() req: any,
  ) {
    return this.projectInvitesService.createBulkInvites(
      projectId,
      bulkInviteDto,
      req.user.id,
    );
  }

  @Get()
  @ApiOperation({ summary: 'Get project invites' })
  @ApiParam({ name: 'projectId', description: 'Project ID' })
  @ApiResponse({ status: 200, description: 'Invites retrieved successfully' })
  async getInvites(
    @Param('projectId', ParseIntPipe) projectId: number,
    @Query() query: QueryInvitesDto,
    @Req() req: any,
  ) {
    return this.projectInvitesService.getProjectInvites(
      projectId,
      query,
      req.user.id,
    );
  }

  @Put(':inviteId/resend')
  @ApiOperation({ summary: 'Resend a project invite' })
  @ApiParam({ name: 'projectId', description: 'Project ID' })
  @ApiParam({ name: 'inviteId', description: 'Invite ID' })
  @ApiResponse({ status: 200, description: 'Invite resent successfully' })
  async resendInvite(
    @Param('projectId', ParseIntPipe) projectId: number,
    @Param('inviteId', ParseIntPipe) inviteId: number,
    @Req() req: any,
  ) {
    return this.projectInvitesService.resendInvite(
      projectId,
      inviteId,
      req.user.id,
    );
  }

  @Delete(':inviteId')
  @ApiOperation({ summary: 'Cancel a project invite' })
  @ApiParam({ name: 'projectId', description: 'Project ID' })
  @ApiParam({ name: 'inviteId', description: 'Invite ID' })
  @ApiResponse({ status: 200, description: 'Invite cancelled successfully' })
  async cancelInvite(
    @Param('projectId', ParseIntPipe) projectId: number,
    @Param('inviteId', ParseIntPipe) inviteId: number,
    @Req() req: any,
  ) {
    return this.projectInvitesService.cancelInvite(
      projectId,
      inviteId,
      req.user.id,
    );
  }
}

// Separate controller for public invite responses (no auth required)
@ApiTags('Public Invite Actions')
@Controller('invites')
export class PublicInvitesController {
  constructor(private readonly projectInvitesService: ProjectInvitesService) {}

  @Put('respond')
  @ApiOperation({ summary: 'Respond to a project invite (public endpoint)' })
  @ApiResponse({ status: 200, description: 'Invite response processed' })
  @ApiResponse({ status: 400, description: 'Bad request' })
  @ApiResponse({ status: 404, description: 'Invite not found' })
  async respondToInvite(@Body() inviteResponseDto: InviteResponseDto) {
    return this.projectInvitesService.respondToInvite(inviteResponseDto);
  }

  @Get(':token')
  @ApiOperation({ summary: 'Get invite details by token (public endpoint)' })
  @ApiParam({ name: 'token', description: 'Invite token' })
  @ApiResponse({ status: 200, description: 'Invite details retrieved' })
  async getInviteByToken(@Param('token') token: string) {
    // This would be implemented to show invite details on a public page
    // You can add this method to the service if needed
    return { message: 'Get invite details endpoint - implement as needed' };
  }
}
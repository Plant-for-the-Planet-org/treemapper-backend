import { Controller, Get, Post, Body, UseGuards } from '@nestjs/common';
import { ProjectService } from './projects.service';
import { JwtAuthGuard } from '../auth/jwt-auth.guard';
import { User } from '../auth/user.decorator';
import { CreateProjectDto } from './dto/create-project';
import { UserData } from '../auth/jwt.strategy';  // Import the UserData interface from JWT strategy

@Controller('projects')
@UseGuards(JwtAuthGuard)
export class ProjectsController {
  constructor(
    private readonly projectsService: ProjectService,
  ) {}
  
  @Get()
  async getUserProjects(@User() user: UserData) {
    return await this.projectsService.getUserProjects(user.internalId);
  }

  @Post()
  async createProject(
    @Body() createProjectDto: CreateProjectDto,
    @User() user: UserData
  ) {
    return await this.projectsService.createProject(createProjectDto, user);
  }
}
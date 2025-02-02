import { Controller, Get, UseGuards } from '@nestjs/common';
import { ProjectsService } from './projects.service';
import { JwtAuthGuard } from '../auth/jwt-auth.guard';
import { User } from '../auth/user.decorator';

// Interface for type safety
interface AuthUser {
  id: string;
  internalId: string;
  email: string;
  emailVerified: boolean;
  roles: string[];
  permissions: string[];
  metadata: Record<string, any>;
}

@Controller('projects')
@UseGuards(JwtAuthGuard)
export class ProjectsController {
  constructor(
    private readonly projectsService: ProjectsService,
  ) {}
  
  @Get()
  async getUserProjects(@User() user: AuthUser) {
    // Use the internalId (database UUID) directly
    return await this.projectsService.getUserProjects(user.internalId);
  }
}
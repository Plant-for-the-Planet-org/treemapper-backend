import { Controller, Get } from '@nestjs/common';
import { User } from '../auth/user.decorator';
import { UserData } from '../auth/jwt.strategy';
import { HealthService } from './health.service';

@Controller('/health')
export class HealthController {
  constructor(private readonly healthService: HealthService) {}

  @Get()
  async getUserProjects(@User() user: UserData) {
    return await this.healthService.getHealth()
  }
}

import { Controller, Get } from '@nestjs/common';
import { User } from '../auth/user.decorator';
import { UserData } from '../auth/jwt.strategy';
import { HealthService } from './health.service';
import { Public } from 'src/auth/public.decorator';

@Controller('/health')
export class HealthController {
  constructor(private readonly healthService: HealthService) {}
  @Public()
  @Get()
  async getUserProjects(@User() user: UserData) {
    return await this.healthService.getHealth()
  }
}

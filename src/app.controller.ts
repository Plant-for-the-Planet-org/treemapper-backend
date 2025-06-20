import { Controller, Get } from '@nestjs/common';
import { AppService } from './app.service';
import { Public } from './auth/public.decorator';
import { CacheHealthService } from './cache/cache-health.service'

@Controller()

export class AppController {
  constructor(
    private readonly appService: AppService,
    private readonly cacheHealthService: CacheHealthService
  ) { }

  @Get('/health')
  @Public()
  getHello(): Object {
    return this.appService.getHealth();
  }

  @Public()
  @Get('health/cache')
  async getCacheHealth() {
    return await this.cacheHealthService.checkHealth();
  }
}

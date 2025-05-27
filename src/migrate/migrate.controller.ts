import { Controller, Get, Headers, HttpException, HttpStatus, UseGuards } from '@nestjs/common';
import { UserMigrationService, MigrationCheckResult } from './migrate.service';

@Controller('migrate')
export class UserController {
  constructor(private readonly userMigrationService: UserMigrationService) {}

  @Get('check')
  async checkMigrationStatus(
    @Headers('authorization') authorization: string
  ): Promise<MigrationCheckResult> {
    if (!authorization) {
      throw new HttpException(
        'Authorization header is required',
        HttpStatus.UNAUTHORIZED
      );
    }

    return await this.userMigrationService.checkUserInttc(authorization);
  }
}
import { Controller, Post, Get, Param, Body, UseGuards, Req, HttpException, HttpStatus, Headers} from '@nestjs/common';
import { MigrationCheckResult, MigrationService } from './migrate.service';
import { AuthGuard } from '@nestjs/passport'; // Adjust based on your auth setup

@Controller('migration')
@UseGuards(AuthGuard('jwt')) // Adjust based on your auth guard
export class MigrationController {
  constructor(
    private readonly migrationService: MigrationService) { }

  @Post('start')
  async startMigration(@Body() body: { planetId: string }, @Req() req: any) {
    const authToken = req.headers.authorization?.replace('Bearer ', '');

    if (!authToken) {
      throw new Error('Authorization token required');
    }

    // Start migration in background (don't await)
    this.migrationService.startUserMigration(
      req.user.id,
      body.planetId,
      req.user.email,
      authToken
    ).catch(error => {
      console.error('Migration failed:', error);
    });

    return {
      message: 'Migration started',
    };
  }

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

    return await this.migrationService.checkUserInttc(authorization);
  }

  // @Get('status/:uid')
  // async getMigrationStatus(@Param('uid') uid: string) {
  //   const status = await this.migrationService.getMigrationStatus(uid);

  //   if (!status) {
  //     return {
  //       exists: false,
  //       message: 'No migration found for this user'
  //     };
  //   }

  //   return {
  //     exists: true,
  //     ...status
  //   };
  // }

  // @Get('logs/:uid')
  // async getMigrationLogs(@Param('uid') uid: string) {
  //   const logs = await this.migrationService.getMigrationLogs(uid);
  //   return {
  //     logs,
  //     count: logs.length
  //   };
  // }

  // @Get('check/:uid')
  // async checkMigrationEligibility(@Param('uid') uid: string, @Req() req: any) {
  //   // This endpoint checks if user has data in old system
  //   const authToken = req.headers.authorization?.replace('Bearer ', '');

  //   try {
  //     // You can add a simple API call to check if user exists in old system
  //     // const userExists = await this.migrationService.checkUserInOldSystem(uid, authToken);

  //     return {
  //       eligible: true, // Replace with actual check
  //       message: 'User has data available for migration'
  //     };
  //   } catch (error) {
  //     return {
  //       eligible: false,
  //       message: 'No data found in old system or access denied'
  //     };
  //   }
  // }
}
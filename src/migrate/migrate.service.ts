import { Injectable, HttpException, HttpStatus } from '@nestjs/common';
import { HttpService } from '@nestjs/axios';
import { firstValueFrom } from 'rxjs';

export interface MigrationCheckResult {
  migrationNeeded: boolean;
}

@Injectable()
export class UserMigrationService {
  constructor(private readonly httpService: HttpService) {}

  async checkUserInttc(accessToken: string): Promise<MigrationCheckResult> {
    try {
      const response = await firstValueFrom(
        this.httpService.get('https://app.plant-for-the-planet.org/app/profile', {
          headers: {
            Authorization: accessToken,
          },
          validateStatus: (status) => {
            // Accept both 200 and 303 as valid responses
            return status === 200 || status === 303;
          },
        })
      );

      // If status is 303, return migrate: false
      if (response.status === 303) {
        return { migrationNeeded: false };
      }

      // If status is 200, return migrate: true
      return { migrationNeeded: true };

    } catch (error) {
      // Handle network errors or other HTTP errors (not 200/303)
      if (error.response) {
        // The request was made and the server responded with a status code
        // that falls out of the range of 2xx and is not 303
        throw new HttpException(
          `External API returned status: ${error.response.status}`,
          HttpStatus.BAD_GATEWAY
        );
      } else if (error.request) {
        // The request was made but no response was received
        throw new HttpException(
          'No response from external API',
          HttpStatus.SERVICE_UNAVAILABLE
        );
      } else {
        // Something happened in setting up the request
        throw new HttpException(
          'Error setting up request to external API',
          HttpStatus.INTERNAL_SERVER_ERROR
        );
      }
    }
  }

  
}

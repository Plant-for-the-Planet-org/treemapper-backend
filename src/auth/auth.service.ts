// src/auth/auth.service.ts
import { Injectable, Logger } from '@nestjs/common';
import { UsersService } from '../users/users.service';

@Injectable()
export class AuthService {
  private readonly logger = new Logger(AuthService.name);

  constructor(
    private usersService: UsersService,
  ) { }

  // Verify user exists and create if not
  async validateUser(auth0Id: string, email: string): Promise<any> {
    try {
      // First try to find by Auth0 ID
      let user = await this.usersService.findByAuth0Id(auth0Id);
      if (!user) {
        user = await this.usersService.createFromAuth0({
          auth0Id,
          email,
          name: email.split('@')[0],
        });
      }
      return user
    } catch (error) {
      throw error;
    }
  }
}
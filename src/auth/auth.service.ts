// src/auth/auth.service.ts
import { Injectable, Logger } from '@nestjs/common';
import { JwtService } from '@nestjs/jwt';
import { UsersService } from '../users/users.service';

@Injectable()
export class AuthService {
  private readonly logger = new Logger(AuthService.name);

  constructor(
    private usersService: UsersService,
    private jwtService: JwtService,
  ) {}

  // Verify user exists and create if not
  async validateUser(auth0Id: string, email: string): Promise<any> {
    try {
      // First try to find by Auth0 ID
      let user = await this.usersService.findByAuth0Id(auth0Id);
      
      if (!user) {
        this.logger.log(`User with Auth0 ID ${auth0Id} not found, creating new user`);
        
        // Check if we have a user with this email but without Auth0 ID
        const existingUserByEmail = await this.usersService.findByEmail(email);
        
        if (existingUserByEmail && !existingUserByEmail.auth0Id) {
          // Update existing user with Auth0 ID
          this.logger.log(`Found user with matching email ${email}, updating with Auth0 ID`);
          user = await this.usersService.updateByAuth0Id(auth0Id, {});
        } else {
          // Create a new user
          this.logger.log(`Creating new user with email ${email} and Auth0 ID ${auth0Id}`);
          user = await this.usersService.createFromAuth0({
            auth0Id,
            email,
            name: email.split('@')[0], // Default name from email
          });
        }
      }
      
      return user;
    } catch (error) {
      this.logger.error(`Error validating user: ${error.message}`, error.stack);
      throw error;
    }
  }

  // Get user role
  async getUserRole(auth0Id: string): Promise<string> {
    try {
      const user = await this.usersService.findByAuth0Id(auth0Id);
      return user ? 'admin' : 'viewer'; // Default to viewer if not found
    } catch (error) {
      this.logger.error(`Error getting user role: ${error.message}`, error.stack);
      return 'viewer'; // Default to viewer on error
    }
  }
}
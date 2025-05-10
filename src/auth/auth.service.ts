import { Injectable } from '@nestjs/common';
import { JwtService } from '@nestjs/jwt';
import { UsersService } from '../users/users.service';

@Injectable()
export class AuthService {
  constructor(
    private usersService: UsersService,
    private jwtService: JwtService,
  ) {}

  // Verify user exists and create if not
  async validateUser(auth0Id: string, email: string): Promise<any> {
    let user = await this.usersService.findByAuth0Id(auth0Id);
    
    if (!user) {
      // Auto-create the user in our database
      user = await this.usersService.createFromAuth0({
        auth0Id,
        email,
        name: email.split('@')[0], // Default name
      });
    }
    
    return user;
  }

  // Get user role
  async getUserRole(auth0Id: string): Promise<string> {
    const user = await this.usersService.findByAuth0Id(auth0Id);
    return user ? user.role : 'viewer'; // Default to viewer if not found
  }
}
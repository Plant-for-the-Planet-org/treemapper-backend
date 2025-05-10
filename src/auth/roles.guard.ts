import { Injectable, CanActivate, ExecutionContext } from '@nestjs/common';
import { Reflector } from '@nestjs/core';
import { UsersService } from '../users/users.service';

@Injectable()
export class RolesGuard implements CanActivate {
  constructor(
    private reflector: Reflector,
    private usersService: UsersService,
  ) {}

  async canActivate(context: ExecutionContext): Promise<boolean> {
    const requiredRoles = this.reflector.getAllAndOverride<string[]>('roles', [
      context.getHandler(),
      context.getClass(),
    ]);
    
    if (!requiredRoles) {
      return true; // No roles required, access granted
    }

    const request = context.switchToHttp().getRequest();
    const user = request.user; // This comes from the JWT strategy
    
    if (!user) {
      return false;
    }

    // Find the user in our database by Auth0 ID
    const dbUser = await this.usersService.findByAuth0Id(user.userId);
    
    if (!dbUser) {
      // Auto-register the user if they don't exist in our DB yet
      // This is optional but helpful for first-time logins
      const newUser = await this.usersService.createFromAuth0({
        auth0Id: user.userId,
        email: user.email,
        name: user.name || user.email.split('@')[0],
        // Default role is 'viewer' as defined in schema
      });
      
      return requiredRoles.includes(newUser.role);
    }
    
    // Check if the user's role matches any required role
    return requiredRoles.includes(dbUser.role);
  }
}
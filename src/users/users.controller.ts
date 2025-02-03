import { Controller, Get, Request } from '@nestjs/common';
import { UsersService } from './users.service';

@Controller('users')
export class UsersController {
  constructor(private readonly usersService: UsersService) {}
  
  @Get()
  async getUsers(@Request() req) {
    // First find or create the user based on the Auth0 token
    const user = await this.usersService.findOrCreateUser(req.user);
    return user;
  }
}
import { 
  Controller, 
  Get, 
  Put, 
  Request, 
  Body, 
  Param,
  HttpException,
  HttpStatus
} from '@nestjs/common';
import { UsersService } from './users.service';

// Define DTOs for type safety
interface UpdateUserDto {
  firstName?: string;
  lastName?: string;
  avatarUrl?: string;
  preferences?: Record<string, any>;
  emailVerified?: boolean;
}

interface UpdatePreferencesDto {
  preferences: Record<string, any>;
}

@Controller('users')
export class UsersController {
  constructor(private readonly usersService: UsersService) {}
  
  @Get('me')
  async getUsers(@Request() req) {
    const user = await this.usersService.findOrCreateUser(req.user);
    return user;
  }

  @Put('me')
  async updateCurrentUser(
    @Request() req,
    @Body() updateData: UpdateUserDto
  ) {
    try {
      const currentUser = await this.usersService.findOrCreateUser(req.user);
      const updatedUser = await this.usersService.updateUser(
        currentUser.user.id,
        updateData
      );
      return updatedUser;
    } catch (error) {
      throw new HttpException(
        error.message || 'Failed to update user',
        HttpStatus.INTERNAL_SERVER_ERROR
      );
    }
  }

  @Put('me/preferences')
  async updateCurrentUserPreferences(
    @Request() req,
    @Body() { preferences }: UpdatePreferencesDto
  ) {
    try {
      const currentUser = await this.usersService.findOrCreateUser(req.user);
      const updatedUser = await this.usersService.updateUserPreferences(
        currentUser.user.id,
        preferences
      );
      return updatedUser;
    } catch (error) {
      throw new HttpException(
        error.message || 'Failed to update preferences',
        HttpStatus.INTERNAL_SERVER_ERROR
      );
    }
  }

  @Put(':userId')
  async updateUser(
    @Param('userId') userId: string,
    @Body() updateData: UpdateUserDto
  ) {
    try {
      const updatedUser = await this.usersService.updateUser(
        userId,
        updateData
      );
      return updatedUser;
    } catch (error) {
      throw new HttpException(
        error.message || 'Failed to update user',
        HttpStatus.INTERNAL_SERVER_ERROR
      );
    }
  }
}
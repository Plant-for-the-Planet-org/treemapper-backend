// src/users/users.controller.ts
import { Controller, Get, Post, Body, Patch, Param, Delete, Request, UseGuards, ParseIntPipe } from '@nestjs/common';
import { UsersService } from './users.service';
import { CreateUserDto } from './dto/create-user.dto';
import { JwtAuthGuard } from '../auth/jwt-auth.guard';
import { Public } from '../auth/public.decorator';

@Controller('users')
export class UsersController {
  constructor(private readonly usersService: UsersService) {}

  // This endpoint creates a user manually (keep this protected)
  @Post()
  create(@Body() createUserDto: CreateUserDto, @Request() req) {
    // You can use the authenticated user here if needed
    console.log('Authenticated user:', req.user);
    return this.usersService.create(createUserDto);
  }

  // Get current user profile
  @Get('me')
  async getCurrentUser(@Request() req) {
    const auth0Id = req.user.userId;
    const dbUser = await this.usersService.findByAuth0Id(auth0Id);
    
    // Combine auth0 info with database user info
    return {
      ...dbUser,
      auth0: {
        sub: req.user.userId,
        email: req.user.email,
        emailVerified: req.user.emailVerified,
      }
    };
  }

  // Other endpoints...
  @Get()
  findAll() {
    return this.usersService.findAll();
  }

  @Get(':id')
  findOne(@Param('id', ParseIntPipe) id: number) {
    return this.usersService.findOne(id);
  }
}
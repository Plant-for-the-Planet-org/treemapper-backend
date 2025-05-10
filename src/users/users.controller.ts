// src/users/users.controller.ts
import { Controller, Get, Param, Request, ParseIntPipe } from '@nestjs/common';
import { UsersService } from './users.service';

@Controller('users')
export class UsersController {
  constructor(private readonly usersService: UsersService) { }

  @Get('me')
  async getCurrentUser(@Request() req) {
    console.log('Current user:', req.user);
    return {
      message: '',
      statusCode: 200,
      error: null,
      data: req.user,
      code: 'me_details',
    }
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
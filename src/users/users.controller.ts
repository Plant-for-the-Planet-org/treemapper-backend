// src/users/users.controller.ts
import { Controller, Get, Param, Request, ParseIntPipe, Post, Body } from '@nestjs/common';
import { UsersService } from './users.service';
import { EmailService } from '../email/email.service';
import { Public } from 'src/auth/public.decorator';

@Controller('users')
export class UsersController {
  constructor(
    private readonly usersService: UsersService,
    private readonly emailService: EmailService
  ) { }
  @Get('me')
  async getCurrentUser(@Request() req) {
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
  findOne(@Param('id', ParseIntPipe) id: string) {
    return this.usersService.findOne(id);
  }

  @Public()
  @Post('sendemail')
  async sendCustomEmail() {
    await this.emailService.sendEmail({
      to: 'shyambhongle@gmail.com', // Can also be an array of emails: ['user1@example.com', 'user2@example.com']
      subject: 'Welcome to Our Platform!',
      body: '<h1>Welcome!</h1><p>Thank you for joining our platform.</p>', // Can be HTML or plain text
      name: 'Your Company Name', // Optional
      // from: 'noreply@yourcompany.com', // Optional, uses project default if not specified
      // reply: 'support@yourcompany.com', // Optional
    });
    return { success: true, message: 'Email sent successfully' };
  }
}
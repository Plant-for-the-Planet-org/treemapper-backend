import {
  Controller,
  Get,
  Post,
  Body,
  Patch,
  Param,
  Delete,
  Query,
  UseGuards,
  ParseIntPipe,
  HttpStatus,
  HttpCode,
  NotFoundException,
  Put,
} from '@nestjs/common';
import {
  ApiTags,
  ApiOperation,
  ApiResponse,
  ApiBearerAuth,
  ApiParam,
  ApiQuery,
} from '@nestjs/swagger';
import { UsersService } from './users.service';
import { CreateUserDto } from './dto/create-user.dto';
import { UpdateUserDto } from './dto/update-user.dto';
import { UserQueryDto } from './dto/user-query.dto';
import { UserResponseDto } from './dto/user-response.dto';
import { JwtAuthGuard } from '../auth/jwt-auth.guard';
import { CurrentUser } from '../auth/current-user.decorator';
import { User } from './entities/user.entity';

@UseGuards(JwtAuthGuard)
@Controller('users')
export class UsersController {
  constructor(private readonly usersService: UsersService) { }

  // @Post()
  // async create(@Body() createUserDto: CreateUserDto) {
  //   return await this.usersService.create(createUserDto);
  // }

  @Get('me')
  async getProfile(@CurrentUser() users: User) {
    return {
      uid: users.uid,
      email: users.email,
      name: users.name,
      firstname: users.firstname,
      lastname: users.lastname,
      displayName: users.displayName,
      avatar: users.avatar,
      avatarCdn: users.avatarCdn,
      slug: users.slug,
      authName: users.authName,
      type: users.type,
      country: users.country,
      url: users.url,
      isPrivate: users.isPrivate,
      bio: users.bio,
      locale: users.locale,
      isActive: users.isActive,
      migratedAt: users.migratedAt,
    }
  }

  @Put('migrated')
  async migrated(@CurrentUser() user: User) {
    return await this.usersService.migrateSuccess(user.id);
  }





  // @Get('stats')
  // async getStats() {
  //   return await this.usersService.getUserStats();
  // }

  // @Get('check-email')
  // async checkEmail(@Query('email') email: string) {
  //   const exists = await this.usersService.checkEmailExists(email);
  //   return { exists };
  // }

  // @Get('by-guid/:guid')
  // async findByGuid(@Param('guid') guid: string) {
  //   return await this.usersService.findByuid(guid);
  // }

  // @Get(':id')
  // async findOne(@Param('id', ParseIntPipe) id: number) {
  //   return await this.usersService.findOne(id);
  // }

  // @Patch('me')
  // async updateProfile(
  //   @CurrentUser() user: User,
  //   @Body() updateUserDto: UpdateUserDto,
  // ) {
  //   return await this.usersService.update(user.id, updateUserDto);
  // }

  // @Patch(':id')
  // async update(
  //   @Param('id', ParseIntPipe) id: number,
  //   @Body() updateUserDto: UpdateUserDto,
  // ) {
  //   return await this.usersService.update(id, updateUserDto);
  // }

  // @Patch(':id/deactivate')
  // async deactivate(@Param('id', ParseIntPipe) id: number) {
  //   return await this.usersService.deactivate(id);
  // }

  // @Patch(':id/activate')
  // async activate(@Param('id', ParseIntPipe) id: number) {
  //   return await this.usersService.activate(id);
  // }



  // @Delete(':id')
  // @HttpCode(HttpStatus.OK)
  // async remove(@Param('id', ParseIntPipe) id: number) {
  //   return await this.usersService.remove(id);
  // }

  // @Delete(':id/hard')
  // @HttpCode(HttpStatus.OK)
  // async hardDelete(@Param('id', ParseIntPipe) id: number) {
  //   return await this.usersService.hardDelete(id);
  // }
}
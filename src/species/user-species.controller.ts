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
  ParseUUIDPipe,
  Req,
} from '@nestjs/common';
import { ApiTags, ApiOperation, ApiResponse, ApiBearerAuth } from '@nestjs/swagger';
import { UserSpeciesService } from './user-species.service';
import { CreateUserSpeciesDto } from './dto/create-user-species.dto';
import { UpdateUserSpeciesDto } from './dto/update-user-species.dto';
// Import your auth guards and user decorator here
import { JwtAuthGuard } from '../auth/jwt-auth.guard';
// import { CurrentUser } from '../auth/decorators/current-user.decorator';

@ApiTags('User Species')
@Controller('user-species')
@UseGuards(JwtAuthGuard)
@ApiBearerAuth()
export class UserSpeciesController {
  constructor(private readonly userSpeciesService: UserSpeciesService) {}

  @Post()
  @ApiOperation({ summary: 'Add a species to user collection' })
  @ApiResponse({ status: 201, description: 'Species added to collection successfully' })
  @ApiResponse({ status: 409, description: 'Species already in collection' })
  create(
    // @CurrentUser() user: any, // Replace with your user type
    @Body() createUserSpeciesDto: CreateUserSpeciesDto,
    @Req() req: any, // Temporary - replace with @CurrentUser() decorator
  ) {
    // Temporary way to get userId - replace with your auth implementation
    const userId = req.user?.id || 'temp-user-id';
    return this.userSpeciesService.create(userId, createUserSpeciesDto);
  }

  @Get()
  @ApiOperation({ summary: 'Get user species collection' })
  @ApiResponse({ status: 200, description: 'User species retrieved successfully' })
  findAll(
    // @CurrentUser() user: any,
    @Query() query: { search?: string; page?: number; limit?: number },
    @Req() req: any,
  ) {
    const userId = req.user?.id || 'temp-user-id';
    return this.userSpeciesService.findAllByUser(userId, query);
  }

  @Get(':id')
  @ApiOperation({ summary: 'Get a user species by ID' })
  @ApiResponse({ status: 200, description: 'User species retrieved successfully' })
  @ApiResponse({ status: 404, description: 'User species not found' })
  findOne(
    // @CurrentUser() user: any,
    @Param('id', ParseUUIDPipe) id: string,
    @Req() req: any,
  ) {
    const userId = req.user?.id || 'temp-user-id';
    return this.userSpeciesService.findOne(userId, id);
  }

  @Patch(':id')
  @ApiOperation({ summary: 'Update user species customization' })
  @ApiResponse({ status: 200, description: 'User species updated successfully' })
  @ApiResponse({ status: 404, description: 'User species not found' })
  update(
    // @CurrentUser() user: any,
    @Param('id', ParseUUIDPipe) id: string,
    @Body() updateUserSpeciesDto: UpdateUserSpeciesDto,
    @Req() req: any,
  ) {
    const userId = req.user?.id || 'temp-user-id';
    return this.userSpeciesService.update(userId, id, updateUserSpeciesDto);
  }

  @Delete(':id')
  @ApiOperation({ summary: 'Remove species from user collection' })
  @ApiResponse({ status: 200, description: 'Species removed from collection successfully' })
  @ApiResponse({ status: 404, description: 'User species not found' })
  remove(
    // @CurrentUser() user: any,
    @Param('id', ParseUUIDPipe) id: string,
    @Req() req: any,
  ) {
    const userId = req.user?.id || 'temp-user-id';
    return this.userSpeciesService.remove(userId, id);
  }
}
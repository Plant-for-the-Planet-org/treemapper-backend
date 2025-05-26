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
} from '@nestjs/common';
import { ApiTags, ApiOperation, ApiResponse, ApiBearerAuth } from '@nestjs/swagger';
import { SpeciesService } from './species.service';
import { CreateSpeciesDto } from './dto/create-species.dto';
import { UpdateSpeciesDto } from './dto/update-species.dto';
import { SpeciesQueryDto } from './dto/species-query.dto';
import { JwtAuthGuard } from '../auth/jwt-auth.guard';


@ApiTags('Species (Global)')
@Controller('species')
@UseGuards(JwtAuthGuard) // Uncomment when you have auth guards
export class SpeciesController {
  constructor(private readonly speciesService: SpeciesService) {}

  // @Post()
  // @ApiOperation({ summary: 'Create a new species (Admin only)' })
  // @ApiResponse({ status: 201, description: 'Species created successfully' })
  // @ApiResponse({ status: 409, description: 'Species already exists' })
  // // @UseGuards(RolesGuard)
  // // @Roles(Role.ADMIN) // Only admins can create global species
  // // @ApiBearerAuth()
  // create(@Body() createSpeciesDto: CreateSpeciesDto) {
  //   return this.speciesService.create(createSpeciesDto);
  // }

  // @Get()
  // @ApiOperation({ summary: 'Get all species with pagination and filtering' })
  // @ApiResponse({ status: 200, description: 'Species retrieved successfully' })
  // findAll(@Query() query: SpeciesQueryDto) {
  //   return this.speciesService.findAll(query);
  // }

  // @Get(':id')
  // @ApiOperation({ summary: 'Get a species by ID' })
  // @ApiResponse({ status: 200, description: 'Species retrieved successfully' })
  // @ApiResponse({ status: 404, description: 'Species not found' })
  // findOne(@Param('id', ParseUUIDPipe) id: string) {
  //   return this.speciesService.findOne(id);
  // }

  // @Patch(':id')
  // @ApiOperation({ summary: 'Update a species (Admin only)' })
  // @ApiResponse({ status: 200, description: 'Species updated successfully' })
  // @ApiResponse({ status: 404, description: 'Species not found' })
  // // @UseGuards(RolesGuard)
  // // @Roles(Role.ADMIN)
  // // @ApiBearerAuth()
  // update(
  //   @Param('id', ParseUUIDPipe) id: string,
  //   @Body() updateSpeciesDto: UpdateSpeciesDto,
  // ) {
  //   return this.speciesService.update(id, updateSpeciesDto);
  // }

  // @Delete(':id')
  // @ApiOperation({ summary: 'Delete a species (Admin only)' })
  // @ApiResponse({ status: 200, description: 'Species deleted successfully' })
  // @ApiResponse({ status: 404, description: 'Species not found' })
  // // @UseGuards(RolesGuard)
  // // @Roles(Role.ADMIN)
  // // @ApiBearerAuth()
  // remove(@Param('id', ParseUUIDPipe) id: string) {
  //   return this.speciesService.remove(id);
  // }

  // @Patch(':id/deactivate')
  // @ApiOperation({ summary: 'Deactivate a species (Admin only)' })
  // @ApiResponse({ status: 200, description: 'Species deactivated successfully' })
  // // @UseGuards(RolesGuard)
  // // @Roles(Role.ADMIN)
  // // @ApiBearerAuth()
  // deactivate(@Param('id', ParseUUIDPipe) id: string) {
  //   return this.speciesService.deactivate(id);
  // }

  // @Patch(':id/activate')
  // @ApiOperation({ summary: 'Activate a species (Admin only)' })
  // @ApiResponse({ status: 200, description: 'Species activated successfully' })
  // // @UseGuards(RolesGuard)
  // // @Roles(Role.ADMIN)
  // // @ApiBearerAuth()
  // activate(@Param('id', ParseUUIDPipe) id: string) {
  //   return this.speciesService.activate(id);
  // }
}

import {
  Controller,
  Post,
  Get,
  Body,
  Query,
  Param,
  UseGuards,
  Req,
} from '@nestjs/common';
import { ApiTags, ApiOperation, ApiResponse } from '@nestjs/swagger';
import { SpeciesRequestService } from '../services/species-request.service';
import { CreateSpeciesRequestDto, SpeciesRequestFilterDto } from '../dto/species-request.dto';
// import { ProjectPermissionsGuard } from '../guards/project-permissions.guard'; // Adjust import path
// import { ProjectRoles } from '../decorators/project-roles.decorator'; // Adjust import path

@ApiTags('Species Requests')
@Controller('species-requests')
export class SpeciesRequestController {
  constructor(private readonly speciesRequestService: SpeciesRequestService) {}

//   @Post()
// //   @ProjectRoles('owner', 'admin', 'manager', 'contributor')
// //   @UseGuards(ProjectPermissionsGuard)
//   async createRequest(
//     @Body() createDto: CreateSpeciesRequestDto,
//     @Req() req: any,
//   ) {
//     return this.speciesRequestService.createRequest(
//       req.user.id,
//       req.project.id,
//       createDto,
//     );
//   }

//   @Get()
//   @ApiOperation({ summary: 'Get all species requests (Super Admin only)' })
//   @ApiResponse({ status: 200, description: 'Species requests retrieved successfully' })
//   async getRequests(@Query() filterDto: SpeciesRequestFilterDto) {
//     // Note: Add superadmin check in your authentication middleware
//     return this.speciesRequestService.getRequests(filterDto);
//   }

//   @Get(':id')
//   @ApiOperation({ summary: 'Get species request by ID' })
//   @ApiResponse({ status: 200, description: 'Species request retrieved successfully' })
//   async getRequestById(@Param('id') id: number) {
//     return this.speciesRequestService.getRequestById(id);
//   }
}

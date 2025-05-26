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
  Request,
  ParseUUIDPipe,
} from '@nestjs/common';
import { ApiTags, ApiOperation, ApiResponse, ApiBearerAuth } from '@nestjs/swagger';
import { TreeService } from './trees.service';
import { 
  CreateTreeDto, 
  UpdateTreeDto, 
  BulkCreateTreeDto, 
  TreeQueryDto,
  CreateTreeRecordDto,
  UpdateTreeRecordDto,
} from './dto';

import { 
  TreeResponseDto, 
  PaginatedTreeResponseDto, 
  TreeRecordResponseDto 
} from './dto/tree-response.dto';
import { JwtAuthGuard } from '../auth/jwt-auth.guard';

@ApiTags('trees')
@ApiBearerAuth()
@UseGuards(JwtAuthGuard)
@Controller('trees')
export class TreeController {
  constructor(private readonly treeService: TreeService) {}

  // @Post()
  // @ApiOperation({ summary: 'Create a new tree' })
  // @ApiResponse({ status: 201, description: 'Tree created successfully', type: TreeResponseDto })
  // create(@Body() createTreeDto: CreateTreeDto, @Request() req): Promise<TreeResponseDto> {
  //   return this.treeService.create(createTreeDto, req.user.id);
  // }

  // @Post('bulk')
  // @ApiOperation({ summary: 'Bulk create trees' })
  // @ApiResponse({ status: 201, description: 'Trees created successfully', type: [TreeResponseDto] })
  // bulkCreate(@Body() bulkCreateDto: BulkCreateTreeDto, @Request() req): Promise<TreeResponseDto[]> {
  //   return this.treeService.bulkCreate(bulkCreateDto, req.user.id);
  // }

  // @Get()
  // @ApiOperation({ summary: 'Get all trees with filtering and pagination' })
  // @ApiResponse({ status: 200, description: 'Trees retrieved successfully', type: PaginatedTreeResponseDto })
  // findAll(@Query() query: TreeQueryDto, @Request() req): Promise<PaginatedTreeResponseDto> {
  //   return this.treeService.findAll(query, req.user.id);
  // }

  // @Get(':id')
  // @ApiOperation({ summary: 'Get a tree by ID' })
  // @ApiResponse({ status: 200, description: 'Tree retrieved successfully', type: TreeResponseDto })
  // findOne(@Param('id', ParseUUIDPipe) id: string, @Request() req): Promise<TreeResponseDto> {
  //   return this.treeService.findOne(id, req.user.id);
  // }

  // @Patch(':id')
  // @ApiOperation({ summary: 'Update a tree' })
  // @ApiResponse({ status: 200, description: 'Tree updated successfully', type: TreeResponseDto })
  // update(
  //   @Param('id', ParseUUIDPipe) id: string,
  //   @Body() updateTreeDto: UpdateTreeDto,
  //   @Request() req,
  // ): Promise<TreeResponseDto> {
  //   return this.treeService.update(id, updateTreeDto, req.user.id);
  // }

  // @Delete(':id')
  // @ApiOperation({ summary: 'Delete a tree' })
  // @ApiResponse({ status: 200, description: 'Tree deleted successfully' })
  // remove(@Param('id', ParseUUIDPipe) id: string, @Request() req): Promise<void> {
  //   return this.treeService.remove(id, req.user.id);
  // }

  // @Delete('bulk/:ids')
  // @ApiOperation({ summary: 'Bulk delete trees' })
  // @ApiResponse({ status: 200, description: 'Trees deleted successfully' })
  // bulkRemove(@Param('ids') ids: string, @Request() req): Promise<void> {
  //   const treeIds = ids.split(',');
  //   return this.treeService.bulkRemove(treeIds, req.user.id);
  // }

  // // Tree Records endpoints
  // @Post(':id/records')
  // @ApiOperation({ summary: 'Create a new tree record' })
  // @ApiResponse({ status: 201, description: 'Tree record created successfully', type: TreeRecordResponseDto })
  // createRecord(
  //   @Param('id', ParseUUIDPipe) treeId: string,
  //   @Body() createRecordDto: CreateTreeRecordDto,
  //   @Request() req,
  // ): Promise<TreeRecordResponseDto> {
  //   createRecordDto.treeId = treeId;
  //   return this.treeService.createRecord(createRecordDto, req.user.id);
  // }

  // @Get(':id/records')
  // @ApiOperation({ summary: 'Get all records for a tree' })
  // @ApiResponse({ status: 200, description: 'Tree records retrieved successfully', type: [TreeRecordResponseDto] })
  // findRecords(@Param('id', ParseUUIDPipe) treeId: string, @Request() req): Promise<TreeRecordResponseDto[]> {
  //   return this.treeService.findRecords(treeId, req.user.id);
  // }

  // @Get('records/:recordId')
  // @ApiOperation({ summary: 'Get a tree record by ID' })
  // @ApiResponse({ status: 200, description: 'Tree record retrieved successfully', type: TreeRecordResponseDto })
  // findOneRecord(@Param('recordId', ParseUUIDPipe) recordId: string, @Request() req): Promise<TreeRecordResponseDto> {
  //   return this.treeService.findOneRecord(recordId, req.user.id);
  // }

  // @Patch('records/:recordId')
  // @ApiOperation({ summary: 'Update a tree record' })
  // @ApiResponse({ status: 200, description: 'Tree record updated successfully', type: TreeRecordResponseDto })
  // updateRecord(
  //   @Param('recordId', ParseUUIDPipe) recordId: string,
  //   @Body() updateRecordDto: UpdateTreeRecordDto,
  //   @Request() req,
  // ): Promise<TreeRecordResponseDto> {
  //   return this.treeService.updateRecord(recordId, updateRecordDto, req.user.id);
  // }

  // @Delete('records/:recordId')
  // @ApiOperation({ summary: 'Delete a tree record' })
  // @ApiResponse({ status: 200, description: 'Tree record deleted successfully' })
  // removeRecord(@Param('recordId', ParseUUIDPipe) recordId: string, @Request() req): Promise<void> {
  //   return this.treeService.removeRecord(recordId, req.user.id);
  // }
}
import { IsOptional, IsUUID, IsEnum, IsString, IsNumber } from 'class-validator';
import { Transform } from 'class-transformer';
import { ApiPropertyOptional } from '@nestjs/swagger';
import { TreeStatus } from './create-tree.dto';

export class TreeQueryDto {
  @ApiPropertyOptional({ description: 'Filter by site ID' })
  @IsOptional()
  @IsUUID()
  siteId?: string;

  @ApiPropertyOptional({ description: 'Filter by user species ID' })
  @IsOptional()
  @IsUUID()
  userSpeciesId?: string;

  @ApiPropertyOptional({ description: 'Filter by tree status' })
  @IsOptional()
  @IsEnum(TreeStatus)
  status?: TreeStatus;

  @ApiPropertyOptional({ description: 'Search by identifier' })
  @IsOptional()
  @IsString()
  identifier?: string;

  @ApiPropertyOptional({ description: 'Page number', default: 1 })
  @IsOptional()
  @Transform(({ value }) => parseInt(value))
  @IsNumber()
  page?: number = 1;

  @ApiPropertyOptional({ description: 'Items per page', default: 10 })
  @IsOptional()
  @Transform(({ value }) => parseInt(value))
  @IsNumber()
  limit?: number = 10;

  @ApiPropertyOptional({ description: 'Sort by field' })
  @IsOptional()
  @IsString()
  sortBy?: string = 'createdAt';

  @ApiPropertyOptional({ description: 'Sort order', enum: ['asc', 'desc'] })
  @IsOptional()
  @IsEnum(['asc', 'desc'])
  sortOrder?: 'asc' | 'desc' = 'desc';
}
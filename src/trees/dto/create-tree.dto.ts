import {
  IsString,
  IsNumber,
  IsOptional,
  IsUUID,
  IsDateString,
  IsEnum,
  IsArray,
  ValidateNested,
  Min,
  Max,
} from 'class-validator';
import { Type } from 'class-transformer';
import { ApiProperty, ApiPropertyOptional } from '@nestjs/swagger';

export enum TreeStatus {
  ALIVE = 'alive',
  DEAD = 'dead',
  UNKNOWN = 'unknown',
}

export class CreateTreeDto {
  @ApiProperty({ description: 'Site ID where the tree is located' })
  @IsUUID()
  siteId: string;

  @ApiPropertyOptional({ description: 'User species ID for the tree' })
  @IsOptional()
  @IsUUID()
  userSpeciesId?: string;

  @ApiPropertyOptional({ description: 'Tree identifier or tag' })
  @IsOptional()
  @IsString()
  identifier?: string;

  @ApiProperty({ description: 'Latitude coordinate', minimum: -90, maximum: 90 })
  @IsNumber()
  @Min(-90)
  @Max(90)
  latitude: number;

  @ApiProperty({ description: 'Longitude coordinate', minimum: -180, maximum: 180 })
  @IsNumber()
  @Min(-180)
  @Max(180)
  longitude: number;

  @ApiPropertyOptional({ description: 'Tree height in meters' })
  @IsOptional()
  @IsNumber()
  @Min(0)
  height?: number;

  @ApiPropertyOptional({ description: 'Diameter at breast height in cm' })
  @IsOptional()
  @IsNumber()
  @Min(0)
  diameter?: number;

  @ApiPropertyOptional({ description: 'Planting date' })
  @IsOptional()
  @IsDateString()
  plantingDate?: string;

  @ApiPropertyOptional({ description: 'Tree status', enum: TreeStatus })
  @IsOptional()
  @IsEnum(TreeStatus)
  status?: TreeStatus;

  @ApiPropertyOptional({ description: 'Health notes about the tree' })
  @IsOptional()
  @IsString()
  healthNotes?: string;

  @ApiPropertyOptional({ description: 'Array of image URLs', type: [String] })
  @IsOptional()
  @IsArray()
  @IsString({ each: true })
  images?: string[];

  @ApiPropertyOptional({ description: 'Additional metadata' })
  @IsOptional()
  metadata?: Record<string, any>;
}
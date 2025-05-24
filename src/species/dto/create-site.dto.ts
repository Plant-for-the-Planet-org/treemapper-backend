import { IsString, IsOptional, IsUUID, IsObject, ValidateNested } from 'class-validator';
import { Type } from 'class-transformer';
import { ApiProperty, ApiPropertyOptional } from '@nestjs/swagger';

class CoordinatesDto {
  @ApiProperty({ description: 'GeoJSON type', example: 'Polygon' })
  @IsString()
  type: string;

  @ApiProperty({ 
    description: 'GeoJSON coordinates array',
    example: [[[0, 0], [1, 0], [1, 1], [0, 1], [0, 0]]]
  })
  coordinates: number[][][];
}

export class CreateSiteDto {
  @ApiProperty({ description: 'Site name', example: 'North Forest Site' })
  @IsString()
  name: string;

  @ApiPropertyOptional({ description: 'Site description' })
  @IsOptional()
  @IsString()
  description?: string;

  @ApiPropertyOptional({ description: 'Location description', example: 'Northern section of the forest' })
  @IsOptional()
  @IsString()
  location?: string;

  @ApiPropertyOptional({ description: 'Site boundary as GeoJSON' })
  @IsOptional()
  @ValidateNested()
  @Type(() => CoordinatesDto)
  coordinates?: CoordinatesDto;

  @ApiPropertyOptional({ description: 'Additional site metadata' })
  @IsOptional()
  @IsObject()
  metadata?: Record<string, any>;
}
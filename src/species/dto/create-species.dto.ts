import { IsString, IsOptional, IsBoolean, IsObject } from 'class-validator';
import { ApiProperty, ApiPropertyOptional } from '@nestjs/swagger';

export class CreateSpeciesDto {
  @ApiProperty({ description: 'Scientific name of the species' })
  @IsString()
  scientificName: string;

  @ApiPropertyOptional({ description: 'Common name of the species' })
  @IsOptional()
  @IsString()
  commonName?: string;

  @ApiPropertyOptional({ description: 'Description of the species' })
  @IsOptional()
  @IsString()
  description?: string;

  @ApiPropertyOptional({ description: 'Default image URL for the species' })
  @IsOptional()
  @IsString()
  defaultImage?: string;

  @ApiPropertyOptional({ description: 'Whether the species is active', default: true })
  @IsOptional()
  @IsBoolean()
  isActive?: boolean;

  @ApiPropertyOptional({ description: 'Additional metadata for the species' })
  @IsOptional()
  @IsObject()
  metadata?: any;
}

import { ApiProperty } from '@nestjs/swagger';
import { IsArray, ValidateNested, IsNotEmpty, IsString, IsOptional, MaxLength } from 'class-validator';
import { Type } from 'class-transformer';
import { PaginationDto } from './common.dto';

export class ScientificSpeciesDto {
  @IsNotEmpty()
  @IsString()
  @MaxLength(255)
  scientificName: string;

  @IsOptional()
  @IsString()
  @MaxLength(400)
  commonName?: string;

  @IsOptional()
  @IsString()
  description?: string;

  @IsOptional()
  @IsString()
  @MaxLength(100)
  gbifId?: string;
}

export class BulkUploadScientificSpeciesDto {
  @ApiProperty({ type: [ScientificSpeciesDto] })
  @IsArray()
  @ValidateNested({ each: true })
  @Type(() => ScientificSpeciesDto)
  species: ScientificSpeciesDto[];
}

export class ScientificSpeciesFilterDto extends PaginationDto {
  // Add any specific filters for scientific species if needed
}

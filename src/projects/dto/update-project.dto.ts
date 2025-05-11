// src/projects/dto/update-project.dto.ts
import { IsOptional, IsString, IsBoolean, IsNumber, IsObject } from 'class-validator';

export class UpdateProjectDto {
  @IsOptional()
  @IsString()
  projectName?: string;

  @IsOptional()
  @IsString()
  projectType?: string;

  @IsOptional()
  @IsString()
  ecosystem?: string;

  @IsOptional()
  @IsString()
  projectScale?: string;

  @IsOptional()
  @IsNumber()
  target?: number;

  @IsOptional()
  @IsString()
  projectWebsite?: string;

  @IsOptional()
  @IsString()
  description?: string;

  @IsOptional()
  @IsBoolean()
  isPublic?: boolean;

  @IsOptional()
  @IsObject()
  metadata?: Record<string, any>;

  @IsOptional()
  location?: any; // You'll need a custom validator for PostGIS geometry
}
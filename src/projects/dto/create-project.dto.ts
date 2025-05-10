// src/projects/dto/create-project.dto.ts
import { IsNotEmpty, IsString, IsOptional } from 'class-validator';

export class CreateProjectDto {
  @IsNotEmpty()
  @IsString()
  name: string;

  @IsOptional()
  @IsString()
  description?: string;
}
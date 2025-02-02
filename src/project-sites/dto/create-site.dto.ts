import { IsString, IsOptional, IsObject } from 'class-validator';

export class CreateSiteDto {
  @IsString()
  name: string;

  @IsString()
  @IsOptional()
  description?: string;

  @IsObject()
  @IsOptional()
  location?: Record<string, any>;

  @IsObject()
  @IsOptional()
  metadata?: Record<string, any>;
}
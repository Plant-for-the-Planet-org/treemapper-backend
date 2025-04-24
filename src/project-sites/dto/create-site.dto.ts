import { IsString, IsOptional, IsObject, IsEnum } from 'class-validator';
import { visibilityEnum } from '../../../drizzle/schema/schema';

export class CreateSiteDto {
  @IsString()
  name: string;

  @IsOptional()
  @IsString()
  slug?: string;

  @IsOptional()
  @IsString()
  description?: string;

  @IsOptional()
  @IsEnum(visibilityEnum)
  visibility?: typeof visibilityEnum.enumValues[number];

  @IsOptional()
  @IsString()
  latitude?: string;

  @IsOptional()
  @IsString()
  longitude?: string;

  @IsOptional()
  @IsObject()
  address?: Record<string, any>;

  @IsOptional()
  @IsObject()
  metadata?: Record<string, any>;
}
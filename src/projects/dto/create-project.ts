import { IsNotEmpty, IsString, IsUUID, IsOptional, IsObject } from 'class-validator';
import { visibilityEnum } from '../../../drizzle/schema/schema';

export class CreateProjectDto {
  @IsNotEmpty()
  @IsString()
  name: string;

  @IsNotEmpty()
  @IsString()
  slug: string;

  @IsOptional()
  @IsString()
  description?: string;

  @IsNotEmpty()
  @IsUUID()
  workspaceId: string;

  @IsOptional()
  @IsObject()
  settings?: Record<string, any>;

  @IsOptional()
  @IsObject()
  metadata?: Record<string, any>;

  @IsOptional()
  visibility?: typeof visibilityEnum.enumValues[number];
}

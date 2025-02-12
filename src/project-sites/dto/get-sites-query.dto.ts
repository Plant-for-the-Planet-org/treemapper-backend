import { IsString, IsOptional, IsEnum } from 'class-validator';
import { entityStatusEnum } from '../../../drizzle/schema/schema';

export class GetSitesQueryDto {
  @IsOptional()
  @IsString()
  search?: string;

  @IsOptional()
  @IsEnum(entityStatusEnum)
  status?: typeof entityStatusEnum.enumValues[number];
}
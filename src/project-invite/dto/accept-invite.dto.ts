import { IsOptional, IsString, IsEnum, IsISO8601 } from 'class-validator';
import { projectUserRoleEnum } from '../../../drizzle/schema/schema';

export class UpdateProjectInviteDto {
  @IsOptional()
  @IsEnum(projectUserRoleEnum)
  role?: typeof projectUserRoleEnum.enumValues[number];

  @IsOptional()
  @IsString()
  message?: string;

  @IsOptional()
  @IsISO8601()
  expiresAt?: string;
}

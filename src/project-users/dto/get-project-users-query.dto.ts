import { IsOptional, IsEnum } from 'class-validator';
import { projectUserRoleEnum } from 'drizzle/schema/schema';

export class GetProjectUsersQueryDto {
  @IsOptional()
  @IsEnum(projectUserRoleEnum)
  role?: typeof projectUserRoleEnum.enumValues[number];

  @IsOptional()
  @IsEnum(['active', 'suspended'])
  status?: 'active' | 'suspended';
}
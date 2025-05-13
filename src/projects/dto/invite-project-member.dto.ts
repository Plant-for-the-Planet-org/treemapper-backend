// src/projects/dto/invite-project-member.dto.ts
import { IsEmail, IsNotEmpty, IsEnum, IsOptional } from 'class-validator';
import { projectRoleEnum } from '../../database/schema';

// Extract the enum values
const PROJECT_ROLE_VALUES = projectRoleEnum.enumValues;

export class InviteProjectMemberDto {
  @IsNotEmpty()
  @IsEmail()
  email: string;

  @IsOptional()
  message: string;

  @IsNotEmpty()
  @IsEnum(PROJECT_ROLE_VALUES, {
    message: `role must be one of the following values: ${PROJECT_ROLE_VALUES.join(', ')}`
  })
  role: string;
}
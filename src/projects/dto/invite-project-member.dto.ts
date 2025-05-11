// src/projects/dto/invite-project-member.dto.ts
import { IsEmail, IsNotEmpty, IsEnum } from 'class-validator';
import { projectRoleEnum } from '../../database/schema';

export class InviteProjectMemberDto {
  @IsNotEmpty()
  @IsEmail()
  email: string;

  @IsNotEmpty()
  @IsEnum(projectRoleEnum)
  role: string;
}
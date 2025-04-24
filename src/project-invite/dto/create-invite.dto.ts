// create-project-invite.dto.ts
import { IsNotEmpty, IsString, IsEmail, IsUUID, IsOptional } from 'class-validator';
import { projectUserRoleEnum } from '../../../drizzle/schema/schema'

export class CreateProjectInviteDto {
  @IsNotEmpty()
  @IsEmail()
  email: string;

  @IsNotEmpty()
  @IsUUID()
  projectId: string;

  @IsNotEmpty()
  @IsString()
  role: typeof projectUserRoleEnum.enumValues[number];

  @IsOptional()
  @IsString()
  message?: string;
}
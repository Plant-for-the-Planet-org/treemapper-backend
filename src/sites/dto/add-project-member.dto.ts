// src/projects/dto/add-project-member.dto.ts
import { IsNotEmpty, IsEmail, IsEnum, IsOptional } from 'class-validator';

export class AddProjectMemberDto {
  @IsNotEmpty()
  @IsEmail()
  email: string;

  @IsNotEmpty()
  @IsEnum(['admin', 'editor', 'viewer'], {
    message: 'Role must be one of: admin, editor, viewer',
  })
  role: string;
}
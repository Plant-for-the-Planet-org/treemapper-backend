// src/projects/dto/update-project-role.dto.ts
import { IsNotEmpty, IsEnum } from 'class-validator';

export class UpdateProjectRoleDto {
  @IsNotEmpty()
  @IsEnum(['admin', 'editor', 'viewer'], {
    message: 'Role must be one of: admin, editor, viewer',
  })
  role: string;
}
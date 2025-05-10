// src/users/dto/update-role.dto.ts
import { IsNotEmpty, IsEnum } from 'class-validator';

export class UpdateRoleDto {
  @IsNotEmpty()
  @IsEnum(['superadmin', 'admin', 'viewer', 'contributor'], {
    message: 'Role must be one of: superadmin, admin, viewer, contributor'
  })
  role: string;
}
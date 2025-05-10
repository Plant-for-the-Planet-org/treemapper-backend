import { IsEmail, IsNotEmpty, IsString, IsOptional, IsEnum } from 'class-validator';

export class CreateUserDto {
  @IsNotEmpty()
  @IsString()
  name: string;

  @IsNotEmpty()
  @IsEmail()
  email: string;

  @IsNotEmpty()
  @IsString()
  auth0Id: string;

  @IsOptional()
  @IsEnum(['superadmin', 'admin', 'viewer', 'contributor'], {
    message: 'Role must be one of: superadmin, admin, viewer, contributor'
  })
  role?: string; // Optional because it has a default value in the schema
}
// src/users/dto/create-auth0-user.dto.ts
import { IsEmail, IsNotEmpty, IsString, IsOptional, IsEnum } from 'class-validator';

export class CreateAuth0UserDto {
  @IsNotEmpty()
  @IsString()
  auth0Id: string;

  @IsNotEmpty()
  @IsEmail()
  email: string;

  @IsOptional()
  @IsString()
  name?: string;

  @IsOptional()
  @IsEnum(['superadmin', 'admin', 'viewer', 'contributor'])
  role?: string;
}
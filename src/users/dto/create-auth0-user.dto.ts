// src/users/dto/create-auth0-user.dto.ts
import { IsEmail, IsNotEmpty, IsString, IsOptional } from 'class-validator';

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
}
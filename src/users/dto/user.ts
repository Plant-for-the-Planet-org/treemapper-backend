import { IsEmail, IsNotEmpty, IsOptional, IsString, IsUUID } from 'class-validator';
import { ApiProperty, ApiPropertyOptional } from '@nestjs/swagger';

export class CreateUserDto {

  @IsString()
  @IsNotEmpty()
  id: string;

  @ApiProperty({
    description: 'The email address of the user',
    example: 'user@example.com'
  })
  @IsEmail()
  @IsNotEmpty()
  email: string;

  @ApiProperty({
    description: 'The full name of the user',
    example: 'John Doe'
  })
  @IsString()
  @IsNotEmpty()
  fullName: string;

  @ApiPropertyOptional({
    description: 'URL to the user\'s avatar image',
    example: 'https://example.com/avatar.jpg'
  })
  @IsString()
  @IsOptional()
  avatarUrl?: string;
}

// update-user.dto.ts
export class UpdateUserDto {
  @ApiPropertyOptional({
    description: 'The full name of the user',
    example: 'John Doe'
  })
  @IsString()
  @IsOptional()
  fullName?: string;

  @ApiPropertyOptional({
    description: 'URL to the user\'s avatar image',
    example: 'https://example.com/avatar.jpg'
  })
  @IsString()
  @IsOptional()
  avatarUrl?: string;
}

// user-response.dto.ts
export class UserResponseDto {
  @ApiProperty({
    description: 'Unique identifier of the user',
    example: '123e4567-e89b-12d3-a456-426614174000'
  })
  @IsUUID()
  id: string;

  @ApiProperty({
    description: 'The email address of the user',
    example: 'user@example.com'
  })
  @IsEmail()
  email: string;

  @ApiProperty({
    description: 'The full name of the user',
    example: 'John Doe'
  })
  @IsString()
  fullName: string;

  @ApiPropertyOptional({
    description: 'URL to the user\'s avatar image',
    example: 'https://example.com/avatar.jpg'
  })
  @IsString()
  @IsOptional()
  avatarUrl?: string;

  @ApiProperty({
    description: 'Timestamp of when the user was created',
    example: '2024-02-02T12:00:00Z'
  })
  createdAt: Date;

  @ApiProperty({
    description: 'Timestamp of when the user was last updated',
    example: '2024-02-02T12:00:00Z'
  })
  updatedAt: Date;
}

// query-user.dto.ts
export class QueryUserDto {
  @ApiPropertyOptional({
    description: 'Search users by email',
    example: 'user@example.com'
  })
  @IsEmail()
  @IsOptional()
  email?: string;

  @ApiPropertyOptional({
    description: 'Search users by name',
    example: 'John'
  })
  @IsString()
  @IsOptional()
  name?: string;

  @ApiPropertyOptional({
    description: 'Number of items to skip',
    example: 0,
    minimum: 0
  })
  @IsOptional()
  skip?: number;

  @ApiPropertyOptional({
    description: 'Number of items to take',
    example: 10,
    minimum: 1,
    maximum: 100
  })
  @IsOptional()
  take?: number;
}
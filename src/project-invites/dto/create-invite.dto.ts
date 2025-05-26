import { IsEmail, IsString, IsOptional, IsEnum, IsArray } from 'class-validator';
import { ApiProperty, ApiPropertyOptional } from '@nestjs/swagger';

export class CreateInviteDto {
  @ApiProperty({ description: 'Email address of the person to invite' })
  @IsEmail()
  email: string;

  @ApiProperty({ 
    description: 'Role to assign to the invited user',
    enum: ['owner', 'admin', 'manager', 'contributor', 'observer', 'researcher']
  })
  @IsEnum(['owner', 'admin', 'manager', 'contributor', 'observer', 'researcher'])
  role: string;

  @ApiPropertyOptional({ description: 'Personal message to include with the invite' })
  @IsOptional()
  @IsString()
  message?: string;
}

export class BulkInviteDto {
  @ApiProperty({ 
    description: 'Array of email addresses to invite',
    type: [String]
  })
  @IsArray()
  @IsEmail({}, { each: true })
  emails: string[];

  @ApiProperty({ 
    description: 'Role to assign to all invited users',
    enum: ['owner', 'admin', 'manager', 'contributor', 'observer', 'researcher']
  })
  @IsEnum(['owner', 'admin', 'manager', 'contributor', 'observer', 'researcher'])
  role: string;

  @ApiPropertyOptional({ description: 'Personal message to include with all invites' })
  @IsOptional()
  @IsString()
  message?: string;
}

import { IsString, IsOptional } from 'class-validator';

export class AcceptProjectInviteDto {
  @IsString()
  fullName: string;

  @IsString()
  firstName: string;

  @IsOptional()
  @IsString()
  lastName?: string;
}
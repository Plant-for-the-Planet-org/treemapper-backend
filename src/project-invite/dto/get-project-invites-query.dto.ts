import { IsOptional, IsEnum, IsInt, Min, Max } from 'class-validator';
import { Transform } from 'class-transformer';
import { inviteStatusEnum } from  '../../../drizzle/schema/schema'

export class GetProjectInvitesQueryDto {
  @IsOptional()
  @IsEnum(inviteStatusEnum.enumValues)
  status?: typeof inviteStatusEnum.enumValues[number];

  @IsOptional()
  @Transform(({ value }) => parseInt(value))
  @IsInt()
  @Min(1)
  @Max(100)
  limit?: number = 50;

  @IsOptional()
  @Transform(({ value }) => parseInt(value))
  @IsInt()
  @Min(0)
  offset?: number = 0;
}
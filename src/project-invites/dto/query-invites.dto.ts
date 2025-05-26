import { ApiPropertyOptional } from "@nestjs/swagger";
import { IsOptional, IsEnum } from "class-validator";

export class QueryInvitesDto {
  @ApiPropertyOptional({ description: 'Filter by invite status' })
  @IsOptional()
  @IsEnum(['pending', 'accepted', 'declined', 'expired'])
  status?: string;

  @ApiPropertyOptional({ description: 'Filter by role' })
  @IsOptional()
  @IsEnum(['owner', 'admin', 'manager', 'contributor', 'observer', 'researcher'])
  role?: string;

  @ApiPropertyOptional({ description: 'Page number for pagination' })
  @IsOptional()
  page?: number = 1;

  @ApiPropertyOptional({ description: 'Number of items per page' })
  @IsOptional()
  limit?: number = 10;
}
import { ApiProperty, ApiPropertyOptional, PartialType } from "@nestjs/swagger";
import { IsUUID, IsString, IsOptional, IsDateString, IsNumber, Min, IsEnum } from "class-validator";
import { TreeStatus } from "./create-tree.dto";

export class CreateTreeRecordDto {
  @ApiProperty({ description: 'Tree ID' })
  @IsUUID()
  treeId: string;

  @ApiProperty({ description: 'Type of record' })
  @IsString()
  recordType: string;

  @ApiPropertyOptional({ description: 'Record date' })
  @IsOptional()
  @IsDateString()
  recordDate?: string;

  @ApiPropertyOptional({ description: 'Notes about the record' })
  @IsOptional()
  @IsString()
  notes?: string;

  @ApiPropertyOptional({ description: 'Updated height measurement' })
  @IsOptional()
  @IsNumber()
  @Min(0)
  height?: number;

  @ApiPropertyOptional({ description: 'Updated diameter measurement' })
  @IsOptional()
  @IsNumber()
  @Min(0)
  diameter?: number;

  @ApiPropertyOptional({ description: 'Updated tree status' })
  @IsOptional()
  @IsEnum(TreeStatus)
  status?: TreeStatus;

  @ApiPropertyOptional({ description: 'Additional metadata' })
  @IsOptional()
  metadata?: Record<string, any>;
}

export class UpdateTreeRecordDto extends PartialType(CreateTreeRecordDto) {}
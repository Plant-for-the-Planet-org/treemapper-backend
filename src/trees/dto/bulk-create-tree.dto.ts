import { ApiProperty } from "@nestjs/swagger";
import { Type } from "class-transformer";
import { IsArray, ValidateNested } from "class-validator";
import { CreateTreeDto } from "./create-tree.dto";

export class BulkCreateTreeDto {
  @ApiProperty({ type: [CreateTreeDto] })
  @IsArray()
  @ValidateNested({ each: true })
  @Type(() => CreateTreeDto)
  trees: CreateTreeDto[];
}
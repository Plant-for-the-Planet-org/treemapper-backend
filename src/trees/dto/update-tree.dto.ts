import { PartialType } from '@nestjs/swagger';
import { CreateTreeDto } from './create-tree.dto';

export class UpdateTreeDto extends PartialType(CreateTreeDto) {}
import { PartialType, OmitType } from '@nestjs/mapped-types';
import { CreateProjectDto } from './create-project.dto';


export class UpdateProjectDto extends PartialType(
  OmitType(CreateProjectDto, ['guid', 'slug'] as const)
) {}
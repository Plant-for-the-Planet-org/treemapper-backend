import { IsUUID } from 'class-validator';

export class ProjectIdParamDto {
  @IsUUID()
  projectId: string;
}
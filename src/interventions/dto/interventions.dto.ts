// src/modules/interventions/dto/create-intervention.dto.ts
import { IsString, IsOptional, IsEnum, IsNumber, IsDateString, IsBoolean, IsArray, ValidateNested, IsObject, Min, Max } from 'class-validator';
import { Type, Transform } from 'class-transformer';
import { ApiProperty, ApiPropertyOptional } from '@nestjs/swagger';

export enum InterventionType {
  ASSISTING_SEED_RAIN = 'assisting-seed-rain',
  CONTROL_LIVESTOCK = 'control-livestock',
  DIRECT_SEEDING = 'direct-seeding',
  ENRICHMENT_PLANTING = 'enrichment-planting',
  FENCING = 'fencing',
  FIRE_PATROL = 'fire-patrol',
  FIRE_SUPPRESSION = 'fire-suppression',
  FIREBREAKS = 'firebreaks',
  GENERIC_TREE_REGISTRATION = 'generic-tree-registration',
  GRASS_SUPPRESSION = 'grass-suppression',
  LIBERATING_REGENERANT = 'liberating-regenerant',
  MAINTENANCE = 'maintenance',
  MARKING_REGENERANT = 'marking-regenerant',
  MULTI_TREE_REGISTRATION = 'multi-tree-registration',
  OTHER_INTERVENTION = 'other-intervention',
  PLOT_PLANT_REGISTRATION = 'plot-plant-registration',
  REMOVAL_INVASIVE_SPECIES = 'removal-invasive-species',
  SAMPLE_TREE_REGISTRATION = 'sample-tree-registration',
  SINGLE_TREE_REGISTRATION = 'single-tree-registration',
  SOIL_IMPROVEMENT = 'soil-improvement',
  STOP_TREE_HARVESTING = 'stop-tree-harvesting',
}

export enum CaptureMode {
  ON_SITE = 'on_site',
  OFF_SITE = 'off_site',
}

export enum CaptureStatus {
  COMPLETE = 'complete',
  PARTIAL = 'partial',
  INCOMPLETE = 'incomplete',
}

export enum AllocationPriority {
  MANUAL = 'manual',
  AUTOMATIC = 'automatic',
  HIGH = 'high',
  MEDIUM = 'medium',
  LOW = 'low',
}

export enum InterventionStatus {
  ACTIVE = 'active',
  COMPLETED = 'completed',
  CANCELLED = 'cancelled',
  PENDING = 'pending',
  FAILED = 'failed',
}

export class GeometryDto {
  @ApiProperty({ example: 'Point' })
  @IsString()
  type: string;

  @ApiProperty({ example: [72.8777, 19.0760] })
  @IsArray()
  @IsNumber({}, { each: true })
  coordinates: number[];
}

export class DeviceLocationDto {
  @ApiProperty({ example: 19.0760 })
  @IsNumber()
  @Min(-90)
  @Max(90)
  latitude: number;

  @ApiProperty({ example: 72.8777 })
  @IsNumber()
  @Min(-180)
  @Max(180)
  longitude: number;

  @ApiPropertyOptional({ example: 10.5 })
  @IsOptional()
  @IsNumber()
  @Min(0)
  accuracy?: number;

  @ApiPropertyOptional({ example: 100.5 })
  @IsOptional()
  @IsNumber()
  altitude?: number;
}

export class InterventionSpeciesDto {
  @ApiProperty({ example: 1 })
  @IsNumber()
  scientificSpeciesId: number;

  @ApiPropertyOptional({ example: 100 })
  @IsOptional()
  @IsNumber()
  @Min(0)
  plantedCount?: number;

  @ApiPropertyOptional({ example: 150 })
  @IsOptional()
  @IsNumber()
  @Min(1)
  targetCount?: number;

  @ApiPropertyOptional({ example: 85.5 })
  @IsOptional()
  @IsNumber()
  @Min(0)
  @Max(100)
  survivalRate?: number;

  @ApiPropertyOptional({ example: 'Good growth observed' })
  @IsOptional()
  @IsString()
  notes?: string;

  @ApiPropertyOptional()
  @IsOptional()
  @IsObject()
  metadata?: any;
}

export class CreateInterventionDto {
  @ApiProperty({ example: 'INT-2024-001' })
  @IsString()
  hid: string;

  @ApiProperty({ enum: InterventionType })
  @IsEnum(InterventionType)
  type: InterventionType;

  @ApiProperty({ example: 'unique-key-123' })
  @IsString()
  idempotencyKey: string;

  @ApiPropertyOptional({ example: 1 })
  @IsOptional()
  @IsNumber()
  projectId?: number;

  @ApiPropertyOptional({ example: 1 })
  @IsOptional()
  @IsNumber()
  projectSiteId?: number;

  @ApiPropertyOptional({ example: 1 })
  @IsOptional()
  @IsNumber()
  parentInterventionId?: number;

  @ApiProperty({ example: '2024-01-15' })
  @IsOptional()
  @IsDateString()
  registrationDate?: string;

  @ApiProperty({ example: '2024-01-15T09:00:00Z' })
  @IsDateString()
  interventionStartDate: string;

  @ApiProperty({ example: '2024-01-15T17:00:00Z' })
  @IsDateString()
  interventionEndDate: string;

  @ApiProperty({ enum: CaptureMode })
  @IsEnum(CaptureMode)
  captureMode: CaptureMode;

  @ApiProperty({ enum: CaptureStatus, default: CaptureStatus.COMPLETE })
  @IsEnum(CaptureStatus)
  captureStatus: CaptureStatus = CaptureStatus.COMPLETE;

  @ApiProperty({ type: GeometryDto })
  @ValidateNested()
  @Type(() => GeometryDto)
  location: GeometryDto;

  @ApiProperty({ type: GeometryDto })
  @ValidateNested()
  @Type(() => GeometryDto)
  originalGeometry: GeometryDto;

  @ApiProperty({ example: 19.0760 })
  @IsNumber()
  @Min(-90)
  @Max(90)
  latitude: number;

  @ApiProperty({ example: 72.8777 })
  @IsNumber()
  @Min(-180)
  @Max(180)
  longitude: number;

  @ApiProperty({ example: 'Point' })
  @IsString()
  geometryType: string;

  @ApiPropertyOptional({ type: DeviceLocationDto })
  @IsOptional()
  @ValidateNested()
  @Type(() => DeviceLocationDto)
  deviceLocation?: DeviceLocationDto;

  @ApiPropertyOptional({ example: 100 })
  @IsOptional()
  @IsNumber()
  @Min(0)
  treesPlanted?: number;

  @ApiPropertyOptional({ example: 10 })
  @IsOptional()
  @IsNumber()
  @Min(0)
  sampleTreeCount?: number;

  @ApiProperty({ enum: AllocationPriority, default: AllocationPriority.MANUAL })
  @IsEnum(AllocationPriority)
  allocationPriority: AllocationPriority = AllocationPriority.MANUAL;

  @ApiPropertyOptional({ example: 'Forest restoration project' })
  @IsOptional()
  @IsString()
  description?: string;

  @ApiPropertyOptional({ example: 'restoration-2024' })
  @IsOptional()
  @IsString()
  tag?: string;

  @ApiProperty({ enum: InterventionStatus, default: InterventionStatus.ACTIVE })
  @IsEnum(InterventionStatus)
  status: InterventionStatus = InterventionStatus.ACTIVE;

  @ApiPropertyOptional({ example: 'Initial setup complete' })
  @IsOptional()
  @IsString()
  statusReason?: string;

  @ApiProperty({ default: false })
  @IsBoolean()
  isPrivate: boolean = false;

  @ApiPropertyOptional()
  @IsOptional()
  @IsObject()
  metadata?: any;

  @ApiPropertyOptional({ type: [InterventionSpeciesDto] })
  @IsOptional()
  @IsArray()
  @ValidateNested({ each: true })
  @Type(() => InterventionSpeciesDto)
  species?: InterventionSpeciesDto[];
}

// src/modules/interventions/dto/update-intervention.dto.ts
import { PartialType } from '@nestjs/swagger';

export class UpdateInterventionDto extends PartialType(CreateInterventionDto) {
  @ApiPropertyOptional({ example: ['image1.jpg', 'image2.jpg'] })
  @IsOptional()
  @IsArray()
  @IsString({ each: true })
  allImages?: string[];

  @ApiPropertyOptional({ example: 'primary-image.jpg' })
  @IsOptional()
  @IsString()
  image?: string;

  @ApiPropertyOptional({ example: 'https://cdn.example.com/image.jpg' })
  @IsOptional()
  @IsString()
  imageCdn?: string;
}

// src/modules/interventions/dto/query-intervention.dto.ts
export class QueryInterventionDto {
  @ApiPropertyOptional({ example: 1 })
  @IsOptional()
  @Type(() => Number)
  @IsNumber()
  page?: number = 1;

  @ApiPropertyOptional({ example: 10 })
  @IsOptional()
  @Type(() => Number)
  @IsNumber()
  @Min(1)
  @Max(100)
  limit?: number = 10;

  @ApiPropertyOptional({ example: 1 })
  @IsOptional()
  @Type(() => Number)
  @IsNumber()
  projectId?: number;

  @ApiPropertyOptional({ example: 1 })
  @IsOptional()
  @Type(() => Number)
  @IsNumber()
  projectSiteId?: number;

  @ApiPropertyOptional({ example: 1 })
  @IsOptional()
  @Type(() => Number)
  @IsNumber()
  userId?: number;

  @ApiPropertyOptional({ enum: InterventionType })
  @IsOptional()
  @IsEnum(InterventionType)
  type?: InterventionType;

  @ApiPropertyOptional({ enum: InterventionStatus })
  @IsOptional()
  @IsEnum(InterventionStatus)
  status?: InterventionStatus;

  @ApiPropertyOptional({ enum: CaptureMode })
  @IsOptional()
  @IsEnum(CaptureMode)
  captureMode?: CaptureMode;

  @ApiPropertyOptional({ example: '2024-01-01' })
  @IsOptional()
  @IsDateString()
  startDate?: string;

  @ApiPropertyOptional({ example: '2024-12-31' })
  @IsOptional()
  @IsDateString()
  endDate?: string;

  @ApiPropertyOptional({ example: 'restoration' })
  @IsOptional()
  @IsString()
  search?: string;

  @ApiPropertyOptional({ example: 'createdAt' })
  @IsOptional()
  @IsString()
  sortBy?: string = 'createdAt';

  @ApiPropertyOptional({ example: 'desc' })
  @IsOptional()
  @IsString()
  sortOrder?: 'asc' | 'desc' = 'desc';

  @ApiPropertyOptional({ example: false })
  @IsOptional()
  @Transform(({ value }) => value === 'true')
  @IsBoolean()
  includePrivate?: boolean = false;
}

// src/modules/interventions/dto/bulk-import.dto.ts
export class BulkImportInterventionDto {
  @ApiProperty({ type: 'string', format: 'binary' })
  file: any;

  @ApiPropertyOptional({ example: 1 })
  @IsOptional()
  @Type(() => Number)
  @IsNumber()
  projectId?: number;

  @ApiPropertyOptional({ example: true })
  @IsOptional()
  @Transform(({ value }) => value === 'true')
  @IsBoolean()
  validateOnly?: boolean = false;
}

export class BulkImportResultDto {
  @ApiProperty({ example: 100 })
  totalRecords: number;

  @ApiProperty({ example: 95 })
  successCount: number;

  @ApiProperty({ example: 5 })
  errorCount: number;

  @ApiProperty({ example: ['Row 3: Invalid intervention type', 'Row 7: Missing required field'] })
  errors: string[];

  @ApiProperty({ example: ['INT-001', 'INT-002'] })
  successfulIds: string[];
}

// src/modules/interventions/dto/intervention-response.dto.ts
export class InterventionSpeciesResponseDto {
  @ApiProperty({ example: 1 })
  id: number;

  @ApiProperty({ example: 1 })
  scientificSpeciesId: number;

  @ApiProperty({ example: 'Mangifera indica' })
  scientificName: string;

  @ApiProperty({ example: 100 })
  plantedCount: number;

  @ApiProperty({ example: 150 })
  targetCount: number;

  @ApiProperty({ example: 85.5 })
  survivalRate: number;

  @ApiProperty({ example: 'Good growth observed' })
  notes: string;
}

export class InterventionResponseDto {
  @ApiProperty({ example: 1 })
  id: number;

  @ApiProperty({ example: 'int_abc123' })
  uid: string;

  @ApiProperty({ example: 'INT-2024-001' })
  hid: string;

  @ApiProperty({ enum: InterventionType })
  type: InterventionType;

  @ApiProperty({ example: 1 })
  projectId: number;

  @ApiProperty({ example: 'Forest Restoration Project' })
  projectName: string;

  @ApiProperty({ example: 1 })
  projectSiteId: number;

  @ApiProperty({ example: 'Site A' })
  siteName: string;

  @ApiProperty({ example: 1 })
  userId: number;

  @ApiProperty({ example: 'John Doe' })
  userName: string;

  @ApiProperty({ example: '2024-01-15T09:00:00Z' })
  interventionStartDate: string;

  @ApiProperty({ example: '2024-01-15T17:00:00Z' })
  interventionEndDate: string;

  @ApiProperty({ enum: CaptureMode })
  captureMode: CaptureMode;

  @ApiProperty({ enum: CaptureStatus })
  captureStatus: CaptureStatus;

  @ApiProperty({ example: { type: 'Point', coordinates: [72.8777, 19.0760] } })
  location: any;

  @ApiProperty({ example: 19.0760 })
  latitude: number;

  @ApiProperty({ example: 72.8777 })
  longitude: number;

  @ApiProperty({ example: 100 })
  treesPlanted: number;

  @ApiProperty({ example: 10 })
  sampleTreeCount: number;

  @ApiProperty({ enum: InterventionStatus })
  status: InterventionStatus;

  @ApiProperty({ example: 'Forest restoration project' })
  description: string;

  @ApiProperty({ example: false })
  isPrivate: boolean;

  @ApiProperty({ type: [InterventionSpeciesResponseDto] })
  species: InterventionSpeciesResponseDto[];

  @ApiProperty({ example: '2024-01-15T09:00:00Z' })
  createdAt: string;

  @ApiProperty({ example: '2024-01-15T09:00:00Z' })
  updatedAt: string;
}
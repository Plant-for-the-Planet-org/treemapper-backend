import { 
  IsString, 
  IsOptional, 
  IsBoolean, 
  IsInt, 
  IsUrl, 
  IsObject,
  MaxLength, 
  MinLength, 
  Min,
  IsLatitude,
  IsLongitude,
  Length,
  IsNumber
} from 'class-validator';
import { Transform } from 'class-transformer';
import { IsSlug, IsGeoJSON } from '../../common/decorator/validation.decorators';

export class CreateProjectDto {
  @IsOptional()
  @IsString()
  @MaxLength(36)
  guid?: string;

  @IsOptional()
  @IsString()
  @MaxLength(20)
  discr?: string = 'base';
  
  @IsOptional()
  @IsString()
  @MinLength(3)
  @MaxLength(255)
  @IsSlug({ message: 'Slug must contain only lowercase letters, numbers, and hyphens' })
  slug?: string;

  @IsOptional()
  @IsString()
  @MaxLength(64)
  purpose?: string;

  @IsString()
  @MinLength(2)
  @MaxLength(255)
  projectName: string;

  @IsOptional()
  @IsString()
  projectType?: string;

  @IsOptional()
  @IsString()
  ecosystem?: string;

  @IsOptional()
  @IsString()
  projectScale?: string;

  @IsOptional()
  @IsInt()
  @Min(1)
  target?: number;

  @IsOptional()
  @IsUrl()
  projectWebsite?: string;

  @IsOptional()
  @IsString()
  description?: string;

  @IsOptional()
  @IsString()
  classification?: string;

  @IsOptional()
  @IsString()
  @MaxLength(255)
  image?: string;

  @IsOptional()
  @IsUrl()
  videoUrl?: string;

  @IsOptional()
  @IsString()
  @Length(2, 2)
  @Transform(({ value }) => value?.toUpperCase())
  country?: string;

  @IsGeoJSON({ message: 'Invalid GeoJSON format' })
  location?: any;

  @IsOptional()
  @IsString()
  originalGeometry?: string;

  @IsOptional()
  @IsNumber()
  @IsLatitude()
  geoLatitude?: number;

  @IsOptional()
  @IsNumber()
  @IsLongitude()
  geoLongitude?: number;

  @IsOptional()
  @IsUrl()
  url?: string;

  @IsOptional()
  @IsString()
  linkText?: string;

  @IsOptional()
  @IsBoolean()
  isActive?: boolean = true;

  @IsOptional()
  @IsBoolean()
  isPublic?: boolean = true;

  @IsOptional()
  @IsString()
  @MaxLength(100)
  intensity?: string;

  @IsOptional()
  @IsString()
  @MaxLength(100)
  revisionPeriodicityLevel?: string;

  @IsOptional()
  @IsObject()
  metadata?: {
    customFields?: Record<string, any>;
    settings?: Record<string, any>;
  };
}

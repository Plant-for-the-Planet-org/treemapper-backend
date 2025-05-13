// src/projects/dto/create-project.dto.ts
import { IsNotEmpty, IsString, IsOptional, IsBoolean, IsNumber, IsObject, ValidateNested, IsArray, IsEnum, IsIn } from 'class-validator';
import { Type } from 'class-transformer';

// Define all possible GeoJSON geometry types
export enum GeoJSONGeometryType {
  Point = 'Point',
  LineString = 'LineString',
  Polygon = 'Polygon',
  MultiPoint = 'MultiPoint',
  MultiLineString = 'MultiLineString',
  MultiPolygon = 'MultiPolygon',
  GeometryCollection = 'GeometryCollection'
}

// Define all possible GeoJSON types including Feature
export enum GeoJSONType {
  Feature = 'Feature',
  FeatureCollection = 'FeatureCollection',
  Point = 'Point',
  LineString = 'LineString',
  Polygon = 'Polygon',
  MultiPoint = 'MultiPoint',
  MultiLineString = 'MultiLineString',
  MultiPolygon = 'MultiPolygon',
  GeometryCollection = 'GeometryCollection'
}

// GeoJSON Geometry class
export class GeoJSONGeometry {
  @IsNotEmpty()
  @IsEnum(GeoJSONGeometryType)
  type: GeoJSONGeometryType;

  @IsNotEmpty()
  @IsArray()
  coordinates: any[];
}

// GeoJSON Feature class
export class GeoJSONFeature {
  @IsNotEmpty()
  @IsIn(['Feature'])
  type: string;

  @IsNotEmpty()
  @ValidateNested()
  @Type(() => GeoJSONGeometry)
  geometry: GeoJSONGeometry;

  @IsOptional()
  @IsObject()
  properties?: Record<string, any>;
}

// Union type for location
export class LocationInput {
  @IsNotEmpty()
  @IsString()
  type: string;

  @IsOptional()
  @IsArray()
  coordinates?: any[];

  @IsOptional()
  @ValidateNested()
  @Type(() => GeoJSONGeometry)
  geometry?: GeoJSONGeometry;

  @IsOptional()
  @IsObject()
  properties?: Record<string, any>;
}

export class CreateProjectDto {
  @IsNotEmpty()
  @IsString()
  projectName: string;

  @IsNotEmpty()
  @IsString()
  projectType: string;

  @IsNotEmpty()
  @IsString()
  ecosystem: string;

  @IsNotEmpty()
  @IsString()
  projectScale: string;

  @IsNotEmpty()
  @IsNumber()
  target: number;

  @IsNotEmpty()
  @IsString()
  projectWebsite: string;

  @IsNotEmpty()
  @IsString()
  description?: string;

  @IsOptional()
  @IsBoolean()
  isPublic?: boolean;

  @IsOptional()
  @IsObject()
  metadata?: Record<string, any>;

  @IsNotEmpty()
  @ValidateNested()
  @Type(() => LocationInput)
  location?: LocationInput;
}
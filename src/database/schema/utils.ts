import { customType } from 'drizzle-orm/pg-core';

export interface GeoJSONGeometry {
  type: 'Point' | 'Polygon' | 'MultiPolygon';
  coordinates: number[] | number[][] | number[][][];
}

export const geometryWithGeoJSON = (srid?: number) =>
  customType<{
    data: GeoJSONGeometry;
    driverData: string;
  }>({
    dataType() {
      return srid ? `geometry(Geometry,${srid})` : 'geometry';
    },
    toDriver(value: any): string {
      if (typeof value === 'object') {
        return `ST_GeomFromGeoJSON('${JSON.stringify(value)}')`;
      }
      return `ST_GeomFromText('${value}')`;
    },
    fromDriver(value: string): any {
      return value;
    },
  });

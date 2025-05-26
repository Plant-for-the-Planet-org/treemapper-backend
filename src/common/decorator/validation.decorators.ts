import { registerDecorator, ValidationOptions, ValidationArguments } from 'class-validator';

export function IsSlug(validationOptions?: ValidationOptions) {
  return function (object: Object, propertyName: string) {
    registerDecorator({
      name: 'isSlug',
      target: object.constructor,
      propertyName: propertyName,
      options: validationOptions,
      validator: {
        validate(value: any, args: ValidationArguments) {
          return typeof value === 'string' && /^[a-z0-9]+(?:-[a-z0-9]+)*$/.test(value);
        },
        defaultMessage(args: ValidationArguments) {
          return 'Slug must contain only lowercase letters, numbers, and hyphens';
        },
      },
    });
  };
}

export function IsGeoJSON(validationOptions?: ValidationOptions) {
  return function (object: Object, propertyName: string) {
    registerDecorator({
      name: 'isGeoJSON',
      target: object.constructor,
      propertyName: propertyName,
      options: validationOptions,
      validator: {
        validate(value: any, args: ValidationArguments) {
          if (!value) return true; // Optional field
          
          try {
            // Basic GeoJSON validation
            return (
              typeof value === 'object' &&
              value.type &&
              ['Point', 'LineString', 'Polygon', 'MultiPoint', 'MultiLineString', 'MultiPolygon', 'GeometryCollection', 'Feature', 'FeatureCollection'].includes(value.type)
            );
          } catch {
            return false;
          }
        },
        defaultMessage(args: ValidationArguments) {
          return 'Invalid GeoJSON format';
        },
      },
    });
  };
}

// ================
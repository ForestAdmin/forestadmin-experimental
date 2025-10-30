import { ColumnType, Operator, PrimitiveTypes } from '@forestadmin/datasource-toolkit';

/**
 * Cosmos DB doesn't enforce strict types, but we can infer types from sample data
 * and map them to Forest Admin types
 */
export type CosmosDataType =
  | 'string'
  | 'number'
  | 'boolean'
  | 'date'
  | 'object'
  | 'array'
  | 'null'
  | 'binary'
  | 'point';

export default class TypeConverter {
  public static fromDataType(dataType: CosmosDataType): ColumnType {
    return TypeConverter.getColumnTypeFromDataType(dataType);
  }

  /**
   * Map Cosmos DB data types to Forest Admin column types
   * Since Cosmos DB is schemaless, these types are inferred from sample documents
   */
  private static getColumnTypeFromDataType(dataType: CosmosDataType): PrimitiveTypes {
    switch (dataType) {
      case 'boolean':
        return 'Boolean';

      case 'date':
        return 'Date';

      case 'number':
        return 'Number';

      case 'string':
        return 'String';

      case 'binary':
        return 'String'; // Base64 encoded strings

      case 'point':
        return 'Point'; // GeoJSON point

      case 'object':
      case 'array':
      case 'null':
        return 'Json';

      default:
        throw new Error(`Unsupported data type: "${dataType}"`);
    }
  }

  /**
   * Infer Cosmos data type from a JavaScript value
   */
  public static inferTypeFromValue(value: unknown): CosmosDataType {
    if (value === null) return 'null';
    if (value === undefined) return 'null';

    if (typeof value === 'boolean') return 'boolean';
    if (typeof value === 'number') return 'number';

    if (typeof value === 'string') {
      // Try to detect if it's a date string
      if (this.isDateString(value)) return 'date';

      return 'string';
    }

    if (Array.isArray(value)) return 'array';

    if (typeof value === 'object') {
      // Check for GeoJSON Point
      if (this.isGeoPoint(value)) return 'point';
      // Check for Date object
      if (value instanceof Date) return 'date';

      return 'object';
    }

    return 'string'; // Default fallback
  }

  /**
   * Check if a string is a valid date
   */
  private static isDateString(value: string): boolean {
    // Match common date formats:
    const isoDateRegex = /^\d{4}[-/]\d{2}[-/]\d{2}([T ]\d{2}:\d{2}:\d{2}(\.\d+)?Z?)?$/;
    const usDateRegex = /^\d{2}\/\d{2}\/\d{4}( \d{2}:\d{2}:\d{2})?$/;
    const shortDateRegex = /^\d{2}-\d{2}$/; // MM-DD format

    const matches =
      isoDateRegex.test(value) || usDateRegex.test(value) || shortDateRegex.test(value);

    if (!matches) {
      return false;
    }

    // For short format (MM-DD), add current year to validate
    let testValue = value;

    if (shortDateRegex.test(value)) {
      const currentYear = new Date().getFullYear();
      testValue = `${currentYear}-${value}`;
    }

    const date = new Date(testValue);
    const isValid = !Number.isNaN(date.getTime());

    return isValid;
  }

  /**
   * Check if an object is a GeoJSON Point
   */
  // eslint-disable-next-line @typescript-eslint/no-explicit-any
  private static isGeoPoint(value: any): boolean {
    return (
      value &&
      typeof value === 'object' &&
      value.type === 'Point' &&
      Array.isArray(value.coordinates) &&
      value.coordinates.length === 2
    );
  }

  /**
   * All fields in Cosmos DB are sortable (no text analysis like Elasticsearch)
   */
  public static isSortable(dataType: CosmosDataType): boolean {
    // Complex types cannot be sorted
    return !['object', 'array'].includes(dataType);
  }

  /**
   * Get supported operators for a given column type
   */
  public static operatorsForColumnType(columnType: ColumnType): Set<Operator> {
    const result: Operator[] = ['Present', 'Missing'];
    const equality: Operator[] = ['Equal', 'NotEqual', 'In', 'NotIn'];

    if (typeof columnType === 'string') {
      const orderables: Operator[] = ['LessThan', 'GreaterThan'];
      const strings: Operator[] = ['Like', 'ILike', 'NotContains', 'Contains'];

      if (['Boolean', 'Enum', 'Uuid'].includes(columnType)) {
        result.push(...equality);
      }

      if (['Date', 'Dateonly', 'Number'].includes(columnType)) {
        result.push(...equality, ...orderables);
      }

      if (['String'].includes(columnType)) {
        result.push(...equality, ...orderables, ...strings);
      }

      if (['Point'].includes(columnType)) {
        result.push(...equality);
      }
    }

    // Cosmos DB supports arrays natively
    if (Array.isArray(columnType)) {
      result.push('IncludesAll');
    }

    return new Set(result);
  }

  /**
   * Operators supported for the id field
   */
  public static operatorsForId(): Set<Operator> {
    return new Set(['Present', 'Missing', 'Equal', 'NotEqual', 'In', 'NotIn']);
  }

  /**
   * Get the most specific common type from an array of types
   */
  public static getMostSpecificType(types: CosmosDataType[]): CosmosDataType {
    if (types.length === 0) return 'null';
    if (types.length === 1) return types[0];

    // If all types are the same, return that type
    const uniqueTypes = [...new Set(types)];
    if (uniqueTypes.length === 1) return uniqueTypes[0];

    // If we have mixed types, check for special cases
    // number + null = number (nullable)
    if (uniqueTypes.every(t => ['number', 'null'].includes(t))) return 'number';
    if (uniqueTypes.every(t => ['string', 'null'].includes(t))) return 'string';
    if (uniqueTypes.every(t => ['boolean', 'null'].includes(t))) return 'boolean';
    if (uniqueTypes.every(t => ['date', 'null'].includes(t))) return 'date';

    // Mixed date/string/null types -> treat as date (string values might be dates in other formats)
    if (
      uniqueTypes.every(t => ['date', 'string', 'null'].includes(t)) &&
      uniqueTypes.includes('date')
    ) {
      return 'date';
    }

    // Mixed numeric types -> number
    if (uniqueTypes.every(t => ['number', 'null'].includes(t))) return 'number';

    // Otherwise, treat as object (Json)
    return 'object';
  }
}

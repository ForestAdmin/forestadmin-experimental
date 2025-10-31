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
  | 'dateonly'
  | 'timeonly'
  | 'enum'
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
  public static getColumnTypeFromDataType(dataType: CosmosDataType): PrimitiveTypes {
    switch (dataType) {
      case 'boolean':
        return 'Boolean';

      case 'date':
        return 'Date';

      case 'dateonly':
        return 'Dateonly';

      case 'timeonly':
        return 'Timeonly';

      case 'number':
        return 'Number';

      case 'string':
        return 'String';

      case 'enum':
        return 'Enum';

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
      // Try to detect time-only strings (HH:MM:SS)
      if (this.isTimeOnlyString(value)) return 'timeonly';

      // Try to detect date-only strings (YYYY-MM-DD)
      if (this.isDateOnlyString(value)) return 'dateonly';

      // Try to detect full datetime strings
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
   * Check if a string is a date-only format (YYYY-MM-DD)
   */
  private static isDateOnlyString(value: string): boolean {
    const dateOnlyRegex = /^\d{4}-\d{2}-\d{2}$/;

    if (!dateOnlyRegex.test(value)) {
      return false;
    }

    // Validate that it's a real date
    const date = new Date(value);

    return !Number.isNaN(date.getTime());
  }

  /**
   * Check if a string is a time-only format (HH:MM:SS or HH:MM:SS.SSS)
   */
  private static isTimeOnlyString(value: string): boolean {
    const timeOnlyRegex = /^([01]\d|2[0-3]):([0-5]\d):([0-5]\d)(\.\d+)?$/;

    return timeOnlyRegex.test(value);
  }

  /**
   * Check if an object is a GeoJSON Point
   */
  private static isGeoPoint(value: unknown): boolean {
    if (!value || typeof value !== 'object') {
      return false;
    }

    const obj = value as Record<string, unknown>;

    return obj.type === 'Point' && Array.isArray(obj.coordinates) && obj.coordinates.length === 2;
  }

  /**
   * All fields in Cosmos DB are sortable (no text analysis like Elasticsearch)
   */
  public static isSortable(dataType: CosmosDataType): boolean {
    // Complex types cannot be sorted
    return !['object', 'array', 'enum'].includes(dataType);
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

      if (['Boolean', 'Enum'].includes(columnType)) {
        result.push(...equality);
      }

      if (['Date', 'Dateonly', 'Timeonly', 'Number'].includes(columnType)) {
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
    if (uniqueTypes.every(t => ['number', 'null'].includes(t))) return 'number';
    if (uniqueTypes.every(t => ['string', 'null'].includes(t))) return 'string';
    if (uniqueTypes.every(t => ['boolean', 'null'].includes(t))) return 'boolean';

    // Mixed date/dateonly/null -> prefer 'date'
    if (uniqueTypes.every(t => ['date', 'dateonly', 'null'].includes(t))) {
      return uniqueTypes.includes('date') ? 'date' : 'dateonly';
    }

    // Pure date types with null should be treated as their respective type
    if (uniqueTypes.every(t => ['date', 'null'].includes(t))) return 'date';
    if (uniqueTypes.every(t => ['dateonly', 'null'].includes(t))) return 'dateonly';
    if (uniqueTypes.every(t => ['timeonly', 'null'].includes(t))) return 'timeonly';

    // Mixed date/string/null types -> treat as date (string values might be dates in other formats)
    if (
      uniqueTypes.every(t => ['date', 'string', 'null'].includes(t)) &&
      uniqueTypes.includes('date')
    ) {
      return 'date';
    }

    // Mixed dateonly/string/null types -> treat as dateonly
    if (
      uniqueTypes.every(t => ['dateonly', 'string', 'null'].includes(t)) &&
      uniqueTypes.includes('dateonly')
    ) {
      return 'dateonly';
    }

    // Mixed timeonly/string/null types -> treat as timeonly
    if (
      uniqueTypes.every(t => ['timeonly', 'string', 'null'].includes(t)) &&
      uniqueTypes.includes('timeonly')
    ) {
      return 'timeonly';
    }

    // Otherwise, treat as object (Json)
    return 'object';
  }
}

import { RecordData } from '@forestadmin/datasource-toolkit';

export default class Serializer {
  /**
   * Serialize a record: convert dates and flatten nested objects if needed
   * @param record The record to serialize
   * @param shouldFlatten Whether to flatten nested objects (default: true)
   */
  static serialize(record: RecordData, shouldFlatten = true): RecordData {
    // Remove Cosmos DB system fields before serialization
    const cleanedRecord = this.removeCosmosSystemFields(record);

    if (shouldFlatten) {
      return this.flattenAndSerialize(cleanedRecord);
    }

    // Legacy behavior: only serialize dates
    Object.entries(cleanedRecord).forEach(([name, value]) => {
      if (value instanceof Date) cleanedRecord[name] = this.serializeValue(value);
      if (Array.isArray(value)) this.serializeValue(value); // the change is by references
      if (value instanceof Object) return this.serialize(cleanedRecord[name], false);
    });

    return cleanedRecord;
  }

  /**
   * Remove Cosmos DB system fields that start with underscore
   */
  private static removeCosmosSystemFields(record: RecordData): RecordData {
    const result: RecordData = {};

    Object.entries(record).forEach(([key, value]) => {
      if (!key.startsWith('_')) {
        result[key] = value;
      }
    });

    return result;
  }

  /**
   * Flatten nested objects into dot-notation fields and serialize values
   * Example: {address: {city: "Paris"}} -> {"address.city": "Paris"}
   */
  static flattenAndSerialize(record: RecordData): RecordData {
    const flattened: RecordData = {};

    const flatten = (obj: RecordData, prefix = '') => {
      Object.entries(obj).forEach(([key, value]) => {
        const fullKey = prefix ? `${prefix}.${key}` : key;

        // Handle null and undefined
        if (value === null || value === undefined) {
          flattened[fullKey] = value;

          return;
        }

        // Serialize dates
        if (value instanceof Date) {
          flattened[fullKey] = value.toISOString();

          return;
        }

        // Keep arrays as-is (Forest Admin handles arrays)
        if (Array.isArray(value)) {
          flattened[fullKey] = this.serializeArray(value);

          return;
        }

        // Check for GeoJSON Point (special case)
        if (this.isGeoPoint(value)) {
          flattened[fullKey] = value;

          return;
        }

        // Recursively flatten nested objects
        if (typeof value === 'object' && value !== null) {
          flatten(value as RecordData, fullKey);

          return;
        }

        // Primitive values
        flattened[fullKey] = value;
      });
    };

    flatten(record);

    return flattened;
  }

  /**
   * Serialize array values (handle dates in arrays)
   */
  private static serializeArray(arr: unknown[]): unknown[] {
    return arr.map(item => {
      if (item instanceof Date) {
        return item.toISOString();
      }

      return item;
    });
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
   * Unflatten dot-notation fields back to nested objects
   * Example: {"address.city": "Paris"} -> {address: {city: "Paris"}}
   * Used when writing data back to Cosmos DB
   */
  static unflatten(record: RecordData): RecordData {
    const result: RecordData = {};

    Object.entries(record).forEach(([key, value]) => {
      const keys = key.split('.');

      if (keys.length === 1) {
        // No nesting, direct assignment
        result[key] = value;
      } else {
        // Nested field - reconstruct the object hierarchy
        let current = result;

        for (let i = 0; i < keys.length - 1; i += 1) {
          const k = keys[i];

          if (!current[k]) {
            current[k] = {};
          }

          current = current[k] as RecordData;
        }

        current[keys[keys.length - 1]] = value;
      }
    });

    return result;
  }

  static serializeValue(value: unknown): unknown {
    if (value instanceof Date) return value.toISOString();

    if (Array.isArray(value)) {
      value.forEach((v, i) => {
        // serialize by reference to improve performances by avoiding the copies
        if (v instanceof Date) value[i] = v.toISOString();
      });
    }

    return value;
  }

  /**
   * Deep merge two objects, properly handling nested objects
   * Used when updating documents to preserve nested fields that aren't being modified
   * @param target The original object
   * @param source The patch to apply
   * @returns Deeply merged object
   */
  static deepMerge(target: RecordData, source: RecordData): RecordData {
    const result: RecordData = { ...target };

    Object.entries(source).forEach(([key, sourceValue]) => {
      const targetValue = result[key];

      // If source value is null or undefined, use it directly
      if (sourceValue === null || sourceValue === undefined) {
        result[key] = sourceValue;

        return;
      }

      // If both values are plain objects, merge them recursively
      if (this.isPlainObject(targetValue) && this.isPlainObject(sourceValue)) {
        result[key] = this.deepMerge(targetValue as RecordData, sourceValue as RecordData);

        return;
      }

      // Otherwise, source value overwrites target value
      result[key] = sourceValue;
    });

    return result;
  }

  /**
   * Check if a value is a plain object (not an array, Date, or other special object)
   */
  // eslint-disable-next-line @typescript-eslint/no-explicit-any
  private static isPlainObject(value: any): boolean {
    return (
      value !== null &&
      typeof value === 'object' &&
      !Array.isArray(value) &&
      !(value instanceof Date) &&
      !this.isGeoPoint(value)
    );
  }
}

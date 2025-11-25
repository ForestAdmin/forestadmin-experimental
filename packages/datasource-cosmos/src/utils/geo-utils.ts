/**
 * Utility functions for working with GeoJSON and geographic data
 */

/**
 * Check if a value is a valid GeoJSON Point
 * @param value The value to check
 * @returns true if the value is a GeoJSON Point with coordinates
 */
export default function isGeoPoint(value: unknown): boolean {
  if (!value || typeof value !== 'object') {
    return false;
  }

  const obj = value as Record<string, unknown>;

  return obj.type === 'Point' && Array.isArray(obj.coordinates) && obj.coordinates.length === 2;
}

// Named export for convenience
export { isGeoPoint };

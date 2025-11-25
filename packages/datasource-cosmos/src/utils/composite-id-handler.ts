/**
 * Utility class for handling composite IDs in virtual array collections
 * Composite IDs format: "parentId:index" (e.g., "user123:0", "order456:2")
 * For nested virtual collections: "grandparentId:parentIndex:childIndex"
 */
export default class CompositeIdHandler {
  /**
   * Parse a composite ID into parent ID and array index
   * @param compositeId The composite ID to parse (e.g., "user123:0")
   * @returns Object with parentId and index
   * @throws Error if the composite ID format is invalid
   */
  static parseCompositeId(compositeId: string): { parentId: string; index: number } {
    const lastColonIndex = compositeId.lastIndexOf(':');

    if (lastColonIndex === -1) {
      throw new Error(`Invalid composite ID format: ${compositeId}`);
    }

    const parentId = compositeId.substring(0, lastColonIndex);
    const indexStr = compositeId.substring(lastColonIndex + 1);
    const index = parseInt(indexStr, 10);

    if (Number.isNaN(index)) {
      throw new Error(`Invalid index in composite ID: ${compositeId}`);
    }

    return { parentId, index };
  }

  /**
   * Create a composite ID from parent ID and array index
   * @param parentId The parent document ID
   * @param index The array index
   * @returns Composite ID string (e.g., "user123:0")
   */
  static createCompositeId(parentId: string, index: number): string {
    return `${parentId}:${index}`;
  }

  /**
   * Check if an ID is a composite ID (contains at least one colon)
   * @param id The ID to check
   * @returns true if the ID is a composite ID
   */
  static isCompositeId(id: string): boolean {
    return id.includes(':');
  }

  /**
   * Get the depth of nesting from a composite ID
   * @param compositeId The composite ID
   * @returns Number of nesting levels (1 for "a:0", 2 for "a:0:1", etc.)
   */
  static getDepth(compositeId: string): number {
    return compositeId.split(':').length - 1;
  }
}

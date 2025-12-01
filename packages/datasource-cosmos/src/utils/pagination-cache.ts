import { createHash } from 'crypto';

/**
 * Cache entry for storing continuation tokens with their associated offset
 */
interface CacheEntry {
  /** The Cosmos DB continuation token */
  continuationToken: string;
  /** The offset (number of items) this token represents */
  offset: number;
  /** Timestamp when this entry was created */
  createdAt: number;
}

/**
 * Configuration options for the pagination cache
 */
export interface PaginationCacheOptions {
  /**
   * Maximum number of entries to store per query
   * Default: 100
   */
  maxEntriesPerQuery?: number;

  /**
   * Time-to-live for cache entries in milliseconds
   * Default: 300000 (5 minutes)
   */
  ttlMs?: number;

  /**
   * Maximum offset allowed for pagination
   * Requests beyond this offset will throw an error
   * Default: 100000
   */
  maxOffset?: number;
}

/**
 * Cache for storing Cosmos DB continuation tokens to enable efficient cursor-based pagination
 *
 * This cache stores continuation tokens indexed by query hash and offset, allowing
 * the system to resume pagination from the nearest cached position rather than
 * fetching all items from the beginning.
 *
 * Example:
 * - User requests offset=1000, limit=10
 * - Cache has token for offset=900
 * - System resumes from offset=900 and skips only 100 items instead of 1000
 */
export default class PaginationCache {
  private cache: Map<string, CacheEntry[]> = new Map();

  private options: Required<PaginationCacheOptions>;

  constructor(options: PaginationCacheOptions = {}) {
    this.options = {
      maxEntriesPerQuery: options.maxEntriesPerQuery ?? 100,
      ttlMs: options.ttlMs ?? 300000, // 5 minutes default
      maxOffset: options.maxOffset ?? 100000,
    };
  }

  /**
   * Get the maximum allowed offset
   */
  getMaxOffset(): number {
    return this.options.maxOffset;
  }

  /**
   * Generate a unique hash for a query to use as cache key
   * @param queryString The SQL query string
   * @param parameters Query parameters
   * @param partitionKey Optional partition key
   */
  generateQueryHash(
    queryString: string,
    parameters?: { name: string; value: unknown }[],
    partitionKey?: string | number,
  ): string {
    const hashInput = JSON.stringify({
      query: queryString,
      parameters: parameters || [],
      partitionKey,
    });

    return createHash('sha256').update(hashInput).digest('hex').substring(0, 16);
  }

  /**
   * Find the best cached continuation token for a given offset
   * Returns the token with the highest offset that is still <= requested offset
   *
   * @param queryHash The query hash
   * @param targetOffset The target offset to reach
   * @returns The best matching cache entry, or null if none found
   */
  findBestToken(queryHash: string, targetOffset: number): CacheEntry | null {
    const entries = this.cache.get(queryHash);

    if (!entries || entries.length === 0) {
      return null;
    }

    // Clean expired entries first
    const now = Date.now();
    const validEntries = entries.filter(e => now - e.createdAt < this.options.ttlMs);

    if (validEntries.length !== entries.length) {
      // Update cache with only valid entries
      if (validEntries.length > 0) {
        this.cache.set(queryHash, validEntries);
      } else {
        this.cache.delete(queryHash);

        return null;
      }
    }

    // Find the entry with the highest offset that is <= targetOffset
    let bestEntry: CacheEntry | null = null;

    for (const entry of validEntries) {
      if (entry.offset <= targetOffset) {
        if (!bestEntry || entry.offset > bestEntry.offset) {
          bestEntry = entry;
        }
      }
    }

    return bestEntry;
  }

  /**
   * Store a continuation token for a specific offset
   *
   * @param queryHash The query hash
   * @param offset The offset this token represents
   * @param continuationToken The Cosmos DB continuation token
   */
  storeToken(queryHash: string, offset: number, continuationToken: string): void {
    let entries = this.cache.get(queryHash);

    if (!entries) {
      entries = [];
      this.cache.set(queryHash, entries);
    }

    // Check if we already have an entry for this offset
    const existingIndex = entries.findIndex(e => e.offset === offset);

    if (existingIndex >= 0) {
      // Update existing entry
      entries[existingIndex] = {
        continuationToken,
        offset,
        createdAt: Date.now(),
      };
    } else {
      // Add new entry
      entries.push({
        continuationToken,
        offset,
        createdAt: Date.now(),
      });

      // Sort by offset for efficient lookup
      entries.sort((a, b) => a.offset - b.offset);

      // Trim to max entries (remove oldest based on createdAt if over limit)
      if (entries.length > this.options.maxEntriesPerQuery) {
        entries.sort((a, b) => b.createdAt - a.createdAt);
        entries.length = this.options.maxEntriesPerQuery;
        entries.sort((a, b) => a.offset - b.offset);
      }
    }
  }

  /**
   * Clear all cached tokens for a specific query
   * @param queryHash The query hash
   */
  clearQuery(queryHash: string): void {
    this.cache.delete(queryHash);
  }

  /**
   * Clear all cached tokens
   */
  clearAll(): void {
    this.cache.clear();
  }

  /**
   * Get cache statistics for monitoring
   */
  getStats(): { totalQueries: number; totalEntries: number } {
    let totalEntries = 0;

    for (const entries of this.cache.values()) {
      totalEntries += entries.length;
    }

    return {
      totalQueries: this.cache.size,
      totalEntries,
    };
  }
}

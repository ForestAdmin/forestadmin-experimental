import PaginationCache from '../../src/utils/pagination-cache';

describe('PaginationCache', () => {
  let cache: PaginationCache;

  beforeEach(() => {
    cache = new PaginationCache();
  });

  describe('constructor', () => {
    it('should create cache with default options', () => {
      const defaultCache = new PaginationCache();
      expect(defaultCache.getMaxOffset()).toBe(100000);
    });

    it('should accept custom maxOffset', () => {
      const customCache = new PaginationCache({ maxOffset: 50000 });
      expect(customCache.getMaxOffset()).toBe(50000);
    });

    it('should accept custom ttlMs', () => {
      const customCache = new PaginationCache({ ttlMs: 60000 });
      expect(customCache).toBeDefined();
    });

    it('should accept custom maxEntriesPerQuery', () => {
      const customCache = new PaginationCache({ maxEntriesPerQuery: 50 });
      expect(customCache).toBeDefined();
    });
  });

  describe('generateQueryHash', () => {
    it('should generate consistent hash for same query', () => {
      const hash1 = cache.generateQueryHash('SELECT * FROM c', []);
      const hash2 = cache.generateQueryHash('SELECT * FROM c', []);

      expect(hash1).toBe(hash2);
    });

    it('should generate different hash for different queries', () => {
      const hash1 = cache.generateQueryHash('SELECT * FROM c', []);
      const hash2 = cache.generateQueryHash('SELECT * FROM c WHERE c.id = @id', []);

      expect(hash1).not.toBe(hash2);
    });

    it('should generate different hash for different parameters', () => {
      const hash1 = cache.generateQueryHash('SELECT * FROM c WHERE c.id = @id', [
        { name: '@id', value: '1' },
      ]);
      const hash2 = cache.generateQueryHash('SELECT * FROM c WHERE c.id = @id', [
        { name: '@id', value: '2' },
      ]);

      expect(hash1).not.toBe(hash2);
    });

    it('should generate different hash for different partition keys', () => {
      const hash1 = cache.generateQueryHash('SELECT * FROM c', [], 'tenant-1');
      const hash2 = cache.generateQueryHash('SELECT * FROM c', [], 'tenant-2');

      expect(hash1).not.toBe(hash2);
    });

    it('should handle undefined parameters', () => {
      const hash1 = cache.generateQueryHash('SELECT * FROM c');
      const hash2 = cache.generateQueryHash('SELECT * FROM c', undefined);

      expect(hash1).toBe(hash2);
    });

    it('should generate a 16-character hash', () => {
      const hash = cache.generateQueryHash('SELECT * FROM c');
      expect(hash).toHaveLength(16);
    });

    it('should handle numeric partition key', () => {
      const hash1 = cache.generateQueryHash('SELECT * FROM c', [], 123);
      const hash2 = cache.generateQueryHash('SELECT * FROM c', [], 456);

      expect(hash1).not.toBe(hash2);
    });
  });

  describe('storeToken and findBestToken', () => {
    it('should store and retrieve token', () => {
      const queryHash = cache.generateQueryHash('SELECT * FROM c');

      cache.storeToken(queryHash, 100, 'token-100');

      const result = cache.findBestToken(queryHash, 100);

      expect(result).not.toBeNull();
      expect(result?.offset).toBe(100);
      expect(result?.continuationToken).toBe('token-100');
    });

    it('should find best token for exact offset', () => {
      const queryHash = cache.generateQueryHash('SELECT * FROM c');

      cache.storeToken(queryHash, 100, 'token-100');
      cache.storeToken(queryHash, 200, 'token-200');
      cache.storeToken(queryHash, 300, 'token-300');

      const result = cache.findBestToken(queryHash, 200);

      expect(result?.offset).toBe(200);
      expect(result?.continuationToken).toBe('token-200');
    });

    it('should find closest token below target offset', () => {
      const queryHash = cache.generateQueryHash('SELECT * FROM c');

      cache.storeToken(queryHash, 100, 'token-100');
      cache.storeToken(queryHash, 200, 'token-200');
      cache.storeToken(queryHash, 300, 'token-300');

      const result = cache.findBestToken(queryHash, 250);

      expect(result?.offset).toBe(200);
      expect(result?.continuationToken).toBe('token-200');
    });

    it('should return null when no tokens exist for query', () => {
      const queryHash = cache.generateQueryHash('SELECT * FROM c');
      const result = cache.findBestToken(queryHash, 100);

      expect(result).toBeNull();
    });

    it('should return null when target offset is below all cached offsets', () => {
      const queryHash = cache.generateQueryHash('SELECT * FROM c');

      cache.storeToken(queryHash, 100, 'token-100');
      cache.storeToken(queryHash, 200, 'token-200');

      const result = cache.findBestToken(queryHash, 50);

      expect(result).toBeNull();
    });

    it('should update existing token for same offset', () => {
      const queryHash = cache.generateQueryHash('SELECT * FROM c');

      cache.storeToken(queryHash, 100, 'token-old');
      cache.storeToken(queryHash, 100, 'token-new');

      const result = cache.findBestToken(queryHash, 100);

      expect(result?.continuationToken).toBe('token-new');
    });

    it('should handle multiple queries independently', () => {
      const queryHash1 = cache.generateQueryHash('SELECT * FROM c');
      const queryHash2 = cache.generateQueryHash('SELECT * FROM c WHERE c.active = true');

      cache.storeToken(queryHash1, 100, 'query1-token-100');
      cache.storeToken(queryHash2, 100, 'query2-token-100');

      const result1 = cache.findBestToken(queryHash1, 100);
      const result2 = cache.findBestToken(queryHash2, 100);

      expect(result1?.continuationToken).toBe('query1-token-100');
      expect(result2?.continuationToken).toBe('query2-token-100');
    });
  });

  describe('TTL expiration', () => {
    it('should expire entries after TTL', async () => {
      const shortTtlCache = new PaginationCache({ ttlMs: 50 });
      const queryHash = shortTtlCache.generateQueryHash('SELECT * FROM c');

      shortTtlCache.storeToken(queryHash, 100, 'token-100');

      // Immediately should find it
      expect(shortTtlCache.findBestToken(queryHash, 100)).not.toBeNull();

      // Wait for TTL to expire
      await new Promise(resolve => {
        setTimeout(resolve, 100);
      });

      // Should not find it anymore
      expect(shortTtlCache.findBestToken(queryHash, 100)).toBeNull();
    });

    it('should keep non-expired entries when some expire', async () => {
      const shortTtlCache = new PaginationCache({ ttlMs: 100 });
      const queryHash = shortTtlCache.generateQueryHash('SELECT * FROM c');

      shortTtlCache.storeToken(queryHash, 100, 'token-100');

      // Wait 60ms
      await new Promise(resolve => {
        setTimeout(resolve, 60);
      });

      // Add a new token
      shortTtlCache.storeToken(queryHash, 200, 'token-200');

      // Wait another 60ms (first token should be expired, second should not)
      await new Promise(resolve => {
        setTimeout(resolve, 60);
      });

      // First token should be expired
      const result = shortTtlCache.findBestToken(queryHash, 150);

      // Should not find the expired token-100, only token-200 is valid but it's > 150
      expect(result).toBeNull();

      // But should find token-200 for offset 200
      const result2 = shortTtlCache.findBestToken(queryHash, 200);
      expect(result2?.continuationToken).toBe('token-200');
    });
  });

  describe('maxEntriesPerQuery', () => {
    it('should limit entries per query', () => {
      const limitedCache = new PaginationCache({ maxEntriesPerQuery: 3 });
      const queryHash = limitedCache.generateQueryHash('SELECT * FROM c');

      // Store 5 entries
      limitedCache.storeToken(queryHash, 100, 'token-100');
      limitedCache.storeToken(queryHash, 200, 'token-200');
      limitedCache.storeToken(queryHash, 300, 'token-300');
      limitedCache.storeToken(queryHash, 400, 'token-400');
      limitedCache.storeToken(queryHash, 500, 'token-500');

      const stats = limitedCache.getStats();

      // Should only have 3 entries
      expect(stats.totalEntries).toBe(3);
    });

    it('should keep most recent entries when limit exceeded', () => {
      const limitedCache = new PaginationCache({ maxEntriesPerQuery: 2 });
      const queryHash = limitedCache.generateQueryHash('SELECT * FROM c');

      limitedCache.storeToken(queryHash, 100, 'token-100');

      // Add small delay to ensure different timestamps
      limitedCache.storeToken(queryHash, 200, 'token-200');
      limitedCache.storeToken(queryHash, 300, 'token-300');

      // Should keep the most recently added entries
      const stats = limitedCache.getStats();
      expect(stats.totalEntries).toBe(2);
    });
  });

  describe('clearQuery', () => {
    it('should clear all tokens for a specific query', () => {
      const queryHash = cache.generateQueryHash('SELECT * FROM c');

      cache.storeToken(queryHash, 100, 'token-100');
      cache.storeToken(queryHash, 200, 'token-200');

      cache.clearQuery(queryHash);

      expect(cache.findBestToken(queryHash, 200)).toBeNull();
    });

    it('should not affect other queries', () => {
      const queryHash1 = cache.generateQueryHash('SELECT * FROM c');
      const queryHash2 = cache.generateQueryHash('SELECT * FROM c WHERE c.active = true');

      cache.storeToken(queryHash1, 100, 'query1-token-100');
      cache.storeToken(queryHash2, 100, 'query2-token-100');

      cache.clearQuery(queryHash1);

      expect(cache.findBestToken(queryHash1, 100)).toBeNull();
      expect(cache.findBestToken(queryHash2, 100)).not.toBeNull();
    });
  });

  describe('clearAll', () => {
    it('should clear all cached tokens', () => {
      const queryHash1 = cache.generateQueryHash('SELECT * FROM c');
      const queryHash2 = cache.generateQueryHash('SELECT * FROM c WHERE c.active = true');

      cache.storeToken(queryHash1, 100, 'query1-token-100');
      cache.storeToken(queryHash2, 100, 'query2-token-100');

      cache.clearAll();

      expect(cache.findBestToken(queryHash1, 100)).toBeNull();
      expect(cache.findBestToken(queryHash2, 100)).toBeNull();
      expect(cache.getStats().totalQueries).toBe(0);
    });
  });

  describe('getStats', () => {
    it('should return correct statistics', () => {
      const queryHash1 = cache.generateQueryHash('SELECT * FROM c');
      const queryHash2 = cache.generateQueryHash('SELECT * FROM c WHERE c.active = true');

      cache.storeToken(queryHash1, 100, 'token-100');
      cache.storeToken(queryHash1, 200, 'token-200');
      cache.storeToken(queryHash2, 100, 'token-100');

      const stats = cache.getStats();

      expect(stats.totalQueries).toBe(2);
      expect(stats.totalEntries).toBe(3);
    });

    it('should return zero stats for empty cache', () => {
      const stats = cache.getStats();

      expect(stats.totalQueries).toBe(0);
      expect(stats.totalEntries).toBe(0);
    });
  });

  describe('getMaxOffset', () => {
    it('should return configured max offset', () => {
      expect(cache.getMaxOffset()).toBe(100000);

      const customCache = new PaginationCache({ maxOffset: 25000 });
      expect(customCache.getMaxOffset()).toBe(25000);
    });
  });

  describe('edge cases', () => {
    it('should handle offset of 0', () => {
      const queryHash = cache.generateQueryHash('SELECT * FROM c');

      cache.storeToken(queryHash, 0, 'token-0');

      const result = cache.findBestToken(queryHash, 0);

      expect(result?.offset).toBe(0);
      expect(result?.continuationToken).toBe('token-0');
    });

    it('should handle very large offsets', () => {
      const queryHash = cache.generateQueryHash('SELECT * FROM c');

      cache.storeToken(queryHash, 99999, 'token-99999');

      const result = cache.findBestToken(queryHash, 100000);

      expect(result?.offset).toBe(99999);
    });

    it('should handle empty query string', () => {
      const hash = cache.generateQueryHash('');
      expect(hash).toHaveLength(16);
    });

    it('should handle complex query parameters', () => {
      const hash = cache.generateQueryHash('SELECT * FROM c WHERE c.data = @data', [
        {
          name: '@data',
          value: { nested: { deep: [1, 2, 3] } },
        },
      ]);

      expect(hash).toHaveLength(16);
    });

    it('should handle special characters in partition key', () => {
      const hash1 = cache.generateQueryHash('SELECT * FROM c', [], 'tenant/with/slashes');
      const hash2 = cache.generateQueryHash('SELECT * FROM c', [], 'tenant-with-dashes');

      expect(hash1).not.toBe(hash2);
      expect(hash1).toHaveLength(16);
      expect(hash2).toHaveLength(16);
    });
  });
});

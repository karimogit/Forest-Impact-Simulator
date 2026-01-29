/**
 * Persistent API caching utilities using localStorage
 * Stores API responses with timestamps and TTL
 */

export interface CacheEntry<T> {
  data: T;
  timestamp: number;
  ttl: number; // Time to live in milliseconds
}

export interface CacheOptions {
  ttl?: number; // Default: 1 hour
  key: string;
}

const DEFAULT_TTL = 60 * 60 * 1000; // 1 hour
const CACHE_VERSION = 'v1';
const CACHE_PREFIX = `forest-sim-cache-${CACHE_VERSION}`;

/**
 * Check if localStorage is available
 */
function isLocalStorageAvailable(): boolean {
  try {
    const test = '__storage_test__';
    localStorage.setItem(test, test);
    localStorage.removeItem(test);
    return true;
  } catch {
    return false;
  }
}

/**
 * Get cached data if available and not expired
 */
export function getCachedData<T>(key: string): T | null {
  if (!isLocalStorageAvailable()) {
    return null;
  }

  try {
    const cacheKey = `${CACHE_PREFIX}-${key}`;
    const cached = localStorage.getItem(cacheKey);
    
    if (!cached) {
      return null;
    }

    const entry: CacheEntry<T> = JSON.parse(cached);
    const now = Date.now();

    // Check if cache is expired
    if (now - entry.timestamp > entry.ttl) {
      localStorage.removeItem(cacheKey);
      return null;
    }

    if (process.env.NODE_ENV !== 'production') {
      console.log(`Cache hit for key: ${key}`);
    }
    return entry.data;
  } catch (error) {
    if (process.env.NODE_ENV !== 'production') {
      console.warn('Error reading from cache:', error);
    }
    return null;
  }
}

/**
 * Store data in cache with TTL
 */
export function setCachedData<T>(key: string, data: T, ttl: number = DEFAULT_TTL): void {
  if (!isLocalStorageAvailable()) {
    return;
  }

  try {
    const cacheKey = `${CACHE_PREFIX}-${key}`;
    const entry: CacheEntry<T> = {
      data,
      timestamp: Date.now(),
      ttl
    };

    localStorage.setItem(cacheKey, JSON.stringify(entry));
    if (process.env.NODE_ENV !== 'production') {
      console.log(`Cached data for key: ${key} (TTL: ${ttl / 1000 / 60} minutes)`);
    }
  } catch (error) {
    if (process.env.NODE_ENV !== 'production') {
      console.warn('Error writing to cache:', error);
    }
    // If storage quota exceeded (any storage error), clear old caches and retry
    // Note: QuotaExceededError name may vary by browser, so we catch all storage errors
    const isStorageError = error instanceof Error && (
      error.name === 'QuotaExceededError' ||
      error.name === 'NS_ERROR_DOM_QUOTA_REACHED' ||
      error.message?.toLowerCase().includes('quota')
    );
    
    if (isStorageError) {
      clearExpiredCache();
      try {
        const cacheKey = `${CACHE_PREFIX}-${key}`;
        const entry: CacheEntry<T> = { data, timestamp: Date.now(), ttl };
        localStorage.setItem(cacheKey, JSON.stringify(entry));
        if (process.env.NODE_ENV !== 'production') {
          console.log('Successfully cached after clearing expired entries');
        }
      } catch (retryError) {
        if (process.env.NODE_ENV !== 'production') {
          console.error('Failed to cache after clearing expired entries:', retryError);
        }
      }
    }
  }
}

/**
 * Clear all expired cache entries
 */
export function clearExpiredCache(): void {
  if (!isLocalStorageAvailable()) {
    return;
  }

  try {
    const now = Date.now();
    const keysToRemove: string[] = [];

    for (let i = 0; i < localStorage.length; i++) {
      const key = localStorage.key(i);
      if (key && key.startsWith(CACHE_PREFIX)) {
        const cached = localStorage.getItem(key);
        if (cached) {
          try {
            const entry: CacheEntry<unknown> = JSON.parse(cached);
            if (now - entry.timestamp > entry.ttl) {
            keysToRemove.push(key);
          }
        } catch {
          // Invalid entry, remove it
          keysToRemove.push(key);
        }
        }
      }
    }

    keysToRemove.forEach(key => localStorage.removeItem(key));
    if (process.env.NODE_ENV !== 'production' && keysToRemove.length > 0) {
      console.log(`Cleared ${keysToRemove.length} expired cache entries`);
    }
  } catch (error) {
    if (process.env.NODE_ENV !== 'production') {
      console.warn('Error clearing expired cache:', error);
    }
  }
}

/**
 * Clear all cache entries for this app
 */
export function clearAllCache(): void {
  if (!isLocalStorageAvailable()) {
    return;
  }

  try {
    const keysToRemove: string[] = [];

    for (let i = 0; i < localStorage.length; i++) {
      const key = localStorage.key(i);
      if (key && key.startsWith(CACHE_PREFIX)) {
        keysToRemove.push(key);
      }
    }

    keysToRemove.forEach(key => localStorage.removeItem(key));
    if (process.env.NODE_ENV !== 'production') {
      console.log(`Cleared ${keysToRemove.length} cache entries`);
    }
  } catch (error) {
    if (process.env.NODE_ENV !== 'production') {
      console.warn('Error clearing cache:', error);
    }
  }
}

/**
 * Get cache statistics
 */
export function getCacheStats(): { count: number; size: number } {
  if (!isLocalStorageAvailable()) {
    return { count: 0, size: 0 };
  }

  let count = 0;
  let size = 0;

  try {
    for (let i = 0; i < localStorage.length; i++) {
      const key = localStorage.key(i);
      if (key && key.startsWith(CACHE_PREFIX)) {
        count++;
        const value = localStorage.getItem(key);
        if (value) {
          size += key.length + value.length;
        }
      }
    }
  } catch (error) {
    if (process.env.NODE_ENV !== 'production') {
      console.warn('Error calculating cache stats:', error);
    }
  }

  return { count, size };
}

/**
 * Generate cache key from coordinates
 */
export function generateLocationKey(lat: number, lon: number): string {
  // Round to 4 decimal places (~11m precision) to allow cache hits for nearby locations
  return `${lat.toFixed(4)},${lon.toFixed(4)}`;
}

// Clean up expired cache on module load
if (typeof window !== 'undefined') {
  clearExpiredCache();
}

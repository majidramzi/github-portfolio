export interface CacheEntry<T> {
  data: T;
  fetchedAt: number;
  expiresAt: number;
}

export interface CacheReadResult<T> {
  data: T;
  fetchedAt: number;
  expiresAt: number;
  isExpired: boolean;
}

const CACHE_PREFIX = 'github-portfolio:v1:';
const DEFAULT_TTL_MS = 60 * 60 * 1000; // 60 minutes

export class PortfolioCache {
  private readonly memoryFallback = new Map<string, string>();
  private readonly defaultTtlMs: number;

  constructor(defaultTtlMs = DEFAULT_TTL_MS) {
    this.defaultTtlMs = defaultTtlMs;
  }

  private getStorage(): Storage | null {
    try {
      if (typeof window !== 'undefined' && window.localStorage) {
        return window.localStorage;
      }
    } catch {
      // Blocked in privacy-restricted iframes or environments
    }
    return null;
  }

  public buildKey(username: string, resource: string): string {
    return `${CACHE_PREFIX}${username.toLowerCase()}:${resource}`;
  }

  public get<T>(
    username: string,
    resource: string,
    options: { allowExpired?: boolean; now?: number } = {}
  ): CacheReadResult<T> | null {
    const key = this.buildKey(username, resource);
    const raw = this.readRaw(key);
    if (!raw) {
      return null;
    }

    try {
      const parsed = JSON.parse(raw) as CacheEntry<T>;
      if (
        typeof parsed !== 'object' ||
        parsed === null ||
        typeof parsed.fetchedAt !== 'number' ||
        typeof parsed.expiresAt !== 'number'
      ) {
        this.removeRaw(key);
        return null;
      }

      const now = options.now ?? Date.now();
      const isExpired = now >= parsed.expiresAt;

      if (isExpired && !options.allowExpired) {
        return null;
      }

      return {
        data: parsed.data,
        fetchedAt: parsed.fetchedAt,
        expiresAt: parsed.expiresAt,
        isExpired,
      };
    } catch {
      this.removeRaw(key);
      return null;
    }
  }

  public set<T>(
    username: string,
    resource: string,
    data: T,
    ttlMs = this.defaultTtlMs,
    now = Date.now()
  ): CacheEntry<T> {
    const entry: CacheEntry<T> = {
      data,
      fetchedAt: now,
      expiresAt: now + Math.max(0, ttlMs),
    };
    const key = this.buildKey(username, resource);
    const serialized = JSON.stringify(entry);
    this.writeRaw(key, serialized);
    return entry;
  }

  public remove(username: string, resource: string): void {
    this.removeRaw(this.buildKey(username, resource));
  }

  public clearUser(username: string): void {
    const userPrefix = `${CACHE_PREFIX}${username.toLowerCase()}:`;
    const storage = this.getStorage();

    if (storage) {
      const keysToDelete: string[] = [];
      for (let i = 0; i < storage.length; i += 1) {
        const key = storage.key(i);
        if (key && key.startsWith(userPrefix)) {
          keysToDelete.push(key);
        }
      }
      for (const key of keysToDelete) {
        storage.removeItem(key);
      }
    }

    for (const key of Array.from(this.memoryFallback.keys())) {
      if (key.startsWith(userPrefix)) {
        this.memoryFallback.delete(key);
      }
    }
  }

  public clearAll(): void {
    const storage = this.getStorage();
    if (storage) {
      const keysToDelete: string[] = [];
      for (let i = 0; i < storage.length; i += 1) {
        const key = storage.key(i);
        if (key && key.startsWith(CACHE_PREFIX)) {
          keysToDelete.push(key);
        }
      }
      for (const key of keysToDelete) {
        storage.removeItem(key);
      }
    }
    this.memoryFallback.clear();
  }

  private readRaw(key: string): string | null {
    const storage = this.getStorage();
    if (storage) {
      try {
        const value = storage.getItem(key);
        if (value !== null) {
          return value;
        }
      } catch {
        // Fallback to memory cache
      }
    }
    return this.memoryFallback.get(key) ?? null;
  }

  private writeRaw(key: string, value: string): void {
    const storage = this.getStorage();
    if (storage) {
      try {
        storage.setItem(key, value);
        this.memoryFallback.delete(key);
        return;
      } catch {
        // Likely QuotaExceededError: evict oldest cached README entries and retry once
        this.evictOldestReadmeEntries(storage, 10);
        try {
          storage.setItem(key, value);
          this.memoryFallback.delete(key);
          return;
        } catch {
          // Fall back to in-memory storage if still full
        }
      }
    }
    this.memoryFallback.set(key, value);
  }

  private removeRaw(key: string): void {
    const storage = this.getStorage();
    if (storage) {
      try {
        storage.removeItem(key);
      } catch {
        // Ignore
      }
    }
    this.memoryFallback.delete(key);
  }

  private evictOldestReadmeEntries(storage: Storage, maxEvictions: number): void {
    const readmeItems: Array<{ key: string; fetchedAt: number }> = [];
    for (let i = 0; i < storage.length; i += 1) {
      const key = storage.key(i);
      if (!key || !key.startsWith(CACHE_PREFIX) || !key.includes(':readme:')) {
        continue;
      }
      try {
        const parsed = JSON.parse(storage.getItem(key) ?? '') as { fetchedAt?: number };
        readmeItems.push({
          key,
          fetchedAt: typeof parsed.fetchedAt === 'number' ? parsed.fetchedAt : 0,
        });
      } catch {
        readmeItems.push({ key, fetchedAt: 0 });
      }
    }

    readmeItems.sort((a, b) => a.fetchedAt - b.fetchedAt);
    for (const item of readmeItems.slice(0, maxEvictions)) {
      try {
        storage.removeItem(item.key);
      } catch {
        // Ignore
      }
    }
  }
}

export const defaultCache = new PortfolioCache();

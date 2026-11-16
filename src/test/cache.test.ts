import { describe, expect, it } from 'vitest';
import { PortfolioCache } from '../services/cache';

describe('PortfolioCache', () => {
  it('stores and retrieves fresh cached values within TTL', () => {
    const cache = new PortfolioCache(60_000);
    const now = 1_700_000_000_000;

    cache.set('alice-builder', 'profile', { login: 'alice-builder' }, 60_000, now);

    const hit = cache.get<{ login: string }>('alice-builder', 'profile', { now: now + 30_000 });
    expect(hit).not.toBeNull();
    expect(hit?.data.login).toBe('alice-builder');
    expect(hit?.isExpired).toBe(false);
    expect(hit?.fetchedAt).toBe(now);
  });

  it('returns null after expiration unless allowExpired is enabled for stale fallback', () => {
    const cache = new PortfolioCache(60_000);
    const now = 1_700_000_000_000;

    cache.set('alice-builder', 'repos', [{ id: 1 }], 60_000, now);

    const expiredDefault = cache.get('alice-builder', 'repos', { now: now + 60_001 });
    expect(expiredDefault).toBeNull();

    const staleFallback = cache.get<Array<{ id: number }>>('alice-builder', 'repos', {
      allowExpired: true,
      now: now + 120_000,
    });
    expect(staleFallback).not.toBeNull();
    expect(staleFallback?.isExpired).toBe(true);
    expect(staleFallback?.data).toEqual([{ id: 1 }]);
  });

  it('isolates cache namespaces per GitHub username', () => {
    const cache = new PortfolioCache(60_000);
    cache.set('alice-builder', 'profile', { login: 'alice-builder' });
    cache.set('marco-systems', 'profile', { login: 'marco-systems' });

    expect(cache.get<{ login: string }>('alice-builder', 'profile')?.data.login).toBe(
      'alice-builder'
    );
    expect(cache.get<{ login: string }>('marco-systems', 'profile')?.data.login).toBe(
      'marco-systems'
    );

    cache.clearUser('alice-builder');
    expect(cache.get('alice-builder', 'profile')).toBeNull();
    expect(cache.get<{ login: string }>('marco-systems', 'profile')?.data.login).toBe(
      'marco-systems'
    );
  });

  it('recovers cleanly from corrupted localStorage entries', () => {
    const cache = new PortfolioCache(60_000);
    const key = cache.buildKey('alice-builder', 'profile');
    window.localStorage.setItem(key, '{not-valid-json');

    expect(cache.get('alice-builder', 'profile')).toBeNull();
    expect(window.localStorage.getItem(key)).toBeNull();
  });
});

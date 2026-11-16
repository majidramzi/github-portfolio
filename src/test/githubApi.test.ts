import { afterEach, describe, expect, it, vi } from 'vitest';
import {
  decodeBase64Utf8,
  fetchAllOwnedRepositories,
  fetchRepositoryReadme,
  fetchUserProfile,
  parseNextLinkHeader,
} from '../services/githubApi';
import { GitHubApiError } from '../types/github';
import { ALICE_USER, encodeUtf8ToBase64, makeMockRepo } from './fixtures';

const noDelayRetry = {
  maxRetries: 2,
  initialDelayMs: 1,
  sleep: async () => undefined,
};

function makeJsonResponse(
  body: unknown,
  options: { status?: number; headers?: Record<string, string> } = {}
): Response {
  return new Response(JSON.stringify(body), {
    status: options.status ?? 200,
    headers: {
      'Content-Type': 'application/json',
      'X-RateLimit-Limit': '60',
      'X-RateLimit-Remaining': '55',
      'X-RateLimit-Reset': String(Math.floor(Date.now() / 1000) + 3600),
      ...options.headers,
    },
  });
}

describe('GitHub API client', () => {
  afterEach(() => {
    vi.restoreAllMocks();
  });

  it('parses RFC 5988 Link headers for next page URLs', () => {
    const link =
      '<https://api.github.com/user/1001/repos?type=owner&per_page=100&page=2>; rel="next", <https://api.github.com/user/1001/repos?type=owner&per_page=100&page=4>; rel="last"';
    expect(parseNextLinkHeader(link)).toBe(
      'https://api.github.com/user/1001/repos?type=owner&per_page=100&page=2'
    );
    expect(parseNextLinkHeader('<https://api.github.com/page=1>; rel="prev"')).toBeNull();
    expect(parseNextLinkHeader(null)).toBeNull();
  });

  it('decodes UTF-8 base64 README payloads including unicode characters', () => {
    const original = '# Café Portfolio 🚀\n\nSupports UTF-8 — seamlessly.';
    const encoded = encodeUtf8ToBase64(original);
    expect(decodeBase64Utf8(encoded)).toBe(original);
  });

  it('fetches and parses user profile and reports 404 accounts cleanly', async () => {
    const fetchMock = vi.spyOn(globalThis, 'fetch');
    fetchMock.mockResolvedValueOnce(makeJsonResponse(ALICE_USER));

    const { user, rateLimit } = await fetchUserProfile('alice-builder', { retry: noDelayRetry });
    expect(user.login).toBe('alice-builder');
    expect(rateLimit.remaining).toBe(55);

    fetchMock.mockResolvedValueOnce(makeJsonResponse({ message: 'Not Found' }, { status: 404 }));
    await expect(
      fetchUserProfile('deleted-account', { retry: noDelayRetry })
    ).rejects.toMatchObject({
      code: 'NOT_FOUND',
      status: 404,
    });
  });

  it('paginates through >100 repositories using Link headers and enforces owner-only filtering', async () => {
    const page1 = Array.from({ length: 100 }, (_, i) =>
      makeMockRepo({
        id: i + 1,
        name: `repo-${i + 1}`,
        fork: i === 5, // forked repo owned by alice-builder must be preserved
        owner: {
          login: 'alice-builder',
          id: 1001,
          avatar_url: ALICE_USER.avatar_url,
          html_url: ALICE_USER.html_url,
          type: 'User',
        },
      })
    );

    const page2 = [
      makeMockRepo({
        id: 101,
        name: 'repo-101',
        owner: {
          login: 'alice-builder',
          id: 1001,
          avatar_url: ALICE_USER.avatar_url,
          html_url: ALICE_USER.html_url,
          type: 'User',
        },
      }),
      // Foreign-owned repo should be filtered out defensively
      makeMockRepo({
        id: 999,
        name: 'contributed-external-repo',
        owner: {
          login: 'other-organization',
          id: 9999,
          avatar_url: '',
          html_url: 'https://github.com/other-organization',
          type: 'Organization',
        },
      }),
      makeMockRepo({
        id: 102,
        name: 'hidden-secret-demo',
        owner: {
          login: 'alice-builder',
          id: 1001,
          avatar_url: ALICE_USER.avatar_url,
          html_url: ALICE_USER.html_url,
          type: 'User',
        },
      }),
    ];

    const fetchMock = vi.spyOn(globalThis, 'fetch');
    fetchMock
      .mockResolvedValueOnce(
        makeJsonResponse(page1, {
          headers: {
            Link: '<https://api.github.com/users/alice-builder/repos?type=owner&per_page=100&sort=updated&direction=desc&page=2>; rel="next"',
          },
        })
      )
      .mockResolvedValueOnce(makeJsonResponse(page2));

    const progressUpdates: Array<{ count: number; page: number }> = [];
    const { repositories } = await fetchAllOwnedRepositories('alice-builder', {
      excludedRepositories: ['hidden-secret-demo'],
      onPageProgress: (count, page) => progressUpdates.push({ count, page }),
      retry: noDelayRetry,
    });

    expect(fetchMock).toHaveBeenCalledTimes(2);
    expect(String(fetchMock.mock.calls[0]?.[0])).toContain('type=owner');
    expect(String(fetchMock.mock.calls[0]?.[0])).toContain('per_page=100');
    expect(String(fetchMock.mock.calls[0]?.[0])).toContain('sort=updated');
    expect(String(fetchMock.mock.calls[0]?.[0])).toContain('direction=desc');

    expect(repositories).toHaveLength(101);
    expect(repositories.some((r) => r.name === 'repo-6' && r.fork)).toBe(true);
    expect(repositories.some((r) => r.name === 'contributed-external-repo')).toBe(false);
    expect(repositories.some((r) => r.name === 'hidden-secret-demo')).toBe(false);
    expect(progressUpdates).toEqual([
      { count: 100, page: 1 },
      { count: 101, page: 2 },
    ]);
  });

  it('retrieves README via API and falls back to raw.githubusercontent.com on API failure', async () => {
    const fetchMock = vi.spyOn(globalThis, 'fetch');
    const markdown = '# Project Alpha\n\nFast CLI tool.';

    // 1. Successful API JSON base64 response
    fetchMock.mockResolvedValueOnce(
      makeJsonResponse({
        name: 'README.md',
        path: 'docs/README.md',
        encoding: 'base64',
        content: encodeUtf8ToBase64(markdown),
      })
    );

    const apiResult = await fetchRepositoryReadme('alice-builder', 'alpha', 'main', {
      retry: noDelayRetry,
    });
    expect(apiResult.found).toBe(true);
    expect(apiResult.origin).toBe('api');
    expect(apiResult.readmePath).toBe('docs/README.md');
    expect(apiResult.markdown).toBe(markdown);

    // 2. API rate-limited (403) -> seamlessly falls back to raw.githubusercontent.com
    fetchMock
      .mockResolvedValueOnce(
        makeJsonResponse(
          { message: 'API rate limit exceeded' },
          { status: 403, headers: { 'X-RateLimit-Remaining': '0' } }
        )
      )
      .mockResolvedValueOnce(new Response('# Fallback README', { status: 200 }));

    const fallbackResult = await fetchRepositoryReadme('alice-builder', 'beta', 'develop', {
      retry: noDelayRetry,
    });
    expect(fallbackResult.found).toBe(true);
    expect(fallbackResult.origin).toBe('raw-fallback');
    expect(fallbackResult.markdown).toBe('# Fallback README');
    expect(String(fetchMock.mock.calls[2]?.[0])).toBe(
      'https://raw.githubusercontent.com/alice-builder/beta/develop/README.md'
    );

    // 3. Missing README everywhere -> graceful found: false
    fetchMock.mockResolvedValue(new Response('Not Found', { status: 404 }));
    const missingResult = await fetchRepositoryReadme('alice-builder', 'no-readme', 'main', {
      retry: noDelayRetry,
    });
    expect(missingResult.found).toBe(false);
    expect(missingResult.markdown).toBeNull();
  });

  it('detects HTTP 403 and HTTP 429 rate limits and retries transient 5xx errors with backoff', async () => {
    const fetchMock = vi.spyOn(globalThis, 'fetch');
    const resetEpoch = Math.floor(Date.now() / 1000) + 1800;

    // Primary 403 rate limit
    fetchMock.mockResolvedValueOnce(
      makeJsonResponse(
        { message: 'API rate limit exceeded for 203.0.113.1.' },
        {
          status: 403,
          headers: {
            'X-RateLimit-Limit': '60',
            'X-RateLimit-Remaining': '0',
            'X-RateLimit-Reset': String(resetEpoch),
          },
        }
      )
    );

    try {
      await fetchUserProfile('alice-builder', { retry: noDelayRetry });
      expect.fail('Expected RATE_LIMITED error');
    } catch (error) {
      expect(error).toBeInstanceOf(GitHubApiError);
      const apiErr = error as GitHubApiError;
      expect(apiErr.code).toBe('RATE_LIMITED');
      expect(apiErr.status).toBe(403);
      expect(apiErr.rateLimit?.remaining).toBe(0);
      expect(apiErr.rateLimit?.resetAt).toBe(resetEpoch * 1000);
      expect(apiErr.rateLimit?.isLimited).toBe(true);
    }

    // Transient 503 recovered on retry via exponential backoff
    fetchMock
      .mockResolvedValueOnce(new Response('Service Unavailable', { status: 503 }))
      .mockResolvedValueOnce(makeJsonResponse(ALICE_USER));

    const sleepSpy = vi.fn(async () => undefined);
    const recovered = await fetchUserProfile('alice-builder', {
      retry: { maxRetries: 2, initialDelayMs: 50, sleep: sleepSpy },
    });
    expect(recovered.user.login).toBe('alice-builder');
    expect(sleepSpy).toHaveBeenCalledWith(50, undefined);

    // HTTP 429 secondary rate limit exhausted after retries
    fetchMock.mockResolvedValue(
      makeJsonResponse(
        { message: 'You have exceeded a secondary rate limit.' },
        { status: 429, headers: { 'Retry-After': '1' } }
      )
    );

    await expect(
      fetchUserProfile('marco-systems', { retry: noDelayRetry })
    ).rejects.toMatchObject({
      code: 'RATE_LIMITED',
      status: 429,
    });
  });
});

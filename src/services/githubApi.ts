import {
  GitHubApiError,
  type GitHubReadmeApiResponse,
  type GitHubRepository,
  type GitHubUser,
  type RateLimitInfo,
} from '../types/github';
import type { ReadmeFetchOrigin } from '../types/portfolio';
import { isValidGitHubUsername } from '../config/account';

const GITHUB_API_BASE = 'https://api.github.com';
const RAW_GITHUB_BASE = 'https://raw.githubusercontent.com';
const REPOS_PER_PAGE = 100;
const MAX_PAGINATION_PAGES = 50;
const DEFAULT_MAX_RETRIES = 2;
const DEFAULT_INITIAL_BACKOFF_MS = 400;

export interface FetchRepositoriesOptions {
  signal?: AbortSignal;
  excludedRepositories?: string[];
  onPageProgress?: (loadedCount: number, page: number) => void;
  onRateLimitUpdate?: (rateLimit: RateLimitInfo) => void;
}

export interface FetchReadmeResult {
  found: boolean;
  markdown: string | null;
  readmePath: string;
  origin: ReadmeFetchOrigin;
  rateLimit?: RateLimitInfo;
}

export interface FetchReadmeOptions {
  signal?: AbortSignal;
  preferRawFallback?: boolean;
  onRateLimitUpdate?: (rateLimit: RateLimitInfo) => void;
}

export interface RetryConfig {
  maxRetries?: number;
  initialDelayMs?: number;
  sleep?: (ms: number, signal?: AbortSignal) => Promise<void>;
}

const inFlightRequests = new Map<string, Promise<unknown>>();

function defaultSleep(ms: number, signal?: AbortSignal): Promise<void> {
  return new Promise((resolve, reject) => {
    if (signal?.aborted) {
      reject(new DOMException('Aborted', 'AbortError'));
      return;
    }
    const timer = setTimeout(() => {
      signal?.removeEventListener('abort', onAbort);
      resolve();
    }, ms);
    const onAbort = () => {
      clearTimeout(timer);
      reject(new DOMException('Aborted', 'AbortError'));
    };
    signal?.addEventListener('abort', onAbort, { once: true });
  });
}

export function extractRateLimitInfo(headers: Headers, status?: number): RateLimitInfo {
  const limitRaw = headers.get('x-ratelimit-limit');
  const remainingRaw = headers.get('x-ratelimit-remaining');
  const resetRaw = headers.get('x-ratelimit-reset');

  const limit = limitRaw !== null && /^\d+$/.test(limitRaw) ? Number(limitRaw) : null;
  const remaining =
    remainingRaw !== null && /^\d+$/.test(remainingRaw) ? Number(remainingRaw) : null;
  const resetAt = resetRaw !== null && /^\d+$/.test(resetRaw) ? Number(resetRaw) * 1000 : null;

  const isLimited = status === 429 || (status === 403 && remaining === 0);

  return {
    limit,
    remaining,
    resetAt,
    isLimited,
  };
}

/**
 * Parse RFC 5988 GitHub `Link` pagination header and extract `rel="next"` URL if present.
 */
export function parseNextLinkHeader(linkHeader: string | null): string | null {
  if (!linkHeader) {
    return null;
  }
  const parts = linkHeader.split(',');
  for (const part of parts) {
    const match = /<([^>]+)>\s*;\s*rel="([^"]+)"/.exec(part.trim());
    if (match && match[2] === 'next' && match[1]) {
      return match[1];
    }
  }
  return null;
}

/**
 * Decode UTF-8 base64 content returned by the GitHub Contents/README API safely.
 */
export function decodeBase64Utf8(base64Content: string): string {
  const cleaned = base64Content.replace(/\s+/g, '');
  const binary = atob(cleaned);
  const bytes = new Uint8Array(binary.length);
  for (let i = 0; i < binary.length; i += 1) {
    bytes[i] = binary.charCodeAt(i);
  }
  return new TextDecoder('utf-8').decode(bytes);
}

async function parseErrorMessage(response: Response): Promise<string> {
  try {
    const body = (await response.json()) as { message?: string };
    if (typeof body?.message === 'string' && body.message.trim()) {
      return body.message.trim();
    }
  } catch {
    // Non-JSON error body
  }
  return response.statusText || `HTTP ${response.status}`;
}

function parseRetryAfterMs(headers: Headers): number | undefined {
  const retryAfter = headers.get('retry-after');
  if (!retryAfter) {
    return undefined;
  }
  const seconds = Number(retryAfter);
  if (Number.isFinite(seconds) && seconds >= 0) {
    return seconds * 1000;
  }
  const targetTime = Date.parse(retryAfter);
  if (Number.isFinite(targetTime)) {
    return Math.max(0, targetTime - Date.now());
  }
  return undefined;
}

/**
 * Execute a GitHub API fetch with rate-limit detection and bounded exponential backoff.
 */
export async function fetchGitHubWithRetry(
  url: string,
  options: {
    headers?: Record<string, string>;
    signal?: AbortSignal;
    onRateLimitUpdate?: (info: RateLimitInfo) => void;
    retry?: RetryConfig;
  } = {}
): Promise<{ response: Response; rateLimit: RateLimitInfo }> {
  const maxRetries = options.retry?.maxRetries ?? DEFAULT_MAX_RETRIES;
  const initialDelayMs = options.retry?.initialDelayMs ?? DEFAULT_INITIAL_BACKOFF_MS;
  const sleep = options.retry?.sleep ?? defaultSleep;

  let attempt = 0;

  while (true) {
    let response: Response;
    try {
      response = await fetch(url, {
        method: 'GET',
        headers: {
          Accept: 'application/vnd.github+json',
          ...options.headers,
        },
        signal: options.signal,
      });
    } catch (error) {
      if (error instanceof DOMException && error.name === 'AbortError') {
        throw error;
      }
      if (attempt < maxRetries) {
        const delay = initialDelayMs * Math.pow(2, attempt);
        attempt += 1;
        await sleep(delay, options.signal);
        continue;
      }
      throw new GitHubApiError(
        'Unable to connect to GitHub. Check your internet connection and try again.',
        { code: 'NETWORK_ERROR', cause: error }
      );
    }

    const rateLimit = extractRateLimitInfo(response.headers, response.status);
    if (rateLimit.limit !== null || rateLimit.remaining !== null || rateLimit.isLimited) {
      options.onRateLimitUpdate?.(rateLimit);
    }

    // Detect primary or secondary rate limit (HTTP 403 or 429)
    if (response.status === 429 || response.status === 403) {
      const apiMessage = await parseErrorMessage(response.clone());
      const looksLikeRateLimit =
        response.status === 429 ||
        rateLimit.remaining === 0 ||
        /rate limit|abuse detection|secondary rate/i.test(apiMessage);

      if (looksLikeRateLimit) {
        const retryAfterMs = parseRetryAfterMs(response.headers);

        // Retry short secondary/429 delays briefly with exponential backoff
        if (
          response.status === 429 &&
          attempt < maxRetries &&
          (retryAfterMs === undefined || retryAfterMs <= 3000)
        ) {
          const delay = retryAfterMs ?? initialDelayMs * Math.pow(2, attempt);
          attempt += 1;
          await sleep(delay, options.signal);
          continue;
        }

        const limitedInfo: RateLimitInfo = { ...rateLimit, isLimited: true };
        options.onRateLimitUpdate?.(limitedInfo);

        throw new GitHubApiError(
          'GitHub public API rate limit reached for this network. Cached data will be used when available.',
          {
            code: 'RATE_LIMITED',
            status: response.status,
            rateLimit: limitedInfo,
            retryAfterMs,
          }
        );
      }
    }

    // Transient server errors (500, 502, 503, 504): retry with exponential backoff
    if (response.status >= 500 && response.status < 600) {
      if (attempt < maxRetries) {
        const delay = initialDelayMs * Math.pow(2, attempt);
        attempt += 1;
        await sleep(delay, options.signal);
        continue;
      }
      throw new GitHubApiError(
        `GitHub is temporarily unavailable (HTTP ${response.status}). Please try again shortly.`,
        { code: 'SERVER_ERROR', status: response.status, rateLimit }
      );
    }

    return { response, rateLimit };
  }
}

function deduplicateRequest<T>(key: string, factory: () => Promise<T>): Promise<T> {
  const existing = inFlightRequests.get(key) as Promise<T> | undefined;
  if (existing) {
    return existing;
  }
  const promise = factory().finally(() => {
    inFlightRequests.delete(key);
  });
  inFlightRequests.set(key, promise);
  return promise;
}

export async function fetchUserProfile(
  username: string,
  options: {
    signal?: AbortSignal;
    onRateLimitUpdate?: (info: RateLimitInfo) => void;
    retry?: RetryConfig;
  } = {}
): Promise<{ user: GitHubUser; rateLimit: RateLimitInfo }> {
  const trimmed = username.trim();
  if (!isValidGitHubUsername(trimmed)) {
    throw new GitHubApiError(`"${trimmed}" is not a valid GitHub username.`, {
      code: 'INVALID_USERNAME',
    });
  }

  const dedupKey = `user:${trimmed.toLowerCase()}`;
  return deduplicateRequest(dedupKey, async () => {
    const url = `${GITHUB_API_BASE}/users/${encodeURIComponent(trimmed)}`;
    const { response, rateLimit } = await fetchGitHubWithRetry(url, {
      signal: options.signal,
      onRateLimitUpdate: options.onRateLimitUpdate,
      retry: options.retry,
    });

    if (response.status === 404) {
      throw new GitHubApiError(
        `GitHub account "@${trimmed}" was not found. It may have been renamed, deleted, or mistyped.`,
        { code: 'NOT_FOUND', status: 404, rateLimit }
      );
    }

    if (!response.ok) {
      const msg = await parseErrorMessage(response);
      throw new GitHubApiError(`Failed to load GitHub profile: ${msg}`, {
        code: 'BAD_RESPONSE',
        status: response.status,
        rateLimit,
      });
    }

    const data = (await response.json()) as GitHubUser;
    if (!data || typeof data.login !== 'string') {
      throw new GitHubApiError('Received an unexpected GitHub profile response.', {
        code: 'BAD_RESPONSE',
        status: response.status,
        rateLimit,
      });
    }

    return { user: data, rateLimit };
  });
}

/**
 * Retrieve ALL public repositories owned by `username` using complete pagination.
 * Uses type=owner, per_page=100, sort=updated, direction=desc.
 * Includes forked repositories owned by the user by default, and excludes repos owned by other accounts.
 */
export async function fetchAllOwnedRepositories(
  username: string,
  options: FetchRepositoriesOptions & { retry?: RetryConfig } = {}
): Promise<{ repositories: GitHubRepository[]; rateLimit: RateLimitInfo }> {
  const trimmed = username.trim();
  if (!isValidGitHubUsername(trimmed)) {
    throw new GitHubApiError(`"${trimmed}" is not a valid GitHub username.`, {
      code: 'INVALID_USERNAME',
    });
  }

  const excludedSet = new Set(
    (options.excludedRepositories ?? []).map((name) => name.trim().toLowerCase()).filter(Boolean)
  );

  const dedupKey = `repos:${trimmed.toLowerCase()}:${Array.from(excludedSet).sort().join(',')}`;

  return deduplicateRequest(dedupKey, async () => {
    const seenIds = new Set<number>();
    const allRepos: GitHubRepository[] = [];
    let latestRateLimit: RateLimitInfo = {
      limit: null,
      remaining: null,
      resetAt: null,
      isLimited: false,
    };

    let page = 1;
    let nextUrl: string | null =
      `${GITHUB_API_BASE}/users/${encodeURIComponent(trimmed)}/repos?type=owner&per_page=${REPOS_PER_PAGE}&sort=updated&direction=desc&page=1`;

    while (nextUrl && page <= MAX_PAGINATION_PAGES) {
      const { response, rateLimit } = await fetchGitHubWithRetry(nextUrl, {
        signal: options.signal,
        onRateLimitUpdate: options.onRateLimitUpdate,
        retry: options.retry,
      });
      latestRateLimit = rateLimit;

      if (response.status === 404) {
        throw new GitHubApiError(
          `GitHub account "@${trimmed}" was not found when retrieving repositories.`,
          { code: 'NOT_FOUND', status: 404, rateLimit }
        );
      }

      if (!response.ok) {
        const msg = await parseErrorMessage(response);
        throw new GitHubApiError(`Failed to load repositories: ${msg}`, {
          code: 'BAD_RESPONSE',
          status: response.status,
          rateLimit,
        });
      }

      const batch = (await response.json()) as unknown;
      if (!Array.isArray(batch)) {
        throw new GitHubApiError('Received an invalid repositories list from GitHub.', {
          code: 'BAD_RESPONSE',
          status: response.status,
          rateLimit,
        });
      }

      const normalizedOwner = trimmed.toLowerCase();

      for (const item of batch as GitHubRepository[]) {
        if (!item || typeof item.id !== 'number' || typeof item.name !== 'string') {
          continue;
        }
        // Defensively guarantee only repositories owned by the target account are included
        if (item.owner?.login && item.owner.login.toLowerCase() !== normalizedOwner) {
          continue;
        }
        if (item.private) {
          continue;
        }
        if (excludedSet.has(item.name.toLowerCase())) {
          continue;
        }
        if (seenIds.has(item.id)) {
          continue;
        }
        seenIds.add(item.id);
        allRepos.push({
          ...item,
          topics: Array.isArray(item.topics) ? item.topics : [],
          default_branch: item.default_branch || 'main',
        });
      }

      options.onPageProgress?.(allRepos.length, page);

      const linkHeader = response.headers.get('link');
      const parsedNext = parseNextLinkHeader(linkHeader);

      if (parsedNext) {
        nextUrl = parsedNext;
        page += 1;
      } else if (!linkHeader && batch.length === REPOS_PER_PAGE) {
        // Fallback pagination if Link header is unavailable in a proxy/environment
        page += 1;
        nextUrl = `${GITHUB_API_BASE}/users/${encodeURIComponent(trimmed)}/repos?type=owner&per_page=${REPOS_PER_PAGE}&sort=updated&direction=desc&page=${page}`;
      } else {
        nextUrl = null;
      }
    }

    return { repositories: allRepos, rateLimit: latestRateLimit };
  });
}

async function fetchRawReadmeFallback(
  owner: string,
  repo: string,
  defaultBranch: string,
  signal?: AbortSignal
): Promise<{ markdown: string; readmePath: string } | null> {
  const candidates = ['README.md', 'readme.md', 'Readme.md', 'README.MD', 'README'];
  const branch = defaultBranch || 'main';

  for (const filename of candidates) {
    const rawUrl = `${RAW_GITHUB_BASE}/${encodeURIComponent(owner)}/${encodeURIComponent(repo)}/${encodeURIComponent(branch)}/${filename}`;
    try {
      const response = await fetch(rawUrl, { method: 'GET', signal });
      if (response.ok) {
        const text = await response.text();
        return { markdown: text, readmePath: filename };
      }
      if (response.status !== 404) {
        // Non-404 raw failure (e.g., network/server error): stop trying alternate casings
        return null;
      }
    } catch (error) {
      if (error instanceof DOMException && error.name === 'AbortError') {
        throw error;
      }
      return null;
    }
  }

  return null;
}

/**
 * Retrieve raw Markdown README for a repository.
 * Primary: GET https://api.github.com/repos/{owner}/{repo}/readme
 * Fallback: raw.githubusercontent.com/{owner}/{repo}/{defaultBranch}/README.md
 * Never throws for missing READMEs — returns { found: false } gracefully.
 */
export async function fetchRepositoryReadme(
  owner: string,
  repo: string,
  defaultBranch: string,
  options: FetchReadmeOptions & { retry?: RetryConfig } = {}
): Promise<FetchReadmeResult> {
  const dedupKey = `readme:${owner.toLowerCase()}/${repo.toLowerCase()}`;

  return deduplicateRequest(dedupKey, async () => {
    // When API rate limit is nearly depleted, try raw.githubusercontent.com first to conserve quota
    if (options.preferRawFallback) {
      const rawFirst = await fetchRawReadmeFallback(owner, repo, defaultBranch, options.signal);
      if (rawFirst) {
        return {
          found: true,
          markdown: rawFirst.markdown,
          readmePath: rawFirst.readmePath,
          origin: 'raw-fallback',
        };
      }
      return {
        found: false,
        markdown: null,
        readmePath: 'README.md',
        origin: 'none',
      };
    }

    const apiUrl = `${GITHUB_API_BASE}/repos/${encodeURIComponent(owner)}/${encodeURIComponent(repo)}/readme`;

    try {
      const { response, rateLimit } = await fetchGitHubWithRetry(apiUrl, {
        headers: {
          // Request standard JSON so we also get `path` (e.g. docs/README.md) for accurate relative URL resolution,
          // while transparently supporting raw text/markdown if returned.
          Accept: 'application/vnd.github+json',
        },
        signal: options.signal,
        onRateLimitUpdate: options.onRateLimitUpdate,
        retry: { maxRetries: 1, ...options.retry },
      });

      if (response.ok) {
        const contentType = response.headers.get('content-type') ?? '';
        if (contentType.includes('application/json')) {
          const payload = (await response.json()) as Partial<GitHubReadmeApiResponse>;
          const readmePath = typeof payload.path === 'string' && payload.path ? payload.path : 'README.md';

          if (typeof payload.content === 'string') {
            const markdown =
              payload.encoding === 'base64'
                ? decodeBase64Utf8(payload.content)
                : payload.content;
            return {
              found: true,
              markdown,
              readmePath,
              origin: 'api',
              rateLimit,
            };
          }

          // Fallback to download_url if content was omitted (e.g., >1MB README)
          if (typeof payload.download_url === 'string' && payload.download_url) {
            const rawRes = await fetch(payload.download_url, { signal: options.signal });
            if (rawRes.ok) {
              return {
                found: true,
                markdown: await rawRes.text(),
                readmePath,
                origin: 'raw-fallback',
                rateLimit,
              };
            }
          }
        } else {
          // Raw Markdown response (e.g., Accept: application/vnd.github.raw+json)
          const markdown = await response.text();
          return {
            found: true,
            markdown,
            readmePath: 'README.md',
            origin: 'api',
            rateLimit,
          };
        }
      }

      // If GitHub API returned 404 or another non-OK response, try raw.githubusercontent.com fallback
      const rawFallback = await fetchRawReadmeFallback(owner, repo, defaultBranch, options.signal);
      if (rawFallback) {
        return {
          found: true,
          markdown: rawFallback.markdown,
          readmePath: rawFallback.readmePath,
          origin: 'raw-fallback',
          rateLimit,
        };
      }

      return {
        found: false,
        markdown: null,
        readmePath: 'README.md',
        origin: 'none',
        rateLimit,
      };
    } catch (error) {
      if (error instanceof DOMException && error.name === 'AbortError') {
        throw error;
      }

      // On API rate limit or transient failure, fall back to raw.githubusercontent.com (which is not API rate-limited)
      const rateLimit = error instanceof GitHubApiError ? error.rateLimit : undefined;
      const rawFallback = await fetchRawReadmeFallback(owner, repo, defaultBranch, options.signal);
      if (rawFallback) {
        return {
          found: true,
          markdown: rawFallback.markdown,
          readmePath: rawFallback.readmePath,
          origin: 'raw-fallback',
          rateLimit,
        };
      }

      return {
        found: false,
        markdown: null,
        readmePath: 'README.md',
        origin: 'none',
        rateLimit,
      };
    }
  });
}

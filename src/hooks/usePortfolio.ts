import { useCallback, useEffect, useMemo, useRef, useState } from 'react';
import { siteConfig } from '../config/site';
import { defaultCache, type PortfolioCache } from '../services/cache';
import {
  fetchAllOwnedRepositories,
  fetchRepositoryReadme,
  fetchUserProfile,
} from '../services/githubApi';
import {
  analyzeReadme,
  buildEnrichedProject,
  createIdleReadmeRecord,
} from '../services/readmeAnalyzer';
import {
  GitHubApiError,
  type GitHubRepository,
  type GitHubUser,
  type RateLimitInfo,
} from '../types/github';
import type {
  EnrichedProject,
  PortfolioError,
  ReadmeRecord,
  SiteConfig,
} from '../types/portfolio';

export interface PortfolioLoadingProgress {
  phase: 'idle' | 'profile' | 'repositories' | 'ready';
  message: string;
  repositoriesLoaded: number;
  readmesAnalyzed: number;
  readmesTotal: number;
  readmesInProgress: number;
}

export interface UsePortfolioOptions {
  cache?: PortfolioCache;
  config?: SiteConfig;
}

export interface UsePortfolioResult {
  profile: GitHubUser | null;
  projects: EnrichedProject[];
  isInitialLoading: boolean;
  isRefreshing: boolean;
  isCachedData: boolean;
  isStaleFallback: boolean;
  lastUpdatedAt: number | null;
  rateLimit: RateLimitInfo | null;
  error: PortfolioError | null;
  warningMessage: string | null;
  progress: PortfolioLoadingProgress;
  refresh: () => Promise<void>;
  requestReadme: (repoName: string, options?: { priority?: boolean; force?: boolean }) => void;
  ensureAllReadmesQueued: () => void;
}

interface CachedReadmePayload {
  status: 'loaded' | 'missing';
  rawMarkdown: string | null;
  readmePath: string;
  origin: ReadmeRecord['origin'];
}

function toPortfolioError(err: unknown): PortfolioError {
  if (err instanceof GitHubApiError) {
    switch (err.code) {
      case 'RATE_LIMITED':
        return {
          code: 'RATE_LIMITED',
          title: 'GitHub API Rate Limit Reached',
          message: err.message,
          rateLimit: err.rateLimit,
        };
      case 'NOT_FOUND':
        return {
          code: 'NOT_FOUND',
          title: 'GitHub Account Not Found',
          message: err.message,
          rateLimit: err.rateLimit,
        };
      case 'INVALID_USERNAME':
        return {
          code: 'INVALID_USERNAME',
          title: 'Invalid GitHub Username',
          message: err.message,
        };
      case 'NETWORK_ERROR':
        return {
          code: 'NETWORK_ERROR',
          title: 'Network Connection Error',
          message: err.message,
        };
      case 'SERVER_ERROR':
        return {
          code: 'SERVER_ERROR',
          title: 'GitHub Temporarily Unavailable',
          message: err.message,
          rateLimit: err.rateLimit,
        };
      default:
        return {
          code: 'BAD_RESPONSE',
          title: 'Unable to Load GitHub Data',
          message: err.message,
          rateLimit: err.rateLimit,
        };
    }
  }

  return {
    code: 'BAD_RESPONSE',
    title: 'Unexpected Error',
    message: err instanceof Error ? err.message : 'An unexpected error occurred while loading data.',
  };
}

export function usePortfolio(
  username: string | null,
  options: UsePortfolioOptions = {}
): UsePortfolioResult {
  const cache = options.cache ?? defaultCache;
  const config = options.config ?? siteConfig;
  const cacheTtlMs = Math.max(1, config.cacheTtlMinutes ?? 60) * 60 * 1000;
  const concurrency = Math.max(1, Math.min(4, config.readmeConcurrency ?? 2));
  const excludedRepos = config.excludedRepositories ?? [];

  const [profile, setProfile] = useState<GitHubUser | null>(null);
  const [repositories, setRepositories] = useState<GitHubRepository[]>([]);
  const [readmeMap, setReadmeMap] = useState<Record<string, ReadmeRecord>>({});
  const [isInitialLoading, setIsInitialLoading] = useState<boolean>(Boolean(username));
  const [isRefreshing, setIsRefreshing] = useState<boolean>(false);
  const [isCachedData, setIsCachedData] = useState<boolean>(false);
  const [isStaleFallback, setIsStaleFallback] = useState<boolean>(false);
  const [lastUpdatedAt, setLastUpdatedAt] = useState<number | null>(null);
  const [rateLimit, setRateLimit] = useState<RateLimitInfo | null>(null);
  const [error, setError] = useState<PortfolioError | null>(null);
  const [warningMessage, setWarningMessage] = useState<string | null>(null);
  const [loadPhase, setLoadPhase] = useState<'idle' | 'profile' | 'repositories' | 'ready'>('idle');
  const [loadMessage, setLoadMessage] = useState<string>('');
  const [reposLoadedProgress, setReposLoadedProgress] = useState<number>(0);

  // Refs for controlled README queue & abort lifecycle
  const abortControllerRef = useRef<AbortController | null>(null);
  const reposRef = useRef<GitHubRepository[]>([]);
  const readmeMapRef = useRef<Record<string, ReadmeRecord>>({});
  const rateLimitRef = useRef<RateLimitInfo | null>(null);
  const queueRef = useRef<Array<{ repoName: string; force: boolean }>>([]);
  const activeWorkersRef = useRef<number>(0);
  const queuedSetRef = useRef<Set<string>>(new Set());
  const activeUsernameRef = useRef<string | null>(username);

  useEffect(() => {
    reposRef.current = repositories;
  }, [repositories]);

  useEffect(() => {
    readmeMapRef.current = readmeMap;
  }, [readmeMap]);

  const handleRateLimitUpdate = useCallback((info: RateLimitInfo) => {
    rateLimitRef.current = info;
    setRateLimit(info);
  }, []);

  const hydrateCachedReadmes = useCallback(
    (targetUser: string, repos: GitHubRepository[], allowExpired: boolean) => {
      const hydrated: Record<string, ReadmeRecord> = {};
      for (const repo of repos) {
        const cached = cache.get<CachedReadmePayload>(targetUser, `readme:${repo.name}`, {
          allowExpired,
        });
        if (!cached) {
          continue;
        }
        const payload = cached.data;
        if (payload.status === 'loaded' && payload.rawMarkdown !== null) {
          hydrated[repo.name] = {
            status: 'loaded',
            rawMarkdown: payload.rawMarkdown,
            readmePath: payload.readmePath || 'README.md',
            origin: payload.origin,
            extracted: analyzeReadme(payload.rawMarkdown, {
              owner: repo.owner.login,
              repo: repo.name,
              defaultBranch: repo.default_branch,
              readmePath: payload.readmePath || 'README.md',
            }),
            fetchedAt: cached.fetchedAt,
            errorMessage: null,
          };
        } else {
          hydrated[repo.name] = {
            status: 'missing',
            rawMarkdown: null,
            readmePath: 'README.md',
            origin: 'none',
            extracted: null,
            fetchedAt: cached.fetchedAt,
            errorMessage: null,
          };
        }
      }
      readmeMapRef.current = hydrated;
      setReadmeMap(hydrated);
    },
    [cache]
  );

  const pumpReadmeQueue = useCallback(() => {
    const targetUser = activeUsernameRef.current;
    if (!targetUser) {
      return;
    }

    while (activeWorkersRef.current < concurrency && queueRef.current.length > 0) {
      const next = queueRef.current.shift();
      if (!next) {
        break;
      }

      const repo = reposRef.current.find((r) => r.name === next.repoName);
      if (!repo) {
        queuedSetRef.current.delete(next.repoName);
        continue;
      }

      const currentStatus = readmeMapRef.current[repo.name]?.status;
      if (!next.force && (currentStatus === 'loaded' || currentStatus === 'missing')) {
        queuedSetRef.current.delete(repo.name);
        continue;
      }

      activeWorkersRef.current += 1;

      setReadmeMap((prev) => {
        const updated: Record<string, ReadmeRecord> = {
          ...prev,
          [repo.name]: {
            ...(prev[repo.name] ?? createIdleReadmeRecord()),
            status: 'loading',
            errorMessage: null,
          },
        };
        readmeMapRef.current = updated;
        return updated;
      });

      const signal = abortControllerRef.current?.signal;
      // Preserve remaining REST API quota when remaining <= 12 by falling back to raw.githubusercontent.com
      const rl = rateLimitRef.current;
      const preferRawFallback = Boolean(
        rl && (rl.isLimited || (rl.remaining !== null && rl.remaining <= 12))
      );

      void (async () => {
        try {
          // Check fresh cache unless forced
          if (!next.force) {
            const cached = cache.get<CachedReadmePayload>(targetUser, `readme:${repo.name}`);
            if (cached) {
              const payload = cached.data;
              const record: ReadmeRecord =
                payload.status === 'loaded' && payload.rawMarkdown !== null
                  ? {
                      status: 'loaded',
                      rawMarkdown: payload.rawMarkdown,
                      readmePath: payload.readmePath || 'README.md',
                      origin: payload.origin,
                      extracted: analyzeReadme(payload.rawMarkdown, {
                        owner: repo.owner.login,
                        repo: repo.name,
                        defaultBranch: repo.default_branch,
                        readmePath: payload.readmePath || 'README.md',
                      }),
                      fetchedAt: cached.fetchedAt,
                      errorMessage: null,
                    }
                  : {
                      status: 'missing',
                      rawMarkdown: null,
                      readmePath: 'README.md',
                      origin: 'none',
                      extracted: null,
                      fetchedAt: cached.fetchedAt,
                      errorMessage: null,
                    };

              if (activeUsernameRef.current === targetUser) {
                setReadmeMap((prev) => {
                  const updated = { ...prev, [repo.name]: record };
                  readmeMapRef.current = updated;
                  return updated;
                });
              }
              return;
            }
          }

          const result = await fetchRepositoryReadme(
            repo.owner.login,
            repo.name,
            repo.default_branch,
            {
              signal,
              preferRawFallback,
              onRateLimitUpdate: handleRateLimitUpdate,
            }
          );

          if (signal?.aborted || activeUsernameRef.current !== targetUser) {
            return;
          }

          const now = Date.now();
          let record: ReadmeRecord;

          if (result.found && result.markdown !== null) {
            const extracted = analyzeReadme(result.markdown, {
              owner: repo.owner.login,
              repo: repo.name,
              defaultBranch: repo.default_branch,
              readmePath: result.readmePath,
            });
            record = {
              status: 'loaded',
              rawMarkdown: result.markdown,
              readmePath: result.readmePath,
              origin: result.origin,
              extracted,
              fetchedAt: now,
              errorMessage: null,
            };
            cache.set<CachedReadmePayload>(
              targetUser,
              `readme:${repo.name}`,
              {
                status: 'loaded',
                rawMarkdown: result.markdown,
                readmePath: result.readmePath,
                origin: result.origin,
              },
              cacheTtlMs,
              now
            );
          } else {
            record = {
              status: 'missing',
              rawMarkdown: null,
              readmePath: 'README.md',
              origin: 'none',
              extracted: null,
              fetchedAt: now,
              errorMessage: null,
            };
            cache.set<CachedReadmePayload>(
              targetUser,
              `readme:${repo.name}`,
              {
                status: 'missing',
                rawMarkdown: null,
                readmePath: 'README.md',
                origin: 'none',
              },
              cacheTtlMs,
              now
            );
          }

          setReadmeMap((prev) => {
            const updated = { ...prev, [repo.name]: record };
            readmeMapRef.current = updated;
            return updated;
          });
        } catch (err) {
          if (err instanceof DOMException && err.name === 'AbortError') {
            return;
          }
          if (activeUsernameRef.current === targetUser) {
            setReadmeMap((prev) => {
              const updated: Record<string, ReadmeRecord> = {
                ...prev,
                [repo.name]: {
                  ...(prev[repo.name] ?? createIdleReadmeRecord()),
                  status: 'error',
                  errorMessage:
                    err instanceof Error ? err.message : 'Unable to retrieve README.',
                },
              };
              readmeMapRef.current = updated;
              return updated;
            });
          }
        } finally {
          activeWorkersRef.current = Math.max(0, activeWorkersRef.current - 1);
          queuedSetRef.current.delete(repo.name);
          pumpReadmeQueue();
        }
      })();
    }
  }, [cache, cacheTtlMs, concurrency, handleRateLimitUpdate]);

  const requestReadme = useCallback(
    (repoName: string, opts: { priority?: boolean; force?: boolean } = {}) => {
      const current = readmeMapRef.current[repoName];
      if (!opts.force && current && (current.status === 'loaded' || current.status === 'missing' || current.status === 'loading')) {
        return;
      }

      if (queuedSetRef.current.has(repoName)) {
        if (opts.priority) {
          // Promote already-queued item to front
          const idx = queueRef.current.findIndex((item) => item.repoName === repoName);
          if (idx > 0) {
            const [item] = queueRef.current.splice(idx, 1);
            if (item) {
              queueRef.current.unshift({ repoName: item.repoName, force: Boolean(opts.force || item.force) });
            }
          }
        }
        return;
      }

      queuedSetRef.current.add(repoName);
      if (opts.priority) {
        queueRef.current.unshift({ repoName, force: Boolean(opts.force) });
      } else {
        queueRef.current.push({ repoName, force: Boolean(opts.force) });
      }
      pumpReadmeQueue();
    },
    [pumpReadmeQueue]
  );

  const ensureAllReadmesQueued = useCallback(() => {
    for (const repo of reposRef.current) {
      requestReadme(repo.name, { priority: false });
    }
  }, [requestReadme]);

  const loadPortfolio = useCallback(
    async (targetUser: string, forceRefresh: boolean) => {
      abortControllerRef.current?.abort();
      const controller = new AbortController();
      abortControllerRef.current = controller;
      activeUsernameRef.current = targetUser;
      queueRef.current = [];
      queuedSetRef.current.clear();

      setError(null);
      setWarningMessage(null);

      // 1. Cache-first check (when not forcing manual refresh)
      if (!forceRefresh) {
        const cachedProfile = cache.get<GitHubUser>(targetUser, 'profile');
        const cachedRepos = cache.get<GitHubRepository[]>(targetUser, 'repos');

        if (cachedProfile && cachedRepos) {
          setProfile(cachedProfile.data);
          setRepositories(cachedRepos.data);
          reposRef.current = cachedRepos.data;
          setIsCachedData(true);
          setIsStaleFallback(false);
          setLastUpdatedAt(Math.min(cachedProfile.fetchedAt, cachedRepos.fetchedAt));
          setIsInitialLoading(false);
          setIsRefreshing(false);
          setLoadPhase('ready');
          setLoadMessage('');
          hydrateCachedReadmes(targetUser, cachedRepos.data, false);
          return;
        }
      }

      if (forceRefresh) {
        setIsRefreshing(true);
      } else {
        setIsInitialLoading(true);
      }
      setLoadPhase('profile');
      setLoadMessage(`Loading GitHub profile for @${targetUser}…`);
      setReposLoadedProgress(0);

      try {
        const { user } = await fetchUserProfile(targetUser, {
          signal: controller.signal,
          onRateLimitUpdate: handleRateLimitUpdate,
        });

        if (controller.signal.aborted) {
          return;
        }

        setProfile(user);
        setLoadPhase('repositories');
        setLoadMessage(`Discovering public repositories for @${targetUser}…`);

        const { repositories: fetchedRepos } = await fetchAllOwnedRepositories(targetUser, {
          signal: controller.signal,
          excludedRepositories: excludedRepos,
          onRateLimitUpdate: handleRateLimitUpdate,
          onPageProgress: (count, page) => {
            setReposLoadedProgress(count);
            setLoadMessage(
              page > 1
                ? `Loaded ${count} public repositories (page ${page})…`
                : `Loaded ${count} public repositories…`
            );
          },
        });

        if (controller.signal.aborted) {
          return;
        }

        const now = Date.now();
        cache.set(targetUser, 'profile', user, cacheTtlMs, now);
        cache.set(targetUser, 'repos', fetchedRepos, cacheTtlMs, now);

        setRepositories(fetchedRepos);
        reposRef.current = fetchedRepos;
        setIsCachedData(false);
        setIsStaleFallback(false);
        setLastUpdatedAt(now);
        setLoadPhase('ready');
        setLoadMessage('');
        setIsInitialLoading(false);
        setIsRefreshing(false);

        if (forceRefresh) {
          // On manual refresh, clear stale readme map and re-hydrate fresh cache or let lazy queue reload
          readmeMapRef.current = {};
          setReadmeMap({});
          // Enqueue initial visible batch progressively
          for (const repo of fetchedRepos.slice(0, 6)) {
            requestReadme(repo.name, { priority: false, force: true });
          }
        } else {
          hydrateCachedReadmes(targetUser, fetchedRepos, false);
        }
      } catch (err) {
        if (err instanceof DOMException && err.name === 'AbortError') {
          return;
        }

        const portfolioErr = toPortfolioError(err);

        // Graceful cache fallback when stale cache exists (especially crucial during API rate limits)
        const staleProfile = cache.get<GitHubUser>(targetUser, 'profile', { allowExpired: true });
        const staleRepos = cache.get<GitHubRepository[]>(targetUser, 'repos', {
          allowExpired: true,
        });

        if (staleProfile && staleRepos) {
          setProfile(staleProfile.data);
          setRepositories(staleRepos.data);
          reposRef.current = staleRepos.data;
          setIsCachedData(true);
          setIsStaleFallback(true);
          setLastUpdatedAt(Math.min(staleProfile.fetchedAt, staleRepos.fetchedAt));
          hydrateCachedReadmes(targetUser, staleRepos.data, true);
          setWarningMessage(
            portfolioErr.code === 'RATE_LIMITED'
              ? 'GitHub API rate limit reached. Displaying cached portfolio data until the limit resets.'
              : `${portfolioErr.message} Showing previously cached portfolio data.`
          );
          setError(null);
        } else {
          setError(portfolioErr);
        }

        setLoadPhase('ready');
        setLoadMessage('');
        setIsInitialLoading(false);
        setIsRefreshing(false);
      }
    },
    [cache, cacheTtlMs, excludedRepos, handleRateLimitUpdate, hydrateCachedReadmes, requestReadme]
  );

  useEffect(() => {
    activeUsernameRef.current = username;
    if (!username) {
      abortControllerRef.current?.abort();
      setProfile(null);
      setRepositories([]);
      setReadmeMap({});
      setError(null);
      setWarningMessage(null);
      setIsInitialLoading(false);
      setIsRefreshing(false);
      setLoadPhase('idle');
      return;
    }

    void loadPortfolio(username, false);

    return () => {
      abortControllerRef.current?.abort();
    };
    // eslint-disable-next-line react-hooks/exhaustive-deps
  }, [username]);

  // Progressive initial enrichment for the first viewport batch once repositories are ready
  useEffect(() => {
    if (loadPhase !== 'ready' || repositories.length === 0) {
      return;
    }
    const initialBatch = repositories.slice(0, 6);
    for (const repo of initialBatch) {
      requestReadme(repo.name, { priority: false });
    }
  }, [loadPhase, repositories, requestReadme]);

  const refresh = useCallback(async () => {
    if (!username) {
      return;
    }
    await loadPortfolio(username, true);
  }, [username, loadPortfolio]);

  const projects = useMemo<EnrichedProject[]>(() => {
    return repositories.map((repo) =>
      buildEnrichedProject(repo, readmeMap[repo.name] ?? createIdleReadmeRecord())
    );
  }, [repositories, readmeMap]);

  const progress = useMemo<PortfolioLoadingProgress>(() => {
    let analyzed = 0;
    let inProgress = 0;
    for (const repo of repositories) {
      const status = readmeMap[repo.name]?.status;
      if (status === 'loaded' || status === 'missing' || status === 'error') {
        analyzed += 1;
      } else if (status === 'loading') {
        inProgress += 1;
      }
    }

    return {
      phase: loadPhase,
      message: loadMessage,
      repositoriesLoaded: reposLoadedProgress || repositories.length,
      readmesAnalyzed: analyzed,
      readmesTotal: repositories.length,
      readmesInProgress: inProgress,
    };
  }, [loadPhase, loadMessage, reposLoadedProgress, repositories, readmeMap]);

  return {
    profile,
    projects,
    isInitialLoading,
    isRefreshing,
    isCachedData,
    isStaleFallback,
    lastUpdatedAt,
    rateLimit,
    error,
    warningMessage,
    progress,
    refresh,
    requestReadme,
    ensureAllReadmesQueued,
  };
}

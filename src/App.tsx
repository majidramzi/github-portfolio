import { useCallback, useEffect, useMemo, useState } from 'react';
import { ConfigErrorState } from './components/ConfigErrorState';
import { ErrorState } from './components/ErrorState';
import { FilterBar } from './components/FilterBar';
import { Footer } from './components/Footer';
import { Header } from './components/Header';
import { Hero } from './components/Hero';
import { LoadingSkeleton } from './components/LoadingSkeleton';
import { ProjectDetailModal } from './components/ProjectDetailModal';
import { ProjectGrid } from './components/ProjectGrid';
import { RateLimitBanner } from './components/RateLimitBanner';
import { StatsSection } from './components/StatsSection';
import { resolveGitHubAccount, type ResolveAccountOptions } from './config/account';
import { siteConfig } from './config/site';
import { usePortfolio } from './hooks/usePortfolio';
import { useTheme } from './hooks/useTheme';
import type { PortfolioCache } from './services/cache';
import type { FilterState, SiteConfig } from './types/portfolio';
import {
  calculatePortfolioStats,
  DEFAULT_FILTER_STATE,
  extractAvailableLanguages,
  extractAvailableTopics,
  filterAndSortProjects,
  isFilterActive,
} from './utils/filters';
import { updateDocumentSeo } from './utils/seo';

export interface AppProps {
  /** Optional override primarily for automated testing of multiple hostnames/configurations */
  accountOptions?: ResolveAccountOptions;
  /** Optional custom cache instance for isolated tests */
  cache?: PortfolioCache;
  /** Optional site configuration override */
  config?: SiteConfig;
}

function readProjectSlugFromHash(): string | null {
  if (typeof window === 'undefined') {
    return null;
  }
  const match = /^#project=(.+)$/.exec(window.location.hash);
  if (!match || !match[1]) {
    return null;
  }
  try {
    return decodeURIComponent(match[1]);
  } catch {
    return match[1];
  }
}

export function App({ accountOptions, cache, config = siteConfig }: AppProps) {
  const { theme, toggleTheme } = useTheme(config.defaultTheme ?? 'system');
  const [previewUsername, setPreviewUsername] = useState<string>('');
  const [filters, setFilters] = useState<FilterState>(DEFAULT_FILTER_STATE);
  const [selectedRepoName, setSelectedRepoName] = useState<string | null>(() =>
    readProjectSlugFromHash()
  );

  const accountResolution = useMemo(
    () =>
      resolveGitHubAccount({
        config,
        previewUsername: previewUsername || undefined,
        ...accountOptions,
      }),
    [accountOptions, config, previewUsername]
  );

  const activeUsername =
    accountResolution.status === 'resolved' ? accountResolution.username : null;
  const isPreviewMode =
    accountResolution.status === 'resolved' && accountResolution.source === 'preview';

  const {
    profile,
    projects,
    isInitialLoading,
    isRefreshing,
    isCachedData,
    lastUpdatedAt,
    rateLimit,
    error,
    warningMessage,
    progress,
    refresh,
    requestReadme,
    ensureAllReadmesQueued,
  } = usePortfolio(activeUsername, { cache, config });

  // Reset filters and selected project when switching accounts
  useEffect(() => {
    setFilters(DEFAULT_FILTER_STATE);
    setSelectedRepoName(readProjectSlugFromHash());
  }, [activeUsername]);

  // Sync URL hash (#project=repo-name) for GitHub Pages-compatible deep links
  useEffect(() => {
    const onHashChange = () => {
      setSelectedRepoName(readProjectSlugFromHash());
    };
    window.addEventListener('hashchange', onHashChange);
    return () => window.removeEventListener('hashchange', onHashChange);
  }, []);

  // Update dynamic document title, meta description, and Open Graph metadata
  useEffect(() => {
    updateDocumentSeo({
      username: activeUsername ?? undefined,
      profile,
      customTitle: config.siteTitle,
      repoCount: projects.length,
    });
  }, [activeUsername, profile, config.siteTitle, projects.length]);

  const handleOpenProject = useCallback(
    (repoName: string) => {
      setSelectedRepoName(repoName);
      requestReadme(repoName, { priority: true });

      try {
        const nextHash = `#project=${encodeURIComponent(repoName)}`;
        if (window.location.hash !== nextHash) {
          window.history.pushState(null, '', nextHash);
        }
      } catch {
        // Ignore history restrictions in sandboxed environments
      }
    },
    [requestReadme]
  );

  const handleCloseProject = useCallback(() => {
    setSelectedRepoName(null);
    try {
      if (window.location.hash.startsWith('#project=')) {
        window.history.replaceState(
          null,
          '',
          `${window.location.pathname}${window.location.search}`
        );
      }
    } catch {
      // Ignore
    }
  }, []);

  const handleRefreshRepoReadme = useCallback(
    (repoName: string) => {
      requestReadme(repoName, { priority: true, force: true });
    },
    [requestReadme]
  );

  const handleCardVisible = useCallback(
    (repoName: string) => {
      requestReadme(repoName, { priority: false });
    },
    [requestReadme]
  );

  const selectedProject = useMemo(() => {
    if (!selectedRepoName) return null;
    const lower = selectedRepoName.toLowerCase();
    return projects.find((p) => p.repo.name.toLowerCase() === lower) ?? null;
  }, [projects, selectedRepoName]);

  // Prioritize README load if a project was opened directly via URL hash
  useEffect(() => {
    if (selectedProject && selectedProject.readme.status === 'idle') {
      requestReadme(selectedProject.repo.name, { priority: true });
    }
  }, [selectedProject, requestReadme]);

  const stats = useMemo(() => calculatePortfolioStats(projects), [projects]);
  const languages = useMemo(() => extractAvailableLanguages(projects), [projects]);
  const topics = useMemo(() => extractAvailableTopics(projects), [projects]);
  const filteredProjects = useMemo(
    () => filterAndSortProjects(projects, filters),
    [projects, filters]
  );
  const filtersActive = isFilterActive(filters);

  return (
    <div className="flex min-h-screen flex-col bg-slate-50 text-slate-900 transition-colors dark:bg-slate-950 dark:text-slate-100">
      <Header
        username={activeUsername}
        profile={profile}
        repoCount={projects.length}
        theme={theme}
        onToggleTheme={toggleTheme}
        onRefresh={activeUsername ? () => void refresh() : undefined}
        isRefreshing={isRefreshing}
        isPreviewMode={isPreviewMode}
        onExitPreview={() => setPreviewUsername('')}
      />

      <main id="main-content" className="flex-1">
        {accountResolution.status === 'error' ? (
          <ConfigErrorState
            resolution={accountResolution}
            onPreviewUsername={(nextUser) => setPreviewUsername(nextUser)}
          />
        ) : isInitialLoading ? (
          <LoadingSkeleton statusMessage={progress.message} />
        ) : error ? (
          <ErrorState
            error={error}
            username={accountResolution.username}
            onRetry={() => void refresh()}
            isPreviewMode={isPreviewMode}
            onExitPreview={() => setPreviewUsername('')}
          />
        ) : profile ? (
          <>
            {warningMessage && (
              <RateLimitBanner
                message={warningMessage}
                rateLimit={rateLimit}
                lastUpdatedAt={lastUpdatedAt}
                onRetry={() => void refresh()}
                isRefreshing={isRefreshing}
              />
            )}

            <Hero
              profile={profile}
              repoCount={projects.length}
              introText={config.introText}
              isCachedData={isCachedData}
              lastUpdatedAt={lastUpdatedAt}
              rateLimit={rateLimit}
              isRefreshing={isRefreshing}
              onRefresh={() => void refresh()}
            />

            <StatsSection
              stats={stats}
              activeLanguage={filters.language}
              onSelectLanguage={(lang) => setFilters((prev) => ({ ...prev, language: lang }))}
            />

            <section
              id="projects"
              aria-labelledby="projects-heading"
              className="mx-auto max-w-6xl px-4 pt-2 pb-16 sm:px-6 lg:px-8"
            >
              <div className="mb-5 flex flex-wrap items-baseline justify-between gap-3">
                <div>
                  <h2
                    id="projects-heading"
                    className="text-xl font-bold tracking-tight text-slate-950 sm:text-2xl dark:text-white"
                  >
                    Repositories &amp; Projects
                  </h2>
                  <p className="mt-1 text-sm text-slate-500 dark:text-slate-400">
                    Select any project to view extracted README insights, technologies, screenshots,
                    and documentation.
                  </p>
                </div>
              </div>

              <div className="space-y-6">
                {projects.length > 0 && (
                  <FilterBar
                    filters={filters}
                    languages={languages}
                    topics={topics}
                    totalCount={projects.length}
                    filteredCount={filteredProjects.length}
                    progress={progress}
                    onChange={setFilters}
                    onReset={() => setFilters(DEFAULT_FILTER_STATE)}
                    onTriggerReadmeScan={ensureAllReadmesQueued}
                  />
                )}

                <ProjectGrid
                  projects={filteredProjects}
                  totalCount={projects.length}
                  hasActiveFilters={filtersActive}
                  username={accountResolution.username}
                  onSelectProject={handleOpenProject}
                  onProjectVisible={handleCardVisible}
                  onTopicClick={(topic) => setFilters((prev) => ({ ...prev, topic }))}
                  onResetFilters={() => setFilters(DEFAULT_FILTER_STATE)}
                />
              </div>
            </section>
          </>
        ) : null}
      </main>

      <Footer
        username={activeUsername}
        accountSource={
          accountResolution.status === 'resolved' ? accountResolution.source : undefined
        }
      />

      <ProjectDetailModal
        project={selectedProject}
        onClose={handleCloseProject}
        onRefreshReadme={handleRefreshRepoReadme}
      />
    </div>
  );
}

export default App;

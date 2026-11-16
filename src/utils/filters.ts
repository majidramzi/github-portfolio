import type {
  EnrichedProject,
  FilterState,
  LanguageStat,
  PortfolioStats,
} from '../types/portfolio';

export const DEFAULT_FILTER_STATE: FilterState = {
  search: '',
  language: 'all',
  topic: 'all',
  onlyLiveDemo: false,
  onlyWithReadme: false,
  hideForks: false,
  sortBy: 'updated',
};

export function isFilterActive(filters: FilterState): boolean {
  return (
    filters.search.trim().length > 0 ||
    filters.language !== 'all' ||
    filters.topic !== 'all' ||
    filters.onlyLiveDemo ||
    filters.onlyWithReadme ||
    filters.hideForks ||
    filters.sortBy !== DEFAULT_FILTER_STATE.sortBy
  );
}

/**
 * Compute aggregate portfolio metrics strictly from retrieved repository & README data.
 */
export function calculatePortfolioStats(projects: EnrichedProject[]): PortfolioStats {
  let totalStars = 0;
  let totalForks = 0;
  let liveDemoCount = 0;
  const languageCounts = new Map<string, number>();

  for (const project of projects) {
    const { repo, liveDemo } = project;
    totalStars += repo.stargazers_count || 0;
    totalForks += repo.forks_count || 0;

    if (liveDemo.value) {
      liveDemoCount += 1;
    }

    if (repo.language) {
      languageCounts.set(repo.language, (languageCounts.get(repo.language) ?? 0) + 1);
    }
  }

  const totalWithLanguage = Array.from(languageCounts.values()).reduce((sum, n) => sum + n, 0);
  const languages: LanguageStat[] = Array.from(languageCounts.entries())
    .sort((a, b) => b[1] - a[1] || a[0].localeCompare(b[0]))
    .map(([language, count]) => ({
      language,
      count,
      percentage: totalWithLanguage > 0 ? Math.round((count / totalWithLanguage) * 1000) / 10 : 0,
    }));

  return {
    totalRepositories: projects.length,
    totalStars,
    totalForks,
    languageCount: languageCounts.size,
    liveDemoCount,
    languages,
  };
}

export function extractAvailableLanguages(
  projects: EnrichedProject[]
): Array<{ name: string; count: number }> {
  const counts = new Map<string, number>();
  for (const p of projects) {
    if (p.repo.language) {
      counts.set(p.repo.language, (counts.get(p.repo.language) ?? 0) + 1);
    }
  }
  return Array.from(counts.entries())
    .sort((a, b) => b[1] - a[1] || a[0].localeCompare(b[0]))
    .map(([name, count]) => ({ name, count }));
}

export function extractAvailableTopics(
  projects: EnrichedProject[]
): Array<{ name: string; count: number }> {
  const counts = new Map<string, number>();
  for (const p of projects) {
    for (const topic of p.repo.topics) {
      const normalized = topic.trim().toLowerCase();
      if (normalized) {
        counts.set(normalized, (counts.get(normalized) ?? 0) + 1);
      }
    }
  }
  return Array.from(counts.entries())
    .sort((a, b) => b[1] - a[1] || a[0].localeCompare(b[0]))
    .map(([name, count]) => ({ name, count }));
}

/**
 * Filter and sort projects locally across repository metadata and README content.
 */
export function filterAndSortProjects(
  projects: EnrichedProject[],
  filters: FilterState
): EnrichedProject[] {
  const query = filters.search.trim().toLowerCase();
  const queryTokens = query ? query.split(/\s+/).filter(Boolean) : [];

  const filtered = projects.filter((project) => {
    const { repo, readme, liveDemo, technologies } = project;

    if (filters.hideForks && repo.fork) {
      return false;
    }

    if (filters.language !== 'all') {
      if ((repo.language ?? '').toLowerCase() !== filters.language.toLowerCase()) {
        return false;
      }
    }

    if (filters.topic !== 'all') {
      const targetTopic = filters.topic.toLowerCase();
      const hasTopic = repo.topics.some((t) => t.toLowerCase() === targetTopic);
      if (!hasTopic) {
        return false;
      }
    }

    if (filters.onlyLiveDemo && !liveDemo.value) {
      return false;
    }

    if (filters.onlyWithReadme && readme.status !== 'loaded') {
      return false;
    }

    if (queryTokens.length > 0) {
      const haystack = [
        repo.name,
        repo.full_name,
        repo.description ?? '',
        repo.language ?? '',
        repo.topics.join(' '),
        technologies.value.join(' '),
        readme.extracted?.introduction ?? '',
        readme.extracted?.purpose ?? '',
        readme.extracted?.features.join(' ') ?? '',
        readme.extracted?.plainText ?? '',
        readme.rawMarkdown ?? '',
      ]
        .join(' ')
        .toLowerCase();

      for (const token of queryTokens) {
        if (!haystack.includes(token)) {
          return false;
        }
      }
    }

    return true;
  });

  return [...filtered].sort((a, b) => {
    switch (filters.sortBy) {
      case 'stars': {
        const starDiff = (b.repo.stargazers_count || 0) - (a.repo.stargazers_count || 0);
        if (starDiff !== 0) return starDiff;
        return Date.parse(b.repo.updated_at) - Date.parse(a.repo.updated_at);
      }
      case 'name':
        return a.repo.name.localeCompare(b.repo.name, undefined, { sensitivity: 'base' });
      case 'created':
        return Date.parse(b.repo.created_at) - Date.parse(a.repo.created_at);
      case 'updated':
      default:
        return Date.parse(b.repo.updated_at) - Date.parse(a.repo.updated_at);
    }
  });
}

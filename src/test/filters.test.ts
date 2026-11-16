import { describe, expect, it } from 'vitest';
import {
  analyzeReadme,
  buildEnrichedProject,
  createIdleReadmeRecord,
} from '../services/readmeAnalyzer';
import {
  calculatePortfolioStats,
  DEFAULT_FILTER_STATE,
  filterAndSortProjects,
  isFilterActive,
} from '../utils/filters';
import { ALICE_READMES, ALICE_REPOS } from './fixtures';

function buildAliceProjects() {
  return ALICE_REPOS.map((repo) => {
    const md = ALICE_READMES[repo.name];
    if (!md) {
      return buildEnrichedProject(repo, {
        ...createIdleReadmeRecord(),
        status: 'missing',
      });
    }
    return buildEnrichedProject(repo, {
      status: 'loaded',
      rawMarkdown: md,
      readmePath: 'README.md',
      origin: 'api',
      extracted: analyzeReadme(md, {
        owner: repo.owner.login,
        repo: repo.name,
        defaultBranch: repo.default_branch,
      }),
      fetchedAt: Date.now(),
      errorMessage: null,
    });
  });
}

describe('Filtering, sorting, and statistics', () => {
  it('calculates portfolio statistics accurately across owned repos and README live demos', () => {
    const projects = buildAliceProjects();
    const stats = calculatePortfolioStats(projects);

    expect(stats.totalRepositories).toBe(3);
    expect(stats.totalStars).toBe(128 + 64 + 5);
    expect(stats.totalForks).toBe(19 + 8 + 1);
    expect(stats.languageCount).toBe(3); // TypeScript, Go, Python
    // realtime-canvas has Live Demo from README; edge-cache-cli has homepage metadata
    expect(stats.liveDemoCount).toBe(2);
  });

  it('searches across repository name, description, and README content', () => {
    const projects = buildAliceProjects();

    // Name match
    expect(
      filterAndSortProjects(projects, { ...DEFAULT_FILTER_STATE, search: 'edge-cache' }).map(
        (p) => p.repo.name
      )
    ).toEqual(['edge-cache-cli']);

    // Description match
    expect(
      filterAndSortProjects(projects, { ...DEFAULT_FILTER_STATE, search: 'diagramming' }).map(
        (p) => p.repo.name
      )
    ).toEqual(['realtime-canvas']);

    // README-only content match ("CRDT" only appears in realtime-canvas README)
    expect(
      filterAndSortProjects(projects, { ...DEFAULT_FILTER_STATE, search: 'CRDT' }).map(
        (p) => p.repo.name
      )
    ).toEqual(['realtime-canvas']);
  });

  it('filters by language, topic, live demo, README presence, and fork toggle', () => {
    const projects = buildAliceProjects();

    expect(
      filterAndSortProjects(projects, { ...DEFAULT_FILTER_STATE, language: 'Go' }).map(
        (p) => p.repo.name
      )
    ).toEqual(['edge-cache-cli']);

    expect(
      filterAndSortProjects(projects, { ...DEFAULT_FILTER_STATE, topic: 'collaboration' }).map(
        (p) => p.repo.name
      )
    ).toEqual(['realtime-canvas']);

    expect(
      filterAndSortProjects(projects, { ...DEFAULT_FILTER_STATE, onlyLiveDemo: true }).map(
        (p) => p.repo.name
      )
    ).toEqual(['realtime-canvas', 'edge-cache-cli']);

    expect(
      filterAndSortProjects(projects, { ...DEFAULT_FILTER_STATE, onlyWithReadme: true }).map(
        (p) => p.repo.name
      )
    ).toEqual(['realtime-canvas', 'edge-cache-cli']);

    // Forks included by default, hidden only when hideForks=true
    expect(filterAndSortProjects(projects, DEFAULT_FILTER_STATE)).toHaveLength(3);
    expect(
      filterAndSortProjects(projects, { ...DEFAULT_FILTER_STATE, hideForks: true }).map(
        (p) => p.repo.name
      )
    ).toEqual(['realtime-canvas', 'edge-cache-cli']);
  });

  it('sorts by recently updated, stars, alphabetical name, and creation date', () => {
    const projects = buildAliceProjects();

    expect(
      filterAndSortProjects(projects, { ...DEFAULT_FILTER_STATE, sortBy: 'updated' }).map(
        (p) => p.repo.name
      )
    ).toEqual(['realtime-canvas', 'edge-cache-cli', 'awesome-forked-lib']);

    expect(
      filterAndSortProjects(projects, { ...DEFAULT_FILTER_STATE, sortBy: 'stars' }).map(
        (p) => p.repo.name
      )
    ).toEqual(['realtime-canvas', 'edge-cache-cli', 'awesome-forked-lib']);

    expect(
      filterAndSortProjects(projects, { ...DEFAULT_FILTER_STATE, sortBy: 'name' }).map(
        (p) => p.repo.name
      )
    ).toEqual(['awesome-forked-lib', 'edge-cache-cli', 'realtime-canvas']);

    expect(
      filterAndSortProjects(projects, { ...DEFAULT_FILTER_STATE, sortBy: 'created' }).map(
        (p) => p.repo.name
      )
    ).toEqual(['awesome-forked-lib', 'realtime-canvas', 'edge-cache-cli']);
  });

  it('tracks active filter state accurately', () => {
    expect(isFilterActive(DEFAULT_FILTER_STATE)).toBe(false);
    expect(isFilterActive({ ...DEFAULT_FILTER_STATE, onlyLiveDemo: true })).toBe(true);
    expect(isFilterActive({ ...DEFAULT_FILTER_STATE, sortBy: 'stars' })).toBe(true);
  });
});

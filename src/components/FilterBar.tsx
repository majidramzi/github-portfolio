import {
  ArrowUpDown,
  BookOpen,
  GitFork,
  Globe,
  Loader2,
  RotateCcw,
  Search,
  SlidersHorizontal,
  X,
} from 'lucide-react';
import type { PortfolioLoadingProgress } from '../hooks/usePortfolio';
import type { FilterState, SortOption } from '../types/portfolio';
import { isFilterActive } from '../utils/filters';

interface FilterBarProps {
  filters: FilterState;
  languages: Array<{ name: string; count: number }>;
  topics: Array<{ name: string; count: number }>;
  totalCount: number;
  filteredCount: number;
  progress: PortfolioLoadingProgress;
  onChange: (next: FilterState) => void;
  onReset: () => void;
  onTriggerReadmeScan: () => void;
}

export function FilterBar({
  filters,
  languages,
  topics,
  totalCount,
  filteredCount,
  progress,
  onChange,
  onReset,
  onTriggerReadmeScan,
}: FilterBarProps) {
  const active = isFilterActive(filters);
  const showReadmeProgress =
    progress.readmesTotal > 0 &&
    (progress.readmesInProgress > 0 ||
      (progress.readmesAnalyzed > 0 && progress.readmesAnalyzed < progress.readmesTotal));

  const readmePercent =
    progress.readmesTotal > 0
      ? Math.round((progress.readmesAnalyzed / progress.readmesTotal) * 100)
      : 0;

  return (
    <div className="space-y-4">
      {/* Main Controls Panel */}
      <div className="rounded-2xl border border-slate-200/80 bg-white p-4 shadow-2xs sm:p-5 dark:border-slate-800/90 dark:bg-slate-900/80">
        <div className="grid grid-cols-1 gap-3 lg:grid-cols-12">
          {/* Search Input */}
          <div className="relative lg:col-span-5">
            <label htmlFor="project-search" className="sr-only">
              Search repositories by name, description, or README content
            </label>
            <Search
              className="pointer-events-none absolute top-1/2 left-3.5 h-4 w-4 -translate-y-1/2 text-slate-400"
              aria-hidden="true"
            />
            <input
              id="project-search"
              type="search"
              value={filters.search}
              onChange={(event) => {
                const value = event.target.value;
                onChange({ ...filters, search: value });
                if (value.trim().length >= 2) {
                  onTriggerReadmeScan();
                }
              }}
              placeholder="Search name, description, topics, or README…"
              className="h-10 w-full rounded-xl border border-slate-200 bg-slate-50/70 pr-9 pl-10 text-sm text-slate-900 placeholder:text-slate-400 transition-colors focus:border-indigo-500 focus:bg-white focus:outline-none dark:border-slate-700/80 dark:bg-slate-950/70 dark:text-slate-100 dark:placeholder:text-slate-500 dark:focus:border-indigo-400 dark:focus:bg-slate-950"
            />
            {filters.search && (
              <button
                type="button"
                onClick={() => onChange({ ...filters, search: '' })}
                aria-label="Clear search query"
                className="absolute top-1/2 right-2.5 -translate-y-1/2 rounded-md p-1 text-slate-400 hover:bg-slate-200/60 hover:text-slate-700 dark:hover:bg-slate-800 dark:hover:text-slate-200"
              >
                <X className="h-3.5 w-3.5" aria-hidden="true" />
              </button>
            )}
          </div>

          {/* Language Select */}
          <div className="lg:col-span-2">
            <label htmlFor="language-filter" className="sr-only">
              Filter by programming language
            </label>
            <select
              id="language-filter"
              value={filters.language}
              onChange={(event) => onChange({ ...filters, language: event.target.value })}
              className="h-10 w-full rounded-xl border border-slate-200 bg-slate-50/70 px-3 text-sm text-slate-800 transition-colors focus:border-indigo-500 focus:bg-white focus:outline-none dark:border-slate-700/80 dark:bg-slate-950/70 dark:text-slate-100 dark:focus:border-indigo-400 dark:focus:bg-slate-950"
            >
              <option value="all">All languages</option>
              {languages.map((lang) => (
                <option key={lang.name} value={lang.name}>
                  {lang.name} ({lang.count})
                </option>
              ))}
            </select>
          </div>

          {/* Topic Select */}
          <div className="lg:col-span-2">
            <label htmlFor="topic-filter" className="sr-only">
              Filter by GitHub topic
            </label>
            <select
              id="topic-filter"
              value={filters.topic}
              onChange={(event) => onChange({ ...filters, topic: event.target.value })}
              disabled={topics.length === 0}
              className="h-10 w-full rounded-xl border border-slate-200 bg-slate-50/70 px-3 text-sm text-slate-800 transition-colors focus:border-indigo-500 focus:bg-white focus:outline-none disabled:cursor-not-allowed disabled:opacity-50 dark:border-slate-700/80 dark:bg-slate-950/70 dark:text-slate-100 dark:focus:border-indigo-400 dark:focus:bg-slate-950"
            >
              <option value="all">
                {topics.length > 0 ? 'All topics' : 'No topics'}
              </option>
              {topics.map((topic) => (
                <option key={topic.name} value={topic.name}>
                  #{topic.name} ({topic.count})
                </option>
              ))}
            </select>
          </div>

          {/* Sort Select */}
          <div className="relative lg:col-span-3">
            <label htmlFor="sort-select" className="sr-only">
              Sort repositories
            </label>
            <ArrowUpDown
              className="pointer-events-none absolute top-1/2 left-3 h-3.5 w-3.5 -translate-y-1/2 text-slate-400"
              aria-hidden="true"
            />
            <select
              id="sort-select"
              value={filters.sortBy}
              onChange={(event) =>
                onChange({ ...filters, sortBy: event.target.value as SortOption })
              }
              className="h-10 w-full rounded-xl border border-slate-200 bg-slate-50/70 pr-3 pl-9 text-sm text-slate-800 transition-colors focus:border-indigo-500 focus:bg-white focus:outline-none dark:border-slate-700/80 dark:bg-slate-950/70 dark:text-slate-100 dark:focus:border-indigo-400 dark:focus:bg-slate-950"
            >
              <option value="updated">Sort: Recently Updated</option>
              <option value="stars">Sort: Most Stars</option>
              <option value="name">Sort: Alphabetical (A–Z)</option>
              <option value="created">Sort: Creation Date</option>
            </select>
          </div>
        </div>

        {/* Toggle Filter Chips + Clear Filters */}
        <div className="mt-3.5 flex flex-wrap items-center justify-between gap-3 border-t border-slate-100 pt-3.5 dark:border-slate-800/80">
          <div className="flex flex-wrap items-center gap-2">
            <span className="mr-1 inline-flex items-center gap-1 text-xs font-medium text-slate-400 dark:text-slate-500">
              <SlidersHorizontal className="h-3.5 w-3.5" aria-hidden="true" />
              Filters:
            </span>

            <button
              type="button"
              role="switch"
              aria-checked={filters.onlyLiveDemo}
              onClick={() => onChange({ ...filters, onlyLiveDemo: !filters.onlyLiveDemo })}
              className={`inline-flex items-center gap-1.5 rounded-full border px-3 py-1 text-xs font-medium transition-colors ${
                filters.onlyLiveDemo
                  ? 'border-emerald-500 bg-emerald-50 text-emerald-700 dark:border-emerald-400 dark:bg-emerald-500/15 dark:text-emerald-300'
                  : 'border-slate-200 bg-white text-slate-600 hover:border-slate-300 hover:bg-slate-50 dark:border-slate-700 dark:bg-slate-900 dark:text-slate-300 dark:hover:border-slate-600'
              }`}
            >
              <Globe className="h-3.5 w-3.5" aria-hidden="true" />
              Has Live Demo
            </button>

            <button
              type="button"
              role="switch"
              aria-checked={filters.onlyWithReadme}
              onClick={() => {
                const nextValue = !filters.onlyWithReadme;
                onChange({ ...filters, onlyWithReadme: nextValue });
                if (nextValue) {
                  onTriggerReadmeScan();
                }
              }}
              className={`inline-flex items-center gap-1.5 rounded-full border px-3 py-1 text-xs font-medium transition-colors ${
                filters.onlyWithReadme
                  ? 'border-indigo-500 bg-indigo-50 text-indigo-700 dark:border-indigo-400 dark:bg-indigo-500/15 dark:text-indigo-300'
                  : 'border-slate-200 bg-white text-slate-600 hover:border-slate-300 hover:bg-slate-50 dark:border-slate-700 dark:bg-slate-900 dark:text-slate-300 dark:hover:border-slate-600'
              }`}
            >
              <BookOpen className="h-3.5 w-3.5" aria-hidden="true" />
              Has README
            </button>

            <button
              type="button"
              role="switch"
              aria-checked={filters.hideForks}
              onClick={() => onChange({ ...filters, hideForks: !filters.hideForks })}
              className={`inline-flex items-center gap-1.5 rounded-full border px-3 py-1 text-xs font-medium transition-colors ${
                filters.hideForks
                  ? 'border-sky-500 bg-sky-50 text-sky-700 dark:border-sky-400 dark:bg-sky-500/15 dark:text-sky-300'
                  : 'border-slate-200 bg-white text-slate-600 hover:border-slate-300 hover:bg-slate-50 dark:border-slate-700 dark:bg-slate-900 dark:text-slate-300 dark:hover:border-slate-600'
              }`}
            >
              <GitFork className="h-3.5 w-3.5" aria-hidden="true" />
              Hide Forks
            </button>
          </div>

          {active && (
            <button
              type="button"
              onClick={onReset}
              className="inline-flex items-center gap-1.5 rounded-lg px-2.5 py-1 text-xs font-semibold text-indigo-600 transition-colors hover:bg-indigo-50 dark:text-indigo-400 dark:hover:bg-indigo-500/10"
            >
              <RotateCcw className="h-3.5 w-3.5" aria-hidden="true" />
              Clear filters
            </button>
          )}
        </div>
      </div>

      {/* Results Count + Progressive README Analysis Indicator */}
      <div className="flex flex-wrap items-center justify-between gap-3 px-1 text-xs text-slate-500 dark:text-slate-400">
        <p aria-live="polite">
          Showing{' '}
          <strong className="font-semibold text-slate-900 dark:text-slate-100">
            {filteredCount}
          </strong>{' '}
          of{' '}
          <strong className="font-semibold text-slate-900 dark:text-slate-100">
            {totalCount}
          </strong>{' '}
          {totalCount === 1 ? 'repository' : 'repositories'}
        </p>

        {showReadmeProgress && (
          <div className="flex items-center gap-2.5">
            {progress.readmesInProgress > 0 && (
              <Loader2 className="h-3.5 w-3.5 animate-spin text-indigo-500" aria-hidden="true" />
            )}
            <span>
              READMEs analyzed: {progress.readmesAnalyzed}/{progress.readmesTotal}
            </span>
            <div
              className="h-1.5 w-20 overflow-hidden rounded-full bg-slate-200 dark:bg-slate-800"
              role="progressbar"
              aria-valuenow={readmePercent}
              aria-valuemin={0}
              aria-valuemax={100}
              aria-label="README analysis progress"
            >
              <div
                className="h-full rounded-full bg-indigo-500 transition-all duration-300"
                style={{ width: `${readmePercent}%` }}
              />
            </div>
            {progress.readmesAnalyzed < progress.readmesTotal && progress.readmesInProgress === 0 && (
              <button
                type="button"
                onClick={onTriggerReadmeScan}
                className="font-medium text-indigo-600 hover:underline dark:text-indigo-400"
              >
                Analyze all
              </button>
            )}
          </div>
        )}
      </div>
    </div>
  );
}

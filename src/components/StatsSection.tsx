import { Code2, FolderGit2, GitFork, Globe, Star } from 'lucide-react';
import type { PortfolioStats } from '../types/portfolio';
import { formatCount, getLanguageColor } from '../utils/format';

interface StatsSectionProps {
  stats: PortfolioStats;
  activeLanguage: string;
  onSelectLanguage: (language: string) => void;
}

export function StatsSection({
  stats,
  activeLanguage,
  onSelectLanguage,
}: StatsSectionProps) {
  const cards = [
    {
      label: 'Public Repositories',
      value: formatCount(stats.totalRepositories),
      icon: FolderGit2,
      accent: 'text-indigo-600 bg-indigo-50 dark:text-indigo-400 dark:bg-indigo-500/10',
    },
    {
      label: 'Total Stars',
      value: formatCount(stats.totalStars),
      icon: Star,
      accent: 'text-amber-600 bg-amber-50 dark:text-amber-400 dark:bg-amber-500/10',
    },
    {
      label: 'Total Forks',
      value: formatCount(stats.totalForks),
      icon: GitFork,
      accent: 'text-sky-600 bg-sky-50 dark:text-sky-400 dark:bg-sky-500/10',
    },
    {
      label: 'Programming Languages',
      value: formatCount(stats.languageCount),
      icon: Code2,
      accent: 'text-violet-600 bg-violet-50 dark:text-violet-400 dark:bg-violet-500/10',
    },
    {
      label: 'Live Demos',
      value: formatCount(stats.liveDemoCount),
      icon: Globe,
      accent: 'text-emerald-600 bg-emerald-50 dark:text-emerald-400 dark:bg-emerald-500/10',
    },
  ];

  const topLanguages = stats.languages.slice(0, 8);

  return (
    <section
      id="statistics"
      aria-labelledby="statistics-heading"
      className="mx-auto max-w-6xl px-4 py-10 sm:px-6 lg:px-8"
    >
      <div className="mb-5 flex items-baseline justify-between gap-4">
        <h2
          id="statistics-heading"
          className="text-sm font-semibold tracking-wider text-slate-500 uppercase dark:text-slate-400"
        >
          Portfolio Statistics
        </h2>
        <span className="text-xs text-slate-400 dark:text-slate-500">
          Calculated from owned public repositories
        </span>
      </div>

      <div className="grid grid-cols-2 gap-3.5 sm:grid-cols-3 lg:grid-cols-5">
        {cards.map((card) => {
          const Icon = card.icon;
          return (
            <div
              key={card.label}
              className="rounded-2xl border border-slate-200/80 bg-white p-4 shadow-2xs transition-all hover:border-slate-300/90 hover:shadow-sm sm:p-5 dark:border-slate-800/90 dark:bg-slate-900/80 dark:hover:border-slate-700"
            >
              <div className="mb-3 flex items-center justify-between">
                <span
                  className={`inline-flex h-9 w-9 items-center justify-center rounded-xl ${card.accent}`}
                >
                  <Icon className="h-4 w-4" aria-hidden="true" />
                </span>
              </div>
              <p className="font-mono text-2xl font-bold tracking-tight text-slate-900 sm:text-3xl dark:text-white">
                {card.value}
              </p>
              <p className="mt-1 text-xs font-medium text-slate-500 dark:text-slate-400">
                {card.label}
              </p>
            </div>
          );
        })}
      </div>

      {/* Language Distribution Bar (only rendered when primary languages exist) */}
      {topLanguages.length > 0 && (
        <div className="mt-5 rounded-2xl border border-slate-200/80 bg-white p-4 shadow-2xs sm:p-5 dark:border-slate-800/90 dark:bg-slate-900/80">
          <div className="mb-3 flex flex-wrap items-center justify-between gap-2">
            <span className="text-xs font-semibold tracking-wide text-slate-600 uppercase dark:text-slate-300">
              Primary Language Distribution
            </span>
            {activeLanguage !== 'all' && (
              <button
                type="button"
                onClick={() => onSelectLanguage('all')}
                className="text-xs font-medium text-indigo-600 hover:underline dark:text-indigo-400"
              >
                Clear language filter ({activeLanguage})
              </button>
            )}
          </div>

          <div
            className="flex h-2.5 w-full overflow-hidden rounded-full bg-slate-100 dark:bg-slate-800"
            role="img"
            aria-label={`Primary languages: ${topLanguages.map((l) => `${l.language} ${l.percentage}%`).join(', ')}`}
          >
            {topLanguages.map((item) => (
              <div
                key={item.language}
                style={{
                  width: `${Math.max(item.percentage, 2)}%`,
                  backgroundColor: getLanguageColor(item.language),
                }}
                title={`${item.language}: ${item.count} ${item.count === 1 ? 'repo' : 'repos'} (${item.percentage}%)`}
              />
            ))}
          </div>

          <div className="mt-3 flex flex-wrap gap-2">
            {topLanguages.map((item) => {
              const isSelected = activeLanguage.toLowerCase() === item.language.toLowerCase();
              return (
                <button
                  key={item.language}
                  type="button"
                  onClick={() => onSelectLanguage(isSelected ? 'all' : item.language)}
                  className={`inline-flex items-center gap-1.5 rounded-full border px-2.5 py-1 text-xs font-medium transition-colors ${
                    isSelected
                      ? 'border-indigo-500 bg-indigo-50 text-indigo-700 dark:border-indigo-400 dark:bg-indigo-500/20 dark:text-indigo-200'
                      : 'border-slate-200 bg-slate-50/80 text-slate-700 hover:border-slate-300 hover:bg-slate-100 dark:border-slate-800 dark:bg-slate-800/60 dark:text-slate-300 dark:hover:border-slate-700'
                  }`}
                >
                  <span
                    className="h-2 w-2 rounded-full"
                    style={{ backgroundColor: getLanguageColor(item.language) }}
                    aria-hidden="true"
                  />
                  <span>{item.language}</span>
                  <span className="font-mono text-[11px] text-slate-400 dark:text-slate-500">
                    {item.count}
                  </span>
                </button>
              );
            })}
          </div>
        </div>
      )}
    </section>
  );
}

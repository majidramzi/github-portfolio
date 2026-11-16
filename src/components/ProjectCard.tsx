import { useEffect, useRef } from 'react';
import {
  Archive,
  BookOpen,
  CheckCircle2,
  Clock,
  ExternalLink,
  GitFork,
  Globe,
  Sparkles,
  Star,
} from 'lucide-react';
import type { EnrichedProject } from '../types/portfolio';
import {
  formatCount,
  formatFullDate,
  formatRelativeDate,
  getLanguageColor,
} from '../utils/format';

interface ProjectCardProps {
  project: EnrichedProject;
  onSelect: (repoName: string) => void;
  onVisible: (repoName: string) => void;
  onTopicClick?: (topic: string) => void;
}

export function ProjectCard({
  project,
  onSelect,
  onVisible,
  onTopicClick,
}: ProjectCardProps) {
  const cardRef = useRef<HTMLElement | null>(null);
  const { repo, readme, summary, technologies, liveDemo } = project;

  // Lazy load README progressively as cards scroll into view
  useEffect(() => {
    if (readme.status !== 'idle') {
      return;
    }

    const element = cardRef.current;
    if (!element || typeof IntersectionObserver === 'undefined') {
      return;
    }

    const observer = new IntersectionObserver(
      (entries) => {
        if (entries.some((entry) => entry.isIntersecting)) {
          onVisible(repo.name);
          observer.disconnect();
        }
      },
      { rootMargin: '160px 0px' }
    );

    observer.observe(element);
    return () => observer.disconnect();
  }, [readme.status, repo.name, onVisible]);

  const readmeFeaturesPreview = readme.extracted?.features.slice(0, 2) ?? [];
  const techList = technologies.value.slice(0, 4);
  const remainingTechCount = Math.max(0, technologies.value.length - techList.length);
  const repoTopics = repo.topics.slice(0, 3);
  const showSeparateDescription =
    summary.source === 'readme' &&
    Boolean(repo.description?.trim()) &&
    repo.description?.trim().toLowerCase() !== summary.value?.trim().toLowerCase();

  return (
    <article
      ref={cardRef}
      className="group flex flex-col justify-between rounded-2xl border border-slate-200/80 bg-white p-5 shadow-2xs transition-all duration-200 hover:-translate-y-0.5 hover:border-indigo-300/80 hover:shadow-md sm:p-6 dark:border-slate-800/90 dark:bg-slate-900/85 dark:hover:border-indigo-500/50"
    >
      <div className="space-y-3.5">
        {/* Top Row: Repository Name + Status Badges */}
        <div className="flex items-start justify-between gap-3">
          <div className="min-w-0 flex-1">
            <h3 className="truncate text-lg font-bold tracking-tight text-slate-900 transition-colors group-hover:text-indigo-600 dark:text-white dark:group-hover:text-indigo-400">
              <button
                type="button"
                onClick={() => onSelect(repo.name)}
                className="max-w-full truncate text-left focus:outline-none focus-visible:underline"
              >
                {repo.name}
              </button>
            </h3>
          </div>

          <div className="flex shrink-0 items-center gap-1.5">
            {repo.fork && (
              <span
                title="Forked repository"
                className="inline-flex items-center gap-1 rounded-full border border-slate-200 bg-slate-50 px-2 py-0.5 text-[11px] font-medium text-slate-600 dark:border-slate-700 dark:bg-slate-800 dark:text-slate-300"
              >
                <GitFork className="h-3 w-3" aria-hidden="true" />
                Fork
              </span>
            )}
            {repo.archived && (
              <span
                title="Archived repository"
                className="inline-flex items-center gap-1 rounded-full border border-amber-200 bg-amber-50 px-2 py-0.5 text-[11px] font-medium text-amber-700 dark:border-amber-500/30 dark:bg-amber-500/10 dark:text-amber-300"
              >
                <Archive className="h-3 w-3" aria-hidden="true" />
                Archived
              </span>
            )}
          </div>
        </div>

        {/* Summary / README Introduction or Fallback GitHub Description */}
        {summary.value && (
          <div className="space-y-1.5">
            <p className="line-clamp-3 text-sm leading-relaxed text-slate-600 dark:text-slate-300">
              {summary.value}
            </p>
            <div className="flex items-center gap-1.5">
              <span
                className={`inline-flex items-center gap-1 rounded-md px-1.5 py-0.5 text-[10px] font-semibold tracking-wide uppercase ${
                  summary.source === 'readme'
                    ? 'bg-indigo-50 text-indigo-700 dark:bg-indigo-500/15 dark:text-indigo-300'
                    : 'bg-slate-100 text-slate-500 dark:bg-slate-800 dark:text-slate-400'
                }`}
              >
                {summary.source === 'readme' ? (
                  <>
                    <Sparkles className="h-2.5 w-2.5" aria-hidden="true" />
                    From README
                  </>
                ) : (
                  'GitHub Description'
                )}
              </span>
            </div>
          </div>
        )}

        {/* Secondary Repo Description if README Intro replaced it and differs */}
        {showSeparateDescription && repo.description && (
          <p className="line-clamp-2 text-xs text-slate-500 dark:text-slate-400">
            {repo.description}
          </p>
        )}

        {/* README Feature Preview (when extracted) */}
        {readmeFeaturesPreview.length > 0 && (
          <div className="rounded-xl border border-slate-100 bg-slate-50/80 p-3 dark:border-slate-800/80 dark:bg-slate-950/60">
            <p className="mb-1.5 text-[11px] font-semibold tracking-wide text-slate-500 uppercase dark:text-slate-400">
              README Highlights
            </p>
            <ul className="space-y-1">
              {readmeFeaturesPreview.map((feature) => (
                <li
                  key={feature}
                  className="flex items-start gap-1.5 text-xs text-slate-600 dark:text-slate-300"
                >
                  <CheckCircle2
                    className="mt-0.5 h-3.5 w-3.5 shrink-0 text-indigo-500 dark:text-indigo-400"
                    aria-hidden="true"
                  />
                  <span className="line-clamp-1">{feature}</span>
                </li>
              ))}
            </ul>
          </div>
        )}

        {/* Subtle shimmer while README is loading */}
        {readme.status === 'loading' && (
          <div className="flex items-center gap-2 text-xs text-slate-400 dark:text-slate-500">
            <span className="h-2 w-2 animate-pulse rounded-full bg-indigo-400" aria-hidden="true" />
            <span>Analyzing README…</span>
          </div>
        )}

        {/* Primary Language & Technologies / Topics */}
        {(repo.language || techList.length > 0 || repoTopics.length > 0) && (
          <div className="flex flex-wrap items-center gap-1.5 pt-0.5">
            {repo.language && (
              <span className="inline-flex items-center gap-1.5 rounded-full border border-slate-200/90 bg-slate-50 px-2.5 py-0.5 text-xs font-medium text-slate-700 dark:border-slate-700/80 dark:bg-slate-800/80 dark:text-slate-200">
                <span
                  className="h-2 w-2 rounded-full"
                  style={{ backgroundColor: getLanguageColor(repo.language) }}
                  aria-hidden="true"
                />
                {repo.language}
              </span>
            )}

            {technologies.source === 'readme' &&
              techList
                .filter((tech) => tech.toLowerCase() !== repo.language?.toLowerCase())
                .map((tech) => (
                  <span
                    key={tech}
                    className="inline-flex items-center rounded-full border border-indigo-200/70 bg-indigo-50/70 px-2.5 py-0.5 text-xs font-medium text-indigo-700 dark:border-indigo-500/25 dark:bg-indigo-500/10 dark:text-indigo-300"
                  >
                    {tech}
                  </span>
                ))}

            {technologies.source === 'readme' && remainingTechCount > 0 && (
              <span className="inline-flex items-center rounded-full bg-slate-100 px-2 py-0.5 font-mono text-[11px] text-slate-500 dark:bg-slate-800 dark:text-slate-400">
                +{remainingTechCount}
              </span>
            )}

            {repoTopics.map((topic) =>
              onTopicClick ? (
                <button
                  key={topic}
                  type="button"
                  onClick={() => onTopicClick(topic)}
                  className="inline-flex items-center rounded-full bg-slate-100/90 px-2 py-0.5 font-mono text-[11px] text-slate-600 transition-colors hover:bg-indigo-100 hover:text-indigo-700 dark:bg-slate-800/70 dark:text-slate-400 dark:hover:bg-indigo-500/20 dark:hover:text-indigo-300"
                >
                  #{topic}
                </button>
              ) : (
                <span
                  key={topic}
                  className="inline-flex items-center rounded-full bg-slate-100/90 px-2 py-0.5 font-mono text-[11px] text-slate-600 dark:bg-slate-800/70 dark:text-slate-400"
                >
                  #{topic}
                </span>
              )
            )}
          </div>
        )}
      </div>

      {/* Footer: Repository Metrics & Actions */}
      <div className="mt-5 space-y-3 border-t border-slate-100 pt-4 dark:border-slate-800/80">
        <div className="flex flex-wrap items-center justify-between gap-2 text-xs text-slate-500 dark:text-slate-400">
          <div className="flex items-center gap-3.5 font-mono">
            <span className="inline-flex items-center gap-1" title={`${repo.stargazers_count} stars`}>
              <Star className="h-3.5 w-3.5 text-amber-500" aria-hidden="true" />
              {formatCount(repo.stargazers_count)}
            </span>
            <span className="inline-flex items-center gap-1" title={`${repo.forks_count} forks`}>
              <GitFork className="h-3.5 w-3.5 text-slate-400" aria-hidden="true" />
              {formatCount(repo.forks_count)}
            </span>
          </div>

          <span
            className="inline-flex items-center gap-1"
            title={`Last updated ${formatFullDate(repo.updated_at)}`}
          >
            <Clock className="h-3.5 w-3.5 text-slate-400" aria-hidden="true" />
            <span>{formatRelativeDate(repo.updated_at)}</span>
          </span>
        </div>

        <div className="flex flex-wrap items-center gap-2">
          <button
            type="button"
            onClick={() => onSelect(repo.name)}
            className="inline-flex flex-1 items-center justify-center gap-1.5 rounded-xl bg-slate-900 px-3 py-2 text-xs font-semibold text-white transition-colors hover:bg-indigo-600 dark:bg-slate-800 dark:text-slate-100 dark:hover:bg-indigo-600"
          >
            <BookOpen className="h-3.5 w-3.5" aria-hidden="true" />
            {readme.status === 'loaded' ? 'Details & README' : 'Project Details'}
          </button>

          {liveDemo.value && (
            <a
              href={liveDemo.value}
              target="_blank"
              rel="noopener noreferrer"
              aria-label={`Open live demo for ${repo.name}`}
              className="inline-flex items-center justify-center gap-1.5 rounded-xl border border-emerald-200 bg-emerald-50 px-3 py-2 text-xs font-semibold text-emerald-700 transition-colors hover:bg-emerald-100 dark:border-emerald-500/30 dark:bg-emerald-500/10 dark:text-emerald-300 dark:hover:bg-emerald-500/20"
            >
              <Globe className="h-3.5 w-3.5" aria-hidden="true" />
              Live Demo
            </a>
          )}

          <a
            href={repo.html_url}
            target="_blank"
            rel="noopener noreferrer"
            aria-label={`Open ${repo.name} on GitHub`}
            title="View repository on GitHub"
            className="inline-flex items-center justify-center gap-1 rounded-xl border border-slate-200 bg-white px-2.5 py-2 text-xs font-semibold text-slate-700 transition-colors hover:bg-slate-50 dark:border-slate-700 dark:bg-slate-900 dark:text-slate-200 dark:hover:bg-slate-800"
          >
            GitHub
            <ExternalLink className="h-3 w-3" aria-hidden="true" />
          </a>
        </div>
      </div>
    </article>
  );
}

import { FolderOpen, RotateCcw, SearchX } from 'lucide-react';
import type { EnrichedProject } from '../types/portfolio';
import { ProjectCard } from './ProjectCard';

interface ProjectGridProps {
  projects: EnrichedProject[];
  totalCount: number;
  hasActiveFilters: boolean;
  username: string;
  onSelectProject: (repoName: string) => void;
  onProjectVisible: (repoName: string) => void;
  onTopicClick: (topic: string) => void;
  onResetFilters: () => void;
}

export function ProjectGrid({
  projects,
  totalCount,
  hasActiveFilters,
  username,
  onSelectProject,
  onProjectVisible,
  onTopicClick,
  onResetFilters,
}: ProjectGridProps) {
  // Account has zero public repositories
  if (totalCount === 0) {
    return (
      <div className="rounded-2xl border border-dashed border-slate-300 bg-white/70 px-6 py-16 text-center dark:border-slate-700 dark:bg-slate-900/50">
        <div className="mx-auto mb-4 flex h-12 w-12 items-center justify-center rounded-2xl bg-slate-100 text-slate-500 dark:bg-slate-800 dark:text-slate-400">
          <FolderOpen className="h-6 w-6" aria-hidden="true" />
        </div>
        <h3 className="text-base font-semibold text-slate-900 dark:text-white">
          No public repositories found
        </h3>
        <p className="mx-auto mt-2 max-w-md text-sm text-slate-600 dark:text-slate-400">
          The GitHub account <span className="font-mono font-medium">@{username}</span> currently
          has no public repositories visible through the GitHub REST API.
        </p>
      </div>
    );
  }

  // Filters yielded zero matches
  if (projects.length === 0) {
    return (
      <div className="rounded-2xl border border-dashed border-slate-300 bg-white/70 px-6 py-16 text-center dark:border-slate-700 dark:bg-slate-900/50">
        <div className="mx-auto mb-4 flex h-12 w-12 items-center justify-center rounded-2xl bg-slate-100 text-slate-500 dark:bg-slate-800 dark:text-slate-400">
          <SearchX className="h-6 w-6" aria-hidden="true" />
        </div>
        <h3 className="text-base font-semibold text-slate-900 dark:text-white">
          No matching repositories
        </h3>
        <p className="mx-auto mt-2 max-w-md text-sm text-slate-600 dark:text-slate-400">
          No repositories match your current search or filter criteria. Try adjusting your filters
          or clearing them to see all {totalCount} repositories.
        </p>
        {hasActiveFilters && (
          <button
            type="button"
            onClick={onResetFilters}
            className="mt-5 inline-flex items-center gap-2 rounded-xl bg-indigo-600 px-4 py-2 text-sm font-semibold text-white shadow-xs transition-colors hover:bg-indigo-500"
          >
            <RotateCcw className="h-4 w-4" aria-hidden="true" />
            Clear all filters
          </button>
        )}
      </div>
    );
  }

  return (
    <div className="grid grid-cols-1 gap-5 md:grid-cols-2 lg:grid-cols-3">
      {projects.map((project) => (
        <ProjectCard
          key={project.repo.id}
          project={project}
          onSelect={onSelectProject}
          onVisible={onProjectVisible}
          onTopicClick={onTopicClick}
        />
      ))}
    </div>
  );
}

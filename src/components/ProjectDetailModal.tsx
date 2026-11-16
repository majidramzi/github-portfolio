import { useEffect, useMemo, useRef, useState } from 'react';
import {
  AlertCircle,
  Archive,
  BookOpen,
  Calendar,
  CheckCircle2,
  Clock,
  Code2,
  Cpu,
  ExternalLink,
  FileCode2,
  FileText,
  GitBranch,
  GitFork,
  Globe,
  Image as ImageIcon,
  Layers,
  Loader2,
  RefreshCw,
  Scale,
  Sparkles,
  Star,
  Terminal,
  X,
} from 'lucide-react';
import { renderSafeReadmeMarkdown } from '../services/markdownRenderer';
import type { EnrichedProject, FieldSource } from '../types/portfolio';
import {
  formatCount,
  formatFullDate,
  formatRelativeDate,
  getLanguageColor,
} from '../utils/format';

interface ProjectDetailModalProps {
  project: EnrichedProject | null;
  onClose: () => void;
  onRefreshReadme: (repoName: string) => void;
}

function SourcePill({ source }: { source: FieldSource }) {
  if (source === 'none') return null;
  return (
    <span
      className={`inline-flex items-center gap-1 rounded-md px-1.5 py-0.5 text-[10px] font-semibold tracking-wide uppercase ${
        source === 'readme'
          ? 'bg-indigo-50 text-indigo-700 dark:bg-indigo-500/15 dark:text-indigo-300'
          : 'bg-slate-100 text-slate-500 dark:bg-slate-800 dark:text-slate-400'
      }`}
    >
      {source === 'readme' ? (
        <>
          <Sparkles className="h-2.5 w-2.5" aria-hidden="true" />
          From README
        </>
      ) : (
        'GitHub Metadata'
      )}
    </span>
  );
}

export function ProjectDetailModal({
  project,
  onClose,
  onRefreshReadme,
}: ProjectDetailModalProps) {
  const closeButtonRef = useRef<HTMLButtonElement | null>(null);
  const [lightboxImage, setLightboxImage] = useState<{ url: string; alt: string } | null>(null);

  useEffect(() => {
    if (!project) return;

    const previousOverflow = document.body.style.overflow;
    document.body.style.overflow = 'hidden';
    closeButtonRef.current?.focus();

    const onKeyDown = (event: KeyboardEvent) => {
      if (event.key === 'Escape') {
        if (lightboxImage) {
          setLightboxImage(null);
        } else {
          onClose();
        }
      }
    };
    window.addEventListener('keydown', onKeyDown);

    return () => {
      document.body.style.overflow = previousOverflow;
      window.removeEventListener('keydown', onKeyDown);
    };
  }, [project, lightboxImage, onClose]);

  const renderedReadmeHtml = useMemo(() => {
    if (!project || !project.readme.rawMarkdown) {
      return '';
    }
    return renderSafeReadmeMarkdown(project.readme.rawMarkdown, {
      owner: project.repo.owner.login,
      repo: project.repo.name,
      defaultBranch: project.repo.default_branch,
      readmePath: project.readme.readmePath,
    });
  }, [project]);

  if (!project) {
    return null;
  }

  const { repo, readme, summary, technologies, liveDemo, license } = project;
  const extracted = readme.extracted;

  const hasInsights = Boolean(
    summary.value ||
      extracted?.purpose ||
      (extracted?.features.length ?? 0) > 0 ||
      technologies.value.length > 0 ||
      (extracted?.installationRequirements.length ?? 0) > 0 ||
      extracted?.installationSnippet ||
      (extracted?.screenshots.length ?? 0) > 0 ||
      (extracted?.documentationLinks.length ?? 0) > 0 ||
      (extracted?.apiDocumentationLinks.length ?? 0) > 0
  );

  return (
    <div
      className="fixed inset-0 z-50 flex items-center justify-center bg-slate-950/70 p-3 backdrop-blur-xs sm:p-6"
      role="presentation"
      onClick={(event) => {
        if (event.target === event.currentTarget) {
          onClose();
        }
      }}
    >
      <div
        role="dialog"
        aria-modal="true"
        aria-labelledby="project-detail-title"
        className="flex max-h-[92vh] w-full max-w-4xl flex-col overflow-hidden rounded-2xl border border-slate-200 bg-white shadow-2xl dark:border-slate-800 dark:bg-slate-950"
      >
        {/* Modal Header */}
        <div className="flex items-start justify-between gap-4 border-b border-slate-200/80 bg-slate-50/80 px-5 py-4 sm:px-7 sm:py-5 dark:border-slate-800 dark:bg-slate-900/80">
          <div className="min-w-0 space-y-1.5">
            <div className="flex flex-wrap items-center gap-2">
              <span className="font-mono text-xs text-slate-500 dark:text-slate-400">
                {repo.full_name}
              </span>
              <span className="inline-flex items-center gap-1 rounded-md bg-slate-200/70 px-1.5 py-0.5 font-mono text-[11px] text-slate-600 dark:bg-slate-800 dark:text-slate-300">
                <GitBranch className="h-3 w-3" aria-hidden="true" />
                {repo.default_branch}
              </span>
              {repo.fork && (
                <span className="inline-flex items-center gap-1 rounded-full border border-slate-200 bg-white px-2 py-0.5 text-[11px] font-medium text-slate-600 dark:border-slate-700 dark:bg-slate-800 dark:text-slate-300">
                  <GitFork className="h-3 w-3" aria-hidden="true" />
                  Fork
                </span>
              )}
              {repo.archived && (
                <span className="inline-flex items-center gap-1 rounded-full border border-amber-200 bg-amber-50 px-2 py-0.5 text-[11px] font-medium text-amber-700 dark:border-amber-500/30 dark:bg-amber-500/10 dark:text-amber-300">
                  <Archive className="h-3 w-3" aria-hidden="true" />
                  Archived
                </span>
              )}
            </div>

            <h2
              id="project-detail-title"
              className="truncate text-xl font-bold tracking-tight text-slate-950 sm:text-2xl dark:text-white"
            >
              {repo.name}
            </h2>
          </div>

          <button
            ref={closeButtonRef}
            type="button"
            onClick={onClose}
            aria-label="Close project details"
            className="inline-flex h-9 w-9 shrink-0 items-center justify-center rounded-xl border border-slate-200 bg-white text-slate-500 transition-colors hover:bg-slate-100 hover:text-slate-900 dark:border-slate-700 dark:bg-slate-900 dark:text-slate-400 dark:hover:bg-slate-800 dark:hover:text-white"
          >
            <X className="h-4 w-4" aria-hidden="true" />
          </button>
        </div>

        {/* Scrollable Body */}
        <div className="flex-1 space-y-7 overflow-y-auto px-5 py-6 sm:px-7">
          {/* Action Links + Metadata Stats */}
          <div className="space-y-4">
            <div className="flex flex-wrap items-center gap-2.5">
              {liveDemo.value && (
                <a
                  href={liveDemo.value}
                  target="_blank"
                  rel="noopener noreferrer"
                  className="inline-flex items-center gap-2 rounded-xl bg-emerald-600 px-4 py-2 text-sm font-semibold text-white shadow-xs transition-colors hover:bg-emerald-500"
                >
                  <Globe className="h-4 w-4" aria-hidden="true" />
                  Live Demo
                  <ExternalLink className="h-3.5 w-3.5" aria-hidden="true" />
                </a>
              )}

              <a
                href={repo.html_url}
                target="_blank"
                rel="noopener noreferrer"
                className="inline-flex items-center gap-2 rounded-xl bg-slate-900 px-4 py-2 text-sm font-semibold text-white shadow-xs transition-colors hover:bg-slate-800 dark:bg-indigo-600 dark:hover:bg-indigo-500"
              >
                View on GitHub
                <ExternalLink className="h-3.5 w-3.5" aria-hidden="true" />
              </a>

              <button
                type="button"
                onClick={() => onRefreshReadme(repo.name)}
                disabled={readme.status === 'loading'}
                className="inline-flex items-center gap-1.5 rounded-xl border border-slate-200 bg-white px-3.5 py-2 text-xs font-semibold text-slate-700 transition-colors hover:bg-slate-50 disabled:opacity-50 dark:border-slate-700 dark:bg-slate-900 dark:text-slate-200 dark:hover:bg-slate-800"
              >
                <RefreshCw
                  className={`h-3.5 w-3.5 ${readme.status === 'loading' ? 'animate-spin' : ''}`}
                  aria-hidden="true"
                />
                Refresh README
              </button>

              {liveDemo.value && <SourcePill source={liveDemo.source} />}
            </div>

            {/* Repository Stats Grid */}
            <div className="grid grid-cols-2 gap-2.5 sm:grid-cols-3 lg:grid-cols-6">
              <div className="rounded-xl border border-slate-200/80 bg-slate-50/70 p-3 dark:border-slate-800 dark:bg-slate-900/70">
                <div className="flex items-center gap-1.5 text-xs text-slate-500 dark:text-slate-400">
                  <Star className="h-3.5 w-3.5 text-amber-500" aria-hidden="true" />
                  Stars
                </div>
                <p className="mt-1 font-mono text-base font-bold text-slate-900 dark:text-white">
                  {formatCount(repo.stargazers_count)}
                </p>
              </div>

              <div className="rounded-xl border border-slate-200/80 bg-slate-50/70 p-3 dark:border-slate-800 dark:bg-slate-900/70">
                <div className="flex items-center gap-1.5 text-xs text-slate-500 dark:text-slate-400">
                  <GitFork className="h-3.5 w-3.5 text-sky-500" aria-hidden="true" />
                  Forks
                </div>
                <p className="mt-1 font-mono text-base font-bold text-slate-900 dark:text-white">
                  {formatCount(repo.forks_count)}
                </p>
              </div>

              <div className="rounded-xl border border-slate-200/80 bg-slate-50/70 p-3 dark:border-slate-800 dark:bg-slate-900/70">
                <div className="flex items-center gap-1.5 text-xs text-slate-500 dark:text-slate-400">
                  <AlertCircle className="h-3.5 w-3.5 text-rose-500" aria-hidden="true" />
                  Open Issues
                </div>
                <p className="mt-1 font-mono text-base font-bold text-slate-900 dark:text-white">
                  {formatCount(repo.open_issues_count)}
                </p>
              </div>

              {repo.language && (
                <div className="rounded-xl border border-slate-200/80 bg-slate-50/70 p-3 dark:border-slate-800 dark:bg-slate-900/70">
                  <div className="flex items-center gap-1.5 text-xs text-slate-500 dark:text-slate-400">
                    <Code2 className="h-3.5 w-3.5 text-indigo-500" aria-hidden="true" />
                    Language
                  </div>
                  <p className="mt-1 flex items-center gap-1.5 truncate text-sm font-semibold text-slate-900 dark:text-white">
                    <span
                      className="h-2 w-2 shrink-0 rounded-full"
                      style={{ backgroundColor: getLanguageColor(repo.language) }}
                      aria-hidden="true"
                    />
                    <span className="truncate">{repo.language}</span>
                  </p>
                </div>
              )}

              <div className="rounded-xl border border-slate-200/80 bg-slate-50/70 p-3 dark:border-slate-800 dark:bg-slate-900/70">
                <div className="flex items-center gap-1.5 text-xs text-slate-500 dark:text-slate-400">
                  <Calendar className="h-3.5 w-3.5 text-slate-400" aria-hidden="true" />
                  Created
                </div>
                <p className="mt-1 text-xs font-semibold text-slate-900 dark:text-white">
                  {formatFullDate(repo.created_at)}
                </p>
              </div>

              <div className="rounded-xl border border-slate-200/80 bg-slate-50/70 p-3 dark:border-slate-800 dark:bg-slate-900/70">
                <div className="flex items-center gap-1.5 text-xs text-slate-500 dark:text-slate-400">
                  <Clock className="h-3.5 w-3.5 text-slate-400" aria-hidden="true" />
                  Updated
                </div>
                <p
                  className="mt-1 text-xs font-semibold text-slate-900 dark:text-white"
                  title={formatFullDate(repo.updated_at)}
                >
                  {formatRelativeDate(repo.updated_at)}
                </p>
              </div>
            </div>

            {/* Topics & License */}
            {(repo.topics.length > 0 || license.value) && (
              <div className="flex flex-wrap items-center gap-2">
                {license.value && (
                  <span className="inline-flex items-center gap-1.5 rounded-full border border-slate-200 bg-white px-2.5 py-1 text-xs font-medium text-slate-700 dark:border-slate-700 dark:bg-slate-900 dark:text-slate-300">
                    <Scale className="h-3.5 w-3.5 text-slate-400" aria-hidden="true" />
                    {license.value}
                    <SourcePill source={license.source} />
                  </span>
                )}
                {repo.topics.map((topic) => (
                  <span
                    key={topic}
                    className="inline-flex items-center rounded-full bg-slate-100 px-2.5 py-1 font-mono text-xs text-slate-600 dark:bg-slate-800 dark:text-slate-300"
                  >
                    #{topic}
                  </span>
                ))}
              </div>
            )}
          </div>

          {/* Structured README & Metadata Insights */}
          {hasInsights && (
            <section
              aria-label="Project overview and extracted insights"
              className="space-y-4 rounded-2xl border border-slate-200/80 bg-slate-50/60 p-5 dark:border-slate-800 dark:bg-slate-900/50"
            >
              {/* Description / Introduction */}
              {summary.value && (
                <div className="space-y-1.5">
                  <div className="flex items-center justify-between gap-2">
                    <h3 className="text-xs font-semibold tracking-wider text-slate-500 uppercase dark:text-slate-400">
                      Overview
                    </h3>
                    <SourcePill source={summary.source} />
                  </div>
                  <p className="text-sm leading-relaxed text-slate-700 dark:text-slate-200">
                    {summary.value}
                  </p>
                  {summary.source === 'readme' &&
                    repo.description &&
                    repo.description.trim().toLowerCase() !== summary.value.trim().toLowerCase() && (
                      <p className="pt-1 text-xs text-slate-500 dark:text-slate-400">
                        <span className="font-semibold">GitHub summary:</span> {repo.description}
                      </p>
                    )}
                </div>
              )}

              {/* Project Purpose */}
              {extracted?.purpose && (
                <div className="space-y-1.5 border-t border-slate-200/70 pt-4 dark:border-slate-800">
                  <div className="flex items-center justify-between gap-2">
                    <h3 className="text-xs font-semibold tracking-wider text-slate-500 uppercase dark:text-slate-400">
                      Project Purpose
                    </h3>
                    <SourcePill source="readme" />
                  </div>
                  <p className="text-sm leading-relaxed text-slate-700 dark:text-slate-200">
                    {extracted.purpose}
                  </p>
                </div>
              )}

              {/* Extracted Features */}
              {extracted && extracted.features.length > 0 && (
                <div className="space-y-2 border-t border-slate-200/70 pt-4 dark:border-slate-800">
                  <div className="flex items-center justify-between gap-2">
                    <h3 className="inline-flex items-center gap-1.5 text-xs font-semibold tracking-wider text-slate-500 uppercase dark:text-slate-400">
                      <Layers className="h-3.5 w-3.5" aria-hidden="true" />
                      Key Features
                    </h3>
                    <SourcePill source="readme" />
                  </div>
                  <ul className="grid grid-cols-1 gap-2 sm:grid-cols-2">
                    {extracted.features.map((feature) => (
                      <li
                        key={feature}
                        className="flex items-start gap-2 rounded-xl border border-slate-200/60 bg-white/80 p-2.5 text-xs leading-relaxed text-slate-700 dark:border-slate-800 dark:bg-slate-950/60 dark:text-slate-300"
                      >
                        <CheckCircle2
                          className="mt-0.5 h-3.5 w-3.5 shrink-0 text-indigo-500 dark:text-indigo-400"
                          aria-hidden="true"
                        />
                        <span>{feature}</span>
                      </li>
                    ))}
                  </ul>
                </div>
              )}

              {/* Technology Stack & Languages/Frameworks */}
              {technologies.value.length > 0 && (
                <div className="space-y-2 border-t border-slate-200/70 pt-4 dark:border-slate-800">
                  <div className="flex items-center justify-between gap-2">
                    <h3 className="inline-flex items-center gap-1.5 text-xs font-semibold tracking-wider text-slate-500 uppercase dark:text-slate-400">
                      <Cpu className="h-3.5 w-3.5" aria-hidden="true" />
                      Technology Stack
                    </h3>
                    <SourcePill source={technologies.source} />
                  </div>
                  <div className="flex flex-wrap gap-1.5">
                    {technologies.value.map((tech) => (
                      <span
                        key={tech}
                        className="inline-flex items-center rounded-full border border-indigo-200/70 bg-indigo-50/80 px-2.5 py-1 text-xs font-medium text-indigo-700 dark:border-indigo-500/25 dark:bg-indigo-500/10 dark:text-indigo-300"
                      >
                        {tech}
                      </span>
                    ))}
                  </div>
                  {extracted && extracted.languagesAndFrameworks.length > 0 && (
                    <p className="text-xs text-slate-500 dark:text-slate-400">
                      Languages &amp; frameworks:{' '}
                      <span className="font-medium text-slate-700 dark:text-slate-300">
                        {extracted.languagesAndFrameworks.join(', ')}
                      </span>
                    </p>
                  )}
                </div>
              )}

              {/* Installation & Requirements */}
              {extracted &&
                (extracted.installationRequirements.length > 0 ||
                  extracted.installationSnippet) && (
                  <div className="space-y-2 border-t border-slate-200/70 pt-4 dark:border-slate-800">
                    <div className="flex items-center justify-between gap-2">
                      <h3 className="inline-flex items-center gap-1.5 text-xs font-semibold tracking-wider text-slate-500 uppercase dark:text-slate-400">
                        <Terminal className="h-3.5 w-3.5" aria-hidden="true" />
                        Installation &amp; Requirements
                      </h3>
                      <SourcePill source="readme" />
                    </div>
                    {extracted.installationRequirements.length > 0 && (
                      <ul className="list-disc space-y-1 pl-5 text-xs text-slate-700 dark:text-slate-300">
                        {extracted.installationRequirements.map((req) => (
                          <li key={req}>{req}</li>
                        ))}
                      </ul>
                    )}
                    {extracted.installationSnippet && (
                      <pre className="overflow-x-auto rounded-xl border border-slate-800 bg-slate-950 p-3.5 font-mono text-xs text-slate-200">
                        <code>{extracted.installationSnippet}</code>
                      </pre>
                    )}
                  </div>
                )}

              {/* Screenshots Gallery */}
              {extracted && extracted.screenshots.length > 0 && (
                <div className="space-y-2.5 border-t border-slate-200/70 pt-4 dark:border-slate-800">
                  <div className="flex items-center justify-between gap-2">
                    <h3 className="inline-flex items-center gap-1.5 text-xs font-semibold tracking-wider text-slate-500 uppercase dark:text-slate-400">
                      <ImageIcon className="h-3.5 w-3.5" aria-hidden="true" />
                      Screenshots
                    </h3>
                    <SourcePill source="readme" />
                  </div>
                  <div className="grid grid-cols-1 gap-3 sm:grid-cols-2">
                    {extracted.screenshots.map((shot) => (
                      <button
                        key={shot.url}
                        type="button"
                        onClick={() => setLightboxImage(shot)}
                        className="group overflow-hidden rounded-xl border border-slate-200 bg-white text-left transition-all hover:border-indigo-400 dark:border-slate-800 dark:bg-slate-950"
                      >
                        <img
                          src={shot.url}
                          alt={shot.alt}
                          loading="lazy"
                          className="h-44 w-full object-cover transition-transform duration-200 group-hover:scale-[1.02]"
                        />
                        <p className="truncate px-3 py-2 text-xs text-slate-600 dark:text-slate-400">
                          {shot.alt}
                        </p>
                      </button>
                    ))}
                  </div>
                </div>
              )}

              {/* Documentation & API Documentation Links */}
              {extracted &&
                (extracted.documentationLinks.length > 0 ||
                  extracted.apiDocumentationLinks.length > 0) && (
                  <div className="grid grid-cols-1 gap-4 border-t border-slate-200/70 pt-4 sm:grid-cols-2 dark:border-slate-800">
                    {extracted.documentationLinks.length > 0 && (
                      <div className="space-y-2">
                        <h3 className="inline-flex items-center gap-1.5 text-xs font-semibold tracking-wider text-slate-500 uppercase dark:text-slate-400">
                          <FileText className="h-3.5 w-3.5" aria-hidden="true" />
                          Documentation
                        </h3>
                        <ul className="space-y-1.5">
                          {extracted.documentationLinks.map((link) => (
                            <li key={link.url}>
                              <a
                                href={link.url}
                                target="_blank"
                                rel="noopener noreferrer"
                                className="inline-flex items-center gap-1.5 text-xs font-medium text-indigo-600 hover:underline dark:text-indigo-400"
                              >
                                <span className="truncate">{link.label}</span>
                                <ExternalLink className="h-3 w-3 shrink-0" aria-hidden="true" />
                              </a>
                            </li>
                          ))}
                        </ul>
                      </div>
                    )}

                    {extracted.apiDocumentationLinks.length > 0 && (
                      <div className="space-y-2">
                        <h3 className="inline-flex items-center gap-1.5 text-xs font-semibold tracking-wider text-slate-500 uppercase dark:text-slate-400">
                          <FileCode2 className="h-3.5 w-3.5" aria-hidden="true" />
                          API Documentation
                        </h3>
                        <ul className="space-y-1.5">
                          {extracted.apiDocumentationLinks.map((link) => (
                            <li key={link.url}>
                              <a
                                href={link.url}
                                target="_blank"
                                rel="noopener noreferrer"
                                className="inline-flex items-center gap-1.5 text-xs font-medium text-indigo-600 hover:underline dark:text-indigo-400"
                              >
                                <span className="truncate">{link.label}</span>
                                <ExternalLink className="h-3 w-3 shrink-0" aria-hidden="true" />
                              </a>
                            </li>
                          ))}
                        </ul>
                      </div>
                    )}
                  </div>
                )}
            </section>
          )}

          {/* Full Rendered README Section */}
          <section aria-label="Repository README">
            <div className="mb-3 flex items-center justify-between gap-3">
              <h3 className="inline-flex items-center gap-2 text-sm font-semibold text-slate-900 dark:text-white">
                <BookOpen className="h-4 w-4 text-indigo-500" aria-hidden="true" />
                {readme.readmePath || 'README.md'}
              </h3>
              {readme.status === 'loaded' && (
                <span className="text-xs text-slate-400 dark:text-slate-500">
                  {readme.origin === 'raw-fallback'
                    ? 'Loaded via raw.githubusercontent.com'
                    : 'Loaded via GitHub API'}
                </span>
              )}
            </div>

            {readme.status === 'loading' || readme.status === 'idle' ? (
              <div className="flex items-center gap-3 rounded-2xl border border-slate-200/80 bg-slate-50/70 p-8 text-sm text-slate-500 dark:border-slate-800 dark:bg-slate-900/50 dark:text-slate-400">
                <Loader2 className="h-4 w-4 animate-spin text-indigo-500" aria-hidden="true" />
                Loading and analyzing README…
              </div>
            ) : readme.status === 'loaded' && renderedReadmeHtml ? (
              <div className="rounded-2xl border border-slate-200/80 bg-white p-5 sm:p-7 dark:border-slate-800 dark:bg-slate-900/60">
                <div
                  className="readme-prose"
                  dangerouslySetInnerHTML={{ __html: renderedReadmeHtml }}
                />
              </div>
            ) : readme.status === 'error' ? (
              <div className="rounded-2xl border border-amber-200 bg-amber-50/70 p-6 text-sm text-amber-900 dark:border-amber-500/30 dark:bg-amber-500/10 dark:text-amber-200">
                <p className="font-medium">Could not load the README for this repository.</p>
                {readme.errorMessage && (
                  <p className="mt-1 text-xs opacity-85">{readme.errorMessage}</p>
                )}
              </div>
            ) : (
              <div className="rounded-2xl border border-dashed border-slate-300 bg-slate-50/60 p-8 text-center text-sm text-slate-500 dark:border-slate-700 dark:bg-slate-900/40 dark:text-slate-400">
                No README file was found in this repository&apos;s{' '}
                <span className="font-mono">{repo.default_branch}</span> branch.
              </div>
            )}
          </section>
        </div>
      </div>

      {/* Screenshot Lightbox */}
      {lightboxImage && (
        <div
          role="dialog"
          aria-modal="true"
          aria-label={lightboxImage.alt}
          className="fixed inset-0 z-60 flex items-center justify-center bg-slate-950/90 p-4"
          onClick={() => setLightboxImage(null)}
        >
          <button
            type="button"
            onClick={() => setLightboxImage(null)}
            aria-label="Close image preview"
            className="absolute top-4 right-4 rounded-xl bg-white/10 p-2 text-white transition-colors hover:bg-white/20"
          >
            <X className="h-5 w-5" aria-hidden="true" />
          </button>
          <img
            src={lightboxImage.url}
            alt={lightboxImage.alt}
            className="max-h-[88vh] max-w-[92vw] rounded-xl object-contain shadow-2xl"
            onClick={(event) => event.stopPropagation()}
          />
        </div>
      )}
    </div>
  );
}

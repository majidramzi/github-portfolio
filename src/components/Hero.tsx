import { useEffect, useState } from 'react';
import {
  Building2,
  Clock,
  ExternalLink,
  FolderGit2,
  Globe,
  MapPin,
  RefreshCw,
} from 'lucide-react';
import type { GitHubUser, RateLimitInfo } from '../types/github';
import {
  formatCount,
  formatFullDate,
  formatRelativeDate,
  getDisplayHost,
  getInitials,
  normalizeExternalUrl,
} from '../utils/format';

interface HeroProps {
  profile: GitHubUser;
  repoCount: number;
  introText?: string;
  isCachedData: boolean;
  lastUpdatedAt: number | null;
  rateLimit: RateLimitInfo | null;
  isRefreshing: boolean;
  onRefresh: () => void;
}

export function Hero({
  profile,
  repoCount,
  introText,
  isCachedData,
  lastUpdatedAt,
  rateLimit,
  isRefreshing,
  onRefresh,
}: HeroProps) {
  const [avatarFailed, setAvatarFailed] = useState(false);

  useEffect(() => {
    setAvatarFailed(false);
  }, [profile.avatar_url]);

  const websiteUrl = normalizeExternalUrl(profile.blog);
  const displayName = profile.name?.trim() || null;
  const bio = profile.bio?.trim() || null;
  const customIntro = introText?.trim() || null;
  const company = profile.company?.trim() || null;
  const location = profile.location?.trim() || null;
  const publicRepoTotal = Math.max(profile.public_repos, repoCount);

  return (
    <section
      id="overview"
      aria-labelledby="portfolio-owner-heading"
      className="hero-grid-bg relative overflow-hidden border-b border-slate-200/80 dark:border-slate-800/80"
    >
      <div className="mx-auto max-w-6xl px-4 py-12 sm:px-6 sm:py-16 lg:px-8 lg:py-20">
        <div className="flex flex-col gap-8 md:flex-row md:items-start md:gap-10">
          {/* Avatar */}
          <div className="shrink-0">
            {profile.avatar_url && !avatarFailed ? (
              <img
                src={profile.avatar_url}
                alt={`${displayName ?? profile.login} GitHub avatar`}
                onError={() => setAvatarFailed(true)}
                className="h-24 w-24 rounded-2xl border-2 border-white object-cover shadow-lg ring-1 ring-slate-200/80 sm:h-28 sm:w-28 dark:border-slate-800 dark:ring-slate-700/80"
              />
            ) : (
              <div
                aria-hidden="true"
                className="flex h-24 w-24 items-center justify-center rounded-2xl border-2 border-white bg-gradient-to-br from-indigo-600 to-sky-500 text-2xl font-bold text-white shadow-lg sm:h-28 sm:w-28 dark:border-slate-800"
              >
                {getInitials(displayName, profile.login)}
              </div>
            )}
          </div>

          {/* Identity & Content */}
          <div className="min-w-0 flex-1 space-y-5">
            <div className="space-y-2">
              <div className="flex flex-wrap items-center gap-2.5">
                <span className="inline-flex items-center gap-1.5 rounded-full border border-indigo-200/80 bg-indigo-50/90 px-3 py-1 font-mono text-xs font-medium text-indigo-700 dark:border-indigo-500/30 dark:bg-indigo-500/10 dark:text-indigo-300">
                  @{profile.login}
                </span>
                {profile.type === 'Organization' && (
                  <span className="inline-flex items-center rounded-full border border-slate-200 bg-white/80 px-2.5 py-0.5 text-xs font-medium text-slate-600 dark:border-slate-700 dark:bg-slate-900 dark:text-slate-300">
                    Organization
                  </span>
                )}
              </div>

              <h1
                id="portfolio-owner-heading"
                className="text-3xl font-bold tracking-tight text-slate-950 sm:text-4xl lg:text-[2.6rem] lg:leading-tight dark:text-white"
              >
                {displayName ?? profile.login}
              </h1>

              {bio && (
                <p className="max-w-3xl text-base leading-relaxed text-slate-700 sm:text-lg dark:text-slate-300">
                  {bio}
                </p>
              )}

              {customIntro && (
                <p className="max-w-3xl text-sm leading-relaxed text-slate-600 sm:text-base dark:text-slate-400">
                  {customIntro}
                </p>
              )}
            </div>

            {/* Public Profile Metadata (only non-empty fields rendered) */}
            <div className="flex flex-wrap items-center gap-x-5 gap-y-2 text-sm text-slate-600 dark:text-slate-400">
              {company && (
                <span className="inline-flex items-center gap-1.5">
                  <Building2 className="h-4 w-4 shrink-0 text-slate-400 dark:text-slate-500" aria-hidden="true" />
                  <span>{company}</span>
                </span>
              )}

              {location && (
                <span className="inline-flex items-center gap-1.5">
                  <MapPin className="h-4 w-4 shrink-0 text-slate-400 dark:text-slate-500" aria-hidden="true" />
                  <span>{location}</span>
                </span>
              )}

              {websiteUrl && (
                <a
                  href={websiteUrl}
                  target="_blank"
                  rel="noopener noreferrer"
                  className="inline-flex items-center gap-1.5 text-indigo-600 transition-colors hover:text-indigo-700 hover:underline dark:text-indigo-400 dark:hover:text-indigo-300"
                >
                  <Globe className="h-4 w-4 shrink-0" aria-hidden="true" />
                  <span>{getDisplayHost(websiteUrl)}</span>
                </a>
              )}

              <span className="inline-flex items-center gap-1.5">
                <FolderGit2 className="h-4 w-4 shrink-0 text-slate-400 dark:text-slate-500" aria-hidden="true" />
                <span>
                  <strong className="font-semibold text-slate-900 dark:text-slate-100">
                    {formatCount(publicRepoTotal)}
                  </strong>{' '}
                  public {publicRepoTotal === 1 ? 'repository' : 'repositories'}
                </span>
              </span>
            </div>

            {/* Primary CTA Buttons */}
            <div className="flex flex-wrap items-center gap-3 pt-1">
              <a
                href={profile.html_url}
                target="_blank"
                rel="noopener noreferrer"
                className="inline-flex items-center gap-2 rounded-xl bg-slate-900 px-4 py-2.5 text-sm font-semibold text-white shadow-sm transition-all hover:-translate-y-0.5 hover:bg-slate-800 dark:bg-indigo-600 dark:hover:bg-indigo-500"
              >
                View GitHub Profile
                <ExternalLink className="h-4 w-4" aria-hidden="true" />
              </a>

              {websiteUrl && (
                <a
                  href={websiteUrl}
                  target="_blank"
                  rel="noopener noreferrer"
                  className="inline-flex items-center gap-2 rounded-xl border border-slate-300 bg-white px-4 py-2.5 text-sm font-semibold text-slate-800 shadow-2xs transition-all hover:-translate-y-0.5 hover:border-slate-400 hover:bg-slate-50 dark:border-slate-700 dark:bg-slate-900 dark:text-slate-100 dark:hover:border-slate-600 dark:hover:bg-slate-800"
                >
                  <Globe className="h-4 w-4 text-indigo-600 dark:text-indigo-400" aria-hidden="true" />
                  Personal Website
                </a>
              )}

              <a
                href="#projects"
                className="inline-flex items-center gap-1.5 rounded-xl px-3.5 py-2.5 text-sm font-medium text-slate-600 transition-colors hover:bg-slate-200/60 hover:text-slate-900 dark:text-slate-300 dark:hover:bg-slate-800/70 dark:hover:text-white"
              >
                Browse Projects ↓
              </a>
            </div>

            {/* Cache Freshness & API Status Strip */}
            {lastUpdatedAt && (
              <div className="flex flex-wrap items-center gap-3 pt-2 text-xs text-slate-500 dark:text-slate-400">
                <span
                  className="inline-flex items-center gap-1.5"
                  title={`Last updated ${formatFullDate(lastUpdatedAt)}`}
                >
                  <Clock className="h-3.5 w-3.5" aria-hidden="true" />
                  <span>
                    Updated {formatRelativeDate(lastUpdatedAt)}
                    {isCachedData ? ' (cached)' : ''}
                  </span>
                </span>

                {rateLimit && rateLimit.remaining !== null && rateLimit.limit !== null && (
                  <span className="hidden text-slate-400 sm:inline dark:text-slate-500">
                    · API quota: {rateLimit.remaining}/{rateLimit.limit}
                  </span>
                )}

                <button
                  type="button"
                  onClick={onRefresh}
                  disabled={isRefreshing}
                  className="inline-flex items-center gap-1 font-medium text-indigo-600 hover:underline disabled:opacity-50 dark:text-indigo-400"
                >
                  <RefreshCw className={`h-3 w-3 ${isRefreshing ? 'animate-spin' : ''}`} aria-hidden="true" />
                  {isRefreshing ? 'Syncing…' : 'Sync now'}
                </button>
              </div>
            )}
          </div>
        </div>
      </div>
    </section>
  );
}

import { useEffect, useState } from 'react';
import {
  Code2,
  ExternalLink,
  Menu,
  Moon,
  RefreshCw,
  Sun,
  X,
} from 'lucide-react';
import type { GitHubUser } from '../types/github';
import type { ThemeMode } from '../types/portfolio';
import { formatCount, getInitials } from '../utils/format';

interface HeaderProps {
  username: string | null;
  profile: GitHubUser | null;
  repoCount: number;
  theme: ThemeMode;
  onToggleTheme: () => void;
  onRefresh?: () => void;
  isRefreshing?: boolean;
  isPreviewMode?: boolean;
  onExitPreview?: () => void;
}

export function Header({
  username,
  profile,
  repoCount,
  theme,
  onToggleTheme,
  onRefresh,
  isRefreshing = false,
  isPreviewMode = false,
  onExitPreview,
}: HeaderProps) {
  const [mobileMenuOpen, setMobileMenuOpen] = useState(false);
  const [avatarError, setAvatarError] = useState(false);

  useEffect(() => {
    setAvatarError(false);
  }, [profile?.avatar_url]);

  useEffect(() => {
    if (!mobileMenuOpen) return;
    const onKeyDown = (event: KeyboardEvent) => {
      if (event.key === 'Escape') {
        setMobileMenuOpen(false);
      }
    };
    window.addEventListener('keydown', onKeyDown);
    return () => window.removeEventListener('keydown', onKeyDown);
  }, [mobileMenuOpen]);

  const displayName = profile?.name?.trim() || (username ? `@${username}` : 'GitHub Portfolio');
  const displayHandle = profile?.login ?? username;
  const publicRepoCount = profile ? Math.max(profile.public_repos, repoCount) : repoCount;
  const profileUrl = profile?.html_url ?? (username ? `https://github.com/${username}` : null);

  const navItems = [
    { label: 'Overview', href: '#overview' },
    { label: 'Statistics', href: '#statistics' },
    { label: 'Projects', href: '#projects' },
  ];

  return (
    <header className="sticky top-0 z-40 border-b border-slate-200/80 bg-white/85 backdrop-blur-md transition-colors dark:border-slate-800/80 dark:bg-slate-950/85">
      <a
        href="#main-content"
        className="sr-only focus:not-sr-only focus:absolute focus:top-3 focus:left-4 focus:z-50 focus:rounded-lg focus:bg-indigo-600 focus:px-3 focus:py-2 focus:text-sm focus:font-medium focus:text-white"
      >
        Skip to main content
      </a>

      <div className="mx-auto flex h-16 max-w-6xl items-center justify-between gap-4 px-4 sm:px-6 lg:px-8">
        {/* Brand / Owner Identity */}
        <a
          href="#overview"
          className="group flex min-w-0 items-center gap-3 focus:outline-none"
          aria-label={displayHandle ? `${displayName} portfolio home` : 'GitHub Portfolio home'}
        >
          {profile?.avatar_url && !avatarError ? (
            <img
              src={profile.avatar_url}
              alt={`${displayName} avatar`}
              onError={() => setAvatarError(true)}
              className="h-9 w-9 shrink-0 rounded-full border border-slate-200 object-cover shadow-xs transition-transform group-hover:scale-105 dark:border-slate-700"
            />
          ) : (
            <div className="flex h-9 w-9 shrink-0 items-center justify-center rounded-full bg-indigo-600 text-xs font-bold text-white shadow-xs dark:bg-indigo-500">
              {displayHandle ? getInitials(profile?.name, displayHandle) : <Code2 className="h-4 w-4" />}
            </div>
          )}

          <div className="min-w-0">
            <div className="flex items-center gap-2">
              <span className="truncate text-sm font-semibold tracking-tight text-slate-900 dark:text-slate-50">
                {displayName}
              </span>
              {publicRepoCount > 0 && (
                <span className="hidden rounded-full bg-slate-100 px-2 py-0.5 font-mono text-[11px] font-medium text-slate-600 sm:inline-flex dark:bg-slate-800 dark:text-slate-300">
                  {formatCount(publicRepoCount)} repos
                </span>
              )}
            </div>
            {profile?.name && displayHandle && (
              <p className="truncate font-mono text-xs text-slate-500 dark:text-slate-400">
                @{displayHandle}
              </p>
            )}
          </div>
        </a>

        {/* Desktop Navigation */}
        {username && (
          <nav aria-label="Primary navigation" className="hidden items-center gap-1 md:flex">
            {navItems.map((item) => (
              <a
                key={item.href}
                href={item.href}
                className="rounded-lg px-3 py-1.5 text-sm font-medium text-slate-600 transition-colors hover:bg-slate-100 hover:text-slate-900 dark:text-slate-300 dark:hover:bg-slate-800/80 dark:hover:text-white"
              >
                {item.label}
              </a>
            ))}
          </nav>
        )}

        {/* Action Controls */}
        <div className="flex items-center gap-2">
          {isPreviewMode && onExitPreview && (
            <button
              type="button"
              onClick={onExitPreview}
              className="hidden items-center gap-1.5 rounded-lg border border-amber-300/80 bg-amber-50 px-2.5 py-1.5 text-xs font-medium text-amber-800 transition-colors hover:bg-amber-100 sm:inline-flex dark:border-amber-500/30 dark:bg-amber-500/10 dark:text-amber-300 dark:hover:bg-amber-500/20"
            >
              Preview Mode
              <X className="h-3.5 w-3.5" aria-hidden="true" />
            </button>
          )}

          {username && onRefresh && (
            <button
              type="button"
              onClick={onRefresh}
              disabled={isRefreshing}
              aria-label="Refresh portfolio data from GitHub"
              title="Refresh data from GitHub"
              className="inline-flex h-9 items-center gap-1.5 rounded-lg border border-slate-200 bg-white px-2.5 text-xs font-medium text-slate-700 shadow-2xs transition-colors hover:bg-slate-50 disabled:cursor-not-allowed disabled:opacity-60 dark:border-slate-800 dark:bg-slate-900 dark:text-slate-200 dark:hover:bg-slate-800"
            >
              <RefreshCw
                className={`h-3.5 w-3.5 ${isRefreshing ? 'animate-spin text-indigo-600 dark:text-indigo-400' : ''}`}
                aria-hidden="true"
              />
              <span className="hidden sm:inline">{isRefreshing ? 'Refreshing…' : 'Refresh'}</span>
            </button>
          )}

          <button
            type="button"
            onClick={onToggleTheme}
            aria-label={theme === 'dark' ? 'Switch to light theme' : 'Switch to dark theme'}
            title={theme === 'dark' ? 'Switch to light theme' : 'Switch to dark theme'}
            className="inline-flex h-9 w-9 items-center justify-center rounded-lg border border-slate-200 bg-white text-slate-700 shadow-2xs transition-colors hover:bg-slate-50 dark:border-slate-800 dark:bg-slate-900 dark:text-slate-200 dark:hover:bg-slate-800"
          >
            {theme === 'dark' ? (
              <Sun className="h-4 w-4" aria-hidden="true" />
            ) : (
              <Moon className="h-4 w-4" aria-hidden="true" />
            )}
          </button>

          {profileUrl && (
            <a
              href={profileUrl}
              target="_blank"
              rel="noopener noreferrer"
              className="hidden h-9 items-center gap-1.5 rounded-lg bg-slate-900 px-3 text-xs font-medium text-white shadow-2xs transition-colors hover:bg-slate-800 sm:inline-flex dark:bg-indigo-600 dark:hover:bg-indigo-500"
            >
              GitHub
              <ExternalLink className="h-3.5 w-3.5" aria-hidden="true" />
            </a>
          )}

          {/* Mobile Menu Toggle */}
          {username && (
            <button
              type="button"
              onClick={() => setMobileMenuOpen((open) => !open)}
              aria-expanded={mobileMenuOpen}
              aria-controls="mobile-nav-menu"
              aria-label={mobileMenuOpen ? 'Close navigation menu' : 'Open navigation menu'}
              className="inline-flex h-9 w-9 items-center justify-center rounded-lg border border-slate-200 bg-white text-slate-700 transition-colors hover:bg-slate-50 md:hidden dark:border-slate-800 dark:bg-slate-900 dark:text-slate-200 dark:hover:bg-slate-800"
            >
              {mobileMenuOpen ? (
                <X className="h-4 w-4" aria-hidden="true" />
              ) : (
                <Menu className="h-4 w-4" aria-hidden="true" />
              )}
            </button>
          )}
        </div>
      </div>

      {/* Mobile Navigation Drawer */}
      {username && mobileMenuOpen && (
        <nav
          id="mobile-nav-menu"
          aria-label="Mobile navigation"
          className="border-t border-slate-200/80 bg-white px-4 py-3 md:hidden dark:border-slate-800 dark:bg-slate-950"
        >
          <div className="flex flex-col gap-1">
            {navItems.map((item) => (
              <a
                key={item.href}
                href={item.href}
                onClick={() => setMobileMenuOpen(false)}
                className="rounded-lg px-3 py-2 text-sm font-medium text-slate-700 hover:bg-slate-100 dark:text-slate-200 dark:hover:bg-slate-900"
              >
                {item.label}
              </a>
            ))}
            {profileUrl && (
              <a
                href={profileUrl}
                target="_blank"
                rel="noopener noreferrer"
                onClick={() => setMobileMenuOpen(false)}
                className="mt-1 flex items-center justify-between rounded-lg bg-slate-900 px-3 py-2 text-sm font-medium text-white dark:bg-indigo-600"
              >
                <span>Open GitHub Profile</span>
                <ExternalLink className="h-4 w-4" aria-hidden="true" />
              </a>
            )}
            {isPreviewMode && onExitPreview && (
              <button
                type="button"
                onClick={() => {
                  setMobileMenuOpen(false);
                  onExitPreview();
                }}
                className="mt-1 flex items-center justify-between rounded-lg border border-amber-300 bg-amber-50 px-3 py-2 text-sm font-medium text-amber-800 dark:border-amber-500/30 dark:bg-amber-500/10 dark:text-amber-300"
              >
                <span>Exit Local Preview</span>
                <X className="h-4 w-4" aria-hidden="true" />
              </button>
            )}
          </div>
        </nav>
      )}
    </header>
  );
}

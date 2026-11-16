import { Code2, ExternalLink } from 'lucide-react';
import type { AccountSource } from '../types/portfolio';

interface FooterProps {
  username: string | null;
  accountSource?: AccountSource;
}

export function Footer({ username, accountSource }: FooterProps) {
  return (
    <footer className="mt-auto border-t border-slate-200/80 bg-white/70 py-8 dark:border-slate-800/80 dark:bg-slate-950/70">
      <div className="mx-auto flex max-w-6xl flex-col items-start justify-between gap-4 px-4 text-xs text-slate-500 sm:flex-row sm:items-center sm:px-6 lg:px-8 dark:text-slate-400">
        <div className="flex items-center gap-2">
          <Code2 className="h-4 w-4 text-indigo-500" aria-hidden="true" />
          <span>
            Dynamic GitHub Portfolio
            {username ? (
              <>
                {' '}
                for <span className="font-mono font-medium text-slate-700 dark:text-slate-200">@{username}</span>
              </>
            ) : null}
          </span>
          {accountSource === 'github-pages' && (
            <span className="hidden rounded-full bg-slate-100 px-2 py-0.5 text-[11px] text-slate-500 sm:inline dark:bg-slate-800 dark:text-slate-400">
              Auto-detected from GitHub Pages
            </span>
          )}
        </div>

        <div className="flex flex-wrap items-center gap-4">
          <span>Powered by the public GitHub REST API · Static &amp; client-side only</span>
          {username && (
            <a
              href={`https://github.com/${encodeURIComponent(username)}`}
              target="_blank"
              rel="noopener noreferrer"
              className="inline-flex items-center gap-1 font-medium text-slate-700 hover:text-indigo-600 dark:text-slate-300 dark:hover:text-indigo-400"
            >
              GitHub
              <ExternalLink className="h-3 w-3" aria-hidden="true" />
            </a>
          )}
        </div>
      </div>
    </footer>
  );
}

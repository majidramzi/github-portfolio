import { useState, type FormEvent } from 'react';
import {
  AlertCircle,
  ArrowRight,
  Globe,
  Settings2,
  Terminal,
} from 'lucide-react';
import { isValidGitHubUsername } from '../config/account';
import type { AccountResolution } from '../types/portfolio';

interface ConfigErrorStateProps {
  resolution: Extract<AccountResolution, { status: 'error' }>;
  onPreviewUsername: (username: string) => void;
}

export function ConfigErrorState({
  resolution,
  onPreviewUsername,
}: ConfigErrorStateProps) {
  const [inputUsername, setInputUsername] = useState('');
  const [validationError, setValidationError] = useState<string | null>(null);

  const handleSubmit = (event: FormEvent<HTMLFormElement>) => {
    event.preventDefault();
    const cleaned = inputUsername.trim().replace(/^@/, '');
    if (!cleaned) {
      setValidationError('Enter a GitHub username to preview locally.');
      return;
    }
    if (!isValidGitHubUsername(cleaned)) {
      setValidationError(
        'Invalid GitHub username format. Use 1–39 alphanumeric characters or single hyphens.'
      );
      return;
    }
    setValidationError(null);
    onPreviewUsername(cleaned);
  };

  return (
    <div className="mx-auto max-w-3xl px-4 py-12 sm:px-6 sm:py-16 lg:px-8">
      <div
        role="alert"
        className="overflow-hidden rounded-2xl border border-slate-200 bg-white shadow-sm dark:border-slate-800 dark:bg-slate-900"
      >
        {/* Top Banner */}
        <div className="border-b border-slate-200/80 bg-slate-50/80 px-6 py-6 sm:px-8 dark:border-slate-800 dark:bg-slate-950/60">
          <div className="flex items-start gap-4">
            <div className="flex h-11 w-11 shrink-0 items-center justify-center rounded-xl bg-amber-100 text-amber-700 dark:bg-amber-500/15 dark:text-amber-400">
              <AlertCircle className="h-6 w-6" aria-hidden="true" />
            </div>
            <div className="space-y-1.5">
              <span className="inline-block rounded-full bg-amber-100/80 px-2.5 py-0.5 text-[11px] font-semibold tracking-wide text-amber-800 uppercase dark:bg-amber-500/15 dark:text-amber-300">
                Configuration Required
              </span>
              <h1 className="text-xl font-bold tracking-tight text-slate-950 sm:text-2xl dark:text-white">
                {resolution.reason === 'invalid-username'
                  ? 'Invalid GitHub Username Configuration'
                  : 'GitHub Account Could Not Be Detected'}
              </h1>
              <p className="text-sm leading-relaxed text-slate-600 dark:text-slate-300">
                {resolution.message}
              </p>
            </div>
          </div>
        </div>

        {/* Setup Guidance */}
        <div className="space-y-6 px-6 py-6 sm:px-8">
          <div className="rounded-xl border border-slate-200/80 bg-slate-50/70 p-4 text-xs text-slate-600 dark:border-slate-800 dark:bg-slate-950/50 dark:text-slate-300">
            <span className="font-semibold text-slate-900 dark:text-slate-100">
              Detected Hostname:
            </span>{' '}
            <code className="rounded bg-slate-200/80 px-1.5 py-0.5 font-mono text-slate-800 dark:bg-slate-800 dark:text-slate-200">
              {resolution.hostname}
            </code>
          </div>

          <div className="grid grid-cols-1 gap-4 md:grid-cols-2">
            {/* Option 1: GitHub Pages */}
            <div className="rounded-xl border border-slate-200/80 p-4 dark:border-slate-800">
              <div className="mb-2 flex items-center gap-2 text-sm font-semibold text-slate-900 dark:text-white">
                <Globe className="h-4 w-4 text-indigo-500" aria-hidden="true" />
                Automatic on GitHub Pages
              </div>
              <p className="text-xs leading-relaxed text-slate-600 dark:text-slate-400">
                No code changes are needed when deployed to GitHub Pages. Both deployment formats
                are detected automatically:
              </p>
              <ul className="mt-2.5 space-y-1 font-mono text-[11px] text-slate-700 dark:text-slate-300">
                <li>https://&lt;username&gt;.github.io/github-portfolio/</li>
                <li>https://&lt;username&gt;.github.io/</li>
              </ul>
            </div>

            {/* Option 2: Custom Domain */}
            <div className="rounded-xl border border-slate-200/80 p-4 dark:border-slate-800">
              <div className="mb-2 flex items-center gap-2 text-sm font-semibold text-slate-900 dark:text-white">
                <Settings2 className="h-4 w-4 text-indigo-500" aria-hidden="true" />
                Custom Domain Override
              </div>
              <p className="text-xs leading-relaxed text-slate-600 dark:text-slate-400">
                Hosting on a custom domain? Set <code className="font-mono">githubUsername</code>{' '}
                in <code className="font-mono">src/config/site.ts</code> or define the{' '}
                <code className="font-mono">VITE_GITHUB_USERNAME</code> variable:
              </p>
              <pre className="mt-2.5 overflow-x-auto rounded-lg bg-slate-950 p-2.5 font-mono text-[11px] text-slate-200">
                <code>{`export const siteConfig = {\n  githubUsername: 'your-username',\n};`}</code>
              </pre>
            </div>
          </div>

          {/* Local Preview Box (Only displayed when hostname is unresolvable) */}
          <div className="rounded-xl border border-indigo-200/80 bg-indigo-50/50 p-5 dark:border-indigo-500/25 dark:bg-indigo-500/10">
            <div className="mb-2 flex items-center gap-2 text-sm font-semibold text-slate-900 dark:text-white">
              <Terminal className="h-4 w-4 text-indigo-600 dark:text-indigo-400" aria-hidden="true" />
              Local Development Preview
            </div>
            <p className="text-xs leading-relaxed text-slate-600 dark:text-slate-300">
              Testing locally outside GitHub Pages? Preview any public GitHub account temporarily
              without modifying source files:
            </p>

            <form onSubmit={handleSubmit} className="mt-3 flex flex-col gap-2.5 sm:flex-row">
              <label htmlFor="preview-username-input" className="sr-only">
                GitHub username to preview locally
              </label>
              <input
                id="preview-username-input"
                type="text"
                value={inputUsername}
                onChange={(event) => {
                  setInputUsername(event.target.value);
                  if (validationError) setValidationError(null);
                }}
                placeholder="Enter a public GitHub username (e.g. octocat)"
                autoComplete="off"
                className="h-10 flex-1 rounded-xl border border-slate-300 bg-white px-3.5 text-sm text-slate-900 placeholder:text-slate-400 focus:border-indigo-500 focus:outline-none dark:border-slate-700 dark:bg-slate-950 dark:text-slate-100"
              />
              <button
                type="submit"
                className="inline-flex h-10 items-center justify-center gap-1.5 rounded-xl bg-indigo-600 px-4 text-sm font-semibold text-white shadow-xs transition-colors hover:bg-indigo-500"
              >
                Preview Portfolio
                <ArrowRight className="h-4 w-4" aria-hidden="true" />
              </button>
            </form>

            {validationError && (
              <p role="alert" className="mt-2 text-xs font-medium text-rose-600 dark:text-rose-400">
                {validationError}
              </p>
            )}
          </div>
        </div>
      </div>
    </div>
  );
}

import {
  AlertTriangle,
  Clock,
  RefreshCw,
  ServerCrash,
  UserX,
  WifiOff,
} from 'lucide-react';
import type { PortfolioError } from '../types/portfolio';
import { formatRelativeDate, formatTimestampTime } from '../utils/format';

interface ErrorStateProps {
  error: PortfolioError;
  username: string;
  onRetry: () => void;
  isPreviewMode?: boolean;
  onExitPreview?: () => void;
}

export function ErrorState({
  error,
  username,
  onRetry,
  isPreviewMode = false,
  onExitPreview,
}: ErrorStateProps) {
  const Icon =
    error.code === 'RATE_LIMITED'
      ? Clock
      : error.code === 'NOT_FOUND' || error.code === 'INVALID_USERNAME'
        ? UserX
        : error.code === 'NETWORK_ERROR'
          ? WifiOff
          : error.code === 'SERVER_ERROR'
            ? ServerCrash
            : AlertTriangle;

  const resetTime =
    error.rateLimit?.resetAt && error.rateLimit.resetAt > Date.now()
      ? `${formatTimestampTime(error.rateLimit.resetAt)} (${formatRelativeDate(error.rateLimit.resetAt)})`
      : null;

  return (
    <div className="mx-auto max-w-2xl px-4 py-16 sm:px-6 lg:px-8">
      <div
        role="alert"
        className="rounded-2xl border border-slate-200 bg-white p-8 text-center shadow-sm dark:border-slate-800 dark:bg-slate-900"
      >
        <div className="mx-auto mb-5 flex h-14 w-14 items-center justify-center rounded-2xl bg-rose-50 text-rose-600 dark:bg-rose-500/10 dark:text-rose-400">
          <Icon className="h-7 w-7" aria-hidden="true" />
        </div>

        <h1 className="text-xl font-bold tracking-tight text-slate-950 dark:text-white">
          {error.title}
        </h1>

        <p className="mx-auto mt-3 max-w-lg text-sm leading-relaxed text-slate-600 dark:text-slate-300">
          {error.message}
        </p>

        {error.code === 'RATE_LIMITED' && (
          <div className="mx-auto mt-5 max-w-md rounded-xl border border-amber-200 bg-amber-50 p-4 text-left text-xs leading-relaxed text-amber-900 dark:border-amber-500/30 dark:bg-amber-500/10 dark:text-amber-200">
            <p className="font-semibold">Why did this happen?</p>
            <p className="mt-1">
              This portfolio uses GitHub&apos;s public unauthenticated API (60 requests/hour per IP)
              so no API keys or login are ever required.
              {resetTime
                ? ` Your quota is scheduled to reset at ${resetTime}.`
                : ' Please wait a short while and try again.'}
            </p>
          </div>
        )}

        {error.code === 'NOT_FOUND' && (
          <p className="mt-4 font-mono text-xs text-slate-500 dark:text-slate-400">
            Requested account: @{username}
          </p>
        )}

        <div className="mt-7 flex flex-wrap items-center justify-center gap-3">
          <button
            type="button"
            onClick={onRetry}
            className="inline-flex items-center gap-2 rounded-xl bg-indigo-600 px-5 py-2.5 text-sm font-semibold text-white shadow-xs transition-colors hover:bg-indigo-500"
          >
            <RefreshCw className="h-4 w-4" aria-hidden="true" />
            Try Again
          </button>

          {isPreviewMode && onExitPreview && (
            <button
              type="button"
              onClick={onExitPreview}
              className="inline-flex items-center gap-2 rounded-xl border border-slate-300 bg-white px-4 py-2.5 text-sm font-semibold text-slate-700 transition-colors hover:bg-slate-50 dark:border-slate-700 dark:bg-slate-900 dark:text-slate-200 dark:hover:bg-slate-800"
            >
              Choose Another Account
            </button>
          )}
        </div>
      </div>
    </div>
  );
}

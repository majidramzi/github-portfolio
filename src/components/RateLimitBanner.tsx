import { AlertTriangle, Clock, RefreshCw } from 'lucide-react';
import type { RateLimitInfo } from '../types/github';
import { formatRelativeDate, formatTimestampTime } from '../utils/format';

interface RateLimitBannerProps {
  message: string;
  rateLimit: RateLimitInfo | null;
  lastUpdatedAt: number | null;
  onRetry: () => void;
  isRefreshing: boolean;
}

export function RateLimitBanner({
  message,
  rateLimit,
  lastUpdatedAt,
  onRetry,
  isRefreshing,
}: RateLimitBannerProps) {
  const resetTimeText =
    rateLimit?.resetAt && rateLimit.resetAt > Date.now()
      ? `${formatTimestampTime(rateLimit.resetAt)} (${formatRelativeDate(rateLimit.resetAt)})`
      : null;

  return (
    <div
      role="status"
      aria-live="polite"
      className="mx-auto mt-6 max-w-6xl px-4 sm:px-6 lg:px-8"
    >
      <div className="flex flex-col gap-3 rounded-2xl border border-amber-300/80 bg-amber-50/90 p-4 text-amber-950 shadow-2xs sm:flex-row sm:items-center sm:justify-between dark:border-amber-500/30 dark:bg-amber-500/10 dark:text-amber-100">
        <div className="flex items-start gap-3">
          <AlertTriangle
            className="mt-0.5 h-5 w-5 shrink-0 text-amber-600 dark:text-amber-400"
            aria-hidden="true"
          />
          <div className="space-y-1 text-sm">
            <p className="font-medium">{message}</p>
            <div className="flex flex-wrap items-center gap-x-4 gap-y-1 text-xs text-amber-800 dark:text-amber-200/85">
              {lastUpdatedAt && (
                <span className="inline-flex items-center gap-1">
                  <Clock className="h-3.5 w-3.5" aria-hidden="true" />
                  Cached snapshot from {formatRelativeDate(lastUpdatedAt)}
                </span>
              )}
              {resetTimeText && (
                <span>Next API refresh window: {resetTimeText}</span>
              )}
            </div>
          </div>
        </div>

        <button
          type="button"
          onClick={onRetry}
          disabled={isRefreshing}
          className="inline-flex shrink-0 items-center justify-center gap-1.5 rounded-xl border border-amber-400/80 bg-white px-3.5 py-2 text-xs font-semibold text-amber-900 shadow-2xs transition-colors hover:bg-amber-100/70 disabled:opacity-60 dark:border-amber-500/40 dark:bg-amber-500/15 dark:text-amber-100 dark:hover:bg-amber-500/25"
        >
          <RefreshCw className={`h-3.5 w-3.5 ${isRefreshing ? 'animate-spin' : ''}`} aria-hidden="true" />
          Try Refresh
        </button>
      </div>
    </div>
  );
}

import { Loader2 } from 'lucide-react';

interface LoadingSkeletonProps {
  statusMessage?: string;
}

export function LoadingSkeleton({ statusMessage }: LoadingSkeletonProps) {
  return (
    <div aria-busy="true" aria-live="polite" className="animate-fade-in">
      {/* Status Banner */}
      {statusMessage && (
        <div className="mx-auto max-w-6xl px-4 pt-6 sm:px-6 lg:px-8">
          <div className="inline-flex items-center gap-2.5 rounded-full border border-indigo-200/80 bg-indigo-50/90 px-4 py-1.5 text-xs font-medium text-indigo-700 dark:border-indigo-500/30 dark:bg-indigo-500/10 dark:text-indigo-300">
            <Loader2 className="h-3.5 w-3.5 animate-spin" aria-hidden="true" />
            <span>{statusMessage}</span>
          </div>
        </div>
      )}

      {/* Hero Skeleton */}
      <div className="border-b border-slate-200/80 dark:border-slate-800/80">
        <div className="mx-auto max-w-6xl px-4 py-12 sm:px-6 sm:py-16 lg:px-8">
          <div className="flex flex-col gap-8 md:flex-row md:items-start">
            <div className="h-24 w-24 shrink-0 animate-pulse rounded-2xl bg-slate-200 sm:h-28 sm:w-28 dark:bg-slate-800" />
            <div className="flex-1 space-y-4">
              <div className="h-6 w-28 animate-pulse rounded-full bg-slate-200 dark:bg-slate-800" />
              <div className="h-10 w-64 max-w-full animate-pulse rounded-xl bg-slate-200 dark:bg-slate-800" />
              <div className="h-5 w-full max-w-xl animate-pulse rounded-lg bg-slate-200/80 dark:bg-slate-800/80" />
              <div className="flex flex-wrap gap-3 pt-2">
                <div className="h-10 w-40 animate-pulse rounded-xl bg-slate-200 dark:bg-slate-800" />
                <div className="h-10 w-36 animate-pulse rounded-xl bg-slate-200/80 dark:bg-slate-800/80" />
              </div>
            </div>
          </div>
        </div>
      </div>

      {/* Stats Skeleton */}
      <div className="mx-auto max-w-6xl px-4 py-10 sm:px-6 lg:px-8">
        <div className="grid grid-cols-2 gap-3.5 sm:grid-cols-3 lg:grid-cols-5">
          {Array.from({ length: 5 }).map((_, index) => (
            <div
              key={index}
              className="rounded-2xl border border-slate-200/80 bg-white p-5 dark:border-slate-800 dark:bg-slate-900"
            >
              <div className="mb-3 h-9 w-9 animate-pulse rounded-xl bg-slate-200 dark:bg-slate-800" />
              <div className="h-8 w-16 animate-pulse rounded-lg bg-slate-200 dark:bg-slate-800" />
              <div className="mt-2 h-3.5 w-24 animate-pulse rounded bg-slate-200/80 dark:bg-slate-800/80" />
            </div>
          ))}
        </div>
      </div>

      {/* Project Grid Skeleton */}
      <div className="mx-auto max-w-6xl px-4 pb-16 sm:px-6 lg:px-8">
        <div className="mb-6 h-12 w-full animate-pulse rounded-2xl bg-slate-200/80 dark:bg-slate-800/80" />
        <div className="grid grid-cols-1 gap-5 md:grid-cols-2 lg:grid-cols-3">
          {Array.from({ length: 6 }).map((_, index) => (
            <div
              key={index}
              className="flex h-72 flex-col justify-between rounded-2xl border border-slate-200/80 bg-white p-6 dark:border-slate-800 dark:bg-slate-900"
            >
              <div className="space-y-3">
                <div className="h-6 w-2/3 animate-pulse rounded-lg bg-slate-200 dark:bg-slate-800" />
                <div className="h-4 w-full animate-pulse rounded bg-slate-200/80 dark:bg-slate-800/80" />
                <div className="h-4 w-5/6 animate-pulse rounded bg-slate-200/80 dark:bg-slate-800/80" />
                <div className="flex gap-2 pt-2">
                  <div className="h-6 w-16 animate-pulse rounded-full bg-slate-200 dark:bg-slate-800" />
                  <div className="h-6 w-20 animate-pulse rounded-full bg-slate-200 dark:bg-slate-800" />
                </div>
              </div>
              <div className="flex items-center justify-between border-t border-slate-100 pt-4 dark:border-slate-800">
                <div className="h-4 w-24 animate-pulse rounded bg-slate-200 dark:bg-slate-800" />
                <div className="h-8 w-24 animate-pulse rounded-lg bg-slate-200 dark:bg-slate-800" />
              </div>
            </div>
          ))}
        </div>
      </div>
    </div>
  );
}

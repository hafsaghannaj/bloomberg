'use client';

import clsx from 'clsx';

interface Props {
  className?: string;
  count?: number;
}

export function Skeleton({ className }: { className?: string }) {
  return (
    <div
      className={clsx(
        'animate-pulse rounded bg-bloomberg-border/50',
        className
      )}
    />
  );
}

export function SkeletonRow({ count = 1 }: Props) {
  return (
    <div className="space-y-2 p-3">
      {Array.from({ length: count }).map((_, i) => (
        <div key={i} className="flex gap-3 items-center">
          <Skeleton className="h-3 w-16" />
          <Skeleton className="h-3 flex-1" />
          <Skeleton className="h-3 w-12" />
        </div>
      ))}
    </div>
  );
}

export function SkeletonGrid({ count = 6 }: Props) {
  return (
    <div className="grid grid-cols-2 lg:grid-cols-3 gap-2 p-3">
      {Array.from({ length: count }).map((_, i) => (
        <div key={i} className="bg-bloomberg-bg-panel border border-bloomberg-border rounded p-3 space-y-2">
          <Skeleton className="h-3 w-20" />
          <Skeleton className="h-6 w-24" />
          <Skeleton className="h-3 w-16" />
          <Skeleton className="h-[30px] w-full" />
        </div>
      ))}
    </div>
  );
}

export function SkeletonChart() {
  return (
    <div className="h-full flex flex-col">
      <div className="flex gap-1 px-2 py-1 border-b border-bloomberg-border">
        {Array.from({ length: 6 }).map((_, i) => (
          <Skeleton key={i} className="h-5 w-8" />
        ))}
      </div>
      <div className="flex-1 p-4">
        <Skeleton className="h-full w-full" />
      </div>
    </div>
  );
}

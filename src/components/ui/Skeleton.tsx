// ============================================================
// src/components/ui/Skeleton.tsx — Skeleton Loading Component
// ============================================================
import { type ReactNode } from 'react';

function cn(...classes: (string | undefined | false)[]) {
  return classes.filter(Boolean).join(' ');
}

interface SkeletonProps {
  className?: string;
  variant?: 'text' | 'circular' | 'rectangular';
  width?: string | number;
  height?: string | number;
  lines?: number;
}

export function Skeleton({
  className,
  variant = 'text',
  width,
  height,
  lines = 1,
}: SkeletonProps) {
  const base = 'animate-pulse bg-gray-200 dark:bg-gray-700 rounded';

  if (variant === 'circular') {
    return (
      <div
        className={cn(base, 'rounded-full', className)}
        style={{ width: width || 40, height: height || 40 }}
        aria-hidden="true"
      />
    );
  }

  if (variant === 'rectangular') {
    return (
      <div
        className={cn(base, className)}
        style={{ width: width || '100%', height: height || 200 }}
        aria-hidden="true"
      />
    );
  }

  return (
    <div className="space-y-2" aria-hidden="true" role="status" aria-label="Carregando...">
      {Array.from({ length: lines }).map((_, i) => (
        <div
          key={i}
          className={cn(base, 'h-4', className)}
          style={{
            width: i === lines - 1 ? '60%' : i % 2 === 0 ? '100%' : '80%',
          }}
        />
      ))}
    </div>
  );
}

// ============================================================
// Skeleton presets DRY
// ============================================================

export function CardSkeleton() {
  return (
    <div className="p-4 border rounded-lg space-y-3">
      <Skeleton variant="rectangular" height={160} className="rounded-lg" />
      <Skeleton lines={1} className="w-3/4" />
      <Skeleton lines={2} />
      <div className="flex gap-2 pt-2">
        <Skeleton variant="rectangular" width={80} height={32} />
        <Skeleton variant="rectangular" width={80} height={32} />
      </div>
    </div>
  );
}

export function TableSkeleton({ rows = 5, cols = 4 }: { rows?: number; cols?: number }) {
  return (
    <div className="w-full space-y-2">
      {/* Header */}
      <div className="flex gap-4 p-3 border-b">
        {Array.from({ length: cols }).map((_, i) => (
          <Skeleton key={i} className="h-4 flex-1" />
        ))}
      </div>
      {/* Rows */}
      {Array.from({ length: rows }).map((_, row) => (
        <div key={row} className="flex gap-4 p-3">
          {Array.from({ length: cols }).map((_, col) => (
            <Skeleton key={col} className="h-4 flex-1" />
          ))}
        </div>
      ))}
    </div>
  );
}

export function UserListSkeleton({ count = 5 }: { count?: number }) {
  return (
    <div className="space-y-4">
      {Array.from({ length: count }).map((_, i) => (
        <div key={i} className="flex items-center gap-4 p-4 border rounded-lg">
          <Skeleton variant="circular" width={48} height={48} />
          <div className="flex-1 space-y-2">
            <Skeleton className="h-4 w-1/3" />
            <Skeleton className="h-3 w-1/2" />
          </div>
          <Skeleton variant="rectangular" width={80} height={32} />
        </div>
      ))}
    </div>
  );
}

export function FormSkeleton({ fields = 4 }: { fields?: number }) {
  return (
    <div className="space-y-6 max-w-md">
      {Array.from({ length: fields }).map((_, i) => (
        <div key={i} className="space-y-2">
          <Skeleton className="h-4 w-24" />
          <Skeleton variant="rectangular" height={40} className="rounded-md" />
        </div>
      ))}
      <Skeleton variant="rectangular" width={120} height={40} className="rounded-md" />
    </div>
  );
}

export function PageHeaderSkeleton() {
  return (
    <div className="flex flex-col sm:flex-row justify-between gap-4 mb-6">
      <Skeleton className="h-8 w-48" />
      <div className="flex gap-2">
        <Skeleton variant="rectangular" width={120} height={40} className="rounded-md" />
        <Skeleton variant="rectangular" width={40} height={40} className="rounded-md" />
      </div>
    </div>
  );
}

// ============================================================
// HOC: withSkeleton — Envolve componente com skeleton automático
// ============================================================
export function withSkeleton<P extends object>(
  Component: React.ComponentType<P>,
  SkeletonFallback: React.ComponentType
) {
  return function SkeletonWrapper({ isLoading, ...props }: P & { isLoading: boolean }) {
    if (isLoading) return <SkeletonFallback />;
    return <Component {...(props as P)} />;
  };
}

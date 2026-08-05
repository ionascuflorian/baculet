import {
  Skeleton,
  SkeletonCircle,
  SkeletonLine,
} from "@/components/ui/skeleton";
import { cn } from "@/lib/utils";

function SkeletonCard({
  title,
  className,
  children,
}: {
  title?: boolean;
  className?: string;
  children?: React.ReactNode;
}) {
  return (
    <section
      aria-hidden
      className={cn(
        "surface flex flex-col rounded-[1.25rem] p-5",
        className
      )}
    >
      {title && (
        <header className="mb-4 flex items-center justify-between gap-2">
          <div className="flex items-center gap-2">
            <Skeleton className="size-4 rounded-[0.35rem]" />
            <SkeletonLine className="h-3 w-24" />
          </div>
        </header>
      )}
      {children}
    </section>
  );
}

function GreetingSkeleton() {
  return (
    <SkeletonCard>
      <div className="flex items-center gap-3">
        <SkeletonCircle className="size-11" />
        <div className="flex-1 space-y-2">
          <SkeletonLine className="h-4 w-40 max-w-full" />
          <SkeletonLine className="h-3 w-24" />
        </div>
      </div>
    </SkeletonCard>
  );
}

function BacCountdownSkeleton() {
  return (
    <SkeletonCard title>
      <div className="flex items-center justify-between gap-2">
        {[0, 1, 2].map((i) => (
          <div key={i} className="flex flex-col items-center gap-2">
            <Skeleton className="h-12 w-12 rounded-xl" />
            <SkeletonLine className="h-2.5 w-8" />
          </div>
        ))}
      </div>
    </SkeletonCard>
  );
}

function ResumeSkeleton() {
  return (
    <SkeletonCard title>
      <div className="space-y-3">
        <SkeletonLine className="h-4 w-3/4" />
        <Skeleton className="h-2.5 w-full rounded-full" />
        <SkeletonLine className="h-3 w-1/2" />
        <div className="flex items-center gap-2 pt-1">
          <Skeleton className="size-8 rounded-xl" />
          <div className="flex-1 space-y-2">
            <SkeletonLine className="h-3 w-2/3" />
            <SkeletonLine className="h-2.5 w-1/3" />
          </div>
        </div>
      </div>
    </SkeletonCard>
  );
}

function WeatherSkeleton() {
  return (
    <SkeletonCard title>
      <div className="flex items-center gap-4">
        <Skeleton className="size-14 rounded-2xl" />
        <div className="flex-1 space-y-2">
          <SkeletonLine className="h-6 w-16" />
          <SkeletonLine className="h-3 w-24" />
        </div>
      </div>
      <div className="mt-4 grid grid-cols-3 gap-2">
        {[0, 1, 2].map((i) => (
          <div key={i} className="flex flex-col items-center gap-1.5 rounded-xl bg-ink/5 px-2 py-2">
            <Skeleton className="size-6 rounded-lg" />
            <SkeletonLine className="h-2.5 w-6" />
          </div>
        ))}
      </div>
    </SkeletonCard>
  );
}

function StreaksSkeleton() {
  return (
    <SkeletonCard title>
      <div className="mb-4 flex items-center justify-between gap-3">
        <div className="space-y-2">
          <SkeletonLine className="h-7 w-16" />
          <SkeletonLine className="h-3 w-48 max-w-full" />
        </div>
        <Skeleton className="size-9 rounded-full" />
      </div>
      <div className="flex gap-[3px]">
        {Array.from({ length: 20 }).map((_, w) => (
          <div key={w} className="flex flex-col gap-[3px]">
            {Array.from({ length: 7 }).map((_, d) => (
              <Skeleton
                key={d}
                className="h-2.5 w-2.5 rounded-[3px]"
              />
            ))}
          </div>
        ))}
      </div>
    </SkeletonCard>
  );
}

function TodoSkeleton() {
  return (
    <SkeletonCard title>
      <div className="space-y-3">
        {[0, 1, 2].map((i) => (
          <div key={i} className="flex items-center gap-3">
            <Skeleton className="size-4 rounded-md" />
            <SkeletonLine className="h-3.5 w-2/3" />
          </div>
        ))}
      </div>
    </SkeletonCard>
  );
}

function CalendarSkeleton() {
  return (
    <SkeletonCard title>
      <div className="space-y-3">
        {[0, 1, 2].map((i) => (
          <div key={i} className="flex items-center gap-3">
            <Skeleton className="size-8 rounded-lg" />
            <div className="flex-1 space-y-2">
              <SkeletonLine className="h-3 w-3/4" />
              <SkeletonLine className="h-2.5 w-1/2" />
            </div>
          </div>
        ))}
      </div>
    </SkeletonCard>
  );
}

export function DashboardSkeleton() {
  return (
    <div aria-busy className="space-y-5">
      <div className="flex items-center justify-between gap-3">
        <div className="space-y-2">
          <SkeletonLine className="h-7 w-44 max-w-full" />
          <SkeletonLine className="h-3.5 w-64 max-w-full" />
        </div>
        <SkeletonCircle className="size-9" />
      </div>

      <div className="grid grid-cols-1 gap-5 md:grid-cols-2 lg:grid-cols-3">
        <GreetingSkeleton />
        <BacCountdownSkeleton />
        <ResumeSkeleton />
        <WeatherSkeleton />
        <StreaksSkeleton />
        <TodoSkeleton />
        <CalendarSkeleton />
      </div>

      <section
        aria-hidden
        className="surface rounded-[1.25rem] p-5"
      >
        <header className="mb-3 flex items-center justify-between">
          <SkeletonLine className="h-4 w-32" />
          <SkeletonLine className="h-3.5 w-24" />
        </header>
        <div className="grid gap-3 sm:grid-cols-2">
          {[0, 1].map((i) => (
            <div key={i} className="flex items-center justify-between rounded-xl p-3">
              <div className="flex-1 space-y-2">
                <SkeletonLine className="h-3.5 w-2/3" />
                <SkeletonLine className="h-2.5 w-1/3" />
              </div>
              <Skeleton className="h-6 w-10 rounded-md" />
            </div>
          ))}
        </div>
      </section>
    </div>
  );
}

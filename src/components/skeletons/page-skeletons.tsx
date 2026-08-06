import {
  Skeleton,
  SkeletonCircle,
  SkeletonLine,
} from "@/components/ui/skeleton";
import { cn } from "@/lib/utils";

export function PageHeaderSkeleton({
  titleWidth = "w-48",
  subWidth = "w-64",
}: {
  titleWidth?: string;
  subWidth?: string;
}) {
  return (
    <div className="space-y-2">
      <SkeletonLine className={cn("h-7", titleWidth)} />
      <SkeletonLine className={cn("h-3.5", subWidth)} />
    </div>
  );
}

/** Grid/listă de carduri generice (materii, teste, subiecte BAC, progres). */
export function ListPageSkeleton({
  header = true,
  columns = 3,
  items = 6,
}: {
  header?: boolean;
  columns?: number;
  items?: number;
}) {
  return (
    <div className="space-y-5">
      {header && <PageHeaderSkeleton />}
      <div
        className={cn(
          "skeleton-stagger grid grid-cols-1 gap-4",
          columns === 2 && "md:grid-cols-2",
          columns === 3 && "md:grid-cols-2 lg:grid-cols-3"
        )}
      >
        {Array.from({ length: items }).map((_, i) => (
          <section
            key={i}
            aria-hidden
            className="skeleton-card surface flex items-center gap-4 rounded-2xl p-4"
          >
            <Skeleton className="size-11 shrink-0 rounded-xl" />
            <div className="flex-1 space-y-2">
              <SkeletonLine className="h-4 w-3/4" />
              <SkeletonLine className="h-3 w-1/2" />
            </div>
            <Skeleton className="size-5 shrink-0 rounded-md" />
          </section>
        ))}
      </div>
    </div>
  );
}

/** Pagina unei materii (listă de capitole cu bara de progres). */
export function SubjectDetailSkeleton() {
  return (
    <div className="mx-auto max-w-3xl space-y-6">
      <div className="space-y-2">
        <SkeletonLine className="h-4 w-24" />
        <SkeletonLine className="h-8 w-72 max-w-full" />
        <Skeleton className="h-2.5 w-full rounded-full" />
      </div>
      <div className="skeleton-stagger space-y-3">
        {[0, 1, 2, 3].map((i) => (
          <section
            key={i}
            aria-hidden
            className="skeleton-card surface flex items-center justify-between rounded-2xl p-4"
          >
            <div className="flex items-center gap-3">
              <Skeleton className="size-9 rounded-xl" />
              <div className="space-y-2">
                <SkeletonLine className="h-4 w-48 max-w-full" />
                <SkeletonLine className="h-3 w-24" />
              </div>
            </div>
            <Skeleton className="size-5 rounded-md" />
          </section>
        ))}
      </div>
    </div>
  );
}

/** Pagina unui capitol (listă de lecții + teste). */
export function ChapterDetailSkeleton() {
  return (
    <div className="mx-auto max-w-3xl space-y-6">
      <div className="space-y-2">
        <SkeletonLine className="h-4 w-24" />
        <SkeletonLine className="h-8 w-64 max-w-full" />
        <SkeletonLine className="h-3.5 w-52" />
      </div>
      <div className="skeleton-stagger space-y-3">
        {[0, 1, 2].map((i) => (
          <section
            key={i}
            aria-hidden
            className="skeleton-card surface flex items-center gap-4 rounded-2xl p-4"
          >
            <SkeletonCircle className="size-9" />
            <div className="flex-1 space-y-2">
              <SkeletonLine className="h-4 w-2/3" />
              <SkeletonLine className="h-3 w-20" />
            </div>
            <Skeleton className="size-6 rounded-full" />
          </section>
        ))}
      </div>
    </div>
  );
}

/** Pagina unei lecții (conținut + butoane). */
export function LessonSkeleton() {
  return (
    <div className="mx-auto max-w-3xl space-y-6">
      <div className="space-y-3">
        <SkeletonLine className="h-4 w-20" />
        <div className="flex items-center gap-2">
          <Skeleton className="h-6 w-20 rounded-full" />
          <Skeleton className="h-6 w-24 rounded-full" />
        </div>
        <SkeletonLine className="h-8 w-80 max-w-full" />
      </div>
      <section aria-hidden className="skeleton-card surface rounded-2xl p-6">
        <div className="space-y-3">
          <SkeletonLine className="h-4 w-full" />
          <SkeletonLine className="h-4 w-11/12" />
          <SkeletonLine className="h-4 w-4/5" />
          <SkeletonLine className="h-4 w-full" />
          <SkeletonLine className="h-4 w-2/3" />
        </div>
      </section>
      <div className="grid grid-cols-2 gap-3">
        <Skeleton className="h-13 rounded-full" />
        <Skeleton className="h-13 rounded-full" />
      </div>
    </div>
  );
}

/** Pagina unui test grilă (intro / întrebări). */
export function QuizSkeleton() {
  return (
    <div className="mx-auto max-w-xl space-y-6 text-center">
      <Skeleton className="mx-auto size-16 rounded-3xl" />
      <div className="space-y-2">
        <SkeletonLine className="mx-auto h-8 w-72 max-w-full" />
        <SkeletonLine className="mx-auto h-3.5 w-56" />
      </div>
      <Skeleton className="mx-auto h-11 w-48 rounded-full" />
    </div>
  );
}

/** Pagina cont. */
export function AccountSkeleton() {
  return (
    <div className="mx-auto max-w-2xl space-y-5">
      <PageHeaderSkeleton />
      <section aria-hidden className="skeleton-card surface flex items-center gap-4 rounded-2xl p-5">
        <SkeletonCircle className="size-16" />
        <div className="flex-1 space-y-2">
          <SkeletonLine className="h-5 w-40" />
          <SkeletonLine className="h-3.5 w-56" />
        </div>
      </section>
      <div className="skeleton-stagger space-y-3">
        {[0, 1, 2, 3].map((i) => (
          <section
            key={i}
            aria-hidden
            className="skeleton-card surface flex items-center justify-between rounded-2xl p-4"
          >
            <div className="flex items-center gap-3">
              <Skeleton className="size-9 rounded-xl" />
              <SkeletonLine className="h-4 w-44 max-w-full" />
            </div>
            <Skeleton className="size-5 rounded-md" />
          </section>
        ))}
      </div>
    </div>
  );
}

/** Pagină admin generică (formulare / tabele). */
export function AdminSkeleton() {
  return (
    <div className="space-y-5">
      <PageHeaderSkeleton titleWidth="w-40" subWidth="w-56" />
      <section aria-hidden className="skeleton-card surface rounded-2xl p-5">
        <div className="skeleton-stagger space-y-3">
          {[0, 1, 2].map((i) => (
            <div key={i} className="flex items-center gap-3">
              <SkeletonLine className="h-4 w-1/3" />
              <SkeletonLine className="h-4 w-1/4" />
              <div className="ml-auto flex gap-2">
                <Skeleton className="h-8 w-20 rounded-full" />
                <Skeleton className="h-8 w-20 rounded-full" />
              </div>
            </div>
          ))}
        </div>
      </section>
    </div>
  );
}

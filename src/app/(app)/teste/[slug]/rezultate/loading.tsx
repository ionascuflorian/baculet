import { Skeleton, SkeletonLine } from "@/components/ui/skeleton";

export default function Loading() {
  return (
    <div className="mx-auto max-w-3xl space-y-6">
      <Skeleton className="h-8 w-32 rounded-full" />
      <section aria-hidden className="skeleton-card surface rounded-[1.25rem] p-8">
        <div className="flex flex-col items-center gap-3 text-center">
          <Skeleton className="size-20 rounded-2xl" />
          <SkeletonLine className="h-7 w-48" />
          <SkeletonLine className="h-3.5 w-64" />
          <Skeleton className="h-8 w-40 rounded-full" />
        </div>
      </section>
      <div className="space-y-3">
        <SkeletonLine className="h-6 w-28" />
        {[0, 1, 2].map((i) => (
          <section key={i} aria-hidden className="skeleton-card surface rounded-2xl p-4">
            <div className="flex items-start gap-3">
              <Skeleton className="size-5 rounded-md" />
              <div className="flex-1 space-y-2">
                <SkeletonLine className="h-4 w-3/4" />
                <SkeletonLine className="h-3 w-1/2" />
              </div>
            </div>
          </section>
        ))}
      </div>
    </div>
  );
}

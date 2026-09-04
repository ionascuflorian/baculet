import {
  Skeleton,
  SkeletonCircle,
  SkeletonLine,
} from "@/components/ui/skeleton";
import { cn } from "@/lib/utils";

export function PageHeaderSkeleton({
  titleWidth = "w-56",
  subWidth = "w-72",
}: {
  titleWidth?: string;
  subWidth?: string;
}) {
  return (
    <div className="space-y-2">
      <SkeletonLine className={cn("h-8", titleWidth)} />
      <SkeletonLine className={cn("h-4", subWidth)} />
    </div>
  );
}

/** Lista de materii (carduri verticale cu iconiță, progres și profiluri). */
export function SubjectGridSkeleton({ items = 6 }: { items?: number }) {
  return (
    <div aria-busy className="space-y-6">
      <section className="space-y-2">
        <SkeletonLine className="h-8 w-40" />
        <SkeletonLine className="h-4 w-72 max-w-full" />
      </section>
      <div className="skeleton-stagger grid gap-5 sm:grid-cols-2 lg:grid-cols-3">
        {Array.from({ length: items }).map((_, i) => (
          <section key={i} className="skeleton-card surface rounded-3xl p-5">
            <div className="mb-4 flex items-start justify-between">
              <Skeleton className="size-12 rounded-2xl" />
              <Skeleton className="size-5 rounded-md" />
            </div>
            <SkeletonLine className="h-6 w-3/4" />
            <SkeletonLine className="mt-2 h-3.5 w-full" />
            <div className="mt-4 space-y-2">
              <div className="flex items-center justify-between">
                <SkeletonLine className="h-3 w-28" />
                <SkeletonLine className="h-3 w-10" />
              </div>
              <Skeleton className="h-3 w-full rounded-full" />
              <SkeletonLine className="h-3 w-24" />
            </div>
            <div className="mt-3 flex gap-1.5">
              <Skeleton className="h-5 w-12 rounded-full" />
              <Skeleton className="h-5 w-16 rounded-full" />
            </div>
          </section>
        ))}
      </div>
    </div>
  );
}

/** Grid/listă de carduri generice (fallback). */
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

/** Pagina unei materii (back, header cu iconiță, CTA „Continuă", traseu cu unități, teste). */
export function SubjectDetailSkeleton() {
  return (
    <div aria-busy className="space-y-6">
      <Skeleton className="h-4 w-28 rounded-full" />

      <div className="flex items-center gap-4">
        <Skeleton className="h-12 w-12 shrink-0 rounded-2xl" />
        <div className="min-w-0 flex-1 space-y-2">
          <SkeletonLine className="h-8 w-2/3 sm:w-80" />
          <SkeletonLine className="h-3.5 w-3/4" />
          <div className="flex flex-wrap gap-1.5 pt-0.5">
            <Skeleton className="h-5 w-14 rounded-full" />
            <Skeleton className="h-5 w-20 rounded-full" />
          </div>
        </div>
      </div>

      <section className="skeleton-card surface rounded-2xl p-5">
        <SkeletonLine className="h-3 w-28" />
        <SkeletonLine className="mt-2 h-5 w-3/4" />
        <SkeletonLine className="h-3.5 w-1/2" />
        <Skeleton className="mt-3 h-8 w-28 rounded-full" />
      </section>

      <div className="space-y-8">
        <div className="space-y-2">
          <SkeletonLine className="h-6 w-64" />
          <SkeletonLine className="h-3.5 w-80 max-w-full" />
        </div>
        {[0, 1].map((ch) => (
          <section key={ch} className="space-y-4">
            <div className="flex items-center gap-3">
              <Skeleton className="h-px flex-1" />
              <SkeletonLine className="h-3 w-40" />
              <Skeleton className="h-px flex-1" />
            </div>
            <div className="skeleton-stagger space-y-3">
              {[0, 1, 2].map((i) => (
                <div key={i} className="flex items-center gap-3">
                  <SkeletonCircle className="size-10 shrink-0" />
                  <div className="flex-1 rounded-2xl border border-feather/60 bg-card p-4">
                    <SkeletonLine className="h-4 w-2/3" />
                    <SkeletonLine className="mt-1.5 h-3 w-1/3" />
                    <Skeleton className="mt-2 h-1.5 w-full rounded-full" />
                  </div>
                </div>
              ))}
            </div>
          </section>
        ))}
      </div>

      <div className="space-y-4">
        <SkeletonLine className="h-6 w-24" />
        <div className="grid gap-4 sm:grid-cols-2">
          {[0, 1].map((i) => (
            <section key={i} className="skeleton-card surface flex items-center gap-4 rounded-2xl p-4">
              <Skeleton className="size-11 shrink-0 rounded-2xl" />
              <div className="flex-1 space-y-2">
                <SkeletonLine className="h-4 w-3/4" />
                <SkeletonLine className="h-3 w-2/3" />
              </div>
            </section>
          ))}
        </div>
      </div>
    </div>
  );
}

/** Pagina unui modul (listă de lecții cu număr, progres pe pași și teste pe modul). */
export function ChapterDetailSkeleton() {
  return (
    <div aria-busy className="mx-auto max-w-3xl space-y-6">
      <Skeleton className="h-4 w-28 rounded-full" />
      <div className="space-y-2">
        <SkeletonLine className="h-8 w-72 max-w-full" />
        <SkeletonLine className="h-3.5 w-52" />
      </div>
      <div className="skeleton-stagger space-y-3">
        {[0, 1, 2].map((i) => (
          <section key={i} className="skeleton-card surface flex items-center gap-4 rounded-2xl p-4">
            <Skeleton className="size-9 shrink-0 rounded-full" />
            <div className="min-w-0 flex-1 space-y-2">
              <div className="flex flex-wrap items-center gap-2">
                <SkeletonLine className="h-4 w-1/2" />
                <Skeleton className="h-4 w-20 rounded-full" />
              </div>
              <SkeletonLine className="h-3 w-32" />
              <Skeleton className="h-2 w-32 rounded-full" />
            </div>
            <Skeleton className="size-6 shrink-0 rounded-full" />
          </section>
        ))}
      </div>
      <div className="space-y-3">
        <SkeletonLine className="h-5 w-48" />
        {[0, 1].map((i) => (
          <section key={i} className="skeleton-card surface flex items-center justify-between rounded-2xl p-4">
            <div className="flex items-center gap-3">
              <Skeleton className="size-9 rounded-full" />
              <SkeletonLine className="h-4 w-40" />
            </div>
            <Skeleton className="size-5 rounded-md" />
          </section>
        ))}
      </div>
    </div>
  );
}

/** Pagina unei lecții (bara de progres cu cercuri de pași, card de pas, comenzi). */
export function LessonSkeleton() {
  return (
    <div aria-busy className="mx-auto max-w-3xl space-y-6">
      <Skeleton className="h-4 w-28 rounded-full" />
      <div className="flex items-center gap-2">
        <Skeleton className="h-6 w-20 rounded-full" />
        <Skeleton className="h-6 w-24 rounded-full" />
      </div>
      <SkeletonLine className="h-8 w-80 max-w-full" />

      <section className="skeleton-card surface rounded-2xl p-4">
        <div className="mb-1.5 flex items-center justify-between">
          <SkeletonLine className="h-3 w-24" />
          <SkeletonLine className="h-3 w-36" />
        </div>
        <Skeleton className="h-2.5 w-full rounded-full" />
        <div className="mt-3 flex gap-2">
          {[0, 1, 2, 3, 4].map((i) => (
            <Skeleton
              key={i}
              className={cn("size-8 shrink-0 rounded-full", i === 0 && "scale-105")}
            />
          ))}
        </div>
      </section>

      <div className="rounded-2xl border border-feather p-5 sm:p-6">
        <div className="flex flex-wrap gap-2">
          <Skeleton className="h-5 w-24 rounded-full" />
          <Skeleton className="h-5 w-20 rounded-full" />
        </div>
        <SkeletonLine className="mt-3 h-6 w-3/4" />
        <div className="mt-3 space-y-2">
          <SkeletonLine className="h-4 w-full" />
          <SkeletonLine className="h-4 w-11/12" />
          <SkeletonLine className="h-4 w-4/5" />
          <SkeletonLine className="h-4 w-full" />
        </div>
        <div className="mt-4 rounded-xl bg-feather/50 p-3">
          <div className="flex items-center justify-between">
            <SkeletonLine className="h-3 w-36" />
            <SkeletonLine className="h-3 w-20" />
          </div>
          <Skeleton className="mt-2 h-2 w-full rounded-full" />
        </div>
      </div>

      <div className="flex items-center justify-between gap-3">
        <Skeleton className="h-9 w-24 rounded-full" />
        <div className="flex items-center gap-2">
          <Skeleton className="h-9 w-40 rounded-full" />
          <Skeleton className="h-9 w-28 rounded-full" />
        </div>
      </div>
    </div>
  );
}

/** Pagina unui test grilă (back, istoric, intro cu start). */
export function QuizSkeleton() {
  return (
    <div aria-busy className="mx-auto max-w-3xl space-y-6">
      <div className="flex items-center justify-between">
        <Skeleton className="h-4 w-28 rounded-full" />
        <Skeleton className="h-8 w-40 rounded-full" />
      </div>
      <section className="skeleton-card surface flex items-center gap-2 rounded-xl p-4">
        <Skeleton className="size-4 rounded-md" />
        <SkeletonLine className="h-3.5 w-56" />
      </section>
      <div className="mx-auto max-w-xl space-y-6 text-center">
        <Skeleton className="mx-auto size-16 rounded-3xl" />
        <div className="space-y-2">
          <SkeletonLine className="mx-auto h-8 w-72 max-w-full" />
          <SkeletonLine className="mx-auto h-3.5 w-60" />
        </div>
        <Skeleton className="mx-auto h-11 w-48 rounded-full" />
      </div>
    </div>
  );
}

/** Pagina de rezultate la un test (scor mare + detalii pe întrebări). */
export function QuizResultsSkeleton() {
  return (
    <div aria-busy className="mx-auto max-w-3xl space-y-6">
      <Skeleton className="h-4 w-28 rounded-full" />
      <section aria-hidden className="skeleton-card surface rounded-[1.25rem] p-8 text-center">
        <div className="flex flex-col items-center gap-3">
          <Skeleton className="size-20 rounded-2xl" />
          <SkeletonLine className="h-7 w-56" />
          <SkeletonLine className="h-3.5 w-64" />
          <Skeleton className="h-8 w-40 rounded-full" />
        </div>
      </section>
      <div className="space-y-4">
        <SkeletonLine className="h-5 w-24" />
        {[0, 1, 2].map((i) => (
          <section key={i} className="skeleton-card surface rounded-2xl p-4">
            <div className="flex items-start gap-3">
              <Skeleton className="mt-0.5 size-5 shrink-0 rounded-md" />
              <div className="flex-1 space-y-2">
                <SkeletonLine className="h-4 w-3/4" />
                <div className="space-y-1.5 pt-1">
                  {[0, 1, 2].map((o) => (
                    <Skeleton key={o} className="h-8 rounded-xl" />
                  ))}
                </div>
                <Skeleton className="h-8 rounded-xl" />
              </div>
            </div>
          </section>
        ))}
      </div>
    </div>
  );
}

/** Pagina cont (profil cu avatar, tabs de setări, formular). */
export function AccountSkeleton() {
  return (
    <div aria-busy className="mx-auto max-w-2xl space-y-6">
      <section className="skeleton-card surface flex items-center gap-4 rounded-3xl p-5">
        <Skeleton className="size-20 shrink-0 rounded-3xl" />
        <div className="min-w-0 flex-1 space-y-2">
          <SkeletonLine className="h-6 w-44 max-w-full" />
          <SkeletonLine className="h-3.5 w-56" />
          <div className="flex flex-wrap gap-2 pt-0.5">
            <Skeleton className="h-7 w-16 rounded-xl" />
            <Skeleton className="h-6 w-20 rounded-full" />
            <Skeleton className="h-6 w-32 rounded-full" />
          </div>
        </div>
      </section>
      <div className="flex gap-2 overflow-x-auto pb-1">
        {[0, 1, 2, 3, 4].map((i) => (
          <Skeleton key={i} className="h-9 w-28 shrink-0 rounded-full" />
        ))}
      </div>
      <section className="skeleton-card surface rounded-3xl p-5">
        <div className="skeleton-stagger space-y-4">
          {[0, 1, 2, 3].map((i) => (
            <div key={i} className="space-y-2">
              <SkeletonLine className="h-3 w-32" />
              <Skeleton className="h-10 w-full rounded-xl" />
            </div>
          ))}
        </div>
      </section>
    </div>
  );
}

/** Pagina progres (statistici, progres pe materii, insigne, istoric teste). */
export function ProgressSkeleton() {
  return (
    <div aria-busy className="space-y-6">
      <section className="space-y-2">
        <SkeletonLine className="h-8 w-64" />
        <SkeletonLine className="h-4 w-72 max-w-full" />
      </section>
      <div className="grid grid-cols-2 gap-4 lg:grid-cols-4">
        {[0, 1, 2, 3].map((i) => (
          <section key={i} className="skeleton-card surface flex items-center gap-4 rounded-2xl p-4">
            <Skeleton className="size-12 shrink-0 rounded-2xl" />
            <div className="flex-1 space-y-2">
              <SkeletonLine className="h-5 w-14" />
              <SkeletonLine className="h-3 w-20" />
            </div>
          </section>
        ))}
      </div>
      <div className="skeleton-stagger space-y-4">
        <section className="skeleton-card surface rounded-2xl p-5">
          <SkeletonLine className="mb-4 h-5 w-44" />
          {[0, 1, 2].map((i) => (
            <div key={i} className="space-y-2 py-1">
              <div className="flex items-center justify-between">
                <SkeletonLine className="h-4 w-40" />
                <SkeletonLine className="h-3 w-20" />
              </div>
              <Skeleton className="h-2.5 w-full rounded-full" />
            </div>
          ))}
        </section>
        <section className="skeleton-card surface rounded-2xl p-5">
          <SkeletonLine className="mb-4 h-5 w-32" />
          <div className="flex flex-wrap gap-2">
            {[0, 1, 2, 3, 4].map((i) => (
              <Skeleton key={i} className="size-12 rounded-full" />
            ))}
          </div>
        </section>
        <section className="skeleton-card surface rounded-2xl p-5">
          <SkeletonLine className="mb-4 h-5 w-36" />
          {[0, 1, 2].map((i) => (
            <div key={i} className="flex items-center justify-between gap-3 py-1.5">
              <div className="flex-1 space-y-2">
                <SkeletonLine className="h-3.5 w-1/2" />
                <SkeletonLine className="h-3 w-1/3" />
              </div>
              <Skeleton className="h-2.5 w-24 rounded-full" />
              <SkeletonLine className="h-3.5 w-10" />
            </div>
          ))}
        </section>
      </div>
    </div>
  );
}

/** Subiecte BAC (filtre + listă cu sesiune/an și buton de descărcare). */
export function BacExamsSkeleton() {
  return (
    <div aria-busy className="space-y-6">
      <section className="space-y-2">
        <SkeletonLine className="h-8 w-72 max-w-full" />
        <SkeletonLine className="h-4 w-80 max-w-full" />
      </section>
      <section className="skeleton-card surface rounded-2xl p-4">
        <div className="grid gap-4 sm:grid-cols-3">
          {[0, 1, 2].map((i) => (
            <div key={i} className="space-y-2">
              <SkeletonLine className="h-3 w-16" />
              <Skeleton className="h-10 w-full rounded-xl" />
            </div>
          ))}
        </div>
      </section>
      <div className="skeleton-stagger space-y-3">
        {[0, 1, 2, 3].map((i) => (
          <section key={i} className="skeleton-card surface flex items-center justify-between rounded-2xl p-4">
            <div className="flex items-center gap-3">
              <Skeleton className="size-11 shrink-0 rounded-xl" />
              <div className="min-w-0 space-y-2">
                <SkeletonLine className="h-4 w-56 max-w-full" />
                <div className="flex gap-2">
                  <Skeleton className="h-5 w-16 rounded-full" />
                  <Skeleton className="h-5 w-12 rounded-full" />
                </div>
              </div>
            </div>
            <Skeleton className="h-8 w-28 rounded-full" />
          </section>
        ))}
      </div>
    </div>
  );
}

/** Pagini admin (titlu, carduri de statistici, listă de acțiuni/randuri). */
export function AdminSkeleton() {
  return (
    <div aria-busy className="space-y-6">
      <section className="space-y-2">
        <SkeletonLine className="h-8 w-48" />
        <SkeletonLine className="h-4 w-80 max-w-full" />
      </section>
      <div className="grid gap-4 sm:grid-cols-2 lg:grid-cols-3">
        {[0, 1, 2, 3, 4, 5].map((i) => (
          <section key={i} className="skeleton-card surface flex items-center gap-4 rounded-2xl p-4">
            <Skeleton className="size-11 shrink-0 rounded-2xl" />
            <div className="flex-1 space-y-2">
              <SkeletonLine className="h-5 w-16" />
              <SkeletonLine className="h-3 w-24" />
            </div>
          </section>
        ))}
      </div>
      <section className="skeleton-card surface rounded-2xl p-5">
        <SkeletonLine className="mb-4 h-5 w-36" />
        <div className="skeleton-stagger space-y-3">
          {[0, 1, 2, 3].map((i) => (
            <div key={i} className="flex items-center gap-3">
              <SkeletonLine className="h-4 flex-1" />
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
import { cn } from "@/lib/utils";

export function Skeleton({
  className,
  rounded = true,
}: {
  className?: string;
  rounded?: boolean;
}) {
  return (
    <div
      aria-hidden
      className={cn(
        "skeleton",
        rounded ? "rounded-[0.5rem]" : "rounded-none",
        className
      )}
    />
  );
}

export function SkeletonLine({
  className,
  w,
}: {
  className?: string;
  w?: string;
}) {
  return <Skeleton className={cn("h-3", w ?? "w-full", className)} />;
}

export function SkeletonCircle({
  className,
}: {
  className?: string;
}) {
  return <Skeleton className={cn("size-9 rounded-full", className)} />;
}

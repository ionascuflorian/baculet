import { cn } from "@/lib/utils";

interface DemoSectionProps {
  id?: string;
  eyebrow: string;
  title: string;
  titleAccent?: string;
  copy: string;
  children: React.ReactNode;
  reversed?: boolean;
  glow?: "brand" | "accent" | "success" | "warning";
}

const glowClass: Record<NonNullable<DemoSectionProps["glow"]>, string> = {
  brand: "bg-accent/15",
  accent: "bg-brand/15",
  success: "bg-success/10",
  warning: "bg-warning/10",
};

export function DemoSection({
  id,
  eyebrow,
  title,
  titleAccent,
  copy,
  children,
  reversed = false,
  glow = "brand",
}: DemoSectionProps) {
  return (
    <section
      id={id}
      className="relative overflow-x-clip py-16 sm:py-24"
    >
      <div
        aria-hidden
        className={cn(
          "pointer-events-none absolute -z-10 h-80 w-80 rounded-full blur-3xl",
          glowClass[glow],
          reversed
            ? "right-[-6rem] top-10 lg:right-8"
            : "left-[-6rem] top-24 lg:left-8"
        )}
      />
      <div className="mx-auto grid w-full max-w-6xl items-center gap-10 px-4 lg:grid-cols-2 lg:gap-16">
        <div className={cn(reversed && "lg:order-2")}>
          <span className="inline-flex items-center gap-2 rounded-full border border-accent/30 bg-accent/10 px-3.5 py-1.5 text-xs font-extrabold uppercase tracking-wider text-accent">
            <span className="relative flex h-1.5 w-1.5">
              <span className="absolute inline-flex h-full w-full animate-ping rounded-full bg-accent opacity-75" />
              <span className="relative inline-flex h-1.5 w-1.5 rounded-full bg-accent" />
            </span>
            {eyebrow}
          </span>
          <h2 className="mt-4 text-3xl font-extrabold leading-tight tracking-tight text-ink sm:text-4xl">
            {title}
            {titleAccent && (
              <span className="bg-gradient-to-r from-accent to-brand-dark bg-clip-text text-transparent">
                {" "}
                {titleAccent}
              </span>
            )}
          </h2>
          <p className="mt-4 max-w-xl text-base leading-relaxed text-subtle sm:text-lg">
            {copy}
          </p>
        </div>
        <div className={cn("min-w-0", reversed && "lg:order-1")}>{children}</div>
      </div>
    </section>
  );
}

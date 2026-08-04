import { cn } from "@/lib/utils";

interface WidgetShellProps {
  title?: string;
  icon?: React.ReactNode;
  className?: string;
  children: React.ReactNode;
  action?: React.ReactNode;
}

export function WidgetShell({
  title,
  icon,
  className,
  children,
  action,
}: WidgetShellProps) {
  return (
    <section
      className={cn("surface flex flex-col rounded-[1.25rem] p-5", className)}
    >
      {(title || action) && (
        <header className="mb-4 flex items-center justify-between gap-2">
          <h2 className="flex items-center gap-2 text-sm font-semibold text-subtle">
            {icon}
            {title}
          </h2>
          {action}
        </header>
      )}
      {children}
    </section>
  );
}
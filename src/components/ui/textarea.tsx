import * as React from "react";
import { cn } from "@/lib/utils";

const Textarea = React.forwardRef<
  HTMLTextAreaElement,
  React.TextareaHTMLAttributes<HTMLTextAreaElement>
>(({ className, ...props }, ref) => (
  <textarea
    ref={ref}
    className={cn(
      "w-full rounded-xl border border-feather bg-card px-4 py-3 text-ink placeholder:text-subtle/70 transition-colors focus:border-accent focus:outline-none focus:ring-2 focus:ring-accent/30",
      className
    )}
    {...props}
  />
));
Textarea.displayName = "Textarea";

export { Textarea };

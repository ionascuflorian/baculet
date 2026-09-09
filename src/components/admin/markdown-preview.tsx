import { memo } from "react";
import { Markdown } from "@/components/markdown";

export const MarkdownPreview = memo(function MarkdownPreview({
  markdown,
}: {
  markdown: string;
}) {
  return (
    <div className="rounded-2xl border-2 border-feather bg-card p-5">
      <p className="mb-3 text-xs font-bold uppercase tracking-wider text-subtle">
        Previizualizare
      </p>
      <Markdown content={markdown} />
    </div>
  );
});
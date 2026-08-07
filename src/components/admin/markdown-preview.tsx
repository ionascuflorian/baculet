import { memo } from "react";
import ReactMarkdown from "react-markdown";
import remarkGfm from "remark-gfm";
import remarkMath from "remark-math";
import rehypeKatex from "rehype-katex";

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
      <div className="prose-lesson">
        <ReactMarkdown
          remarkPlugins={[remarkGfm, remarkMath]}
          rehypePlugins={[[rehypeKatex, { output: "html" }]]}
        >
          {markdown}
        </ReactMarkdown>
      </div>
    </div>
  );
});

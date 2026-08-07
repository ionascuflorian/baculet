"use client";

import { useEffect, useState } from "react";
import {
  BlockNoteEditor,
  BlockNoteSchema,
  defaultBlockSpecs,
  defaultInlineContentSpecs,
} from "@blocknote/core";
import { filterSuggestionItems } from "@blocknote/core/extensions";
import { getDefaultReactSlashMenuItems, SuggestionMenuController } from "@blocknote/react";
import { BlockNoteView } from "@blocknote/mantine";
import {
  getMathSlashMenuItems,
  latexInlineContentSpecs,
  mathBlockSpecs,
} from "@defensestation/blocknote-math";
import {
  collectAndMask,
  postprocessMath,
  preprocessMath,
  promoteDisplayToEquation,
  resolveMarkers,
} from "@/lib/math-bridge";

const schema = BlockNoteSchema.create({
  blockSpecs: { ...defaultBlockSpecs, ...mathBlockSpecs },
  inlineContentSpecs: { ...defaultInlineContentSpecs, ...latexInlineContentSpecs },
});

export function LessonEditor({
  initialMarkdown,
  onChange,
}: {
  initialMarkdown: string;
  onChange: (markdown: string) => void;
}) {
  const [editor, setEditor] = useState<
    BlockNoteEditor<
      typeof schema.blockSchema,
      typeof schema.inlineContentSchema,
      typeof schema.styleSchema
    > | null
  >(null);

  useEffect(() => {
    const editorInstance = BlockNoteEditor.create({ schema });
    if (initialMarkdown.trim()) {
      const { md, eqs } = preprocessMath(initialMarkdown);
      const blocks = editorInstance.tryParseMarkdownToBlocks(md);
      const resolved = promoteDisplayToEquation(resolveMarkers(blocks, eqs));
      if (resolved.length > 0) {
        editorInstance.replaceBlocks(editorInstance.document, resolved);
      }
    }
    setEditor(editorInstance);
    return () => {
      (editorInstance as any)._tiptapEditor.destroy();
    };
  }, []);

  if (!editor) {
    return (
      <div className="h-64 animate-pulse rounded-2xl border-2 border-feather bg-card" />
    );
  }

  return (
    <div className="lesson-editor rounded-2xl border-2 border-[#262626] bg-black">
      <BlockNoteView
        editor={editor}
        theme="dark"
        slashMenu={false}
        onChange={() => {
          const { blocks, eqs } = collectAndMask(editor.document as any);
          onChange(
            postprocessMath(
              editor.blocksToMarkdownLossy(blocks as any),
              eqs
            )
          );
        }}
      >
        <SuggestionMenuController
          triggerCharacter="/"
          getItems={async (query) =>
            filterSuggestionItems(
              [
                ...getDefaultReactSlashMenuItems(editor),
                ...getMathSlashMenuItems(editor),
              ],
              query
            )
          }
        />
      </BlockNoteView>
    </div>
  );
}

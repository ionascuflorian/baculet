"use client";

import { useState } from "react";
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
  type Block,
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
  const [editor] = useState(() => {
    const instance = BlockNoteEditor.create({ schema });
    if (initialMarkdown.trim()) {
      const { md, eqs } = preprocessMath(initialMarkdown);
      const blocks = instance.tryParseMarkdownToBlocks(md);
      // Granița BlockNote ↔ modulul nostru: blocurile proprietare rămân la
      // intrare, bridge-ul returnează structura noastră serializabilă.
      const resolved = promoteDisplayToEquation(resolveMarkers(blocks as unknown as Block[], eqs));
      if (resolved.length > 0) {
        instance.replaceBlocks(
          instance.document,
          resolved as unknown as Parameters<typeof instance.replaceBlocks>[1]
        );
      }
    }
    return instance;
  });

  return (
    <div className="lesson-editor rounded-2xl border-2 border-[#262626] bg-black">
      <BlockNoteView
        editor={editor}
        theme="dark"
        slashMenu={false}
        onChange={() => {
          const { blocks, eqs } = collectAndMask(
            editor.document as unknown as Block[]
          );
          onChange(
            postprocessMath(
              editor.blocksToMarkdownLossy(
                blocks as unknown as Parameters<typeof editor.blocksToMarkdownLossy>[0]
              ),
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
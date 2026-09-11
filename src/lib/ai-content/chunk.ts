// Chunking: grupează paragrafele extrase în unități de retrievare
// (~1200-1800 caractere), ținând evidența paginii și a secțiunii.
import type { ExtractedParagraph } from "./extract";

export interface Chunk {
  text: string;
  page?: number;
  section?: string;
  tokenCount: number;
}

const TARGET_CHARS = 1500;
const MAX_CHARS = 1900;
const MAX_PARAGRAPHS = 40;

export function approximateTokens(text: string): number {
  return Math.ceil(text.length / 4);
}

function isHeading(p: string): boolean {
  return (
    p.length <= 90 &&
    !/[.!?…:;,]$/.test(p) &&
    !p.includes(". #") // nu e o secvență de numere/puncte
  );
}

export function chunkParagraphs(paragraphs: ExtractedParagraph[]): Chunk[] {
  const chunks: Chunk[] = [];
  let buffer: string[] = [];
  let bufferChars = 0;
  let firstPage: number | undefined;
  let currentSection: string | undefined;

  const flush = () => {
    if (buffer.length === 0) return;
    const text = buffer.join("\n\n").trim();
    if (!text) return;
    chunks.push({
      text,
      page: firstPage,
      section: currentSection,
      tokenCount: approximateTokens(text),
    });
    buffer = [];
    bufferChars = 0;
    firstPage = undefined;
  };

  for (const para of paragraphs) {
    const p = para.text.trim();
    if (!p) continue;

    if (isHeading(p) && buffer.length === 0) {
      currentSection = p.slice(0, 100);
    }

    const addChars = p.length + (buffer.length ? 2 : 0);
    if (
      bufferChars > 0 &&
      (bufferChars + addChars > MAX_CHARS || buffer.length >= MAX_PARAGRAPHS)
    ) {
      flush();
    }

    if (buffer.length === 0) firstPage = para.page;
    buffer.push(p);
    bufferChars += addChars;

    if (bufferChars >= TARGET_CHARS) flush();
  }
  flush();

  return chunks.filter((c) => c.tokenCount > 0);
}
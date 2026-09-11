// Extragerea textului din sursele încărcate (PDF / DOCX / TXT / MD).
// IMPORTANT: pdfjs-prep PĂSTRĂ ordinea importurilor — trebuie încărcat înaintea
// `pdf-parse` ca patch-urile globale (worker main-thread, structuredClone fără
// transfer) să fie active când se evaluează pdfjs.
import "@/lib/ai-content/pdfjs-prep";
import { PDFParse } from "pdf-parse";
import * as mammoth from "mammoth";

import { ALLOWED_MIMES } from "@/lib/ai-content/mimes";

export { ALLOWED_MIMES };

export interface ExtractedParagraph {
  text: string;
  page?: number;
}

export interface ExtractResult {
  paragraphs: ExtractedParagraph[];
  pageCount: number;
  charCount: number;
}

function isAllowedMime(mime: string): boolean {
  return mime in ALLOWED_MIMES;
}

function splitToParagraphs(text: string): string[] {
  return text
    .split(/\n{2,}|\r\n{2,}/)
    .map((block) =>
      block
        .split("\n")
        .map((line) => line.trim())
        .filter(Boolean)
        .join("\n")
    )
    .map((b) => b.trim())
    .filter(Boolean);
}

export async function extractText(
  data: Buffer,
  mime: string
): Promise<ExtractResult> {
  if (!isAllowedMime(mime)) {
    throw new Error(`Tip de fișier neacceptat: ${mime}`);
  }

  const kind = ALLOWED_MIMES[mime];

  if (kind === "pdf") {
    return extractPdf(data);
  }
  if (kind === "docx") {
    return extractDocx(data);
  }
  const text = data.toString("utf8");
  return {
    paragraphs: splitToParagraphs(text).map((t) => ({ text: t })),
    pageCount: 1,
    charCount: text.length,
  };
}

async function extractPdf(data: Buffer): Promise<ExtractResult> {
  const parser = new PDFParse({ data });
  try {
    const [info, text] = await Promise.all([parser.getInfo(), parser.getText()]);
    const paragraphs: ExtractedParagraph[] = [];
    for (const page of text.pages) {
      const pageText = typeof page.text === "string" ? page.text : "";
      paragraphs.push(
        ...splitToParagraphs(pageText).map((t) => ({ text: t, page: page.num || undefined }))
      );
    }
    const pageCount = info.total || text.total || paragraphs.length || 1;
    const charCount = text.text?.length ?? paragraphs.reduce((n, p) => n + p.text.length, 0);
    if (charCount < 40) {
      throw new Error(
        "Sursa PDF nu conține text selectabil (probabil un fișier scanat/imagine). Include un PDF cu text sau convertit în DOCX."
      );
    }
    return { paragraphs, pageCount, charCount };
  } finally {
    await parser.destroy().catch(() => {});
  }
}

async function extractDocx(data: Buffer): Promise<ExtractResult> {
  const result = await mammoth.extractRawText({ buffer: data });
  const paragraphs = splitToParagraphs(result.value);
  const charCount = result.value?.length ?? 0;
  if (charCount < 40) {
    throw new Error("Documentul DOCX nu conține text extractibil.");
  }
  return { paragraphs: paragraphs.map((t) => ({ text: t })), pageCount: 1, charCount };
}
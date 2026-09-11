// Constante ușoare pentru sursele Content Studio — fără dependențe grele
// (pdf-parse, mammoth, pdfjs). Împărțite în modul separat ca rutele de upload
// să nu declanșeze importul bibliotecilor de extragere PDF la module-load.
export const ALLOWED_MIMES: Record<string, string> = {
  "application/pdf": "pdf",
  "application/vnd.openxmlformats-officedocument.wordprocessingml.document": "docx",
  "text/plain": "txt",
  "text/markdown": "md",
};

export const SOURCE_PRIORITIES = ["OFFICIAL", "HIGH", "NORMAL", "REFERENCE"] as const;

export const MAX_SOURCE_SIZE = 25 * 1024 * 1024;
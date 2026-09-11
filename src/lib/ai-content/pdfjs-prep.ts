// Pune pdfjs în stare să funcționeze în Node, înainte ca pdf-parse/pdfjs să se
// încarce (acest modul trebuie importat PRIMUL, înaintea lui `pdf-parse`):
//
// 1. Turbopack rescrie `import("./pdf.worker.mjs")` (folosit de pdfjs pentru
//    fake worker) într-un chunk care nu există → „Setting up fake worker
//    failed”. Înregistrăm worker-ul static pe `globalThis.pdfjsWorker`, astfel
//    încât pdfjs îl folosește direct, fără import dinamic.
// 2. Pe Node >= 21, `structuredClone(value, { transfer: [...] })` aruncă
//    DataCloneError când transfer listează un Buffer din pool-ul intern.
//    pdfjs transferă Buffer-uri prin LoopbackPort → „Cannot transfer object of
//    unsupported type”. Nefăcând transfer decât clonare, rămâne corect
//    funcțional și evită eroarea.
import * as pdfjsWorker from "pdfjs-dist/legacy/build/pdf.worker.mjs";
import DOMMatrixPolyfill from "dommatrix";

// pdfjs (via pdf-parse ESM) accesează `DOMMatrix` chiar la module-evaluation;
// Node nu îl expune ca global, iar polyfill-ul din pdfjs sosește prea târziu în
// ordinea de instanțiere a bundle-ului Turbopack ("ReferenceError: DOMMatrix is
// not defined" doar pe build-ul de producție). Îl furnizăm noi, dinainte.
if (!(globalThis as { DOMMatrix?: unknown }).DOMMatrix) {
  (globalThis as unknown as { DOMMatrix: unknown }).DOMMatrix = DOMMatrixPolyfill;
}

(globalThis as { pdfjsWorker?: { WorkerMessageHandler: unknown } }).pdfjsWorker = {
  WorkerMessageHandler: pdfjsWorker.WorkerMessageHandler,
};

const nativeStructuredClone = globalThis.structuredClone;
if (typeof nativeStructuredClone === "function") {
  globalThis.structuredClone = ((value: unknown) => nativeStructuredClone(value)) as typeof nativeStructuredClone;
}
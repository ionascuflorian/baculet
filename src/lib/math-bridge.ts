const EQ_MARK = "\uE000";

const MARKER_RE = /\uE000(EQ|DL|IL)(\d+)\uE000/g;

export interface MathEntry {
  latex: string;
  display: boolean;
}

interface TextNode {
  type: "text";
  text: string;
  styles?: Record<string, unknown>;
}

interface LatexNode {
  type: "latex";
  props: { latex: string; displayMode?: boolean };
}

type InlineNode = TextNode | LatexNode | string;

interface TableRow {
  cells: { content: InlineNode[] }[];
}

export interface Block {
  type: string;
  props?: Record<string, unknown>;
  content?: InlineNode[] | { rows: TableRow[] };
  children?: Block[];
}

/** Înlocuiește $...$ (inline) și $$...$$ (display) cu markeri privați, ca textul să supraviețuiască parserului markdown al BlockNote. Nu atinge conținutul blocurilor de cod (fence ``` / ~~~). */
export function preprocessMath(markdown: string): { md: string; eqs: MathEntry[] } {
  const eqs: MathEntry[] = [];
  const replaceMath = (segment: string): string => {
    let out = segment;
    out = out.replace(/\$\$([\s\S]*?)\$\$/g, (_, latex) => {
      const i = eqs.push({ latex: latex.trim(), display: true }) - 1;
      return `${EQ_MARK}EQ${i}${EQ_MARK}`;
    });
    out = out.replace(/\$([^$\n]+)\$/g, (_, latex) => {
      const i = eqs.push({ latex: latex.trim(), display: false }) - 1;
      return `${EQ_MARK}IL${i}${EQ_MARK}`;
    });
    return out;
  };

  const fenceRe = /^ {0,3}(`{3,}|~{3,})[^\n]*$/gm;
  let out = "";
  let last = 0;
  let inFence = false;
  let m: RegExpExecArray | null;
  while ((m = fenceRe.exec(markdown)) !== null) {
    out += inFence ? markdown.slice(last, m.index) : replaceMath(markdown.slice(last, m.index));
    inFence = !inFence;
    out += m[0];
    last = fenceRe.lastIndex;
  }
  out += inFence ? markdown.slice(last) : replaceMath(markdown.slice(last));
  return { md: out, eqs };
}

const isInlineContainer = (c: InlineNode): c is TextNode & { content: unknown[] } =>
  typeof c === "object" &&
  c !== null &&
  Array.isArray((c as { content?: unknown }).content);

const isTableContent = (c: unknown): c is { rows: TableRow[] } =>
  typeof c === "object" &&
  c !== null &&
  !Array.isArray(c) &&
  Array.isArray((c as { rows?: unknown }).rows);

/** Transformă textul-marker din blocurile parse-ate în noduri latex. */
export function resolveMarkers(blocks: Block[], eqs: MathEntry[]): Block[] {
  const splitText = (text: string): InlineNode[] | null => {
    const parts: InlineNode[] = [];
    let last = 0;
    let used = false;
    MARKER_RE.lastIndex = 0;
    let m: RegExpExecArray | null;
    while ((m = MARKER_RE.exec(text)) !== null) {
      used = true;
      if (m.index > last) parts.push({ type: "text", text: text.slice(last, m.index), styles: {} });
      const e = eqs[parseInt(m[2], 10)];
      if (e) {
        parts.push({
          type: "latex",
          props: { latex: e.latex, displayMode: m[1] !== "IL" && e.display },
        });
      } else {
        parts.push({ type: "text", text: m[0], styles: {} });
      }
      last = m.index + m[0].length;
    }
    if (!used) return null;
    if (last < text.length) parts.push({ type: "text", text: text.slice(last), styles: {} });
    return parts;
  };
  const resolveContent = (arr: InlineNode[]): InlineNode[] =>
    arr.flatMap((c) => {
      if (typeof c === "object" && c.type === "text" && c.text) {
        return splitText(c.text) || [c];
      }
      if (isInlineContainer(c)) {
        return [Object.assign({}, c, { content: resolveContent(c.content as InlineNode[]) })];
      }
      return [c];
    });
  const walk = (bs: Block[]): Block[] =>
    bs.map((b) => {
      if (b.type === "codeBlock") return b;
      if (b.type === "table" && isTableContent(b.content)) {
        const rows = b.content.rows.map((r) =>
          Object.assign({}, r, {
            cells: r.cells.map((cell) =>
              Object.assign({}, cell, {
                content: resolveContent(cell.content),
              })
            ),
          })
        );
        return Object.assign({}, b, { content: Object.assign({}, b.content, { rows }) });
      }
      if (Array.isArray(b.content)) return Object.assign({}, b, { content: resolveContent(b.content) });
      if (Array.isArray(b.children)) return Object.assign({}, b, { children: walk(b.children) });
      return b;
    });
  return walk(blocks);
}

/** Paragrafele care conțin doar latex display devin blocuri equation. */
export function promoteDisplayToEquation(blocks: Block[]): Block[] {
  const out: Block[] = [];
  for (const b of blocks) {
    if (b.type === "paragraph" && Array.isArray(b.content) && b.content.length === 1) {
      const c = b.content[0];
      if (typeof c === "object" && c.type === "latex" && c.props && c.props.displayMode) {
        out.push({ type: "equation", props: { latex: c.props.latex }, content: [], children: [] });
        continue;
      }
    }
    if (Array.isArray(b.children)) b.children = promoteDisplayToEquation(b.children);
    out.push(b);
  }
  return out;
}

const isLatex = (c: unknown): c is LatexNode =>
  typeof c === "object" &&
  c !== null &&
  (c as LatexNode).type === "latex" &&
  Boolean((c as LatexNode).props);

/** Ascunde nodurile latex/equation în spatele markerilor pentru serializarea markdown. */
export function collectAndMask(blocks: Block[]): { blocks: Block[]; eqs: MathEntry[] } {
  const eqs: MathEntry[] = [];
  const walkContent = (arr: InlineNode[]): InlineNode[] => {
    const content: InlineNode[] = [];
    for (const c of arr) {
      if (isLatex(c)) {
        const display = !!c.props.displayMode;
        eqs.push({ latex: c.props.latex, display });
        content.push(`${EQ_MARK}${display ? "DL" : "IL"}${eqs.length - 1}${EQ_MARK}`);
      } else if (isInlineContainer(c)) {
        content.push(Object.assign({}, c, { content: walkContent(c.content as InlineNode[]) }));
      } else {
        content.push(c);
      }
    }
    return content;
  };
  const walk = (bs: Block[]): Block[] =>
    bs.map((b) => {
      if (b.type === "equation") {
        eqs.push({ latex: b.props && b.props.latex ? String(b.props.latex) : "", display: true });
        return { type: "paragraph", content: [`${EQ_MARK}EQ${eqs.length - 1}${EQ_MARK}`] };
      }
      if (b.type === "table" && isTableContent(b.content)) {
        const rows = b.content.rows.map((r) =>
          Object.assign({}, r, {
            cells: r.cells.map((cell) =>
              Object.assign({}, cell, { content: walkContent(cell.content) })
            ),
          })
        );
        return Object.assign({}, b, { content: Object.assign({}, b.content, { rows }) });
      }
      if (Array.isArray(b.content)) return Object.assign({}, b, { content: walkContent(b.content) });
      if (Array.isArray(b.children)) return Object.assign({}, b, { children: walk(b.children) });
      return b;
    });
  return { blocks: walk(blocks), eqs };
}

/** Restaurează $...$ / $$...$$ din markeri. */
export function postprocessMath(markdown: string, eqs: MathEntry[]): string {
  let out = markdown;
  for (let i = 0; i < eqs.length; i++) {
    const { latex } = eqs[i];
    out = out.split(`${EQ_MARK}IL${i}${EQ_MARK}`).join(`$${latex}$`);
    out = out.split(`${EQ_MARK}DL${i}${EQ_MARK}`).join(`$$${latex}$$`);
    out = out.split(`${EQ_MARK}EQ${i}${EQ_MARK}`).join(`\n$$\n${latex}\n$$\n`);
  }
  return out;
}
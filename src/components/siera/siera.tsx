"use client";

import { useEffect, useRef, useState } from "react";
import { useChat } from "@ai-sdk/react";
import { DefaultChatTransport, type UIMessage } from "ai";
import ReactMarkdown from "react-markdown";
import remarkGfm from "remark-gfm";
import Link from "next/link";
import { usePathname } from "next/navigation";
import { AnimatePresence, motion, type TargetAndTransition } from "framer-motion";
import {
  Check,
  ChevronDown,
  ChevronsRight,
  FileText,
  Lightbulb,
  ListChecks,
  Maximize2,
  Minus,
  PanelRight,
  Paperclip,
  PictureInPicture2,
  Search,
  Send,
  Sparkles,
  TrendingUp,
  X,
} from "lucide-react";
import { SieraOrb, type SieraGaze, type SieraMood } from "@/components/siera/siera-orb";
import type { SieraReaction } from "@/lib/siera/siera-motion";
import { getSieraGreeting, type SuggestionIcon } from "@/lib/siera/page-suggestions";
import { cn } from "@/lib/utils";

type SieraMode = "sidebar" | "floating" | "fullscreen";

const MODES: SieraMode[] = ["sidebar", "floating", "fullscreen"];
const MODE_ICONS: Record<SieraMode, typeof PanelRight> = {
  sidebar: PanelRight,
  floating: PictureInPicture2,
  fullscreen: Maximize2,
};
const MODE_LABELS: Record<SieraMode, string> = {
  sidebar: "Panou lateral",
  floating: "Plutitor",
  fullscreen: "Ecran complet",
};

const MIN_W = 340;
const MAX_W = 640;

const FAB_SIZE = 80;
// Prag de mișcare: sub el considerăm un "tap" (deschide/închide), peste el un drag.
const FAB_DRAG_THRESHOLD = 5;
// Rezistență lângă margini: când bula e împinsă dincolo de poziția "complet
// vizibilă", mișcarea e atenuată la 30% (senzație de "cauciuc", iOS-like). Prag
// dur: minim 12px din bulă rămân vizibili, deci nu iese niciodată din viewport.
const FAB_EDGE_RESISTANCE = 0.3;

// Spring physics (stil iOS PiP) pentru snap-ul bulei: animatie pe transform-ul
// div-ului interior, integrata in requestAnimationFrame. Critic amortizat
// (zes < 1) => glide lin pana se opreste pe colt, fara overshoot/bounce.
// Facem EXPLICIT fara injectare de viteza la release: bula porneste din punctul
// de drop si aluneca doar cat e distanta pana la colt — predictibil, nu "fuge".
const FAB_SPRING = { stiffness: 220, damping: 30 };
// Depun 0.01s: viteza sub care consideram bula oprita (px/step de integrare).
const FAB_STOP_SPEED = 0.01;

const FAB_CORNERS = ["topLeft", "topRight", "bottomRight", "bottomLeft"] as const;
type FabCorner = (typeof FAB_CORNERS)[number];

interface ViewportInfo {
  w: number;
  h: number;
  safeT: number;
  safeB: number;
}

// Citeste dimensiunile viewport-ului + inserele safe-area (pentru marginile
// de colț pe dispozitive cu notch), măsurate dintr-un element probe.
function measureViewport(): ViewportInfo {
  const w = window.innerWidth;
  const h = window.innerHeight;
  const probe = document.createElement("div");
  probe.style.cssText =
    "position:fixed;visibility:hidden;pointer-events:none;padding-top:env(safe-area-inset-top);padding-bottom:env(safe-area-inset-bottom);";
  document.body.appendChild(probe);
  const computed = getComputedStyle(probe);
  const safeT = parseFloat(computed.paddingTop) || 0;
  const safeB = parseFloat(computed.paddingBottom) || 0;
  probe.remove();
  return { w, h, safeT, safeB };
}

const PANEL_WRAP: Record<SieraMode, string> = {
  sidebar: "fixed inset-y-0 right-0 z-[70]",
  floating: "fixed bottom-6 right-6 z-[70]",
  fullscreen: "fixed inset-0 z-[70]",
};

const SHEET_ROUND: Record<SieraMode, string> = {
  sidebar: "rounded-l-[24px] border-r-0",
  floating: "rounded-[24px]",
  fullscreen: "rounded-none",
};

const MODE_MOTION: Record<
  SieraMode,
  { initial: TargetAndTransition; exit: TargetAndTransition }
> = {
  sidebar: { initial: { x: 56, opacity: 0 }, exit: { x: 56, opacity: 0 } },
  floating: {
    initial: { y: 32, scale: 0.94, opacity: 0 },
    exit: { y: 32, scale: 0.94, opacity: 0 },
  },
  fullscreen: {
    initial: { scale: 0.985, opacity: 0 },
    exit: { scale: 0.985, opacity: 0 },
  },
};

// Timestamp curent (module-scope): evita flagarea react-hooks/purity pentru
// apeluri impure direct in handler-ele definite in timpul render-ului.
const perfNow = () => performance.now();

function clampWidth(v: number): number {
  if (typeof window === "undefined") return v;
  const max = Math.min(MAX_W, window.innerWidth - 16);
  return Math.min(max, Math.max(MIN_W, Math.round(v)));
}

function extractText(message: UIMessage): string {
  return (message.parts ?? [])
    .filter((p) => p.type === "text")
    .map((p) => p.text)
    .join("\n");
}

const transport = new DefaultChatTransport<UIMessage>({
  api: "/api/siera/chat",
  prepareSendMessagesRequest: ({ body, messages }) => ({
    body: {
      ...(body as object),
      messages,
      pathname: typeof window !== "undefined" ? window.location.pathname : "",
    },
  }),
});

const SUGGESTION_ICONS: Record<SuggestionIcon, typeof Search> = {
  search: Search,
  quiz: ListChecks,
  summary: FileText,
  concept: Lightbulb,
  tips: Sparkles,
  progress: TrendingUp,
};

function SieraMarkdown({
  content,
  onNavigate,
  tone = "ui",
}: {
  content: string;
  onNavigate: () => void;
  tone?: "ai" | "ui";
}) {
  const ai = tone === "ai";
  return (
    <div className={ai ? undefined : "text-ink"}>
      <ReactMarkdown
        remarkPlugins={[remarkGfm]}
        components={{
          a: ({ href, children }) => {
            const cls = ai ? "siera-ai-link" : "text-accent underline";
            if (href?.startsWith("/")) {
              return (
                <Link href={href} onClick={onNavigate} className={cls}>
                  {children}
                </Link>
              );
            }
            return (
              <a
                href={href}
                target="_blank"
                rel="noreferrer"
                onClick={onNavigate}
                className={cls}
              >
                {children}
              </a>
            );
          },
          p: ({ children }) => <p className="my-1">{children}</p>,
          ul: ({ children }) => <ul className="my-1 list-disc pl-4">{children}</ul>,
          ol: ({ children }) => <ol className="my-1 list-decimal pl-4">{children}</ol>,
          li: ({ children }) => <li className="my-0.5">{children}</li>,
          h1: ({ children }) => <p className="my-2 font-bold">{children}</p>,
          h2: ({ children }) => <p className="my-2 font-bold">{children}</p>,
          h3: ({ children }) => <p className="my-2 font-bold">{children}</p>,
          code: ({ children }) => (
            <code className="rounded bg-ink/10 px-1 py-0.5 text-[13px] text-ink">
              {children}
            </code>
          ),
          pre: ({ children }) => (
            <pre className="my-1 overflow-x-auto rounded-lg bg-ink/10 p-2 text-[13px]">
              {children}
            </pre>
          ),
        }}
      >
        {content}
      </ReactMarkdown>
    </div>
  );
}

function SieraClose({
  mode,
  onClose,
}: {
  mode: SieraMode | "mobile";
  onClose: () => void;
}) {
  const Icon = mode === "sidebar" ? ChevronsRight : mode === "floating" ? Minus : X;
  const label =
    mode === "sidebar"
      ? "Închide panoul"
      : mode === "floating"
        ? "Minimizează"
        : "Închide Siera";
  return (
    <button
      type="button"
      onClick={onClose}
      aria-label={label}
      title={label}
      className="siera-close"
    >
      <Icon className="h-[17px] w-[17px]" strokeWidth={2.5} />
    </button>
  );
}

function ModeMenu({ mode, onSelect }: { mode: SieraMode; onSelect: (m: SieraMode) => void }) {
  const [menuOpen, setMenuOpen] = useState(false);
  const ref = useRef<HTMLDivElement>(null);

  useEffect(() => {
    if (!menuOpen) return;
    const onDown = (e: PointerEvent) => {
      if (ref.current && !ref.current.contains(e.target as Node)) setMenuOpen(false);
    };
    const onKey = (e: KeyboardEvent) => {
      if (e.key === "Escape") setMenuOpen(false);
    };
    document.addEventListener("pointerdown", onDown);
    window.addEventListener("keydown", onKey);
    return () => {
      document.removeEventListener("pointerdown", onDown);
      window.removeEventListener("keydown", onKey);
    };
  }, [menuOpen]);

  const CurrentIcon = MODE_ICONS[mode];

  return (
    <div ref={ref} className="relative">
      <button
        type="button"
        onClick={() => setMenuOpen((v) => !v)}
        aria-haspopup="menu"
        aria-expanded={menuOpen}
        title="Aspect Siera"
        className="siera-mode-btn"
      >
        <CurrentIcon className="h-4 w-4" />
        <span className="hidden min-[340px]:inline">{MODE_LABELS[mode]}</span>
        <ChevronDown
          className={cn("h-3.5 w-3.5 transition-transform duration-200", menuOpen && "rotate-180")}
        />
      </button>

      <AnimatePresence>
        {menuOpen && (
          <motion.div
            initial={{ opacity: 0, scale: 0.94, y: -6 }}
            animate={{ opacity: 1, scale: 1, y: 0 }}
            exit={{ opacity: 0, scale: 0.94, y: -6 }}
            transition={{ duration: 0.16, ease: "easeOut" }}
            role="menu"
            className="absolute left-0 top-full z-30 mt-2 w-48 overflow-hidden rounded-2xl border border-feather bg-card p-1.5 shadow-[0_12px_32px_rgba(0,0,0,0.16)]"
          >
            {MODES.map((m) => {
              const Icon = MODE_ICONS[m];
              const active = mode === m;
              return (
                <button
                  key={m}
                  type="button"
                  role="menuitemradio"
                  aria-checked={active}
                  onClick={() => {
                    onSelect(m);
                    setMenuOpen(false);
                  }}
                  className={cn(
                    "flex w-full items-center gap-2.5 rounded-xl px-3 py-2 text-sm font-semibold transition-colors",
                    active ? "bg-accent/10 text-accent" : "text-ink hover:bg-ink/5"
                  )}
                >
                  <Icon className="h-4 w-4" />
                  {MODE_LABELS[m]}
                  {active && <Check className="ml-auto h-4 w-4" strokeWidth={2.75} />}
                </button>
              );
            })}
          </motion.div>
        )}
      </AnimatePresence>
    </div>
  );
}

export function Siera() {
  const pathname = usePathname();
  const [open, setOpen] = useState(false);
  const { messages, sendMessage, status, error } = useChat({ transport });
  const [input, setInput] = useState("");
  const scrollRef = useRef<HTMLDivElement>(null);
  const [happy, setHappy] = useState(false);
  const [inputFocused, setInputFocused] = useState(false);
  // Micro-reacție la trimitere (ochii se îndreaptă spre interfață, bule animat).
  const [reaction, setReaction] = useState<SieraReaction | null>(null);
  const reactionTimer = useRef<ReturnType<typeof setTimeout> | null>(null);
  // Client-only (mounted via dynamic import cu ssr: false) → putem citi media
  // query direct în initializare; schimbările ulterioare vin din listener-ul de mai jos.
  const [mobile, setMobile] = useState(() =>
    typeof window !== "undefined"
      ? window.matchMedia("(max-width: 767px)").matches
      : false
  );

  // Mod de afișare pe desktop/tabletă: ales de utilizator (persistat), default
  // tableta → plutitor, desktop → panou lateral.
  const [mode, setMode] = useState<SieraMode>("sidebar");
  const [width, setWidth] = useState<number>(440);

  // Poziția băștii plutitoare: drag manual + snap la cel mai apropiat colț (stil iOS PiP).
  // Componenta e client-only (dynamic import, ssr: false) → localStorage poate fi
  // citit sincron la init (același pattern ca measureViewport mai jos).
  const [fabCorner, setFabCorner] = useState<FabCorner>(() => {
    try {
      const fab = localStorage.getItem("siera:fab");
      if (fab && (FAB_CORNERS as readonly string[]).includes(fab)) return fab as FabCorner;
    } catch {}
    return "bottomRight";
  });
  const [vp, setVp] = useState<ViewportInfo>(() => measureViewport());
  // Offset-ul curent de drag al bulei (null = în repaus, ancorată pe colț).
  const fabMoveRef = useRef<{
    startPX: number;
    startPY: number;
    startLeft: number;
    startTop: number;
    baseX: number;
    baseY: number;
  } | null>(null);
  // Mirror al offset-ului curent, pentru a nu depinde de batching-ul React la pointerup.
  const fabOffsetRef = useRef({ x: 0, y: 0 });
  // True când utilizatorul a mișcat bula peste prag (drag real, nu tap).
  const fabDraggedRef = useRef(false);
  // Motorul spring (null = în repaus): `x/y` offset curent, `vx/vy` viteza (px/s),
  // `tx/ty` tinta. Ruleaza doar intre release si asezarea pe colt.
  const fabSpringRef = useRef<{
    raf: number;
    x: number;
    y: number;
    vx: number;
    vy: number;
    tx: number;
    ty: number;
    last: number;
  } | null>(null);
  // Div-ul interior al bulei; transform-ul lui e singura chestie animata.
  const fabInnerRef = useRef<HTMLDivElement>(null);

  // Mobile: foaie de jos, la jumătate de ecran, extensibilă prin tragerea barei.
  const [sheetH, setSheetH] = useState<number>(0);
  const [dragging, setDragging] = useState(false);
  const dragRef = useRef<{ startY: number; startH: number } | null>(null);
  const movedRef = useRef(false);

  const compact =
    mobile && sheetH < Math.round((typeof window !== "undefined" ? window.innerHeight : 600) * 0.85);

  // Citește valorile browser-only o singură dată (după hidratare).
  useEffect(() => {
    setSheetH(Math.round(window.innerHeight * 0.5));
    try {
      const saved = localStorage.getItem("siera:mode");
      if (saved === "sidebar" || saved === "floating" || saved === "fullscreen") {
        setMode(saved);
      } else {
        setMode(
          window.matchMedia("(min-width: 768px) and (max-width: 1024px)").matches
            ? "floating"
            : "sidebar"
        );
      }
      const w = Number(localStorage.getItem("siera:w"));
      if (Number.isFinite(w) && w >= MIN_W && w <= MAX_W) setWidth(w);
    } catch {}
  }, []);

  useEffect(() => {
    const update = () => setVp(measureViewport());
    window.addEventListener("resize", update);
    window.addEventListener("orientationchange", update);
    return () => {
      window.removeEventListener("resize", update);
      window.removeEventListener("orientationchange", update);
    };
  }, []);

  useEffect(() => {
    if (!open || !mobile) setSheetH(Math.round(window.innerHeight * 0.5));
  }, [open, mobile]);

  useEffect(() => {
    if (!mobile) return;
    const onResize = () => setSheetH((h) => Math.min(h, window.innerHeight));
    window.addEventListener("resize", onResize);
    return () => window.removeEventListener("resize", onResize);
  }, [mobile]);

  useEffect(() => {
    const mq = window.matchMedia("(max-width: 767px)");
    const fn = (e: MediaQueryListEvent) => setMobile(e.matches);
    mq.addEventListener("change", fn);
    return () => mq.removeEventListener("change", fn);
  }, []);

  useEffect(() => {
    const el = scrollRef.current;
    if (el) el.scrollTop = el.scrollHeight;
  }, [messages, open, status]);

  useEffect(() => {
    try {
      localStorage.setItem("siera:mode", mode);
    } catch {}
  }, [mode]);

  useEffect(() => {
    try {
      localStorage.setItem("siera:w", String(width));
    } catch {}
  }, [width]);

  useEffect(() => {
    try {
      localStorage.setItem("siera:fab", fabCorner);
    } catch {}
  }, [fabCorner]);

  const [editorOpen, setEditorOpen] = useState(false);

  useEffect(() => {
    const update = () =>
      setEditorOpen(document.body.classList.contains("crop-editor-open"));
    update();
    const observer = new MutationObserver(update);
    observer.observe(document.body, { attributes: true, attributeFilter: ["class"] });
    return () => observer.disconnect();
  }, []);

  // Escape închide chatul (dar nu când crop-editorul e deschis).
  useEffect(() => {
    if (!open || editorOpen) return;
    const onKey = (e: KeyboardEvent) => {
      if (e.key === "Escape") setOpen(false);
    };
    window.addEventListener("keydown", onKey);
    return () => window.removeEventListener("keydown", onKey);
  }, [open, editorOpen]);

  // Starea de bucurie: 2.6s după ce Siera termină de răspuns.
  const prevStatus = useRef(status);
  useEffect(() => {
    const wasBusy =
      prevStatus.current === "streaming" || prevStatus.current === "submitted";
    const nowIdle = status === "ready" || status === "error";
    prevStatus.current = status;
    if (!wasBusy || !nowIdle) return;
    setHappy(true);
    const t = setTimeout(() => setHappy(false), 2600);
    return () => clearTimeout(t);
  }, [status]);

  const busy = status === "submitted" || status === "streaming";
  const mood: SieraMood = happy
    ? "happy"
    : status === "streaming"
      ? "speaking"
      : busy
        ? "thinking"
        : "idle";
  const gaze: SieraGaze = inputFocused ? "input" : mood === "idle" ? "cursor" : "user";

  const greeting = getSieraGreeting(pathname);

  const shown = open && !editorOpen;

  const fabMarginX = mobile ? 16 : 24;
  const fabBottomInset = mobile ? 96 + vp.safeB : 24;
  const fabTopInset = 16 + vp.safeT;
  const cornerCenters: Record<FabCorner, { x: number; y: number }> = {
    topLeft: { x: fabMarginX + FAB_SIZE / 2, y: fabTopInset + FAB_SIZE / 2 },
    topRight: { x: vp.w - fabMarginX - FAB_SIZE / 2, y: fabTopInset + FAB_SIZE / 2 },
    bottomLeft: {
      x: fabMarginX + FAB_SIZE / 2,
      y: vp.h - fabBottomInset - FAB_SIZE / 2,
    },
    bottomRight: {
      x: vp.w - fabMarginX - FAB_SIZE / 2,
      y: vp.h - fabBottomInset - FAB_SIZE / 2,
    },
  };
  const fabPosFor = (corner: FabCorner) =>
    ({
      topLeft: { left: fabMarginX, top: fabTopInset },
      topRight: { left: vp.w - FAB_SIZE - fabMarginX, top: fabTopInset },
      bottomLeft: { left: fabMarginX, top: vp.h - FAB_SIZE - fabBottomInset },
      bottomRight: { left: vp.w - FAB_SIZE - fabMarginX, top: vp.h - FAB_SIZE - fabBottomInset },
    })[corner];
  const fabPos = fabPosFor(fabCorner);
// Clamp cu rezistență la margini (edge resistance).
// Soft bounds = bulă complet vizibilă (orice coordonată e liberă).
// Dincolo de soft: mișcarea e atenuată cu factorul FAB_EDGE_RESISTANCE.
// Hard bounds = cel puțin 12px din bulă rămân vizibili pe ecran.
const clampFabDrag = (x: number, y: number) => {
  const resist = (
    v: number,
    softMin: number,
    softMax: number,
    hardMin: number,
    hardMax: number,
  ) => {
    const r =
      v < softMin
        ? softMin + (v - softMin) * FAB_EDGE_RESISTANCE
        : v > softMax
          ? softMax + (v - softMax) * FAB_EDGE_RESISTANCE
          : v;
    return Math.min(hardMax, Math.max(hardMin, r));
  };
  const dx = resist(
    x,
    -fabPos.left,           // soft: fundul bulei atinge marginea stângă
    vp.w - FAB_SIZE - fabPos.left, // soft: dreapta bulei atinge marginea dreaptă
    12 - fabPos.left,       // hard: 12px vizibile stânga
    vp.w - 12 - FAB_SIZE - fabPos.left, // hard: 12px vizibile dreapta
  );
  const dy = resist(
    y,
    -fabPos.top,
    vp.h - FAB_SIZE - fabPos.top,
    12 - fabPos.top,
    vp.h - 12 - FAB_SIZE - fabPos.top,
  );
  return { x: dx, y: dy };
};

  // --- Motorul de snap (spring physics) ---

  // Scrie pozitia pe div-ul interior direct pe DOM: singurul loc unde e animat
  // ceva. Niciun React state pe frame -> zero re-render-uri in timpul animatiei.
  const writeFabTransform = (x: number, y: number) => {
    const el = fabInnerRef.current;
    if (el) el.style.transform = `translate(${x}px, ${y}px)`;
  };

  const stopFabSpring = () => {
    const s = fabSpringRef.current;
    if (s) {
      cancelAnimationFrame(s.raf);
      fabSpringRef.current = null;
    }
  };

  const tickFabSpring = (now: number) => {
    const s = fabSpringRef.current;
    if (!s) return;
    // dt in secunde, clampat (tab schimbat din fundal => fara salturi mari).
    const dt = Math.min((now - s.last) / 1000, 0.05);
    s.last = now;
    // Semi-implicit Euler: a = -k*(x - t) - c*v; v += a*dt; x += v*dt.
    s.vx += (-FAB_SPRING.stiffness * (s.x - s.tx) - FAB_SPRING.damping * s.vx) * dt;
    s.vy += (-FAB_SPRING.stiffness * (s.y - s.ty) - FAB_SPRING.damping * s.vy) * dt;
    s.x += s.vx * dt;
    s.y += s.vy * dt;
    writeFabTransform(s.x, s.y);
    const dz2 = (s.x - s.tx) * (s.x - s.tx) + (s.y - s.ty) * (s.y - s.ty);
    if (Math.abs(s.vx) + Math.abs(s.vy) > FAB_STOP_SPEED || dz2 > 0.0001) {
      s.raf = requestAnimationFrame(tickFabSpring);
    } else {
      fabSpringRef.current = null;
      writeFabTransform(s.tx, s.ty);
    }
  };

  const startFabSpring = (
    fromX: number,
    fromY: number,
    toX: number,
    toY: number
  ) => {
    stopFabSpring();
    if (window.matchMedia("(prefers-reduced-motion: reduce)").matches) {
      writeFabTransform(toX, toY);
      return;
    }
    const s = {
      raf: 0,
      x: fromX,
      y: fromY,
      vx: 0,
      vy: 0,
      tx: toX,
      ty: toY,
      last: perfNow(),
    };
    fabSpringRef.current = s;
    s.raf = requestAnimationFrame(tickFabSpring);
  };

  const handleFabPointerDown = (e: React.PointerEvent<HTMLButtonElement>) => {
    if (e.pointerType === "mouse" && e.button !== 0) return;
    // Dacă rulează un snap, bula pornește exact din poziția curentă a springului
    // (interruptibil, fără "back-snap") și viteza se resetează la zero.
    const spring = fabSpringRef.current;
    const ox = spring ? spring.x : 0;
    const oy = spring ? spring.y : 0;
    stopFabSpring();
    fabMoveRef.current = {
      startPX: e.clientX,
      startPY: e.clientY,
      startLeft: fabPos.left,
      startTop: fabPos.top,
      baseX: ox,
      baseY: oy,
    };
    fabDraggedRef.current = false;
    fabOffsetRef.current = { x: ox, y: oy };
    writeFabTransform(ox, oy);
    e.currentTarget.setPointerCapture(e.pointerId);
  };

  const handleFabPointerMove = (e: React.PointerEvent<HTMLButtonElement>) => {
    const start = fabMoveRef.current;
    if (!start) return;
    if (e.pointerType === "mouse" && e.buttons === 0) {
      handleFabPointerUp(e);
      return;
    }
    const raw = { x: e.clientX - start.startPX, y: e.clientY - start.startPY };
    if (Math.abs(raw.x) + Math.abs(raw.y) > FAB_DRAG_THRESHOLD) {
      fabDraggedRef.current = true;
    }
    // Offset fix la pointerdown (nu mutat între frame-uri) + delta absolută.
    // 1:1: mut cursorul 20px → bula se mișcă 20px, indiferent de nr. de frame-uri.
    const clamped = clampFabDrag(start.baseX + raw.x, start.baseY + raw.y);
    fabOffsetRef.current = clamped;
    writeFabTransform(clamped.x, clamped.y);
  };

  const handleFabPointerUp = (e: React.PointerEvent<HTMLButtonElement>) => {
    const start = fabMoveRef.current;
    fabMoveRef.current = null;
    if (!start) return; // evită double-fire (buttons===0 move → pointerup real)
    try {
      e.currentTarget.releasePointerCapture?.(e.pointerId);
    } catch {}
    const offset = fabOffsetRef.current;
    fabOffsetRef.current = { x: 0, y: 0 };
    const cx = start.startLeft + offset.x + FAB_SIZE / 2;
    const cy = start.startTop + offset.y + FAB_SIZE / 2;
    let best: FabCorner = fabCorner;
    let bestD = Infinity;
    for (const c of FAB_CORNERS) {
      const dx = cx - cornerCenters[c].x;
      const dy = cy - cornerCenters[c].y;
      const d = dx * dx + dy * dy;
      if (d < bestD) {
        bestD = d;
        best = c;
      }
    }
    // Micro-mișcare (sub prag) = efectiv un tap: revine instant pe colț, fără
    // spring, fără ideea de viteză. Bula stă "pietrificată" sub cursor.
    // NU resetăm fabDraggedRef aici — click-ul care urmează decide dacă togglează.
    if (!fabDraggedRef.current) {
      const el = fabInnerRef.current;
      if (el) el.style.transform = "";
      setFabCorner(best);
      return;
    }
    const target = fabPosFor(best);
    // Wrapper-ul sare instant pe noul colț (fără transition); spring-ul pleacă
    // din offset-ul relativ ca să compenseze saltul → unicul lucru vizibil e
    // gliseul continuu al bulei până pe colț.
    const fromX = offset.x - (target.left - start.startLeft);
    const fromY = offset.y - (target.top - start.startTop);
    setFabCorner(best);
    startFabSpring(fromX, fromY, 0, 0);
  };

  const handleFabPointerCancel = () => {
    const offset = fabOffsetRef.current;
    fabMoveRef.current = null;
    fabOffsetRef.current = { x: 0, y: 0 };
    startFabSpring(offset.x, offset.y, 0, 0);
  };

  const handleFabClick = () => {
    if (fabDraggedRef.current) {
      fabDraggedRef.current = false;
      return;
    }
    setOpen((v) => !v);
  };

  // Oprește loop-ul de snap la unmount (nu mai există rAF orfane).
  useEffect(() => () => stopFabSpring(), []);

  // Companion pe desktop: doar în modul sidebar site-ul cedează lățimea panoului.
  useEffect(() => {
    const active = !mobile && shown && mode === "sidebar";
    if (active) {
      document.body.classList.add("siera-open");
      document.body.style.setProperty("--siera-w", `${width}px`);
    } else {
      document.body.classList.remove("siera-open");
    }
    return () => document.body.classList.remove("siera-open");
  }, [mobile, shown, mode, width]);

  const submit = (text: string) => {
    const trimmed = text.trim();
    if (!trimmed || busy) return;
    sendMessage({ text: trimmed });
    setInput("");
    setReaction("attention");
    if (reactionTimer.current) clearTimeout(reactionTimer.current);
    reactionTimer.current = setTimeout(() => setReaction(null), 1600);
  };

  // --- Rezizare lățime (sidebar + floating) ---
  const resizeRef = useRef<{ startX: number; startW: number } | null>(null);

  const onResizeDown = (e: React.PointerEvent<HTMLDivElement>) => {
    e.currentTarget.setPointerCapture(e.pointerId);
    resizeRef.current = { startX: e.clientX, startW: width };
    document.body.classList.add("siera-resizing");
    document.body.style.userSelect = "none";
  };
  const onResizeMove = (e: React.PointerEvent<HTMLDivElement>) => {
    const r = resizeRef.current;
    if (!r) return;
    const next = clampWidth(r.startW + (r.startX - e.clientX));
    setWidth(next);
    document.body.style.setProperty("--siera-w", `${next}px`);
  };
  const onResizeEnd = () => {
    if (!resizeRef.current) return;
    resizeRef.current = null;
    document.body.classList.remove("siera-resizing");
    document.body.style.userSelect = "";
  };

  // --- Tragere foaie mobil ---
  const onSheetHandleDown = (e: React.PointerEvent<HTMLDivElement>) => {
    e.currentTarget.setPointerCapture(e.pointerId);
    dragRef.current = {
      startY: e.clientY,
      startH: sheetH || Math.round(window.innerHeight * 0.5),
    };
    movedRef.current = false;
    setDragging(true);
  };
  const onSheetHandleMove = (e: React.PointerEvent<HTMLDivElement>) => {
    const d = dragRef.current;
    if (!d) return;
    if (Math.abs(e.clientY - d.startY) > 8) movedRef.current = true;
    const vh = window.innerHeight;
    const next = Math.min(vh, Math.max(Math.round(vh * 0.2), d.startH + (d.startY - e.clientY)));
    setSheetH(next);
  };
  const onSheetHandleUp = () => {
    if (!dragRef.current) return;
    dragRef.current = null;
    setDragging(false);
    const vh = window.innerHeight;
    const h = sheetH ?? Math.round(vh * 0.5);
    if (h < Math.round(vh * 0.3)) {
      setOpen(false);
      return;
    }
    setSheetH(h > Math.round(vh * 0.7) ? vh : Math.round(vh * 0.5));
  };
  const onSheetHandleTap = () => {
    if (movedRef.current) {
      movedRef.current = false;
      return;
    }
    const vh = window.innerHeight;
    setSheetH((h) => (h >= Math.round(vh * 0.85) ? Math.round(vh * 0.5) : vh));
  };

  const heroOrb = (
    <div className="siera-hero__orb">
      <SieraOrb
        mood={mood}
        gaze={gaze}
        attentive={inputFocused}
        reaction={reaction}
        className="h-full w-full"
      />
    </div>
  );
  const heroName = (
    <div className="siera-hero__name">
      Siera
      <span className="siera-status">
        <span className="siera-status__dot" />
        Online
      </span>
    </div>
  );
  const heroSub = <p className="siera-hero__sub">Profesorul tău AI</p>;

  const messagesArea = (
    <div ref={scrollRef} className="min-h-0 flex-1 overflow-y-auto px-4 md:px-6">
      <div className="mx-auto flex max-w-xl flex-col gap-6 pb-6 pt-5">
        {messages.length === 0 && (
          <motion.div
            initial={{ opacity: 0, y: 14 }}
            animate={{ opacity: 1, y: 0 }}
            transition={{ duration: 0.3, ease: "easeOut" }}
            className="siera-msg-ai"
          >
            <p className="font-bold">{greeting.title}</p>
            <p className="mt-1 opacity-85">{greeting.text}</p>
          </motion.div>
        )}

        {messages.map((m) => (
          <motion.div
            key={m.id}
            initial={{ opacity: 0, y: 14 }}
            animate={{ opacity: 1, y: 0 }}
            transition={{ duration: 0.3, ease: "easeOut" }}
            className={m.role === "user" ? "flex justify-end" : "flex justify-start"}
          >
            {m.role === "user" ? (
              <div className="siera-msg-user">{extractText(m)}</div>
            ) : (
              <div className="siera-msg-ai">
                <SieraMarkdown
                  tone="ai"
                  content={extractText(m)}
                  onNavigate={() => setOpen(false)}
                />
              </div>
            )}
          </motion.div>
        ))}

        {status === "submitted" && (
          <motion.div
            initial={{ opacity: 0, y: 14 }}
            animate={{ opacity: 1, y: 0 }}
            transition={{ duration: 0.3, ease: "easeOut" }}
            className="flex justify-start"
          >
            <div className="siera-msg-ai siera-typing">
              <span className="siera-typing__dot" />
              <span className="siera-typing__dot" />
              <span className="siera-typing__dot" />
              <span className="siera-typing__label">Siera scrie…</span>
            </div>
          </motion.div>
        )}

        {error && (
          <p className="rounded-xl bg-danger/10 px-3 py-2 text-xs text-danger">
            {error.message || "Am întâmpinat o problemă. Încearcă din nou."}
          </p>
        )}

        {!busy && (
          <div className="flex flex-wrap gap-2 pt-1">
            {greeting.suggestions.map((s) => {
              const Icon = SUGGESTION_ICONS[s.icon];
              return (
                <button
                  key={s.message}
                  onClick={() => submit(s.message)}
                  disabled={busy}
                  className="siera-action"
                >
                  <span className="siera-action__icon">
                    <Icon className="h-3.5 w-3.5" />
                  </span>
                  {s.label}
                </button>
              );
            })}
          </div>
        )}
      </div>
    </div>
  );

  const inputArea = (
    <div className="shrink-0 px-4 pb-[calc(1rem+env(safe-area-inset-bottom))] md:px-6 md:pb-5">
      <form
        className="mx-auto max-w-xl"
        onSubmit={(e) => {
          e.preventDefault();
          submit(input);
        }}
      >
        <div className="siera-input">
          <button
            type="button"
            aria-label="Atașează imagine"
            title="Atașare imagini — în curând"
            className="siera-input__icon"
          >
            <Paperclip className="h-[18px] w-[18px]" />
          </button>
          <input
            value={input}
            onChange={(e) => setInput(e.target.value)}
            onFocus={() => setInputFocused(true)}
            onBlur={() => setInputFocused(false)}
            placeholder="Întreabă orice despre BAC..."
            className="siera-input__field"
          />
          <button
            type="submit"
            disabled={busy || !input.trim()}
            aria-label="Trimite"
            title="Trimite"
            className="siera-input__send"
          >
            <Send className="h-[18px] w-[18px]" />
          </button>
        </div>
      </form>
    </div>
  );

  const resizeHandle = (
    <div
      role="separator"
      aria-orientation="vertical"
      aria-label="Resizează lățimea"
      onPointerDown={onResizeDown}
      onPointerMove={onResizeMove}
      onPointerUp={onResizeEnd}
      onPointerCancel={onResizeEnd}
      className="absolute inset-y-0 left-0 z-20 flex w-4 cursor-col-resize touch-none select-none items-center justify-center opacity-0 transition-opacity duration-200 group-hover:opacity-100"
    >
      <span className="h-12 w-1 rounded-full bg-ink/20" />
    </div>
  );

  const desktopPanel = shown && !mobile;

  return (
    <>
      <AnimatePresence>
        {shown && mobile && (
          <motion.div
            key="backdrop"
            initial={{ opacity: 0 }}
            animate={{ opacity: 1 }}
            exit={{ opacity: 0 }}
            transition={{ duration: 0.25, ease: "easeOut" }}
            className="fixed inset-0 z-[60] bg-black/50 backdrop-blur-[2px]"
            onClick={() => setOpen(false)}
          />
        )}
      </AnimatePresence>

      <AnimatePresence>
        {shown && mobile && (
          <motion.div
            key="sheet"
            initial={{ y: "100%" }}
            animate={{ y: 0 }}
            exit={{ y: "100%" }}
            transition={{ type: "spring", stiffness: 400, damping: 38 }}
            className="fixed inset-x-0 bottom-0 z-[70] flex flex-col justify-end"
          >
            <motion.div
              className={cn(
                "siera-sheet w-full rounded-t-[24px]",
                sheetH >= (typeof window !== "undefined" ? window.innerHeight : 0) - 1 && "pt-[env(safe-area-inset-top)]"
              )}
              animate={{ height: sheetH }}
              transition={
                dragging
                  ? { duration: 0 }
                  : { type: "spring", stiffness: 320, damping: 34 }
              }
            >
              <div
                onPointerDown={onSheetHandleDown}
                onPointerMove={onSheetHandleMove}
                onPointerUp={onSheetHandleUp}
                onPointerCancel={onSheetHandleUp}
                onClick={onSheetHandleTap}
                role="button"
                aria-label="Mărește sau micșorează fereastra"
                className="flex h-10 shrink-0 cursor-grab touch-none select-none items-center justify-center active:cursor-grabbing"
              >
                <span className="h-1.5 w-12 rounded-full bg-ink/20" />
              </div>
                <div className={cn("siera-hero", compact && "siera-hero--compact")}>
                  {compact ? (
                    <div className="siera-hero__compact-row">
                      {heroOrb}
                      {heroName}
                      <div className="ml-auto shrink-0">
                        <SieraClose mode="mobile" onClose={() => setOpen(false)} />
                      </div>
                    </div>
                  ) : (
                    <>
                      <div className="flex w-full items-center justify-between px-0.5 pb-2">
                        <span className="h-7 w-7" />
                        <SieraClose mode="mobile" onClose={() => setOpen(false)} />
                      </div>
                      {heroOrb}
                      {heroName}
                      {heroSub}
                    </>
                  )}
                </div>
              {messagesArea}
              {inputArea}
            </motion.div>
          </motion.div>
        )}
      </AnimatePresence>

      <AnimatePresence>
        {desktopPanel && (
          <motion.div
            key={mode}
            initial={MODE_MOTION[mode].initial}
            animate={{ x: 0, y: 0, scale: 1, opacity: 1 }}
            exit={MODE_MOTION[mode].exit}
            transition={
              mode === "fullscreen"
                ? { duration: 0.24, ease: "easeOut" }
                : { type: "spring", stiffness: 360, damping: 32 }
            }
            className={PANEL_WRAP[mode]}
            style={
              mode === "fullscreen"
                ? undefined
                : mode === "floating"
                  ? { width, height: "min(680px, calc(100dvh - 48px))" }
                  : { width }
            }
          >
            <div
              className={cn(
                "siera-sheet group h-full w-full",
                SHEET_ROUND[mode],
                mode === "fullscreen" && "pt-[env(safe-area-inset-top)]"
              )}
            >
              <div className="siera-hero">
                <div className="flex w-full items-center justify-between gap-2 px-0.5 pb-2">
                  <ModeMenu mode={mode} onSelect={setMode} />
                  <SieraClose mode={mode} onClose={() => setOpen(false)} />
                </div>
                {heroOrb}
                {heroName}
                {heroSub}
              </div>
              {messagesArea}
              {inputArea}
              {(mode === "sidebar" || mode === "floating") && resizeHandle}
            </div>
          </motion.div>
        )}
      </AnimatePresence>

       {!shown && !editorOpen && (
          <div
            className="fixed z-[70]"
            style={{ left: fabPos.left, top: fabPos.top }}
          >
            <div
              ref={fabInnerRef}
              style={{
                width: FAB_SIZE,
                height: FAB_SIZE,
                touchAction: "none",
                willChange: "transform",
              }}
            >
              <motion.button
                type="button"
                initial={{ scale: 0, opacity: 0 }}
                animate={{ scale: 1, opacity: 1 }}
                transition={{ type: "spring", stiffness: 300, damping: 22 }}
                whileHover={{ scale: 1.06 }}
                whileTap={{ scale: 0.94 }}
                onClick={handleFabClick}
                onPointerDown={handleFabPointerDown}
                onPointerMove={handleFabPointerMove}
                onPointerUp={handleFabPointerUp}
                onPointerCancel={handleFabPointerCancel}
                title={open ? "Închide Siera" : "Deschide Siera"}
                aria-label={open ? "Închide Siera" : "Deschide Siera"}
                className="block h-full w-full cursor-grab select-none active:cursor-grabbing"
              >
                <div className="h-full w-full pointer-events-none">
                  <SieraOrb
                    mood={mood}
                    gaze={gaze}
                    attentive={inputFocused}
                    reaction={reaction}
                    className="h-full w-full"
                  />
                </div>
              </motion.button>
            </div>
          </div>
        )}
    </>
  );
}

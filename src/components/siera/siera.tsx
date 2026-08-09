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

function clampWidth(v: number): number {
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
  const [mobile, setMobile] = useState(() =>
    window.matchMedia("(max-width: 767px)").matches
  );

  // Mod de afișare pe desktop/tabletă: ales de utilizator (persistat), default
  // tableta → plutitor, desktop → panou lateral.
  const [mode, setMode] = useState<SieraMode>(() => {
    try {
      const saved = localStorage.getItem("siera:mode");
      if (saved === "sidebar" || saved === "floating" || saved === "fullscreen")
        return saved;
    } catch {}
    return window.matchMedia("(min-width: 768px) and (max-width: 1024px)").matches
      ? "floating"
      : "sidebar";
  });
  const [width, setWidth] = useState<number>(() => {
    try {
      const w = Number(localStorage.getItem("siera:w"));
      if (Number.isFinite(w) && w >= MIN_W && w <= MAX_W) return w;
    } catch {}
    return 440;
  });

  // Mobile: foaie de jos, la jumătate de ecran, extensibilă prin tragerea barei.
  const [sheetH, setSheetH] = useState(() => Math.round(window.innerHeight * 0.5));
  const [dragging, setDragging] = useState(false);
  const dragRef = useRef<{ startY: number; startH: number } | null>(null);
  const movedRef = useRef(false);

  const compact = mobile && sheetH < Math.round(window.innerHeight * 0.85);

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
      <SieraOrb mood={mood} gaze={gaze} className="h-full w-full" />
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
                sheetH >= window.innerHeight - 1 && "pt-[env(safe-area-inset-top)]"
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

      <AnimatePresence>
        {!shown && !editorOpen && (
          <motion.button
            key="fab"
            initial={{ scale: 0, opacity: 0 }}
            animate={{ scale: 1, opacity: 1 }}
            exit={{ scale: 0, opacity: 0 }}
            whileHover={{ scale: 1.06 }}
            whileTap={{ scale: 0.94 }}
            transition={{ type: "spring", stiffness: 300, damping: 22 }}
            onClick={() => setOpen((v) => !v)}
            title={open ? "Închide Siera" : "Deschide Siera"}
            aria-label={open ? "Închide Siera" : "Deschide Siera"}
            className="fixed bottom-[calc(6rem+env(safe-area-inset-bottom))] right-4 z-[70] md:bottom-6 md:right-6"
          >
            <div className="h-20 w-20">
              <SieraOrb mood={mood} gaze={gaze} className="h-full w-full" />
            </div>
          </motion.button>
        )}
      </AnimatePresence>
    </>
  );
}

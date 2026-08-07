"use client";

import { useEffect, useRef, useState } from "react";
import { useChat } from "@ai-sdk/react";
import { DefaultChatTransport, type UIMessage } from "ai";
import ReactMarkdown from "react-markdown";
import remarkGfm from "remark-gfm";
import Link from "next/link";
import { usePathname } from "next/navigation";
import { AnimatePresence, motion } from "framer-motion";
import {
  FileText,
  Lightbulb,
  ListChecks,
  Paperclip,
  Search,
  Send,
  Sparkles,
  TrendingUp,
  X,
} from "lucide-react";
import { SieraOrb, type SieraGaze, type SieraMood } from "@/components/siera/siera-orb";
import { getSieraGreeting, type SuggestionIcon } from "@/lib/siera/page-suggestions";

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
            <code
              className={
                ai
                  ? "rounded bg-ink/10 px-1 py-0.5 text-[13px] text-ink"
                  : "rounded bg-ink/10 px-1 py-0.5 text-[13px] text-ink"
              }
            >
              {children}
            </code>
          ),
          pre: ({ children }) => (
            <pre
              className={
                ai
                  ? "my-1 overflow-x-auto rounded-lg bg-ink/10 p-2 text-[13px]"
                  : "my-1 overflow-x-auto rounded-lg bg-ink/5 p-2 text-[13px]"
              }
            >
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

export function Siera() {
  const pathname = usePathname();
  const [open, setOpen] = useState(false);
  const { messages, sendMessage, status, error } = useChat({ transport });
  const [input, setInput] = useState("");
  const scrollRef = useRef<HTMLDivElement>(null);
  const [happy, setHappy] = useState(false);
  const [inputFocused, setInputFocused] = useState(false);
  const [mobile, setMobile] = useState(() =>
    typeof window !== "undefined" ? window.matchMedia("(max-width: 767px)").matches : false
  );

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

  // Companion pe desktop: site-ul cedează 440px, Siera devine coloană alături.
  useEffect(() => {
    if (!mobile && shown) document.body.classList.add("siera-open");
    else document.body.classList.remove("siera-open");
    return () => document.body.classList.remove("siera-open");
  }, [mobile, shown]);

  const submit = (text: string) => {
    const trimmed = text.trim();
    if (!trimmed || busy) return;
    sendMessage({ text: trimmed });
    setInput("");
  };

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
        {shown && (
          <motion.div
            key="panel"
            initial={mobile ? { y: "100%" } : { x: "100%" }}
            animate={mobile ? { y: 0 } : { x: 0 }}
            exit={mobile ? { y: "100%" } : { x: "100%" }}
            transition={{ duration: 0.3, ease: [0.32, 0.72, 0, 1] }}
            className={
              mobile
                ? "fixed inset-0 z-[70] flex items-end justify-center"
                : "fixed inset-y-0 right-0 z-[70] w-[min(440px,100vw)]"
            }
          >
            <div className="siera-sheet h-full w-full md:rounded-l-[24px] md:border-r-0">
              <div className="siera-hero">
                <button
                  onClick={() => setOpen(false)}
                  aria-label="Închide Siera"
                  title="Închide"
                  className="siera-close"
                >
                  <X className="h-[17px] w-[17px]" strokeWidth={2.5} />
                </button>
                <div className="siera-hero__orb">
                  <SieraOrb mood={mood} gaze={gaze} className="h-full w-full" />
                </div>
                <div className="siera-hero__name">
                  Siera
                  <span className="siera-status">
                    <span className="siera-status__dot" />
                    Online
                  </span>
                </div>
                <p className="siera-hero__sub">Profesorul tău AI</p>
              </div>

              <div
                ref={scrollRef}
                className="min-h-0 flex-1 overflow-y-auto px-4 md:px-6"
              >
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
            className="fixed bottom-24 right-4 z-[70] md:bottom-6 md:right-6"
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

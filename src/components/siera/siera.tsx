"use client";

import { useEffect, useRef, useState, type ReactNode } from "react";
import { useChat } from "@ai-sdk/react";
import { DefaultChatTransport, type UIMessage } from "ai";
import ReactMarkdown from "react-markdown";
import remarkGfm from "remark-gfm";
import Link from "next/link";
import { Bot, Send, Sparkles, X } from "lucide-react";

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

const SUGGESTIONS = [
  "Rezumă pagina curentă",
  "Generează un test la matematică",
  "Caută: derivate",
  "Explică-mi un concept",
];

function SieraMarkdown({ content }: { content: string }) {
  return (
    <div className="text-sm leading-relaxed text-ink">
      <ReactMarkdown
        remarkPlugins={[remarkGfm]}
        components={{
          a: ({ href, children }) => {
            if (href?.startsWith("/")) {
              return (
                <Link href={href} className="text-accent underline">
                  {children}
                </Link>
              );
            }
            return (
              <a href={href} target="_blank" rel="noreferrer" className="text-accent underline">
                {children}
              </a>
            );
          },
          p: ({ children }) => <p className="my-1">{children}</p>,
          ul: ({ children }) => <ul className="my-1 list-disc pl-4">{children}</ul>,
          ol: ({ children }) => <ol className="my-1 list-decimal pl-4">{children}</ol>,
          li: ({ children }) => <li className="my-0.5">{children}</li>,
          h1: ({ children }) => <p className="my-2 text-sm font-bold">{children}</p>,
          h2: ({ children }) => <p className="my-2 text-sm font-bold">{children}</p>,
          h3: ({ children }) => <p className="my-2 text-sm font-bold">{children}</p>,
          code: ({ children }) => (
            <code className="rounded bg-ink/10 px-1 py-0.5 text-xs">{children}</code>
          ),
          pre: ({ children }) => (
            <pre className="my-1 overflow-x-auto rounded-lg bg-ink/5 p-2 text-xs">{children}</pre>
          ),
        }}
      >
        {content}
      </ReactMarkdown>
    </div>
  );
}

function SieraOrb({
  size,
  active = false,
  icon,
  className = "",
  ariaHidden = false,
}: {
  size: number;
  active?: boolean;
  icon?: ReactNode;
  className?: string;
  ariaHidden?: boolean;
}) {
  return (
    <span
      aria-hidden={ariaHidden}
      className={`siera-orb ${active ? "siera-orb--active" : ""} ${className}`}
      style={{ width: size, height: size }}
    >
      {icon && <span className="siera-orb__core">{icon}</span>}
    </span>
  );
}

export function Siera() {
  const [open, setOpen] = useState(false);
  const { messages, sendMessage, status, error } = useChat({ transport });
  const [input, setInput] = useState("");
  const scrollRef = useRef<HTMLDivElement>(null);

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

  const busy = status === "submitted" || status === "streaming";

  const shown = open && !editorOpen;
  const bubbleHidden = editorOpen;

  const submit = (text: string) => {
    const trimmed = text.trim();
    if (!trimmed || busy) return;
    sendMessage({ text: trimmed });
    setInput("");
  };

  return (
    <>
      {shown && (
        <div className="fixed inset-0 z-[60] bg-black/30 backdrop-blur-sm md:hidden" onClick={() => setOpen(false)} />
      )}

      <div
        inert={!shown}
        aria-hidden={!shown}
        className={`fixed bottom-24 right-3 z-[70] flex h-[min(70vh,32rem)] w-[calc(100vw-1.5rem)] max-w-sm flex-col overflow-hidden rounded-2xl border border-feather bg-card shadow-2xl shadow-black/10 transition-all duration-200 md:bottom-6 md:right-6 ${
          shown ? "pointer-events-auto scale-100 translate-y-0 opacity-100" : "pointer-events-none scale-95 translate-y-2 opacity-0"
        }`}
      >
        <div className="flex items-center gap-2 border-b border-feather bg-accent px-4 py-3 text-white">
          <SieraOrb size={36} active={busy} icon={<Sparkles className="h-4 w-4" />} className="shrink-0" />
          <div className="min-w-0 flex-1">
            <p className="text-sm font-bold leading-tight">Siera</p>
            <p className="text-[11px] leading-tight opacity-80">Asistentul tău pentru BAC</p>
          </div>
          <button
            onClick={() => setOpen(false)}
            className="rounded-full p-1.5 transition-colors hover:bg-white/20"
            title="Închide"
          >
            <X className="h-4 w-4" />
          </button>
        </div>

        <div ref={scrollRef} className="flex-1 space-y-3 overflow-y-auto p-4">
          {messages.length === 0 && (
            <div className="space-y-3">
              <p className="text-sm text-subtle">
                Bună! Sunt Siera. Pot să caut prin site, să rezum pagina curentă, să explic concepte sau să generez
                teste personalizate. Cu ce te ajut?
              </p>
              <div className="flex flex-wrap gap-2">
                {SUGGESTIONS.map((s) => (
                  <button
                    key={s}
                    onClick={() => submit(s)}
                    disabled={busy}
                    className="rounded-full border border-feather bg-background px-3 py-1.5 text-xs font-medium text-ink transition-colors hover:border-accent hover:text-accent disabled:opacity-50"
                  >
                    {s}
                  </button>
                ))}
              </div>
            </div>
          )}

          {messages.map((m) => (
            <div
              key={m.id}
              className={`animate-slide-up ${m.role === "user" ? "flex justify-end" : "flex items-end gap-2"}`}
            >
              {m.role === "assistant" && <SieraOrb size={22} ariaHidden className="mt-0.5 shrink-0" />}
              <div
                className={
                  m.role === "user"
                    ? "ml-8 rounded-2xl rounded-tr-sm bg-accent px-3 py-2 text-sm text-white"
                    : "mr-6 rounded-2xl rounded-tl-sm bg-background px-3 py-2"
                }
              >
                {m.role === "user" ? extractText(m) : <SieraMarkdown content={extractText(m)} />}
              </div>
            </div>
          ))}

          {busy && (
            <div className="mr-6 flex items-center gap-1.5 rounded-2xl rounded-tl-sm bg-background px-3 py-2.5">
              <span
                className="h-1.5 w-1.5 animate-bounce rounded-full"
                style={{ background: "conic-gradient(#0a7cff, #7c3aed, #14b8a6, #0a7cff)" }}
              />
              <span
                className="h-1.5 w-1.5 animate-bounce rounded-full [animation-delay:120ms]"
                style={{ background: "conic-gradient(#0a7cff, #7c3aed, #14b8a6, #0a7cff)" }}
              />
              <span
                className="h-1.5 w-1.5 animate-bounce rounded-full [animation-delay:240ms]"
                style={{ background: "conic-gradient(#0a7cff, #7c3aed, #14b8a6, #0a7cff)" }}
              />
            </div>
          )}

          {error && (
            <p className="rounded-xl bg-danger/10 px-3 py-2 text-xs text-danger">
              {error.message || "Am întâmpinat o problemă. Încearcă din nou."}
            </p>
          )}
        </div>

        <form
          className="flex items-center gap-2 border-t border-feather p-3"
          onSubmit={(e) => {
            e.preventDefault();
            submit(input);
          }}
        >
          <input
            value={input}
            onChange={(e) => setInput(e.target.value)}
            placeholder="Scrie-i Sierăi…"
            className="min-w-0 flex-1 rounded-full border border-feather bg-background px-4 py-2 text-sm text-ink outline-none focus:border-accent"
          />
          <button
            type="submit"
            disabled={busy || !input.trim()}
            className="flex h-9 w-9 shrink-0 items-center justify-center rounded-full bg-accent text-white transition-opacity disabled:opacity-40"
            title="Trimite"
          >
            <Send className="h-4 w-4" />
          </button>
        </form>
      </div>

<button
        onClick={() => setOpen((v) => !v)}
        title={open ? "Închide Siera" : "Deschide Siera"}
        aria-label={open ? "Închide Siera" : "Deschide Siera"}
        className={`fixed bottom-24 right-4 z-[70] transition-all duration-200 hover:scale-105 active:scale-95 md:bottom-6 md:right-6 ${
          bubbleHidden || open ? "pointer-events-none scale-0 opacity-0" : "scale-100 opacity-100"
        }`}
      >
        <SieraOrb size={56} active={busy} icon={<Bot className="h-6 w-6" />} />
      </button>
    </>
  );
}

"use client";

import { useEffect, useRef, useState } from "react";
import { useChat } from "@ai-sdk/react";
import { DefaultChatTransport, type UIMessage } from "ai";
import { Send, Sparkles } from "lucide-react";
import { cn } from "@/lib/utils";

const transport = (projectId: string) =>
  new DefaultChatTransport<UIMessage>({
    api: "/api/admin/ai-content/assistant",
    prepareSendMessagesRequest: ({ body, messages }) => ({
      body: {
        ...(body as object),
        messages,
        projectId,
      },
    }),
  });

function extractText(message: UIMessage): string {
  return (message.parts ?? [])
    .filter((p) => p.type === "text")
    .map((p) => p.text)
    .join("\n");
}

const SUGGESTIONS = [
  "Ce pasaje din surse acoperă conceptul...?",
  "Există deja conținut live despre...? (verifică duplicate)",
  "Rezumă unitatea curentă pe baza surselor.",
];

export function AssistantPanel({ projectId, projectName }: { projectId: string; projectName: string }) {
  const { messages, sendMessage, status, error } = useChat({
    transport: transport(projectId),
  });
  const [input, setInput] = useState("");
  const scrollRef = useRef<HTMLDivElement>(null);
  const busy = status === "submitted" || status === "streaming";

  useEffect(() => {
    const el = scrollRef.current;
    if (el) el.scrollTop = el.scrollHeight;
  }, [messages, status]);

  const submit = (text: string) => {
    const trimmed = text.trim();
    if (!trimmed || busy) return;
    sendMessage({ text: trimmed });
    setInput("");
  };

  return (
    <div className="flex h-[560px] flex-col overflow-hidden rounded-2xl border border-feather bg-card">
      <div className="flex items-center gap-3 border-b border-feather px-5 py-3">
        <div className="flex h-9 w-9 items-center justify-center rounded-xl bg-accent/10 text-accent">
          <Sparkles className="h-4 w-4" />
        </div>
        <div>
          <p className="text-sm font-extrabold text-ink">Asistent AI Content Studio</p>
          <p className="text-xs text-subtle">
            Caută în sursele proiectului „{projectName}” și verifică duplicate live.
          </p>
        </div>
      </div>

      <div ref={scrollRef} className="min-h-0 flex-1 space-y-4 overflow-y-auto px-5 py-4">
        {messages.length === 0 && (
          <div className="rounded-2xl bg-ink/5 px-4 py-3 text-sm text-subtle">
            Întreabă-mă despre sursele proiectului sau cere o verificare de duplicate înainte de publicare.
          </div>
        )}
        {messages.map((m) => (
          <div
            key={m.id}
            className={cn(
              "max-w-[85%] whitespace-pre-wrap rounded-2xl px-4 py-2.5 text-sm",
              m.role === "user"
                ? "ml-auto bg-accent text-white"
                : "bg-ink/5 text-ink"
            )}
          >
            {extractText(m) || (m.role === "user" ? "" : "(căutare în curs…)" )}
          </div>
        ))}
        {status === "submitted" && (
          <div className="rounded-2xl bg-ink/5 px-4 py-2.5 text-sm text-subtle">
            Asistentul caută…
          </div>
        )}
        {error && (
          <p className="rounded-2xl bg-danger/10 px-4 py-2.5 text-xs text-danger">
            {error.message || "Am întâmpinat o problemă. Încearcă din nou."}
          </p>
        )}
      </div>

      <div className="border-t border-feather px-5 py-3">
        {!busy && messages.length < 2 && (
          <div className="mb-2 flex flex-wrap gap-2">
            {SUGGESTIONS.map((s) => (
              <button
                key={s}
                type="button"
                onClick={() => submit(s)}
                className="rounded-full border border-feather px-3 py-1.5 text-xs font-semibold text-subtle transition-colors hover:border-accent hover:text-accent"
              >
                {s}
              </button>
            ))}
          </div>
        )}
        <form
          className="flex items-center gap-2"
          onSubmit={(e) => {
            e.preventDefault();
            submit(input);
          }}
        >
          <input
            value={input}
            onChange={(e) => setInput(e.target.value)}
            placeholder="ex. Caută pasajele despre derivate în surse"
            className="min-w-0 flex-1 rounded-full border border-feather bg-background px-4 py-2.5 text-sm font-semibold text-ink outline-none transition-colors focus:border-accent"
          />
          <button
            type="submit"
            disabled={busy || !input.trim()}
            aria-label="Trimite"
            className="flex h-10 w-10 shrink-0 items-center justify-center rounded-full bg-accent text-white transition-colors hover:bg-accent-dark disabled:opacity-50"
          >
            <Send className="h-4 w-4" />
          </button>
        </form>
      </div>
    </div>
  );
}
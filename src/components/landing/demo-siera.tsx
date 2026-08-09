"use client";

import { useEffect, useRef, useState } from "react";
import { AnimatePresence, motion } from "framer-motion";
import { Send } from "lucide-react";
import { SieraOrb } from "@/components/siera/siera-orb";
import { cn } from "@/lib/utils";
import { sieraGeneric, sieraTopics } from "@/components/landing/mock-data";

interface Message {
  id: number;
  from: "ai" | "user";
  text: string;
}

let nextId = 1;

export function DemoSiera() {
  const [messages, setMessages] = useState<Message[]>([
    {
      id: 0,
      from: "ai",
      text:
        "Bună! Sunt Siera, asistenta ta de studiu. Pot să îți rezum lecții, să-ți explic exerciții sau să-ți pregătesc mini-teste. Ce învățăm azi?",
    },
  ]);
  const [typing, setTyping] = useState(false);
  const [asked, setAsked] = useState<Set<string>>(new Set());
  const [draft, setDraft] = useState("");
  const [genericIndex, setGenericIndex] = useState(0);
  const scrollRef = useRef<HTMLDivElement>(null);
  const timerRef = useRef<ReturnType<typeof setTimeout> | null>(null);

  useEffect(() => {
    return () => {
      if (timerRef.current) clearTimeout(timerRef.current);
    };
  }, []);

  useEffect(() => {
    const el = scrollRef.current;
    if (el) el.scrollTop = el.scrollHeight;
  }, [messages, typing]);

  function push(from: "ai" | "user", text: string) {
    setMessages((m) => [...m, { id: nextId++, from, text }]);
  }

  function askTopic(topic: (typeof sieraTopics)[number]) {
    if (asked.has(topic.id) || typing) return;
    setAsked((s) => new Set(s).add(topic.id));
    push("user", topic.label);
    setTyping(true);
    timerRef.current = setTimeout(() => {
      setTyping(false);
      push("ai", topic.answer);
    }, 1100 + Math.random() * 500);
  }

  function sendFreeText(text: string) {
    const trimmed = text.trim();
    if (!trimmed || typing) return;
    push("user", trimmed);
    setDraft("");
    setTyping(true);
    timerRef.current = setTimeout(() => {
      setTyping(false);
      push("ai", sieraGeneric[genericIndex % sieraGeneric.length]);
      setGenericIndex((i) => i + 1);
    }, 900 + Math.random() * 600);
  }

  const remaining = sieraTopics.filter((t) => !asked.has(t.id));

  return (
    <div className="siera-sheet mx-auto flex w-full max-w-xl flex-col rounded-[2rem]">
      <div className="flex flex-col items-center border-b border-feather/55 pb-4 pt-6">
        <div className="siera-hero__orb h-[72px] w-[72px]">
          <SieraOrb
            mood={typing ? "thinking" : "happy"}
            gaze="user"
            className="h-full w-full"
          />
        </div>
        <p className="mt-3 text-lg font-extrabold text-ink">Siera</p>
        <p className="text-xs font-semibold text-subtle">
          Asistenta ta de studiu · demo
        </p>
      </div>

      <div
        ref={scrollRef}
        className="flex min-h-[300px] max-h-[360px] flex-col gap-3 overflow-y-auto px-4 py-4"
      >
        {messages.map((m) => (
          <div
            key={m.id}
            className={cn(
              "flex",
              m.from === "user" ? "justify-end" : "justify-start"
            )}
          >
            <div
              className={
                m.from === "user" ? "siera-msg-user" : "siera-msg-ai"
              }
            >
              {m.text}
            </div>
          </div>
        ))}

        <AnimatePresence>
          {typing && (
            <motion.div
              initial={{ opacity: 0, y: 6 }}
              animate={{ opacity: 1, y: 0 }}
              exit={{ opacity: 0, y: 6 }}
            >
              <div className="siera-msg-ai siera-typing w-fit">
                {[0, 1, 2].map((i) => (
                  <span
                    key={i}
                    className="siera-typing__dot"
                    style={{ animationDelay: `${i * 0.15}s` }}
                  />
                ))}
              </div>
            </motion.div>
          )}
        </AnimatePresence>
      </div>

      {remaining.length > 0 && (
        <div className="flex flex-wrap gap-2 px-4 pb-3">
          {remaining.map((t) => (
            <button
              key={t.id}
              type="button"
              onClick={() => askTopic(t)}
              className="rounded-full border border-accent/30 bg-accent/10 px-3.5 py-1.5 text-xs font-bold text-accent transition-all hover:bg-accent/20 active:translate-y-[1px]"
            >
              {t.label}
            </button>
          ))}
        </div>
      )}

      <div className="flex items-center gap-2 border-t border-feather/55 p-3">
        <input
          value={draft}
          onChange={(e) => setDraft(e.target.value)}
          onKeyDown={(e) => {
            if (e.key === "Enter") sendFreeText(draft);
          }}
          placeholder="Scrie-i Sierai…"
          className="min-w-0 flex-1 rounded-full border border-feather bg-card px-4 py-2.5 text-sm font-medium text-ink outline-none transition-colors placeholder:text-subtle/70 focus:border-accent/50"
          aria-label="Scrie un mesaj"
        />
        <button
          type="button"
          onClick={() => sendFreeText(draft)}
          disabled={!draft.trim() || typing}
          className="flex h-10 w-10 shrink-0 items-center justify-center rounded-full bg-accent text-white transition-all hover:bg-accent-dark disabled:opacity-40"
          aria-label="Trimite"
        >
          <Send className="h-4 w-4" />
        </button>
      </div>
    </div>
  );
}

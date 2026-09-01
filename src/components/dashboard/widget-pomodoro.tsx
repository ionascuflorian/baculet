"use client";

import { useCallback, useEffect, useRef, useState } from "react";
import { Timer, Play, Pause, RotateCcw, Minus, Plus, Bell, BellOff } from "lucide-react";
import { cn } from "@/lib/utils";
import { WidgetShell } from "@/components/dashboard/widget-shell";

type Phase = "focus" | "break" | "longBreak";

interface Settings {
  focus: number;
  break: number;
  longBreak: number;
}

const DEFAULT_SETTINGS: Settings = { focus: 25, break: 5, longBreak: 15 };

const PHASE_LABEL: Record<Phase, string> = {
  focus: "Focus",
  break: "Pauză",
  longBreak: "Pauză lungă",
};

const PHASE_BADGE: Record<Phase, string> = {
  focus: "bg-danger/10 text-danger",
  break: "bg-success/10 text-success",
  longBreak: "bg-warning/10 text-warning",
};

const PHASE_BAR: Record<Phase, string> = {
  focus: "bg-danger",
  break: "bg-success",
  longBreak: "bg-warning",
};

const STORAGE_KEY = "baculet:pomodoro:v1";

const pad = (n: number) => String(n).padStart(2, "0");

function formatTotal(totalSeconds: number): string {
  const m = Math.floor(totalSeconds / 60);
  const s = totalSeconds % 60;
  return `${pad(m)}:${pad(s)}`;
}

function nextPhaseInfo(phase: Phase, round: number): { phase: Phase; round: number } {
  if (phase === "focus") {
    const r = round + 1;
    return r % 4 === 0 ? { phase: "longBreak", round: r } : { phase: "break", round: r };
  }
  return { phase: "focus", round: phase === "longBreak" ? 0 : round };
}

interface Persisted {
  settings?: Partial<Settings>;
  phase?: Phase;
  secondsLeft?: number;
  running?: boolean;
  endTime?: number | null;
  round?: number;
  touched?: boolean;
  notifyOn?: boolean;
}

export function PomodoroWidget() {
  const [settings, setSettings] = useState<Settings>(DEFAULT_SETTINGS);
  const [phase, setPhase] = useState<Phase>("focus");
  const [secondsLeft, setSecondsLeft] = useState(DEFAULT_SETTINGS.focus * 60);
  const [running, setRunning] = useState(false);
  const [endTime, setEndTime] = useState<number | null>(null);
  const [round, setRound] = useState(0);
  const [touched, setTouched] = useState(false);
  const [notifyOn, setNotifyOn] = useState(false);
  const [clock, setClock] = useState<Date>(() => new Date());

  const audioRef = useRef<AudioContext | null>(null);
  const baseTitleRef = useRef<string | null>(null);

  const shown = touched ? secondsLeft : settings[phase] * 60;
  const currentFull = settings[phase] * 60;
  const progress = currentFull > 0 ? 1 - shown / currentFull : 0;

  useEffect(() => {
    const id = setInterval(() => setClock(new Date()), 1000);
    return () => clearInterval(id);
  }, []);

  useEffect(() => {
    const id = setTimeout(() => {
      try {
        const raw = localStorage.getItem(STORAGE_KEY);
        if (!raw) return;
        const p = JSON.parse(raw) as Persisted;
        if (p.settings) setSettings((s) => ({ ...s, ...p.settings }));
        if (p.phase) setPhase(p.phase);
        if (typeof p.round === "number") setRound(p.round);
        if (typeof p.touched === "boolean") setTouched(p.touched);
        if (typeof p.notifyOn === "boolean") setNotifyOn(p.notifyOn);

        const phaseName = p.phase ?? "focus";
        if (p.running && typeof p.endTime === "number") {
          const left = Math.round((p.endTime - Date.now()) / 1000);
          if (left > 0) {
            setRunning(true);
            setEndTime(p.endTime);
            setSecondsLeft(left);
          } else {
            const merged = { ...DEFAULT_SETTINGS, ...(p.settings ?? {}) };
            const next = nextPhaseInfo(phaseName, p.round ?? 0);
            setPhase(next.phase);
            setRound(next.round);
            setSecondsLeft(merged[next.phase] * 60);
          }
        } else if (typeof p.secondsLeft === "number") {
          setSecondsLeft(p.secondsLeft);
        }
      } catch {
        // stare locală coruptă: ignorăm și pornim de la default
      }
    }, 0);
    return () => clearTimeout(id);
  }, []);

  useEffect(() => {
    try {
      localStorage.setItem(
        STORAGE_KEY,
        JSON.stringify({ settings, phase, secondsLeft, running, endTime, round, touched, notifyOn })
      );
    } catch {
      // localStorage indisponibil
    }
  }, [settings, phase, secondsLeft, running, endTime, round, touched, notifyOn]);

  useEffect(() => {
    if (baseTitleRef.current === null) baseTitleRef.current = document.title;
    if (running) {
      document.title = `🍅 ${formatTotal(shown)} · ${PHASE_LABEL[phase]}`;
    } else if (baseTitleRef.current !== null) {
      document.title = baseTitleRef.current;
    }
    return () => {
      if (baseTitleRef.current !== null) document.title = baseTitleRef.current;
    };
  }, [running, shown, phase]);

  const getAudio = useCallback(() => {
    if (!audioRef.current && typeof window !== "undefined") {
      const Ctor =
        window.AudioContext ??
        (window as unknown as { webkitAudioContext?: typeof AudioContext }).webkitAudioContext;
      if (Ctor) audioRef.current = new Ctor();
    }
    return audioRef.current;
  }, []);

  // Colecție: închide contextul audio la demontare ca să nu expire resursele
  // browserului (browserele limitau nr. de contexte audio simultane).
  useEffect(() => {
    return () => {
      if (audioRef.current && audioRef.current.state !== "closed") {
        void audioRef.current.close();
      }
      audioRef.current = null;
    };
  }, []);

  const playBeep = useCallback(() => {
    const ctx = audioRef.current ?? getAudio();
    if (!ctx) return;
    if (ctx.state === "suspended") void ctx.resume();
    const now = ctx.currentTime;
    for (let i = 0; i < 3; i++) {
      const osc = ctx.createOscillator();
      const gain = ctx.createGain();
      osc.type = "sine";
      osc.frequency.value = 880;
      const t0 = now + i * 0.24;
      gain.gain.setValueAtTime(0.0001, t0);
      gain.gain.exponentialRampToValueAtTime(0.25, t0 + 0.02);
      gain.gain.exponentialRampToValueAtTime(0.0001, t0 + 0.22);
      osc.connect(gain);
      gain.connect(ctx.destination);
      osc.start(t0);
      osc.stop(t0 + 0.24);
    }
  }, [getAudio]);

  const maybeNotify = useCallback(
    (nextPhase: Phase) => {
      if (!notifyOn || typeof Notification === "undefined") return;
      if (Notification.permission !== "granted") return;
      if (document.visibilityState === "visible") return;
      try {
        new Notification("🍅 Baculet", { body: `Faza „${PHASE_LABEL[nextPhase]}” a început.` });
      } catch {
        // notificare indisponibilă
      }
    },
    [notifyOn]
  );

  useEffect(() => {
    if (!running || endTime == null) return;
    const id = setInterval(() => {
      const left = Math.max(0, Math.round((endTime - Date.now()) / 1000));
      setSecondsLeft(left);
      if (left <= 0) {
        const { phase: np, round: nr } = nextPhaseInfo(phase, round);
        const dur = settings[np] * 60;
        setPhase(np);
        setRound(nr);
        setSecondsLeft(dur);
        setEndTime(Date.now() + dur * 1000);
        playBeep();
        maybeNotify(np);
      }
    }, 500);
    return () => clearInterval(id);
  }, [running, endTime, phase, round, settings, playBeep, maybeNotify]);

  function start() {
    getAudio();
    let base = secondsLeft;
    if (!touched) {
      base = settings[phase] * 60;
      setSecondsLeft(base);
      setTouched(true);
    }
    if (base <= 0) base = settings[phase] * 60;
    setRunning(true);
    setEndTime(Date.now() + base * 1000);
  }

  function pause() {
    setRunning(false);
    setEndTime(null);
  }

  function reset() {
    setRunning(false);
    setEndTime(null);
    setPhase("focus");
    setRound(0);
    setTouched(false);
    setSecondsLeft(settings.focus * 60);
  }

  function changeDuration(key: Phase, delta: number) {
    setSettings((prev) => {
      const next = Math.min(120, Math.max(1, prev[key] + delta));
      return next === prev[key] ? prev : { ...prev, [key]: next };
    });
  }

  async function toggleNotify() {
    if (typeof Notification === "undefined") return;
    if (notifyOn) {
      setNotifyOn(false);
      return;
    }
    const perm = await Notification.requestPermission();
    setNotifyOn(perm === "granted");
  }

  const timeText = formatTotal(shown);
  const hh = pad(clock.getHours());
  const mm = pad(clock.getMinutes());
  const ss = pad(clock.getSeconds());
  const dateText = clock.toLocaleDateString("ro-RO", {
    weekday: "long",
    day: "numeric",
    month: "long",
  });

  return (
    <WidgetShell
      title="Timer & Pomodoro"
      icon={<Timer className="size-4 text-accent" />}
      action={
        <button
          onClick={toggleNotify}
          aria-label={notifyOn ? "Dezactivează notificările" : "Activează notificările"}
          className={cn(
            "grid size-8 place-items-center rounded-full transition",
            notifyOn ? "bg-accent/10 text-accent" : "text-subtle hover:bg-ink/5"
          )}
        >
          {notifyOn ? <Bell className="size-4" /> : <BellOff className="size-4" />}
        </button>
      }
    >
      <div className="inset mb-3 rounded-xl p-3 text-center">
        <p
          className="text-3xl font-extrabold tabular-nums tracking-tight text-ink"
          suppressHydrationWarning
        >
          {hh}:{mm}
          <span className="text-accent" suppressHydrationWarning>
            :{ss}
          </span>
        </p>
        <p
          className="mt-0.5 text-xs font-semibold text-subtle capitalize"
          suppressHydrationWarning
        >
          {dateText}
        </p>
      </div>

      <div className="flex items-center justify-between gap-3">
        <span className={cn("rounded-full px-2.5 py-1 text-xs font-bold", PHASE_BADGE[phase])}>
          {PHASE_LABEL[phase]}
          {phase === "focus" && round > 0 ? ` · ${round}/4` : ""}
        </span>
        <span className="text-3xl font-extrabold tabular-nums tracking-tight text-ink">
          {timeText}
        </span>
      </div>

      <div className="mt-3 h-2 overflow-hidden rounded-full bg-ink/10">
        <div
          className={cn("h-full rounded-full transition-[width] duration-500", PHASE_BAR[phase])}
          style={{ width: `${Math.round(progress * 100)}%` }}
        />
      </div>

      <div className="mt-4 flex items-center justify-center gap-3">
        {running ? (
          <button
            onClick={pause}
            className="flex items-center gap-2 rounded-full bg-warning px-5 py-2.5 text-sm font-bold text-white transition hover:opacity-90"
          >
            <Pause className="size-4" /> Pauză
          </button>
        ) : (
          <button
            onClick={start}
            className="flex items-center gap-2 rounded-full bg-accent px-5 py-2.5 text-sm font-bold text-white transition hover:bg-accent-dark"
          >
            <Play className="size-4" /> {touched && secondsLeft > 0 ? "Continuă" : "Start"}
          </button>
        )}
        <button
          onClick={reset}
          aria-label="Resetează timerul"
          className="grid size-10 place-items-center rounded-full bg-ink/5 text-subtle transition hover:bg-ink/10 hover:text-ink"
        >
          <RotateCcw className="size-4" />
        </button>
      </div>

      <div className="mt-4 grid grid-cols-3 gap-2">
        {(["focus", "break", "longBreak"] as Phase[]).map((key) => (
          <div
            key={key}
            className="inset flex flex-col items-center gap-1 rounded-xl px-1 py-2"
          >
            <span className="text-[10px] font-bold uppercase tracking-wide text-subtle">
              {PHASE_LABEL[key]}
            </span>
            <div className="flex items-center gap-1">
              <button
                onClick={() => changeDuration(key, -1)}
                aria-label={`Scade ${PHASE_LABEL[key]}`}
                className="grid size-6 place-items-center rounded-md bg-ink/5 text-subtle transition hover:bg-ink/10 hover:text-ink"
              >
                <Minus className="size-3.5" />
              </button>
              <span className="w-9 text-center text-sm font-extrabold tabular-nums text-ink">
                {settings[key]}
              </span>
              <button
                onClick={() => changeDuration(key, 1)}
                aria-label={`Crește ${PHASE_LABEL[key]}`}
                className="grid size-6 place-items-center rounded-md bg-ink/5 text-subtle transition hover:bg-ink/10 hover:text-ink"
              >
                <Plus className="size-3.5" />
              </button>
            </div>
            <span className="text-[10px] font-semibold text-subtle">min</span>
          </div>
        ))}
      </div>
    </WidgetShell>
  );
}

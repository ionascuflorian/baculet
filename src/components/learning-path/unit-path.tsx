"use client";

import Link from "next/link";
import { motion } from "framer-motion";
import { Check, Lock, Sparkles, RefreshCcw, Target, BookOpen } from "lucide-react";
import { cn } from "@/lib/utils";

export type UnitStatus = "LOCKED" | "AVAILABLE" | "IN_PROGRESS" | "COMPLETED" | "MASTERED" | "NEEDS_REVIEW";

export interface UnitWithStatus {
  id: string;
  title: string;
  slug: string;
  order: number;
  type: string;
  description: string | null;
  lessons: { id: string; title: string; slug: string }[];
  concepts: { id: string; name: string; slug: string }[];
  status: UnitStatus;
  progress: number;
  masteryAvg: number | null;
}

function getStatusMeta(status: UnitStatus) {
  switch (status) {
    case "LOCKED": return { label: "Blocat", icon: "🔒", color: "feather" };
    case "AVAILABLE": return { label: "Disponibil", icon: "●", color: "accent" };
    case "IN_PROGRESS": return { label: "În desfășurare", icon: "●", color: "warning" };
    case "COMPLETED": return { label: "Finalizat", icon: "✓", color: "success" };
    case "MASTERED": return { label: "Stăpânit", icon: "🏆", color: "success" };
    case "NEEDS_REVIEW": return { label: "De revizuit", icon: "↻", color: "warning" };
  }
}

interface Props {
  subjectSlug: string;
  chapterSlug: string;
  units: UnitWithStatus[];
}

const statusStyles: Record<string, string> = {
  LOCKED: "bg-feather/30 border-feather text-subtle",
  AVAILABLE: "bg-card border-accent text-accent hover:border-accent/60 hover:shadow-md",
  IN_PROGRESS: "bg-warning/10 border-warning/40 text-warning",
  COMPLETED: "bg-success/10 border-success/40 text-success",
  MASTERED: "bg-gradient-to-br from-success/20 to-accent/10 border-success text-success",
  NEEDS_REVIEW: "bg-warning/15 border-warning text-warning",
};

export function UnitPath({ subjectSlug, chapterSlug, units }: Props) {
  if (units.length === 0) {
    return (
      <div className="rounded-2xl border border-dashed border-feather p-8 text-center">
        <p className="text-sm font-semibold text-subtle">Băculeț te va ghida pas cu pas prin materia necesară pentru BAC.</p>
        <p className="mt-1 text-xs text-subtle">Hai să începem — prima unitate e deja disponibilă.</p>
      </div>
    );
  }

  return (
    <div className="relative mx-auto w-full max-w-xl">
      {/* linie verticală - ascunsă pe mobil îngust pentru performanță, doar 1px */}
      <div className="pointer-events-none absolute left-6 top-4 bottom-4 hidden w-px bg-feather/30 md:block md:left-1/2 md:-translate-x-1/2" aria-hidden />
      <div className="pointer-events-none absolute left-[22px] top-4 bottom-4 w-px bg-feather/30 md:hidden" aria-hidden />
      <div className="space-y-4">
        {units.map((unit, idx) => {
          const meta = getStatusMeta(unit.status);
          const href =
            unit.type === "CHECKPOINT"
              ? `/checkpoint/${unit.slug}`
              : unit.type === "RECAP"
                ? `/recapitulare?unit=${unit.slug}`
                : unit.lessons[0]
                  ? `/materii/${subjectSlug}/${chapterSlug}/${unit.lessons[0].slug}`
                  : `/materii/${subjectSlug}/${chapterSlug}`;
          const locked = unit.status === "LOCKED";
          const isRecap = unit.type === "RECAP";
          const isCheckpoint = unit.type === "CHECKPOINT";

          // aur = MASTERED (stăpânit), roșu/portocaliu = NEEDS_REVIEW / LOCKED
          // explică ce trebuie să fie în chenare: titlu clar + streak sub, nu trunchiat
          const card = (
            <div
              className={cn(
                "relative flex w-full items-center gap-3 rounded-2xl border p-3.5 sm:p-4 transition-colors",
                // performanță: fără gradient/blur, culori solide, will-change doar la hover
                unit.status === "LOCKED" && "bg-card border-feather/60 text-subtle",
                unit.status === "AVAILABLE" && "bg-card border-accent/40 hover:border-accent hover:shadow-sm",
                unit.status === "IN_PROGRESS" && "bg-warning/[0.06] border-warning/30",
                unit.status === "COMPLETED" && "bg-success/[0.06] border-success/30",
                unit.status === "MASTERED" && "bg-amber-50 dark:bg-amber-950/20 border-amber-300 dark:border-amber-700", // auriu = stăpânit
                unit.status === "NEEDS_REVIEW" && "bg-red-50 dark:bg-red-950/20 border-red-300 dark:border-red-800", // roșu = de revizuit
                isCheckpoint && unit.status !== "LOCKED" && "border-accent bg-accent/[0.04]",
                "min-h-[76px]" // țintă tactilă 44px+, evită înghesuială
              )}
              style={{ contentVisibility: "auto", containIntrinsicSize: "76px" } as React.CSSProperties}
            >
              <div
                className={cn(
                  "flex h-10 w-10 shrink-0 items-center justify-center rounded-full border-2 text-sm font-extrabold",
                  unit.status === "COMPLETED" && "bg-success text-white border-success",
                  unit.status === "MASTERED" && "bg-amber-500 text-white border-amber-500",
                  unit.status === "LOCKED" && "bg-feather/50 border-feather text-subtle",
                  unit.status === "AVAILABLE" && "bg-accent text-white border-accent",
                  unit.status === "NEEDS_REVIEW" && "bg-red-500 text-white border-red-500",
                  unit.status === "IN_PROGRESS" && "bg-warning text-white border-warning"
                )}
              >
                {unit.status === "COMPLETED" || unit.status === "MASTERED" ? (
                  <Check className="h-5 w-5" />
                ) : unit.status === "LOCKED" ? (
                  <Lock className="h-4 w-4" />
                ) : isCheckpoint ? (
                  <Target className="h-5 w-5" />
                ) : isRecap ? (
                  <RefreshCcw className="h-4 w-4" />
                ) : unit.status === "IN_PROGRESS" ? (
                  <span className="h-2 w-2 rounded-full bg-white animate-pulse" />
                ) : (
                  <BookOpen className="h-4 w-4" />
                )}
              </div>
              <div className="min-w-0 flex-1">
                <p className="text-[13px] font-extrabold leading-tight text-ink sm:text-sm">
                  <span className="line-clamp-2 sm:line-clamp-1 break-words">
                    {idx + 1}. {unit.title}
                  </span>
                  <span className="mt-1 inline-flex flex-wrap gap-1">
                    {isCheckpoint && <span className="rounded-full bg-accent px-2 py-0.5 text-[10px] font-bold text-white">CHECKPOINT</span>}
                    {isRecap && <span className="rounded-full bg-amber-100 dark:bg-amber-900/40 px-2 py-0.5 text-[10px] font-bold text-amber-700 dark:text-amber-300">RECAPITULARE</span>}
                    {unit.status === "MASTERED" && <span className="rounded-full bg-amber-500 px-2 py-0.5 text-[10px] font-bold text-white">STĂPÂNIT</span>}
                    {unit.status === "NEEDS_REVIEW" && <span className="rounded-full bg-red-500 px-2 py-0.5 text-[10px] font-bold text-white">DE REVIZUIT</span>}
                  </span>
                </p>
                <p className="mt-1 text-xs leading-tight text-subtle">
                  {unit.type === "LESSON" ? `${unit.lessons.length} lecție · ` : isRecap ? "2× din fiecare lecție · " : isCheckpoint ? "10 exerciții · " : ""}
                  {meta.label}
                  {unit.masteryAvg !== null && ` · ${unit.masteryAvg}%`}
                </p>
                {unit.type === "LESSON" && unit.progress > 0 && unit.progress < 100 && (
                  <div className="mt-2 h-1.5 w-full overflow-hidden rounded-full bg-feather">
                    <div className="h-full bg-accent" style={{ width: `${unit.progress}%` }} />
                  </div>
                )}
              </div>
              <div className="hidden shrink-0 text-xs font-bold sm:block">
                {unit.status === "MASTERED" && <span className="text-amber-600">🏆</span>}
                {unit.status === "COMPLETED" && <span className="text-success">✓</span>}
                {unit.status === "NEEDS_REVIEW" && <span className="text-red-500">↻</span>}
              </div>
            </div>
          );

          // performanță: fără motion pe mobil, doar pe desktop și doar pentru primele 6
          const MotionWrap = idx < 6 ? motion.div : "div" as any;
          const motionProps =
            idx < 6
              ? {
                  initial: { opacity: 0, y: 8 },
                  whileInView: { opacity: 1, y: 0 },
                  viewport: { once: true, margin: "0px 0px -10% 0px" },
                  transition: { duration: 0.22, delay: Math.min(idx * 0.03, 0.15) },
                }
              : {};

          return (
            <MotionWrap
              key={unit.id}
              {...motionProps}
              className="relative flex items-center gap-3"
            >
              {/* punct pe linie */}
              <div className="pointer-events-none absolute left-[22px] hidden h-2.5 w-2.5 -translate-x-1/2 rounded-full bg-feather md:left-1/2 md:block" style={{ top: "50%" }} aria-hidden />
              {/* pe mobil: card ocupă tot restul, fără ml-12 înghesuit */}
              <div className="w-full pl-10 md:pl-0 md:flex md:items-center md:gap-4">
                <div className="hidden md:block md:w-1/2" aria-hidden />
                <div className="w-full md:w-1/2">
                  {!locked ? (
                    <Link href={href} className="block" prefetch={false}>
                      {card}
                    </Link>
                  ) : (
                    <div className="opacity-75" aria-disabled>
                      {card}
                    </div>
                  )}
                </div>
              </div>
            </MotionWrap>
          );
        })}
      </div>
    </div>
  );
}

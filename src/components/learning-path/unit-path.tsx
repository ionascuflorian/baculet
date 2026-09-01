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
        <p className="mt-1 text-xs text-subtle">Hai să începem.</p>
      </div>
    );
  }

  return (
    <div className="relative mx-auto max-w-md md:max-w-lg">
      {/* linie verticală */}
      <div className="pointer-events-none absolute left-1/2 top-6 bottom-6 hidden w-px -translate-x-1/2 bg-feather/50 md:block" />
      <div className="absolute left-6 top-6 bottom-6 w-px bg-feather/40 md:hidden" />
      <div className="space-y-6">
        {units.map((unit, idx) => {
          const meta = getStatusMeta(unit.status);
          const isLeft = idx % 2 === 0;
          const href =
            unit.type === "CHECKPOINT"
              ? `/materii/${subjectSlug}/${chapterSlug}#checkpoint-${unit.slug}`
              : unit.lessons[0]
                ? `/materii/${subjectSlug}/${chapterSlug}/${unit.lessons[0].slug}`
                : `/materii/${subjectSlug}/${chapterSlug}`;
          const locked = unit.status === "LOCKED";
          const isRecap = unit.type === "RECAP";
          const isCheckpoint = unit.type === "CHECKPOINT";

          const card = (
            <div
              className={cn(
                "relative flex w-full items-center gap-3 rounded-2xl border-2 p-4 transition-all",
                statusStyles[unit.status],
                !locked && "hover:-translate-y-0.5",
                isCheckpoint && unit.status !== "LOCKED" && "bg-gradient-to-br from-accent/10 to-accent-dark/5 border-accent"
              )}
            >
              <div
                className={cn(
                  "flex h-10 w-10 shrink-0 items-center justify-center rounded-full border-2 text-sm font-extrabold",
                  unit.status === "COMPLETED" && "bg-success text-white border-success",
                  unit.status === "MASTERED" && "bg-success text-white border-success",
                  unit.status === "LOCKED" && "bg-feather/50 border-feather",
                  unit.status === "AVAILABLE" && "bg-accent text-white border-accent",
                  unit.status === "NEEDS_REVIEW" && "bg-warning text-white border-warning",
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
                <p className="text-sm font-extrabold text-ink truncate">
                  {idx + 1}. {unit.title}
                  {isCheckpoint && <span className="ml-2 rounded-full bg-accent px-2 py-0.5 text-[10px] font-bold text-white">CHECKPOINT</span>}
                  {isRecap && <span className="ml-2 rounded-full bg-warning/20 px-2 py-0.5 text-[10px] font-bold text-warning">RECAPITULARE</span>}
                </p>
                <p className="text-xs text-subtle truncate">
                  {unit.type === "LESSON" ? `${unit.lessons.length} lecție · ` : ""}
                  {meta.label}
                  {unit.masteryAvg !== null && ` · mastery ${unit.masteryAvg}%`}
                </p>
                {unit.type === "LESSON" && unit.progress > 0 && unit.progress < 100 && (
                  <div className="mt-1.5 h-1.5 w-full overflow-hidden rounded-full bg-feather">
                    <div className="h-full bg-accent transition-all" style={{ width: `${unit.progress}%` }} />
                  </div>
                )}
              </div>
              <div className="shrink-0 text-xs font-bold text-subtle">
                {unit.status === "MASTERED" && "🏆"}
                {unit.status === "COMPLETED" && "✓"}
                {unit.status === "NEEDS_REVIEW" && "↻"}
              </div>
            </div>
          );

          return (
            <motion.div
              key={unit.id}
              initial={{ opacity: 0, y: 12 }}
              animate={{ opacity: 1, y: 0 }}
              transition={{ delay: idx * 0.04, duration: 0.3 }}
              className={cn("relative md:flex md:items-center md:gap-4", isLeft ? "md:flex-row" : "md:flex-row-reverse")}
            >
              {/* desktop zig-zag: offset */}
              <div className={cn("hidden md:block md:w-1/2", isLeft ? "md:pr-6" : "md:pl-6")}>
                {!locked ? (
                  <Link href={href} className="block">
                    {card}
                  </Link>
                ) : (
                  <div className="opacity-60">{card}</div>
                )}
              </div>
              {/* nod central (desktop) */}
              <div className="absolute left-1/2 hidden h-3 w-3 -translate-x-1/2 rounded-full bg-feather md:block" style={{ top: "50%" }} />
              {/* mobile: full width with left offset */}
              <div className="md:hidden ml-12">
                {!locked ? (
                  <Link href={href} className="block">
                    {card}
                  </Link>
                ) : (
                  <div className="opacity-60">{card}</div>
                )}
              </div>
              {/* spacer for zigzag */}
              <div className="hidden md:block md:w-1/2" />
            </motion.div>
          );
        })}
      </div>
    </div>
  );
}

"use client";

import Link from "next/link";
import { motion } from "framer-motion";
import { Button } from "@/components/ui/button";
import { Progress } from "@/components/ui/progress";
import { ArrowRight, Brain, Target, RefreshCcw, Play, Lightbulb } from "lucide-react";

export interface NextAction {
  type: string;
  title: string;
  description: string;
  href: string;
  meta?: string;
  priority: number;
}

const iconMap: Record<string, typeof Play> = {
  CONTINUE_LESSON: Play,
  REVIEW_WEAK: Brain,
  REVIEW_SCHEDULED: RefreshCcw,
  NEXT_LESSON: Play,
  CHECKPOINT: Target,
  PRACTICE: Lightbulb,
  DIAGNOSTIC: Brain,
  START_PATH: Play,
};

export function NextActionCard({ action, progress }: { action: NextAction; progress?: number }) {
  const Icon = iconMap[action.type] || Play;
  return (
    <motion.div
      initial={{ opacity: 0, y: 12 }}
      animate={{ opacity: 1, y: 0 }}
      className="rounded-[1.5rem] border-2 border-accent/20 bg-gradient-to-br from-accent/10 via-accent/5 to-card p-6 shadow-sm"
    >
      <p className="text-xs font-extrabold uppercase tracking-widest text-accent">{action.meta}</p>
      <div className="mt-1 flex items-start gap-3">
        <div className="flex h-10 w-10 shrink-0 items-center justify-center rounded-xl bg-accent text-white">
          <Icon className="h-5 w-5" />
        </div>
        <div className="flex-1">
          <h3 className="text-lg font-extrabold text-ink">{action.title}</h3>
          <p className="text-sm text-subtle">{action.description}</p>
          {typeof progress === "number" && (
            <div className="mt-2">
              <Progress value={progress} className="h-2" />
            </div>
          )}
        </div>
      </div>
      <Button asChild size="lg" className="mt-4 w-full sm:w-auto">
        <Link href={action.href}>
          Continuă <ArrowRight className="h-4 w-4" />
        </Link>
      </Button>
    </motion.div>
  );
}

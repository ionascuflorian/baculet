import Link from "next/link";
import { Brain, AlertTriangle, ArrowRight } from "lucide-react";
import { Card, CardContent, CardHeader, CardTitle } from "@/components/ui/card";
import { Button } from "@/components/ui/button";
import { Badge } from "@/components/ui/badge";

interface RecapItem {
  id: string;
  text: string;
  concept: string | null;
  quizTitle: string;
  failCount: number;
}

export function RecapWidget({ items, dueCount }: { items: RecapItem[]; dueCount: number }) {
  if (dueCount === 0) {
    return (
      <Card className="border-success/30 bg-success/5">
        <CardContent className="py-4 flex items-center gap-3">
          <Brain className="h-6 w-6 text-success" />
          <div>
            <p className="text-sm font-extrabold text-ink">Ești la zi! 🎉</p>
            <p className="text-xs text-subtle">Nicio recapitulare urgentă. Continuă să exersezi.</p>
          </div>
        </CardContent>
      </Card>
    );
  }
  return (
    <Card className="border-warning/30">
      <CardHeader className="flex flex-row items-center justify-between">
        <CardTitle className="flex items-center gap-2 text-base"><AlertTriangle className="h-5 w-5 text-warning" /> Recapitulare</CardTitle>
        <Badge variant="neutral">{dueCount} de revizuit</Badge>
      </CardHeader>
      <CardContent className="space-y-3">
        {items.slice(0, 3).map((it) => (
          <div key={it.id} className="rounded-xl border border-feather p-3">
            <p className="text-sm font-bold text-ink line-clamp-2">{it.text}</p>
            <p className="text-xs text-subtle">{it.quizTitle} {it.concept && `· ${it.concept}`} · greșit {it.failCount}x</p>
          </div>
        ))}
        <Button asChild size="sm" className="w-full">
          <Link href="/recapitulare">Începe recapitularea <ArrowRight className="h-4 w-4" /></Link>
        </Button>
      </CardContent>
    </Card>
  );
}

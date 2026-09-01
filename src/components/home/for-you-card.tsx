import Link from "next/link";
import { Button } from "@/components/ui/button";
import { Card, CardContent, CardHeader, CardTitle } from "@/components/ui/card";

interface WeakConcept {
  conceptId: string;
  name: string;
  mastery: number;
}

export function ForYouCard({ weak }: { weak: WeakConcept[] }) {
  if (weak.length === 0) return null;
  return (
    <Card className="border-warning/20">
      <CardHeader>
        <CardTitle className="flex items-center gap-2 text-base">🔴 Pentru tine</CardTitle>
      </CardHeader>
      <CardContent className="space-y-3">
        {weak.slice(0, 2).map((w) => (
          <div key={w.conceptId} className="rounded-xl border border-feather p-3">
            <p className="text-sm font-bold text-ink">{w.name}</p>
            <p className="text-xs text-subtle">Mastery {w.mastery}% — ai întâmpinat dificultăți aici.</p>
            <Button asChild size="sm" variant="outline" className="mt-2">
              <Link href={`/recapitulare?concept=${w.conceptId}`}>Exersează</Link>
            </Button>
          </div>
        ))}
      </CardContent>
    </Card>
  );
}

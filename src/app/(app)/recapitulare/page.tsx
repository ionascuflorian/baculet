import Link from "next/link";
import { auth } from "@/lib/auth";
import { getDueReviews } from "@/lib/spaced-repetition";
import { prisma } from "@/lib/db";
import { Button } from "@/components/ui/button";
import { Card, CardContent } from "@/components/ui/card";
import { ArrowLeft, Brain } from "lucide-react";

export default async function RecapPage() {
  const session = await auth();
  const userId = session!.user.id;

  const due = await getDueReviews(userId, 20);

  if (due.length === 0) {
    return (
      <div className="mx-auto max-w-2xl space-y-6 text-center">
        <div className="flex justify-center"><div className="flex h-16 w-16 items-center justify-center rounded-3xl bg-success/10 text-3xl">🧠</div></div>
        <h1 className="text-3xl font-extrabold text-ink">Nimic de recapitulat</h1>
        <p className="text-subtle">Nu ai greșeli recente. Continuă să rezolvi teste și sistemul va genera automat recapitulări personalizate.</p>
        <Button asChild variant="secondary"><Link href="/materii">Mergi la materii</Link></Button>
      </div>
    );
  }

  const grouped = new Map<string, typeof due>();
  for (const r of due) {
    const key = r.question.quiz.slug;
    if (!grouped.has(key)) grouped.set(key, []);
    grouped.get(key)!.push(r);
  }

  return (
    <div className="mx-auto max-w-3xl space-y-6">
      <Button asChild variant="ghost" size="sm" className="-ml-3"><Link href="/dashboard"><ArrowLeft className="h-4 w-4" /> Dashboard</Link></Button>
      <div className="flex items-center gap-4">
        <div className="flex h-12 w-12 items-center justify-center rounded-2xl bg-warning/15"><Brain className="h-6 w-6 text-warning" /></div>
        <div>
          <h1 className="text-2xl font-extrabold text-ink">Recapitulare personalizată</h1>
          <p className="text-sm text-subtle">{due.length} concepte unde ai greșit — repetă-le azi (spaced repetition).</p>
        </div>
      </div>

      <div className="space-y-3">
        {due.map((r) => (
          <Card key={r.id} className="border-warning/30">
            <CardContent className="py-4">
              <p className="text-sm font-bold text-ink">{r.question.text}</p>
              <p className="mt-1 text-xs text-subtle">{r.question.quiz.title} · {r.question.concept ?? "general"} · greșit {r.failCount}x · următoarea revizuire: {r.nextReviewAt.toLocaleDateString("ro-RO")}</p>
              <div className="mt-2 flex flex-wrap gap-1.5">
                {(r.question.options as string[]).map((opt, i) => (
                  <span key={i} className={`rounded-full px-2.5 py-1 text-xs font-bold ${i === r.question.correctIndex ? "bg-success/15 text-success" : "bg-feather text-subtle"}`}>{String.fromCharCode(65 + i)}. {opt}</span>
                ))}
              </div>
              {r.question.explanation && <p className="mt-2 rounded-lg bg-accent/10 px-3 py-2 text-sm text-ink">💡 {r.question.explanation}</p>}
            </CardContent>
          </Card>
        ))}
      </div>

      <Card className="bg-accent/5">
        <CardContent className="py-4 text-center">
          <p className="text-sm font-bold text-ink">Vrei să exersezi? Deschide testele originale și rezolvă din nou întrebările.</p>
          <div className="mt-3 flex flex-wrap justify-center gap-2">
            {Array.from(grouped.entries()).slice(0, 3).map(([slug, items]) => (
              <Button key={slug} asChild size="sm" variant="outline">
                <Link href={`/teste/${slug}`}>Exersează {items[0].question.quiz.title}</Link>
              </Button>
            ))}
          </div>
        </CardContent>
      </Card>
    </div>
  );
}

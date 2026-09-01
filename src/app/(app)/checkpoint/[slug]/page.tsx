import { notFound } from "next/navigation";
import { auth } from "@/lib/auth";
import { prisma } from "@/lib/db";
import { Card, CardContent, CardHeader, CardTitle } from "@/components/ui/card";
import { Button } from "@/components/ui/button";
import Link from "next/link";
import { Target, CheckCircle2, AlertTriangle } from "lucide-react";

export default async function CheckpointPage({ params }: { params: Promise<{ slug: string }> }) {
  const { slug } = await params;
  const session = await auth();
  const userId = session!.user.id;

  const checkpoint = await prisma.checkpoint.findUnique({
    where: { slug },
    include: {
      chapter: { include: { subject: true } },
      unit: { include: { chapter: { include: { subject: true } } } },
    },
  });
  if (!checkpoint) notFound();

  const subjectSlug = checkpoint.chapter?.subject.slug ?? checkpoint.unit?.chapter.subject.slug ?? "";
  const chapterSlug = checkpoint.chapter?.slug ?? checkpoint.unit?.chapter.slug ?? "";
  const title = checkpoint.title;

  // găsește quiz-ul asociat (dacă există, folosim cel mai recent test din materie ca proxy)
  // pentru demo, luăm 5 întrebări random din capitol
  const questions = await prisma.question.findMany({
    where: {
      quiz: {
        subject: { slug: subjectSlug },
        chapter: { slug: chapterSlug },
      },
    },
    take: 10,
    orderBy: { order: "asc" },
    select: { id: true, text: true, options: true, conceptId: true, concept: true },
  });

  // fallback: dacă nu există întrebări pe capitol, ia din materie
  const fallback =
    questions.length < 5
      ? await prisma.question.findMany({
          where: { quiz: { subject: { slug: subjectSlug } } },
          take: 10 - questions.length,
          orderBy: { order: "asc" },
          select: { id: true, text: true, options: true, conceptId: true, concept: true },
        })
      : [];

  const allQs = [...questions, ...fallback].slice(0, 10);

  const attempts = await prisma.checkpointAttempt.findMany({
    where: { userId, checkpointId: checkpoint.id },
    orderBy: { createdAt: "desc" },
    take: 3,
  });
  const last = attempts[0];
  const pct = last ? Math.round((last.score / last.maxScore) * 100) : null;

  return (
    <div className="mx-auto max-w-2xl space-y-6">
      <div className="flex items-center gap-3">
        <div className="flex h-10 w-10 items-center justify-center rounded-xl bg-accent text-white">
          <Target className="h-5 w-5" />
        </div>
        <div>
          <h1 className="text-2xl font-extrabold text-ink">{title}</h1>
          <p className="text-sm text-subtle">Checkpoint — combină conceptele învățate. Nu te trimitem la început dacă nu iei 10/10.</p>
        </div>
      </div>

      {last && (
        <Card className={pct! >= 60 ? "border-success/30 bg-success/5" : "border-warning/30 bg-warning/5"}>
          <CardContent className="p-4 flex items-center gap-3">
            {pct! >= 60 ? <CheckCircle2 className="h-6 w-6 text-success" /> : <AlertTriangle className="h-6 w-6 text-warning" />}
            <div>
              <p className="text-sm font-bold text-ink">Ultimul rezultat: {last.score}/{last.maxScore} — {pct}%</p>
              <p className="text-xs text-subtle">
                {pct! >= 90 ? "Foarte bine!" : pct! >= 60 ? "Ai baza necesară — hai să consolidăm punctele slabe." : "Hai să refacem conceptele de bază împreună."}
              </p>
            </div>
          </CardContent>
        </Card>
      )}

      <Card>
        <CardHeader>
          <CardTitle className="text-base">Despre acest checkpoint</CardTitle>
        </CardHeader>
        <CardContent className="space-y-3 text-sm text-subtle">
          <p>• 10 exerciții care combină conceptele din capitol.</p>
          <p>• Dacă greșești la 2 concepte, Băculeț creează automat o sesiune scurtă de review doar pentru ele.</p>
          <p>• Nu blochează progresul agresiv — identificăm exact ce trebuie consolidat.</p>
          {allQs.length === 0 && <p className="text-warning font-semibold">Nu există încă întrebări pentru acest checkpoint (demo). Adaugă întrebări cu concepte în admin.</p>}
        </CardContent>
      </Card>

      {allQs.length > 0 ? (
        <Card>
          <CardHeader>
            <CardTitle className="text-base">Întrebări (demo)</CardTitle>
          </CardHeader>
          <CardContent className="space-y-3">
            {allQs.map((q, i) => (
              <div key={q.id} className="rounded-xl border border-feather p-3">
                <p className="text-sm font-bold text-ink">{i + 1}. {q.text}</p>
                <p className="text-xs text-subtle">Concept: {q.concept ?? q.conceptId ?? "general"}</p>
              </div>
            ))}
            <Button className="w-full" disabled>
              Dă checkpoint-ul (în curând — va crea sesiune de review automată)
            </Button>
            <p className="text-xs text-subtle text-center">Demo: evaluarea completă + sesiunea de review scurtă vor fi activate în etapa următoare.</p>
          </CardContent>
        </Card>
      ) : (
        <Card className="border-dashed">
          <CardContent className="p-6 text-center text-sm text-subtle">Adaugă exerciții cu concepte în admin pentru a activa checkpoint-ul.</CardContent>
        </Card>
      )}

      <div className="flex gap-2">
        <Button asChild variant="outline">
          <Link href={`/materii/${subjectSlug}`}>Înapoi la traseu</Link>
        </Button>
        <Button asChild variant="ghost">
          <Link href="/recapitulare">Mergi la recapitulare</Link>
        </Button>
      </div>
    </div>
  );
}

import { notFound } from "next/navigation";
import { prisma } from "@/lib/db";
import { Card, CardContent, CardHeader, CardTitle } from "@/components/ui/card";
import { Button } from "@/components/ui/button";
import Link from "next/link";

export default async function DiagnosticPage({ params }: { params: Promise<{ slug: string }> }) {
  const { slug } = await params;
  const subject = await prisma.subject.findUnique({ where: { slug }, select: { name: true, slug: true } });
  if (!subject) notFound();

  // 5-10 exerciții demo, luate din materie
  const questions = await prisma.question.findMany({
    where: { quiz: { subject: { slug } } },
    take: 7,
    orderBy: { order: "asc" },
    select: { id: true, text: true, options: true },
  });

  return (
    <div className="mx-auto max-w-2xl space-y-6">
      <div>
        <h1 className="text-2xl font-extrabold text-ink">Hai să vedem de unde pornim</h1>
        <p className="text-sm text-subtle">Diagnostic scurt (5–10 exerciții) — nu sărim materia de bază, doar personalizăm traseul.</p>
      </div>

      <Card className="border-accent/20 bg-accent/5">
        <CardContent className="p-5">
          <p className="text-sm font-bold text-ink">Materia: {subject.name}</p>
          <p className="text-xs text-subtle">Pe baza rezultatelor, anumite concepte primesc mastery inițial și traseul îți va recomanda review acolo unde e nevoie.</p>
        </CardContent>
      </Card>

      {questions.length === 0 ? (
        <Card className="border-dashed">
          <CardContent className="p-6 text-center text-sm text-subtle">Nu există încă întrebări pentru diagnostic (demo). Începe traseul direct.</CardContent>
        </Card>
      ) : (
        <Card>
          <CardHeader>
            <CardTitle className="text-base">Exerciții diagnostic (demo)</CardTitle>
          </CardHeader>
          <CardContent className="space-y-3">
            {questions.map((q, i) => (
              <div key={q.id} className="rounded-xl border border-feather p-3">
                <p className="text-sm font-bold text-ink">{i + 1}. {q.text}</p>
                <div className="mt-1 flex flex-wrap gap-1.5">
                  {(q.options as string[]).map((o, idx) => (
                    <span key={idx} className="rounded-full bg-feather px-2.5 py-1 text-xs font-semibold text-subtle">
                      {String.fromCharCode(65 + idx)}. {o}
                    </span>
                  ))}
                </div>
              </div>
            ))}
            <Button className="w-full" disabled>
              Trimite diagnosticul (în curând — va seta mastery inițial)
            </Button>
            <p className="text-xs text-subtle text-center">Demo: diagnosticul nu blochează, doar personalizează.</p>
          </CardContent>
        </Card>
      )}

      <Button asChild>
        <Link href={`/materii/${slug}`}>Începe traseul →</Link>
      </Button>
    </div>
  );
}

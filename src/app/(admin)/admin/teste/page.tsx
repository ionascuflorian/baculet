import Link from "next/link";
import { Plus, ListChecks, ChevronRight } from "lucide-react";
import { prisma } from "@/lib/db";
import { Button } from "@/components/ui/button";
import { Card, CardContent } from "@/components/ui/card";
import { Badge } from "@/components/ui/badge";
import { DeleteButton } from "@/components/admin/delete-button";
import { deleteQuiz } from "@/lib/actions/admin";

const difficultyLabels: Record<number, { label: string; cls: string }> = {
  1: { label: "Ușor", cls: "bg-accent/10 text-accent" },
  2: { label: "Mediu", cls: "bg-warning/15 text-warning" },
  3: { label: "Greu", cls: "bg-danger/10 text-danger" },
};

export default async function AdminQuizzesPage() {
  const quizzes = await prisma.quiz.findMany({
    where: { userId: null },
    orderBy: [{ subject: { order: "asc" } }, { order: "asc" }],
    include: {
      subject: true,
      _count: { select: { questions: true, attempts: true } },
    },
  });

  return (
    <div className="space-y-6">
      <section className="flex flex-wrap items-center justify-between gap-4">
        <div>
          <h1 className="text-3xl font-extrabold text-ink">Teste grilă</h1>
          <p className="mt-1 text-subtle">Creează și gestionează testele tip BAC.</p>
        </div>
        <Button asChild>
          <Link href="/admin/teste/nou">
            <Plus className="h-5 w-5" /> Test nou
          </Link>
        </Button>
      </section>

      <div className="space-y-3">
        {quizzes.map((quiz) => {
          const d = difficultyLabels[quiz.difficulty] ?? difficultyLabels[1];
          return (
            <Card key={quiz.id}>
              <CardContent className="flex flex-wrap items-center justify-between gap-3 p-4">
                <div className="flex items-center gap-3">
                  <div className="flex h-11 w-11 items-center justify-center rounded-xl bg-accent/10 text-accent">
                    <ListChecks className="h-5 w-5" />
                  </div>
                  <div>
                    <p className="font-bold text-ink">{quiz.title}</p>
                    <p className="text-xs text-subtle">
                      {quiz.subject.name} · {quiz._count.questions} întrebări ·{" "}
                      {quiz._count.attempts} rezolvări
                    </p>
                    <div className="mt-1 flex gap-1">
                      <Badge className={d.cls}>{d.label}</Badge>
                      {!quiz.published && <Badge variant="neutral">Ascuns</Badge>}
                    </div>
                  </div>
                </div>
                <div className="flex items-center gap-2">
                  <DeleteButton action={deleteQuiz} id={quiz.id} />
                  <Link
                    href={`/admin/teste/${quiz.id}`}
                    className="inline-flex items-center gap-1 text-xs font-bold text-accent hover:underline"
                  >
                    Editează <ChevronRight className="h-3.5 w-3.5" />
                  </Link>
                </div>
              </CardContent>
            </Card>
          );
        })}
      </div>

      {quizzes.length === 0 && (
        <Card>
          <CardContent className="flex flex-col items-center gap-3 py-12 text-center">
            <ListChecks className="h-10 w-10 text-subtle" />
            <p className="text-subtle">Niciun test încă. Creează primul test!</p>
          </CardContent>
        </Card>
      )}
    </div>
  );
}

import Link from "next/link";
import { Plus, GraduationCap, ChevronRight } from "lucide-react";
import { prisma } from "@/lib/db";
import { Button } from "@/components/ui/button";
import { Card, CardContent } from "@/components/ui/card";
import { Badge } from "@/components/ui/badge";
import { DeleteButton } from "@/components/admin/delete-button";
import { deleteExam } from "@/lib/actions/admin";

const sessionLabels: Record<string, string> = {
  SUMMER: "Iunie-iulie",
  AUTUMN: "Aug-sept",
  SPECIAL: "Sesiune specială",
};

const profileLabels: Record<string, string> = {
  REAL: "Real",
  HUMAN: "Uman",
  TECH: "Tehnologic",
};

export default async function AdminExamsPage() {
  const exams = await prisma.officialExam.findMany({
    orderBy: [{ year: "desc" }, { order: "asc" }],
    include: { subject: true },
  });

  return (
    <div className="space-y-6">
      <section className="flex flex-wrap items-center justify-between gap-4">
        <div>
          <h1 className="text-3xl font-extrabold text-ink">Subiecte BAC</h1>
          <p className="mt-1 text-subtle">Arhiva subiectelor oficiale de examen.</p>
        </div>
        <Button asChild>
          <Link href="/admin/subiecte/nou">
            <Plus className="h-5 w-5" /> Subiect nou
          </Link>
        </Button>
      </section>

      <div className="space-y-3">
        {exams.map((exam) => (
          <Card key={exam.id}>
            <CardContent className="flex flex-wrap items-center justify-between gap-3 p-4">
              <div className="flex items-center gap-3">
                <div className="flex h-11 w-11 items-center justify-center rounded-2xl bg-accent/10 text-accent">
                  <GraduationCap className="h-5 w-5" />
                </div>
                <div>
                  <p className="font-bold text-ink">
                    {exam.subject.name} · {exam.year}
                  </p>
                  <p className="text-xs text-subtle">{exam.title}</p>
                  <div className="mt-1 flex gap-1">
                    <Badge variant="neutral">{sessionLabels[exam.session]}</Badge>
                    <Badge variant="neutral">{profileLabels[exam.profile]}</Badge>
                  </div>
                </div>
              </div>
              <div className="flex items-center gap-2">
                <DeleteButton action={deleteExam} id={exam.id} />
                <Link
                  href={`/admin/subiecte/${exam.id}`}
                  className="inline-flex items-center gap-1 text-xs font-bold text-accent hover:underline"
                >
                  Editează <ChevronRight className="h-3.5 w-3.5" />
                </Link>
              </div>
            </CardContent>
          </Card>
        ))}
      </div>

      {exams.length === 0 && (
        <Card>
          <CardContent className="flex flex-col items-center gap-3 py-12 text-center">
            <GraduationCap className="h-10 w-10 text-subtle" />
            <p className="text-subtle">Niciun subiect încă. Adaugă primul subiect!</p>
          </CardContent>
        </Card>
      )}
    </div>
  );
}

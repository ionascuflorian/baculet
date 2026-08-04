import { FileText, Download, ArrowDownToLine } from "lucide-react";
import { prisma } from "@/lib/db";
import { Badge } from "@/components/ui/badge";
import { Button } from "@/components/ui/button";
import { Card, CardContent } from "@/components/ui/card";
import { Select } from "@/components/ui/select";
import { Label } from "@/components/ui/label";

const SESSION_LABELS: Record<string, string> = {
  SUMMER: "Vara",
  AUTUMN: "Toamna",
  SPECIAL: "Specială",
};

const PROFILE_LABELS: Record<string, string> = {
  REAL: "Real",
  HUMAN: "Uman",
  TECH: "Tehnologic",
};

export default async function SubiecteBacPage({
  searchParams,
}: {
  searchParams: Promise<{ subject?: string; year?: string; session?: string }>;
}) {
  const params = await searchParams;
  const subject = params.subject || "";
  const year = params.year ? Number(params.year) : null;
  const session = params.session || "";

  const [subjects, exams, years] = await Promise.all([
    prisma.subject.findMany({ orderBy: { order: "asc" } }),
    prisma.officialExam.findMany({
      where: {
        ...(subject ? { subjectId: subject } : {}),
        ...(year ? { year } : {}),
        ...(session ? { session: session as "SUMMER" | "AUTUMN" | "SPECIAL" } : {}),
      },
      include: { subject: true },
      orderBy: [{ year: "desc" }, { order: "asc" }],
    }),
    prisma.officialExam.findMany({
      select: { year: true },
      distinct: ["year"],
      orderBy: { year: "desc" },
    }),
  ]);

  return (
    <div className="space-y-6">
      <section>
        <h1 className="text-3xl font-extrabold text-ink">Subiecte oficiale BAC</h1>
        <p className="mt-1 text-subtle">
          Arhivă cu subiectele date la bacalaureat, pe ani și sesiuni, cu bareme.
        </p>
      </section>

      <Card>
        <CardContent className="py-4">
          <form className="grid gap-4 sm:grid-cols-3">
            <div>
              <Label htmlFor="subject">Materie</Label>
              <Select id="subject" name="subject" defaultValue={subject}>
                <option value="">Toate materiile</option>
                {subjects.map((s) => (
                  <option key={s.id} value={s.id}>
                    {s.icon} {s.name}
                  </option>
                ))}
              </Select>
            </div>
            <div>
              <Label htmlFor="year">An</Label>
              <Select id="year" name="year" defaultValue={year?.toString() ?? ""}>
                <option value="">Toți anii</option>
                {years.map((y) => (
                  <option key={y.year} value={y.year}>
                    {y.year}
                  </option>
                ))}
              </Select>
            </div>
            <div>
              <Label htmlFor="session">Sesiune</Label>
              <Select id="session" name="session" defaultValue={session}>
                <option value="">Toate sesiunile</option>
                {Object.entries(SESSION_LABELS).map(([key, label]) => (
                  <option key={key} value={key}>
                    {label}
                  </option>
                ))}
              </Select>
            </div>
            <div className="sm:col-span-3">
              <Button type="submit" size="sm">Filtrează</Button>
            </div>
          </form>
        </CardContent>
      </Card>

      {exams.length === 0 && (
        <Card>
          <CardContent className="py-10 text-center text-sm text-subtle">
            Niciun subiect găsit pentru filtrele alese.
          </CardContent>
        </Card>
      )}

      <div className="space-y-3">
        {exams.map((exam) => (
          <Card key={exam.id}>
            <CardContent className="flex flex-wrap items-center gap-4 py-4">
              <div className="flex h-11 w-11 shrink-0 items-center justify-center rounded-2xl bg-accent/10">
                <FileText className="h-5 w-5 text-accent" />
              </div>
              <div className="min-w-0 flex-1">
                <p className="font-bold text-ink">
                  {exam.subject.icon} {exam.subject.name} — {exam.title}
                </p>
                <div className="mt-1 flex flex-wrap gap-1.5">
                  <Badge>{exam.year}</Badge>
                  <Badge variant="neutral">{SESSION_LABELS[exam.session]}</Badge>
                  <Badge variant="neutral">{PROFILE_LABELS[exam.profile]}</Badge>
                </div>
              </div>
              <div className="flex shrink-0 flex-col gap-2 sm:flex-row">
                <Button asChild variant="accent" size="sm">
                  <a href={exam.pdfUrl} target="_blank" rel="noopener noreferrer">
                    <Download className="h-4 w-4" /> Subiect
                  </a>
                </Button>
                {exam.solutionUrl && (
                  <Button asChild variant="outline" size="sm">
                    <a href={exam.solutionUrl} target="_blank" rel="noopener noreferrer">
                      <ArrowDownToLine className="h-4 w-4" /> Barem
                    </a>
                  </Button>
                )}
              </div>
            </CardContent>
          </Card>
        ))}
      </div>
    </div>
  );
}

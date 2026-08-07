import Link from "next/link";
import { Plus, FolderOpen, ChevronRight } from "lucide-react";
import { prisma } from "@/lib/db";
import { Button } from "@/components/ui/button";
import { Card, CardContent } from "@/components/ui/card";
import { Badge } from "@/components/ui/badge";
import { DeleteButton } from "@/components/admin/delete-button";
import { PendingLink } from "@/components/admin/pending-link";
import { deleteSubject } from "@/lib/actions/admin";

const profileLabels: Record<string, string> = {
  REAL: "Real",
  HUMAN: "Uman",
  TECH: "Tehnologic",
};

export default async function AdminSubjectsPage() {
  const subjects = await prisma.subject.findMany({
    orderBy: { order: "asc" },
    include: { subjectProfiles: true, _count: { select: { chapters: true } } },
  });

  return (
    <div className="space-y-6">
      <section className="flex flex-wrap items-center justify-between gap-4">
        <div>
          <h1 className="text-3xl font-extrabold text-ink">Materii</h1>
          <p className="mt-1 text-subtle">Adaugă, editează sau șterge materii.</p>
        </div>
        <Button asChild>
          <Link href="/admin/materii/noua">
            <Plus className="h-5 w-5" /> Materie nouă
          </Link>
        </Button>
      </section>

      <div className="grid gap-4 md:grid-cols-2">
        {subjects.map((subject) => (
          <Card key={subject.id}>
            <CardContent className="p-4">
              <div className="flex items-start justify-between gap-3">
                <div className="flex items-center gap-3">
                  <div
                    className="flex h-12 w-12 items-center justify-center rounded-2xl text-2xl"
                    style={{ backgroundColor: `${subject.color}22` }}
                  >
                    {subject.icon}
                  </div>
                  <div>
                    <p className="text-lg font-extrabold text-ink">{subject.name}</p>
                    <p className="text-xs text-subtle">
                      {subject._count.chapters} capitole · {subject.slug}
                    </p>
                    <div className="mt-1 flex flex-wrap gap-1">
                      {subject.subjectProfiles.map((p) => (
                        <Badge key={p.profile} variant="neutral">
                          {profileLabels[p.profile]}
                        </Badge>
                      ))}
                    </div>
                  </div>
                </div>
                <div className="flex flex-col items-end gap-2">
                  <DeleteButton action={deleteSubject} id={subject.id} />
                  <PendingLink
                    href={`/admin/materii/${subject.id}`}
                    className="inline-flex items-center gap-1 text-xs font-bold text-accent hover:underline"
                  >
                    Editează <ChevronRight className="h-3.5 w-3.5" />
                  </PendingLink>
                </div>
              </div>
            </CardContent>
          </Card>
        ))}
      </div>

      {subjects.length === 0 && (
        <Card>
          <CardContent className="flex flex-col items-center gap-3 py-12 text-center">
            <FolderOpen className="h-10 w-10 text-subtle" />
            <p className="text-subtle">Nicio materie încă. Adaugă prima materie!</p>
            <Button asChild>
              <Link href="/admin/materii/noua">
                <Plus className="h-5 w-5" /> Adaugă
              </Link>
            </Button>
          </CardContent>
        </Card>
      )}
    </div>
  );
}

import { ChevronRight, FolderOpen, Sparkles } from "lucide-react";
import { prisma } from "@/lib/db";
import { listProjects, deleteProject } from "@/lib/actions/ai-content";
import { Card, CardContent } from "@/components/ui/card";
import { Badge } from "@/components/ui/badge";
import { DeleteButton } from "@/components/admin/delete-button";
import { PendingLink } from "@/components/admin/pending-link";
import { CreateContentProject } from "@/components/admin/ai-content/create-project";

const statusLabels: Record<string, string> = {
  DRAFT: "Draft",
  ANALYZING: "Se analizează",
  READY_FOR_REVIEW: "Gata de revizuire",
  GENERATING: "Se generează",
  VALIDATING: "Se validează",
  NEEDS_REVIEW: "Necesită revizuire",
  APPROVED: "Aprobat",
  PUBLISHED: "Publicat",
  FAILED: "Eroare",
};

const statusTone: Record<string, "neutral" | "success" | "warning" | "danger"> = {
  DRAFT: "neutral",
  ANALYZING: "warning",
  READY_FOR_REVIEW: "success",
  GENERATING: "warning",
  VALIDATING: "warning",
  NEEDS_REVIEW: "warning",
  APPROVED: "success",
  PUBLISHED: "success",
  FAILED: "danger",
};

export default async function AiContentAdminPage() {
  const projects = await listProjects();
  const subjects = await prisma.subject.findMany({
    orderBy: { order: "asc" },
    select: { id: true, name: true },
  });

  return (
    <div className="space-y-6">
      <section className="flex flex-wrap items-center justify-between gap-4">
        <div>
          <h1 className="text-3xl font-extrabold text-ink">AI Content Studio</h1>
          <p className="mt-1 text-subtle">
            Construiește proiecte BAC curatoriale: surse → plan → lecții/quiz/checkpoint → validare → publicare.
          </p>
        </div>
      </section>

      <section>
        <CreateContentProject subjects={subjects} />
      </section>

      <div className="space-y-3">
        {projects.map((project) => (
          <Card key={project.id}>
            <CardContent className="flex flex-wrap items-center justify-between gap-3 p-4">
              <div className="flex items-center gap-3">
                <div className="flex h-11 w-11 shrink-0 items-center justify-center rounded-2xl bg-accent/10 text-accent">
                  <Sparkles className="h-5 w-5" />
                </div>
                <div className="min-w-0">
                  <p className="truncate font-bold text-ink">{project.name}</p>
                  <p className="text-xs text-subtle">
                    {project.subject.name}
                    {project.bacYear ? ` · BAC ${project.bacYear}` : ""}
                    {project.examType ? ` · ${project.examType}` : ""}
                  </p>
                  <div className="mt-1 flex flex-wrap gap-1">
                    <Badge variant={statusTone[project.status] ?? "neutral"}>
                      {statusLabels[project.status] ?? project.status}
                    </Badge>
                    <Badge variant="neutral">{project._count.sources} surse</Badge>
                    <Badge variant="neutral">{project._count.nodes} noduri</Badge>
                    <Badge variant="neutral">{project._count.items} iteme</Badge>
                  </div>
                </div>
              </div>
              <div className="flex items-center gap-2">
                <DeleteButton action={deleteProject} id={project.id} />
                <PendingLink
                  href={`/admin/ai-content/projects/${project.id}`}
                  className="inline-flex items-center gap-1 text-xs font-bold text-accent hover:underline"
                >
                  Deschide <ChevronRight className="h-3.5 w-3.5" />
                </PendingLink>
              </div>
            </CardContent>
          </Card>
        ))}
      </div>

      {projects.length === 0 && (
        <Card>
          <CardContent className="flex flex-col items-center gap-3 py-12 text-center">
            <FolderOpen className="h-10 w-10 text-subtle" />
            <p className="text-subtle">
              Niciun proiect încă. Creează primul proiect deasupra.
            </p>
          </CardContent>
        </Card>
      )}
    </div>
  );
}
import { notFound } from "next/navigation";
import Link from "next/link";
import { ArrowLeft } from "lucide-react";
import { loadProjectDetail } from "@/lib/actions/ai-content";
import { AiContentProjectStudio } from "@/components/admin/ai-content/project-studio";
import { requirePage } from "@/lib/access";

export default async function AdminAiContentProjectPage({
  params,
}: {
  params: Promise<{ id: string }>;
}) {
  await requirePage("MANAGE_AI_CONTENT");
  const { id } = await params;
  const project = await loadProjectDetail(id);
  if (!project) notFound();

  return (
    <div className="space-y-6">
      <Link
        href="/admin/ai-content"
        className="inline-flex items-center gap-1.5 text-sm font-bold text-subtle hover:text-ink"
      >
        <ArrowLeft className="h-4 w-4" /> Înapoi la proiecte
      </Link>
      <AiContentProjectStudio project={project} />
    </div>
  );
}
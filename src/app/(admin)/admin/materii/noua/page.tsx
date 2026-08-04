import Link from "next/link";
import { ArrowLeft } from "lucide-react";
import { SubjectForm } from "@/components/admin/subject-form";

export default function NewSubjectPage() {
  return (
    <div className="mx-auto max-w-2xl space-y-6">
      <Link
        href="/admin/materii"
        className="inline-flex items-center gap-1.5 text-sm font-bold text-subtle hover:text-ink"
      >
        <ArrowLeft className="h-4 w-4" /> Înapoi la materii
      </Link>
      <section>
        <h1 className="text-3xl font-extrabold text-ink">Materie nouă</h1>
        <p className="mt-1 text-subtle">Completează detaliile materiei.</p>
      </section>
      <SubjectForm
        subjectId={null}
        initial={{
          name: "",
          slug: "",
          description: "",
          icon: "📘",
          color: "#58cc02",
          order: 0,
          profiles: [],
        }}
      />
    </div>
  );
}

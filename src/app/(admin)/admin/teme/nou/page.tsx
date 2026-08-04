import Link from "next/link";
import { ArrowLeft } from "lucide-react";
import { ThemeForm } from "@/components/admin/theme-form";
import { defaultPalette, defaultDarkPalette } from "@/components/themes/palette";

export default function NewThemePage() {
  return (
    <div className="mx-auto max-w-2xl space-y-6">
      <Link
        href="/admin/teme"
        className="inline-flex items-center gap-1.5 text-sm font-bold text-subtle hover:text-ink"
      >
        <ArrowLeft className="h-4 w-4" /> Înapoi la teme
      </Link>
      <section>
        <h1 className="text-3xl font-extrabold text-ink">Temă nouă</h1>
        <p className="mt-1 text-subtle">
          Definește paleta pentru modul luminos și întunecat.
        </p>
      </section>
      <ThemeForm
        themeId={null}
        initial={{
          name: "",
          slug: "",
          description: "",
          enabled: true,
          order: 0,
          light: defaultPalette(),
          dark: defaultDarkPalette(),
        }}
      />
    </div>
  );
}
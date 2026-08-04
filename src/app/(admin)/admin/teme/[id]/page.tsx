import Link from "next/link";
import { notFound } from "next/navigation";
import { ArrowLeft } from "lucide-react";
import { prisma } from "@/lib/db";
import { ThemeForm } from "@/components/admin/theme-form";
import type { Palette } from "@/components/themes/palette";

export default async function EditThemePage({
  params,
}: {
  params: Promise<{ id: string }>;
}) {
  const { id } = await params;
  const theme = await prisma.theme.findUnique({ where: { id } });
  if (!theme) notFound();

  return (
    <div className="mx-auto max-w-2xl space-y-6">
      <Link
        href="/admin/teme"
        className="inline-flex items-center gap-1.5 text-sm font-bold text-subtle hover:text-ink"
      >
        <ArrowLeft className="h-4 w-4" /> Înapoi la teme
      </Link>
      <section>
        <h1 className="text-3xl font-extrabold text-ink">Editează tema</h1>
        <p className="mt-1 text-subtle">Modifică paleta temei „{theme.name}”.</p>
      </section>
      <ThemeForm
        themeId={theme.id}
        initial={{
          name: theme.name,
          slug: theme.slug,
          description: theme.description ?? "",
          enabled: theme.enabled,
          order: theme.order,
          light: (theme.light ?? {}) as Palette,
          dark: (theme.dark ?? {}) as Palette,
        }}
      />
    </div>
  );
}
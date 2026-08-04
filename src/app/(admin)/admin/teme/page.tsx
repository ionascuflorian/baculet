import Link from "next/link";
import { Plus, Palette as PaletteIcon } from "lucide-react";
import { prisma } from "@/lib/db";
import { Button } from "@/components/ui/button";
import { Card, CardContent } from "@/components/ui/card";
import { Badge } from "@/components/ui/badge";
import { DeleteButton } from "@/components/admin/delete-button";
import { ThemeEnabledToggle } from "@/components/admin/theme-toggle";
import { deleteTheme } from "@/lib/actions/themes";
import { PALETTE_KEYS, type Palette } from "@/components/themes/palette";

export default async function AdminThemesPage() {
  const themes = await prisma.theme.findMany({
    orderBy: [{ order: "asc" }, { createdAt: "desc" }],
  });

  return (
    <div className="space-y-6">
      <section className="flex flex-wrap items-center justify-between gap-4">
        <div>
          <h1 className="text-3xl font-extrabold text-ink">Teme</h1>
          <p className="mt-1 text-subtle">
            Creează și gestionează palete de culori pentru aplicație. Fiecare temă are o
            variantă pentru modul luminos și întunecat.
          </p>
        </div>
        <Button asChild>
          <Link href="/admin/teme/nou">
            <Plus className="h-5 w-5" /> Temă nouă
          </Link>
        </Button>
      </section>

      <div className="grid gap-4 md:grid-cols-2">
        {themes.map((theme) => {
          const light = (theme.light ?? {}) as Palette;
          return (
            <Card key={theme.id}>
              <CardContent className="p-4">
                <div className="mb-3 flex items-start justify-between gap-3">
                  <div className="flex items-center gap-3">
                    <div className="flex h-12 w-12 rounded-2xl border border-black/10 shadow-inner">
                      {PALETTE_KEYS.map((key) => (
                        <div
                          key={key}
                          className="h-full flex-1"
                          style={{ backgroundColor: light[key] ?? "#000" }}
                        />
                      ))}
                    </div>
                    <div className="min-w-0">
                      <div className="flex items-center gap-2">
                        <p className="text-lg font-extrabold text-ink">{theme.name}</p>
                        {!theme.enabled && (
                          <Badge variant="neutral">Ascunsă</Badge>
                        )}
                      </div>
                      <p className="text-xs text-subtle">
                        {theme.slug} · ordine {theme.order}
                      </p>
                      {theme.description && (
                        <p className="mt-1 line-clamp-1 text-xs text-subtle">
                          {theme.description}
                        </p>
                      )}
                    </div>
                  </div>
                  <ThemeEnabledToggle id={theme.id} enabled={theme.enabled} />
                </div>

                <div className="flex items-center justify-between border-t border-feather pt-3">
                  <Link
                    href={`/admin/teme/${theme.id}`}
                    className="inline-flex items-center gap-1.5 text-xs font-bold text-accent hover:underline"
                  >
                    <PaletteIcon className="h-3.5 w-3.5" /> Editează
                  </Link>
                  <DeleteButton action={deleteTheme} id={theme.id} label="Șterge" />
                </div>
              </CardContent>
            </Card>
          );
        })}
      </div>

      {themes.length === 0 && (
        <Card>
          <CardContent className="flex flex-col items-center gap-3 py-12 text-center">
            <PaletteIcon className="h-10 w-10 text-subtle" />
            <p className="text-subtle">Nicio temă încă. Adaugă prima temă!</p>
            <Button asChild>
              <Link href="/admin/teme/nou">
                <Plus className="h-5 w-5" /> Adaugă
              </Link>
            </Button>
          </CardContent>
        </Card>
      )}
    </div>
  );
}
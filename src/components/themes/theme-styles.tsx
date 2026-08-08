import { unstable_cache } from "next/cache";
import { prisma } from "@/lib/db";
import { paletteToCssVars, type Palette } from "@/components/themes/palette";

const getEnabledThemes = unstable_cache(
  async () =>
    prisma.theme.findMany({
      where: { enabled: true },
      orderBy: { order: "asc" },
    }),
  ["enabled-themes"],
  { revalidate: 3600, tags: ["themes"] }
);

export async function ThemeStyles() {
  const themes = await getEnabledThemes();

  const css = themes
    .map((theme) => {
      const light = paletteToCssVars((theme.light ?? {}) as Palette);
      const dark = paletteToCssVars((theme.dark ?? {}) as Palette);
      return `[data-theme="${theme.slug}"]{${light}} .dark[data-theme="${theme.slug}"]{${dark}}`;
    })
    .join(" ");

  if (!css) return null;
  return <style data-themes dangerouslySetInnerHTML={{ __html: css }} />;
}

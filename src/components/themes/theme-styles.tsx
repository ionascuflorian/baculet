import { getEnabledThemes } from "@/lib/themes";
import { paletteToCssVars, type Palette } from "@/components/themes/palette";

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
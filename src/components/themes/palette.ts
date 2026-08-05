export type Palette = Record<string, string>;

export const PALETTE_KEYS = [
  "background",
  "foreground",
  "card",
  "ink",
  "subtle",
  "feather",
  "accent",
  "accentDark",
  "onAccent",
] as const;

export type PaletteKey = (typeof PALETTE_KEYS)[number];

export const PALETTE_VARS: Record<PaletteKey, string> = {
  background: "background",
  foreground: "foreground",
  card: "card",
  ink: "ink",
  subtle: "subtle",
  feather: "feather",
  accent: "accent",
  accentDark: "accent-dark",
  onAccent: "on-accent",
};

export const PALETTE_LABELS: Record<PaletteKey, string> = {
  background: "Fundal",
  foreground: "Text",
  card: "Card",
  ink: "Text principal",
  subtle: "Text secundar",
  feather: "Contur",
  accent: "Accent",
  accentDark: "Accent întunecat",
  onAccent: "Text pe accent",
};

export function paletteToCssVars(palette: Palette): string {
  return PALETTE_KEYS.map((key) => {
    const value = palette[key];
    return value ? `--${PALETTE_VARS[key]}: ${value};` : "";
  }).join("");
}

export function paletteToInlineStyle(palette: Palette): React.CSSProperties {
  const style: Record<string, string> = {};
  PALETTE_KEYS.forEach((key) => {
    const value = palette[key];
    if (value) style[`--${PALETTE_VARS[key]}`] = value;
  });
  return style;
}

export function defaultPalette(): Palette {
  return {
    background: "#f5f5f7",
    foreground: "#1d1d1f",
    card: "#ffffff",
    ink: "#1d1d1f",
    subtle: "#56565a",
    feather: "#d2d2d7",
    accent: "#0a7cff",
    accentDark: "#0060df",
    onAccent: "#ffffff",
  };
}

export function defaultDarkPalette(): Palette {
  return {
    background: "#1e1e1e",
    foreground: "#f5f5f7",
    card: "#2c2c2e",
    ink: "#f5f5f7",
    subtle: "#acacb2",
    feather: "#3a3a3c",
    accent: "#0a7cff",
    accentDark: "#7bb3ff",
    onAccent: "#ffffff",
  };
}
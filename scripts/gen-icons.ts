// Generează iconițele PWA (PNG + favicon.svg) din fontul real Geist (wght 800).
// Extrage „b" și punctul din Geist-Variable.ttf via fontkit și le rasterizează cu sharp.
// Rulare: npx tsx scripts/gen-icons.ts
import { readFileSync, writeFileSync, mkdirSync } from "fs";
import { join } from "path";
import fontkit from "fontkit";

const ACCENT = "#0a7cff"; // punctul din „b."
const DARK = "#1e1e1e"; // fundal
const WHITE = "#ffffff"; // litera „b"

interface GlyphGeom {
  bPath: string;
  dotPath: string;
  dotX: number; // offsetul punctului față de originea literei b
  minX: number;
  maxX: number;
  minY: number;
  maxY: number;
}

function loadGlyphs(): GlyphGeom {
  const fontPath = join(
    process.cwd(),
    "node_modules",
    "geist",
    "dist",
    "fonts",
    "geist-sans",
    "Geist-Variable.ttf"
  );
  const font = fontkit.openSync(fontPath) as any;
  const varFont = font.getVariation({ wght: 800 });
  const run = varFont.layout("b.");
  const b = run.glyphs[0];
  const dot = run.glyphs[1];
  const dotX = run.positions[1].xOffset + (run.glyphs[0] as any).advanceWidth;

  const toD = (path: any): string =>
    path.commands
      .map((c: any) => {
        const [a1, a2, a3, a4, a5, a6] = c.args;
        switch (c.command) {
          case "moveTo":
            return `M${a1.toFixed(1)} ${a2.toFixed(1)}`;
          case "lineTo":
            return `L${a1.toFixed(1)} ${a2.toFixed(1)}`;
          case "curveTo":
            return `C${a1.toFixed(1)} ${a2.toFixed(1)} ${a3.toFixed(
              1
            )} ${a4.toFixed(1)} ${a5.toFixed(1)} ${a6.toFixed(1)}`;
          case "quadraticCurveTo":
            return `Q${a1.toFixed(1)} ${a2.toFixed(1)} ${a3.toFixed(
              1
            )} ${a4.toFixed(1)}`;
          case "closePath":
            return "Z";
          default:
            return "";
        }
      })
      .join("");

  const bb = b.path.bbox;
  const bd = dot.path.bbox;
  return {
    bPath: toD(b.path),
    dotPath: toD(dot.path),
    dotX,
    minX: bb.minX,
    maxX: Math.max(bb.maxX, dotX + bd.maxX),
    minY: bb.minY,
    maxY: bb.maxY,
  };
}

const G = loadGlyphs();
const CONTENT_W = G.maxX - G.minX;
const CONTENT_H = G.maxY - G.minY;
const CENTER_X = (G.minX + G.maxX) / 2;
const CENTER_Y = (G.minY + G.maxY) / 2;

function iconSvg(size: number, ratio: number, rounded: boolean): string {
  const s = (size * ratio) / CONTENT_W;
  const tx = size / 2 - CENTER_X * s;
  const ty = size / 2 + CENTER_Y * s; // y-up (font) → y-down (SVG): flip în scale
  const rx = rounded ? size * 0.14 : 0;
  const dot = `<path transform="translate(${(G.dotX * s).toFixed(
    2
  )} 0)" d="${G.dotPath}" fill="${ACCENT}"/>`;
  return [
    `<svg xmlns="http://www.w3.org/2000/svg" viewBox="0 0 ${size} ${size}" width="${size}" height="${size}">`,
    `<rect width="${size}" height="${size}" rx="${rx.toFixed(2)}" fill="${DARK}"/>`,
    `<g transform="translate(${tx.toFixed(2)} ${ty.toFixed(2)}) scale(${s.toFixed(4)} -${s.toFixed(4)})">`,
    `<path d="${G.bPath}" fill="${WHITE}"/>`,
    dot,
    `</g>`,
    `</svg>`,
  ].join("\n");
}

async function main() {
  const sharp = (await import("sharp")).default;
  const outDir = join(process.cwd(), "public", "icons");
  mkdirSync(outDir, { recursive: true });
  const files: Record<string, [number, number, boolean]> = {
    "icon-192.png": [192, 0.72, false],
    "icon-512.png": [512, 0.72, false],
    "icon-maskable-512.png": [512, 0.62, false], // logo în zona de siguranță a măștii
    "apple-touch-icon.png": [180, 0.72, false],
  };
  for (const [name, [size, scale]] of Object.entries(files)) {
    const png = await sharp(Buffer.from(iconSvg(size, scale, false)))
      .png()
      .toBuffer();
    writeFileSync(join(outDir, name), png);
    console.log(`✓ ${name} (${png.length} bytes)`);
  }
  const svg = iconSvg(64, 0.72, true);
  writeFileSync(join(process.cwd(), "public", "favicon.svg"), svg);
  console.log(`✓ favicon.svg (${svg.length} bytes)`);
}

main();

// Generează iconițele PWA (PNG + favicon.svg) fără dependențe externe.
// Desenează logo-ul „b." (b alb + punctul accent) pe fundal închis,
// cu anti-aliasing prin supersampling 4×.
// Rulare: npx tsx scripts/gen-icons.ts
import { deflateSync } from "zlib";
import { mkdirSync, writeFileSync } from "fs";
import { join } from "path";

const ACCENT = [10, 124, 255]; // #0a7cff — punctul din „b."
const DARK = [30, 30, 30]; // #1e1e1e — fundal
const WHITE = [255, 255, 255]; // litera „b"

// Litera „b" ca bitmap 5×7.
const GLYPH = ["01110", "10001", "10001", "11110", "10001", "10001", "10001"];

function crc32(buf: Buffer): number {
  let c = ~0;
  for (let i = 0; i < buf.length; i++) {
    c ^= buf[i];
    for (let k = 0; k < 8; k++) {
      c = c & 1 ? (c >>> 1) ^ 0xedb88320 : c >>> 1;
    }
  }
  return ~c >>> 0;
}

function chunk(type: string, data: Buffer): Buffer {
  const len = Buffer.alloc(4);
  len.writeUInt32BE(data.length);
  const typeBuf = Buffer.from(type, "ascii");
  const crcBuf = Buffer.alloc(4);
  crcBuf.writeUInt32BE(crc32(Buffer.concat([typeBuf, data])));
  return Buffer.concat([len, typeBuf, data, crcBuf]);
}

function encodePng(size: number, pixels: Buffer): Buffer {
  const ihdr = Buffer.alloc(13);
  ihdr.writeUInt32BE(size, 0);
  ihdr.writeUInt32BE(size, 4);
  ihdr[8] = 8; // bit depth
  ihdr[9] = 6; // RGBA
  const stride = size * 4;
  const raw = Buffer.alloc((stride + 1) * size);
  for (let y = 0; y < size; y++) {
    raw[y * (stride + 1)] = 0; // filter: none
    pixels.copy(raw, y * (stride + 1) + 1, y * stride, (y + 1) * stride);
  }
  return Buffer.concat([
    Buffer.from([0x89, 0x50, 0x4e, 0x47, 0x0d, 0x0a, 0x1a, 0x0a]),
    chunk("IHDR", ihdr),
    chunk("IDAT", deflateSync(raw, { level: 9 })),
    chunk("IEND", Buffer.alloc(0)),
  ]);
}

interface Layout {
  cell: number;
  gx: number;
  gy: number;
  dotX: number;
  dotY: number;
  dotR: number;
}

function layoutFor(size: number, scale: number): Layout {
  const cell = size * 0.055 * scale;
  const glyphH = 7 * cell;
  const wordW = 7.3 * cell; // litera (5 celule) + punctul (~1.7 celule) + spațiu
  const gx = (size - wordW) / 2;
  const gy = (size - glyphH) / 2;
  return {
    cell,
    gx,
    gy,
    dotX: gx + 6.45 * cell,
    dotY: gy + (7 - 0.85) * cell,
    dotR: 0.85 * cell,
  };
}

function cellContains(
  l: Layout,
  col: number,
  row: number,
  px: number,
  py: number
): boolean {
  const x0 = l.gx + col * l.cell;
  const y0 = l.gy + row * l.cell;
  const r = l.cell * 0.45;
  const cx = Math.min(Math.max(px, x0 + r), x0 + l.cell - r);
  const cy = Math.min(Math.max(py, y0 + r), y0 + l.cell - r);
  return (px - cx) ** 2 + (py - cy) ** 2 <= r * r;
}

function sampleColor(l: Layout, px: number, py: number): number[] {
  const dx = px - l.dotX;
  const dy = py - l.dotY;
  if (dx * dx + dy * dy <= l.dotR * l.dotR) return ACCENT;
  for (let row = 0; row < GLYPH.length; row++) {
    for (let col = 0; col < GLYPH[row].length; col++) {
      if (GLYPH[row][col] === "1" && cellContains(l, col, row, px, py)) {
        return WHITE;
      }
    }
  }
  return DARK;
}

// Iconiță: fundal închis pe toată suprafața (colțurile le taie iOS/Android),
// „b." alb + punct accent centrat. scale = 0.8 pentru zona de siguranță maskable.
function drawIcon(size: number, scale: number): Buffer {
  const px = Buffer.alloc(size * size * 4);
  const SS = 4;
  const l = layoutFor(size, scale);
  for (let y = 0; y < size; y++) {
    for (let x = 0; x < size; x++) {
      let r = 0;
      let g = 0;
      let b = 0;
      for (let sy = 0; sy < SS; sy++) {
        for (let sx = 0; sx < SS; sx++) {
          const [cr, cg, cb] = sampleColor(
            l,
            x + (sx + 0.5) / SS,
            y + (sy + 0.5) / SS
          );
          r += cr;
          g += cg;
          b += cb;
        }
      }
      const n = SS * SS;
      const i = (y * size + x) * 4;
      px[i] = r / n;
      px[i + 1] = g / n;
      px[i + 2] = b / n;
      px[i + 3] = 255;
    }
  }
  return px;
}

// favicon.svg: același „b." ca SVG cu forme (fără fonturi), pentru tab-ul browserului.
function svgIcon(): string {
  const size = 64;
  const l = layoutFor(size, 1);
  const cells: string[] = [];
  for (let row = 0; row < GLYPH.length; row++) {
    for (let col = 0; col < GLYPH[row].length; col++) {
      if (GLYPH[row][col] !== "1") continue;
      const x = l.gx + col * l.cell;
      const y = l.gy + row * l.cell;
      const r = l.cell * 0.45;
      cells.push(
        `<rect x="${x.toFixed(2)}" y="${y.toFixed(2)}" width="${l.cell.toFixed(
          2
        )}" height="${l.cell.toFixed(2)}" rx="${r.toFixed(2)}" fill="#ffffff"/>`
      );
    }
  }
  return [
    `<svg xmlns="http://www.w3.org/2000/svg" viewBox="0 0 64 64">`,
    `<rect width="64" height="64" rx="14" fill="#1e1e1e"/>`,
    ...cells,
    `<circle cx="${l.dotX.toFixed(2)}" cy="${l.dotY.toFixed(2)}" r="${l.dotR.toFixed(
      2
    )}" fill="#0a7cff"/>`,
    `</svg>`,
  ].join("\n");
}

function main() {
  const outDir = join(process.cwd(), "public", "icons");
  mkdirSync(outDir, { recursive: true });
  const files: Record<string, [number, number]> = {
    "icon-192.png": [192, 1],
    "icon-512.png": [512, 1],
    "icon-maskable-512.png": [512, 0.8], // logo în zona de siguranță a măștii
    "apple-touch-icon.png": [180, 1],
  };
  for (const [name, [size, scale]] of Object.entries(files)) {
    const png = encodePng(size, drawIcon(size, scale));
    writeFileSync(join(outDir, name), png);
    console.log(`✓ ${name} (${png.length} bytes)`);
  }
  const svg = svgIcon();
  writeFileSync(join(process.cwd(), "public", "favicon.svg"), svg);
  console.log(`✓ favicon.svg (${svg.length} bytes)`);
}

main();

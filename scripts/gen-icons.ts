// Generează iconițele PWA (PNG) fără dependențe externe: zlib din Node.
// Rulare: npx tsx scripts/gen-icons.ts
import { deflateSync } from "zlib";
import { mkdirSync, writeFileSync } from "fs";
import { join } from "path";

const ACCENT = [10, 124, 255]; // #0a7cff
const DARK = [30, 30, 30]; // fundal iconițe

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

function roundedSquare(x: number, y: number, size: number, r: number): boolean {
  const dx = Math.min(Math.max(x, r), size - r) ;
  const dy = Math.min(Math.max(y, r), size - r);
  const dist = (x - dx) ** 2 + (y - dy) ** 2;
  return dist <= r * r;
}

// Iconiță: pătrat cu colțuri rotunjite, fundal accent, cerc alb centrat.
function drawIcon(size: number, padding: number): Buffer {
  const px = Buffer.alloc(size * size * 4);
  const r = size * 0.22;
  const cx = size / 2;
  const cy = size / 2;
  const circleR = size * 0.22;
  for (let y = 0; y < size; y++) {
    for (let x = 0; x < size; x++) {
      const i = (y * size + x) * 4;
      const inRound = roundedSquare(x, y, size - 1, r);
      if (!inRound) {
        px[i + 3] = 0;
        continue;
      }
      const inCircle = (x - cx) ** 2 + (y - cy) ** 2 <= circleR * circleR;
      const base = inCircle ? DARK : ACCENT;
      px[i] = base[0];
      px[i + 1] = base[1];
      px[i + 2] = base[2];
      px[i + 3] = 255;
    }
  }
  return px;
}

function main() {
  const outDir = join(process.cwd(), "public", "icons");
  mkdirSync(outDir, { recursive: true });
  const files: Record<string, [number, number]> = {
    "icon-192.png": [192, 32],
    "icon-512.png": [512, 96],
    "icon-maskable-512.png": [512, 128], // mai mult padding pentru mască
    "apple-touch-icon.png": [180, 30],
  };
  for (const [name, [size, _pad]] of Object.entries(files)) {
    const png = encodePng(size, drawIcon(size, _pad));
    writeFileSync(join(outDir, name), png);
    console.log(`✓ ${name} (${png.length} bytes)`);
  }
}

main();

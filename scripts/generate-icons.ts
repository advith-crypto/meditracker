// Temporary icon generator — renders the MediTracker pill mark to PNG icons.
// Run with: bun scripts/generate-icons.ts
import { deflateSync } from "node:zlib";
import { mkdirSync, writeFileSync } from "node:fs";

/* ---------- minimal PNG encoder (8-bit RGBA) ---------- */

function crc32(buf: Uint8Array): number {
  let crc = 0xffffffff;
  for (let i = 0; i < buf.length; i++) {
    let c = (crc ^ buf[i]) & 0xff;
    for (let k = 0; k < 8; k++) c = c & 1 ? 0xedb88320 ^ (c >>> 1) : c >>> 1;
    crc = (crc >>> 8) ^ c;
  }
  return (crc ^ 0xffffffff) >>> 0;
}

function chunk(type: string, data: Uint8Array): Buffer {
  const len = Buffer.alloc(4);
  len.writeUInt32BE(data.length, 0);
  const typeBuf = Buffer.from(type, "ascii");
  const crc = Buffer.alloc(4);
  crc.writeUInt32BE(crc32(Buffer.concat([typeBuf, Buffer.from(data)])), 0);
  return Buffer.concat([len, typeBuf, Buffer.from(data), crc]);
}

function encodePNG(width: number, height: number, rgba: Uint8Array): Buffer {
  const sig = Buffer.from([0x89, 0x50, 0x4e, 0x47, 0x0d, 0x0a, 0x1a, 0x0a]);
  const ihdr = Buffer.alloc(13);
  ihdr.writeUInt32BE(width, 0);
  ihdr.writeUInt32BE(height, 4);
  ihdr[8] = 8; // bit depth
  ihdr[9] = 6; // color type RGBA
  const stride = width * 4 + 1;
  const raw = Buffer.alloc(stride * height);
  for (let y = 0; y < height; y++) {
    raw[y * stride] = 0; // filter: none
    Buffer.from(rgba.buffer, y * width * 4, width * 4).copy(raw, y * stride + 1);
  }
  const idat = deflateSync(raw, { level: 9 });
  return Buffer.concat([sig, chunk("IHDR", ihdr), chunk("IDAT", idat), chunk("IEND", new Uint8Array(0))]);
}

/* ---------- pill mark rendering ---------- */

function capsuleHit(px: number, py: number, x0: number, x1: number, cy: number, r: number): boolean {
  const dx = Math.max(x0 - px, 0, px - x1);
  const dy = py - cy;
  return dx * dx + dy * dy <= r * r;
}

/**
 * Renders the pill mark (two capsule halves with a score gap) on a full-bleed
 * dark rounded-square background. `contentScale` shrinks the mark so maskable
 * icons keep it inside the launcher safe zone.
 */
function renderIcon(size: number, contentScale: number): Uint8Array {
  const SS = 3; // supersampling
  const out = new Uint8Array(size * size * 4);
  const bg = [25, 25, 25, 255]; // #191919
  const fg = [255, 255, 255, 255];
  const cx = size / 2;
  const cy = size / 2;
  const W = 0.6 * size * contentScale;
  const H = 0.3 * size * contentScale;
  const gap = 0.07 * size * contentScale;
  const r = H / 2;
  const left0 = cx - W / 2;
  const left1 = cx - gap / 2;
  const right0 = cx + gap / 2;
  const right1 = cx + W / 2;

  for (let y = 0; y < size; y++) {
    for (let x = 0; x < size; x++) {
      let hits = 0;
      for (let sy = 0; sy < SS; sy++) {
        const py = y + (sy + 0.5) / SS;
        for (let sx = 0; sx < SS; sx++) {
          const px = x + (sx + 0.5) / SS;
          if (capsuleHit(px, py, left0, left1, cy, r) || capsuleHit(px, py, right0, right1, cy, r)) hits++;
        }
      }
      const cov = hits / (SS * SS);
      const i = (y * size + x) * 4;
      if (cov > 0) {
        out[i] = Math.round(fg[0] * cov + bg[0] * (1 - cov));
        out[i + 1] = Math.round(fg[1] * cov + bg[1] * (1 - cov));
        out[i + 2] = Math.round(fg[2] * cov + bg[2] * (1 - cov));
        out[i + 3] = 255;
      } else {
        out[i] = bg[0];
        out[i + 1] = bg[1];
        out[i + 2] = bg[2];
        out[i + 3] = 255;
      }
    }
  }
  return out;
}

mkdirSync("public/icons", { recursive: true });
const jobs: { file: string; size: number; scale: number }[] = [
  { file: "public/icons/icon-192.png", size: 192, scale: 1 },
  { file: "public/icons/icon-512.png", size: 512, scale: 1 },
  { file: "public/icons/icon-maskable-192.png", size: 192, scale: 0.78 },
  { file: "public/icons/icon-maskable-512.png", size: 512, scale: 0.78 },
];
for (const j of jobs) {
  writeFileSync(j.file, encodePNG(j.size, j.size, renderIcon(j.size, j.scale)));
  console.log(`wrote ${j.file} (${j.size}x${j.size})`);
}
console.log("done");
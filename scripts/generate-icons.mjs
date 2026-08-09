// Generates PWA icons (192 & 512 PNG) with zero dependencies.
// Draws the InkQuest logo — an iridescent fountain-pen nib with a game controller
// inlay — procedurally with supersampled anti-aliasing.
import { deflateSync } from 'node:zlib';
import { writeFileSync, mkdirSync } from 'node:fs';
import { dirname, join } from 'node:path';
import { fileURLToPath } from 'node:url';

const __dirname = dirname(fileURLToPath(import.meta.url));
const OUT = join(__dirname, '..', 'public', 'icons');
mkdirSync(OUT, { recursive: true });

// ---- minimal PNG encoder ----
const CRC_TABLE = (() => {
  const t = new Uint32Array(256);
  for (let n = 0; n < 256; n++) {
    let c = n;
    for (let k = 0; k < 8; k++) c = c & 1 ? 0xedb88320 ^ (c >>> 1) : c >>> 1;
    t[n] = c >>> 0;
  }
  return t;
})();

function crc32(buf) {
  let c = 0xffffffff;
  for (let i = 0; i < buf.length; i++) c = CRC_TABLE[(c ^ buf[i]) & 0xff] ^ (c >>> 8);
  return (c ^ 0xffffffff) >>> 0;
}

function chunk(type, data) {
  const len = Buffer.alloc(4);
  len.writeUInt32BE(data.length);
  const typeBuf = Buffer.from(type, 'ascii');
  const crcBuf = Buffer.alloc(4);
  crcBuf.writeUInt32BE(crc32(Buffer.concat([typeBuf, data])));
  return Buffer.concat([len, typeBuf, data, crcBuf]);
}

function encodePNG(width, height, rgba) {
  const raw = Buffer.alloc(height * (1 + width * 4));
  for (let y = 0; y < height; y++) {
    const rowStart = y * (1 + width * 4);
    raw[rowStart] = 0;
    for (let x = 0; x < width; x++) {
      const p = (y * width + x) * 4;
      raw[rowStart + 1 + x * 4] = rgba[p];
      raw[rowStart + 2 + x * 4] = rgba[p + 1];
      raw[rowStart + 3 + x * 4] = rgba[p + 2];
      raw[rowStart + 4 + x * 4] = rgba[p + 3];
    }
  }
  const ihdr = Buffer.alloc(13);
  ihdr.writeUInt32BE(width, 0);
  ihdr.writeUInt32BE(height, 4);
  ihdr[8] = 8; // bit depth
  ihdr[9] = 6; // RGBA
  return Buffer.concat([
    Buffer.from([0x89, 0x50, 0x4e, 0x47, 0x0d, 0x0a, 0x1a, 0x0a]),
    chunk('IHDR', ihdr),
    chunk('IDAT', deflateSync(raw)),
    chunk('IEND', Buffer.alloc(0))
  ]);
}

// ---- drawing helpers (normalized 0..1 space) ----
function inRoundRect(u, v, cx, cy, hw, hh, r) {
  const dx = Math.max(Math.abs(u - cx) - (hw - r), 0);
  const dy = Math.max(Math.abs(v - cy) - (hh - r), 0);
  return Math.hypot(dx, dy) <= r;
}
function distToSeg(u, v, ax, ay, bx, by) {
  const dx = bx - ax, dy = by - ay;
  const len2 = dx * dx + dy * dy;
  let t = ((u - ax) * dx + (v - ay) * dy) / len2;
  t = Math.max(0, Math.min(1, t));
  return Math.hypot(u - (ax + t * dx), v - (ay + t * dy));
}
function nibColor(t) {
  // iridescent: purple → blue → teal → bronze-gold
  const stops = [
    [0, 139, 95, 201],
    [0.35, 74, 127, 201],
    [0.7, 63, 154, 158],
    [1, 210, 154, 69]
  ];
  const tt = Math.max(0, Math.min(1, t));
  for (let i = 0; i < stops.length - 1; i++) {
    const [t0, r0, g0, b0] = stops[i];
    const [t1, r1, g1, b1] = stops[i + 1];
    if (tt >= t0 && tt <= t1) {
      const f = (tt - t0) / (t1 - t0);
      return [r0 + (r1 - r0) * f, g0 + (g1 - g0) * f, b0 + (b1 - b0) * f];
    }
  }
  return [210, 154, 69];
}

// ---- drawing (all in 0..1 normalized space) ----
const SS = 4; // supersample factor

function renderIcon(size) {
  const out = Buffer.alloc(size * size * 4);
  const sample = (u, v) => {
    // paper background: cream rounded rect
    if (!inRoundRect(u, v, 0.5, 0.5, 0.44, 0.44, 0.13)) return [0, 0, 0, 0];
    let r = 246, g = 241, b = 229;

    // faint dot-grid paper
    const gx = Math.abs((u - 0.06) * 12 % 1);
    const gy = Math.abs((v - 0.06) * 12 % 1);
    if (Math.min(gx, gy) < 0.011) { r *= 0.97; g *= 0.97; b *= 0.955; }

    // ---- nib: iridescent wedge + body + rounded base ----
    const tipY = 0.075, shY = 0.52, baseY = 0.72, halfSh = 0.32;
    let t = -1;
    let inNib = false;
    if (v >= tipY && v < shY) {
      // point at the top (tip), widest at the shoulder
      const half = halfSh * (v - tipY) / (shY - tipY);
      if (Math.abs(u - 0.5) <= half) { inNib = true; t = ((v - tipY) / (shY - tipY)) * 0.65; }
    } else if (v >= shY && v < baseY) {
      if (Math.abs(u - 0.5) <= halfSh) { inNib = true; t = 0.65; }
    } else if (v >= baseY && v <= 0.805) {
      if (inRoundRect(u, v, 0.5, 0.76, 0.32, 0.045, 0.045) && Math.abs(u - 0.5) <= 0.32) {
        inNib = true;
        t = 0.65 + ((v - baseY) / 0.085) * 0.35;
      }
    }

    if (inNib) {
      const c = nibColor(t);
      r = c[0]; g = c[1]; b = c[2];
      // gloss highlight
      if (distToSeg(u, v, 0.30, 0.50, 0.44, 0.14) < 0.018) {
        r += (255 - r) * 0.5; g += (255 - g) * 0.5; b += (255 - b) * 0.5;
      }
      // slit
      if (distToSeg(u, v, 0.5, tipY, 0.5, 0.345) < 0.0095) { r = 44; g = 42; b = 38; }
      // breather hole: dark ring + gold centre
      const dH = Math.hypot(u - 0.5, v - 0.39);
      if (dH < 0.05) { r = 44; g = 42; b = 38; }
      else if (dH < 0.031) { r = 224; g = 169; b = 78; }
      // gold ring band
      if (inRoundRect(u, v, 0.5, 0.675, 0.32, 0.03, 0.02)) { r = 224; g = 169; b = 78; }
    }

    // ---- controller window + controller ----
    if (inRoundRect(u, v, 0.5, 0.545, 0.185, 0.105, 0.05)) {
      // dark inlay window
      r = Math.round(r * 0.08 + 26 * 0.92);
      g = Math.round(g * 0.08 + 24 * 0.92);
      b = Math.round(b * 0.08 + 21 * 0.92);
      // controller body
      if (inRoundRect(u, v, 0.5, 0.555, 0.14, 0.075, 0.045)) {
        r = 241; g = 236; b = 223;
        // joysticks
        if (Math.hypot(u - 0.42, v - 0.525) < 0.026 || Math.hypot(u - 0.58, v - 0.525) < 0.026) {
          r = 45; g = 42; b = 38;
        }
        // d-pad cross (left)
        if (inRoundRect(u, v, 0.42, 0.60, 0.013, 0.021, 0.004) || inRoundRect(u, v, 0.42, 0.60, 0.024, 0.011, 0.004)) {
          r = 45; g = 42; b = 38;
        }
        // face buttons (right)
        const btn = (bx, by, cr, cg, cb) => {
          if (Math.hypot(u - bx, v - by) < 0.0145) { r = cr; g = cg; b = cb; }
        };
        btn(0.58, 0.575, 227, 79, 79);
        btn(0.58, 0.625, 95, 159, 214);
        btn(0.558, 0.60, 242, 201, 76);
        btn(0.602, 0.60, 111, 191, 115);
      }
    }

    return [Math.round(r), Math.round(g), Math.round(b), 255];
  };

  for (let y = 0; y < size; y++) {
    for (let x = 0; x < size; x++) {
      let acc = [0, 0, 0, 0];
      for (let sy = 0; sy < SS; sy++) {
        for (let sx = 0; sx < SS; sx++) {
          const u = (x + (sx + 0.5) / SS) / size;
          const v = (y + (sy + 0.5) / SS) / size;
          const c = sample(u, v);
          if (c[3] === 0) continue;
          acc[0] += c[0]; acc[1] += c[1]; acc[2] += c[2]; acc[3] += c[3];
        }
      }
      const n2 = SS * SS;
      const alpha = acc[3] / n2;
      if (alpha === 0) {
        out[(y * size + x) * 4 + 3] = 0;
        continue;
      }
      const a = alpha / 255;
      out[(y * size + x) * 4] = Math.round(acc[0] / acc[3] * 255 * a + 44 * (1 - a));
      out[(y * size + x) * 4 + 1] = Math.round(acc[1] / acc[3] * 255 * a + 42 * (1 - a));
      out[(y * size + x) * 4 + 2] = Math.round(acc[2] / acc[3] * 255 * a + 38 * (1 - a));
      out[(y * size + x) * 4 + 3] = Math.round(alpha);
    }
  }
  return out;
}

for (const size of [192, 512]) {
  const png = encodePNG(size, size, renderIcon(size));
  writeFileSync(join(OUT, `icon-${size}.png`), png);
  console.log(`wrote icon-${size}.png (${png.length} bytes)`);
}

// SVG favicon — the same nib + controller logo
const svg = `<svg xmlns="http://www.w3.org/2000/svg" viewBox="0 0 64 64">
  <defs>
    <linearGradient id="nib" x1="0.2" y1="0" x2="0.8" y2="1">
      <stop offset="0" stop-color="#8b5fc9"/>
      <stop offset="0.35" stop-color="#4a7fc9"/>
      <stop offset="0.7" stop-color="#3f9a9e"/>
      <stop offset="1" stop-color="#d29a45"/>
    </linearGradient>
  </defs>
  <path d="M32 4.5 C38 13.5, 47.5 19.5, 52 31 L53 47 Q 32 52.5 11 47 L12 31 C16.5 19.5, 26 13.5, 32 4.5 Z" fill="url(#nib)" stroke="#2c2a26" stroke-width="1.3" stroke-linejoin="round"/>
  <path d="M20 33.5 C22 26.5, 26 20, 30.5 11.5" stroke="rgba(255,255,255,0.5)" stroke-width="2" fill="none" stroke-linecap="round"/>
  <path d="M32 4.5 L32 22.5" stroke="#2c2a26" stroke-width="1.4" stroke-linecap="round"/>
  <circle cx="32" cy="25.5" r="3.4" fill="#2c2a26"/>
  <circle cx="32" cy="25.5" r="2.1" fill="#d29a45"/>
  <path d="M17 45.4 Q 32 48.6 47 45.4" stroke="#e0a94e" stroke-width="3.6" fill="none" stroke-linecap="round"/>
  <rect x="20.5" y="29.5" width="23" height="15" rx="3.2" fill="rgba(26,24,21,0.92)" stroke="#2c2a26" stroke-width="0.9"/>
  <rect x="23.6" y="32.4" width="16.8" height="10.4" rx="5" fill="#f1ecdf" stroke="#2c2a26" stroke-width="0.9"/>
  <circle cx="27.6" cy="35.3" r="2" fill="#2d2a26"/>
  <circle cx="36.4" cy="35.3" r="2" fill="#2d2a26"/>
  <g fill="#2d2a26">
    <rect x="26.7" y="38.7" width="1.8" height="2.9" rx="0.4"/>
    <rect x="25.7" y="39.6" width="3.8" height="1.7" rx="0.4"/>
  </g>
  <circle cx="35.3" cy="38.3" r="1.1" fill="#e34f4f"/>
  <circle cx="37.9" cy="38.3" r="1.1" fill="#6fbf73"/>
  <circle cx="36.6" cy="37.1" r="1.1" fill="#f2c94c"/>
  <circle cx="36.6" cy="39.5" r="1.1" fill="#5f9fd6"/>
</svg>`;
writeFileSync(join(OUT, 'icon.svg'), svg);
console.log('wrote icon.svg');

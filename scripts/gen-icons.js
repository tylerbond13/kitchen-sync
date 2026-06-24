// Generates PNG app icons (chef hat on tomato-red) with zero dependencies:
// rasterizes with plain math, encodes PNG via zlib. Run: npm run icons
const fs = require('fs');
const path = require('path');
const zlib = require('zlib');

const OUT = path.join(__dirname, '..', 'public', 'icons');

function crc32(buf) {
  let table = crc32.table;
  if (!table) {
    table = crc32.table = new Int32Array(256);
    for (let n = 0; n < 256; n++) {
      let c = n;
      for (let k = 0; k < 8; k++) c = c & 1 ? 0xEDB88320 ^ (c >>> 1) : c >>> 1;
      table[n] = c;
    }
  }
  let crc = -1;
  for (let i = 0; i < buf.length; i++) crc = (crc >>> 8) ^ table[(crc ^ buf[i]) & 0xFF];
  return (crc ^ -1) >>> 0;
}

function chunk(type, data) {
  const len = Buffer.alloc(4);
  len.writeUInt32BE(data.length);
  const body = Buffer.concat([Buffer.from(type, 'ascii'), data]);
  const crc = Buffer.alloc(4);
  crc.writeUInt32BE(crc32(body));
  return Buffer.concat([len, body, crc]);
}

function encodePNG(width, height, rgba) {
  const sig = Buffer.from([137, 80, 78, 71, 13, 10, 26, 10]);
  const ihdr = Buffer.alloc(13);
  ihdr.writeUInt32BE(width, 0);
  ihdr.writeUInt32BE(height, 4);
  ihdr[8] = 8; ihdr[9] = 6; // 8-bit RGBA
  const raw = Buffer.alloc((width * 4 + 1) * height);
  for (let y = 0; y < height; y++) {
    raw[y * (width * 4 + 1)] = 0; // filter: none
    rgba.copy(raw, y * (width * 4 + 1) + 1, y * width * 4, (y + 1) * width * 4);
  }
  return Buffer.concat([
    sig,
    chunk('IHDR', ihdr),
    chunk('IDAT', zlib.deflateSync(raw, { level: 9 })),
    chunk('IEND', Buffer.alloc(0)),
  ]);
}

// ---- drawing helpers (signed distance style, with 3x supersampling) ----
const BG_TOP = [248, 113, 86];
const BG_BOT = [201, 61, 43];
const HAT = [255, 252, 245];
const HAT_SHADE = [235, 224, 205];

function inRoundedRect(x, y, size, r) {
  const min = 0, max = size;
  if (x < min || x > max || y < min || y > max) return false;
  const cx = Math.max(min + r, Math.min(x, max - r));
  const cy = Math.max(min + r, Math.min(y, max - r));
  return (x - cx) ** 2 + (y - cy) ** 2 <= r * r || (x >= min + r && x <= max - r) || (y >= min + r && y <= max - r)
    ? Math.hypot(x - Math.max(min + r, Math.min(x, max - r)), y - Math.max(min + r, Math.min(y, max - r))) <= r
    : false;
}

function hatHit(x, y, s) {
  // coordinates normalized to icon size s; classic chef toque:
  // three puffs + band
  const cx = s / 2;
  const puffR = s * 0.155;
  const puffs = [
    [cx - s * 0.165, s * 0.40],
    [cx, s * 0.345],
    [cx + s * 0.165, s * 0.40],
  ];
  for (const [px, py] of puffs) {
    if ((x - px) ** 2 + (y - py) ** 2 <= puffR ** 2) return 'puff';
  }
  // crown body
  if (x >= cx - s * 0.21 && x <= cx + s * 0.21 && y >= s * 0.40 && y <= s * 0.565) return 'puff';
  // band
  if (x >= cx - s * 0.225 && x <= cx + s * 0.225 && y >= s * 0.575 && y <= s * 0.655) return 'band';
  return null;
}

function render(size) {
  const rgba = Buffer.alloc(size * size * 4);
  const SS = 3;
  const cornerR = size * 0.22;
  for (let y = 0; y < size; y++) {
    for (let x = 0; x < size; x++) {
      let r = 0, g = 0, b = 0, a = 0;
      for (let sy = 0; sy < SS; sy++) {
        for (let sx = 0; sx < SS; sx++) {
          const fx = x + (sx + 0.5) / SS;
          const fy = y + (sy + 0.5) / SS;
          if (!inRoundedRect(fx, fy, size, cornerR)) continue;
          const t = fy / size;
          let pr = BG_TOP[0] + (BG_BOT[0] - BG_TOP[0]) * t;
          let pg = BG_TOP[1] + (BG_BOT[1] - BG_TOP[1]) * t;
          let pb = BG_TOP[2] + (BG_BOT[2] - BG_TOP[2]) * t;
          const hit = hatHit(fx, fy, size);
          if (hit === 'puff') { [pr, pg, pb] = HAT; }
          else if (hit === 'band') { [pr, pg, pb] = HAT_SHADE; }
          r += pr; g += pg; b += pb; a += 255;
        }
      }
      const n = SS * SS;
      const i = (y * size + x) * 4;
      rgba[i] = Math.round(r / n);
      rgba[i + 1] = Math.round(g / n);
      rgba[i + 2] = Math.round(b / n);
      rgba[i + 3] = Math.round(a / n);
    }
  }
  return encodePNG(size, size, rgba);
}

fs.mkdirSync(OUT, { recursive: true });
for (const [file, size] of [['icon-192.png', 192], ['icon-512.png', 512], ['apple-touch-icon.png', 180]]) {
  fs.writeFileSync(path.join(OUT, file), render(size));
  console.log(`wrote icons/${file}`);
}

// SVG favicon (vector twin of the PNG)
const svg = `<svg xmlns="http://www.w3.org/2000/svg" viewBox="0 0 100 100">
<defs><linearGradient id="g" x1="0" y1="0" x2="0" y2="1">
<stop offset="0" stop-color="#F87156"/><stop offset="1" stop-color="#C93D2B"/></linearGradient></defs>
<rect width="100" height="100" rx="22" fill="url(#g)"/>
<circle cx="33.5" cy="40" r="15.5" fill="#FFFCF5"/>
<circle cx="50" cy="34.5" r="15.5" fill="#FFFCF5"/>
<circle cx="66.5" cy="40" r="15.5" fill="#FFFCF5"/>
<rect x="29" y="40" width="42" height="16.5" fill="#FFFCF5"/>
<rect x="27.5" y="57.5" width="45" height="8" rx="3" fill="#EBE0CD"/>
</svg>`;
fs.writeFileSync(path.join(OUT, 'favicon.svg'), svg);
console.log('wrote icons/favicon.svg');

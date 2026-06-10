// Generates icons/icon{16,48,128}.png — a green rounded square with a white
// "play" triangle. Pure Node (zlib + fs), no dependencies. Run once:
//   node tools/make-icons.js

const fs = require('fs');
const path = require('path');
const zlib = require('zlib');

const CRC = (() => {
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
  for (let i = 0; i < buf.length; i++) c = CRC[(c ^ buf[i]) & 0xff] ^ (c >>> 8);
  return (c ^ 0xffffffff) >>> 0;
}

function chunk(type, data) {
  const len = Buffer.alloc(4);
  len.writeUInt32BE(data.length, 0);
  const typeBuf = Buffer.from(type, 'ascii');
  const crc = Buffer.alloc(4);
  crc.writeUInt32BE(crc32(Buffer.concat([typeBuf, data])), 0);
  return Buffer.concat([len, typeBuf, data, crc]);
}

function pngEncode(size, rgba) {
  const sig = Buffer.from([137, 80, 78, 71, 13, 10, 26, 10]);
  const ihdr = Buffer.alloc(13);
  ihdr.writeUInt32BE(size, 0);
  ihdr.writeUInt32BE(size, 4);
  ihdr[8] = 8; // bit depth
  ihdr[9] = 6; // color type RGBA
  const stride = size * 4;
  const raw = Buffer.alloc((stride + 1) * size);
  for (let y = 0; y < size; y++) {
    raw[y * (stride + 1)] = 0; // filter: none
    rgba.copy(raw, y * (stride + 1) + 1, y * stride, y * stride + stride);
  }
  const idat = zlib.deflateSync(raw, { level: 9 });
  return Buffer.concat([sig, chunk('IHDR', ihdr), chunk('IDAT', idat), chunk('IEND', Buffer.alloc(0))]);
}

function buildIcon(S) {
  const buf = Buffer.alloc(S * S * 4); // transparent by default
  const r = S * 0.22; // corner radius
  const bg = [0x22, 0xc5, 0x5e, 0xff]; // green
  const x0 = S * 0.36;
  const x1 = S * 0.7;
  const cy = S * 0.5;
  const h = S * 0.19; // half-height of the triangle base

  for (let y = 0; y < S; y++) {
    for (let x = 0; x < S; x++) {
      // Rounded-rect membership: distance to the nearest corner arc center.
      let dx = 0;
      let dy = 0;
      if (x < r) dx = r - x;
      else if (x > S - 1 - r) dx = x - (S - 1 - r);
      if (y < r) dy = r - y;
      else if (y > S - 1 - r) dy = y - (S - 1 - r);
      if (dx * dx + dy * dy > r * r) continue; // outside the rounded square

      let col = bg;
      if (x >= x0 && x <= x1) {
        const half = h * ((x1 - x) / (x1 - x0));
        if (Math.abs(y - cy) <= half) col = [255, 255, 255, 255];
      }
      const idx = (y * S + x) * 4;
      buf[idx] = col[0];
      buf[idx + 1] = col[1];
      buf[idx + 2] = col[2];
      buf[idx + 3] = col[3];
    }
  }
  return buf;
}

const outDir = path.join(__dirname, '..', 'public', 'icon');
fs.mkdirSync(outDir, { recursive: true });
for (const S of [16, 48, 128]) {
  const png = pngEncode(S, buildIcon(S));
  fs.writeFileSync(path.join(outDir, `${S}.png`), png);
  console.log(`wrote public/icon/${S}.png (${png.length} bytes)`);
}

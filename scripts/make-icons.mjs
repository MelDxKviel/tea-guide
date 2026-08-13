import { deflateSync } from 'node:zlib';
import { mkdir, writeFile } from 'node:fs/promises';
import path from 'node:path';

function crc32(buf) {
  let crc = 0xffffffff;
  for (const byte of buf) {
    crc ^= byte;
    for (let i = 0; i < 8; i += 1) {
      crc = (crc >>> 1) ^ (crc & 1 ? 0xedb88320 : 0);
    }
  }
  return (crc ^ 0xffffffff) >>> 0;
}

function chunk(type, data) {
  const name = Buffer.from(type);
  const len = Buffer.alloc(4);
  len.writeUInt32BE(data.length);
  const crc = Buffer.alloc(4);
  crc.writeUInt32BE(crc32(Buffer.concat([name, data])));
  return Buffer.concat([len, name, data, crc]);
}

function png(size, r, g, b) {
  const raw = Buffer.alloc((size * 3 + 1) * size);
  for (let y = 0; y < size; y += 1) {
    const row = y * (size * 3 + 1);
    raw[row] = 0;
    for (let x = 0; x < size; x += 1) {
      const cx = x + 0.5 - size / 2;
      const cy = y + 0.5 - size / 2;
      const bowl = cx * cx + (cy - size * 0.06) * (cy - size * 0.06);
      const inside = bowl < (size * 0.28) ** 2 && cy > -size * 0.02;
      const ring = Math.abs(Math.sqrt(bowl) - size * 0.28) < size * 0.018 && cy > -size * 0.04;
      const handle = cx > size * 0.22 && cx < size * 0.38 && Math.abs(cy - size * 0.02) < size * 0.12;
      const on = ring || (handle && !inside);
      const i = row + 1 + x * 3;
      if (on) {
        raw[i] = 243;
        raw[i + 1] = 236;
        raw[i + 2] = 223;
      } else {
        raw[i] = r;
        raw[i + 1] = g;
        raw[i + 2] = b;
      }
    }
  }
  const ihdr = Buffer.alloc(13);
  ihdr.writeUInt32BE(size, 0);
  ihdr.writeUInt32BE(size, 4);
  ihdr[8] = 8;
  ihdr[9] = 2;
  return Buffer.concat([
    Buffer.from([137, 80, 78, 71, 13, 10, 26, 10]),
    chunk('IHDR', ihdr),
    chunk('IDAT', deflateSync(raw)),
    chunk('IEND', Buffer.alloc(0)),
  ]);
}

const dir = path.resolve('public/icons');
await mkdir(dir, { recursive: true });
await writeFile(path.join(dir, 'icon-192.png'), png(192, 29, 69, 54));
await writeFile(path.join(dir, 'icon-512.png'), png(512, 29, 69, 54));
await writeFile(path.join(dir, 'apple-touch-icon.png'), png(180, 29, 69, 54));
await writeFile(path.resolve('public/og.png'), png(512, 29, 69, 54));
console.log('icons written');

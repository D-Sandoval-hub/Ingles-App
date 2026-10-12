// Genera los íconos PNG de la PWA sin dependencias (codificador PNG mínimo con zlib).
// Dibujo: fondo azul y una burbuja de diálogo blanca. Uso: node scripts/gen-icons.mjs
import { writeFileSync } from 'node:fs';
import { deflateSync } from 'node:zlib';

const BG = [42, 120, 214];
const FG = [255, 255, 255];

const CRC_TABLE = Array.from({ length: 256 }, (_, n) => {
  let c = n;
  for (let k = 0; k < 8; k++) c = c & 1 ? 0xedb88320 ^ (c >>> 1) : c >>> 1;
  return c >>> 0;
});
function crc32(buf) {
  let c = 0xffffffff;
  for (const b of buf) c = CRC_TABLE[(c ^ b) & 0xff] ^ (c >>> 8);
  return (c ^ 0xffffffff) >>> 0;
}
function chunk(type, data) {
  const len = Buffer.alloc(4);
  len.writeUInt32BE(data.length);
  const td = Buffer.concat([Buffer.from(type, 'ascii'), data]);
  const crc = Buffer.alloc(4);
  crc.writeUInt32BE(crc32(td));
  return Buffer.concat([len, td, crc]);
}

function draw(size, { maskable }) {
  const raw = Buffer.alloc(size * (size * 3 + 1));
  const scale = maskable ? 0.62 : 0.78; // zona segura para íconos "maskable"
  const cx = size / 2;
  const cy = size * 0.47;
  const rx = (size * scale) / 2;
  const ry = rx * 0.72;
  for (let y = 0; y < size; y++) {
    raw[y * (size * 3 + 1)] = 0;
    for (let x = 0; x < size; x++) {
      const dx = (x - cx) / rx;
      const dy = (y - cy) / ry;
      const inBubble = dx * dx + dy * dy <= 1;
      // Cola de la burbuja: triángulo abajo a la izquierda.
      const tx0 = cx - rx * 0.45;
      const ty0 = cy + ry * 0.6;
      const inTail = y >= ty0 && y <= ty0 + ry * 0.55 && x >= tx0 - (y - ty0) * 0.6 && x <= tx0 + rx * 0.3 - (y - ty0) * 0.9;
      // Tres puntos dentro de la burbuja (color de fondo).
      const dotR = rx * 0.11;
      const isDot = [-0.4, 0, 0.4].some((o) => (x - (cx + o * rx)) ** 2 + (y - cy) ** 2 <= dotR * dotR);
      const color = (inBubble || inTail) && !isDot ? FG : BG;
      const i = y * (size * 3 + 1) + 1 + x * 3;
      raw[i] = color[0];
      raw[i + 1] = color[1];
      raw[i + 2] = color[2];
    }
  }
  const ihdr = Buffer.alloc(13);
  ihdr.writeUInt32BE(size, 0);
  ihdr.writeUInt32BE(size, 4);
  ihdr[8] = 8; // bits
  ihdr[9] = 2; // RGB
  return Buffer.concat([
    Buffer.from([0x89, 0x50, 0x4e, 0x47, 0x0d, 0x0a, 0x1a, 0x0a]),
    chunk('IHDR', ihdr),
    chunk('IDAT', deflateSync(raw)),
    chunk('IEND', Buffer.alloc(0)),
  ]);
}

const out = new URL('../public/', import.meta.url).pathname;
writeFileSync(`${out}icon-192.png`, draw(192, { maskable: false }));
writeFileSync(`${out}icon-512.png`, draw(512, { maskable: false }));
writeFileSync(`${out}icon-512-maskable.png`, draw(512, { maskable: true }));
writeFileSync(
  `${out}icon.svg`,
  `<svg xmlns="http://www.w3.org/2000/svg" viewBox="0 0 100 100"><rect width="100" height="100" rx="22" fill="#2a78d6"/><ellipse cx="50" cy="47" rx="39" ry="28" fill="#fff"/><path d="M32 63 L24 82 L46 68 Z" fill="#fff"/><circle cx="34" cy="47" r="4.3" fill="#2a78d6"/><circle cx="50" cy="47" r="4.3" fill="#2a78d6"/><circle cx="66" cy="47" r="4.3" fill="#2a78d6"/></svg>`,
);
console.log('Íconos generados en public/');

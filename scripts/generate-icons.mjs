import sharp from 'sharp';
import { mkdirSync } from 'fs';
import { join, dirname } from 'path';
import { fileURLToPath } from 'url';

const __dirname = dirname(fileURLToPath(import.meta.url));
const outDir = join(__dirname, '..', 'public', 'icons');
mkdirSync(outDir, { recursive: true });

const SIZES = [72, 96, 128, 144, 152, 192, 384, 512];

for (const size of SIZES) {
  const star = size * 0.52;
  const cx = size / 2;
  const cy = size / 2;

  // Four-pointed star (✦) drawn as SVG polygon
  const r1 = star / 2;      // outer radius
  const r2 = r1 * 0.22;     // inner radius

  const points = [];
  for (let i = 0; i < 8; i++) {
    const angle = (Math.PI / 4) * i - Math.PI / 2;
    const r = i % 2 === 0 ? r1 : r2;
    points.push(`${cx + r * Math.cos(angle)},${cy + r * Math.sin(angle)}`);
  }

  const svg = `<svg xmlns="http://www.w3.org/2000/svg" width="${size}" height="${size}">
  <rect width="${size}" height="${size}" rx="${size * 0.12}" fill="#0f1e2e"/>
  <polygon points="${points.join(' ')}" fill="#c6a75e"/>
</svg>`;

  await sharp(Buffer.from(svg))
    .png()
    .toFile(join(outDir, `icon-${size}x${size}.png`));

  console.log(`✓ icon-${size}x${size}.png`);
}

console.log('All icons generated.');

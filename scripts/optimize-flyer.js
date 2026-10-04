// Reads flyer-original.png from the project root and writes optimised copies
// to /public: flyer.webp, flyer.jpg (max 1080px wide, each under 250KB) and
// a 1200x630 og.jpg for social previews.
//
// If flyer-original.png is missing, generates a placeholder dark neon
// gradient flyer so the rest of the pipeline (and the site) still works.
// Swap in the real flyer-original.png and re-run this script when it's ready.
import { existsSync } from 'node:fs';
import { mkdir } from 'node:fs/promises';
import path from 'node:path';
import sharp from 'sharp';

const ROOT = path.resolve(import.meta.dirname, '..');
const SRC = path.join(ROOT, 'flyer-original.png');
const PUBLIC_DIR = path.join(ROOT, 'public');

const MAX_WIDTH = 1080;
const MAX_BYTES = 250 * 1024;

async function placeholderBuffer() {
  const svg = `
    <svg width="1080" height="1350" xmlns="http://www.w3.org/2000/svg">
      <defs>
        <linearGradient id="g" x1="0%" y1="0%" x2="100%" y2="100%">
          <stop offset="0%" stop-color="#3a0ca3"/>
          <stop offset="100%" stop-color="#d100d1"/>
        </linearGradient>
      </defs>
      <rect width="100%" height="100%" fill="#0a0118"/>
      <rect width="100%" height="100%" fill="url(#g)" opacity="0.55"/>
      <circle cx="540" cy="500" r="420" fill="#00e5ff" opacity="0.18"/>
      <text x="50%" y="46%" text-anchor="middle" font-family="Arial, sans-serif"
        font-size="64" font-weight="900" fill="#f5f3ff" letter-spacing="2">GITC 2026</text>
      <text x="50%" y="53%" text-anchor="middle" font-family="monospace"
        font-size="26" fill="#00e5ff" letter-spacing="4">GET INTO TECH CONFERENCE 2.0</text>
      <text x="50%" y="58%" text-anchor="middle" font-family="monospace"
        font-size="20" fill="#ff2fe0" letter-spacing="2">LASU x ZENITH BANK</text>
    </svg>
  `;
  return Buffer.from(svg);
}

async function encodeUnder(pipeline, format, maxBytes) {
  let quality = format === 'jpeg' ? 90 : 85;
  let buffer;
  while (quality >= 35) {
    buffer =
      format === 'jpeg'
        ? await pipeline.clone().jpeg({ quality }).toBuffer()
        : await pipeline.clone().webp({ quality }).toBuffer();
    if (buffer.length <= maxBytes) return buffer;
    quality -= 10;
  }
  return buffer;
}

async function run() {
  await mkdir(PUBLIC_DIR, { recursive: true });

  const usingPlaceholder = !existsSync(SRC);
  if (usingPlaceholder) {
    console.warn(
      '[optimize-flyer] flyer-original.png not found — generating a placeholder flyer. Replace it with the real flyer and re-run this script.'
    );
  }

  const input = usingPlaceholder ? await placeholderBuffer() : SRC;
  const base = sharp(input).resize({ width: MAX_WIDTH, withoutEnlargement: true });

  const webp = await encodeUnder(base, 'webp', MAX_BYTES);
  const jpg = await encodeUnder(base, 'jpeg', MAX_BYTES);

  await sharp(webp).toFile(path.join(PUBLIC_DIR, 'flyer.webp'));
  await sharp(jpg).toFile(path.join(PUBLIC_DIR, 'flyer.jpg'));

  const og = await sharp(input)
    .resize({ width: 1200, height: 630, fit: 'cover', position: 'attention' })
    .jpeg({ quality: 85 })
    .toBuffer();
  await sharp(og).toFile(path.join(PUBLIC_DIR, 'og.jpg'));

  console.log(
    `[optimize-flyer] wrote flyer.webp (${(webp.length / 1024).toFixed(1)}KB), flyer.jpg (${(jpg.length / 1024).toFixed(1)}KB), og.jpg (${(og.length / 1024).toFixed(1)}KB)`
  );
}

run().catch((err) => {
  console.error(err);
  process.exit(1);
});

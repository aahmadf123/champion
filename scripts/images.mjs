/**
 * Generates responsive derivatives from the masters in images/ into assets/img/.
 *
 * The masters are 3840x2160 JPEGs at 2-6 MB each, and the page was previously
 * loading nine of them at full size into 600x400 boxes. Everything the page
 * ships now comes out of this script.
 *
 * Run: npm run images
 */
import { mkdir, readdir, stat, writeFile } from 'node:fs/promises';
import { existsSync } from 'node:fs';
import path from 'node:path';
import sharp from 'sharp';
import { ASSETS, WIDTHS } from '../assets/manifest.mjs';

const SRC = 'images';
const OUT = 'assets/img';

// AVIF buys roughly another 25% over WebP but encodes an order of magnitude
// slower, so it is reserved for the hero, which is the LCP image.
const AVIF_IDS = new Set(['exteriorEast']);

const QUALITY = {
  webp: { rendering: 78, portrait: 82, logo: 90 },
  jpeg: { rendering: 80, portrait: 84, logo: 90 },
  avif: { rendering: 52, portrait: 58, logo: 70 },
};

const bytes = (n) =>
  n > 1e6 ? `${(n / 1e6).toFixed(1)} MB` : `${Math.round(n / 1e3)} KB`;

async function main() {
  await mkdir(OUT, { recursive: true });

  const report = {};
  let srcTotal = 0;
  let outTotal = 0;
  const missing = [];

  for (const [id, asset] of Object.entries(ASSETS)) {
    const srcPath = path.join(SRC, asset.local);
    if (!existsSync(srcPath)) {
      missing.push(`${id} -> ${srcPath}`);
      continue;
    }

    const input = sharp(srcPath, { failOn: 'none' });
    const meta = await input.metadata();
    srcTotal += (await stat(srcPath)).size;

    const widths = WIDTHS[asset.kind].filter((w) => w <= meta.width);
    if (widths.length === 0) widths.push(meta.width);

    const entry = {
      kind: asset.kind,
      alt: asset.alt,
      width: meta.width,
      height: meta.height,
      aspect: +(meta.width / meta.height).toFixed(4),
      webp: [],
      avif: [],
      fallback: null,
    };

    const formats = ['webp'];
    if (AVIF_IDS.has(id)) formats.push('avif');

    for (const w of widths) {
      for (const fmt of formats) {
        const name = `${id}-${w}.${fmt}`;
        const dest = path.join(OUT, name);
        const pipe = sharp(srcPath, { failOn: 'none' }).resize({
          width: w,
          withoutEnlargement: true,
        });
        if (fmt === 'webp') {
          await pipe.webp({ quality: QUALITY.webp[asset.kind] }).toFile(dest);
        } else {
          await pipe
            .avif({ quality: QUALITY.avif[asset.kind], effort: 4 })
            .toFile(dest);
        }
        const size = (await stat(dest)).size;
        outTotal += size;
        entry[fmt].push({ w, src: `${OUT}/${name}`, size });
      }
    }

    // One raster fallback for anything that cannot take WebP. Sized at the
    // largest layout width rather than the largest derivative.
    const fbWidth = asset.kind === 'rendering' ? 1600 : widths[widths.length - 1];
    const fbW = Math.min(fbWidth, meta.width);
    const fbExt = asset.kind === 'logo' ? 'png' : 'jpg';
    const fbName = `${id}-${fbW}.${fbExt}`;
    const fbDest = path.join(OUT, fbName);
    const fbPipe = sharp(srcPath, { failOn: 'none' }).resize({
      width: fbW,
      withoutEnlargement: true,
    });
    if (fbExt === 'png') {
      await fbPipe.png({ compressionLevel: 9, palette: true }).toFile(fbDest);
    } else {
      // Flatten alpha onto the navy ground the portraits actually sit on.
      await fbPipe
        .flatten({ background: '#001527' })
        .jpeg({ quality: QUALITY.jpeg[asset.kind], progressive: true, mozjpeg: true })
        .toFile(fbDest);
    }
    const fbSize = (await stat(fbDest)).size;
    outTotal += fbSize;
    entry.fallback = { w: fbW, src: `${OUT}/${fbName}`, size: fbSize };

    report[id] = entry;
    process.stdout.write(
      `  ${id.padEnd(20)} ${String(meta.width).padStart(4)}x${meta.height}  ` +
        `${widths.length} widths  ${formats.join('+')}\n`
    );
  }

  await writeFile(
    path.join(OUT, 'derivatives.json'),
    JSON.stringify(report, null, 2) + '\n'
  );

  const files = (await readdir(OUT)).length;
  console.log(`\n  masters      ${bytes(srcTotal)}`);
  console.log(`  derivatives  ${bytes(outTotal)} across ${files} files`);
  console.log(
    `  reduction    ${(100 - (outTotal / srcTotal) * 100).toFixed(1)}% total bytes on disk`
  );
  if (missing.length) {
    console.log(`\n  MISSING masters (${missing.length}):`);
    for (const m of missing) console.log(`    ${m}`);
  }
}

main().catch((err) => {
  console.error(err);
  process.exit(1);
});

/**
 * Per-section screenshots at full resolution, for judging design rather than
 * just checking that a page renders. Full-page shots are too small to read
 * type at; these are the crops used to review each concept.
 *
 * Usage: node scripts/sections.mjs [concept]
 */
import { chromium } from 'playwright-core';
import sharp from 'sharp';
const concept = process.argv[2] || 'blueprint';
const b = await chromium.launch({ executablePath: process.env.PW_CHROMIUM || '/opt/pw-browsers/chromium' });
const ctx = await b.newContext({ viewport: { width: 1440, height: 900 }, deviceScaleFactor: 1 });
const p = await ctx.newPage();
await p.goto(`http://127.0.0.1:8420/preview/${concept}/index.html`, { waitUntil: 'load' });
await p.evaluate(() => document.querySelectorAll('.cc-enter').forEach(e => e.classList.add('is-in')));
await p.evaluate(async () => {
  const real = Array.from(document.images).filter(i => i.getAttribute('src'));
  real.forEach(i => { i.loading = 'eager'; });
  await Promise.all(real.map(i => i.decode ? i.decode().catch(()=>{}) : Promise.resolve()));
});
await p.evaluate(() => new Promise(r => setTimeout(r, 300)));
for (const [name, sel] of [['hero','.cc-hero'],['vision','#cc-vision'],['spaces','#cc-spaces'],['day','#cc-day'],['give','#cc-give']]) {
  const el = await p.$(sel);
  if (el) await el.screenshot({ path: `.shots/${concept}-x-${name}.png` });
}
await b.close();
// Halve the tall ones so they read at review size
for (const n of ['hero','vision','spaces','day','give']) {
  const f = `.shots/${concept}-x-${n}.png`;
  try { const m = await sharp(f).metadata();
    if (m.height > 1500) await sharp(f).resize({ width: Math.round(m.width*0.7) }).toFile(f.replace('.png','-s.png'));
  } catch {}
}
console.log('cropped');

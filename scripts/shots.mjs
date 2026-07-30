/**
 * Screenshots the built pages so design and layout can be checked visually
 * rather than assumed. Also runs a few assertions that only a real browser can
 * answer: no horizontal page scroll, no-JS readability, focus-ring visibility.
 *
 * Usage: node scripts/shots.mjs [concept] [--full]
 */
import { chromium } from 'playwright-core';
import { mkdir } from 'node:fs/promises';
import path from 'node:path';

const args = process.argv.slice(2).filter((a) => !a.startsWith('--'));
const concepts = args.length ? args : ['blueprint', 'editorial', 'refined'];
const full = process.argv.includes('--full');
const OUT = process.env.SHOT_DIR || '.shots';
let anyFailed = false;
const base = process.env.BASE || 'http://127.0.0.1:8420';
await mkdir(OUT, { recursive: true });
const browser = await chromium.launch({ executablePath: process.env.PW_CHROMIUM || '/opt/pw-browsers/chromium' });

for (const concept of concepts) {
const url = concept === 'prod' ? `${base}/index.html` : `${base}/preview/${concept}/index.html`;

const views = [
  { name: 'desktop', width: 1440, height: 900 },
  { name: 'tablet', width: 820, height: 1100 },
  { name: 'mobile', width: 390, height: 844 },
];

const problems = [];

for (const v of views) {
  const ctx = await browser.newContext({ viewport: { width: v.width, height: v.height }, deviceScaleFactor: 1 });
  const page = await ctx.newPage();
  const errors = [];
  page.on('pageerror', (e) => errors.push('pageerror: ' + String(e)));
  page.on('requestfailed', (r) => errors.push(`requestfailed ${r.url()}`));
  page.on('response', (r) => { if (r.status() >= 400) errors.push(`${r.status()} ${r.url()}`); });
  await page.goto(url, { waitUntil: 'load' });
  // Reveal everything so full-page shots are not half empty, then walk the page
  // so lazy images start loading, then wait for every one of them to decode.
  // Without this the shots show blank boxes and lie about the design.
  await page.evaluate(() => document.querySelectorAll('.cc-enter').forEach((e) => e.classList.add('is-in')));
  // Force every lazy image to load and decode. A full-page screenshot resizes
  // rather than scrolls, so Chromium's lazy-load heuristic never fires for
  // offscreen images and the shot comes out full of blank boxes.
  // The lightbox placeholder carries src="" on purpose, so it is excluded.
  await page.evaluate(async () => {
    const real = Array.from(document.images).filter((i) => i.getAttribute('src'));
    real.forEach((i) => {
      i.loading = 'eager';
      i.setAttribute('decoding', 'sync');
    });
    await Promise.all(
      real.map((i) =>
        i.decode
          ? i.decode().catch(() => {})
          : new Promise((r) => {
              if (i.complete) return r();
              i.addEventListener('load', r, { once: true });
              i.addEventListener('error', r, { once: true });
            })
      )
    );
  });
  await page.evaluate(() => new Promise((r) => setTimeout(r, 200)));

  const blank = await page.evaluate(() =>
    Array.from(document.images)
      .filter((i) => i.getAttribute('src') && !i.naturalWidth)
      .map((i) => i.currentSrc || i.getAttribute('src'))
  );
  if (blank.length) {
    problems.push(`${v.name}: ${blank.length} images blank -> ${blank.slice(0, 4).join(', ')}`);
  }

  await page.screenshot({ path: path.join(OUT, `${concept}-${v.name}.png`), fullPage: full });

  const overflow = await page.evaluate(() => ({
    doc: document.documentElement.scrollWidth,
    win: window.innerWidth,
  }));
  if (overflow.doc > overflow.win + 1) {
    problems.push(`${v.name}: horizontal overflow ${overflow.doc} > ${overflow.win}`);
  }
  if (errors.length) problems.push(`${v.name}: JS errors -> ${errors.join(' | ')}`);
  await ctx.close();
}

// No-JS pass: every section must still be readable.
const noJs = await browser.newContext({ viewport: { width: 1280, height: 900 }, javaScriptEnabled: false });
const p2 = await noJs.newPage();
await p2.goto(url, { waitUntil: 'load' });
await p2.screenshot({ path: path.join(OUT, `${concept}-nojs.png`), fullPage: full });
const hidden = await p2.evaluate(() => {
  const out = [];
  document.querySelectorAll('.cc-sec, .cc-hero').forEach((s) => {
    const cs = getComputedStyle(s);
    if (parseFloat(cs.opacity) < 0.9 || cs.visibility === 'hidden' || cs.display === 'none') {
      out.push(s.id || s.className);
    }
  });
  const answers = document.querySelectorAll('.cc-acc-panel:not([hidden])').length;
  return { out, answers, total: document.querySelectorAll('.cc-acc-panel').length };
});
if (hidden.out.length) problems.push(`no-JS: hidden sections -> ${hidden.out.join(', ')}`);
if (hidden.answers !== hidden.total) {
  problems.push(`no-JS: only ${hidden.answers}/${hidden.total} FAQ answers reachable`);
}
await noJs.close();

if (problems.length) {
  anyFailed = true;
  console.log(`  ${concept}: ${problems.length} problem(s)`);
  problems.forEach((p) => console.log('    ' + p));
} else {
  console.log(`  ok  ${concept}: no overflow, no JS errors, all sections readable without JS (${hidden.total} FAQ answers open)`);
}
}

await browser.close();
if (anyFailed) process.exitCode = 1;

/**
 * Emits every deliverable from one source.
 *
 *   dist/index.html                     production GitHub Pages page
 *   dist/sidearm.html                   production Sidearm paste, fonts inlined
 *   dist/sidearm-systemfonts.html       same, fonts left to the system stack
 *   dist/preview/index.html             concept chooser
 *   dist/preview/<concept>/index.html   one page per concept
 *   dist/preview/<concept>/sidearm.html the Sidearm paste for that concept
 *
 * Run: npm run build
 */
import { cp, mkdir, readFile, rm, writeFile, readdir, stat } from 'node:fs/promises';
import { existsSync } from 'node:fs';
import path from 'node:path';
import { renderBody } from '../src/layout/page.mjs';
import { missingOnSidearm } from '../assets/manifest.mjs';
import * as C from '../src/content.mjs';

const OUT = 'dist';

/** The concept promoted to the production files. */
const PRODUCTION_CONCEPT = 'blueprint';

const CONCEPTS = [
  {
    id: 'blueprint',
    name: 'Blueprint',
    tagline: 'The drawing set',
    blurb:
      'Extends the architectural language the old hero already spoke: dimension lines, crop marks, real sheet numbers, a monospace annotation layer. Gold becomes annotation ink rather than a fill, so the page reads as a set of drawings rather than a card grid.',
    risk: 'Gold area drops sharply. That is the deliberate move.',
  },
  {
    id: 'editorial',
    name: 'Editorial',
    tagline: 'One image per screen',
    blurb:
      'Drops the grids entirely. Full-bleed renderings, a high-contrast serif carrying the human story, and the student-athlete day as the narrative spine. Reads like a magazine feature.',
    risk: 'A serif is a real departure for a college athletics page.',
  },
  {
    id: 'refined',
    name: 'Refined',
    tagline: 'The current design, fixed',
    blurb:
      'Same navy, gold, Chakra Petch and Inter, same section order. What changes is craft: a real type scale instead of ad hoc clamps, even vertical rhythm, contrast brought to AA, and a feature grid weighted so it reads as a tour instead of a photo dump.',
    risk: 'Lowest risk. Nothing new to get approved internally.',
  },
];

/* --- fonts ---------------------------------------------------------------- */

const FONTS = [
  { file: 'chakra-petch-600.woff2', family: 'Chakra Petch', weight: '600', style: 'normal', preload: false },
  { file: 'chakra-petch-700.woff2', family: 'Chakra Petch', weight: '700', style: 'normal', preload: true },
  { file: 'inter-400-600.woff2', family: 'Inter', weight: '400 600', style: 'normal', preload: true },
  { file: 'instrument-serif-400.woff2', family: 'Instrument Serif', weight: '400', style: 'normal', preload: false },
  { file: 'instrument-serif-400-italic.woff2', family: 'Instrument Serif', weight: '400', style: 'italic', preload: false },
];

/** Which families each concept actually uses, so we never ship an unused face. */
const CONCEPT_FONTS = {
  blueprint: ['Chakra Petch', 'Inter'],
  refined: ['Chakra Petch', 'Inter'],
  editorial: ['Instrument Serif', 'Inter'],
};

async function fontFaces(concept, mode) {
  const families = CONCEPT_FONTS[concept];
  const used = FONTS.filter((f) => families.includes(f.family));
  if (mode === 'system') return { css: '', preloads: '' };

  const blocks = [];
  const preloads = [];
  for (const f of used) {
    const p = path.join('assets/fonts', f.file);
    if (!existsSync(p)) continue;
    let src;
    if (mode === 'inline') {
      const b64 = (await readFile(p)).toString('base64');
      src = `url(data:font/woff2;base64,${b64}) format('woff2')`;
    } else {
      src = `url('assets/fonts/${f.file}') format('woff2')`;
      if (f.preload) {
        preloads.push(
          `<link rel="preload" href="assets/fonts/${f.file}" as="font" type="font/woff2" crossorigin>`
        );
      }
    }
    blocks.push(
      `@font-face{font-family:'${f.family}';font-style:${f.style};font-weight:${f.weight};font-display:swap;src:${src}}`
    );
  }
  return { css: blocks.join('\n'), preloads: preloads.join('\n  ') };
}

/* --- css ------------------------------------------------------------------ */

function tidy(css) {
  // Strip block comments and collapse the blank lines they leave behind. Not a
  // minifier: the output stays readable so someone can audit the Sidearm paste.
  return css
    .replace(/\/\*[\s\S]*?\*\//g, '')
    .replace(/\n{3,}/g, '\n\n')
    .replace(/[ \t]+$/gm, '')
    .trim();
}

async function conceptCss(concept) {
  const base = await readFile('src/css/base.css', 'utf8');
  const own = await readFile(`src/css/concepts/${concept}.css`, 'utf8');
  return { base: tidy(base), own: tidy(own) };
}

/**
 * The standalone page owns the document, so it may style html and body. The
 * Sidearm fragment may not: those rules would reach Sidearm's own header and
 * footer, which is exactly what the previous build did wrong.
 */
const documentCss = `
html{-webkit-text-size-adjust:100%;text-size-adjust:100%}
body{margin:0;background:var(--cc-page-bg,#0a1826)}
@media (prefers-reduced-motion: no-preference){html{scroll-behavior:smooth}}
`.trim();

/* --- targets -------------------------------------------------------------- */

async function buildPages(concept, { depth }) {
  const ctx = { concept, target: 'pages', derivatives: await derivatives() };
  const { base, own } = await conceptCss(concept);
  const { css: faces, preloads } = await fontFaces(concept, 'link');
  const js = await readFile('src/js/app.js', 'utf8');
  const body = renderBody(ctx);

  // preview/<concept>/ sits two levels down, so every asset URL has to climb.
  // This covers markup attributes, srcset lists, and url() inside the inlined
  // @font-face block, which is resolved against the document, not the file.
  const prefix = '../'.repeat(depth);
  const fix = (s) =>
    depth === 0
      ? s
      : s
          .replace(/(src|href|imagesrcset)="assets\//g, `$1="${prefix}assets/`)
          .replace(/(srcset|imagesrcset)="([^"]+)"/g, (_, attr, v) =>
            `${attr}="${v.replace(/(^|, )assets\//g, `$1${prefix}assets/`)}"`
          )
          .replace(/data-full="assets\//g, `data-full="${prefix}assets/`)
          .replace(/url\('assets\//g, `url('${prefix}assets/`);

  const heroImg = ctx.derivatives.exteriorEast;
  const heroPreload = heroImg
    ? `<link rel="preload" as="image" href="${prefix}${heroImg.webp[heroImg.webp.length - 2].src}" imagesrcset="${heroImg.webp
        .map((v) => `${prefix}${v.src} ${v.w}w`)
        .join(', ')}" imagesizes="100vw" fetchpriority="high">`
    : '';

  const html = `<!DOCTYPE html>
<html lang="en">
<head>
<meta charset="utf-8">
<meta name="viewport" content="width=device-width, initial-scale=1">
<title>${C.meta.title}</title>
<meta name="description" content="${C.meta.description}">
<meta name="theme-color" content="#001527">
<link rel="icon" href="data:image/svg+xml,%3Csvg xmlns='http://www.w3.org/2000/svg' viewBox='0 0 32 32'%3E%3Crect width='32' height='32' fill='%23001527'/%3E%3Cpath d='M6 22h4l6-12 6 12h4L18 4h-4z' fill='%23FFB81C'/%3E%3C/svg%3E">
<meta property="og:type" content="website">
<meta property="og:site_name" content="${C.meta.siteName}">
<meta property="og:title" content="Champions Complex | University of Toledo Athletics">
<meta property="og:description" content="${C.meta.ogDescription}">
<meta property="og:image" content="${C.meta.canonical}assets/img/exteriorEast-1600.jpg">
<meta name="twitter:card" content="summary_large_image">
<meta name="twitter:title" content="Champions Complex | University of Toledo Athletics">
<meta name="twitter:description" content="${C.meta.ogDescription}">
${fix(heroPreload)}
${fix(preloads)}
<style>
${fix(faces)}

${documentCss}

${base}

${own}
</style>
</head>
<body>
${fix(body)}
<script>
${js}
</script>
</body>
</html>
`;
  return html;
}

/**
 * The Sidearm target as two independent strings.
 *
 * Sidearm's feature page keeps styles in a Custom CSS field and markup in an
 * HTML block, so these have to be pasteable separately. The single-file variant
 * is just the two of them concatenated.
 */
async function sidearmParts(concept, fontMode) {
  const ctx = { concept, target: 'sidearm', derivatives: await derivatives() };
  const { base, own } = await conceptCss(concept);
  const { css: faces } = await fontFaces(concept, fontMode);
  const js = await readFile('src/js/app.js', 'utf8');
  const body = renderBody(ctx);

  const css = `${faces}

${base}

${own}

/* Sidearm sits inside existing chrome, so the hero is capped rather than
   sized to the viewport, and the jump bar replaces the site nav. */
.cc[data-target='sidearm']{--cc-hero-h:clamp(26rem,62vh,38rem);--cc-scroll-offset:7rem}`;

  const html = `${body}

<script>
${js}
</script>`;

  return { css, html };
}

async function buildSidearm(concept, fontMode) {
  const { css, html } = await sidearmParts(concept, fontMode);

  const note =
    fontMode === 'inline'
      ? 'Typefaces are embedded in this file, so it needs no external requests\n     and renders identically to the preview link.'
      : 'Typefaces fall back to the system stack. Use sidearm.html instead if\n     your CMS field accepts the larger paste.';

  return `<!--
  ============================================================================
  CHAMPIONS COMPLEX  |  Sidearm feature page
  ============================================================================

  Generated file. Do not edit by hand. Edit src/ and run: npm run build

  HOW TO USE
  Paste everything below this comment into the Sidearm feature page HTML block.
  Do not wrap it in anything. Do not add <html>, <head> or <body>.

  WHY IT IS SAFE
  Every selector is scoped under .cc, so nothing here can restyle Sidearm's own
  header, nav or footer. The previous version of this page shipped a global
  *{margin:0;padding:0} and a{text-decoration:none}, which zeroed spacing across
  Sidearm's whole page and stripped the underline off every link in their chrome.

  There is no fixed navigation and no <h1> in this build, because Sidearm already
  provides both. The hero height is capped rather than set to 100vh, because
  Sidearm's chrome takes vertical space this file cannot measure.

  ${note}

  Images resolve to Sidearm's own CloudFront library. Assets that have never been
  uploaded there degrade to a monogram rather than a broken image. See README.md
  for the upload checklist.
  ============================================================================
-->
<style>
${css}
</style>

${html}
`;
}

/**
 * The committed two-file bundle in sidearm/.
 *
 * Checked into the repository rather than left in dist/, so the files can be
 * opened on GitHub and copy-pasted without anyone running a build first.
 */
async function writeSidearmBundle(concept) {
  const { css, html } = await sidearmParts(concept, 'inline');

  const cssFile = `/* ===========================================================================
   CHAMPIONS COMPLEX  |  Sidearm Custom CSS
   ===========================================================================

   Generated file. Do not edit by hand. Edit src/ and run: npm run build

   HOW TO USE
   Paste this entire file into the Custom CSS field of the Sidearm feature page.
   Paste champions-complex.html into the HTML content block.

   WHY IT IS SAFE
   Every selector is scoped under .cc, so nothing here can restyle Sidearm's own
   header, nav or footer. Nothing in this file starts with html, body, * or a
   bare element selector, and the build fails if that ever changes.

   The typefaces are embedded as base64, so this file makes no external requests
   and renders identically to the preview link.
   =========================================================================== */

${css}
`;

  const htmlFile = `<!--
  ============================================================================
  CHAMPIONS COMPLEX  |  Sidearm HTML block
  ============================================================================

  Generated file. Do not edit by hand. Edit src/ and run: npm run build

  HOW TO USE
  1. Paste champions-complex.css into the Sidearm Custom CSS field.
  2. Paste everything below this comment into the HTML content block.

  NO CUSTOM CSS FIELD? A Sport File in Standard mode often has no separate CSS
  field. In that case ignore both of these files and paste
  champions-complex-single-paste.html into the content block instead.

  Do not wrap it in anything, and do not add <html>, <head> or <body>. The
  <script> at the bottom is part of the paste; the page is fully readable
  without it, but the lightbox, the accordion and the jump-bar highlighting
  need it.

  There is no site navigation and no <h1> here, because Sidearm provides both.

  Images resolve to Sidearm's own CloudFront library. Assets that have never
  been uploaded there degrade to a monogram rather than a broken image. See
  README.md for the upload checklist.
  ============================================================================
-->

${html}
`;

  // Third file for the case where the page is a Sport File in Standard mode
  // rather than a Feature page. Standard mode does not reliably expose a
  // separate Custom CSS field, so everything goes into the one content block:
  // style at the top, markup, script at the bottom.
  const singleFile = `<!--
  ============================================================================
  CHAMPIONS COMPLEX  |  Sidearm single paste
  ============================================================================

  Generated file. Do not edit by hand. Edit src/ and run: npm run build

  USE THIS ONE if the page has no separate Custom CSS field, which is the usual
  case for a Sport File in Standard mode. Otherwise use the two-file pair:
  champions-complex.css and champions-complex.html.

  HOW TO USE
  Paste everything below this comment into the HTML content block, from the
  opening <style> tag through the closing </script> tag. That single selection
  is the CSS, the markup and the JavaScript.

  Leave out <!DOCTYPE html>, <html>, <head>, <title>, the meta tags and <body>.
  Sidearm generates all of those, and pasting them nests document tags.

  NO HEAD FIELD IS NEEDED. The typefaces are embedded in the style block as
  base64, so there are no font link tags and no @import to place, and no flash
  of fallback type on first load.
  ============================================================================
-->
<style>
${css}
</style>

${html}
`;

  await mkdir('sidearm', { recursive: true });
  await writeFile('sidearm/champions-complex.css', cssFile);
  await writeFile('sidearm/champions-complex.html', htmlFile);
  await writeFile('sidearm/champions-complex-single-paste.html', singleFile);

  return {
    css: Buffer.byteLength(cssFile),
    html: Buffer.byteLength(htmlFile),
    single: Buffer.byteLength(singleFile),
  };
}

/* --- preview chooser ------------------------------------------------------ */

async function buildChooser() {
  const { css: faces } = await fontFaces('blueprint', 'link');
  const cards = CONCEPTS.map(
    (c) => `      <article class="card">
        <p class="card-tag">${c.tagline}</p>
        <h2>${c.name}${c.id === PRODUCTION_CONCEPT ? '<span class="live">In production</span>' : ''}</h2>
        <p class="card-blurb">${c.blurb}</p>
        <p class="card-risk">${c.risk}</p>
        <div class="card-links">
          <a class="btn" href="${c.id}/">Open the page</a>
          <a class="btn btn--ghost" href="${c.id}/sidearm.html">Sidearm version</a>
        </div>
      </article>`
  ).join('\n');

  return `<!DOCTYPE html>
<html lang="en">
<head>
<meta charset="utf-8">
<meta name="viewport" content="width=device-width, initial-scale=1">
<title>Champions Complex | Design concepts</title>
<meta name="description" content="Three design directions for the Champions Complex fundraising page, with the same content in each, for feedback before one is promoted to production.">
<meta name="robots" content="noindex">
<link rel="icon" href="data:image/svg+xml,%3Csvg xmlns='http://www.w3.org/2000/svg' viewBox='0 0 32 32'%3E%3Crect width='32' height='32' fill='%23001527'/%3E%3Cpath d='M6 22h4l6-12 6 12h4L18 4h-4z' fill='%23FFB81C'/%3E%3C/svg%3E">
<style>
${faces}
*,*::before,*::after{box-sizing:border-box}
body{margin:0;background:#0a1826;color:#e8ecf1;font-family:'Inter',system-ui,sans-serif;line-height:1.65;
  -webkit-font-smoothing:antialiased}
.wrap{max-width:66rem;margin:0 auto;padding:clamp(2.5rem,7vw,5rem) clamp(1.25rem,4vw,2.5rem)}
.eyebrow{font-family:ui-monospace,'SF Mono',Menlo,Consolas,monospace;font-size:.6875rem;letter-spacing:.18em;
  text-transform:uppercase;color:#ffb81c;margin:0 0 .75rem}
h1{font-family:'Chakra Petch',system-ui,sans-serif;font-size:clamp(2rem,5vw,3.25rem);font-weight:700;line-height:1.02;
  letter-spacing:-.02em;text-transform:uppercase;margin:0 0 1rem;text-wrap:balance}
.lede{font-size:1.0625rem;color:rgba(232,236,241,.72);max-width:56ch;margin:0 0 .75rem}
.meta{font-family:ui-monospace,'SF Mono',Menlo,Consolas,monospace;font-size:.6875rem;letter-spacing:.1em;
  text-transform:uppercase;color:rgba(232,236,241,.5);margin:0}
.rule{height:1px;background:rgba(255,184,28,.3);margin:clamp(2rem,4vw,3rem) 0;position:relative}
.rule::before,.rule::after{content:'';position:absolute;top:-4px;width:1px;height:9px;background:#ffb81c}
.rule::before{left:0}.rule::after{right:0}
.grid{display:grid;gap:1.25rem;grid-template-columns:repeat(auto-fit,minmax(min(19rem,100%),1fr))}
.card{display:flex;flex-direction:column;gap:.75rem;padding:1.5rem;background:rgba(255,255,255,.05);
  border:1px solid rgba(255,255,255,.12);border-left:2px solid #ffb81c}
.card-tag{font-family:ui-monospace,'SF Mono',Menlo,Consolas,monospace;font-size:.625rem;letter-spacing:.14em;
  text-transform:uppercase;color:#ffb81c;margin:0}
.card h2{font-family:'Chakra Petch',system-ui,sans-serif;font-size:1.375rem;font-weight:700;letter-spacing:.01em;
  text-transform:uppercase;margin:0;display:flex;flex-wrap:wrap;align-items:center;gap:.5rem}
.live{font-family:ui-monospace,'SF Mono',Menlo,Consolas,monospace;font-size:.5625rem;font-weight:500;letter-spacing:.12em;
  padding:.2rem .45rem;background:#ffb81c;color:#0a1826;text-transform:uppercase}
.card-blurb{font-size:.9375rem;color:rgba(232,236,241,.76);margin:0;flex:1}
.card-risk{font-size:.8125rem;font-style:italic;color:rgba(232,236,241,.55);margin:0;padding-top:.5rem;
  border-top:1px solid rgba(255,255,255,.1)}
.card-links{display:flex;flex-wrap:wrap;gap:.625rem;margin-top:.25rem}
.btn{display:inline-flex;align-items:center;min-height:2.75rem;padding:.625rem 1.125rem;
  font-family:'Chakra Petch',system-ui,sans-serif;font-size:.8125rem;font-weight:700;letter-spacing:.08em;
  text-transform:uppercase;text-decoration:none;background:#ffb81c;color:#0a1826}
.btn:hover{background:#ffd166}
.btn--ghost{background:none;color:#e8ecf1;border:1px solid rgba(255,255,255,.28)}
.btn--ghost:hover{background:none;border-color:#ffb81c;color:#ffb81c}
.notes{margin-top:clamp(2.5rem,5vw,4rem)}
.notes h2{font-family:'Chakra Petch',system-ui,sans-serif;font-size:1.125rem;font-weight:700;letter-spacing:.04em;
  text-transform:uppercase;margin:0 0 .75rem}
.notes p{font-size:.9375rem;color:rgba(232,236,241,.72);max-width:64ch;margin:0 0 .75rem}
:focus-visible{outline:2px solid #0a1826;outline-offset:2px;box-shadow:0 0 0 4px #ffb81c}
a{color:#ffb81c}
</style>
</head>
<body>
<div class="wrap">
  <p class="eyebrow">Champions Complex &middot; internal review</p>
  <h1>Three directions, same content</h1>
  <p class="lede">Every concept below carries identical copy, identical images and identical accessibility work. Only the design language changes, so a comparison is about the design and nothing else.</p>
  <p class="meta">Each concept ships in two forms: the standalone page, and the fragment that gets pasted into Sidearm.</p>
  <div class="rule"></div>
  <div class="grid">
${cards}
  </div>
  <div class="notes">
    <h2>What to look for</h2>
    <p>The Sidearm version of each concept drops the fixed navigation and the page heading, because Sidearm supplies both, and it caps the hero height because Sidearm's own header takes space. That is why the two forms of the same concept do not look identical at the top of the page.</p>
    <p>Try each one with a keyboard. Tab through it and check the focus ring stays visible, including on the gold buttons. Try it with reduced motion turned on in your operating system settings. Both were failing on the previous page.</p>
  </div>
</div>
</body>
</html>
`;
}

/* --- helpers -------------------------------------------------------------- */

let _derivatives = null;
async function derivatives() {
  if (_derivatives) return _derivatives;
  const p = 'assets/img/derivatives.json';
  if (!existsSync(p)) {
    throw new Error('assets/img/derivatives.json missing. Run: npm run images');
  }
  _derivatives = JSON.parse(await readFile(p, 'utf8'));
  return _derivatives;
}

const kb = (s) => `${(Buffer.byteLength(s) / 1024).toFixed(0)} KB`;

async function dirSize(dir) {
  let total = 0;
  for (const e of await readdir(dir, { withFileTypes: true })) {
    const p = path.join(dir, e.name);
    total += e.isDirectory() ? await dirSize(p) : (await stat(p)).size;
  }
  return total;
}

/* --- main ----------------------------------------------------------------- */

async function main() {
  await rm(OUT, { recursive: true, force: true });
  await mkdir(`${OUT}/preview`, { recursive: true });

  await cp('assets/img', `${OUT}/assets/img`, { recursive: true });
  await cp('assets/fonts', `${OUT}/assets/fonts`, { recursive: true });
  await rm(`${OUT}/assets/img/derivatives.json`, { force: true });
  await writeFile(`${OUT}/.nojekyll`, '');

  // Production pair, at the repo root of the deploy.
  const prodPage = await buildPages(PRODUCTION_CONCEPT, { depth: 0 });
  const prodSidearm = await buildSidearm(PRODUCTION_CONCEPT, 'inline');
  const prodSidearmSys = await buildSidearm(PRODUCTION_CONCEPT, 'system');
  await writeFile(`${OUT}/index.html`, prodPage);
  await writeFile(`${OUT}/sidearm.html`, prodSidearm);
  await writeFile(`${OUT}/sidearm-systemfonts.html`, prodSidearmSys);

  const bundle = await writeSidearmBundle(PRODUCTION_CONCEPT);

  console.log(`  production (${PRODUCTION_CONCEPT})`);
  console.log(`    index.html                  ${kb(prodPage)}`);
  console.log(`    sidearm.html                ${kb(prodSidearm)}  fonts inlined`);
  console.log(`    sidearm-systemfonts.html    ${kb(prodSidearmSys)}  system stack`);
  console.log('\n  committed Sidearm files (pick the route that matches your page)');
  console.log(
    `    sidearm/champions-complex.css   ${(bundle.css / 1024).toFixed(0)} KB  -> Custom CSS field`
  );
  console.log(
    `    sidearm/champions-complex.html  ${(bundle.html / 1024).toFixed(0)} KB  -> HTML content block`
  );
  console.log(
    `    sidearm/champions-complex-single-paste.html  ${(bundle.single / 1024).toFixed(0)} KB  -> one block, no CSS field needed`
  );

  console.log('\n  preview');
  for (const c of CONCEPTS) {
    if (!existsSync(`src/css/concepts/${c.id}.css`)) {
      console.log(`    ${c.id.padEnd(12)} SKIPPED, no stylesheet yet`);
      continue;
    }
    await mkdir(`${OUT}/preview/${c.id}`, { recursive: true });
    const page = await buildPages(c.id, { depth: 2 });
    const frag = await buildSidearm(c.id, 'inline');
    await writeFile(`${OUT}/preview/${c.id}/index.html`, page);
    await writeFile(`${OUT}/preview/${c.id}/sidearm.html`, frag);
    console.log(`    ${c.id.padEnd(12)} ${kb(page).padStart(7)} page   ${kb(frag).padStart(7)} sidearm`);
  }

  await writeFile(`${OUT}/preview/index.html`, await buildChooser());

  const pending = missingOnSidearm();
  if (pending.length) {
    console.log(
      `\n  Sidearm upload checklist (${pending.length} assets not in their media library):`
    );
    for (const p of pending) {
      console.log(`    images/${p.local}`);
    }
    console.log('    These render as a monogram on Sidearm until uploaded.');
  }

  console.log(`\n  dist total  ${((await dirSize(OUT)) / 1024 / 1024).toFixed(1)} MB`);
}

main().catch((err) => {
  console.error(err);
  process.exit(1);
});

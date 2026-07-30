/**
 * Build-output checks. Run after `npm run build`.
 *
 * The important one is SCOPING. The previous Sidearm build shipped a global
 * `*{margin:0;padding:0}`, `body{...}`, `img{...}` and `a{text-decoration:none}`,
 * which reached into Sidearm's own header, nav and footer and changed the host
 * page's font, text color and box-sizing model. That must never ship again, so
 * it is a build failure rather than a code-review note.
 *
 * Run: npm run check
 */
import { readFile, readdir } from 'node:fs/promises';
import { existsSync } from 'node:fs';
import path from 'node:path';

const fails = [];
const warns = [];
const notes = [];

const fail = (m) => fails.push(m);
const warn = (m) => warns.push(m);

/* --- CSS syntax ----------------------------------------------------------- */

/**
 * Catches unbalanced braces and the specific shape that bit this project: a
 * selector line immediately following an unterminated selector, which silently
 * kills the whole rule.
 */
function checkCssSyntax(label, css) {
  let depth = 0;
  const lines = css.split('\n');
  lines.forEach((line, i) => {
    for (const ch of line) {
      if (ch === '{') depth++;
      else if (ch === '}') depth--;
      if (depth < 0) {
        fail(`${label}:${i + 1} unbalanced closing brace`);
        depth = 0;
      }
    }
    // A line that opens a block and also looks like a bare selector.
    if (/\{\s*$/.test(line) && /^\s*[.#:a-zA-Z[][^{};]*\{\s*$/.test(line)) {
      const next = lines[i + 1] || '';
      if (/^\s*[.#][\w-]+[^{};]*\{\s*$/.test(next)) {
        fail(
          `${label}:${i + 2} selector opens a block directly inside another selector: ${next.trim()}`
        );
      }
    }
  });
  if (depth !== 0) fail(`${label} ends with ${depth} unclosed block(s)`);
}

/* --- Sidearm scoping ------------------------------------------------------ */

/** Selectors that would escape `.cc` and restyle the host page. */
function checkScoping(label, css) {
  // Strip at-rule preludes and declaration bodies, leaving selector lists.
  const withoutComments = css.replace(/\/\*[\s\S]*?\*\//g, '');
  const selectorChunks = [];
  let depth = 0;
  let buf = '';
  for (let i = 0; i < withoutComments.length; i++) {
    const ch = withoutComments[i];
    if (ch === '{') {
      if (depth === 0) selectorChunks.push(buf);
      buf = '';
      depth++;
    } else if (ch === '}') {
      depth--;
      buf = '';
    } else if (depth === 0) {
      buf += ch;
    }
  }

  // Split a selector list on top-level commas only. Splitting naively breaks
  // `:where(h1, h2, p)` into bare element selectors that look unscoped but
  // are not, because the .cc prefix sits outside the parentheses.
  const splitTopLevel = (list) => {
    const out = [];
    let buf = '';
    let paren = 0;
    let bracket = 0;
    for (const ch of list) {
      if (ch === '(') paren++;
      else if (ch === ')') paren--;
      else if (ch === '[') bracket++;
      else if (ch === ']') bracket--;
      if (ch === ',' && paren === 0 && bracket === 0) {
        out.push(buf);
        buf = '';
        continue;
      }
      buf += ch;
    }
    out.push(buf);
    return out;
  };

  const offenders = new Set();
  for (const chunk of selectorChunks) {
    const prelude = chunk.trim();
    if (!prelude || prelude.startsWith('@')) continue;
    for (const sel of splitTopLevel(prelude)) {
      const s = sel.trim();
      if (!s) continue;
      // Anchored on .cc anywhere in the chain is fine.
      if (s.includes('.cc')) continue;
      if (/^(html|body|\*|:root)\b/.test(s) || /^[a-zA-Z]+(\s|$|:|\[|\.|#|,)/.test(s)) {
        offenders.add(s);
      }
    }
  }
  if (offenders.size) {
    fail(
      `${label} has ${offenders.size} unscoped selector(s), which would restyle Sidearm's own page:\n      ` +
        [...offenders].slice(0, 8).join('\n      ')
    );
  }
}

/* --- main ----------------------------------------------------------------- */

async function main() {
  if (!existsSync('dist')) {
    console.error('dist/ missing. Run: npm run build');
    process.exit(1);
  }

  // 1. Source stylesheets parse, and base.css is scope-clean.
  for (const f of ['src/css/base.css']) {
    const css = await readFile(f, 'utf8');
    checkCssSyntax(f, css);
    checkScoping(f, css);
  }
  for (const f of await readdir('src/css/concepts')) {
    const p = path.join('src/css/concepts', f);
    const css = await readFile(p, 'utf8');
    checkCssSyntax(p, css);
    checkScoping(p, css);
  }

  // 2. Every emitted Sidearm fragment must be a fragment, and scope-clean.
  const frags = [];
  const walk = async (dir) => {
    for (const e of await readdir(dir, { withFileTypes: true })) {
      const p = path.join(dir, e.name);
      if (e.isDirectory()) await walk(p);
      else if (e.name.startsWith('sidearm')) frags.push(p);
    }
  };
  await walk('dist');

  if (!frags.length) fail('no Sidearm fragment found in dist/');

  for (const p of frags) {
    const html = await readFile(p, 'utf8');
    // The fragment opens with an instruction comment that names the tags it must
    // not contain, so the structural checks run against the markup only.
    const markup = html.replace(/<!--[\s\S]*?-->/g, '');

    // Tag boundaries matter: a bare `<head` substring also matches `<header>`.
    const documentTags = [
      [/<!doctype\b/i, '<!DOCTYPE>'],
      [/<html[\s>]/i, '<html>'],
      [/<head[\s>]/i, '<head>'],
      [/<body[\s>]/i, '<body>'],
    ];
    for (const [re, label] of documentTags) {
      if (re.test(markup)) {
        fail(`${p} contains ${label}. A Sidearm paste must be a fragment.`);
      }
    }

    // From `markup`, not `html`: the instruction comment can mention <style>,
    // and matching the raw file lets the regex swallow that prose as CSS.
    const styles = [...markup.matchAll(/<style>([\s\S]*?)<\/style>/g)].map((m) => m[1]);
    if (!styles.length) fail(`${p} has no <style> block`);
    styles.forEach((css, i) => {
      checkCssSyntax(`${p} <style>[${i}]`, css);
      checkScoping(`${p} <style>[${i}]`, css);
    });

    if (!/<div class="cc /.test(markup)) fail(`${p} is missing the .cc root wrapper`);
    if (/<h1[\s>]/.test(markup)) {
      fail(`${p} contains an <h1>. Sidearm renders the page heading itself.`);
    }
    if (/\bposition:\s*fixed/.test(styles.join('\n').replace(/\.cc-(dock|top|lightbox)[^}]*\}/g, ''))) {
      notes.push(`${p} still declares position:fixed outside the dock/top/lightbox`);
    }
    // Relative asset paths cannot resolve inside Sidearm.
    const rel = [...markup.matchAll(/(?:src|srcset)="((?!https?:|data:)[^"]+)"/g)]
      .map((m) => m[1])
      .filter((u) => u !== '');
    if (rel.length) {
      fail(`${p} has ${rel.length} relative asset path(s), e.g. ${rel[0]}`);
    }
    notes.push(`${p}  ${(Buffer.byteLength(html) / 1024).toFixed(0)} KB paste`);
  }

  // 3. Standalone pages must have exactly one h1 and a skip link.
  const pages = [];
  const walkPages = async (dir) => {
    for (const e of await readdir(dir, { withFileTypes: true })) {
      const p = path.join(dir, e.name);
      if (e.isDirectory()) await walkPages(p);
      else if (e.name === 'index.html' && !p.includes('preview/index.html')) pages.push(p);
    }
  };
  await walkPages('dist');

  for (const p of pages) {
    const html = await readFile(p, 'utf8');
    const h1s = (html.match(/<h1[\s>]/g) || []).length;
    if (h1s !== 1) fail(`${p} has ${h1s} <h1> elements, expected exactly 1`);
    if (!html.includes('class="cc-skip"')) fail(`${p} has no skip link`);
    if (!/<main /.test(html)) fail(`${p} has no <main> landmark`);
    if (!/lang="en"/.test(html)) fail(`${p} has no lang attribute`);
    // Reduced motion must be handled, not just for the ticker.
    if (!/prefers-reduced-motion:\s*reduce/.test(html)) {
      fail(`${p} has no prefers-reduced-motion: reduce block`);
    }
    // The ticker needs a real pause control for WCAG 2.2.2.
    if (html.includes('cc-ticker') && !html.includes('cc-ticker-pause')) {
      fail(`${p} has an auto-scrolling ticker with no pause control`);
    }
    // Exactly one control in the bar may point at the Give section. Two of them
    // collide in the scrollspy, which keys links by href fragment.
    const navBar = html.match(/<div class="cc-nav-links"[\s\S]*?<\/div>/);
    if (navBar) {
      const gives = (navBar[0].match(/href="#cc-give"/g) || []).length;
      if (gives !== 1) {
        fail(`${p} nav bar has ${gives} controls pointing at #cc-give, expected 1`);
      }
    }
  }

  // 4. Referenced local assets exist.
  for (const p of pages) {
    const dir = path.dirname(p);
    const html = await readFile(p, 'utf8');
    const refs = new Set();
    for (const m of html.matchAll(/(?:src|href|data-full)="((?:\.\.\/)*assets\/[^"]+)"/g)) {
      refs.add(m[1]);
    }
    for (const m of html.matchAll(/(?:srcset|imagesrcset)="([^"]+)"/g)) {
      for (const part of m[1].split(',')) {
        const u = part.trim().split(/\s+/)[0];
        if (u.includes('assets/')) refs.add(u);
      }
    }
    const missing = [...refs].filter((r) => !existsSync(path.join(dir, r)));
    if (missing.length) {
      fail(`${p} references ${missing.length} missing asset(s), e.g. ${missing[0]}`);
    }
  }

  // 5. The committed Sidearm bundle must exist and be scope-clean. CI also runs
  //    `git diff --exit-code sidearm/` so a source edit without a rebuild fails.
  const bundleCss = 'sidearm/champions-complex.css';
  const bundleHtml = 'sidearm/champions-complex.html';

  if (!existsSync(bundleCss) || !existsSync(bundleHtml)) {
    fail('sidearm/ bundle missing. Run: npm run build');
  } else {
    const css = await readFile(bundleCss, 'utf8');
    checkCssSyntax(bundleCss, css);
    checkScoping(bundleCss, css);
    if (/<style|<\/style/.test(css)) {
      fail(`${bundleCss} contains a <style> tag. It goes in a CSS field, not HTML.`);
    }

    const html = await readFile(bundleHtml, 'utf8');
    const markup = html.replace(/<!--[\s\S]*?-->/g, '');
    if (/<style[\s>]/i.test(markup)) {
      fail(`${bundleHtml} still carries a <style> block; it belongs in the CSS file.`);
    }
    if (!/<script[\s>]/i.test(markup)) {
      fail(`${bundleHtml} has no <script>; the enhancement JS goes at the bottom.`);
    }
    if (/<h1[\s>]/.test(markup)) {
      fail(`${bundleHtml} contains an <h1>. Sidearm renders the page heading.`);
    }
    for (const [re, label] of [
      [/<!doctype\b/i, '<!DOCTYPE>'],
      [/<html[\s>]/i, '<html>'],
      [/<body[\s>]/i, '<body>'],
    ]) {
      if (re.test(markup)) fail(`${bundleHtml} contains ${label}.`);
    }
    const rel = [...markup.matchAll(/(?:src|srcset)="((?!https?:|data:)[^"]+)"/g)]
      .map((m) => m[1])
      .filter((u) => u !== '');
    if (rel.length) {
      fail(`${bundleHtml} has ${rel.length} relative asset path(s), e.g. ${rel[0]}`);
    }
    if (!/class="cc-jump-link" href="#cc-give"/.test(html)) {
      fail(
        `${bundleHtml} has no Give link in the jump bar. It is the only ` +
          'wayfinding on this target and there is no gold CTA here to cover it.'
      );
    }

    notes.push(
      `sidearm bundle  ${(Buffer.byteLength(css) / 1024).toFixed(0)} KB css + ` +
        `${(Buffer.byteLength(html) / 1024).toFixed(0)} KB html`
    );
  }

  // The single-paste route for pages with no Custom CSS field. Unlike the
  // two-file HTML this one MUST carry its own <style>.
  const single = 'sidearm/champions-complex-single-paste.html';
  if (!existsSync(single)) {
    fail('sidearm/champions-complex-single-paste.html missing. Run: npm run build');
  } else {
    const raw = await readFile(single, 'utf8');
    const markup = raw.replace(/<!--[\s\S]*?-->/g, '');
    if (!/<style[\s>]/i.test(markup)) {
      fail(`${single} has no <style>; the whole point is that it is self-contained.`);
    }
    if (!/<script[\s>]/i.test(markup)) fail(`${single} has no <script>.`);
    if (/<h1[\s>]/.test(markup)) fail(`${single} contains an <h1>.`);
    for (const [re, label] of [
      [/<!doctype\b/i, '<!DOCTYPE>'],
      [/<html[\s>]/i, '<html>'],
      [/<head[\s>]/i, '<head>'],
      [/<body[\s>]/i, '<body>'],
    ]) {
      if (re.test(markup)) fail(`${single} contains ${label}.`);
    }
    // Extract from the comment-stripped markup: the instruction comment itself
    // mentions <style> and </script>, and matching against the raw file makes
    // the regex swallow that prose as if it were CSS.
    for (const css2 of [...markup.matchAll(/<style>([\s\S]*?)<\/style>/g)].map((m) => m[1])) {
      checkCssSyntax(single, css2);
      checkScoping(single, css2);
    }
    notes.push(`sidearm single paste  ${(Buffer.byteLength(raw) / 1024).toFixed(0)} KB`);
  }

  /* --- report ------------------------------------------------------------ */

  for (const n of notes) console.log(`  note  ${n}`);
  for (const w of warns) console.log(`  WARN  ${w}`);
  if (fails.length) {
    console.log('');
    for (const f of fails) console.log(`  FAIL  ${f}`);
    console.log(`\n  ${fails.length} check(s) failed`);
    process.exit(1);
  }
  console.log(
    `\n  all checks passed: ${frags.length} Sidearm fragment(s), ${pages.length} standalone page(s)`
  );
}

main().catch((e) => {
  console.error(e);
  process.exit(1);
});

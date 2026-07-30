/**
 * Proves the Sidearm fragment does not damage the host page.
 *
 * Builds a stand-in for a Sidearm feature page: a document with its own reset,
 * its own sticky header and navigation, its own <h1> page title, and its own
 * footer, styled with ordinary element selectors the way a CMS theme is. It
 * measures that chrome, injects the fragment exactly as someone would paste it,
 * and measures again. Nothing about the host may change.
 *
 * This is the regression test for a real production bug. Run against the old
 * build (recoverable with `git show 3ef9ad6^:champion.html`) this reports 34
 * changed properties on the host, including its body font, its text color and
 * the box-sizing model on every element. Run against the current output it
 * reports none.
 *
 * Usage: node scripts/sidearm-host.mjs [fragment-path ...]
 */
import { chromium } from 'playwright-core';
import { readFile, writeFile, mkdir } from 'node:fs/promises';
import { existsSync } from 'node:fs';
import path from 'node:path';

const frags = process.argv.slice(2).length
  ? process.argv.slice(2)
  : [
      'dist/sidearm.html',
      'dist/preview/blueprint/sidearm.html',
      'dist/preview/editorial/sidearm.html',
      'dist/preview/refined/sidearm.html',
    ];

/** A deliberately plain CMS theme, using the bare element selectors a host uses. */
const HOST_CSS = `
  * { box-sizing: content-box; }
  body { margin: 0; padding: 0; font-family: Georgia, serif; font-size: 17px;
         line-height: 1.5; color: #222; background: #fff; }
  header.site { position: sticky; top: 0; z-index: 9999; background: #123; padding: 18px 24px;
                display: flex; gap: 28px; align-items: center; }
  header.site a { color: #fff; text-decoration: underline; font-size: 15px; padding: 6px 0; }
  h1 { margin: 32px 24px 12px; font-size: 34px; line-height: 1.2; color: #123; }
  p.lede { margin: 0 24px 28px; font-size: 19px; }
  ul.crumbs { margin: 16px 24px; padding-left: 28px; list-style: disc; }
  ul.crumbs li { margin-bottom: 6px; }
  img.host-logo { width: 120px; height: 40px; display: inline-block; }
  footer.site { background: #eee; padding: 40px 24px; margin-top: 48px; }
  footer.site a { color: #123; text-decoration: underline; }
  a:focus-visible { outline: 3px solid #c00; outline-offset: 1px; }
`;

const HOST_SHELL = (body, extraCss = '') => `<!DOCTYPE html>
<html lang="en">
<head><meta charset="utf-8"><meta name="viewport" content="width=device-width,initial-scale=1">
<title>Sidearm host stand-in</title><style>${HOST_CSS}</style>${
  extraCss ? `\n<style>${extraCss}</style>` : ''
}</head>
<body>
<header class="site">
  <img class="host-logo" alt="host logo" src="data:image/svg+xml,%3Csvg xmlns='http://www.w3.org/2000/svg' width='120' height='40'%3E%3Crect width='120' height='40' fill='%23fff'/%3E%3C/svg%3E">
  <a href="#a">Sports</a><a href="#b">Tickets</a><a href="#c">Give</a><a href="#d">Shop</a>
</header>
<h1>Champions Complex</h1>
<p class="lede">This paragraph and the list below belong to the host page.</p>
<ul class="crumbs"><li>Host list item one</li><li>Host list item two</li></ul>
<div id="feature-block">${body}</div>
<footer class="site"><a href="#e">Host footer link</a></footer>
</body></html>`;

/** Everything the host must look identical before and after injection. */
const PROBE = `() => {
  const pick = (el, props) => {
    if (!el) return null;
    const cs = getComputedStyle(el);
    const out = {};
    for (const p of props) out[p] = cs[p];
    const r = el.getBoundingClientRect();
    out._box = [Math.round(r.width), Math.round(r.height), Math.round(r.top)];
    return out;
  };
  const TEXT = ['fontFamily','fontSize','lineHeight','color','textDecorationLine','letterSpacing','textTransform'];
  const BOX = ['marginTop','marginBottom','marginLeft','paddingTop','paddingBottom','paddingLeft','boxSizing','display','listStyleType','backgroundColor','position','zIndex'];
  const both = [...TEXT, ...BOX];
  return {
    body: pick(document.body, both),
    header: pick(document.querySelector('header.site'), both),
    headerLink: pick(document.querySelector('header.site a'), both),
    h1: pick(document.querySelector('h1'), both),
    lede: pick(document.querySelector('p.lede'), both),
    list: pick(document.querySelector('ul.crumbs'), both),
    listItem: pick(document.querySelector('ul.crumbs li'), both),
    logo: pick(document.querySelector('img.host-logo'), both),
    footer: pick(document.querySelector('footer.site'), both),
    footerLink: pick(document.querySelector('footer.site a'), both),
    scrollBehavior: getComputedStyle(document.documentElement).scrollBehavior,
    htmlFontSize: getComputedStyle(document.documentElement).fontSize,
  };
}`;

async function main() {
  await mkdir('.shots', { recursive: true });
  const browser = await chromium.launch({ executablePath: process.env.PW_CHROMIUM || '/opt/pw-browsers/chromium' });
  let failed = false;

  // Baseline: the host with nothing injected.
  const tmpDir = '.shots/host';
  await mkdir(tmpDir, { recursive: true });
  await writeFile(path.join(tmpDir, 'baseline.html'), HOST_SHELL(''));

  const ctx = await browser.newContext({ viewport: { width: 1280, height: 900 } });
  const basePage = await ctx.newPage();
  await basePage.goto('file://' + path.resolve(tmpDir, 'baseline.html'));
  const baseline = await basePage.evaluate(new Function('return ' + PROBE)());
  await basePage.close();

  // Host elements rendered before the injected block. These must not move at
  // all; everything after it obviously shifts down.
  const ABOVE_BLOCK = new Set(['header', 'headerLink', 'h1', 'lede', 'list', 'listItem', 'logo']);

  // The committed two-file bundle, loaded the way Sidearm loads it: CSS in a
  // Custom CSS field (so, in <head>) and markup in the content block.
  const BUNDLE = 'sidearm/champions-complex.css';
  const SINGLE = 'sidearm/champions-complex-single-paste.html';
  if (existsSync(BUNDLE)) frags.push('bundle');
  // The single-paste route carries its own <style>, so it goes through the same
  // path as the dist fragments.
  if (existsSync(SINGLE)) frags.push(SINGLE);

  for (const frag of frags) {
    const problems = [];
    let body;
    let extraCss = '';

    if (frag === 'bundle') {
      extraCss = await readFile(BUNDLE, 'utf8');
      const raw = await readFile('sidearm/champions-complex.html', 'utf8');
      body = raw.replace(/^<!--[\s\S]*?-->\s*/, '');
    } else {
      const raw = await readFile(frag, 'utf8');
      // Strip the instruction comment, exactly as a human copying "everything
      // below the comment" would.
      body = raw.replace(/^<!--[\s\S]*?-->\s*/, '');
    }

    const file = path.join(
      tmpDir,
      frag === 'bundle' ? 'bundle.html' : path.basename(path.dirname(frag)) + '-' + path.basename(frag)
    );
    await writeFile(file, HOST_SHELL(body, extraCss));

    const page = await ctx.newPage();
    const errors = [];
    page.on('pageerror', (e) => errors.push(String(e)));
    await page.goto('file://' + path.resolve(file), { waitUntil: 'load' });
    await page.evaluate(() => new Promise((r) => setTimeout(r, 400)));

    const after = await page.evaluate(new Function('return ' + PROBE)());

    for (const key of Object.keys(baseline)) {
      const a = baseline[key];
      const b = after[key];
      if (a === null || b === null) continue;
      if (typeof a !== 'object') {
        if (a !== b) problems.push(`host ${key} changed: ${a} -> ${b}`);
        continue;
      }
      for (const prop of Object.keys(a)) {
        if (prop === '_box') {
          // Width and height must never change for any host element. The top
          // offset legitimately moves for anything below the injected block, and
          // the body itself legitimately grows taller.
          const [aw, ah, at] = a[prop];
          const [bw, bh, bt] = b[prop];
          if (key !== 'body' && (aw !== bw || ah !== bh)) {
            problems.push(`host ${key} size changed: ${aw}x${ah} -> ${bw}x${bh}`);
          }
          if (ABOVE_BLOCK.has(key) && at !== bt) {
            problems.push(`host ${key} moved: top ${at} -> ${bt}`);
          }
          continue;
        }
        if (a[prop] !== b[prop]) {
          problems.push(`host ${key}.${prop} changed: ${a[prop]} -> ${b[prop]}`);
        }
      }
    }

    // The jump bar is the only wayfinding on this target, so it has to carry a
    // Give link and it has to track the current section. Both were broken:
    // Give was filtered out of the shared nav data, and the scrollspy was gated
    // on the standalone bar's class, which Sidearm never renders.
    const jump = await page.evaluate(async () => {
      const bar = document.querySelector('.cc-jump-inner');
      if (!bar) return { absent: true };
      const links = [...bar.querySelectorAll('.cc-jump-link')];
      const give = links.find((a) => a.getAttribute('href') === '#cc-give');
      const target = document.querySelector('#cc-progress');
      if (target) target.scrollIntoView();
      await new Promise((r) => setTimeout(r, 700));
      return {
        absent: false,
        count: links.length,
        hasGive: !!give,
        current: [...bar.querySelectorAll('[aria-current="true"]')].map((a) =>
          a.getAttribute('href')
        ),
      };
    });

    if (!jump.absent) {
      if (!jump.hasGive) problems.push('jump bar has no Give link');
      if (jump.count < 6) problems.push(`jump bar has only ${jump.count} links`);
      if (jump.current.length !== 1) {
        problems.push(
          `jump bar current-section state is ${jump.current.length} links, expected 1`
        );
      }
      await page.evaluate(() => window.scrollTo(0, 0));
    }

    // The host header must stay on top of the injected content.
    const stacking = await page.evaluate(() => {
      const hdr = document.querySelector('header.site');
      const r = hdr.getBoundingClientRect();
      const hit = document.elementFromPoint(r.left + r.width / 2, r.top + r.height / 2);
      return { covered: !hdr.contains(hit), by: hit ? (hit.className || hit.tagName).toString().slice(0, 40) : null };
    });
    if (stacking.covered) {
      problems.push(`injected content covers the host header (hit ${stacking.by})`);
    }

    // The fragment must not have introduced a second h1 or a page-level scroll lock.
    const structure = await page.evaluate(() => ({
      h1: document.querySelectorAll('h1').length,
      overflow: getComputedStyle(document.documentElement).overflow,
      bodyOverflowX: getComputedStyle(document.body).overflowX,
      docScrollW: document.documentElement.scrollWidth,
      winW: window.innerWidth,
      ccPresent: !!document.querySelector('.cc'),
      ccJs: !!document.querySelector('.cc.cc-js'),
      sections: document.querySelectorAll('.cc .cc-sec').length,
    }));
    if (structure.h1 !== 1) problems.push(`${structure.h1} <h1> in the host page, expected 1`);
    if (!structure.ccPresent) problems.push('fragment did not render');
    if (!structure.ccJs) problems.push('fragment JS did not run inside the host');
    if (structure.sections < 8) problems.push(`only ${structure.sections} sections rendered`);
    if (structure.docScrollW > structure.winW + 1) {
      problems.push(`host page scrolls sideways: ${structure.docScrollW} > ${structure.winW}`);
    }
    if (errors.length) problems.push(`JS errors: ${errors.join(' | ')}`);

    await page.screenshot({ path: file.replace('.html', '.png'), fullPage: false });
    await page.close();

    if (problems.length) {
      failed = true;
      console.log(`\n  ${frag}: ${problems.length} problem(s)`);
      for (const p of [...new Set(problems)].slice(0, 20)) console.log(`    ${p}`);
    } else {
      console.log(`  ok  ${frag}: host chrome untouched, fragment rendered and enhanced`);
    }
  }

  await ctx.close();
  await browser.close();
  if (failed) process.exitCode = 1;
}

main();

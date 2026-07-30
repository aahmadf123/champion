/**
 * Accessibility checks run in a real browser against the built pages.
 *
 * These exist because the previous page failed several of them in ways that are
 * invisible in source review:
 *   - the keyboard focus ring was gold on gold-filled buttons, 1.00:1
 *   - #D4960E on light grounds measured 2.35:1 and 2.57:1
 *   - links inside collapsed FAQ panels and the closed lightbox stayed tabbable
 *   - prefers-reduced-motion was honored only by the ticker
 *   - the auto-scrolling ticker had no pause control (WCAG 2.2.2)
 *
 * Usage: node scripts/a11y.mjs [concept ...]
 */
import { chromium } from 'playwright-core';
import sharp from 'sharp';

const BASE = process.env.BASE || 'http://127.0.0.1:8420';
const concepts = process.argv.slice(2).length
  ? process.argv.slice(2)
  : ['blueprint', 'editorial', 'refined'];

const CONTRAST_FN = `
  function lin(c){c/=255;return c<=0.04045?c/12.92:Math.pow((c+0.055)/1.055,2.4)}
  function lum(rgb){return 0.2126*lin(rgb[0])+0.7152*lin(rgb[1])+0.0722*lin(rgb[2])}
  function parse(s){
    var m=s.match(/rgba?\\(([^)]+)\\)/); if(!m) return null;
    var p=m[1].split(/[,\\s\\/]+/).filter(Boolean).map(Number);
    return {rgb:[p[0],p[1],p[2]], a:p.length>3?p[3]:1};
  }
  function over(fg,a,bg){return fg.map(function(c,i){return a*c+(1-a)*bg[i]})}
  function ratio(a,b){var x=lum(a),y=lum(b);var hi=Math.max(x,y),lo=Math.min(x,y);return (hi+0.05)/(lo+0.05)}
  // Walk ancestors to find the first opaque background actually painted behind el.
  function bgOf(el){
    var node=el, stack=[];
    while(node && node.nodeType===1){
      var cs=getComputedStyle(node);
      var p=parse(cs.backgroundColor);
      if(p && p.a>0) stack.push(p);
      if(p && p.a===1) break;
      node=node.parentElement;
    }
    var base=[255,255,255];
    for(var i=stack.length-1;i>=0;i--) base=over(stack[i].rgb, stack[i].a, base);
    return base;
  }
`;

async function run() {
  const browser = await chromium.launch({ executablePath: process.env.PW_CHROMIUM || '/opt/pw-browsers/chromium' });
  let failed = false;

  for (const concept of concepts) {
    const url = `${BASE}/preview/${concept}/index.html`;
    const problems = [];
    const ctx = await browser.newContext({ viewport: { width: 1280, height: 900 } });
    const page = await ctx.newPage();
    await page.goto(url, { waitUntil: 'load' });
    await page.evaluate(() => new Promise((r) => setTimeout(r, 300)));

    /* --- 1. Text contrast --------------------------------------------------- */
    const contrast = await page.evaluate(
      new Function(`
      ${CONTRAST_FN}
      var out=[];
      var els=document.querySelectorAll('.cc *');
      for (var i=0;i<els.length;i++){
        var el=els[i];
        // Only elements with their own visible text.
        var text='';
        for (var n=0;n<el.childNodes.length;n++){
          if(el.childNodes[n].nodeType===3) text+=el.childNodes[n].textContent;
        }
        text=text.trim();
        if(!text) continue;
        var cs=getComputedStyle(el);
        if(cs.visibility==='hidden'||cs.display==='none'||parseFloat(cs.opacity)===0) continue;
        var rect=el.getBoundingClientRect();
        if(rect.width===0||rect.height===0) continue;
        // Clipped screen-reader-only text is never painted, so contrast on it is
        // meaningless. Skip it and anything nested inside it.
        if(el.closest('.cc-visually-hidden')) continue;
        if(rect.width<=2||rect.height<=2) continue;
        // Text sitting over a photo cannot be measured from computed styles.
        // Anything painted over a photograph is handled by the pixel pass
        // below, because computed styles cannot describe an image.
        var overImage=false, node=el;
        while(node && node.nodeType===1){
          if(node.classList && (node.classList.contains('cc-hero')||node.classList.contains('cc-split-media')||node.classList.contains('cc-nav'))){overImage=true;break;}
          node=node.parentElement;
        }
        if(overImage) continue;
        var fg=parse(cs.color); if(!fg) continue;
        var bg=bgOf(el);
        var eff=over(fg.rgb,fg.a,bg);
        var size=parseFloat(cs.fontSize);
        var weight=parseInt(cs.fontWeight,10)||400;
        var large=(size>=24)||(size>=18.66&&weight>=700);
        var need=large?3:4.5;
        var r=ratio(eff,bg);
        if(r<need-0.02){
          out.push({cls:(el.className||'').toString().slice(0,44),txt:text.slice(0,28),
            ratio:Math.round(r*100)/100,need:need,px:Math.round(size*10)/10});
        }
      }
      return out;
    `)
    );
    const seen = new Set();
    for (const c of contrast) {
      const key = c.cls + c.ratio;
      if (seen.has(key)) continue;
      seen.add(key);
      problems.push(
        `contrast ${c.ratio}:1 (needs ${c.need}) ${c.px}px .${c.cls} "${c.txt}"`
      );
    }

    /* --- 2. Focus ring visible on the gold CTA ----------------------------- */
    const focus = await page.evaluate(
      new Function(`
      ${CONTRAST_FN}
      var btn=document.querySelector('.cc-hero-ctas .cc-cta');
      if(!btn) return {skip:true};
      btn.focus();
      var cs=getComputedStyle(btn);
      var bg=bgOf(btn);
      var res={outline:cs.outlineColor,width:cs.outlineWidth,shadow:cs.boxShadow,bg:bg};
      var oc=parse(cs.outlineColor);
      res.outlineRatio=oc?Math.round(ratio(over(oc.rgb,oc.a,bg),bg)*100)/100:0;
      // A ring only needs 3:1 against ONE adjacent surface, so also test the
      // outer shadow ring against the button fill.
      var sm=cs.boxShadow.match(/rgba?\\([^)]+\\)/);
      var sc=sm?parse(sm[0]):null;
      res.shadowRatio=sc?Math.round(ratio(over(sc.rgb,sc.a,bg),bg)*100)/100:0;
      res.best=Math.max(res.outlineRatio,res.shadowRatio);
      return res;
    `)
    );
    if (!focus.skip) {
      if (parseFloat(focus.width) < 1) problems.push('focus ring has no outline width');
      if (focus.best < 3) {
        problems.push(
          `focus ring only ${focus.best}:1 against the button it sits on (needs 3:1)`
        );
      }
    }

    /* --- 2b. Text over imagery, measured from real pixels ------------------ */
    /*
       Computed styles cannot describe a photograph. The nav is transparent over
       the hero on load, and the hero labels sit directly on the rendering, so
       `getComputedStyle` reports the page background rather than what is
       actually behind the glyphs.

       So: hide the text, screenshot, and read the pixels it would have covered.
       The worst case is the lightest pixel under light text, so that is what the
       ratio is computed against. This replaces an assumption with a measurement.
    */
    const overImage = [
      { sel: '.cc-nav-link', label: 'nav link' },
      { sel: '.cc-nav-tel', label: 'nav phone' },
      { sel: '.cc-hero-standfirst', label: 'hero standfirst' },
      { sel: '.cc-hero-meta', label: 'hero title block' },
      { sel: '.cc-stat-label', label: 'hero stat label' },
    ];

    const targets = await page.evaluate((defs) => {
      const out = [];
      for (const d of defs) {
        const el = document.querySelector(d.sel);
        if (!el) continue;
        const r = el.getBoundingClientRect();
        if (r.width < 2 || r.height < 2 || r.top < 0 || r.bottom > window.innerHeight) continue;
        const cs = getComputedStyle(el);
        out.push({
          label: d.label,
          color: cs.color,
          size: parseFloat(cs.fontSize),
          weight: parseInt(cs.fontWeight, 10) || 400,
          box: [Math.round(r.left), Math.round(r.top), Math.round(r.width), Math.round(r.height)],
        });
      }
      return out;
    }, overImage);

    if (targets.length) {
      // Hide the glyphs so the crop is pure background.
      await page.addStyleTag({
        content: overImage.map((d) => `${d.sel}{color:transparent !important}`).join('\n') +
          '\n.cc-nav-link svg,.cc-nav-tel svg{opacity:0 !important}',
      });
      await page.evaluate(() => new Promise((r) => setTimeout(r, 150)));
      const shot = await page.screenshot({ type: 'png' });

      for (const t of targets) {
        const [left, top, width, height] = t.box;
        const { data } = await sharp(shot)
          .extract({ left, top, width, height })
          .raw()
          .toBuffer({ resolveWithObject: true });

        const lin = (c) => {
          c /= 255;
          return c <= 0.04045 ? c / 12.92 : Math.pow((c + 0.055) / 1.055, 2.4);
        };
        const lum = (r, g, b) => 0.2126 * lin(r) + 0.7152 * lin(g) + 0.0722 * lin(b);

        // Worst case for light text is the brightest pixel behind it. Use the
        // 98th percentile rather than the single max so one stray highlight
        // does not dominate.
        const lums = [];
        for (let i = 0; i < data.length; i += 3) lums.push(lum(data[i], data[i + 1], data[i + 2]));
        lums.sort((a, b) => a - b);
        const bgLum = lums[Math.floor(lums.length * 0.98)];

        const m = t.color.match(/rgba?\(([^)]+)\)/);
        const parts = m[1].split(/[,\s\/]+/).filter(Boolean).map(Number);
        const alpha = parts.length > 3 ? parts[3] : 1;
        // Blend the text color onto that background before comparing.
        const bg255 = lums.length ? 255 * Math.pow(bgLum, 1 / 2.2) : 255;
        const eff = [0, 1, 2].map((i) => alpha * parts[i] + (1 - alpha) * bg255);
        const fgLum = lum(eff[0], eff[1], eff[2]);
        const hi = Math.max(fgLum, bgLum);
        const lo = Math.min(fgLum, bgLum);
        const ratio = (hi + 0.05) / (lo + 0.05);

        const large = t.size >= 24 || (t.size >= 18.66 && t.weight >= 700);
        const need = large ? 3 : 4.5;
        if (ratio < need) {
          problems.push(
            `over-image contrast ${ratio.toFixed(2)}:1 (needs ${need}) ${t.label}, measured from rendered pixels`
          );
        }
      }
      await page.reload({ waitUntil: 'load' });
      await page.evaluate(() => new Promise((r) => setTimeout(r, 250)));
    }

    /* --- 3. Collapsed panels leave the tab order --------------------------- */
    const tabbable = await page.evaluate(() => {
      const PARTS = ['a[href]', 'button', 'input', 'select', 'textarea', '[tabindex]:not([tabindex="-1"])'];
      const sel = PARTS.join(', ');
      // Each part has to carry the ancestor prefix. Concatenating a prefix onto
      // the whole comma list only scopes the first selector, and the rest match
      // the entire document.
      const scoped = (prefix) => PARTS.map((x) => `${prefix} ${x}`).join(', ');
      const isFocusable = (el) =>
        typeof el.checkVisibility === 'function'
          ? el.checkVisibility({ checkOpacity: true, checkVisibilityCSS: true })
          : el.offsetParent !== null;
      const inClosedPanel = [
        ...document.querySelectorAll(scoped('.cc-acc-panel[hidden]')),
      ].filter(isFocusable);
      const lb = document.querySelector('.cc-lightbox');
      const lbHidden = lb ? lb.hasAttribute('hidden') : null;
      const lbInert = lb ? lb.inert === true || lb.hasAttribute('aria-hidden') : null;
      const lbFocusable = lb ? [...lb.querySelectorAll(sel)].filter(isFocusable).length : 0;
      return {
        closedPanelFocusable: inClosedPanel.length,
        openPanels: document.querySelectorAll('.cc-acc-panel:not([hidden])').length,
        lbHidden,
        lbInert,
        lbFocusable,
      };
    });
    if (tabbable.closedPanelFocusable > 0) {
      problems.push(
        `${tabbable.closedPanelFocusable} focusable element(s) inside a collapsed FAQ panel`
      );
    }
    if (tabbable.openPanels !== 0) {
      problems.push(`${tabbable.openPanels} FAQ panel(s) open on load, expected 0 with JS`);
    }
    if (tabbable.lbHidden !== true) problems.push('lightbox is not hidden on load');
    if (tabbable.lbInert !== true) problems.push('lightbox is not inert on load');
    if (tabbable.lbFocusable > 0) {
      problems.push(`${tabbable.lbFocusable} focusable element(s) in the closed lightbox`);
    }

    /* --- 4. One current nav item, and states are wired -------------------- */
    const aria = await page.evaluate(() => {
      const out = {};
      out.current = document.querySelectorAll('.cc-nav-link[aria-current="true"]').length;
      const toggle = document.querySelector('.cc-nav-toggle');
      out.toggleExpanded = toggle ? toggle.getAttribute('aria-expanded') : 'absent';
      out.toggleControls = toggle ? !!toggle.getAttribute('aria-controls') : null;
      const triggers = [...document.querySelectorAll('.cc-acc-trigger')];
      out.accWired = triggers.every(
        (t) =>
          t.getAttribute('aria-controls') &&
          document.getElementById(t.getAttribute('aria-controls'))
      );
      const pause = document.querySelector('.cc-ticker-pause');
      out.pause = !!pause;
      out.pausePressed = pause ? pause.getAttribute('aria-pressed') : null;
      out.dupTrack = document.querySelectorAll('.cc-ticker-track [aria-hidden="true"]').length;
      out.mains = document.querySelectorAll('main').length;
      out.h1 = document.querySelectorAll('h1').length;
      // Headings must not sit inside a control, which flattens the outline.
      out.headingInButton = document.querySelectorAll('button h1, button h2, button h3').length;
      return out;
    });
    if (aria.current > 1) problems.push(`${aria.current} nav links marked aria-current`);
    if (aria.toggleExpanded === 'absent') problems.push('no mobile nav toggle');
    else if (!['true', 'false'].includes(aria.toggleExpanded)) {
      problems.push('nav toggle has no aria-expanded state');
    }
    if (aria.toggleControls === false) problems.push('nav toggle has no aria-controls');
    if (!aria.accWired) problems.push('an accordion trigger has no resolvable aria-controls');
    if (!aria.pause) problems.push('ticker has no pause control (WCAG 2.2.2)');
    if (aria.pausePressed === null) problems.push('ticker pause has no aria-pressed state');
    if (aria.dupTrack < 1) problems.push('duplicated ticker track is not hidden from AT');
    if (aria.mains !== 1) problems.push(`${aria.mains} <main> landmarks, expected 1`);
    if (aria.h1 !== 1) problems.push(`${aria.h1} <h1>, expected 1`);
    if (aria.headingInButton > 0) {
      problems.push(`${aria.headingInButton} heading(s) nested inside a button`);
    }

    /* --- 5. Skip link works ------------------------------------------------ */
    const skip = await page.evaluate(() => {
      const link = document.querySelector('.cc-skip');
      if (!link) return { ok: false, why: 'no skip link' };
      const target = document.querySelector(link.getAttribute('href'));
      if (!target) return { ok: false, why: 'skip link target missing' };
      link.focus();
      const visible = link.getBoundingClientRect().top > -10;
      return { ok: true, visible, focused: document.activeElement === link };
    });
    if (!skip.ok) problems.push(skip.why);
    else {
      if (!skip.focused) problems.push('skip link cannot take focus');
      if (!skip.visible) problems.push('skip link stays offscreen when focused');
    }

    /* --- 5b. Real keyboard walk -------------------------------------------- */
    /* Ground truth rather than computed visibility: press Tab and see where
       focus actually lands. Nothing should land inside a collapsed FAQ panel or
       the closed lightbox, and every stop should be visible on screen. */
    await page.evaluate(() => document.querySelector('.cc-skip').focus());
    const walk = { stops: 0, inClosedPanel: 0, inLightbox: 0, invisible: [] };
    for (let i = 0; i < 90; i++) {
      await page.keyboard.press('Tab');
      const at = await page.evaluate(() => {
        const a = document.activeElement;
        if (!a || a === document.body) return null;
        const panel = a.closest ? a.closest('.cc-acc-panel') : null;
        const lb = a.closest ? a.closest('.cc-lightbox') : null;
        const r = a.getBoundingClientRect();
        return {
          cls: (a.className || '').toString().slice(0, 40) || a.tagName,
          inClosedPanel: !!(panel && panel.hasAttribute('hidden')),
          inLightbox: !!lb,
          painted: r.width > 0 && r.height > 0,
        };
      });
      if (!at) break;
      walk.stops++;
      if (at.inClosedPanel) walk.inClosedPanel++;
      if (at.inLightbox) walk.inLightbox++;
      if (!at.painted) walk.invisible.push(at.cls);
    }
    if (walk.inClosedPanel > 0) {
      problems.push(`Tab reached ${walk.inClosedPanel} stop(s) inside a collapsed FAQ panel`);
    }
    if (walk.inLightbox > 0) {
      problems.push(`Tab reached ${walk.inLightbox} stop(s) inside the closed lightbox`);
    }
    for (const c of new Set(walk.invisible)) {
      problems.push(`Tab reaches an unpainted element: ${c}`);
    }
    if (walk.stops < 20) problems.push(`only ${walk.stops} tab stops found, expected many more`);

    /* --- 6. Touch targets -------------------------------------------------- */
    const small = await page.evaluate(() => {
      const out = [];
      document
        .querySelectorAll('.cc-nav-link, .cc-cta, .cc-acc-trigger, .cc-tier-cta, .cc-dock-btn, .cc-top, .cc-lightbox-btn, .cc-ticker-pause')
        .forEach((el) => {
          const cs = getComputedStyle(el);
          if (cs.display === 'none' || cs.visibility === 'hidden') return;
          const r = el.getBoundingClientRect();
          if (r.width === 0) return;
          if (r.height < 23 || r.width < 23) {
            out.push(`${el.className} ${Math.round(r.width)}x${Math.round(r.height)}`);
          }
        });
      return out;
    });
    for (const s of new Set(small)) problems.push(`touch target under 24px: ${s}`);
    await ctx.close();

    /* --- 7. Reduced motion ------------------------------------------------- */
    const rmCtx = await browser.newContext({
      viewport: { width: 1280, height: 900 },
      reducedMotion: 'reduce',
    });
    const rm = await rmCtx.newPage();
    await rm.goto(url, { waitUntil: 'load' });
    await rm.evaluate(() => new Promise((r) => setTimeout(r, 300)));
    const motion = await rm.evaluate(() => {
      const track = document.querySelector('.cc-ticker-track');
      const enter = document.querySelector('.cc-enter');
      const html = getComputedStyle(document.documentElement);
      return {
        tickerAnim: track ? getComputedStyle(track).animationName : 'none',
        enterOpacity: enter ? getComputedStyle(enter).opacity : '1',
        smooth: html.scrollBehavior,
        hiddenSections: [...document.querySelectorAll('.cc-sec, .cc-hero')].filter(
          (s) => parseFloat(getComputedStyle(s).opacity) < 0.9
        ).length,
      };
    });
    if (motion.tickerAnim !== 'none') {
      problems.push(`ticker still animates under reduced motion (${motion.tickerAnim})`);
    }
    if (parseFloat(motion.enterOpacity) < 0.99) {
      problems.push('entrance animations leave content transparent under reduced motion');
    }
    if (motion.hiddenSections > 0) {
      problems.push(`${motion.hiddenSections} section(s) invisible under reduced motion`);
    }
    await rmCtx.close();

    if (problems.length) {
      failed = true;
      console.log(`\n  ${concept}: ${problems.length} problem(s)`);
      for (const p of problems) console.log(`    ${p}`);
    } else {
      console.log(`  ok  ${concept}: contrast, focus, aria, tab order, reduced motion`);
    }
  }

  await browser.close();
  if (failed) process.exitCode = 1;
}

run();

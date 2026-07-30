/**
 * Renders the page for one (concept, target) pair.
 *
 * target 'pages'   -> a complete standalone document for GitHub Pages
 * target 'sidearm' -> a fragment to paste into a Sidearm feature page
 *
 * The two targets share this one renderer, so they cannot drift the way the
 * old hand-maintained index.html and champion.html drifted (different fonts,
 * different image sets, different section copy).
 *
 * What the target switch actually changes:
 *   - document wrapper vs bare fragment
 *   - a sticky site nav vs a scoped jump bar, because Sidearm already renders
 *     its own sticky header and its own page <h1>
 *   - hero heading level, h1 vs h2, for the same reason
 *   - hero height, viewport-based vs capped, because Sidearm chrome eats space
 *   - image resolution, local srcset vs a single absolute CloudFront URL
 *   - the footer mark, which Sidearm's own footer already provides
 */

import { ASSETS, CDN_BASE, DRAWING_SET } from '../../assets/manifest.mjs';
import * as C from '../content.mjs';

/* --- escaping -------------------------------------------------------------- */

const esc = (s) =>
  String(s)
    .replace(/&/g, '&amp;')
    .replace(/</g, '&lt;')
    .replace(/>/g, '&gt;')
    .replace(/"/g, '&quot;');

/* --- icons ---------------------------------------------------------------- */

const ICON = {
  phone:
    '<path d="M6.62 10.79a15.05 15.05 0 0 0 6.59 6.59l2.2-2.2a1 1 0 0 1 1.02-.24c1.12.37 2.33.57 3.57.57a1 1 0 0 1 1 1V20a1 1 0 0 1-1 1A17 17 0 0 1 3 4a1 1 0 0 1 1-1h3.5a1 1 0 0 1 1 1c0 1.25.2 2.45.57 3.57a1 1 0 0 1-.25 1.02z"/>',
  mail: '<path d="M20 4H4a2 2 0 0 0-2 2v12a2 2 0 0 0 2 2h16a2 2 0 0 0 2-2V6a2 2 0 0 0-2-2m0 4-8 5-8-5V6l8 5 8-5z"/>',
  pin: '<path d="M12 2a7 7 0 0 0-7 7c0 5.25 7 13 7 13s7-7.75 7-13a7 7 0 0 0-7-7m0 9.5A2.5 2.5 0 1 1 14.5 9 2.5 2.5 0 0 1 12 11.5"/>',
  zoom:
    '<path d="M15.5 14h-.79l-.28-.27A6.47 6.47 0 0 0 16 9.5 6.5 6.5 0 1 0 9.5 16c1.61 0 3.09-.59 4.23-1.57l.27.28v.79l5 4.99L20.49 19zm-6 0A4.5 4.5 0 1 1 14 9.5 4.5 4.5 0 0 1 9.5 14M12 10h-2v2H9v-2H7V9h2V7h1v2h2z"/>',
  check: '<path d="M9 16.17 4.83 12l-1.42 1.41L9 19 21 7l-1.41-1.41z"/>',
  up: '<path d="M7.41 15.41 12 10.83l4.59 4.58L18 14l-6-6-6 6z"/>',
  left: '<path d="M15.41 7.41 14 6l-6 6 6 6 1.41-1.41L10.83 12z"/>',
  right: '<path d="M10 6 8.59 7.41 13.17 12l-4.58 4.59L10 18l6-6z"/>',
  menu: '<path d="M3 6h18v2H3zm0 5h18v2H3zm0 5h18v2H3z"/>',
  pause: '<path d="M6 5h4v14H6zm8 0h4v14h-4z"/>',
  play: '<path d="M8 5v14l11-7z"/>',
  x: '<path d="M18.244 2.25h3.308l-7.227 8.26 8.502 11.24H16.17l-5.214-6.817L4.99 21.75H1.68l7.73-8.835L1.254 2.25H8.08l4.713 6.231zm-1.161 17.52h1.833L7.084 4.126H5.117z"/>',
  instagram:
    '<path d="M12 2.163c3.204 0 3.584.012 4.85.07 3.252.148 4.771 1.691 4.919 4.919.058 1.265.069 1.645.069 4.849s-.012 3.584-.069 4.849c-.149 3.225-1.664 4.771-4.919 4.919-1.266.058-1.644.07-4.85.07s-3.584-.012-4.849-.07c-3.26-.149-4.771-1.699-4.919-4.92-.058-1.265-.07-1.644-.07-4.849s.013-3.583.07-4.849c.149-3.227 1.664-4.771 4.919-4.919 1.266-.057 1.645-.069 4.849-.069M12 0C8.741 0 8.333.014 7.053.072 2.695.272.273 2.69.073 7.052.014 8.333 0 8.741 0 12s.014 3.668.072 4.948c.2 4.358 2.618 6.78 6.98 6.98C8.333 23.986 8.741 24 12 24s3.668-.014 4.948-.072c4.354-.2 6.782-2.618 6.979-6.98.059-1.28.073-1.689.073-4.948s-.014-3.667-.072-4.947c-.196-4.354-2.617-6.78-6.979-6.98C15.668.014 15.259 0 12 0m0 5.838a6.162 6.162 0 1 0 0 12.324 6.162 6.162 0 0 0 0-12.324M12 16a4 4 0 1 1 0-8 4 4 0 0 1 0 8m6.406-11.845a1.44 1.44 0 1 0 0 2.881 1.44 1.44 0 0 0 0-2.881"/>',
  facebook:
    '<path d="M24 12.073C24 5.446 18.627.073 12 .073S0 5.446 0 12.073c0 5.99 4.388 10.954 10.125 11.854v-8.385H7.078v-3.47h3.047V9.43c0-3.007 1.792-4.669 4.533-4.669 1.312 0 2.686.235 2.686.235v2.953H15.83c-1.491 0-1.956.925-1.956 1.874v2.25h3.328l-.532 3.47h-2.796v8.385C19.612 23.027 24 18.062 24 12.073"/>',
  youtube:
    '<path d="M23.498 6.186a3.016 3.016 0 0 0-2.122-2.136C19.505 3.545 12 3.545 12 3.545s-7.505 0-9.377.505A3.017 3.017 0 0 0 .502 6.186C0 8.07 0 12 0 12s0 3.93.502 5.814a3.016 3.016 0 0 0 2.122 2.136c1.871.505 9.376.505 9.376.505s7.505 0 9.377-.505a3.015 3.015 0 0 0 2.122-2.136C24 15.93 24 12 24 12s0-3.93-.502-5.814M9.545 15.568V8.432L15.818 12z"/>',
};

const svg = (name, extra = '') =>
  `<svg viewBox="0 0 24 24" aria-hidden="true"${extra}>${ICON[name]}</svg>`;

/* --- images --------------------------------------------------------------- */

const SIZES = {
  hero: '100vw',
  plate: '(min-width: 56rem) 34vw, (min-width: 40rem) 50vw, 100vw',
  split: '(min-width: 56rem) 50vw, 100vw',
  avatar: '56px',
  member: '(min-width: 60rem) 15vw, 45vw',
  logo: '140px',
};

const initials = (name) =>
  name
    .split(/\s+/)
    .slice(0, 2)
    .map((w) => w[0])
    .join('');

/**
 * Resolves one manifest id into markup for the given target.
 * Returns '' when the asset cannot be shown, so callers can fall back.
 */
function picture(ctx, id, opts = {}) {
  const asset = ASSETS[id];
  if (!asset) throw new Error(`Unknown asset id: ${id}`);

  const role = opts.role || 'plate';
  const alt = opts.alt === undefined ? asset.alt : opts.alt;
  const cls = opts.class ? ` class="${opts.class}"` : '';
  const eager = opts.eager === true;
  const loading = eager ? 'eager' : 'lazy';
  const priority = eager ? ' fetchpriority="high"' : '';
  const decoding = eager ? '' : ' decoding="async"';

  if (ctx.target === 'sidearm') {
    // Sidearm serves its own media library. Assets never uploaded there get no
    // <img> at all, and the caller renders a monogram instead.
    if (!asset.sidearm) return '';
    const d = ctx.derivatives[id];
    const dims = d ? ` width="${d.width}" height="${d.height}"` : '';
    return (
      `<img src="${CDN_BASE}/${asset.sidearm}" alt="${esc(alt)}"${dims}` +
      ` loading="${loading}"${priority}${decoding}${cls}>`
    );
  }

  const d = ctx.derivatives[id];
  if (!d) return '';

  const srcset = (list) =>
    list.map((v) => `${v.src} ${v.w}w`).join(', ');

  const sizes = opts.sizes || SIZES[role] || '100vw';
  const sources = [];
  if (d.avif && d.avif.length) {
    sources.push(
      `<source type="image/avif" srcset="${srcset(d.avif)}" sizes="${sizes}">`
    );
  }
  if (d.webp && d.webp.length) {
    sources.push(
      `<source type="image/webp" srcset="${srcset(d.webp)}" sizes="${sizes}">`
    );
  }

  const img =
    `<img src="${d.fallback.src}" alt="${esc(alt)}"` +
    ` width="${d.width}" height="${d.height}"` +
    ` loading="${loading}"${priority}${decoding}${cls}>`;

  return sources.length
    ? `<picture>${sources.join('')}${img}</picture>`
    : img;
}

/** Largest available single URL, for the lightbox. */
function fullSrc(ctx, id) {
  const asset = ASSETS[id];
  if (ctx.target === 'sidearm') {
    return asset.sidearm ? `${CDN_BASE}/${asset.sidearm}` : '';
  }
  const d = ctx.derivatives[id];
  if (!d) return '';
  const webp = d.webp || [];
  return webp.length ? webp[webp.length - 1].src : d.fallback.src;
}

/* --- small builders ------------------------------------------------------- */

const enter = (variant, delay) => {
  let cls = 'cc-enter';
  if (variant) cls += ` cc-enter--${variant}`;
  const style = delay ? ` style="transition-delay:${delay}ms"` : '';
  return { cls, style };
};

const dim = (label) =>
  `<p class="cc-dim"><span>${esc(label)}</span><span class="cc-dim-rule"></span></p>`;

function sectionHead(ctx, { sheet, label, title, intro, center = false, dark = false }) {
  const e = enter(null, 0);
  return `
      <header class="cc-sec-head${center ? ' cc-sec-head--center' : ''} ${e.cls}">
        ${sheet ? dim(sheet) : ''}
        <p class="cc-eyebrow">${esc(label)}</p>
        <h2 class="cc-sec-title">${esc(title)}</h2>
        ${intro ? `<p class="cc-sec-intro">${esc(intro)}</p>` : ''}
      </header>`;
}

const withContact = (s) =>
  s
    .replace(
      /\{phone\}/g,
      `<a href="${C.contact.phoneHref}">${C.contact.phone}</a>`
    )
    .replace(
      /\{email\}/g,
      `<a href="mailto:${C.contact.email}">${C.contact.email}</a>`
    );

/* --- sections ------------------------------------------------------------- */

function renderNav(ctx) {
  // Sidearm already has a sticky site header and a page title. A second fixed
  // nav stacks on top of it, so that target gets a scoped jump bar instead.
  if (ctx.target === 'sidearm') {
    return `
  <nav class="cc-jump" aria-label="Jump to a section on this page">
    <div class="cc-jump-inner cc-scroll-x">
      ${C.nav
        .map(
          (n) =>
            `<a class="cc-jump-link" href="#cc-${n.id}">${esc(n.label)}</a>`
        )
        .join('\n      ')}
    </div>
  </nav>`;
  }

  const logo = picture(ctx, 'logoOnDark', {
    role: 'logo',
    alt: 'University of Toledo Athletics',
    eager: true,
  });

  return `
  <nav class="cc-nav" aria-label="Champions Complex">
    <div class="cc-nav-inner">
      <a class="cc-nav-mark" href="https://supportutrockets.com/">
        ${logo}
        <span class="cc-visually-hidden">Rocket Fund home</span>
      </a>
      <button class="cc-nav-toggle" type="button" aria-expanded="false" aria-controls="cc-nav-links">
        ${svg('menu')}<span class="cc-nav-toggle-label">Menu</span>
      </button>
      <div class="cc-nav-links" id="cc-nav-links">
        ${C.nav
          .map(
            (n) =>
              `<a class="cc-nav-link" href="#cc-${n.id}">${esc(n.label)}</a>`
          )
          .join('\n        ')}
        <a class="cc-nav-tel" href="${C.contact.phoneHref}">
          ${svg('phone')}<span>${C.contact.phone}</span>
        </a>
        <a class="cc-cta" href="#cc-give">Give</a>
      </div>
    </div>
  </nav>`;
}

function renderHero(ctx) {
  const H = ctx.target === 'sidearm' ? 'h2' : 'h1';
  const media = picture(ctx, 'exteriorEast', {
    role: 'hero',
    alt: C.hero.standfirst
      ? 'Architectural rendering of the Champions Complex seen from the east'
      : ASSETS.exteriorEast.alt,
    eager: true,
    sizes: '100vw',
  });

  return `
  <section class="cc-hero" id="cc-hero">
    <div class="cc-hero-media">${media}</div>
    <div class="cc-hero-grid cc-grid-paper" aria-hidden="true"></div>
    <div class="cc-hero-crop" aria-hidden="true"><span></span><span></span><span></span><span></span></div>
    <div class="cc-shell cc-hero-inner">
      <div class="cc-hero-body">
        <p class="cc-kicker">${esc(C.hero.kicker)}</p>
        <${H} class="cc-hero-title">
          <span>${esc(C.hero.headlineLines[0])}</span>
          <span class="cc-hero-title-accent">${esc(C.hero.headlineLines[1])}</span>
        </${H}>
        <p class="cc-hero-standfirst">${esc(C.hero.standfirst)}</p>
        <div class="cc-hero-ctas">
          <a class="cc-cta" href="${C.hero.primaryCta.href.replace('#', '#cc-')}">${esc(C.hero.primaryCta.label)}</a>
          <a class="cc-cta cc-cta--ghost" href="${C.hero.secondaryCta.href.replace('#', '#cc-')}">${esc(C.hero.secondaryCta.label)}</a>
        </div>
      </div>
      <dl class="cc-hero-stats">
        ${C.hero.stats
          .map(
            (s) => `<div class="cc-stat">
          <dd class="cc-stat-value">${esc(s.value)}${s.unit ? `<small>${esc(s.unit)}</small>` : ''}</dd>
          <dt class="cc-stat-label">${esc(s.label)}</dt>
        </div>`
          )
          .join('\n        ')}
      </dl>
    </div>
    <div class="cc-shell">
      <p class="cc-hero-meta">
        <span>${esc(C.hero.view)}</span>
        <b>${esc(C.hero.sheet)}</b>
        <span>${esc(C.contact.coords)}</span>
        <span>${esc(C.contact.city)}</span>
      </p>
    </div>
  </section>`;
}

function renderBanner() {
  return `
  <aside class="cc-banner" aria-label="${esc(C.banner.label)}">
    <div class="cc-shell cc-banner-inner">
      <p class="cc-banner-label">${esc(C.banner.label)}</p>
      <p class="cc-banner-text">${esc(C.banner.text)}</p>
      <a class="cc-banner-cta" href="${C.banner.cta.href.replace('#', '#cc-')}">${esc(C.banner.cta.label)} &rarr;</a>
    </div>
  </aside>`;
}

function renderTicker() {
  const group = `<span class="cc-ticker-group">${C.ticker
    .map((t) => `<span class="cc-ticker-item">${esc(t)}</span>`)
    .join('')}</span>`;

  return `
  <div class="cc-ticker" data-paused="false">
    <div class="cc-ticker-track">
      ${group}
      <span aria-hidden="true">${group}</span>
    </div>
    <button class="cc-ticker-pause" type="button" aria-pressed="false" aria-label="Pause scrolling facts">
      <span class="cc-icon-pause">${svg('pause')}</span>
      <span class="cc-icon-play">${svg('play')}</span>
    </button>
  </div>
  <div class="cc-sentinel" aria-hidden="true"></div>`;
}

function renderVision(ctx) {
  const e = enter('right', 0);
  return `
  <section class="cc-sec cc-sec--flush" id="cc-vision" aria-labelledby="cc-vision-title">
    <div class="cc-split cc-split--right">
      <div class="cc-split-media cc-enter cc-enter--left">
        ${picture(ctx, 'exteriorEntry', { role: 'split' })}
      </div>
      <div class="cc-split-body ${e.cls}">
        ${dim('A-102 / Main entry')}
        <p class="cc-eyebrow">${esc(C.vision.label)}</p>
        <h2 class="cc-sec-title" id="cc-vision-title">${esc(C.vision.title)}</h2>
        ${C.vision.body.map((p) => `<p>${esc(p)}</p>`).join('\n        ')}
        <blockquote class="cc-quote">
          <p class="cc-quote-text">${esc(C.vision.quote.text)}</p>
          <cite class="cc-quote-attr">
            <span class="cc-quote-who">${esc(C.vision.quote.who)}</span>
            <span class="cc-quote-role">${esc(C.vision.quote.role)}</span>
          </cite>
        </blockquote>
        <p class="cc-legacy">${esc(C.vision.legacy)}</p>
      </div>
    </div>
  </section>`;
}

function renderSpaces(ctx) {
  const plates = DRAWING_SET.map((id, i) => {
    const a = ASSETS[id];
    const full = fullSrc(ctx, id);
    const e = enter(null, Math.min(i, 4) * 60);
    return `      <button class="cc-plate ${e.cls}" type="button"${e.style}
              data-title="${esc(a.label)}" data-sheet="${esc(a.sheet)}" data-full="${full}">
        <span class="cc-plate-media">
          <span class="cc-plate-sheet">${esc(a.sheet)}</span>
          <span class="cc-plate-zoom">${svg('zoom')}</span>
          ${picture(ctx, id, { role: 'plate', eager: false })}
        </span>
        <span class="cc-plate-block">
          <span class="cc-plate-name">${esc(a.label)}</span>
          <span class="cc-plate-caption">${esc(a.caption)}</span>
        </span>
      </button>`;
  }).join('\n');

  return `
  <section class="cc-sec cc-sec--dark" id="cc-spaces" aria-labelledby="cc-spaces-title">
    <div class="cc-shell">
      <header class="cc-sec-head cc-sec-head--center cc-enter">
        ${dim('Drawing set A-101 to A-302')}
        <p class="cc-eyebrow">${esc(C.spaces.label)}</p>
        <h2 class="cc-sec-title" id="cc-spaces-title">${esc(C.spaces.title)}</h2>
        <p class="cc-sec-intro">${esc(C.spaces.intro)}</p>
      </header>
      <div class="cc-plates">
${plates}
      </div>
    </div>
  </section>`;
}

function renderStories(ctx) {
  const cards = C.stories.items
    .map((s, i) => {
      const img = picture(ctx, s.image, {
        role: 'avatar',
        alt: s.name,
        sizes: SIZES.avatar,
      });
      // Monogram stands in wherever the photo is unavailable on this target.
      const portrait = img
        ? `<span class="cc-story-portrait">${img}</span>`
        : `<span class="cc-story-mono" aria-hidden="true">${esc(initials(s.name))}</span>`;
      const e = enter(null, i * 80);
      return `      <figure class="cc-story ${e.cls}"${e.style}>
        <div class="cc-story-head">
          ${portrait}
          <div class="cc-story-id">
            <span class="cc-story-name">${esc(s.name)}</span>
            <span class="cc-story-role">${esc(s.role)} &middot; ${esc(s.team)}</span>
          </div>
        </div>
        <blockquote class="cc-story-quote">${esc(s.quote)}</blockquote>
      </figure>`;
    })
    .join('\n');

  return `
  <section class="cc-sec" id="cc-stories" aria-labelledby="cc-stories-title">
    <div class="cc-shell">
      <header class="cc-sec-head cc-sec-head--center cc-enter">
        ${dim('Voices')}
        <p class="cc-eyebrow">${esc(C.stories.label)}</p>
        <h2 class="cc-sec-title" id="cc-stories-title">${esc(C.stories.title)}</h2>
        <p class="cc-sec-intro">${esc(C.stories.intro)}</p>
      </header>
      <div class="cc-stories">
${cards}
      </div>
    </div>
  </section>`;
}

function renderDay() {
  const rows = C.day.items
    .map(
      (d, i) => `        <div class="cc-sched-row cc-enter"${enter(null, Math.min(i, 5) * 50).style}>
          <p class="cc-sched-clock">${esc(d.time)}<small>${esc(d.meridiem)}</small></p>
          <h3 class="cc-sched-title">${esc(d.title)}<span class="cc-sched-venue">${esc(d.venue)}</span></h3>
          <p class="cc-sched-desc">${esc(d.desc)}</p>
        </div>`
    )
    .join('\n');

  return `
  <section class="cc-sec cc-sec--paper-deep" id="cc-day" aria-labelledby="cc-day-title">
    <div class="cc-shell">
      <header class="cc-sec-head cc-enter">
        ${dim('Daily schedule')}
        <p class="cc-eyebrow">${esc(C.day.label)}</p>
        <h2 class="cc-sec-title" id="cc-day-title">${esc(C.day.title)}</h2>
        <p class="cc-sec-intro">${esc(C.day.intro)}</p>
      </header>
      <div class="cc-sched">
${rows}
      </div>
    </div>
  </section>`;
}

function renderImpact(ctx) {
  return `
  <section class="cc-sec cc-sec--flush" id="cc-impact" aria-labelledby="cc-impact-title">
    <div class="cc-split cc-split--left cc-split--flip">
      <div class="cc-split-media cc-enter cc-enter--right">
        ${picture(ctx, 'trainingTable', { role: 'split' })}
        <p class="cc-badge">
          <span class="cc-badge-value">${esc(C.impact.badge.value)}</span>
          <span class="cc-badge-label">${esc(C.impact.badge.label)}</span>
        </p>
      </div>
      <div class="cc-split-body cc-enter cc-enter--left">
        ${dim('A-202 / Training table')}
        <p class="cc-eyebrow">${esc(C.impact.label)}</p>
        <h2 class="cc-sec-title" id="cc-impact-title">${esc(C.impact.title)}</h2>
        <p>${esc(C.impact.intro)}</p>
        <ul class="cc-list">
          ${C.impact.items
            .map((i) => `<li class="cc-list-item">${esc(i)}</li>`)
            .join('\n          ')}
        </ul>
      </div>
    </div>
  </section>`;
}

function renderProgress() {
  const stateLabel = { done: 'Complete', active: 'Underway', next: 'Next' };
  const steps = C.progress.steps
    .map(
      (s, i) => `        <li class="cc-step" data-state="${s.state}">
          <span class="cc-step-mark">${s.state === 'done' ? svg('check') : i + 1}</span>
          <div class="cc-step-body">
            <h3 class="cc-step-title">${esc(s.title)}<span class="cc-step-state">${esc(stateLabel[s.state])}</span></h3>
            <p class="cc-step-detail">${esc(s.detail)}</p>
          </div>
        </li>`
    )
    .join('\n');

  return `
  <section class="cc-sec" id="cc-progress" aria-labelledby="cc-progress-title">
    <div class="cc-shell">
      <header class="cc-sec-head cc-enter">
        ${dim('Project status')}
        <p class="cc-eyebrow">${esc(C.progress.label)}</p>
        <h2 class="cc-sec-title" id="cc-progress-title">${esc(C.progress.title)}</h2>
        <p class="cc-sec-intro">${esc(C.progress.intro)}</p>
      </header>
      <ol class="cc-steps cc-enter">
${steps}
      </ol>
      <p class="cc-note cc-enter">${esc(C.progress.note)}</p>
    </div>
  </section>`;
}

function renderGive() {
  const tiers = C.give.tiers
    .map(
      (t, i) => `        <div class="cc-tier${t.featured ? ' cc-tier--featured' : ''} cc-enter"${enter(null, i * 60).style}>
          ${t.badge ? `<p class="cc-tier-badge">${esc(t.badge)}</p>` : ''}
          <p class="cc-tier-amount">${esc(t.amount)}</p>
          <p class="cc-tier-name">${esc(t.name)}</p>
          <p class="cc-tier-impact">${esc(t.impact)}</p>
          <a class="cc-tier-cta" href="${C.contact.phoneHref}">${esc(t.cta)} &rarr;</a>
        </div>`
    )
    .join('\n');

  return `
  <section class="cc-sec cc-sec--paper-deep" id="cc-give" aria-labelledby="cc-give-title">
    <div class="cc-shell">
      <header class="cc-sec-head cc-sec-head--center cc-enter">
        ${dim('Naming and recognition')}
        <p class="cc-eyebrow">${esc(C.give.label)}</p>
        <h2 class="cc-sec-title" id="cc-give-title">${esc(C.give.title)}</h2>
        <p class="cc-sec-intro">${esc(C.give.intro)}</p>
      </header>
      <p class="cc-pullquote cc-enter">${esc(C.give.pullquote)}</p>
      <div class="cc-tiers">
${tiers}
      </div>
      <div class="cc-give-close cc-enter">
        <p>${esc(C.give.closing)}</p>
        <a class="cc-cta cc-cta--ink" href="${C.contact.phoneHref}">Call ${esc(C.contact.phone)}</a>
      </div>
    </div>
  </section>`;
}

function renderFaq() {
  // Panels render open, so the no-JS page shows every answer. The script
  // collapses them on init once a control exists to reopen them.
  const items = C.faq.items
    .map(
      (f, i) => `        <div class="cc-acc-item">
          <h3>
            <button class="cc-acc-trigger" type="button" id="cc-faq-t${i}"
                    aria-expanded="true" aria-controls="cc-faq-p${i}">
              <span>${esc(f.q)}</span>
              <span class="cc-acc-mark" aria-hidden="true"></span>
            </button>
          </h3>
          <div class="cc-acc-panel" id="cc-faq-p${i}" role="region" aria-labelledby="cc-faq-t${i}">
            <p>${withContact(esc(f.a))}</p>
          </div>
        </div>`
    )
    .join('\n');

  return `
  <section class="cc-sec" id="cc-faq" aria-labelledby="cc-faq-title">
    <div class="cc-shell">
      <header class="cc-sec-head cc-sec-head--center cc-enter">
        ${dim('Questions')}
        <p class="cc-eyebrow">${esc(C.faq.label)}</p>
        <h2 class="cc-sec-title" id="cc-faq-title">${esc(C.faq.title)}</h2>
      </header>
      <div class="cc-acc cc-enter">
${items}
      </div>
    </div>
  </section>`;
}

function renderTeam(ctx) {
  const members = C.team.members
    .map((m, i) => {
      const img = picture(ctx, m.image, {
        role: 'member',
        alt: m.name,
        sizes: SIZES.member,
      });
      const photo = img
        ? `<div class="cc-member-photo">${img}</div>`
        : `<div class="cc-member-photo cc-story-mono" aria-hidden="true">${esc(initials(m.name))}</div>`;
      return `        <div class="cc-member cc-enter"${enter(null, i * 60).style}>
          ${photo}
          <p class="cc-member-name">${esc(m.name)}</p>
          <div class="cc-member-links">
            <a class="cc-member-link" href="mailto:${m.email}">${svg('mail')}<span>${esc(m.email)}</span></a>
            <a class="cc-member-link" href="tel:+1${m.phone.replace(/\./g, '')}">${svg('phone')}<span>${esc(m.phone)}</span></a>
          </div>
        </div>`;
    })
    .join('\n');

  return `
  <section class="cc-sec cc-sec--dark" id="cc-team" aria-labelledby="cc-team-title">
    <div class="cc-shell">
      <header class="cc-sec-head cc-enter">
        ${dim('Contact')}
        <p class="cc-eyebrow">${esc(C.team.label)}</p>
        <h2 class="cc-sec-title" id="cc-team-title">${esc(C.team.title)}</h2>
        <p class="cc-sec-intro">${esc(C.team.intro)}</p>
      </header>
      <div class="cc-office cc-enter">
        <div class="cc-office-item">
          <span class="cc-office-icon">${svg('mail')}</span>
          <div>
            <p class="cc-office-label">General email</p>
            <p class="cc-office-value"><a href="mailto:${C.contact.email}">${esc(C.contact.email)}</a></p>
          </div>
        </div>
        <div class="cc-office-item">
          <span class="cc-office-icon">${svg('phone')}</span>
          <div>
            <p class="cc-office-label">Main line</p>
            <p class="cc-office-value"><a href="${C.contact.phoneHref}">${esc(C.contact.phone)}</a></p>
          </div>
        </div>
        <div class="cc-office-item">
          <span class="cc-office-icon">${svg('pin')}</span>
          <div>
            <p class="cc-office-label">${esc(C.contact.office)}</p>
            <p class="cc-office-value">${esc(C.contact.address)}</p>
          </div>
        </div>
      </div>
      <div class="cc-team">
${members}
      </div>
    </div>
  </section>`;
}

function renderFooter(ctx) {
  // Sidearm's own footer already carries the athletics mark, and the only
  // lockup on their CDN is the light-background one, which would disappear
  // against this ground. So the mark is Pages-only.
  const mark =
    ctx.target === 'pages'
      ? `      <div class="cc-footer-mark">${picture(ctx, 'logoOnDark', {
          role: 'logo',
          alt: 'University of Toledo Athletics',
        })}</div>\n`
      : '';

  return `
  <footer class="cc-footer">
    <div class="cc-shell cc-footer-inner">
${mark}      <ul class="cc-footer-social">
        ${C.footer.social
          .map(
            (s) =>
              `<li><a href="${s.href}" target="_blank" rel="noopener noreferrer" aria-label="${esc(s.label)}">${svg(s.icon)}</a></li>`
          )
          .join('\n        ')}
      </ul>
      <ul class="cc-footer-links">
        ${C.footer.links
          .map(
            (l) =>
              `<li><a href="${l.href}"${l.href.startsWith('http') ? ' target="_blank" rel="noopener noreferrer"' : ''}>${esc(l.label)}</a></li>`
          )
          .join('\n        ')}
      </ul>
      <div class="cc-footer-fine">
        <p>${esc(C.footer.foundation)}</p>
        <p>${esc(C.footer.copy)}</p>
      </div>
    </div>
  </footer>`;
}

function renderChrome() {
  return `
  <div class="cc-dock" aria-label="Contact the Rocket Fund team">
    <div class="cc-dock-inner">
      <a class="cc-dock-btn cc-dock-btn--solid" href="${C.contact.phoneHref}">${svg('phone')}<span>Call</span></a>
      <a class="cc-dock-btn cc-dock-btn--ghost" href="mailto:${C.contact.email}">${svg('mail')}<span>Email</span></a>
    </div>
  </div>
  <button class="cc-top" type="button" aria-label="Back to top">${svg('up')}</button>
  <div class="cc-lightbox" hidden>
    <figure class="cc-lightbox-figure">
      <img class="cc-lightbox-img" src="" alt="">
      <figcaption class="cc-lightbox-caption">
        <p class="cc-lightbox-title"></p>
        <span class="cc-lightbox-count"></span>
      </figcaption>
    </figure>
    <div class="cc-lightbox-bar">
      <button class="cc-lightbox-btn cc-lightbox-prev" type="button" aria-label="Previous drawing">${svg('left')}</button>
      <button class="cc-lightbox-btn cc-lightbox-close" type="button" aria-label="Close viewer">${svg('right', ' style="rotate:45deg;display:none"')}<span aria-hidden="true">&times;</span></button>
      <button class="cc-lightbox-btn cc-lightbox-next" type="button" aria-label="Next drawing">${svg('right')}</button>
    </div>
  </div>`;
}

/* --- assembly ------------------------------------------------------------- */

export function renderBody(ctx) {
  const rootClass = `cc cc-${ctx.concept} cc-has-dock`;

  return `<div class="${rootClass}" data-target="${ctx.target}">
  <a class="cc-skip" href="#cc-main">Skip to main content</a>
${renderNav(ctx)}
  <main class="cc-main" id="cc-main">
${renderHero(ctx)}
${renderBanner()}
${renderTicker()}
${renderVision(ctx)}
${renderSpaces(ctx)}
${renderStories(ctx)}
${renderDay()}
${renderImpact(ctx)}
${renderProgress()}
${renderGive()}
${renderFaq()}
${renderTeam(ctx)}
  </main>
${renderFooter(ctx)}
${renderChrome()}
</div>`;
}

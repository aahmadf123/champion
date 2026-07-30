# Champions Complex

The fundraising page for the University of Toledo Athletics Champions Complex, a
74,000 sq ft facility for 450+ Rocket student-athletes. It exists to move
major-gift prospects toward a conversation with the Rocket Fund team.

One source builds two things:

| Output | What it is |
|---|---|
| `dist/index.html` | Standalone page for GitHub Pages, used as a shareable feedback link |
| `sidearm/` | Committed files to paste into Sidearm. See below for which one |
| `dist/preview/` | Three design concepts side by side, plus a chooser page |

Before this existed, the two targets were hand-maintained copies (`index.html`
and a `champion.html` that was later deleted) and they had already drifted onto
different typefaces and different image sets. Everything is generated now so
that cannot happen again.

## Quick start

```bash
npm install
npm run all      # images, then build, then check
npm run serve    # http://127.0.0.1:8420
```

`npm run all` is the one command that matters. It generates image derivatives,
builds every target and concept, and fails if anything unsafe reaches the
Sidearm output.

## One-time GitHub Pages setting

**The Pages source has to be switched from a branch to GitHub Actions**, or
nothing publishes. In the repository: Settings, then Pages, then set Source to
"GitHub Actions". The workflow in `.github/workflows/pages.yml` then builds on
every push to `main` and publishes `dist/`.

This changed because the old setup served a committed `index.html` from the
repository root. That file is now generated, and the 43 MB of source images in
`images/` must never reach the published site.

## Publishing to Sidearm

The files are committed, so nothing needs building first. Open them on GitHub,
copy, paste.

**Which route depends on what your page offers.** A Feature page usually has a
separate Custom CSS field. A Sport File in Standard mode usually does not.

| Your page has | Paste this |
|---|---|
| A Custom CSS field | `sidearm/champions-complex.css` into it, then `sidearm/champions-complex.html` into the HTML content block |
| No Custom CSS field | `sidearm/champions-complex-single-paste.html` into the HTML content block, on its own |

The single-paste file is the same content with the styles at the top and the
script at the bottom of one block, which is the selection that runs from the
opening `<style>` tag through the closing `</script>` tag.

Either way, leave out `<!DOCTYPE html>`, `<html>`, `<head>`, `<title>`, the meta
tags and `<body>`. Sidearm generates those, and pasting them nests document tags.

**No head field is needed, and no font tags.** The typefaces are embedded in the
CSS as base64. There are no Google Fonts `<link>` tags to place, no `@import` to
put first in the stylesheet, and no flash of fallback type on first load. Older
instructions for this page referenced Oswald and Source Sans 3 loaded from
Google; that build is gone, and the current one loads nothing externally except
the images.

Images resolve to Sidearm's own CloudFront library, so they keep working
wherever the markup is pasted.

### Why the Sidearm build is shaped the way it is

Sidearm renders this inside a page that already has its own header, navigation,
page heading and footer. So the Sidearm build:

- scopes every CSS selector under `.cc`, so nothing can restyle Sidearm's chrome
- ships no site navigation, using a scoped jump bar instead
- uses `<h2>` for the hero, because Sidearm supplies the `<h1>`
- caps the hero height rather than using `100vh`, because Sidearm's header takes
  vertical space this file cannot measure
- resolves images to absolute URLs on Sidearm's own CloudFront library
- prefixes every `id` with `cc-` to avoid colliding with Sidearm's own ids

The previous Sidearm build was a complete HTML document. Pasted into their page,
the browser discarded the nested `html`, `head` and `body` tags but kept the
`<style>` block, so its CSS applied to the whole page. Injecting it into a host
stand-in changes 34 measured properties of the host's own chrome: `body`
font-family, `body` text color, and the `box-sizing` model on every element,
plus the size of the host's own header links. Its `a{text-decoration:none}` also
removes underlines from any host link that is not styled by a more specific
selector.

`npm run check` fails the build if any unscoped selector, stray `<h1>`, or
relative asset path reaches the Sidearm output. `npm run sidearm-host` loads
each variant into a host stand-in, including the two-file bundle with the CSS in
`<head>` exactly as a Custom CSS field delivers it, and asserts the host is
unchanged in every property it measures. CI additionally fails if `sidearm/` is
stale relative to `src/`.

### Images that still need uploading to Sidearm

Four assets exist locally but have never been uploaded to Sidearm's media
library. On the Sidearm target they render as a monogram rather than a broken
image, and `npm run build` prints the list every time:

- `images/JAR.png` (John Alan Richter)
- `images/Rob Reinstetle.png`
- `images/Jessica Bracamonte.png`
- `images/UT_Athletics_Primary_Logo_for_Dark_Background.png`

Upload them, then add the resulting CloudFront paths to `assets/manifest.mjs`.
The naming is not mechanical: Sidearm rewrites uploads into a dated folder and
appends a random suffix, so each path has to be copied from their media library
by hand. `AcademicsLounge_MSA.jpg` locally is
`2026/2/27/Academics-Lounge.MSA.jpg` there.

Sidearm's CDN also has one rendering with no local master,
`2026/2/27/Academics-Study.MSA.jpg`. It is recorded in `CDN_ONLY` in the
manifest and is not used, because it cannot be optimized without the original.

## Layout

```
src/content.mjs             all page copy, one source for both targets
src/layout/page.mjs         renders the markup for a (concept, target) pair
src/css/base.css            scoped reset, layout primitives, accessibility
src/css/concepts/*.css      one file per design concept, all visual decisions
src/js/app.js               progressive enhancement, no dependencies
assets/manifest.mjs         asset ids to local files and CloudFront URLs
assets/fonts/               self-hosted woff2, latin subset
scripts/images.mjs          generates responsive derivatives with sharp
scripts/build.mjs           emits everything into dist/
scripts/check.mjs           fails the build on unsafe or inaccessible output
scripts/a11y.mjs            accessibility checks in a real browser
scripts/sidearm-host.mjs    proves the fragment cannot damage a host page
scripts/shots.mjs           screenshots plus no-JS and overflow checks
scripts/sections.mjs        per-section crops for design review
scripts/serve.mjs           concurrent static server for dist/
sidearm/                    generated AND committed, for copy-paste
images/                     3840x2160 masters, never published
```

`assets/img/` and `dist/` are generated and git-ignored. `sidearm/` is generated
too, but committed on purpose so it can be pasted straight from GitHub.

## The three concepts

Identical copy, images and accessibility work in all three. Only the design
language changes.

**Blueprint** is in production. It extends the architectural language the old
hero already used (dimension lines, crop marks, a sheet tag) across the whole
page, with a monospace annotation layer and real sheet numbers that map to zones
of the building. Gold becomes annotation ink rather than a fill.

**Editorial** drops the grids for full-bleed renderings, one per screen, with a
high-contrast serif carrying the quotes. The serif is a real departure for a
college athletics page.

**Refined** is the previous design with the craft fixed: one type scale instead
of ad hoc `clamp()` per element, even vertical rhythm, contrast at AA, and a
feature grid weighted so it reads as a tour rather than a photo dump.

To change which one ships, edit `PRODUCTION_CONCEPT` in `scripts/build.mjs`.

## Accessibility

`npm run a11y` runs against all three concepts in a real browser and checks text
contrast against the actually-painted background, focus-ring visibility, ARIA
wiring, the real Tab order, touch target sizes, and behavior under
`prefers-reduced-motion`. It exits non-zero on failure.

Text painted over a photograph cannot be measured from computed styles, so that
text is checked a second way: the harness hides the glyphs, screenshots the
page, and reads the pixels they would have covered, comparing against the 98th
percentile luminance so one stray highlight does not dominate. This is what the
transparent navigation over the hero is validated against, and it caught three
failures the computed-styles pass had always skipped.

Measured failures on the previous page, all now fixed:

| Was | Selector |
|---|---|
| 1.00:1 | Focus ring, gold on the gold-filled CTA it sat on, so it was invisible |
| 2.35:1 | `#D4960E` on off-white, used for timeline dates and venue labels |
| 2.57:1 | `#D4960E` on white, used for the open FAQ question |
| 3.80:1 | Footer body copy and links at `rgba(255,255,255,0.40)` |
| 4.46:1 | Small labels at `rgba(255,255,255,0.45)` |

Also fixed: no skip link, no `<main>` landmark, no
`prefers-reduced-motion: reduce` block at all (only the ticker was guarded), an
auto-scrolling ticker with no pause control (WCAG 2.2.2), links inside collapsed
FAQ panels and the closed lightbox staying in the Tab order, a mobile nav toggle
that never set `aria-expanded`, headings nested inside `role="button"` cards
which flattened them out of the outline, and a mobile breakpoint that removed
the phone number and Contact button from the navigation without putting them
anywhere else.

The navigation is transparent over the hero on load and turns solid once the
hero scrolls away, so the rendering is the first thing anyone sees. Legibility
there comes from a backdrop filter rather than a heavy overlay: it drops the
luminance behind the glyphs while the image still reads through. A flat scrim
dark enough to pass measured almost opaque, which defeated the point.

### The no-JavaScript guarantee

The page is fully readable and operable before `src/js/app.js` runs. The script
adds a `cc-js` class, and only then do entrance transitions and the lightbox
exist. FAQ answers render open and are collapsed on init.

This matters because the previous page did the opposite: CSS set `opacity: 0` on
everything below the hero and JavaScript removed it. If the script was stripped,
deferred or threw, the whole page below the hero was permanently invisible. A
CMS HTML block is exactly the environment where a `<script>` may not survive.
`npm run shots` loads each page with JavaScript disabled and fails if any
section is invisible or any FAQ answer is unreachable.

## Images

The masters in `images/` are 3840x2160 at 2 to 6 MB each, and the old page
loaded nine of them at full size into 600x400 boxes. `npm run images` generates
WebP at four widths, AVIF for the hero, and one raster fallback, wired up with
`srcset` and `sizes`.

A first view went from roughly 43 MB to about 478 KB.

The renderings carry the architect's `MSA SPORT` watermark, bottom right. That
is in the source files, so it will need clean versions from MSA Design to
remove.

## Copy decisions worth knowing

Three fixes were applied to content, not just design:

- Jessica Bracamonte's quote ended "accomplish great things make us proud Toledo
  Rockets", which was missing words. It now reads "accomplish great things and
  make us proud".
- "wholistic" corrected to "holistic".
- The footer copyright gained a symbol and a year.

Two sections were reframed rather than restyled. The milestone strip previously
showed a Fall 2024 launch complete, fundraising open-ended, then Groundbreaking
and Grand Opening both TBD, which reads as a stalled project two years on. It
now leads with design being complete and names funding as the only remaining
gate. The urgency banner previously carried general mission copy in a slot
designed for urgency; it now states where the project actually stands.

All giving tiers start at $50,000 and every call to action is a phone call or an
email. That is deliberate: this is a major-gift cultivation page, not a
transactional donation form. If an online gift path is ever wanted, the CTA
would slot into the closing block of the giving section in
`src/layout/page.mjs`.

## Conventions

- Every selector in `src/css/` is scoped under `.cc`. Nothing may begin with
  `html`, `body`, `*`, or a bare element selector. `npm run check` enforces it.
- Visual decisions live in the concept stylesheets. `base.css` handles structure,
  component mechanics and accessibility only.
- All copy lives in `src/content.mjs`, never in the renderer.
- All image references go through `assets/manifest.mjs` by logical id, never by
  filename.

## Notes for a fresh clone

`npm run all` needs only `sharp`. The verification scripts additionally use
`playwright-core` and expect a Chromium binary; set `PW_CHROMIUM` or edit the
`executablePath` in `scripts/*.mjs` if yours is somewhere other than
`/opt/pw-browsers/chromium`.

`npm run verify` runs all four verification passes in order: output checks, the
Sidearm host-isolation test, the accessibility harness, and the screenshot plus
no-JavaScript pass.

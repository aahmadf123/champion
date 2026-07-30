/* ==========================================================================
   Champions Complex — progressive enhancement.
   ==========================================================================

   Rules this file follows, because it also runs inside Sidearm's page:

   1. Everything is queried from the `.cc` root, never from `document`, so the
      script cannot reach Sidearm's own DOM. The two exceptions are keydown and
      resize listeners, which have to be on window.
   2. The page is fully readable and operable before this runs. It adds the
      `cc-js` class, and only then do entrance transitions and the lightbox
      exist at all. The old build inverted this: CSS set `opacity:0` and JS
      removed it, so a stripped or failed script left the whole page blank.
   3. No scroll-position polling. The old version ran six getBoundingClientRect
      loops on every rAF tick. This uses IntersectionObserver.
   4. Nothing throws if an element is absent, because the Sidearm variant omits
      the nav and the concepts vary.
   ========================================================================== */
(function () {
  'use strict';

  var root = document.querySelector('.cc');
  if (!root) return;

  var $ = function (sel, ctx) {
    return (ctx || root).querySelector(sel);
  };
  var $$ = function (sel, ctx) {
    return Array.prototype.slice.call((ctx || root).querySelectorAll(sel));
  };

  var reduced = window.matchMedia('(prefers-reduced-motion: reduce)');
  var hasIO = typeof window.IntersectionObserver === 'function';

  // Signals to CSS that enhancement is live. Everything gated on `.cc-js`
  // becomes active only from this point.
  root.classList.add('cc-js');

  /* --- Entrance transitions --------------------------------------------- */

  var entries = $$('.cc-enter');
  if (!hasIO || reduced.matches) {
    entries.forEach(function (el) {
      el.classList.add('is-in');
    });
  } else {
    var enterObserver = new IntersectionObserver(
      function (records) {
        records.forEach(function (record) {
          if (!record.isIntersecting) return;
          record.target.classList.add('is-in');
          enterObserver.unobserve(record.target);
        });
      },
      { rootMargin: '0px 0px -12% 0px', threshold: 0.08 }
    );
    entries.forEach(function (el) {
      enterObserver.observe(el);
    });
  }

  /* --- Navigation ------------------------------------------------------- */

  var navToggle = $('.cc-nav-toggle');
  var navLinks = $('.cc-nav-links');

  if (navToggle && navLinks) {
    var setNav = function (open) {
      navLinks.setAttribute('data-open', open ? 'true' : 'false');
      navToggle.setAttribute('aria-expanded', open ? 'true' : 'false');
      var label = navToggle.querySelector('.cc-nav-toggle-label');
      if (label) label.textContent = open ? 'Close' : 'Menu';
    };

    setNav(false);

    navToggle.addEventListener('click', function () {
      setNav(navToggle.getAttribute('aria-expanded') !== 'true');
    });

    $$('a', navLinks).forEach(function (a) {
      a.addEventListener('click', function () {
        setNav(false);
      });
    });

    // Escape closes the menu and returns focus to the control that opened it.
    root.addEventListener('keydown', function (event) {
      if (event.key !== 'Escape') return;
      if (navToggle.getAttribute('aria-expanded') !== 'true') return;
      setNav(false);
      navToggle.focus();
    });
  }

  /* --- Nav: transparent over the hero, solid once past it ---------------- */
  /*
     The page opens with the rendering fully visible behind a transparent bar,
     which is the point of the hero. A sentinel at the top of the hero flips the
     bar to its solid state as soon as it scrolls away, so the links never sit
     on light parts of a photograph without a ground behind them.
  */

  var nav = $('.cc-nav');
  var navSentinel = $('.cc-nav-sentinel');

  if (nav && navSentinel && hasIO) {
    var stickObserver = new IntersectionObserver(
      function (records) {
        nav.classList.toggle('is-stuck', !records[0].isIntersecting);
      },
      { threshold: 0 }
    );
    stickObserver.observe(navSentinel);
  } else if (nav) {
    // No observer available, so stay in the readable state rather than the
    // transparent one.
    nav.classList.add('is-stuck');
  }

  /* --- Current section in the nav --------------------------------------- */

  var sections = $$('main [id]').filter(function (el) {
    return el.tagName === 'SECTION';
  });

  if (hasIO && navLinks && sections.length) {
    var linkFor = {};
    $$('a[href^="#"]', navLinks).forEach(function (a) {
      linkFor[a.getAttribute('href').slice(1)] = a;
    });

    var visible = {};
    var syncCurrent = function () {
      var active = sections.filter(function (s) {
        return visible[s.id];
      })[0];
      Object.keys(linkFor).forEach(function (id) {
        if (active && id === active.id) {
          linkFor[id].setAttribute('aria-current', 'true');
        } else {
          linkFor[id].removeAttribute('aria-current');
        }
      });
    };

    var currentObserver = new IntersectionObserver(
      function (records) {
        records.forEach(function (record) {
          visible[record.target.id] = record.isIntersecting;
        });
        syncCurrent();
      },
      { rootMargin: '-25% 0px -65% 0px' }
    );
    sections.forEach(function (s) {
      currentObserver.observe(s);
    });
  }

  /* --- Ticker pause ----------------------------------------------------- */
  /* WCAG 2.2.2. A reduced-motion query alone is not a mechanism, so there is
     a real control. It is rendered by the build but only shown on the JS path,
     because without JS the animation never starts. */

  var ticker = $('.cc-ticker');
  var tickerPause = $('.cc-ticker-pause');

  if (ticker && tickerPause) {
    var setPaused = function (paused) {
      ticker.setAttribute('data-paused', paused ? 'true' : 'false');
      tickerPause.setAttribute('aria-pressed', paused ? 'true' : 'false');
      tickerPause.setAttribute(
        'aria-label',
        paused ? 'Resume scrolling facts' : 'Pause scrolling facts'
      );
    };

    setPaused(false);

    tickerPause.addEventListener('click', function () {
      setPaused(ticker.getAttribute('data-paused') !== 'true');
    });

    // Pausing on hover and on keyboard focus is a courtesy on top of the
    // explicit control.
    ['mouseenter', 'focusin'].forEach(function (type) {
      ticker.addEventListener(type, function () {
        ticker.setAttribute('data-hover', 'true');
      });
    });
  }

  /* --- Accordion -------------------------------------------------------- */
  /* Panels collapse with the `hidden` attribute, so links inside a closed
     answer leave both the tab order and the accessibility tree. The old
     max-height:0 approach left them reachable and clipped long answers. */

  var accItems = $$('.cc-acc-item');

  accItems.forEach(function (item) {
    var trigger = $('.cc-acc-trigger', item);
    var panel = $('.cc-acc-panel', item);
    if (!trigger || !panel) return;

    var open = function (state) {
      trigger.setAttribute('aria-expanded', state ? 'true' : 'false');
      if (state) {
        panel.removeAttribute('hidden');
      } else {
        panel.setAttribute('hidden', '');
      }
    };

    // Server-rendered state is open, so the no-JS page shows every answer.
    // Collapse on init now that we can guarantee a control to reopen them.
    open(false);

    trigger.addEventListener('click', function () {
      var wasOpen = trigger.getAttribute('aria-expanded') === 'true';
      accItems.forEach(function (other) {
        if (other === item) return;
        var t = $('.cc-acc-trigger', other);
        var p = $('.cc-acc-panel', other);
        if (t && p) {
          t.setAttribute('aria-expanded', 'false');
          p.setAttribute('hidden', '');
        }
      });
      open(!wasOpen);
    });
  });

  /* --- Lightbox --------------------------------------------------------- */

  var lightbox = $('.cc-lightbox');
  var plates = $$('.cc-plate');

  if (lightbox && plates.length) {
    var lbImg = $('.cc-lightbox-img', lightbox);
    var lbTitle = $('.cc-lightbox-title', lightbox);
    var lbCount = $('.cc-lightbox-count', lightbox);
    var lbClose = $('.cc-lightbox-close', lightbox);
    var lbPrev = $('.cc-lightbox-prev', lightbox);
    var lbNext = $('.cc-lightbox-next', lightbox);
    var opener = null;
    var index = 0;

    var slides = plates.map(function (plate) {
      var img = $('img', plate);
      return {
        full: plate.getAttribute('data-full') || (img && img.currentSrc) || (img && img.src),
        alt: (img && img.getAttribute('alt')) || '',
        title: plate.getAttribute('data-title') || '',
        sheet: plate.getAttribute('data-sheet') || '',
      };
    });

    var setInert = function (state) {
      if ('inert' in HTMLElement.prototype) {
        lightbox.inert = state;
      } else if (state) {
        lightbox.setAttribute('aria-hidden', 'true');
      } else {
        lightbox.removeAttribute('aria-hidden');
      }
    };

    var show = function (i) {
      index = (i + slides.length) % slides.length;
      var slide = slides[index];
      lbImg.src = slide.full;
      lbImg.alt = slide.alt;
      if (lbTitle) {
        lbTitle.textContent = slide.sheet
          ? slide.sheet + '  ' + slide.title
          : slide.title;
      }
      if (lbCount) {
        lbCount.textContent = index + 1 + ' of ' + slides.length;
      }
    };

    var close = function () {
      lightbox.classList.remove('is-open');
      lightbox.setAttribute('hidden', '');
      setInert(true);
      root.removeAttribute('data-lightbox-open');
      document.documentElement.style.removeProperty('overflow');
      if (opener) opener.focus();
    };

    var open = function (i) {
      opener = plates[i] || null;
      lightbox.removeAttribute('hidden');
      setInert(false);
      show(i);
      // Two frames, so the transition has a start state to animate from.
      requestAnimationFrame(function () {
        requestAnimationFrame(function () {
          lightbox.classList.add('is-open');
        });
      });
      root.setAttribute('data-lightbox-open', 'true');
      document.documentElement.style.overflow = 'hidden';
      if (lbClose) lbClose.focus();
    };

    // Closed and inert until asked for.
    lightbox.setAttribute('hidden', '');
    setInert(true);

    plates.forEach(function (plate, i) {
      plate.addEventListener('click', function () {
        open(i);
      });
    });

    if (lbClose) lbClose.addEventListener('click', close);
    if (lbPrev)
      lbPrev.addEventListener('click', function () {
        show(index - 1);
      });
    if (lbNext)
      lbNext.addEventListener('click', function () {
        show(index + 1);
      });

    lightbox.addEventListener('click', function (event) {
      if (event.target === lightbox) close();
    });

    // Focus stays inside while open, and the arrows work.
    lightbox.addEventListener('keydown', function (event) {
      if (event.key === 'Escape') {
        close();
        return;
      }
      if (event.key === 'ArrowLeft') {
        event.preventDefault();
        show(index - 1);
        return;
      }
      if (event.key === 'ArrowRight') {
        event.preventDefault();
        show(index + 1);
        return;
      }
      if (event.key !== 'Tab') return;

      var focusable = [lbClose, lbPrev, lbNext].filter(Boolean);
      if (!focusable.length) return;
      var first = focusable[0];
      var last = focusable[focusable.length - 1];
      if (event.shiftKey && document.activeElement === first) {
        event.preventDefault();
        last.focus();
      } else if (!event.shiftKey && document.activeElement === last) {
        event.preventDefault();
        first.focus();
      }
    });
  }

  /* --- Sticky chrome ---------------------------------------------------- */
  /* A sentinel just below the hero drives both the mobile contact dock and the
     back-to-top control, instead of polling window.scrollY. */

  var sentinel = $('.cc-sentinel');
  var dock = $('.cc-dock');
  var toTop = $('.cc-top');

  if (hasIO && sentinel && (dock || toTop)) {
    var chromeObserver = new IntersectionObserver(
      function (records) {
        var past = !records[0].isIntersecting;
        if (dock) dock.classList.toggle('is-in', past);
        if (toTop) toTop.classList.toggle('is-in', past);
      },
      { threshold: 0 }
    );
    chromeObserver.observe(sentinel);
  } else if (dock || toTop) {
    if (dock) dock.classList.add('is-in');
    if (toTop) toTop.classList.add('is-in');
  }

  if (toTop) {
    toTop.addEventListener('click', function () {
      window.scrollTo({
        top: 0,
        behavior: reduced.matches ? 'auto' : 'smooth',
      });
      var skip = $('.cc-skip');
      if (skip) skip.focus({ preventScroll: true });
    });
  }
})();

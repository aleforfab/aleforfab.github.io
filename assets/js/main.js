/* ==========================================================================
   main.js — navigation, field explorer, lightbox, counters
   No dependencies. Everything degrades to readable content without JS.
   ========================================================================== */
(function () {
  'use strict';

  var reduced = window.matchMedia('(prefers-reduced-motion: reduce)').matches;
  var $ = function (sel, root) { return (root || document).querySelector(sel); };
  var $$ = function (sel, root) { return Array.prototype.slice.call((root || document).querySelectorAll(sel)); };

  /* ======================================================================
     1. Scroll progress + masthead state
     ====================================================================== */
  var masthead = $('#masthead');
  var progressBar = $('.progress__bar');
  var scrollQueued = false;

  function onScroll() {
    var y = window.scrollY || window.pageYOffset;
    var max = document.documentElement.scrollHeight - window.innerHeight;
    if (progressBar) progressBar.style.width = (max > 0 ? Math.min(100, (y / max) * 100) : 0) + '%';
    if (masthead) masthead.classList.toggle('is-stuck', y > 6);
    scrollQueued = false;
  }
  window.addEventListener('scroll', function () {
    if (!scrollQueued) { scrollQueued = true; requestAnimationFrame(onScroll); }
  }, { passive: true });
  onScroll();

  /* ======================================================================
     2. Scroll spy
     ====================================================================== */
  var navLinks = $$('.nav__link');
  var spySections = navLinks
    .map(function (link) {
      var id = link.getAttribute('href').slice(1);
      var el = document.getElementById(id);
      return el ? { id: id, el: el, link: link } : null;
    })
    .filter(Boolean);

  function spy() {
    if (!spySections.length) return;
    var mark = (window.scrollY || window.pageYOffset) + (masthead ? masthead.offsetHeight : 72) + 140;
    var current = null;
    spySections.forEach(function (item) {
      if (item.el.offsetTop <= mark) current = item;
    });
    if ((window.innerHeight + window.scrollY) >= document.documentElement.scrollHeight - 4) {
      current = spySections[spySections.length - 1];
    }
    navLinks.forEach(function (link) { link.classList.remove('is-active'); });
    if (current) {
      current.link.classList.add('is-active');
      current.link.setAttribute('aria-current', 'true');
      navLinks.forEach(function (l) { if (l !== current.link) l.removeAttribute('aria-current'); });
    }
  }
  window.addEventListener('scroll', function () {
    if (!scrollQueued) requestAnimationFrame(function () { spy(); });
  }, { passive: true });
  spy();
  setTimeout(spy, 400);

  /* ======================================================================
     3. Mobile menu
     ====================================================================== */
  var menuBtn = $('.menu-btn');
  var mobileNav = $('#mobile-nav');

  function closeMenu(returnFocus) {
    if (!menuBtn || !mobileNav) return;
    menuBtn.setAttribute('aria-expanded', 'false');
    menuBtn.setAttribute('aria-label', 'Open section menu');
    mobileNav.hidden = true;
    if (masthead) masthead.classList.remove('is-open');
    if (returnFocus) menuBtn.focus();
  }

  if (menuBtn && mobileNav) {
    menuBtn.addEventListener('click', function () {
      var open = menuBtn.getAttribute('aria-expanded') === 'true';
      if (open) { closeMenu(true); return; }
      mobileNav.hidden = false;
      menuBtn.setAttribute('aria-expanded', 'true');
      menuBtn.setAttribute('aria-label', 'Close section menu');
      if (masthead) masthead.classList.add('is-open');
      var first = mobileNav.querySelector('a');
      if (first) first.focus();
    });

    mobileNav.addEventListener('click', function (e) {
      if (e.target.closest('a')) closeMenu(false);
    });

    document.addEventListener('keydown', function (e) {
      if (e.key === 'Escape' && menuBtn.getAttribute('aria-expanded') === 'true') closeMenu(true);
    });

    window.addEventListener('resize', function () {
      if (window.innerWidth > 860 && menuBtn.getAttribute('aria-expanded') === 'true') closeMenu(false);
    });
  }

  /* ======================================================================
     4. Reveal on scroll
     ====================================================================== */
  if (!reduced && 'IntersectionObserver' in window) {
    var revealTargets = $$('.section__head, .hero-figure, .explorer, .chart, .table-wrap, .method__steps li, .find, .card, .skillset, .edu, .cert, .timeline__item, .contact__copy, .contact__panel, .languages');
    var io = new IntersectionObserver(function (entries) {
      entries.forEach(function (entry) {
        if (entry.isIntersecting) {
          entry.target.classList.add('is-in');
          io.unobserve(entry.target);
        }
      });
    }, { rootMargin: '160px 0px 160px 0px', threshold: 0 });

    revealTargets.forEach(function (el, i) {
      el.setAttribute('data-reveal', '');
      el.style.transitionDelay = (Math.min(i % 4, 3) * 55) + 'ms';
      io.observe(el);
    });

    // safety net: never leave content invisible — reveal everything that is
    // still hidden once the page has been interacted with for a while, or
    // before printing / saving the page
    var revealAll = function () {
      revealTargets.forEach(function (el) { el.classList.add('is-in'); });
    };
    window.addEventListener('beforeprint', revealAll);
    setTimeout(function () {
      revealTargets.forEach(function (el) {
        var r = el.getBoundingClientRect();
        if (r.top < window.innerHeight && r.bottom > 0) el.classList.add('is-in');
      });
    }, 1200);
    // if the user has never scrolled after 8s, drop the effect entirely
    var idle = setTimeout(revealAll, 8000);
    window.addEventListener('scroll', function () { clearTimeout(idle); }, { once: true, passive: true });
  }

  /* ======================================================================
     5. Ticker counters
     ====================================================================== */
  var counters = $$('[data-count]');
  function animateCount(el) {
    var target = parseFloat(el.getAttribute('data-count'));
    var suffix = el.getAttribute('data-suffix') || '';
    var sign = el.getAttribute('data-sign') || '';
    var decimals = String(target).indexOf('.') > -1 ? 1 : 0;
    var duration = 900;
    var start = null;
    function frame(now) {
      if (start === null) start = now;
      var t = Math.min(1, (now - start) / duration);
      var eased = 1 - Math.pow(1 - t, 3);
      el.textContent = sign + (target * eased).toFixed(decimals) + suffix;
      if (t < 1) requestAnimationFrame(frame);
      else el.textContent = sign + target.toFixed(decimals) + suffix;
    }
    if (target > 0) el.textContent = sign + '0' + suffix;
    requestAnimationFrame(frame);
  }
  if (counters.length && !reduced && 'IntersectionObserver' in window) {
    var countIO = new IntersectionObserver(function (entries) {
      entries.forEach(function (entry) {
        if (entry.isIntersecting) {
          animateCount(entry.target);
          countIO.unobserve(entry.target);
        }
      });
    }, { threshold: 0.6 });
    counters.forEach(function (el) {
      // the +8.1% figure already carries a sign in the markup
      countIO.observe(el);
    });
  }

  /* ======================================================================
     6. Generic segmented radios (roving tabindex + arrows)
     ====================================================================== */
  function initRadios(groupSelector, onChange) {
    $$(groupSelector).forEach(function (group) {
      var items = $$('[role="radio"]', group);
      if (!items.length) return;

      function select(item, focus) {
        items.forEach(function (other) {
          var on = other === item;
          other.setAttribute('aria-checked', on ? 'true' : 'false');
          other.tabIndex = on ? 0 : -1;
        });
        if (focus) item.focus();
        if (onChange) onChange(item);
      }

      items.forEach(function (item) {
        item.addEventListener('click', function () { select(item, false); });
        item.addEventListener('keydown', function (e) {
          var i = items.indexOf(item);
          var next = null;
          if (e.key === 'ArrowRight' || e.key === 'ArrowDown') next = items[(i + 1) % items.length];
          else if (e.key === 'ArrowLeft' || e.key === 'ArrowUp') next = items[(i - 1 + items.length) % items.length];
          else if (e.key === 'Home') next = items[0];
          else if (e.key === 'End') next = items[items.length - 1];
          if (next) { e.preventDefault(); select(next, true); }
        });
      });
    });
  }

  /* ======================================================================
     7. Hero instrument  (angle ↔ gauges ↔ canvas)
     ====================================================================== */
  var LD = {
    '9': { w1: 1.13, w2: 1.18 },
    '15': { w1: 1.64, w2: 1.62 },
    '21': { w1: 1.60, w2: 1.73 }
  };
  var MIN = 1.0, MAX = 1.8;
  var readout = $('[data-angle-readout]');
  var ldW1 = $('[data-ld-w1]');
  var ldW2 = $('[data-ld-w2]');
  var fillW1 = $('[data-fill-w1]');
  var fillW2 = $('[data-fill-w2]');
  var lastAngle = 9;

  function pct(v) { return Math.max(2, Math.min(100, ((v - MIN) / (MAX - MIN)) * 100)) + '%'; }

  function setAngle(deg) {
    var key = String(deg);
    var data = LD[key];
    if (!data) return;
    lastAngle = deg;
    if (readout) readout.textContent = 'α = ' + (deg < 10 ? '0' + deg : deg) + '.0°';
    if (ldW1) ldW1.textContent = data.w1.toFixed(2);
    if (ldW2) ldW2.textContent = data.w2.toFixed(2);
    if (fillW1) fillW1.style.width = pct(data.w1);
    if (fillW2) fillW2.style.width = pct(data.w2);
    if (window.FlowField) window.FlowField.setAngle(deg);
  }

  if ($('.instrument__controls .segmented')) {
    initRadios('.instrument__controls .segmented', function (item) {
      setAngle(parseInt(item.getAttribute('data-aoi'), 10));
    });
  }

  /* ======================================================================
     8. Field explorer (tabs + incidence)
     ====================================================================== */
  var FIELDS = {
    pathlines: {
      label: 'pathlines',
      '09': {
        a: { src: 'assets/cfd/pathlines-09-baseline.webp', w: 1000, h: 539,
             alt: 'Pathlines at 9 degrees around the baseline wing: streamlines converge at the leading edge with a small closed recirculation just above it.',
             cap: 'Small leading-edge recirculation already visible at 9°.' },
        b: { src: 'assets/cfd/pathlines-09-vg.webp', w: 907, h: 488,
             alt: 'Pathlines at 9 degrees around the vortex-generator wing: streamlines stay attached along the whole upper surface.',
             cap: 'Fully attached over the whole chord — no recirculation yet.' }
      },
      '15': {
        a: { src: 'assets/cfd/pathlines-15-baseline.webp', w: 889, h: 510,
             alt: 'Pathlines at 15 degrees around the baseline wing: the leading-edge vortex persists at a similar size.',
             cap: 'The leading-edge vortex persists, similar in size to 9°.' },
        b: { src: 'assets/cfd/pathlines-15-vg.webp', w: 895, h: 525,
             alt: 'Pathlines at 15 degrees around the vortex-generator wing: a small vortex appears for the first time.',
             cap: 'A small vortex appears here for the first time — one step later than the baseline.' }
      },
      '21': {
        a: { src: 'assets/cfd/pathlines-21-baseline.webp', w: 832, h: 525,
             alt: 'Pathlines at 21 degrees around the baseline wing: a large main vortex plus a second, smaller recirculation.',
             cap: 'Large main vortex plus a secondary recirculation: extended separation.' },
        b: { src: 'assets/cfd/pathlines-21-vg.webp', w: 923, h: 599,
             alt: 'Pathlines at 21 degrees around the vortex-generator wing: separation limited to a single contained vortex.',
             cap: 'Separation is still there, but confined to one contained vortex.' }
      }
    },
    velocity: {
      label: 'velocity magnitude',
      '09': {
        a: { src: 'assets/cfd/velocity-09-baseline.webp', w: 1000, h: 534,
             alt: 'Velocity magnitude contours at 9 degrees around the baseline wing, with a red accelerated band over the upper surface.',
             cap: 'Speed field, baseline at 9°: the low-momentum region starts to widen behind the profile.' },
        b: { src: 'assets/cfd/velocity-09-vg.webp', w: 915, h: 487,
             alt: 'Velocity magnitude contours at 9 degrees around the vortex-generator wing.',
             cap: 'Flow stays tied to the upper surface over the full chord.' }
      },
      '15': {
        a: { src: 'assets/cfd/velocity-15-baseline.webp', w: 895, h: 509,
             alt: 'Velocity magnitude contours at 15 degrees around the baseline wing.',
             cap: 'A thicker low-speed region develops over the aft upper surface.' },
        b: { src: 'assets/cfd/velocity-15-vg.webp', w: 913, h: 529,
             alt: 'Velocity magnitude contours at 15 degrees around the vortex-generator wing.',
             cap: 'Nearly superposed with the baseline — the two wings behave alike at this angle.' }
      },
      '21': {
        a: { src: 'assets/cfd/velocity-21-baseline.webp', w: 824, h: 514,
             alt: 'Velocity magnitude contours at 21 degrees around the baseline wing, showing a wide low-momentum wake.',
             cap: 'Low-momentum region spreading across the aft section.' },
        b: { src: 'assets/cfd/velocity-21-vg.webp', w: 944, h: 606,
             alt: 'Velocity magnitude contours at 21 degrees around the vortex-generator wing.',
             cap: 'More momentum retained along the upper surface despite separation.' }
      }
    },
    tke: {
      label: 'turbulent kinetic energy',
      '09': {
        a: { src: 'assets/cfd/tke-09-baseline.webp', w: 1000, h: 531,
             alt: 'Turbulent kinetic energy field at 9 degrees around the baseline wing, concentrated near the leading edge.',
             cap: 'Turbulent kinetic energy concentrates in the leading-edge shear layer.' },
        b: { src: 'assets/cfd/tke-09-vg.webp', w: 925, h: 492,
             alt: 'Turbulent kinetic energy field at 9 degrees around the vortex-generator wing.',
             cap: 'Lower k over the chord — the boundary layer is re-energised, not just stirred.' }
      },
      '15': {
        a: { src: 'assets/cfd/tke-15-baseline.webp', w: 878, h: 499,
             alt: 'Turbulent kinetic energy field at 15 degrees around the baseline wing.',
             cap: 'k stays focused near the leading edge.' },
        b: { src: 'assets/cfd/tke-15-vg.webp', w: 907, h: 527,
             alt: 'Turbulent kinetic energy field at 15 degrees around the vortex-generator wing.',
             cap: 'Similar magnitude, shifted slightly aft.' }
      },
      '21': {
        a: { src: 'assets/cfd/tke-21-baseline.webp', w: 833, h: 519,
             alt: 'Turbulent kinetic energy field at 21 degrees around the baseline wing, with a broad high-k region.',
             cap: 'The high-k region broadens as the separation grows.' },
        b: { src: 'assets/cfd/tke-21-vg.webp', w: 968, h: 620,
             alt: 'Turbulent kinetic energy field at 21 degrees around the vortex-generator wing.',
             cap: 'A more compact high-k zone, matching the smaller separated region.' }
      }
    }
  };

  // project pages live in /projects/, so prefix relative asset paths once
  var ASSET_BASE = (document.body && document.body.getAttribute('data-base')) || '';
  if (ASSET_BASE) {
    Object.keys(FIELDS).forEach(function (q) {
      Object.keys(FIELDS[q]).forEach(function (a) {
        ['a', 'b'].forEach(function (k) {
          var item = FIELDS[q][a][k];
          if (item && item.src) item.src = ASSET_BASE + item.src;
        });
      });
    });
  }

  var explore = { quantity: 'pathlines', angle: '09' };
  var imgA = $('#field-img-a');
  var imgB = $('#field-img-b');
  var capA = $('#field-cap-a');
  var capB = $('#field-cap-b');
  var panel = $('#panel-fields');
  var status = $('[data-explorer-status]');
  var fieldFrames = $$('.field__frame');

  function renderFields() {
    var set = FIELDS[explore.quantity] && FIELDS[explore.quantity][explore.angle];
    if (!set || !imgA || !imgB) return;
    [[imgA, set.a, capA], [imgB, set.b, capB]].forEach(function (pair) {
      var img = pair[0], data = pair[1], cap = pair[2];
      if (img.getAttribute('src') !== data.src) {
        img.setAttribute('src', data.src);
        img.setAttribute('width', data.w);
        img.setAttribute('height', data.h);
      }
      img.setAttribute('alt', data.alt);
      if (cap) cap.textContent = data.cap;
    });
    $$('.field__frame', panel).forEach(function (btn, i) {
      var data = i === 0 ? set.a : set.b;
      btn.setAttribute('aria-label', 'Enlarge ' + (i === 0 ? 'baseline' : 'vortex-generator') + ' ' + FIELDS[explore.quantity].label + ' image at ' + parseInt(explore.angle, 10) + ' degrees');
      btn.setAttribute('data-caption', data.cap);
      btn.setAttribute('data-src', data.src);
      btn.setAttribute('data-alt', data.alt);
    });
    if (status) {
      status.textContent = 'Showing ' + FIELDS[explore.quantity].label + ' at ' + parseInt(explore.angle, 10) + '° incidence.';
    }
  }

  // tabs
  var tabs = $$('.tab');
  function activateTab(tab, focus) {
    tabs.forEach(function (t) {
      var on = t === tab;
      t.setAttribute('aria-selected', on ? 'true' : 'false');
      t.tabIndex = on ? 0 : -1;
    });
    if (focus) tab.focus();
    explore.quantity = tab.getAttribute('data-quantity');
    if (panel) panel.setAttribute('aria-labelledby', tab.id);
    renderFields();
  }
  tabs.forEach(function (tab) {
    tab.addEventListener('click', function () { activateTab(tab, false); });
    tab.addEventListener('keydown', function (e) {
      var i = tabs.indexOf(tab), next = null;
      if (e.key === 'ArrowRight') next = tabs[(i + 1) % tabs.length];
      else if (e.key === 'ArrowLeft') next = tabs[(i - 1 + tabs.length) % tabs.length];
      else if (e.key === 'Home') next = tabs[0];
      else if (e.key === 'End') next = tabs[tabs.length - 1];
      if (next) { e.preventDefault(); activateTab(next, true); }
    });
  });

  initRadios('.explorer .segmented', function (item) {
    explore.angle = item.getAttribute('data-panel-aoi');
    renderFields();
  });

  renderFields();

  /* ======================================================================
     9. Lightbox
     ====================================================================== */
  var dialog = $('#lightbox');
  var dialogImg = $('#lightbox-img');
  var dialogCap = $('#lightbox-caption');
  var triggerEl = null;
  var galleryIndex = 0;

  function gallery() {
    var items = [];
    var heroZoom = $('[data-zoom]');
    if (heroZoom) {
      items.push({
        src: heroZoom.getAttribute('data-zoom'),
        alt: 'Streamlines around the vortex-generator wing at 21 degrees of incidence.',
        cap: heroZoom.getAttribute('data-zoom-caption')
      });
    }
    var set = FIELDS[explore.quantity] && FIELDS[explore.quantity][explore.angle];
    if (set) {
      items.push({ src: set.a.src, alt: set.a.alt, cap: 'Wing 1, baseline — ' + FIELDS[explore.quantity].label + ' at ' + parseInt(explore.angle, 10) + '°. ' + set.a.cap });
      items.push({ src: set.b.src, alt: set.b.alt, cap: 'Wing 2, vortex generators — ' + FIELDS[explore.quantity].label + ' at ' + parseInt(explore.angle, 10) + '°. ' + set.b.cap });
    }
    return items;
  }

  function paint(index) {
    var items = gallery();
    if (!items.length) return;
    galleryIndex = (index + items.length) % items.length;
    var item = items[galleryIndex];
    dialogImg.setAttribute('src', item.src);
    dialogImg.setAttribute('alt', item.alt);
    dialogCap.textContent = item.cap;
  }

  function openLightbox(index, trigger) {
    if (!dialog || !dialog.showModal) return;
    triggerEl = trigger || null;
    paint(index);
    dialog.showModal();
    var closeBtn = dialog.querySelector('[data-lightbox-close]');
    if (closeBtn) closeBtn.focus();
  }

  if (dialog) {
    // hero figure
    var heroZoomBtn = $('[data-zoom]');
    if (heroZoomBtn) {
      heroZoomBtn.addEventListener('click', function () { openLightbox(0, heroZoomBtn); });
    }
    // explorer frames
    fieldFrames.forEach(function (btn, i) {
      btn.addEventListener('click', function () { openLightbox(i + 1, btn); });
    });

    dialog.addEventListener('click', function (e) {
      if (e.target === dialog) dialog.close();
    });
    dialog.addEventListener('close', function () {
      if (triggerEl && typeof triggerEl.focus === 'function') triggerEl.focus();
    });
    var closeBtn = dialog.querySelector('[data-lightbox-close]');
    if (closeBtn) closeBtn.addEventListener('click', function () { dialog.close(); });
    var prev = dialog.querySelector('[data-lightbox-prev]');
    var next = dialog.querySelector('[data-lightbox-next]');
    if (prev) prev.addEventListener('click', function () { paint(galleryIndex - 1); });
    if (next) next.addEventListener('click', function () { paint(galleryIndex + 1); });
    dialog.addEventListener('keydown', function (e) {
      if (e.key === 'ArrowLeft') { e.preventDefault(); paint(galleryIndex - 1); }
      if (e.key === 'ArrowRight') { e.preventDefault(); paint(galleryIndex + 1); }
    });
  }

  /* ======================================================================
     10. Copy e-mail
     ====================================================================== */
  $$('[data-copy]').forEach(function (btn) {
    var label = btn.querySelector('[data-copy-label]');
    var use = btn.querySelector('use');
    var original = label ? label.textContent : '';
    var timer = 0;

    function fallbackCopy(text) {
      var ta = document.createElement('textarea');
      ta.value = text;
      ta.setAttribute('readonly', '');
      ta.style.position = 'fixed';
      ta.style.opacity = '0';
      document.body.appendChild(ta);
      ta.select();
      var ok = false;
      try { ok = document.execCommand('copy'); } catch (err) { ok = false; }
      document.body.removeChild(ta);
      return ok;
    }

    btn.addEventListener('click', function () {
      var text = btn.getAttribute('data-copy');
      var done = function (ok) {
        if (!ok) return;
        if (label) label.textContent = 'Copied';
        if (use) use.setAttribute('href', '#i-check');
        clearTimeout(timer);
        timer = setTimeout(function () {
          if (label) label.textContent = original;
          if (use) use.setAttribute('href', '#i-copy');
        }, 2200);
      };
      if (navigator.clipboard && navigator.clipboard.writeText) {
        navigator.clipboard.writeText(text).then(function () { done(true); }, function () { done(fallbackCopy(text)); });
      } else {
        done(fallbackCopy(text));
      }
    });
  });

  /* ======================================================================
     11. Year
     ====================================================================== */
  $$('[data-year]').forEach(function (el) { el.textContent = new Date().getFullYear(); });

  /* ======================================================================
     12. Redraw canvas after fonts settle (first paint sizing)
     ====================================================================== */
  if (document.fonts && document.fonts.ready) {
    document.fonts.ready.then(function () {
      if (window.FlowField) window.FlowField.refresh();
    });
  }

  // keep canvas honest when the viewport changes orientation
  window.addEventListener('orientationchange', function () {
    setTimeout(function () { if (window.FlowField) window.FlowField.refresh(); }, 260);
  });
})();

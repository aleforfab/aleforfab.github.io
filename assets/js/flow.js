/* ==========================================================================
   flow.js: potential-flow (Joukowski) streamline illustration
   --------------------------------------------------------------------------
   A textbook inviscid construction used purely as a visual: a Joukowski-
   transformed profile with the Kutta condition applied and rotated to the
   selected incidence. It is NOT a reproduction of the Ansys Fluent study:
   every number shown in the UI comes from that study.

   Body frame (ζ-plane, cylinder of radius R centred at μ, chord c):
     ζ(x)  = x + c² / x                                  (Joukowski map)
     F(ζ)  = U(ζ e^{-iα} + R² e^{iα} / ζ) + iΓ ln(ζ) / 2π
     Γ     = 4π U R sin(α + β),  β = asin(Im μ / R)       (Kutta condition)
     V     = (dF/dζ) / (1 − c²/ζ²)
   ========================================================================== */
(function () {
  'use strict';

  var canvas = document.getElementById('flow-canvas');
  if (!canvas || !canvas.getContext) return;

  var ctx = canvas.getContext('2d');
  var motionQuery = window.matchMedia('(prefers-reduced-motion: reduce)');

  /* ---------- reference profile ---------- */
  var C = 1.0;
  var MU = { re: -0.12, im: 0.08 };
  var R = Math.hypot(C - MU.re, MU.im);
  var BETA = Math.asin(MU.im / R);
  var U = 1.0;

  var state = {
    angle: 9,
    lines: [],
    geom: null,
    chord: null,
    width: 0,
    height: 0,
    dpr: 1,
    scale: 1,
    ox: 0,
    oy: 0,
    view: { left: -2.4, right: 2.4, bottom: -0.8, top: 0.8 },
    particles: [],
    raf: 0,
    last: 0,
    running: false,
    inView: true
  };

  /* ---------- complex helpers ---------- */
  function cdiv(a, b) {
    var d = b.re * b.re + b.im * b.im;
    return { re: (a.re * b.re + a.im * b.im) / d, im: (a.im * b.re - a.re * b.im) / d };
  }
  function cabs(a) { return Math.hypot(a.re, a.im); }
  function rot(v, ang) {
    var c = Math.cos(ang), s = Math.sin(ang);
    return { re: v.re * c - v.im * s, im: v.re * s + v.im * c };
  }
  function csqrt(a) {
    var r = Math.hypot(a.re, a.im);
    var re = Math.sqrt(Math.max(0, (r + a.re) / 2));
    var im = Math.sqrt(Math.max(0, (r - a.re) / 2)) * (a.im < 0 ? -1 : 1);
    return { re: re, im: im };
  }

  /* circle plane → body frame */
  function jouk(zeta) {
    var inv = cdiv({ re: C * C, im: 0 }, zeta);
    return { re: zeta.re + inv.re, im: zeta.im + inv.im };
  }

  /* body frame → circle plane (exterior pre-image) */
  function joukInverse(w) {
    var disc = { re: w.re * w.re - w.im * w.im - 4 * C * C, im: 2 * w.re * w.im };
    var s = csqrt(disc);
    var z1 = { re: (w.re + s.re) / 2, im: (w.im + s.im) / 2 };
    var z2 = { re: (w.re - s.re) / 2, im: (w.im - s.im) / 2 };
    return Math.hypot(z1.re, z1.im) >= Math.hypot(z2.re, z2.im) ? z1 : z2;
  }

  /* complex velocity (u − i v) in the body plane */
  function velocityBody(zeta, alpha) {
    var gamma = 4 * Math.PI * U * R * Math.sin(alpha + BETA);
    var z2 = { re: zeta.re * zeta.re - zeta.im * zeta.im, im: 2 * zeta.re * zeta.im };
    var eNeg = { re: Math.cos(alpha), im: -Math.sin(alpha) };
    var ePos = { re: Math.cos(alpha), im: Math.sin(alpha) };
    var term = cdiv({ re: R * R * ePos.re, im: R * R * ePos.im }, z2);
    var dFdz = { re: U * (eNeg.re - term.re), im: U * (eNeg.im - term.im) };

    var invZeta = cdiv({ re: 1, im: 0 }, zeta);
    dFdz.re += (-gamma / (2 * Math.PI)) * invZeta.im;
    dFdz.im += (gamma / (2 * Math.PI)) * invZeta.re;

    var c2 = cdiv({ re: C * C, im: 0 }, z2);
    var dWdZ = { re: 1 - c2.re, im: -c2.im };
    if (cabs(dWdZ) < 1e-9) return { re: 0, im: 0 };
    return cdiv(dFdz, dWdZ);
  }

  /* ---------- geometry ---------- */
  function buildGeometry(alpha) {
    var outline = [];
    for (var k = 0; k <= 280; k++) {
      var th = (k / 280) * Math.PI * 2;
      var z = { re: MU.re + R * Math.cos(th), im: MU.im + R * Math.sin(th) };
      outline.push(rot(jouk(z), -alpha));
    }
    var dir = { re: (C - MU.re) / R, im: -MU.im / R };
    var te = { re: C, im: 0 };
    var le = { re: MU.re - R * dir.re, im: MU.im - R * dir.im };
    return {
      outline: outline,
      chord: [rot(jouk(te), -alpha), rot(jouk(le), -alpha)]
    };
  }

  /* ---------- camera ---------- */
  function fit(w, h, geom) {
    var minX = Infinity, maxX = -Infinity, minY = Infinity, maxY = -Infinity;
    geom.outline.forEach(function (p) {
      if (p.re < minX) minX = p.re;
      if (p.re > maxX) maxX = p.re;
      if (p.im < minY) minY = p.im;
      if (p.im > maxY) maxY = p.im;
    });
    var spanX = Math.max(0.6, maxX - minX);
    var spanY = Math.max(0.2, maxY - minY);
    var cx = (minX + maxX) / 2;
    var cy = (minY + maxY) / 2;

    // the profile takes roughly 46% of the width and 50% of the height
    var scale = Math.min(w / (spanX / 0.46), h / (spanY / 0.50));

    state.scale = scale;
    state.ox = w / 2 - cx * scale;
    state.oy = h / 2 + cy * scale;
    state.width = w;
    state.height = h;
    state.view = {
      left: -state.ox / scale,
      right: (w - state.ox) / scale,
      top: state.oy / scale,
      bottom: (state.oy - h) / scale
    };
    state.chord = geom.chord;
    state.geom = geom;
  }

  function toPx(p) {
    return { x: state.ox + p.re * state.scale, y: state.oy - p.im * state.scale };
  }

  /* ---------- streamlines ---------- */
  function traceStreamlines(alpha) {
    var view = state.view;
    var span = view.top - view.bottom;
    var cx = (view.left + view.right) / 2;
    var left = view.left - (view.right - view.left) * 0.12;
    var right = view.right + (view.right - view.left) * 0.12;
    var top = view.top + span * 0.15;
    var bottom = view.bottom - span * 0.15;
    var mid = (top + bottom) / 2;
    var half = (top - bottom) / 2;

    var N = 27;
    var seeds = [];
    for (var i = 0; i < N; i++) {
      var u = (i / (N - 1)) * 2 - 1;
      var bias = Math.sign(u) * Math.pow(Math.abs(u), 1.45);
      seeds.push(mid + bias * half);
    }

    var step = Math.min(0.02, (view.right - view.left) / 320);
    var maxSteps = Math.ceil(((right - left) * 7) / step);
    var cosA = Math.cos(-alpha), sinA = Math.sin(-alpha);
    var lines = [];

    seeds.forEach(function (yStart) {
      var pts = [];
      var p = { re: left, im: yStart };
      for (var s = 0; s < maxSteps; s++) {
        var bw = rot(p, alpha);
        var zeta = joukInverse(bw);
        if (Math.hypot(zeta.re - MU.re, zeta.im - MU.im) < R * 1.002) break;

        var v = velocityBody(zeta, alpha);
        var vxBody = v.re, vyBody = -v.im;
        var vx = vxBody * cosA - vyBody * sinA;
        var vy = vxBody * sinA + vyBody * cosA;
        var mag = Math.hypot(vx, vy);
        if (!isFinite(mag) || mag < 1e-3) break;

        pts.push({ re: p.re, im: p.im });
        p = { re: p.re + (vx / mag) * step, im: p.im + (vy / mag) * step };

        if (p.re > right || p.im > top || p.im < bottom) break;
      }
      if (pts.length > 14) lines.push(pts);
    });

    return lines;
  }

  /* ---------- particles ---------- */
  function withArcLengths(lines) {
    return lines.map(function (pts) {
      var cum = [0];
      var total = 0;
      for (var i = 1; i < pts.length; i++) {
        total += Math.hypot(pts[i].re - pts[i - 1].re, pts[i].im - pts[i - 1].im);
        cum.push(total);
      }
      return { pts: pts, cum: cum, total: total };
    });
  }

  function seedParticles() {
    var list = [];
    state.lines.forEach(function (line, idx) {
      if (line.total < 0.4) return;
      var count = line.total > 4 ? 2 : 1;
      for (var k = 0; k < count; k++) {
        list.push({ line: idx, s: Math.random() * line.total, speed: 0.6 + Math.random() * 0.55 });
      }
    });
    state.particles = list;
  }

  function posAt(line, s) {
    var cum = line.cum, pts = line.pts;
    var lo = 0, hi = cum.length - 1;
    while (lo < hi - 1) {
      var mid = (lo + hi) >> 1;
      if (cum[mid] <= s) lo = mid; else hi = mid;
    }
    var span = cum[hi] - cum[lo] || 1;
    var t = (s - cum[lo]) / span;
    return {
      re: pts[lo].re + (pts[hi].re - pts[lo].re) * t,
      im: pts[lo].im + (pts[hi].im - pts[lo].im) * t
    };
  }

  /* ---------- drawing ---------- */
  function draw(now, staticOnly) {
    var w = state.width, h = state.height;
    if (!w || !h || !state.geom) return;

    ctx.setTransform(state.dpr, 0, 0, state.dpr, 0, 0);
    ctx.clearRect(0, 0, w, h);

    // instrument grid
    ctx.save();
    ctx.strokeStyle = 'rgba(255,255,255,0.033)';
    ctx.lineWidth = 1;
    var gridStep = 44;
    for (var gx = (w / 2) % gridStep; gx < w; gx += gridStep) {
      ctx.beginPath(); ctx.moveTo(gx + 0.5, 0); ctx.lineTo(gx + 0.5, h); ctx.stroke();
    }
    for (var gy = (h / 2) % gridStep; gy < h; gy += gridStep) {
      ctx.beginPath(); ctx.moveTo(0, gy + 0.5); ctx.lineTo(w, gy + 0.5); ctx.stroke();
    }
    ctx.restore();

    // streamlines
    ctx.save();
    ctx.strokeStyle = 'rgba(156,184,224,0.36)';
    ctx.lineWidth = 1.05;
    ctx.lineCap = 'round';
    ctx.lineJoin = 'round';
    state.lines.forEach(function (line) {
      ctx.beginPath();
      for (var i = 0; i < line.pts.length; i++) {
        var p = toPx(line.pts[i]);
        if (i === 0) ctx.moveTo(p.x, p.y);
        else ctx.lineTo(p.x, p.y);
      }
      ctx.stroke();
    });
    ctx.restore();

    // airfoil body
    var outline = state.geom.outline;
    if (outline && outline.length) {
      ctx.save();
      ctx.beginPath();
      for (var i = 0; i < outline.length; i++) {
        var p = toPx(outline[i]);
        if (i === 0) ctx.moveTo(p.x, p.y);
        else ctx.lineTo(p.x, p.y);
      }
      ctx.closePath();
      var grad = ctx.createLinearGradient(0, 0, 0, h);
      grad.addColorStop(0, '#121a26');
      grad.addColorStop(0.5, '#0b111a');
      grad.addColorStop(1, '#0d1520');
      ctx.fillStyle = grad;
      ctx.fill();
      ctx.strokeStyle = 'rgba(150,190,255,0.9)';
      ctx.lineWidth = 1.7;
      ctx.lineJoin = 'round';
      ctx.stroke();
      ctx.restore();
    }

    // chord reference
    if (state.chord) {
      var a = toPx(state.chord[0]);
      var b = toPx(state.chord[1]);
      var dx = b.x - a.x, dy = b.y - a.y;
      var len = Math.hypot(dx, dy) || 1;
      ctx.save();
      ctx.setLineDash([4, 7]);
      ctx.strokeStyle = 'rgba(140,182,255,0.4)';
      ctx.lineWidth = 1;
      ctx.beginPath();
      ctx.moveTo(a.x + (dx / len) * 22, a.y + (dy / len) * 22);
      ctx.lineTo(b.x - (dx / len) * 22, b.y - (dy / len) * 22);
      ctx.stroke();
      ctx.restore();
    }

    // travelling particles
    if (!staticOnly && !motionQuery.matches) {
      ctx.save();
      ctx.lineCap = 'round';
      state.particles.forEach(function (pt) {
        var line = state.lines[pt.line];
        if (!line || pt.s > line.total) return;
        var fade = Math.min(1, Math.min(pt.s, line.total - pt.s) / 0.4);
        ctx.beginPath();
        for (var k = 0; k < 5; k++) {
          var s = pt.s - k * 0.024;
          if (s < 0) break;
          var q = posAt(line, s);
          var px = toPx(q);
          if (k === 0) ctx.moveTo(px.x, px.y);
          else ctx.lineTo(px.x, px.y);
        }
        ctx.strokeStyle = 'rgba(188,214,255,' + 0.55 * fade + ')';
        ctx.lineWidth = 1.7;
        ctx.stroke();
        var head = toPx(posAt(line, pt.s));
        ctx.beginPath();
        ctx.arc(head.x, head.y, 1.35, 0, Math.PI * 2);
        ctx.fillStyle = 'rgba(220,236,255,' + 0.85 * fade + ')';
        ctx.fill();
      });
      ctx.restore();
    }
  }

  /* ---------- loop ---------- */
  function tick(now) {
    if (!state.running) return;
    var dt = Math.min(0.05, (now - (state.last || now)) / 1000);
    state.last = now;

    state.particles.forEach(function (pt) {
      var line = state.lines[pt.line];
      if (!line) return;
      pt.s += dt * pt.speed * 1.25;
      if (pt.s > line.total) {
        pt.s = 0;
        pt.speed = 0.6 + Math.random() * 0.55;
      }
    });

    draw(now, false);
    state.raf = requestAnimationFrame(tick);
  }

  function start() {
    if (state.running || motionQuery.matches || !state.inView || document.hidden) return;
    state.running = true;
    state.last = performance.now();
    state.raf = requestAnimationFrame(tick);
  }

  function stop() {
    state.running = false;
    if (state.raf) cancelAnimationFrame(state.raf);
    state.raf = 0;
  }

  /* ---------- build / relayout ---------- */
  function layout(resetParticles) {
    var rect = canvas.getBoundingClientRect();
    if (!rect.width || !rect.height) return;

    var dpr = Math.min(window.devicePixelRatio || 1, 2);
    state.dpr = dpr;
    canvas.width = Math.round(rect.width * dpr);
    canvas.height = Math.round(rect.height * dpr);

    var alpha = (state.angle * Math.PI) / 180;
    var geom = buildGeometry(alpha);
    fit(rect.width, rect.height, geom);
    state.lines = withArcLengths(traceStreamlines(alpha));

    if (resetParticles || !state.particles.length) seedParticles();
    draw(performance.now(), true);
  }

  /* ---------- public API ---------- */
  window.FlowField = {
    setAngle: function (deg) {
      state.angle = deg;
      if (state.width) layout(false);
    },
    refresh: function () { if (state.width) layout(false); }
  };

  /* ---------- wiring ---------- */
  var resizeTimer = 0;
  window.addEventListener('resize', function () {
    clearTimeout(resizeTimer);
    resizeTimer = setTimeout(function () { layout(false); }, 140);
  });

  if ('IntersectionObserver' in window) {
    new IntersectionObserver(function (entries) {
      entries.forEach(function (entry) {
        state.inView = entry.isIntersecting;
        if (state.inView) start(); else stop();
      });
    }, { threshold: 0.05 }).observe(canvas);
  } else {
    state.inView = true;
  }

  document.addEventListener('visibilitychange', function () {
    if (document.hidden) stop(); else start();
  });

  if (motionQuery.addEventListener) {
    motionQuery.addEventListener('change', function () {
      if (motionQuery.matches) { stop(); draw(performance.now(), true); }
      else start();
    });
  }

  layout(true);
  if (motionQuery.matches) draw(performance.now(), true);
  else start();
})();

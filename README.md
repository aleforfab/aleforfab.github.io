# Engineering Portfolio — Alexandre Fortin-Fabbro

Static, dependency-free portfolio for a Global Engineering student at
**McGill University × CentraleSupélec** working on numerical simulation,
CFD aerodynamics and multiphysics modelling.

Live: <https://aleforfab.github.io/>

---

## What's here

| Path | Contents |
| --- | --- |
| `index.html` | The whole site: hero, flagship CFD study, work, toolkit, credentials, experience, contact. No framework, no build step. |
| `assets/css/main.css` | Design tokens, layout, components, responsive and reduced-motion rules. |
| `assets/js/flow.js` | Interactive potential-flow (Joukowski) streamline panel drawn on `<canvas>`. |
| `assets/js/main.js` | Navigation, scroll spy, field explorer, lightbox, counters, copy-to-clipboard. |
| `assets/cfd/*.webp` | Figures cropped out of the CFD report: pathlines, velocity and turbulence fields for both wings at 9°, 15° and 21°. |
| `assets/fonts/*.woff2` | Self-hosted variable fonts (Space Grotesk, Inter, JetBrains Mono) — no third-party font request. |
| `assets/docs/Alexandre_Fortin_Fabbro_CV.pdf` | One-page CV, served from the Résumé links. |
| `etude-aerodynamique-cfd.pdf` | The 10-page CFD technical report (French). |

## Featured study

**Vortex generators vs. deep stall** — the same wing profile solved twice (clean
and with boundary-layer vortex generators) at 9°, 15° and 21° incidence in
Ansys Discovery → Meshing → Fluent 2026 R1.

Measured finesse (lift ÷ drag) from the Fluent force reports:

| Configuration | Lift (mN) | Drag (mN) | L/D |
| --- | --- | --- | --- |
| Wing 1 — 9° | 0.763 | 0.674 | 1.13 |
| Wing 1 — 15° | 1.402 | 0.856 | 1.64 |
| Wing 1 — 21° | 1.782 | 1.113 | 1.60 |
| Wing 2 — 9° | 0.803 | 0.681 | 1.18 |
| Wing 2 — 15° | 1.385 | 0.857 | 1.62 |
| Wing 2 — 21° | 1.992 | 1.153 | **1.73** (+8.1%) |

## Design notes

- **Direction:** Swiss/technical editorial on a dark instrument panel. Star-white
  type, launch-blue accent for the baseline wing, amber for the vortex-generator
  wing so the site and the report use the same two-series colour code.
- **Type:** Space Grotesk (display), Inter (body), JetBrains Mono (data, labels,
  section indices).
- **Hero visual:** the streamline panel is a real-time Joukowski transform with
  the Kutta condition applied — a mathematical illustration that animates with
  the selected incidence. It is labelled as an illustration, *not* as the Ansys
  mesh, and every number next to it comes from the measured study.
- **Accessibility:** semantic landmarks, visible focus rings, 44 px touch
  targets, tab/radio keyboard patterns, `aria-live` status for the field
  explorer, dialog focus return, AA-or-better text contrast, `prefers-reduced-motion`
  and forced-colours support.
- **Performance:** no external requests (fonts are local), WebP figures, lazy
  decoding, canvas animation paused off-screen and with reduced motion.

## Local development

```bash
python3 -m http.server 8000
# then open http://localhost:8000
```

Deployment is GitHub Pages from the repository root (`.nojekyll` is present so
the `assets/` folder is served as-is).

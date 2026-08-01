# Design System — Hexcast

Bespoke, premium, deeply human. Explicitly engineered to avoid the generic
"AI website look": no Inter, no purple gradients, no bento grids, no glassmorphism.

## 1. Anti-AI Typography Architecture

- **Editorial-Tech pairing.** High-contrast combination of a sharp, geometric
  mono/technical face with a premium editorial treatment.
- **Technical stack:** `Geist Mono`, `JetBrains Mono`, or system mono
  (`SF Mono`, `Menlo`, `Consolas`). Ultra-tight tracking (`-0.05em`), low
  weight (Light/Medium). Used for display-scale technical text.
- **Editorial headings:** high-contrast serif or razor-sharp grotesque —
  `Playfair Display`, `Cormorant Garamond`, or `font-serif` system fallback.
  Paired with clean, microscopic labels.
- **Micro-labels:** utility text strictly 11px uppercase, tracking
  `0.15em`–`0.25em`.

## 2. Asymmetrical Surfacing & Layout

- **No bento grids.** Symmetrical rounded boxes are banned. Use asymmetrical
  container structures and borderless raw-text divisions separated by
  razor-thin 1px lines.
- **Monochrome discipline.** Strict palette only:
  - deep charcoal `#0a0a0a`
  - muted ash `#161616`
  - raw slate `#222222`
  - true chalk-white `#f9f9f9`
  - No neon-purple or blue glow gradients, ever.

## 3. Analog Textures & Structural Depth

- **Organic noise/film.** Ultra-subtle SVG noise texture or CSS fine-grain grid
  overlay across the background to disrupt flat digital rendering.
- **Hard shadows only.** Never large blurred drop shadows. Use sharp, layered
  offsetting borders:
  `box-shadow: 1px 1px 0 rgba(255,255,255,0.1), 2px 2px 0 rgba(0,0,0,1)`

## Motion Engine

Fluid, heavy, intentional, physics-based. Never `ease-in-out` or `linear`.

- **Curve matrix**
  - Cinematic entrance: `cubic-bezier(0.16, 1, 0.3, 1)` @ 600–800ms
  - Tactile snap: `cubic-bezier(0.25, 1, 0.5, 1)` @ 200ms
  - Elastic retract (press/scale-down): `cubic-bezier(0.36, 0.07, 0.19, 0.97)` @ 150ms
- **Micro-press:** every clickable compresses to `scale(0.97)` + `opacity: 0.85`.
- **Border glides:** utility containers fade their 1px border from
  `rgba(249,249,249,0.02)` → `0.15` on hover.
- **Layout mounting:** views mount from `opacity: 0, translateY(15px)` to neutral,
  700ms cinematic, `animation-fill-mode: backwards`.
- **Staggering:** list/PIN elements cascade with `index * 40ms` delay.
  Room-code digits reveal individually; pairing steps cascade.
- **Data smoothing:** status strings roll vertically on change (`RollText`,
  450ms cinematic); PIN digits `digit-in`.
- **GPU:** `will-change: transform, opacity` on all animated surfaces.
- Respect `prefers-reduced-motion`.

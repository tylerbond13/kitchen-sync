# Aesthetic & Art Direction

> This is the part that **cannot be messed up.** Mechanics can be retuned after
> launch; a muddy, inconsistent look cannot. Every asset we generate and every
> pixel we draw answers to this doc.

## The one-line vision

> A **storybook patisserie** — ornate, gilded, pastel, and edible-looking — seen
> from a clean three-quarter-top-down angle, where every surface looks good
> enough to eat and every cake is a tiny jewel.

Reference touchstones: *Cake Mania*'s warm bakery coziness, the ornate gold-and-
pastel render in the Cake World vision image, and the readable top-down clarity
of *Overcooked*. The vision render (purple→mint gradient wall, gilded ovens,
piping-bottle icing console, glass display cases, heart motifs) **is** the target
— match its materials and palette exactly.

## Palette

The whole world lives in a **soft pastel + warm gold** family. Saturation stays
gentle; contrast comes from the gold linework and the cakes themselves.

| Role | Colour | Notes |
|---|---|---|
| Frosting pink | `#F7C9DD` / `#FF9EC4` | primary furniture top, hearts |
| Mint | `#Bfe6da` / `#9ED9C6` | cabinet panels, accents |
| Lavender | `#C9B6E4` / `#B79AD6` | background wall, shadows |
| Buttercream | `#FbeFd9` / `#F3E4C7` | counters, board surfaces |
| Gilded gold | `#E8B84B` / `#C9912F` | **all** ornate trim & linework |
| Berry accent | `#D14B7A` | strawberries, ruby roses, danger states |
| Ink (text/UI) | `#3A2440` | soft dark plum, never pure black |

**Rule:** no pure white, no pure black, no flat grey. Whites are buttercream;
darks are deep plum/chocolate. This is what makes it read "edible," not "office."

## Materials & linework

- **Gilded outlines** on every piece of furniture — the scrollwork gold frame is
  the signature. It's what ties the ovens, sink, trash, and display cases into
  one family.
- **Soft, painted shading** (not cel-shaded, not photoreal). Gentle gradients,
  a soft drop shadow under every object so nothing floats.
- **Glossy highlights** on icing, glaze, and marble tops — the "wet/sugary"
  sheen is a big part of the appeal.
- **Heart motif** as the recurring decorative stamp (already in the vision art —
  on cabinet panels, the trash can gem, etc.). Use it sparingly as a signature.

## Camera & projection

- **Straight-on front views** for stations (the current engine draws station
  sprites front-facing with `flat: true`; left/right are 90° rotations, not
  three-quarter angles). Keep generating front/left/right per station so we have
  orientation options, but **front is the hero**.
- Characters are slightly oversized vs. furniture (already true: customers draw
  larger than the chef) — keep that storybook charm.
- The **board** is a flat painted surface (herringbone parquet + frosting trim)
  set as the play-area background; stations and chefs draw on top. The wall/
  backdrop is the cake-gradient render. (Both already wired from the first
  re-skin.)

## Consistency checklist (every asset must pass)

- [ ] Gilded gold linework present and the same weight/temperature as siblings.
- [ ] Pastel palette only; no pure white/black/grey.
- [ ] Soft contact shadow baked in OR clean transparent edge for the engine to
      shadow.
- [ ] Transparent background (RGBA), trimmed-friendly (content centered, even
      margin) — the loader trims to content, so don't crop tight.
- [ ] Reads clearly at ~120px (the size it's actually drawn) — detail that
      disappears at small size is wasted; silhouette and colour-blocking matter
      more than fine filigree.
- [ ] Same light direction (top-left key light) as the rest of the set.

## Cakes are the stars

The five signature cakes (see [recipes.md](recipes.md)) get the most art love.
Each needs to be **instantly recognizable as a tiny jewel** and distinct from the
others by *silhouette and colour* alone (so players reading order tickets at a
glance never confuse them):

- Royal Ruby Rose → tiered **pink** with red roses.
- Golden Honeycomb → **golden-yellow** with amber shards + honey drip.
- Midnight Espresso → glossy **dark chocolate** with gold leaf.
- Matcha Forest → mossy **green** with white-chocolate curls.
- Blueberry Galaxy → **deep purple/blue** mirror glaze with silver sparkle.

That's a deliberate rainbow: pink / gold / brown / green / purple. No two cakes
share a colour family, which keeps tickets readable and the display case looking
like a candy box.

## What "polished, real game" means here (juice)

The look isn't just static art — it's motion and feedback. The aesthetic budget
includes (detailed in [open-questions.md](open-questions.md)):

- Idle micro-animation on stations (oven flames flicker, icing bottles bubble).
- A satisfying **serve burst** (sparkles + coin pop + soft chime) at the window.
- The **oven "ding"** and a visible timer ring that goes amber→red.
- Customer patience as a sugar-pink bar that drains to berry-red.
- Steam off the oven, a little icing-squeeze animation, glitter shimmer on the
  galaxy cake.

If it doesn't feel *delightful* to serve a cake, we're not done.

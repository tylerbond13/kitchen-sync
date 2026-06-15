# Assets to Generate

The shopping list for the image-gen tool, ordered by what unblocks the soonest
phase. Hand this list (plus [aesthetic.md](aesthetic.md)) to ChatGPT/Codex image
gen. Everything follows the same spec so the set stays cohesive.

## Universal spec (every asset)

- **Format:** PNG, RGBA, **transparent background**. The game's loader trims to
  content and keys flat backgrounds, so leave even margin and don't crop tight.
- **Size:** square **1024×1024** source is ideal; the build downscales sprites to
  512 max. Backgrounds/boards can be wider (the cake wall is 3048×1408).
- **Angle:** straight-on **front** view for stations (hero). Optionally also
  **left** and **right** (true 90° rotations, not 3/4 angles) — the engine
  supports orientation variants.
- **Style:** storybook patisserie — gilded gold linework, soft pastel palette, no
  pure white/black/grey, glossy sugary highlights, top-left light, soft contact
  shadow. See [aesthetic.md](aesthetic.md) for the palette and checklist.
- **Naming:** keep the existing convention, `ks-cw-<thing>-<view>-v#.png`
  (e.g. `ks-cw-mixing-bowl-front-v1.png`).

## ✅ Already generated (from the first re-skin)

These exist in `public/assets/images/cake-world/` and are wired or wire-ready:

- Counter, cutting board (single + dual), oven (dual), serving/delivery counter,
  plate stack, single dish/plate, trash can, dishwashing/sink, display stand,
  ornate benches (single/double/triple) — each in front/left/right.
- Board background (herringbone parquet + frosting trim) and the cake-gradient
  screen backdrop.

## 🧁 Station art — arrived vs. still needed

A big batch landed. Status as of the latest asset sweep (140 source files):

| Station | Source asset | Status |
|---|---|---|
| Oven | `ks-cw-dual-cake-oven-station` | ✅ arrived · **live** (wired to `oven`) |
| Cutting/prep board | `ks-cw-cutting-prep-station` | ✅ arrived · **live** (wired to `chopping_board`) |
| Serving window | `ks-cw-delivery-arch-counter` | ✅ arrived · **live** (wired to `serve_window`) |
| Counter | `ks-cw-empty-single-countertop` | ✅ arrived · **live** (wired to `counter`) |
| Plate stack | `ks-cw-stack-dishes` | ✅ arrived · **live** |
| Clean plate | `ks-cw-single-dish` | ✅ arrived · **live** |
| Trash | `ks-cw-trash-can` | ✅ arrived · **live** |
| Sink | `ks-cw-dishwashing-station` | ✅ arrived · **live** |
| **Mixing bowl** | `ks-cw-mixing-bowl-spoon` | ✅ arrived · **wired (branch)** as `mixing_bowl` |
| **Icing dispenser / colour selector** | `ks-cw-icing-color-selector` | ✅ arrived · not wired (Phase 3 mechanic) |
| Ingredient dispenser | `ks-cw-ingredient-dispenser-station` | ✅ arrived · alt crate/counter, not wired |
| Curved ingredient counter | `ks-cw-curved-ingredient-counter` | ✅ arrived · not wired |
| Side cabinet (mini) | `ks-cw-side-cabinet-mini-station` | ✅ arrived · not wired |
| Display stand / pedestal | `ks-cw-display-stand`, `ks-cw-cake-pedestal-stand` | ✅ arrived · not wired (cosmetic `D`) |
| Cooling rack | `ks-cw-cooling-rack-cake-layers` | ✅ arrived · not wired |
| Ornate benches (1/2/3) | `ks-cw-ornate-bench-{single,double,triple}` | ✅ arrived · not wired (multi-tile, no slot) |

**Still missing:**

| Asset | Why |
|---|---|
| **Garnish counter** | No dedicated garnish/topper-caddy station yet. Could repurpose an ornate bench, but a proper one is cleaner. |
| **Stove / range** | For glaze & ganache (Espresso/Galaxy, L3+). No cake-world range exists — `stove`/`pot` still use the old HD art. Needs *simmering* + *about-to-burn* states. |
| **Batter blobs** | One tinted blob per cake shown in the bowl / going in the oven (pink, green, purple, …). Simple. |
| **Icing-colour swatches + topper icons** | Small UI chips for the dispenser readout, colour button, and order tickets. |

## 🍰 Cake art (the stars — most love here)

**Arrived already** (need a recipe assignment — *your aesthetic call*, see below):
`ks-cw-cake-tiered-decorated` (hero tiered cake), `ks-cw-cake-berry-slice`,
`ks-cw-cake-berry-tart`, `ks-cw-cake-petal-slice`, `ks-cw-plain-cake-layers`
(un-iced sponge), `ks-cw-cooling-rack-cake-layers`.

> **Decision needed — cake → recipe mapping.** The engine (branch) currently
> renders the 3 beta cakes (Rose / Matcha / Galaxy) as emoji placeholders on
> purpose. To use the art above, tell me which PNG is which recipe (e.g.
> petal-slice → Rose, berry-slice → Galaxy, …). That's a pure look decision, so
> it's parked for you rather than guessed.

For each of the five cakes we need, at minimum:

1. **Ticket/icon** — the finished cake as it appears on an order ticket (small,
   ~120px, must read by silhouette + colour).
2. **Baked (un-iced) layer** — the plain sponge that comes out of the oven.
3. **Iced** — coated in its signature colour.
4. **Garnished / final** — the hero beauty shot (also used in the display case).

And because of **customization**, we want the iced/garnished cake in the
**icing-colour variants** the levels use. Two ways to author this — pick one in
[open-questions.md](open-questions.md):

- **(A) Pre-rendered variants:** generate each cake in each needed colour
  (more art, pixel-perfect). Start with the 5 hero colours, expand as needed.
- **(B) Recolourable base:** generate one neutral-icing cake per shape + a
  separate icing/glaze overlay we tint in-engine (less art, slightly less
  control). The frosting-trim and heart motifs make a clean base plausible.

Cakes, with their signature colour and topper:

| Cake | Base colour | Topper |
|---|---|---|
| Royal Ruby Rose | pink | red rose petals |
| Golden Honeycomb | gold/yellow | honeycomb shards |
| Midnight Espresso | dark chocolate | gold leaf/dust |
| Matcha Forest | green | white-chocolate curls + mint |
| Blueberry Galaxy | purple/blue mirror | silver glitter |

## 🫐 Ingredient art (raw + processed)

Each ingredient needs a **raw** sprite (in its crate) and its **processed**
sprite(s). Reuse existing fruit art where it fits (strawberry, blueberry exist
in `hd/`).

| Ingredient | States needed |
|---|---|
| flour, sugar, egg, butter, cream | raw (mostly bag/carton props) |
| strawberry | raw, chopped |
| blueberry | raw, smashed (pulp) |
| mint | raw, chopped |
| rose_petal | raw, chopped |
| dark/white chocolate | raw block, smashed/curls |
| toffee | raw block, smashed (dust) |
| honeycomb | raw, sliced shards |
| honey | drizzle prop |
| espresso_bean | raw, ground |
| vanilla | raw pod, scraped seeds |
| matcha | powder prop |
| gold_dust, silver_glitter, sugar_crystal | finishing sprinkles |

Plus **batter** blobs: one tinted blob per cake (pink, gold, brown, green,
vanilla/purple) shown in the bowl and going into the oven. These can be simple.

## 🎀 Toppers & icing swatches (UI)

- Small **topper icons** for the garnish caddy + order tickets (rose, honeycomb,
  gold, glitter, curls).
- **Icing-colour swatches** for the dispenser's current-colour readout and the
  colour button's state.

## ✨ FX sheets (Phase 5 / juice)

Low priority but listed so they're on the radar — see
[open-questions.md](open-questions.md#juice--animation-backlog):

- Serve-success sparkle burst, coin pop.
- Oven steam + "ding" flash, flame flicker frames.
- Icing-squeeze drip, glitter shimmer, glaze pour.
- Patience-bar heart/sparkle.

## Suggested generation order

1. **Mixing bowl + icing dispenser + garnish counter** (unblocks Phase 2–3).
2. **Royal Ruby Rose** full set + its ingredients (unblocks the first playable
   cake).
3. The remaining four cakes + their ingredients.
4. Stove/range + glaze states (L3+).
5. Icing-colour variants per the chosen authoring approach.
6. FX sheets.

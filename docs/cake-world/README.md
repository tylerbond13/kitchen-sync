# Cake World — Level 1 Revamp

> Turning the first level into a complete, beautiful **Cake World**: the cozy
> customization of *Cake Mania* fused with the chaotic co-op of *Overcooked*.

This folder is the design home for the revamp. It is **planning, not code** — the
art assets are still being generated, and we want the design (especially the
*aesthetic*) locked before we wire mechanics. Everything here is meant to be
edited; treat each open question as a live decision.

## The docs

| Doc | What it covers |
|---|---|
| [aesthetic.md](aesthetic.md) | The look & feel. Non-negotiable. Palette, materials, mood, the "polished real game" bar. |
| [stations-and-board.md](stations-and-board.md) | The 9 station types, how each maps onto the existing engine, and a concrete Level-1 grid. |
| [recipes.md](recipes.md) | The 5 signature cakes as buildable token recipes, the state machine, and the icing-colour + topper customization layer. |
| [assets-to-generate.md](assets-to-generate.md) | The shopping list for the image-gen tool — exactly what to make, in what style, at what size. |
| [open-questions.md](open-questions.md) | Decisions we need from you, plus the co-op synergy & "juice"/animation backlog. |

Source material that fed these docs: `cake-recipes-tb-v1.md` (your notes), the
Cake World vision render, and the existing engine in `server/levels.js` +
`server/game.js`.

## North star (the three pillars)

1. **Beautiful first, always.** This level is a showpiece. If a mechanic and the
   aesthetic ever conflict, the aesthetic wins and we find another mechanic. The
   bar is "feels like a polished, shipped video game," not "a prototype that
   works."
2. **Simple to read, deep to play.** A new player should understand a cake at a
   glance (chop → mix → bake → ice → garnish → serve). The *depth* comes from
   parallelism and customization, not from hidden rules.
3. **Co-op by design, not by accident.** Every cake should be *better with more
   hands*. Bottlenecks (one mixer, one stove, a far-away icing-colour button)
   force the "can you watch the stove?!" moments. With 5 players, one person can
   own each station.

## How the engine works today (grounding)

The current game is already a token state-machine, which is good news — Cake
World is mostly an **extension**, not a rewrite:

- **Ingredients** have an `id` + a `state` (`raw` → `chopped` → `cooked`).
- **Stations** are grid characters: `B` board, `S` stove (pan), `O` pot,
  `V` oven, `P` plate stack, `W` serve window, `T` trash, `K` sink, digits =
  ingredient crates.
- **Recipes** are a multiset of `id.state` tokens (e.g. `lettuce.chopped` +
  `tomato.chopped` = salad).
- **Cook combos** turn input tokens into an output item/dish on a tool, with a
  `time` and a `burnAfter`.

Cake World needs **three new verbs** layered on top: **mix** (combine into
batter), **ice** (apply a coloured frosting — a *stateful* station), and
**garnish** (apply a topper). See [stations-and-board.md](stations-and-board.md)
for how each slots into the existing model.

## The plan (phased)

We ship the *look* before the full mechanic depth, so the game is always
demo-able and beautiful.

- **Phase 0 — Design lock (this folder).** Agree the aesthetic, the 5 cakes, the
  grid, and the asset list. *Output: these docs, signed off.*
- **Phase 1 — Re-skin + assets.** Drop in the generated Cake World station/
  ingredient/cake art (the pipeline from the first re-skin already exists). The
  existing salad/burger mechanics still run underneath. *Output: Level 1 looks
  like Cake World even before new mechanics land.*
- **Phase 2 — Mixing Bowl + bake chain.** Add the `mix` verb and a Mixing-Bowl
  station; make the first cake (Royal Ruby Rose) fully playable: chop → mix →
  bake → plate → serve. *Output: one real cake, end-to-end.*
- **Phase 3 — Icing + garnish + customization.** Add the Icing Dispenser
  (coloured, remote-button controlled) and Garnish Counter. Introduce the
  icing-colour / topper variants that make orders customizable. *Output: the
  full finishing loop and the co-op customization hook.*
- **Phase 4 — The 5-cake menu + co-op tuning.** Add the Stove glaze cakes
  (Espresso, Galaxy) and the hand-off cakes (Matcha), tune timings/bottlenecks
  for 2–8 players. *Output: the complete Level 1.*
- **Phase 5 — Juice.** Animations, particles, sounds, screen-shake-on-serve, the
  "ding," the patience-bar-goes-red moment. See
  [open-questions.md](open-questions.md#juice--animation-backlog). *Output: the
  "polished real game" feel.*

Each phase is independently shippable and keeps the build green.

## Status

- [x] Branch created (`cake-world-revamp`)
- [x] First design pass written (these docs)
- [ ] Aesthetic signed off
- [ ] 5 cakes + customization signed off
- [ ] Grid signed off
- [ ] Asset list finalized & handed to image-gen

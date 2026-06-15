# Stations & Board

How the Cake World stations map onto the existing engine, and a concrete Level-1
grid. The guiding rule from your notes — *thermal stations and the service
window on opposite sides, so players cross paths in the middle* — drives the
layout.

## The cake state machine

Every cake is one path through these states. Read it top to bottom; each arrow is
one station interaction.

```
   CRATE            BOARD              MIXING BOWL          OVEN
  ┌──────┐  grab   ┌────────┐  chop   ┌───────────┐  bake  ┌────────┐
  │ flour│ ──────▶ │ berries│ ──────▶ │  + flour  │ ─────▶ │ baked  │
  │ sugar│         │ chopped│         │  + sugar  │        │  cake  │
  │berries│        └────────┘         │ = BATTER  │        └───┬────┘
  └──────┘                            └───────────┘            │ pull onto plate (P)
                                                               ▼
   PLATE          ICING DISPENSER        GARNISH          SERVE WINDOW
  ┌──────┐ place  ┌───────────────┐ ice ┌──────────┐ top ┌──────────┐
  │ cake │ ─────▶ │ coat (colour) │ ──▶ │ + topper │ ──▶ │  DELIVER │
  │on dish│       │ = iced.<pink> │     │=garnished│     │  🎉 +pts │
  └──────┘        └───────────────┘     └──────────┘     └──────────┘
```

Three **new verbs** on top of today's `grab / chop / cook`:

- **mix** — combine a multiset of items into a `batter` item (Mixing Bowl).
- **ice** — coat a plated baked cake with the dispenser's *current colour*,
  producing an `iced.<colour>` state (Icing Dispenser).
- **garnish** — apply a topper item, producing `garnished` (Garnish Counter).

These reuse the existing combo/state machinery; see *Engine extensions* below.

## Station catalog

| Char | Station | Verb | Engine mapping | New? |
|---|---|---|---|---|
| `1`–`9` | Ingredient crate | grab | exists (`crates`) | — |
| `B` | Cutting board | chop / grind / smash | exists (`B`); add new choppables + "grind"/"smash" as chop-state aliases | extend |
| `M` | **Mixing bowl** | mix | **new** station; a "combine" combo with `tool:'mixer'`, instant-ish, capacity 3–4 | **new** |
| `V` | Oven | bake | exists (`V`/oven combos); add cake batters as oven inputs | extend |
| `S` | Stove / range | melt / boil (glaze, ganache) | exists (`S`/pan, `O`/pot); used by the *advanced* cakes | extend |
| `I` | **Icing dispenser** | ice | **new** stateful station — holds a *current colour* | **new** |
| `C` | **Icing-colour button** | toggle | **new** control tile, flips `I`'s colour; placed far from `I` | **new** |
| `G` | **Garnish counter** | garnish | **new** assembly tile; applies a topper item | **new** |
| `P` | Plate stack | grab plate | exists (`P`) | — |
| `W` | Service window | serve | exists (`W`) | — |
| `T` | Trash | discard | exists (`T`) | — |
| `K` | Sink | wash | exists (`K`) | — |
| `D` | **Display stand** | (info) | **new** non-interactive prop — shows the level's target cakes | **new (cosmetic)** |
| `#` | Counter | hold one item | exists (`#`) | — |

Art for `M`, `I`, `C`, `G`, `D` is partly in hand already (the cutting-board,
oven, deliver-counter, sink, trash, plate-stack, display-stand, and ornate-bench
renders) — see [assets-to-generate.md](assets-to-generate.md) for the gaps
(mixing bowl, icing dispenser + bottles, colour button, garnish counter).

## Level 1 — "Sweet Beginnings" (proposed grid)

Level 1 teaches the **core chain on one cake** (the Royal Ruby Rose). To keep it
clean, the icing colour is **fixed to pink** here — no colour button yet (that
arrives in Level 2). One cake, every station used once or twice, short walks.

```
. 1 B 2 B 3 . 4 . D .
V . . . . . . . . . W
V . . . M . . . I . W
P . . . . . . . G . #
# . . . . . . . . . #
. T . . . K . . P . .
```

Legend for this grid: `1`=Flour `2`=Sugar `3`=Strawberry `4`=Rose Petals,
`B`=board, `M`=mixing bowl, `V`=oven (×2), `I`=icing (pink), `G`=garnish,
`P`=plate stack, `W`=service window, `T`=trash, `K`=sink, `D`=display stand.

**Why it's laid out this way**

- **Ovens (left) vs. service window (right):** the baked cake has to travel
  across the room to be iced, garnished, and served — the signature Overcooked
  crossing. Supply (crates) sits up top, central, feeding both sides.
- **Mixing bowl is central:** the one bottleneck everyone funnels through. With 2
  players it's a hand-off point; with 5, one person owns it.
- **Icing + garnish cluster by the window (right):** the finishing line is next
  to delivery, so a "decorator" role can live on the right while "bakers" live on
  the left.
- **Sink + trash bottom-center:** maintenance is out of the main flow but
  reachable.

**The 2-player vs. 5-player story (same grid)**

- *2 players:* one bakes (chop→mix→oven→plate), one decorates (ice→garnish→
  serve). They meet in the middle to hand off the baked cake. Constant
  negotiation.
- *5 players:* chopper, mixer, baker, decorator, runner/dishwasher — one per
  station. The grid has enough discrete tiles that nobody idles.

## Level 2+ — introducing the colour button

Once the chain is taught, customization turns it into a *co-op puzzle*. The Icing
Dispenser gains a **current colour**, and the only way to change it is the
**colour button (`C`) on the far side of the room**:

```
C . . . . . . . . . .          Order: a BLUE Galaxy cake + a PINK Rose cake.
. . . . . . . . . I . W        The dispenser is currently pink. Someone must
. . . . . . . . . G . W        sprint to C to flip it to blue between cakes —
. . . . . . . . . . . .        while the decorator waits, fuming. Pure co-op.
```

Each open order specifies a **required icing colour** (and later a **topper**).
Matching them is the customization depth that scales with player count — see
[recipes.md](recipes.md#customization-the-co-op-depth-knob).

## Engine extensions (for whoever implements)

Grounded in `server/levels.js` + `server/game.js`. None of this is a rewrite.

1. **New station chars** in the layout legend + `STATION_KEY` (client
   `isoRender.js`) + server station handling: `M`, `I`, `C`, `G`, `D`.
2. **Mix combos** — a new combo kind like `COOK_COMBOS` but `tool:'mixer'`,
   resolved on the `M` tile. Example:
   `{ tool:'mixer', inputs:['flour.raw','sugar.raw','strawberry.chopped'], out:{kind:'item', id:'rose_batter', state:'raw'}, time:3 }`.
3. **Bake combos** — extend oven inputs:
   `{ tool:'oven', inputs:['rose_batter.raw'], out:{kind:'item', id:'rose_cake', state:'baked'}, time:8, burnAfter:11 }`.
4. **Iceable items + dispenser state.** The `I` station carries `colour` (set by
   `C`). Icing a `*_cake.baked` on a plate yields `*_cake.iced` tagged with the
   colour. Model colour as part of the item (`item.icing = 'pink'`) so the order
   matcher can compare it.
5. **Garnish.** The `G` station consumes a topper item from the player's hands +
   the iced cake → `garnished`, tagging `item.topper`.
6. **Order matching** extends from "multiset of tokens" to "finished cake id +
   icing colour + topper" — a small struct compare instead of just a token set.
7. **Display stand `D`** is render-only: it reads the level's order pool and
   draws the target cakes. No game-state interaction.

See [open-questions.md](open-questions.md) for the decisions these extensions
depend on (e.g. do batters live in the bowl or in players' hands?).

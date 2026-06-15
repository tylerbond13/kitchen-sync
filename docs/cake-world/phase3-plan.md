# Phase 3 implementation plan — Icing, Garnish & Colour

A ready-to-code spec for the deferred finishing mechanics, mapped onto the engine
that **already exists** after Phase 2 (Mixing Bowl + bake chain). This is pure
engineering — no aesthetic decisions. It stays parked until the matching
[open-questions](open-questions.md) (does icing need a clean plate? colour count?
button delay?) are answered, then it's a small, well-bounded build.

## What Phase 2 already gives us

- The cake is a **dish** (`{kind:'dish', id:'rose_cake'}`), produced by the oven
  from a batter. (`server/levels.js` COOK_COMBOS; `server/game.js` cook tick.)
- Stations are grid chars parsed in `parseLayout()`; interactions are a `switch`
  on `s.type` in `interact()`. Items carry an `id` + `state` (or `kind`).
- Order matching is `multisetEqual(plateTokens, RECIPES[order].needs)` in
  `tryServe()`. Tokens are `itemToken(item)`.

Phase 3 adds **two transform stations** and **two item tags** on top of that.
Nothing here is a rewrite.

## The new model

A finished cake becomes a dish that also carries **tags**:

```js
{ kind: 'dish', id: 'rose_cake', icing: 'pink', topper: 'rose_petal' }
```

`itemToken()` grows to fold tags into the token so order-matching "just works":

```js
// server/game.js
function itemToken(item) {
  if (!item) return null;
  if (item.kind === 'plate' || item.kind === 'stack') return null;
  if (item.kind === 'dish') {
    let t = `${item.id}.dish`;
    if (item.icing)  t += `#${item.icing}`;   // rose_cake.dish#pink
    if (item.topper) t += `+${item.topper}`;  // rose_cake.dish#pink+rose_petal
    return t;
  }
  return `${item.id}.${item.state}`;
}
```

Recipes then specify the finished form in `needs`, e.g.
`needs: ['rose_cake.dish#pink+rose_petal']`. Un-iced/un-garnished cakes simply
don't match, so the chain is enforced for free. (For **Level 1 fixed-pink** we
can omit the `#pink` from the recipe and have the dispenser stamp pink without it
mattering — see "Level ramp".)

## New stations

### 1. Icing Dispenser — tile `I` (type `ice`)

- `parseLayout()`: `else if (c === 'I') this.stations[key] = { type: 'ice', colour: level.icing || 'pink' }`.
- `interact()` new case `'ice'`: if the player carries a plate/stack whose cake
  dish is un-iced, stamp `dish.icing = s.colour` and emit a juicy `ice` event.
  Reject otherwise. (Honour the "clean plate first?" answer here — if required,
  only ice a cake that's already on a plate.)
- Render: `STATION_KEY.I = 'icing_dispenser'`; art `ks-cw-icing-color-selector`
  (already arrived) is the obvious sprite.

### 2. Garnish Counter — tile `G` (type `garnish`)

- `parseLayout()`: `{ type: 'garnish' }`.
- `interact()` new case `'garnish'`: applies the cake's required topper. Two
  designs (pick in open-questions):
  - **(a) Station-stocked** (simplest, Level 1): the counter applies the level's
    topper for the iced cake → `dish.topper = '<topper>'`. One tap.
  - **(b) Player-carried** (deeper co-op): the player must arrive holding the
    prepped topper (e.g. `rose_petal.chopped`); the counter consumes it onto the
    iced cake. Matches the docs' "chop the petals, then garnish" loop.
- Needs art: a dedicated **garnish counter** (still missing — see
  [assets-to-generate.md](assets-to-generate.md)). Until then it can borrow an
  ornate-bench sprite.

### 3. Icing-colour button — tile `C` (type `colour_button`), Level 2+

- `parseLayout()`: `{ type: 'colour_button' }`.
- `interact()` new case: cycles the **dispenser's** colour to the next in
  `level.colours` (the `I` station's `colour`). Place `C` far from `I` so one
  player runs the button while another ices — the signature co-op bottleneck.
- Optional "recalibrating" delay (open-question) → a short station cooldown
  before the new colour takes effect, making the role meaningful.
- Render: `ks-cw-icing-color-selector` could serve either `I` or `C`; the big
  round "ICING COLOR" panel from the vision render is the natural `C`.

## Order generation + tickets

- Orders gain optional `icing` / `topper` fields. The order schedule
  (`level.orders`) can list either plain recipe ids (fixed look) or
  `{ recipe, icing, topper }` variants. `staticState`/dynamic order payloads pass
  these through so the **ticket** and **first-time tutorial** can show the
  required colour swatch + topper icon (UI chips — still to generate).
- `tryServe()` is unchanged: it already compares tokens, and the tags are in the
  tokens now.

## Level ramp (engine-ready, content TBD)

| Level | Adds | Engine work |
|---|---|---|
| Sweet Beginnings (built) | mix → bake → serve | done |
| + Icing | `I` station, fixed colour | `ice` case + `itemToken` tags |
| + Garnish | `G` station | `garnish` case |
| + Colour | `C` button, multi-colour orders | `colour_button` case + variant orders |
| + Stove cakes | Espresso/Galaxy glaze | reuse `pot`/`pan`; needs stove art |

## Test hooks (mirror Phase 2 tests in `test/game.test.js`)

- ice: carry a baked rose-cake plate → `interact(I)` → dish gains `icing`.
- garnish: iced cake → `interact(G)` → dish gains `topper`; serving the fully
  finished cake matches `needs` and scores; an un-iced cake is rejected.
- colour button: `interact(C)` cycles `I.colour`; an order needing the *other*
  colour only matches after the flip.

## Decisions that unblock this (see [open-questions.md](open-questions.md))

1. Clean plate required before icing? (B5)
2. Garnish design (a) station-stocked vs (b) player-carried? (B5/B6)
3. Colour count + button instant vs delayed? (A3 / B8)
4. Wrong colour/topper → partial points or trash? (B9)

Answer those and this is a focused, test-covered build on top of the existing
engine — no architecture changes.

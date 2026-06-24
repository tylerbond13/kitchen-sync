# Kitchen Sync — Master Asset Checklist

Every image the game can use, derived from the live game data (recipes,
cook combos, crates, and themes in `server/levels.js`).

**Generation spec (applies to every image):**
- One object per image, centered, on a flat solid background (white or
  beige — the loader auto-removes it and trims).
- Straight-on 3/4 top-down orthographic perspective with flat grid alignment,
  non-isometric, matching the PlateUp-style room layout.
- ~1408×768 or larger. PNG.
- Name the file exactly as listed, drop it in `public/assets/images/hd/`.
- Preserved style reference: ✅ `ks-vibe-summary.png` (historical master vibe
  sheet; current generation should follow the flat-grid perspective above).

Legend: ✅ have (HD) · 🟡 placeholder in use (works, but generic) · ⬜ missing

## 1. Chef (player character)

| Status | File | Notes |
|---|---|---|
| ✅ | (sheet crop) | Static chef girl — current stand-in |
| ✅ | ks-chef-idle-front.png | Facing camera (SE-ish), empty hands |
| ✅ | ks-chef-idle-back.png | Facing away (NE-ish) |
| ⬜ | ks-chef-walk-se-1..4.png | 4 frames walking toward camera-right |
| ⬜ | ks-chef-walk-ne-1..4.png | 4 frames walking away-right (mirrored for left) |
| ⬜ | ks-chef-carry-se-1..4.png | Optional: walking with plate held up |

## 2. Customers (one each minimum; emotion variants optional)

| Status | File | Archetype |
|---|---|---|
| ✅ | ks-char-grandma-rose.png | Grandma Rose |
| ✅ | ks-char-businessman.png | The Workhorse |
| ✅ | ks-char-influencer.png | The Influencer — trendy young woman, phone in hand |
| ✅ | ks-char-socialite.png | The Socialite — big hat, gown, gloves |
| ✅ | ks-char-kid.png | The Kid — small, overalls, pigtails or cap |
| ✅ | ks-char-betty-white.png | Additional HD customer portrait |
| ✅ | ks-char-wadsworth.png | Additional HD customer portrait |
| ✅ | ks-char-sinatra.png | Additional HD customer portrait |
| ✅ | ks-char-barney.png | Additional HD customer portrait |
| ✅ | ks-char-camp-counselor.png | Additional HD customer portrait |
| ✅ | ks-char-judy.png | Additional HD customer portrait |
| ✅ | ks-char-dolly.png | Additional HD customer portrait |
| ⬜ | ks-char-*-worried.png ×5 | Optional: worried expression variants |
| ⬜ | ks-char-*-angry.png ×5 | Optional: about-to-leave variants |

## 3. Stations & appliances

| Status | File | Grid char |
|---|---|---|
| ✅ | ks-countertop.png | `#` front-facing cabinet counter (regenerated 2026-06-12, wired) |
| ✅ | ks-chopping-block.png | `B` front-facing butcher-block counter with idle knife and no food (regenerated 2026-06-12) |
| ✅ | ks-industrial-baking-oven.png | `V` front-facing industrial baking oven (regenerated 2026-06-12) |
| ✅ | ks-stove-pan.png | `S` front-facing range with frying pan on top (regenerated 2026-06-12) |
| ✅ | ks-stockpot.png | `O` front-facing burner with stockpot (regenerated 2026-06-12) |
| ✅ | ks-plate-stack.png | `P` straight-on front-facing porcelain plate storage rack/stack |
| ✅ | ks-serve-window.png | `W` front-facing service pass counter with cream pillars, green tile front, and gold bell (regenerated 2026-06-12) |
| ✅ | ks-trash-can.png | `T` clean front-facing stainless steel step trash can |
| ✅ | ks-sink.png | `K` front-facing wooden cabinet sink with steel basin and faucet (regenerated 2026-06-12) |
| ✅ | ks-stove-pan-fire.png | Optional: front-facing cooking/burning stove-pan state (regenerated 2026-06-12) |
| ✅ | ks-sink-dirty.png | Optional: front-facing dirty sink state with plates (regenerated 2026-06-12) |

## 4. Ingredients — raw/whole (19)

| Status | File |
|---|---|
| ✅ | ks-lettuce.png |
| ✅ | ks-tomato.png |
| ✅ | ks-cucumber.png |
| ✅ | ks-cheese.png |
| ✅ | ks-onion.png |
| ✅ | ks-fish.png |
| ✅ | ks-patty.png (raw beef patty) |
| ✅ | ks-potato.png |
| ✅ | ks-carrot.png |
| ✅ | ks-cocoa.png (chocolate bar) |
| ✅ | ks-pineapple.png |
| ✅ | ks-strawberry.png |
| ✅ | ks-banana.png |
| ✅ | ks-bun.png |
| ✅ | ks-rice.png (rice in a small bowl/sack) |
| ✅ | ks-seaweed.png (nori sheets) |
| ✅ | ks-dough.png (pizza dough ball) |
| ✅ | ks-milk.png (milk bottle) |
| ✅ | ks-tortilla.png |

## 5. Ingredients — chopped (13, matches CHOPPABLE set)

| Status | File |
|---|---|
| ✅ | ks-lettuce-chopped.png |
| ✅ | ks-tomato-chopped.png |
| ✅ | ks-cucumber-chopped.png (sliced rounds) |
| ✅ | ks-cheese-chopped.png (grated/sliced) |
| ✅ | ks-onion-chopped.png (diced) |
| ✅ | ks-fish-chopped.png (sashimi slices) |
| ✅ | ks-patty-chopped.png (ground/formed patty) |
| ✅ | ks-potato-chopped.png (cubed) |
| ✅ | ks-carrot-chopped.png (coins) |
| ✅ | ks-cocoa-chopped.png (chocolate shavings) |
| ✅ | ks-pineapple-chopped.png (chunks) |
| ✅ | ks-strawberry-chopped.png (halved) |
| ✅ | ks-banana-chopped.png (slices) |

## 5a. Ingredients — chopped loose / no plate (13, matches CHOPPABLE set)

These are standalone chopped ingredient piles for prep/counter states. Keep the
existing `ks-*-chopped.png` files for plated/legacy presentation, and use these
`-no-plate` files when the ingredient should not appear on dishware.

| Status | File |
|---|---|
| ✅ | ks-lettuce-chopped-no-plate.png (loose chopped lettuce; no plate) |
| ✅ | ks-tomato-chopped-no-plate.png (loose diced tomato; no plate) |
| ✅ | ks-cucumber-chopped-no-plate.png (loose cucumber slices; no plate) |
| ✅ | ks-cheese-chopped-no-plate.png (loose shredded/sliced cheese; no plate) |
| ✅ | ks-onion-chopped-no-plate.png (loose diced onion; no plate) |
| ✅ | ks-fish-chopped-no-plate.png (loose raw fish pieces; no plate) |
| ✅ | ks-patty-chopped-no-plate.png (loose chopped raw patty/ground beef; no plate) |
| ✅ | ks-potato-chopped-no-plate.png (loose cubed potato; no plate) |
| ✅ | ks-carrot-chopped-no-plate.png (loose carrot coins; no plate) |
| ✅ | ks-cocoa-chopped-no-plate.png (loose chocolate chunks/shavings; no plate) |
| ✅ | ks-pineapple-chopped-no-plate.png (loose pineapple chunks; no plate) |
| ✅ | ks-strawberry-chopped-no-plate.png (loose strawberry halves/quarters; no plate) |
| ✅ | ks-banana-chopped-no-plate.png (loose banana slices; no plate) |

## 6. Ingredients — cooked (2)

| Status | File |
|---|---|
| ✅ | ks-patty-cooked.png (grilled, char lines) |
| ✅ | ks-rice-cooked.png (steaming white mound) |

## 7. Crates / baskets (one per ingredient that has a crate in any level — all 19)

> **Stand-in (2026-06-12):** lettuce/tomato/cucumber crates are regenerated
> front-facing and wired. The remaining iso crate renders are NOT used —
> the game draws `flat/crate.svg` (front-facing, open-top) with the raw
> ingredient sprite composited into the opening. As each crate is
> regenerated straight-on, re-add it as `crate_<ing>` in `assetManifest.js`
> with `flat: true` to override the generic crate.

| Status | File |
|---|---|
| ✅ | ks-lettuce-crate.png (flat square/rectangular wooden crate filled with lettuce) |
| ✅ | ks-tomato-crate.png (flat square/rectangular wooden crate filled with tomatoes) |
| ✅ | ks-cucumber-crate.png (flat square/rectangular wooden crate or wicker basket filled with cucumbers) |
| ✅ | ks-bun-crate.png (bread basket) |
| ✅ | ks-patty-crate.png (butcher box / cooler) |
| ✅ | ks-cheese-crate.png |
| ✅ | ks-onion-crate.png |
| ✅ | ks-rice-crate.png (rice sack) |
| ✅ | ks-fish-crate.png (ice crate) |
| ✅ | ks-seaweed-crate.png |
| ✅ | ks-dough-crate.png (flour sack + dough tray) |
| ✅ | ks-milk-crate.png (bottle crate) |
| ✅ | ks-cocoa-crate.png |
| ✅ | ks-potato-crate.png |
| ✅ | ks-carrot-crate.png |
| ✅ | ks-pineapple-crate.png |
| ✅ | ks-strawberry-crate.png |
| ✅ | ks-banana-crate.png |
| ✅ | ks-tortilla-crate.png |

## 8. Plated dishes (order bubbles + servable plates — 14)

| Status | File | Recipe |
|---|---|---|
| ✅ | ks-dish-salad.png | Garden Salad |
| ✅ | ks-dish-big-salad.png | Chef Salad |
| ✅ | ks-dish-burger.png | Burger |
| ✅ | ks-dish-cheeseburger.png | Cheeseburger |
| ✅ | ks-dish-soup-onion.png | Onion Soup |
| ✅ | ks-dish-soup-tomato.png | Tomato Soup |
| ✅ | ks-dish-sushi.png | Sushi |
| ✅ | ks-dish-pizza.png | Pizza |
| ✅ | ks-dish-stew.png | Hearty Stew |
| ✅ | ks-dish-cocoa.png | Hot Cocoa (mug) |
| ✅ | ks-dish-juice.png | Smoothie (glass) |
| ✅ | ks-dish-poke.png | Poke Bowl |
| ✅ | ks-dish-fish-taco.png | Fish Taco |
| ✅ | ks-dish-burned.png | Burned mess (charcoal lump on plate) |

## 9. Dishware

| Status | File |
|---|---|
| ✅ | ks-plate-clean.png (single empty plate) |
| ✅ | ks-plate-dirty.png (stained plate w/ scraps) |

## 10. Environment — Artisan Bakery / Diner theme (levels 1–6)

| Status | File |
|---|---|
| ✅ | ks-tile-checkered.png (floor) |
| ✅ | ks-flower-vase.png |
| ✅ | ks-utensil-cup.png (optional — exists in HD) |
| ✅ | ks-wall-bakery-back.png (horizontal back wall segment — warm white brick with walnut wood wainscoting; flat straight-on grid alignment) |
| ⬜ | ks-wall-bakery-side.png (vertical side wall segment — matching warm white brick and walnut wainscoting; flat straight-on grid alignment) |
| ⬜ | ks-wall-bakery-corner.png (internal 90-degree corner joiner cap — clean walnut trim tying back and side walls together) |
| ⬜ | ks-decor-bakery-window.png (flat front-facing bakery window decor variation) |
| ⬜ | ks-decor-bakery-menu-board.png (flat wall menu board decor variation) |
| ✅ | ks-window.png (historical street-view window; superseded by flat-grid `ks-decor-bakery-window.png`) |
| ✅ | ks-wall-diner.png (historical full-bleed interior wall backdrop; superseded by modular `-back`, `-side`, and `-corner` wall pieces) |
| ✅ | (sheet crops) photos, clock, BAKERY sign (historical decor crops; keep preserved, but regenerate flat wall decor as needed) |

## 11. Environment — Sage & Shiplap Cafe theme

| Status | File |
|---|---|
| ⬜ | ks-wall-sage-back.png (horizontal back wall segment — sage green and white vertical shiplap; flat straight-on grid alignment) |
| ⬜ | ks-wall-sage-side.png (vertical side wall segment — matching sage green and white vertical shiplap; flat straight-on grid alignment) |
| ⬜ | ks-wall-sage-corner.png (internal 90-degree corner joiner cap — crisp shiplap corner trim) |
| ⬜ | ks-decor-sage-patio-window.png (flat front-facing arched patio window decor variation) |
| ⬜ | ks-decor-sage-ivy-shelf.png (flat front-facing floating ivy shelf decor variation) |

## 12. Environment — Alpine Winter Lodge theme (levels 7–10)

| Status | File |
|---|---|
| ✅ | ks-tile-winter.png (floor patch — cool tones / wood) |
| ⬜ | ks-wall-winter-back.png (horizontal back wall segment — honey log cabin wall with stone base; flat straight-on grid alignment) |
| ⬜ | ks-wall-winter-side.png (vertical side wall segment — matching honey logs and stone base; flat straight-on grid alignment) |
| ⬜ | ks-wall-winter-corner.png (internal 90-degree corner cap — stone fireplace element joining back and side walls) |
| ⬜ | ks-decor-winter-window.png (flat front-facing frosted timber window decor variation) |
| ✅ | ks-decor-wreath.png |
| ✅ | ks-decor-cocoa-sign.png ("Hot Cocoa" menu board) |
| ✅ | ks-wall-winter.png (historical cozy lodge full-bleed backdrop; superseded by modular `-back`, `-side`, and `-corner` wall pieces) |
| ✅ | ks-window-winter.png (historical snowy village window target; superseded by flat-grid `ks-decor-winter-window.png`) |
| ✅ | ks-decor-fireplace.png (historical standalone fireplace target; superseded by `ks-wall-winter-corner.png`) |

## 13. Environment — Tropical Beach Shack theme (levels 11–14)

| Status | File |
|---|---|
| ✅ | ks-tile-beach.png (floor patch — sandy / bamboo) |
| ⬜ | ks-wall-beach-back.png (horizontal back wall segment — woven bamboo poles with teal trim; flat straight-on grid alignment) |
| ⬜ | ks-wall-beach-side.png (vertical side wall segment — matching woven bamboo poles and teal trim; flat straight-on grid alignment) |
| ⬜ | ks-wall-beach-corner.png (internal 90-degree corner joiner cap — teal post and bamboo trim tying walls together) |
| ⬜ | ks-decor-beach-window.png (flat front-facing open-shutter ocean window decor variation) |
| ✅ | ks-decor-surfboard.png |
| ✅ | ks-decor-palm.png (potted palm) |
| ✅ | ks-decor-tiki-sign.png ("Smoothie Shack" board) |
| ✅ | ks-wall-beach.png (historical beach shack full-bleed backdrop; superseded by modular `-back`, `-side`, and `-corner` wall pieces) |
| ✅ | ks-window-beach.png (historical ocean-view window target; superseded by flat-grid `ks-decor-beach-window.png`) |

## 14. UI & feedback (placeholders work; HD versions optional)

| Status | File |
|---|---|
| 🟡 | ks-ui-bubble.png (speech/thought bubble, empty placeholder) |
| 🟡 | ks-ui-heart.png / ks-ui-heart-empty.png (heart exists in HD; empty-heart variant still optional) |
| ✅ | ks-ui-coin.png (gold coin for serve burst) |
| ✅ | ks-ui-crown.png (VIP order marker) |

---

## Counts

Counts below track active flat-grid assets for the current pipeline. Historical
or superseded full-bleed/diagonal room assets are preserved in the theme tables,
but excluded from Needed totals unless a replacement is still required.

| Category | Have | Needed | Optional extra |
|---|---|---|---|
| Chef | 3 (sheet crop + idle front/back) | 8 walk frames | 4 carry |
| Customers | 12 | 0 | 10 emotions |
| Stations | 9 core + 2 states | 0 | — |
| Ingredients raw | 19 | 0 | — |
| Ingredients chopped | 13 | 0 | — |
| Ingredients chopped no-plate | 13 | 0 | — |
| Ingredients cooked | 2 | 0 | — |
| Crates | 19 | 0 | — |
| Dishes | 14 | 0 | — |
| Dishware | 2 | 0 | — |
| Env: artisan bakery / diner | 4 active + 2 historical preserved | 4 | — |
| Env: sage cafe | 0 | 5 | — |
| Env: winter lodge | 3 active + 3 historical preserved | 4 | — |
| Env: beach shack | 4 active + 2 historical preserved | 4 | — |
| UI | 2 HD + 2 placeholders | 0 | 1 heart-empty variant |
| **Total** | **122 active HD files + 1 sheet-crop placeholder + 8 historical/reference HD files** | **25** | **15** |

## Suggested generation order (gameplay impact first)

1. **Dishes** (14) — they appear in every order bubble, all levels.
2. **Remaining customers** (3) — the queue is the emotional center.
3. **Diner stations** (stove-pan, stockpot, plate stack, serve window, trash, sink).
4. **Level 1–2 ingredients + crates** (cucumber, bun, patty, cheese + their crates, patty-cooked).
5. **Chef walk frames** (10) — brings the player to life.
6. Remaining ingredients/crates by level order (onion→rice/fish/seaweed→dough→winter→beach).
7. Flat-grid room packs: artisan bakery/diner, sage cafe, winter lodge, then beach shack.
8. Chef walk frames and optional UI/heart polish.

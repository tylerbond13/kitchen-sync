# Kitchen Sync — Master Asset Checklist

Every image the game can use, derived from the live game data (recipes,
cook combos, crates, and themes in `server/levels.js`).

**Generation spec (applies to every image):**
- One object per image, centered, on a flat solid background (white or
  beige — the loader auto-removes it and trims).
- Isometric ¾ view matching the master vibe sheet (`ks-vibe-summary.png`).
- ~1408×768 or larger. PNG.
- Name the file exactly as listed, drop it in `public/assets/images/hd/`.

Legend: ✅ have (HD) · 🟡 placeholder in use (works, but generic) · ⬜ missing

## 1. Chef (player character)

| Status | File | Notes |
|---|---|---|
| ✅ | (sheet crop) | Static chef girl — current stand-in |
| ⬜ | ks-chef-idle-front.png | Facing camera (SE-ish), empty hands |
| ⬜ | ks-chef-idle-back.png | Facing away (NE-ish) |
| ⬜ | ks-chef-walk-se-1..4.png | 4 frames walking toward camera-right |
| ⬜ | ks-chef-walk-ne-1..4.png | 4 frames walking away-right (mirrored for left) |
| ⬜ | ks-chef-carry-se-1..4.png | Optional: walking with plate held up |

## 2. Customers (one each minimum; emotion variants optional)

| Status | File | Archetype |
|---|---|---|
| ✅ | ks-char-grandma-rose.png | Grandma Rose |
| ✅ | ks-char-businessman.png | The Workhorse |
| ⬜ | ks-char-influencer.png | The Influencer — trendy young woman, phone in hand |
| ⬜ | ks-char-socialite.png | The Socialite — big hat, gown, gloves |
| ⬜ | ks-char-kid.png | The Kid — small, overalls, pigtails or cap |
| ⬜ | ks-char-*-worried.png ×5 | Optional: worried expression variants |
| ⬜ | ks-char-*-angry.png ×5 | Optional: about-to-leave variants |

## 3. Stations & appliances

| Status | File | Grid char |
|---|---|---|
| ✅ | ks-countertop.png | `#` counter |
| ✅ | ks-chopping-block.png | `B` cutting board |
| ✅ | ks-industrial-baking-oven.png | `V` oven |
| ⬜ | ks-stove-pan.png | `S` — range with frying pan on top |
| ⬜ | ks-stockpot.png | `O` — big soup pot on a burner |
| ⬜ | ks-plate-stack.png | `P` — shelf/rack of clean plates |
| ⬜ | ks-serve-window.png | `W` — pass window with bell, green accent |
| ⬜ | ks-trash-can.png | `T` — kitchen trash can |
| ⬜ | ks-sink.png | `K` — sink with faucet |
| ⬜ | ks-stove-pan-fire.png | Optional: cooking/burning state |
| ⬜ | ks-sink-dirty.png | Optional: sink piled with dirty plates |

## 4. Ingredients — raw/whole (19)

| Status | File |
|---|---|
| ✅ | ks-lettuce.png |
| ✅ | ks-tomato.png |
| ⬜ | ks-cucumber.png |
| ⬜ | ks-cheese.png |
| ⬜ | ks-onion.png |
| ⬜ | ks-fish.png |
| ⬜ | ks-patty.png (raw beef patty) |
| ⬜ | ks-potato.png |
| ⬜ | ks-carrot.png |
| ⬜ | ks-cocoa.png (chocolate bar) |
| ⬜ | ks-pineapple.png |
| ⬜ | ks-strawberry.png |
| ⬜ | ks-banana.png |
| ⬜ | ks-bun.png |
| ⬜ | ks-rice.png (rice in a small bowl/sack) |
| ⬜ | ks-seaweed.png (nori sheets) |
| ⬜ | ks-dough.png (pizza dough ball) |
| ⬜ | ks-milk.png (milk bottle) |
| ⬜ | ks-tortilla.png |

## 5. Ingredients — chopped (13, matches CHOPPABLE set)

| Status | File |
|---|---|
| ✅ | ks-lettuce-chopped.png |
| ✅ | ks-tomato-chopped.png |
| ⬜ | ks-cucumber-chopped.png (sliced rounds) |
| ⬜ | ks-cheese-chopped.png (grated/sliced) |
| ⬜ | ks-onion-chopped.png (diced) |
| ⬜ | ks-fish-chopped.png (sashimi slices) |
| ⬜ | ks-patty-chopped.png (ground/formed patty) |
| ⬜ | ks-potato-chopped.png (cubed) |
| ⬜ | ks-carrot-chopped.png (coins) |
| ⬜ | ks-cocoa-chopped.png (chocolate shavings) |
| ⬜ | ks-pineapple-chopped.png (chunks) |
| ⬜ | ks-strawberry-chopped.png (halved) |
| ⬜ | ks-banana-chopped.png (slices) |

## 6. Ingredients — cooked (2)

| Status | File |
|---|---|
| ⬜ | ks-patty-cooked.png (grilled, char lines) |
| ⬜ | ks-rice-cooked.png (steaming white mound) |

## 7. Crates / baskets (one per ingredient that has a crate in any level — all 19)

| Status | File |
|---|---|
| ✅ | ks-lettuce-crate.png |
| ✅ | ks-tomato-crate.png |
| ⬜ | ks-cucumber-crate.png |
| ⬜ | ks-bun-crate.png (bread basket) |
| ⬜ | ks-patty-crate.png (butcher box / cooler) |
| ⬜ | ks-cheese-crate.png |
| ⬜ | ks-onion-crate.png |
| ⬜ | ks-rice-crate.png (rice sack) |
| ⬜ | ks-fish-crate.png (ice crate) |
| ⬜ | ks-seaweed-crate.png |
| ⬜ | ks-dough-crate.png (flour sack + dough tray) |
| ⬜ | ks-milk-crate.png (bottle crate) |
| ⬜ | ks-cocoa-crate.png |
| ⬜ | ks-potato-crate.png |
| ⬜ | ks-carrot-crate.png |
| ⬜ | ks-pineapple-crate.png |
| ⬜ | ks-strawberry-crate.png |
| ⬜ | ks-banana-crate.png |
| ⬜ | ks-tortilla-crate.png |

## 8. Plated dishes (order bubbles + servable plates — 14)

| Status | File | Recipe |
|---|---|---|
| ⬜ | ks-dish-salad.png | Garden Salad |
| ⬜ | ks-dish-big-salad.png | Chef Salad |
| ⬜ | ks-dish-burger.png | Burger |
| ⬜ | ks-dish-cheeseburger.png | Cheeseburger |
| ⬜ | ks-dish-soup-onion.png | Onion Soup |
| ⬜ | ks-dish-soup-tomato.png | Tomato Soup |
| ⬜ | ks-dish-sushi.png | Sushi |
| ⬜ | ks-dish-pizza.png | Pizza |
| ⬜ | ks-dish-stew.png | Hearty Stew |
| ⬜ | ks-dish-cocoa.png | Hot Cocoa (mug) |
| ⬜ | ks-dish-juice.png | Smoothie (glass) |
| ⬜ | ks-dish-poke.png | Poke Bowl |
| ⬜ | ks-dish-fish-taco.png | Fish Taco |
| ⬜ | ks-dish-burned.png | Burned mess (charcoal lump on plate) |

## 9. Dishware

| Status | File |
|---|---|
| ⬜ | ks-plate-clean.png (single empty plate) |
| ⬜ | ks-plate-dirty.png (stained plate w/ scraps) |

## 10. Environment — Diner theme (levels 1–6)

| Status | File |
|---|---|
| ✅ | ks-tile-checkered.png (floor) |
| ✅ | ks-window.png (street view) |
| ✅ | (sheet crops) photos, clock, BAKERY sign |
| ✅ | ks-flower-vase.png |
| ⬜ | ks-wall-diner.png (interior wall texture/backdrop, full-bleed) |
| ⬜ | ks-utensil-cup.png (optional — exists in sheet, can crop) |

## 11. Environment — Winter theme (levels 7–10)

| Status | File |
|---|---|
| ⬜ | ks-tile-winter.png (floor patch — cool tones / wood) |
| ⬜ | ks-wall-winter.png (cozy lodge backdrop, full-bleed) |
| ⬜ | ks-window-winter.png (snowy village view) |
| ⬜ | ks-decor-wreath.png |
| ⬜ | ks-decor-fireplace.png |
| ⬜ | ks-decor-cocoa-sign.png ("Hot Cocoa" menu board) |

## 12. Environment — Beach theme (levels 11–14)

| Status | File |
|---|---|
| ⬜ | ks-tile-beach.png (floor patch — sandy / bamboo) |
| ⬜ | ks-wall-beach.png (beach shack backdrop, full-bleed) |
| ⬜ | ks-window-beach.png (ocean view) |
| ⬜ | ks-decor-surfboard.png |
| ⬜ | ks-decor-palm.png (potted palm) |
| ⬜ | ks-decor-tiki-sign.png ("Smoothie Shack" board) |

## 13. UI & feedback (placeholders work; HD versions optional)

| Status | File |
|---|---|
| 🟡 | ks-ui-bubble.png (speech/thought bubble, empty) |
| 🟡 | ks-ui-heart.png / ks-ui-heart-empty.png |
| ⬜ | ks-ui-coin.png (gold coin for serve burst) |
| ⬜ | ks-ui-crown.png (VIP order marker) |

---

## Counts

| Category | Have | Needed | Optional extra |
|---|---|---|---|
| Chef | 1 static | 10 (idle+walk) | 4 carry |
| Customers | 2 | 3 | 10 emotions |
| Stations | 3 | 6 | 2 states |
| Ingredients raw | 2 | 17 | — |
| Ingredients chopped | 2 | 11 | — |
| Ingredients cooked | 0 | 2 | — |
| Crates | 2 | 17 | — |
| Dishes | 0 | 14 | — |
| Dishware | 0 | 2 | — |
| Env: diner | 6 | 1 | 1 |
| Env: winter | 0 | 6 | — |
| Env: beach | 0 | 6 | — |
| UI | 2 (placeholder) | 0 | 4 |
| **Total** | **~18** | **~95** | **~21** |

## Suggested generation order (gameplay impact first)

1. **Dishes** (14) — they appear in every order bubble, all levels.
2. **Remaining customers** (3) — the queue is the emotional center.
3. **Diner stations** (stove-pan, stockpot, plate stack, serve window, trash, sink).
4. **Level 1–2 ingredients + crates** (cucumber, bun, patty, cheese + their crates, patty-cooked).
5. **Chef walk frames** (10) — brings the player to life.
6. Remaining ingredients/crates by level order (onion→rice/fish/seaweed→dough→winter→beach).
7. Winter env pack, then beach env pack.
8. UI polish set.

# Art generation requests — prioritized

The design review's core finding: the game mixes **two art worlds**. Counters, crates,
and the trash can use the soft pastel "cake-world" set; **everything you cook with**
(cutting boards, stoves, pots, ovens, mixers, sinks, plate racks, serve windows) uses
older semi-realistic "HD" art. Every new piece below should match the cake-world
language so the whole kitchen reads as one illustrated set.

---

## Generation tracker

**Art direction override (July 3, 2026):** follow the cozy bakery-diner brief and
the warm design-roadmap palette, but do not copy the existing pink-heart cake-world
ornament language. Use a more timeless Beaux-Arts bakery style: cream enamel,
honey wood, brass/gold trim, restrained mint/teal accents, plum/ink depth where
useful, and only tiny teaberry accents for energy. Avoid hearts, candy-princess
motifs, flowery vanity details, and heavy blush-pink surfaces.

- [x] 1. Cutting-board station
- [x] 2. Stove + pan
- [x] 3. Soup pot station
- [x] 4. Oven
- [x] 5. Sink / dish station
- [x] 6. Plate rack
- [x] 7. Serve window
- [x] 8. Mixer refresh
- [x] 9. Section wallpaper sets
- [x] 10. Walkway prop pack
- [x] 11. Wall decor pack
- [x] 12. Reward chest / gift box
- [ ] 13. Coin + star icon pair
- [ ] 14. Roadmap section banners
- [ ] 15. Home-screen hero
- [ ] 16. Per-theme ambient critters
- [ ] 17. Mascot friends
- [ ] 18. Burned-dish + trash FX

---

## 🎨 THE STYLE BLOCK (paste at the start of every prompt)

> Soft 3D-rendered cartoon prop for a cozy pastel bakery-diner mobile game.
> Warm palette: cream `#FFF6EA`, blush pink `#F7B6D4`, butter gold `#F0C15A`,
> warm honey wood `#C9A77F`, mint accents `#BCEFE0`. Rounded, chunky, slightly
> toy-like proportions with gentle painterly texture. Lit by one soft warm key
> light from the upper-left, subtle warm bounce light from below. Clean silhouette,
> thin soft warm outline. Centered on a fully TRANSPARENT background.
> Straight-on front view at a very slight ¾ downward angle (orthographic —
> **not** isometric, **not** side view). No baked-in ground shadow (the game
> draws its own). No text, no watermark, not photorealistic.

**Reference images to attach with every prompt** (this is the target style):
`public/assets/images/cake-world/stations/ks-cw-counter-front-v1.png`,
`ks-cw-trash-can-front-v1.png`, `ks-cw-crate-front-v1.png` (any crate),
`public/assets/images/cake-world/decor/cw-display-stand.png`.

**Delivery specs (all items unless noted):**
- PNG with real alpha transparency, ~1024×1024, object filling ~85% of frame,
  base of the object touching the bottom quarter (it sits on a 64×48 grid tile).
- Stations need **three facings**: `-front`, `-left`, `-right` (left/right = the same
  prop rotated to face that side, like the existing cake-world counters).
- Naming: `ks-cw-<item>-<state>-<facing>-v1.png` → drops straight into
  `public/assets/images/cake-world/stations/` and I'll wire the manifest.

---

## P0 — Unify the cooking stations (kills the "two art worlds" split)

These replace the semi-realistic HD art that clashes on every single level.
Each is one station cabinet in the cake-world counter body (cream cabinet, honey-wood
top, gold trim feet) with the appliance built into it.

### 1. Cutting-board station — `ks-cw-cutting-board-{front,left,right}-v1.png` + `-active-`
**Prompt:** STYLE BLOCK + "A bakery kitchen prep station: the pastel cream counter
cabinet with a thick warm-wood butcher block on top, a chunky rounded chef's knife
resting on it and a few tiny flour dust specks. ACTIVE variant: same station with
the knife mid-chop, three small motion arcs above the board and a couple of
vegetable slices flying — playful, not violent."

### 2. Stove + pan — `ks-cw-stove-{front,left,right}-v1.png`, `-full-`, `-fire-`
**Prompt:** STYLE BLOCK + "A bakery kitchen stove station: pastel cream cabinet
with a rounded rose-gold cooktop, one chunky cartoon frying pan with a butter-gold
handle. EMPTY variant: clean pan. FULL variant: the pan sizzling with food and
2-3 soft steam curls. FIRE variant: cartoon orange-pink flames licking up from the
pan, alarmed but cute, small smoke puffs."

### 3. Soup pot station — `ks-cw-pot-{front,left,right}-v1.png`, `-full-`, `-active-`
**Prompt:** STYLE BLOCK + "A bakery kitchen soup station: pastel cream cabinet with
a big rounded cream-enamel stockpot with gold handles and a blush-pink lid resting
askew. FULL variant: open pot with visible soup and gentle bubbles. ACTIVE variant:
soup boiling happily — bubbles popping, three soft steam swirls, lid balanced on
the rim."

### 4. Oven — `ks-cw-oven-{front,left,right}-v1.png` + `-active-`
**Prompt:** STYLE BLOCK + "A bakery oven station: pastel cream cabinet with a
rounded oven door, a big circular window, butter-gold handle and tiny dial knobs.
ACTIVE variant: warm golden glow through the window with faint heat shimmer lines
and a small steam curl from the door seam."

### 5. Sink / dish station — `ks-cw-sink-{front,left,right}-v1.png` + `-dirty-{0..3}-`
**Prompt:** STYLE BLOCK + "A bakery dish-washing station: pastel cream cabinet with
a deep rounded farmhouse sink in soft white enamel, a butter-gold curved faucet,
and iridescent soap bubbles floating above. DIRTY variants 0-3: same sink with a
stack of 0 / 1 / 2 / 3+ dirty cream plates leaning in it — mess stays cute, smudges
are soft pink-brown, never grim."

### 6. Plate rack — `ks-cw-plate-rack-{front,left,right}-v1.png` + `-count-{0..4}-`
**Prompt:** STYLE BLOCK + "A bakery plate hutch: pastel cream cabinet with an
open upper rack holding a neat stack of rounded cream plates with blush-pink rims.
COUNT variants 0-4: the rack visibly emptier or fuller (0 = bare rack, 4 = proudly
full). The plates must read at very small sizes — chunky and high-contrast."

### 7. Serve window — `ks-cw-serve-window-{front,left,right}-v1.png` + `-active-`
**Prompt:** STYLE BLOCK + "A bakery order pick-up window station: pastel cream
counter with a mint-green awning canopy on tiny gold posts and a small hanging
'ORDER UP' bell. ACTIVE variant: the window glowing warm gold, bell mid-swing with
two small motion arcs, a tiny sparkle — the unmistakable 'deliver here' beacon."

### 8. Mixer — refresh existing — `ks-cw-mixer-{front,left,right}-v2.png` + `-full-`
(Lower urgency inside P0 — only used in Cake World.)
**Prompt:** STYLE BLOCK + "A bakery stand-mixer station: pastel cream cabinet with a
big rounded retro stand mixer in blush pink with gold trim and a cream bowl.
FULL variant: batter in the bowl, whisk mid-spin with two motion arcs and a tiny
flour poof."

---

## P1 — Environment: walls & floors built FOR the game

The current backdrops are repurposed images; the wall line lands at arbitrary
heights and the floors compete with the sprites. These are purpose-built.

### 9. Section wallpaper sets — `ks-wall-<section>-floor70-v2.png` (one per section)
**Format:** 2048×1152 landscape. **Top 30% = back wall, bottom 70% = floor**, with
the wall/floor seam a clean horizontal line at exactly 30% from the top. Floor must
be LOW-CONTRAST and slightly desaturated (the gameplay sprites must pop on it);
wall can carry more detail. Tileable left-to-right preferred.
- **Family Diner:** "Warm honey herringbone wood floor, very soft grain. Wall:
  cream wainscot with blush-pink upper wall, a pastel diner counter backdrop with
  gold trim, soft morning light." + STYLE BLOCK palette
- **Winter Wonderland:** "Pale spruce plank floor with a faint snowy sheen. Wall:
  frosted windows with falling snow, pine garlands with gold fairy lights, cozy
  lodge warmth — cool mint/ice-blue accents over the same cream base."
- **Beach Shack:** "Sun-bleached boardwalk planks, sandy grout. Wall: open-air
  railing with a soft pastel ocean horizon, string lights, two palm fronds peeking
  in — coral and seafoam accents over the cream base."

### 10. Walkway prop pack (8 pieces) — `ks-cw-prop-<name>-v1.png`
Floor-standing props the ambience system scatters around the island. Front view
only, ~700×900.
**One prompt, 8 outputs:** STYLE BLOCK + "A set of cozy bakery-diner floor props,
each isolated: (a) potted fiddle-leaf plant in a blush ceramic pot, (b) standing
chalkboard menu with scalloped gold frame (no readable text — just chalk squiggles),
(c) stack of three flour sacks with a tiny scoop, (d) milk churn with gold bands,
(e) rolling dessert cart with two shelves of pastries, (f) coat stand with one
apron hanging, (g) stack of two produce baskets with greens peeking out,
(h) wooden barrel with a pie cooling on top."

### 11. Wall décor pack (6 pieces) — `ks-cw-walldecor-<name>-v1.png`
Items the renderer pins to the wall band. ~800×600, front view.
**One prompt, 6 outputs:** STYLE BLOCK + "A set of bakery wall decorations, each
isolated: (a) round window with cream frame and warm daylight glow, (b) wooden
shelf with three jam jars and a recipe book, (c) framed pastel painting of a cake,
(d) hanging pendant lamp with a warm glow cone, (e) scalloped mint awning strip,
(f) wall clock with a pie-slice face."

---

## P2 — UI & reward art (feeds the retention-engine work)

### 12. Reward chest / gift box — `ks-ui-reward-box-{closed,open}-v1.png`
**Prompt:** STYLE BLOCK + "A celebratory bakery gift box: cream box with blush-pink
lid, gold ribbon bow. CLOSED: neatly tied, one sparkle. OPEN: lid popped mid-air,
gold coins and a star bursting out with confetti — maximum delight, still soft
pastel." (~800×800; results screen + milestone payouts.)

### 13. Coin + star icon pair — `ks-ui-coin-v2.png`, `ks-ui-star-v2.png`
**Prompt:** STYLE BLOCK + "A chunky gold coin with a tiny whisk embossed on the
face, slight top-left shine — readable at 20px. / A plump five-point star in warm
gold with a blush-pink rim glow — readable at 16px." (512×512 each. One canonical
coin everywhere — the menus currently mix a photographed coin 🌑 with emoji 🪙.)

### 14. Roadmap section banners (3) — `ks-ui-roadmap-<section>-v1.png`
**Prompt:** STYLE BLOCK + "A wide painterly banner strip (1600×400) for a level-map
section header, soft and out-of-focus enough to sit BEHIND text: (a) pastel diner
counter with stools, (b) snowy pine lodge with fairy lights, (c) pastel beach
boardwalk at golden hour." (Lobby roadmap becomes a real journey map.)

### 15. Home-screen hero — `ks-ui-hero-kitchen-v1.png`
**Prompt:** STYLE BLOCK + "A wide warm establishing illustration of the bakery-diner
kitchen interior, empty and inviting, golden-hour light through the window, steam
rising from a pot — soft focus, composed to sit behind a centered logo (quiet
center, detail at the edges). 2048×1152."

---

## P3 — Delight (after everything above)

### 16. Per-theme ambient critters (3 sets × 3 frames) — `ks-cw-<critter>-idle-{1..3}-v1.png`
The ambience system already animates 3-frame idle loops (bees/butterflies exist).
- **Winter:** "A tiny round cardinal with a cream scarf, three wing positions."
- **Beach:** "A tiny seagull with a chef's hat, three wing positions."
- **Diner:** "A tiny hummingbird in blush pink, three wing positions." (~256×256.)

### 17. Mascot friends (2 more) — `ks-cw-mascot-{mint,gold}-idle-{1..4}-v1.png`
**Prompt:** STYLE BLOCK + "A small round dinosaur mascot in soft MINT / warm GOLD
(same body and proportions as the reference purple mascot image — attach
`cw-mascot-1.png`), four idle frames: standing, half-wave, full wave, happy blink."

### 18. Burned-dish + trash FX — `ks-cw-burned-dish-v1.png`, `ks-cw-poof-{1..3}-v1.png`
**Prompt:** STYLE BLOCK + "A comically burned dish: charcoal-dark but cute, one
sad wisp of smoke, tiny embers. / A three-frame soft pink-grey smoke poof for
trashing items — round, bouncy, harmless."

---

## Wiring notes (for me, once art lands)
- P0 items: point the `*_plain` remap table in `public/js/isoRender.js` (~line 95)
  at the new keys — one-line swaps per station, instant rollback by reverting.
- P1 floors: register in `WALLPAPERS` (`public/js/app.js`) with the new v2 names;
  the floor70 seam at exactly 30% lets me finally align the wall line to the grid
  (design-roadmap item #6).
- Props/wall décor: extend `buildAmbience()` — placement rules already exist.
- Drop any delivered file into the matching folder and tell me; I'll wire, verify
  in-preview, and ship the same day.

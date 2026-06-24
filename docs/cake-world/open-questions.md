# Open Questions, Co-op Synergies & Juice Backlog

Living list. The **questions** are decisions we need from you before (or during)
implementation; the **synergy** and **juice** sections are the backlog that makes
this feel like a real, polished game.

## Decisions needed (ranked)

### A. Aesthetic / scope
1. **Sign off the palette & material direction** in [aesthetic.md](aesthetic.md).
   This is the thing we can't undo cheaply — confirm it matches the vision render
   before generating a batch of cakes.
2. **Icing colour authoring:** pre-rendered colour variants per cake (A) or one
   recolourable base + tinted overlay (B)? Drives how much cake art to generate.
   *Recommendation: start (A) for the 5 hero colours so the showpiece is
   pixel-perfect; consider (B) only if the colour matrix explodes.*
3. **How many icing colours** ship at launch? (5 hero + lavender? more?) Each is
   art + a button state.

### B. Mechanics
4. **Where does batter live** between mix and bake — in the bowl (player walks
   away, comes back) or carried in the player's hands? *Recommendation: carried,
   like every other item today, so the bowl is a quick combine not a holding pen
   — keeps the engine model uniform.*
5. **Does icing require a clean plate first?** Your notes say yes ("cannot be
   garnished or served without pulling a clean plate"). Confirm — it adds a nice
   sink/plate co-op loop but one more step for L1.
6. **Single mixing bowl or two?** One = sharper bottleneck (more co-op tension);
   two = smoother for 5+ players. *Recommendation: one in L1–L3, two from L4.*
7. **Burn model for cakes:** reuse the existing oven burn (catches fire → trash)?
   Confirm the fast-burn delta for Honeycomb (your notes say ~20% faster).
8. **Colour button interaction:** instant flip on tap, or a short "recalibrating"
   delay so mis-flips cost time? *Recommendation: short delay — it makes owning
   the button a real job.*
9. **Failure handling:** wrong icing colour / wrong topper — does it serve for
   reduced points, or must be trashed? *Recommendation: serves for partial
   points early levels, strict (trash) in L5.*

### C. Levels / tuning
10. **Confirm the Level-1 grid** in [stations-and-board.md](stations-and-board.md)
    (or tell me to make L1 even tighter for teaching).
11. **Order pacing** per level (`every`, `ttl`, `maxOpen`) — needs playtest, but
    give a target round length (the current levels run 150–160s).
12. **Do we keep the old diner/winter/beach worlds** as later sections, or is the
    whole game becoming Cake World? Changes how much of `levels.js` we replace
    vs. extend.

## Co-op synergies (the "better with friends" backlog)

Ideas that reward coordination — each is optional and ranked rough-high-value
first. They're what turn "5 people each on a station" into "5 people playing
*together*."

- **Role ownership emerges from the grid.** Chopper / Mixer / Baker / Decorator /
  Runner. The layout already nudges this; lean in with subtle per-station "active
  chef" highlighting so people self-assign.
- **The colour-button relay.** One player calls colours, another flips the button,
  decorators queue cakes — the signature Cake World co-op beat.
- **Hand-off bonus.** If cake A is iced by one player and garnished by another
  within N seconds, small combo bonus — rewards the assembly-line, not solo
  hoarding.
- **Pre-prep stockpiling.** Choppers can build a buffer of chopped strawberries on
  counters during a lull; mixers draw from it during a rush. Encourages thinking
  ahead together.
- **Dish-duty altruism.** The sink loop means one player "taking one for the team"
  on dishes keeps the plate stack flowing — visibly thank them (a little ❤️).
- **Shared combo meter.** A team-wide streak for back-to-back on-time serves that
  buffs points — everyone feels the rhythm, nobody wants to be the one who breaks
  it.
- **Carry-pass / throw** (stretch): hand an item to an adjacent teammate without
  walking it to a counter — huge for the cross-room layout.

## Juice & animation backlog

The difference between "works" and "feels like a real game." Grouped by where the
delight lands. (Phase 5, but generate FX art early — see
[assets-to-generate.md](assets-to-generate.md#-fx-sheets-phase-5--juice).)

**Stations (idle life)**
- Oven flames flicker; a warm glow pulses when something's baking.
- Icing bottles bubble/jiggle; the piping gun nods.
- Mixing bowl spins/wobbles while mixing; little batter splats.
- Stove: gentle steam when simmering, angry bubbles + smoke when about to burn.

**Actions (feedback)**
- Chop: knife bob + tiny pieces fly; a fill bar with a satisfying *snick* sound.
- Mix: swirl animation + colour-shift as ingredients combine.
- Ice: frosting squeezes out and coats the cake top-down (the money shot).
- Garnish: toppers sprinkle down with a shimmer; galaxy glitter twinkles.
- Pick up / drop: little squash-and-stretch so items feel physical.

**The serve (the payoff)**
- Window **sparkle burst** + coin pop + soft chime; brief screen-shake on a
  perfect serve; the customer does a happy bounce/heart.
- Combo escalation: bigger burst as the team streak climbs.

**Pressure & state**
- Oven **"ding"** + a timer ring that goes pink→amber→red.
- Customer **patience bar** drains pink→berry-red, with a heartbeat pulse near
  empty.
- "Burning!" smoke + alarm shake on the oven/stove before a ruin.

**Ambient charm**
- Drifting bees/butterflies (already in the vision render) parallaxing over the
  wall.
- Sparkle motes catching light on the parquet.
- The display case slowly rotates its hero cake.

## Parking lot (not now, but noted)

- Per-customer cake preferences with portraits (your character roster is huge —
  Cake World customers could *request* a specific colour by personality).
- Seasonal icing colours / event toppers.
- A "signature cake" creator meta between levels.

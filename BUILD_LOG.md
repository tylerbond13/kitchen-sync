# Autonomous build log

Running list of what I ship while you're away. Newest at top. Each item links its PR.

## Vision (from your brief)
- **AI bot as earned progression** — you don't get the (OP) Sous-Chef for free. Hire it, then buy each skill separately: chopping, dishwashing, cooking (loading pots/ovens), plating, delivering. The bot only does what you've taught it.
- **Rethink powerups** — several are useless (auto-chopper) and don't align. Make the shop a real progression.
- **Character unlock progression** — start with a small cast (the Golden Girls), unlock the rest by playing.
- **Super-Smash-style character grid** — all portraits in one view, see who others picked, no long scroll.
- **Level menu as a roadmap** — show the campaign as a progression map.

## Shipped
### Daily crew streak (v1.42.0)
- **The first finished round each UTC day pays a growing bonus:** 50 coins × streak day, capped at day 7 (350). Same-day rounds never double-pay; a missed day resets to day 1. Implemented in `store.advanceStreak` (injectable clock), threaded through `recordLevelResult` → game_over payload → results pill; `lobbyState.streak` drives a 🔥 lobby chip with a "play today to keep it!" nudge until the day's bonus is banked.
- 4-scenario unit test (same-day idempotence, consecutive growth, gap reset, cap). 94/94 green.

### Props for the walkway — art-tracker #10 (v1.41.0)
- The three Codex-generated Beaux-Arts props are placed by `buildAmbience` on every board: chalkboard menu at the END of the customer line (queueSlot geometry), flour sacks at the bottom-left post, fiddle-leaf at the queue-side top corner — all OUTSIDE the room so they never crowd stations or walkways. _(Verified live on Soup's On.)_

### The room becomes real — design-roadmap #6, THE ROADMAP IS COMPLETE (v1.40.0)
- **World-anchored backdrops (the root-cause "pasted-on" fix):** the wallpaper is now drawn ON the canvas in world coordinates — per-wallpaper `trim` fraction puts the image's wall/floor boundary at world y = oy-8, the painted floor spans the room + a 2-tile apron (rooms with shallow floor slices zoom until the floor covers the play depth), and wall-only strips (Bakery, Cake Shop) get the theme's procedural checker floor beneath. A blurred CSS copy remains underneath purely as edge bleed. Works for every builder board automatically (derives from lvl.w/h); the builder live-preview uses the same path.
- Trim table: wood boards 0 (pure floor) · floor70 rooms 0.30 (TV kitchens + the new diner/winter/beach v2) · Warm Sage 0.85 · Bakery/Cake Shop wall-only.
- **Barney is fully gone:** v1.29.1 removed the mascot decor, but the purple dinosaur was ALSO a roster character (queue + picker). Removed from KS_CHEFS, ASSETS and the picker groups — profiles that had him fall back to the default chef.
- _(93/93 green. Verified live: Brady Bunch floor tiles run under the stations at grid scale; Salad Days wood board anchored; diner v2 + bakery checked in the builder preview; roster confirmed barney-free after reload.)_
- **All 12 design-roadmap items are now shipped** (v1.27.0 → v1.40.0).

### The Beaux-Arts kitchen — Codex art integration (v1.39.0)
- **Integrated Codex's generated Beaux-Arts station set** (merged `codex/kitchen-sync-art-assets`, 79 sprites + 3 props + 3 wall v2s, downscaled to web size per shrink policy): the whole `_plain` station family now points at one coherent style — cutting board, stove (plain/full/fire), pot (plain/full/active), oven (plain/active), sink (clean + dirty 0-3), plate rack (count 0-4), serve window (plain/active), mixer v2 — **all with left/right facings** (the plain set had none). Mixer v2 also replaces Cake World's pink v1. Renderer's overlay plate pile removed (the rack art carries the stack now); corner count badges stay.
- **Diner / Winter / Beach wallpapers → the new floor70 v2 full-room backdrops.**
- **Hidden-tab loading fix (root cause of every "slow cold load" this session):** hidden pages suspend rAF and throttle timers to ≥1s, so the budgeted sprite-prep pump crawled or stalled forever. The pump now drains fully when `document.visibilityState === 'hidden'` (nobody sees jank in a hidden tab) — real-phone benefit: background the tab mid-load and everything is ready on return. Verified: sprite prep went from stalled-forever to <1s in a hidden tab.
- Props (chalkboard menu, flour sacks, fiddle-leaf) are in the repo, wiring reserved for the walkway-prop-pack tracker item.

### The last ten seconds have teeth — design-roadmap #12 Phase C (v1.38.0)
- **Final-ten tension:** woodblock tick each second + a breathing red inset vignette while the clock runs out (playing + unpaused only).
- **⭐ STAR SECURED! banner** the moment the score crosses a star goal mid-round (gold flash under the tickets, star chime, auto-dismiss).
- **Round-end ceremony:** TIME'S UP stamps over the frozen kitchen (~900ms), a circular cream wipe covers the cut, and the results screen lands STAGED — title, stars, score, coins, buttons in sequence; the score count-up now waits for the reveal so nothing plays unseen. Reduced-motion (or missing elements) falls back to the old hard cut.
- Roadmap #12 (flow ceremony) is now complete: A transitions/ripples (v1.35.0), B round-start ritual (v1.37.0), C round-end crescendo (v1.38.0).

### 3·2·1·COOK! + Tyler's kitchen tuning + screenshot backfill (v1.37.0)
- **Tyler's batch (from his message):** characters ship at **1× everywhere** (renderer default, server default, builder default + copy, Tyler's Salad Bar override); **held items ride at the chef's waist** overlaid on the sprite (visible at the top of the screen — above-the-head items clipped); **dish-rack / sink counts pinned right at the sprite's top-right corner** (were floating far away), plates draw larger on both (40px sink pile, readable 38px clean stack on the rack); **floral sconces anchor beside a floor row** so they never sit on an edge-column appliance (they covered the sushi pots).
- **Screenshot archive backfilled per Tyler:** docs/screenshots/ now has all of v1.30.0 → v1.37.0 (9 shots each) — old releases captured by running each release commit in a temp worktree against the archived capture script; game-shot settle bumped for the countdown + cold sprite prep.
- Socket integration tests now wait for phase `playing` after each round start (the countdown queues taps, it doesn't drop them — new unit test covers the queue-through-countdown path). 93/93 green.

### 3·2·1·COOK! — design-roadmap #12 Phase B (v1.37.0)
- **Server-authoritative round-start ritual:** real rounds construct with `countdown: true` → phase `starting`, 3.2s countdown ticked by the game loop and broadcast in every snapshot, so the whole crew pops the same number at the same moment; a `cook` event marks the GO beat. Tests/sims skip it by default (no flag → straight to `playing`).
- **Countdown taps queue instead of dropping** — an eager first grab fires the instant COOK! lands (uses the existing action-queue).
- **Title card** over the frozen kitchen: level emoji + name + star goals (emoji added to staticState), scale-pop numerals, beep per digit, COOK! flash in teal with a vibrate pattern, then the card lifts. Pauses with the game; reduced-motion respected.
- _(Verified live on Salad Days: card + synced "2" pop mid-countdown, round opened normally after; countdown unit test added — queued tap fires at COOK!.)_

### Every theme dresses its own kitchen — design-roadmap #8 complete (v1.36.0)
- **Themed wall props reactivated** from the manifest's dormant `wallAnchor` entries, now placed by `buildAmbience` as normal depth-sorted props just above row 0: diner = sign/window/clock/photos, winter = cocoa sign/winter window/wreath/fireplace, beach = tiki sign/beach window/surfboard/palm. Positions scale from the authored 7-wide wall to any board width with ≥1.5-tile spacing.
- **Queue rug:** a soft procedural runner + per-slot pads drawn from the same `queueSlot` geometry the customers stand on — the waiting line no longer floats on bare floor.
- _(Verified live on Salad Days: clock + photos on the wall band, runner under the queue; 92/92 green, zero console errors.)_

### Every tap answers back — design-roadmap #12 Phase A (v1.35.0)
- Screen changes animate in (.28s opacity/translate/scale, skipped for the game screen so the canvas fit never measures mid-animation) with a soft `SFX.whoosh` on every real screen change (never the initial paint); menu taps bloom a teaberry ripple at the touch point (body-level fixed span, so it survives the screen swap); missing `:active` presses added. All behind prefers-reduced-motion.
- _(Verified live: screen-in animation on the lobby, ripple spawns on tap; 92/92 green. Phases B (round-start title card + countdown) and C (round-end crescendo) remain.)_

### Milestones pay out — design-roadmap #11 (v1.34.0)
- **Every milestone now dispenses coins** (100-2,000, sized so 2-3 claims ≈ one shop upgrade). Complete ones grow a bouncing gold **Claim** button; claims are validated SERVER-side against crew data (rounds, meals, stars, unlocked levels, bot skills — the two character milestones are device-personal so the server accepts the client count) and paid exactly once (`crew.claimedMilestones`, `store.claimMilestone`).
- Unclaimed-reward **badge** on "See all milestones"; claimed rows show `✓ +250`; incomplete rows advertise their payout.
- _(Verified live: badge 8 → claimed First Service → coins 66,608→66,708, row flipped to ✓ +100, badge 7; double-claim covered by a store test; 92/92 green.)_

### The roadmap becomes a journey — design-roadmap #10 (v1.33.0)
- Four distinct level-node states (gold DONE, pulsing PLAY-ribbon CURRENT, ghosted-emoji + plum lock chip LOCKED), a per-world gold trail that fills behind you, and one drawn `.coin` disc replacing the grey 🪙 emoji everywhere money renders.

### The kitchen breathes — design-roadmap #7 + #9, and an expansion fix (v1.32.0)
- **Merged island shadows (roadmap #7):** maximal horizontal counter runs now cast ONE continuous soft shadow pill (concentric fills faking a blur, core matching the old per-tile alpha) instead of a chain of scalloped per-tile blobs; isolated stations keep their ellipse. Counter rows finally read as built-in furniture.
- **Ambient life (roadmap #9):** cooking stations puff procedural steam wisps (soft radial blobs rising with a sine sway, ~400ms cadence per station — replaces the flickering 💨 for cooking; burned keeps it), and 10-14 seeded warm dust motes drift over the upper floor, deterministic per round seed on every client.
- **Kitchen Expansion reachability fix:** the Extra Counter's placement proof accepted "touches ANY floor" — a sealed decorative pocket counted, so on Soup's On it converted the onion crate's only real stand spot and BRICKED onion soup orders. The proof now requires every neighbouring station to keep access to the MAIN walkway component. 2 new regression tests (the soups-on case + all-campaign-levels sweep); 91/91 green.
- Also: `window.__ksRenderer` debug handle for scripted browser verification.
- _(Verified live on Soup's On: scripted a full cook — crate → chop → wait-pickup → pot ×3 — pot reached `cooking` with steam; motes + 4 merged shadow runs active; zero console errors.)_

### Characters walk in front of the order cards (v1.31.0)
- Reverted the v1.30.2 char-rise fit (it shrank every tile ~2×) per Tyler; the room fits between the HUD bands at full size again.
- **New char-overlay canvas above the ticket band:** every chef, customer, carried item and name tag is replayed onto it each frame, clipped to the band region — people now stand IN FRONT of the recipe cards instead of hiding behind them, while in-kitchen depth/occlusion stays pixel-identical (the main pass is untouched).
- v1.30.1/1.30.2 along the way: the ticket band grows with tall multi-step tickets (min-height + re-fit on every band height change), prep badges run sideways in-game, and the rush banner / hint / director HUD position off the real band height.

### Kitchen Expansion — Tyler's idea, shipped (v1.30.0)
- **New shop tier "🏗️ Kitchen Expansion":** Extra Counter (1,200), Third Cutting Board (1,800), Extra Burner (2,400) — crew upgrades that PHYSICALLY grow every kitchen. Applied server-side to each round's grid before parsing, so every client renders exactly the board the server plays.
- **Safe placement rules:** the board/burner convert the counter nearest their existing siblings (same tool as the level cooks with — a pot level gets another pot); the extra counter converts a walkway-edge floor tile only where it provably keeps the main walkway connected and every neighbouring station workable (flood-fill proof per candidate, deterministic order). Levels missing the pieces (no counters, no cookers, cramped customs) skip gracefully.
- _(6 new tests incl. a wedge-proof cramped-board case; suite 89/89 green. Verified live: bought all three in the shop, started Soup's On, kitchen visibly grew with a second pot station.)_

### Nothing blocks the kitchen + mascot removed (v1.29.1)
- **Band-aware fit (from Tyler's phone screenshots):** the renderer now measures the real HUD bands and fits the room's playable rows exactly BETWEEN them — only the decorative wall rises behind the tickets. Chefs can never walk under the order cards, and the score/star bar can never cover the front-row stations, on any phone aspect/notch.
- Combo flame moved into the bottom bar (was floating over the sink); rotating tips moved up under the tickets (were covering the serve windows); tips yield to the rush banner.
- **Purple dinosaur mascot removed everywhere** (ambience + Cake World) per Tyler — recorded in memory as a permanent art rule.

### Results screen becomes the retention engine — design-roadmap #5 (v1.29.0)
- **Every round now ends at the exact moment motivation peaks — with somewhere to go.** New **↻ Retry** and **Next level ▶** buttons on the results screen (Retry re-starts the same level over the wire; Next reads the freshly-unlocked level list, so beating a level for the first time immediately offers its successor). Graceful fallbacks for builder test rounds.
- **Near-miss hook:** within 20% of the next star cutoff → a pulsing teaberry ribbon ("🔥 Only 140 from ⭐⭐ — go again!") and Retry is promoted to the primary button. The genre's proven one-more-round lever.
- **Crew records:** `recordLevelResult` now returns `{prevBest, isRecord}`, threaded through the game_over payload — a shimmering gold **🏆 NEW CREW RECORD** ribbon on a new best, and a "so close to the record" taunt within 10% below it.
- **Coin payout choreography:** after the stars land, the coins pill counts up with tick sounds while 4-8 coins arc from the score into the wallet — banking your score *feels* like getting paid.
- **A named savings goal every round:** "🎯 Next unlock: ⚡ Turbo Burners — 🪙 1,240/1,600" with a mini progress bar (cheapest shop upgrade whose prerequisites are met).
- _(Verified live: played a real bot-crewed round to game-over — savings bar, Kitchen/Retry buttons, Next correctly hidden for customs, coins choreography; Retry's unknown-level fallback toasts + returns to lobby; 83/83 tests green.)_

### Warm bakery re-skin — design-roadmap #3 (v1.28.0)
- **The palette overhaul from the design review, exactly to its spec.** The purple/pink candy palette is gone: the menus now live in a warm bakery room (butterscotch `#F2DFC0` body → cream `#FFFDF7` cards → nested `#FAF1E1` rows), anchored by plum ink and a **rich plum app bar** around the kitchen code with translucent controls.
- **Colour as grammar:** teaberry (`#E14B7E` ramp) = play/advance · gold (`#E8A93C` ramp) = spend/earn (shop prices are now real gold price tags) · teal (`#3FBFAE` ramp) = owned/on. Implemented as design-token re-values + a global sweep of ~20 hardcoded pinks, so every component picked it up at once.
- **Legibility fixes from the review:** eyebrow labels to readable rose, empty stars to warm parchment, milestone bars thickened with a visible track + gold→teaberry fill, locked characters fade to warm sepia instead of dead grayscale.
- _(Verified in-browser: lobby pager, shop verbs, home two-pane, all in the new palette; 83/83 tests green; v1.28.0 archive captured.)_

### Set dressing + grounding — every kitchen comes alive (v1.27.0)
- **Ran a 4-lens expert design review** (kitchen art direction · menu UI/color · retention loops · flow — 5 agents) over real screenshots + the codebase; the full ranked 12-item roadmap with an exact new palette is saved at **docs/DESIGN_ROADMAP.md**. This release ships its top kitchen-cohesion items:
- **Per-level ambient set dressing** — the dormant Cake-World decor system (animated bees/butterflies, mascots, rugs, sconces — art that already existed but ran on ONE level) is now generated for **every** kitchen from its own grid: a rose rug centred on the open floor, sconces mounted on the stage-frame posts, a waving mascot tucked into a walkway corner, and 2-4 drifting fliers, all seeded from the round seed so every phone sees the same arrangement.
- **The framed stage** — the kitchen island now stands on a gold-trimmed panel with warm light pooled at its centre, ambient occlusion under the back row, and a soft inner edge shadow. This is the mediation layer between the sprites and the photo wallpaper ("melts the gap").
- **One warm colour grade** (soft-light wash) over the whole scene + a gently receding top band + stronger station contact shadows — mixed art sources finally read as one lit room.
- **Killed the #1 style-breaker**: the photoreal steel trash can → the ornate cartoon cake-world bin (with real left/right facings).

### Everything got bigger — ~2× kitchen scale on phones (v1.26.0)
- The kitchen was rendering at ~0.84 scale on a landscape phone (27px tiles — "you have to be perfectly precise with your finger"). Measured the fit math and removed the three height-wasters that were shrinking every tile:
  1. **The customer queue no longer stretches the world** — the waiting line is clamped inside the room's rows (tighter crowd) instead of hanging ~2 tiles below it.
  2. **Headroom is sized to reality** — the empty band above the kitchen now accounts for where characters can *actually* stand (campaign boards have stations across the top row, so chefs stand a full tile lower), instead of a worst case nobody occupies. Custom boards with walkable top rows keep the full clearance.
  3. **The canvas owns the whole viewport** — it runs edge-to-edge under the HUD bands; the decorative wall naturally absorbs the ticket-band zone, and the bands are pointer-transparent in their gaps so no taps get eaten.
- Net: tiles went from ~27px to ~50px on a phone (**+85%**) — stations/ingredients/chefs fill the width, easy to see and tap, without looking cartoonishly oversized. Desktop gets the same treatment and looks great (width-bound fit).
- _(Verified in-browser at 844×390 and 1280×800: room fills the width, taps land at the new scale, rush banner/tickets/director HUD all clear of each other; 83/83 tests green.)_

### Wait-for-it pickups (v1.25.0)
- **Tapping a busy station now means "grab it when it's ready" instead of a decline.** A tap on a mid-chop cutting board (empty-handed or holding a plate) registers a wait: the chef stands there and the item lands in their hands — or on their plate — the instant chopping finishes. Same for **everything cooking**: tap a pan/pot/oven/mixer mid-cook and the dish comes straight off the heat on the ding, which is also the surest way to never burn it.
- Waits are intents, not locks: tapping anything else, steering, or walking away cancels; if someone else grabs the item first the wait just dissolves; burned food is never forced into your hands. A ⏳ pops at the station so the wait feels registered.
- Preserves the old guarantees: bystanders still never auto-grab (an explicit tap is required), chopping continues uninterrupted, and the swap/stack/plate flows are untouched.
- **Hardened by an adversarial multi-agent review** (11 agents, 3 lenses, refute-style verification) which confirmed 3 real edge cases — all fixed: (1) a waiter who **exits/disconnects** mid-wait no longer ghost-grabs the finished food into absent hands (rooms clears the intent on exit/detach — the item stays for the crew); (2) a wait is **refused up front (✕)** when what you're holding could never receive the output (e.g. a cucumber-salad plate at a patty pan) instead of promising a doomed pickup while the dish burns; (3) the wait is **bound to the specific item/batch** — if a teammate swaps the board's contents or the pot is reloaded, the wait dissolves instead of claiming food you never asked for.
- _(Tested: 8 unit tests + 2 full socket integration tests (the real client pipeline incl. the exit-mid-wait ghost case); suite 83/83 green.)_

### Per-version screenshot archive (v1.24.1)
- New **`docs/screenshots/v<version>/`** archive — 9 shots per release (home landscape+portrait, changelog, lobby Levels + Shop pages, milestones, characters, in-round gameplay, pause) so the game's visual progression is browsable on GitHub next to CHANGELOG.md. First archived build: **v1.24.0** (the mobile overhaul).
- Repeatable via **`npm run screenshots`** (`scripts/capture-screenshots.mjs`): drives your installed Chrome headlessly (puppeteer-core, `--no-save`, nothing added to the deploy), reads `/api/version`, walks every screen in a fresh profile, and drops the PNGs in the right folder. Run once per release.

### Mobile overhaul — full-screen kitchen + landscape-first menus (v1.24.0)
- **The game board now owns the whole phone screen.** The themed wallpaper (Brady Bunch, Golden Girls, wood…) covers the entire viewport — no left HUD rail, no purple margins. The canvas sits between two floating HUD bands so play is never covered: **timer top-left, order tickets across the top, pause top-right**; bottom banner with **score, star-progress track with each cutoff printed under its ★ (570/1000/1430-style), and the now-playing radio bar**. Music/SFX/AI-Director buttons and the crew chips moved into the pause menu; rotating hint tips float in a translucent pill.
- **In-game order tickets got a solid readable "paper" look** (the decorative card-frame PNG washed out at compact size — pre-existing) with distinct gold *warn* / red *urgent* states.
- **Menus are landscape-first:** on phones the lobby becomes a **horizontal card pager** (swipe between Levels → Crew → Shop → Music → actions; Levels lands first; scroll-snap), the home screen is a **two-pane layout** (logo + actions beside the scrolling profile card), the tutorial pages sideways, the **results screen fits on one screen** (two-column grid), and modals widen to use the screen. Portrait/desktop keep the classic vertical stack (wrappers are `display:contents` there, explicit `order` preserves the original stacking).
- _(Verified in a landscape phone viewport: lobby pager swipes through 5 pages, full-bleed round on Salad Days with taps landing correctly, pause overlay covers everything with the relocated tools, results one-screen grid, home two-pane; portrait home unchanged; 74/74 tests green.)_

### In-game "What's new" changelog page (v1.23.0)
- Built a **📋 What's new** page inside the game listing **every release** (48 and counting), newest first, each with an emoji, title, version pill and plain-language bullets — the newest version is highlighted with a "Latest" badge so you can see exactly what just changed. Two entry points: a **What's new** button on the home screen and the **version footer** (tap it anywhere). A little pink **unread-release dot** shows on both until you've opened the latest, then clears (remembered per device).
- The changelog data lives in `public/js/changelog.js` (`window.KS_CHANGELOG`), reconstructed from the full git history + BUILD_LOG via a parallel workflow, and mirrored to a repo-root **`CHANGELOG.md`** for GitHub/reviewing.
- _(Verified in-browser: 48 entries render, latest highlighted, both entry points open it, close/backdrop work, unread dot shows then clears on view. Fixed a TDZ bug where the setup-time badge check read a not-yet-initialised const.)_

### Contextual shop toasts (v1.22.2)
- Buying from the shop now gives **next-step guidance** instead of a generic "unlocked": hiring the Sous-Chef says "🤖 Sous-Chef hired! Teach it skills below, then toggle it on above for your next round," and teaching a skill says "your Sous-Chef can do it once toggled on." Makes the hire → teach → toggle flow self-explanatory.

### Fix: revive the AI-teammate toggle + chef-modal close (v1.22.1)
- **Important regression fix.** The in-lobby character switcher (v1.19.0) bound the chef-modal's close button at page-setup time — but that modal is parsed *after* app.js runs, so the lookup returned null and **threw**, silently killing every binding after it in that block: the **🤖 AI teammate On/Off toggle**, the builder's board-size buttons, and the tuning-slider live outputs. And the chef modal's own ✕/backdrop never wired up, so it could trap you.
- Fix: bind the chef-modal close + backdrop **when the modal opens** (element guaranteed to exist), and removed the throwing setup-time lines so everything below them binds again. _(Verified in-browser: bot toggle responds — shows "Hire a Sous-Chef first" when un-hired — chef modal opens *and* closes, builder controls bound.)_ Same bind-on-open pattern now used by the new Milestones modal.

### Milestones — concrete goals across every system (v1.22.0)
- New **🏅 Milestones** panel (opened from "See all milestones ›" under the lobby progress banner) with 12 goals layered over all the progression systems — First Service, Rising Star (any 3★), Hire Help, Master Teacher (all 5 bot skills), Seasoned Crew (25 rounds), Growing Cast / Full Ensemble (characters), Trailblazer (all levels), Line Cook / Head Chef (100 / 500 meals), Big Earner (10k coins), Perfectionist (3★ everything). Each shows a live progress bar + count and turns green with a ✓ when complete; the header tallies "X/12 unlocked". All derived from data already in the lobby state — a light "collect them all" that gives players goals beyond the next star. _(Verified in-browser: 12 rows render with correct progress, completed ones flip green, open/close/backdrop all work.)_

### Shop affordability cues (v1.21.2)
- The Kitchen Shop now guides your spending: items you can afford **right now** get a soft gold **glow** to draw the eye, and items you can't yet afford show exactly **how much more to save** ("· 🪙 1,000 more to save"). Turns the shop from a static price list into a visible savings goal, complementing the results-screen coins pill. _(Verified in-browser: glow on the affordable row, shortfall hints on the rest, locked rows unchanged.)_

### Coins-earned pill on the results screen (v1.21.1)
- The results screen now shows a golden **"🪙 +{score} coins · 💰 {total} banked"** pill under the big score, making it obvious that your score banks 1:1 as coins and how much your crew now has to spend in the shop. Closes the score → coins → shop loop right at the moment of reward. _(Verified in-browser: pill renders under the score with payout + running total.)_

### First-run welcome / onboarding (v1.21.0)
- New players now land on a friendly **one-time welcome card** on the home screen that explains the whole loop in three lines: ⭐ cook to earn stars (unlock characters + open levels), 🪙 bank coins to hire & train your AI Sous-Chef, 🎭 start with the Golden Girls and unlock the rest by playing. Dismisses for good with "Let's cook →" (stored per device; guests use sessionStorage). Ties together everything the progression work added so a newcomer isn't dropped in cold. _(Verified in-browser: shows on first visit, 3 rows + button; dismiss hides it and sets the flag so it won't reappear.)_

### Level-unlock celebration (v1.20.2)
- Parallel to the character toast: when a finished round earns the first star on a level (which opens the next one), you now get a **"🔓 New level unlocked: {name}!"** toast so campaign progress is visible the moment it happens, instead of quietly un-greying in the roadmap. Works by diffing the unlocked-level set across lobby updates; re-baselines silently per crew so joining never fires it.

### Character-unlock celebration (v1.20.1)
- When a finished round banks enough stars to cross a character's unlock threshold, you now get a **"🎉 New character unlocked: {name}!"** toast (with the unlock chime + a little haptic buzz) right on the results screen — so the progression actually *feels* rewarding instead of a character silently appearing in the grid later. Handles multi-unlocks in one round ("🎉 3 characters unlocked: …"). Guarded so the initial page-load star sync never spuriously fires it.

### Progression dashboard in the lobby (v1.20.0)
- Added an at-a-glance **progress banner** at the top of the Levels card that ties all the new systems together: ⭐ stars (x/48), 🏆 3★ levels (x/16), 🎭 characters unlocked (x/70), 🤖 Sous-Chef skills taught (x/5), and a **"next character" hint** telling you exactly which chef unlocks next and how many stars away it is. Gives players clear goals across the whole progression.

### Juicier serve feedback + combo flourish (v1.19.1)
- Serving now throws a **coin shower** (more coins the bigger the tip), a **burst ring that grows with your combo**, confetti, and a bigger gold score pop for VIP/big serves — turns out the coin/ring juice was written but never wired up. Also added a **"COMBO ×N!"** flourish that escalates as you keep a streak going. Small, self-contained render polish.

### In-lobby character switcher with live crew picks (v1.19.0)
- Added a **🎭 Change character** button in the lobby that opens the full Smash-style grid as a modal — so you can switch characters mid-lobby (before this the picker was home-only).
- **See what everyone's choosing:** each character cell is badged with the crew members currently on it (your pick shows as a green "You"), updating live as people change. New `set_chef` server event broadcasts your pick to the crew instantly.
- Same unlock gating applies in the modal. _(Verified: modal + unlock grid + live pick swap; the crew-pick badges are a simple lobby.players filter — couldn't populate a 2-player crew in the headless preview to screenshot them.)_

### Level menu is now a progression roadmap (v1.18.0)
- The campaign level list is redesigned as a **visual roadmap**: each world is a labelled "stage" with a dotted trail down its side and its levels as compact map nodes (emoji + ★★★ progress + name). Locked levels show a 🔒, and your next objective (the first unlocked level you haven't 3-starred) gets a glowing **"you are here"** marker.
- Same data + click handlers (tap a node to play; host edit/delete float in the corners) — just a far more scannable, game-like layout than the old vertical card list.

### Character unlock progression + Super-Smash-style grid (v1.17.0)
- You now **start with the Golden Girls** (Betty White, Blanche, Dorothy) + the house Chef & Grandma Rose, and **unlock the rest by banking stars** across your games (every ~2 lifetime ★ unlocks the next character, in roster order). Locked characters are greyed with a "🔒 N★" hint; tapping one tells you how far off you are.
- Redesigned the character menu as a **dense Smash-Bros-style grid** — small square portraits, the whole roster readable in one glance instead of a long scroll. Each section header shows an unlock tally (e.g. Sitcom Stars 3/14).
- Verified in-browser: 5 starters unlocked, rest locked with rising thresholds.
- _Follow-up noted:_ "see which character your crew picked" needs the picker available in-lobby (currently home-only) — will add an in-lobby character switch with live crew badges next.

### AI Sous-Chef is now earned progression + reworked powerups (v1.16.0)
- The bot is no longer a free toggle. **Hire a Sous-Chef** in the Kitchen Shop, then buy each skill separately: **Chopping, Dishwashing, Cooking, Plating, Delivery**. The bot only does what you've taught it — so early on it just chops, and only becomes the OP full-kitchen helper once you've invested.
- Dropped the Prep/Expo modes → the bot's behaviour now emerges from its skills (capability-driven). Lobby toggle is On/Off and is locked until you hire.
- Shop is grouped (AI Sous-Chef / Kitchen Tools) with prerequisite locks (can't teach Cooking before Chopping, Delivery before Plating).
- Powerup rework: **Auto-Chopper** was useless (chopping is already hands-free) → now **2× board chop speed** and cheaper; retuned costs so tools are a real progression.
- 74/74 tests green (added: skill-less bot idles; chop-only preps; chop+plate+serve serves a salad; full set cooks soup; no crashes for any skill set).

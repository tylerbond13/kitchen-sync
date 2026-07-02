# Autonomous build log

Running list of what I ship while you're away. Newest at top. Each item links its PR.

## Vision (from your brief)
- **AI bot as earned progression** — you don't get the (OP) Sous-Chef for free. Hire it, then buy each skill separately: chopping, dishwashing, cooking (loading pots/ovens), plating, delivering. The bot only does what you've taught it.
- **Rethink powerups** — several are useless (auto-chopper) and don't align. Make the shop a real progression.
- **Character unlock progression** — start with a small cast (the Golden Girls), unlock the rest by playing.
- **Super-Smash-style character grid** — all portraits in one view, see who others picked, no long scroll.
- **Level menu as a roadmap** — show the campaign as a progression map.

## Shipped
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

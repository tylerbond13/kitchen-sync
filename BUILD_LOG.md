# Autonomous build log

Running list of what I ship while you're away. Newest at top. Each item links its PR.

## Vision (from your brief)
- **AI bot as earned progression** — you don't get the (OP) Sous-Chef for free. Hire it, then buy each skill separately: chopping, dishwashing, cooking (loading pots/ovens), plating, delivering. The bot only does what you've taught it.
- **Rethink powerups** — several are useless (auto-chopper) and don't align. Make the shop a real progression.
- **Character unlock progression** — start with a small cast (the Golden Girls), unlock the rest by playing.
- **Super-Smash-style character grid** — all portraits in one view, see who others picked, no long scroll.
- **Level menu as a roadmap** — show the campaign as a progression map.

## Shipped
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

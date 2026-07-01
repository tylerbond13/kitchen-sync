# Autonomous build log

Running list of what I ship while you're away. Newest at top. Each item links its PR.

## Vision (from your brief)
- **AI bot as earned progression** — you don't get the (OP) Sous-Chef for free. Hire it, then buy each skill separately: chopping, dishwashing, cooking (loading pots/ovens), plating, delivering. The bot only does what you've taught it.
- **Rethink powerups** — several are useless (auto-chopper) and don't align. Make the shop a real progression.
- **Character unlock progression** — start with a small cast (the Golden Girls), unlock the rest by playing.
- **Super-Smash-style character grid** — all portraits in one view, see who others picked, no long scroll.
- **Level menu as a roadmap** — show the campaign as a progression map.

## Shipped
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

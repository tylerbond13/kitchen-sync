# Self-review vs the design roadmap — July 3, 2026 (v1.43.0 screenshot, Pizza Panic)

Tyler asked: *is the current game meeting the expectations the design roadmap set?*
Honest answer: **mostly, with four visible gaps.** The bones the roadmap asked for
are all there — one warm palette, a framed stage, state-true Beaux-Arts stations,
grounded characters, live ambience. But the screenshot shows the seams:

## What's working
- The Beaux-Arts station set reads as ONE hand-crafted kitchen (ovens, sinks,
  racks with real plate counts, serve counters) — exactly the "single art
  direction" the roadmap demanded.
- Grounding: merged shadows, queue rug, props (flour sacks / chalkboard), corner
  count badges, characters in front of the ticket band. Nothing floats.
- HUD is calm and legible; star bar, coin pill, tickets contained.

## Gaps found (and what shipped for each, v1.44.0)
1. **Two different games on one board.** The plain counter blocks are still the
   old chunky BROWN wood — they clash hard against the cream/gold stations.
   *No Beaux-Arts counter art exists yet* → added as art-tracker item 19 (the
   single highest-impact art request left). Code can't fix this one.
2. **The wood board was still the default backdrop for every campaign level** —
   we built world-anchored ROOMS (roadmap #6) and then didn't use them by
   default. Fixed: diner/winter/beach levels now default to their theme's v2
   room (explicit level/builder wallpaper still wins; cake-decor boards keep
   the board look).
3. **Blush-pink roses on Beaux-Arts scenes.** The rose rug + rose sconces are
   wood-board/cake dressing; on the new rooms they fight the brief ("avoid
   flowery vanity, blush-pink"). Fixed: rooms (trim > 0) skip the roses; the
   wood board and Cake World keep them.
4. **VIP tickets looked broken in the band** — the decorative frame PNG washes
   out at compact size (the pale oversized-looking ticket in the screenshot).
   Fixed: compact VIPs get solid gold paper + a brass edge.

## Watchlist (not actioned)
- Character cutout style vs cartoon kitchen: intentional (the celebrity roster
  IS the game's joke). Revisit only if Tyler asks.
- 1× character scale on very wide desktops can read small; it's Tyler's call
  from July 3 and correct on phones — leave.
- Remaining load weight: the 68-character portrait set (~13MB) — candidate for
  a future diet pass.

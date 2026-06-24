# 🍳 Kitchen Sync

**Cook together, apart.** A real-time co-op cooking game for mobile web, inspired by *Overcooked: All You Can Eat* — built so my 5 siblings and I can cook chaotic meals together from different states.

No app store, no install: one player starts a kitchen, shares a link, everyone joins from their phone browser with a 4-letter code (Jackbox-style) and you're cooking in seconds.

<p align="center">
  <img src="public/icons/icon-192.png" width="96" alt="Kitchen Sync icon">
</p>

## ✨ Features

- **Real-time co-op for 1–8 chefs** — server-authoritative simulation over WebSockets; everyone sees the same kitchen live.
- **Jackbox-style joining** — share `https://your-host/?join=TACO` and family is in.
- **Tap or type to play** — on a phone, tap a crate to grab, tap a board to chop, tap the stove to cook, tap the window to serve; one gesture, zero learning curve. On a computer, **arrow keys steer your chef and the spacebar works the station they're facing** — tap and keyboard are equally first-class. Plays in **landscape** — turn the phone sideways and the kitchen fills the screen.
- **A 14-level campaign across 3 themed worlds** — 🍳 The Family Diner, ❄️ Winter Wonderland, and 🏖️ Beach Club, each with its own palette, ingredients, and recipes (stew, hot cocoa, smoothies, poke, fish tacos...). Score thresholds award 1–3 stars; each star unlocks the next level.
- **Persistent memory** —
  - **Crews**: your kitchen code is permanent. Come back next week, type the same code, and your stars, best scores, and unlocks are still there.
  - **Profiles**: each device keeps its chef (name + avatar), and the server tracks lifetime stats (meals served, stars earned, rounds played).
- **~70 playable chefs** (original characters plus celebrity/pop-culture homages), juicy animations, synthesized sound effects, combo multipliers, burnable food, and order tickets that shake when they're about to expire.
- **Dishwashing** (level 2+): plates are limited, served plates come back dirty at the sink, and someone has to scrub them back into the stack — peak co-op chaos. (Handheld food — burgers on buns, fish tacos — skips the plate entirely.)
- **The Kitchen Shop**: rounds bank coins into a persistent crew wallet; buy upgrades like the 🤖 Auto-Chopper, 👟 Speedy Sneakers, 🫧 Dish-Bot, and 🔥 Turbo Burners.
- **Lunch rushes & VIP orders**: twice a round the kitchen goes into overdrive (double tips!), and gold 👑 tickets pay triple on a tight timer.
- **Recap awards**: MVP / Prep Master / Dish Hero titles after each round — who served, chopped, and washed the most.
- **Crew radio**: search YouTube and queue songs that play in sync across every phone in the kitchen. A slim on-board strip shows what's playing (and what's next) with a skip button; each phone's music on/off, sound effects, and **game soundtrack ↔ crew radio** source pick all live in the pause menu (which doubles as settings).
- **Prep-chain tickets & custom art**: every ticket shows the exact steps (🥩 › 🔪 › 🍳), with hand-drawn art for the ambiguous ingredients.
- **Installable PWA** — Add to Home Screen on iOS and it launches full-screen like a native app.

## 🚀 Quick start

```bash
npm install
npm start          # → http://localhost:3000
```

**Playing solo** works out of the box — start a kitchen, tap a level, and the game scales for you (solo and duo crews get slower order tickets and lower star goals).

**Testing multiplayer on one machine:** a normal second tab won't work — both tabs share the same device identity, so the server treats tab 2 as you reconnecting. Instead, open the second window with **`http://localhost:3000/?guest`** (each `?guest` tab gets its own per-tab chef), or use a private/incognito window, or open `http://<your-mac-ip>:3000` on your phone over the same Wi-Fi.

To play with people outside your network you need a public URL — see deployment below, or for a quick test session use a tunnel:

```bash
npx localtunnel --port 3000   # or: cloudflared tunnel --url http://localhost:3000
```

## 🕹 How to play

1. **Host:** pick your chef → *Start a Kitchen* → share the invite link (📤).
2. **Everyone else:** open the link → pick a chef → you're in the lobby.
3. Host taps a level. Orders appear with countdown timers; the team divides the work:
   - Tap an **ingredient crate** to grab.
   - Tap a **cutting board** to place + chop — the board keeps chopping on its own while you move on to the next job.
   - Tap the **stove/pot/oven** to cook. Cooking continues on its own… and **burns** if you forget it. 🔥
   - Tap the **plate stack** for a plate, tap counters/appliances to assemble.
   - Tap the **green serving window** to deliver. On-time = points + tip + combo.
   - 💻 **On a computer?** Arrow keys move your chef and the **spacebar** works the station they're facing — every tap action has a keyboard equal.
4. Beat the score thresholds for ⭐⭐⭐ and unlock the next level.

## 🏗 Architecture

```
server/
  index.js    Express + Socket.IO entry point + YouTube search endpoint
  rooms.js    Live rooms: lobby membership, game lifecycle, host logic, crew-radio queue
  game.js     The kitchen simulation (12Hz tick): pathfinding, chopping,
              cooking/burning, plating, dishwashing, orders, rushes, scoring, stars
  levels.js   Levels, layouts, recipes, cook combos, upgrades, star thresholds
  store.js    JSON persistence (crews.json, players.json) — atomic, debounced
  youtube.js  YouTube search for the crew radio
public/
  index.html           Single-page app: home / join / lobby / game / results
  js/app.js            Screens, profile, socket flow, HUD, order tickets, shop
  js/isoRender.js      Canvas renderer: straight-on ¾ grid, interpolated chefs, stations, effects
  js/gfx.js            Sprite loader: background-key + trim into cached prepared sprites
  js/assetManifest.js  Asset + character manifest (KS_CHEFS, station/food/room art)
  js/art.js            Vector/emoji fallbacks for tokens
  js/sound.js          WebAudio synth SFX
  js/music.js          Built-in menu vs. in-round music
  js/radio.js          Crew radio: synced YouTube playback (YT IFrame API)
  sw.js, manifest.webmanifest, icons/   PWA shell (locked to landscape)
scripts/   Dependency-free PNG icon generator + asset tooling
test/       Engine unit tests + 2-client end-to-end test
```

**Design decisions**

- *Server-authoritative*: phones only send taps; the server simulates everything. No cheating, no desync, and a dropped player's chef just idles until they reconnect (rejoin is automatic, even mid-round).
- *Tap-to-act, not joystick*: virtual joysticks are miserable on phones, so tapping a station pathfinds (BFS) and auto-interacts on arrival — intuitive enough that nobody reads instructions. Desktop, which has a real keyboard, also gets direct **arrow-key** movement and a **spacebar** interact; the two schemes are equally first-class.
- *JSON file store*: right-sized for a family game; `store.js` is the single seam to swap in SQLite/Postgres later.

## ☁️ Deploying (so the family can play)

Any Node host with WebSocket support works. The app listens on `$PORT` and stores data in `$DATA_DIR` (default `./data`).

**Render** (free tier works — a `render.yaml` blueprint is included):
1. Push this repo to GitHub → Render → New → Blueprint → connect the repo. Or create a Web Service by hand: build `npm install`, start `npm start`.
2. That's it. The free tier's disk is ephemeral, but progress still survives restarts: **every phone carries a backup** of its crew's campaign and its player stats, and any member's device restores the server's memory on join.
3. (Optional, paid) For server-side durability instead, add a persistent disk and set `DATA_DIR` to its mount path.

Note: free Render services sleep after ~15 idle minutes; the first person to open the link waits ~30–60 s while the kitchen wakes up.

**Railway / Fly.io**: same idea — `npm start`; attach a volume and point `DATA_DIR` at it for server-side persistence.

> Vercel/Netlify serverless won't work — the game needs a long-lived WebSocket server.

Then text the family: `https://your-app.onrender.com/?join=CODE` 📲
On iPhone: open in Safari → Share → **Add to Home Screen** for the full-screen app experience.

## 🧪 Tests

```bash
npm test
```

- `test/game.test.js` — engine: chopping, cooking & burning, plating rules, serving, scoring, expiry, stars, and validation that every level layout is reachable/playable.
- `test/integration.test.js` — boots the real server, drives two socket clients through create → join → play → results, and asserts crew progress + profile stats persist and level 2 unlocks.

## 📄 License

MIT

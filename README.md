# 🍳 Kitchen Sync

**Cook together, apart.** A real-time co-op cooking game for mobile web, inspired by *Overcooked: All You Can Eat* — built so my 5 siblings and I can cook chaotic meals together from different states.

No app store, no install: one player starts a kitchen, shares a link, everyone joins from their phone browser with a 4-letter code (Jackbox-style) and you're cooking in seconds.

<p align="center">
  <img src="public/icons/icon-192.png" width="96" alt="Kitchen Sync icon">
</p>

## ✨ Features

- **Real-time co-op for 1–8 chefs** — server-authoritative simulation over WebSockets; everyone sees the same kitchen live.
- **Jackbox-style joining** — share `https://your-host/?join=TACO` and family is in.
- **Mobile-first controls** — tap a crate to grab, tap a board to chop, tap the stove to cook, tap the window to serve. One gesture, zero learning curve, designed for one-handed iPhone play.
- **A 6-level campaign with stars** — salads → burgers → soups → sushi → pizza → the Grand Feast. Score thresholds award 1–3 stars; each star unlocks the next level.
- **Persistent memory** —
  - **Crews**: your kitchen code is permanent. Come back next week, type the same code, and your stars, best scores, and unlocks are still there.
  - **Profiles**: each device keeps its chef (name + avatar), and the server tracks lifetime stats (meals served, stars earned, rounds played).
- **12 avatars**, juicy animations, synthesized sound effects (no audio assets), combo multipliers, burnable food, and order tickets that shake when they're about to expire.
- **Installable PWA** — Add to Home Screen on iOS and it launches full-screen like a native app.

## 🚀 Quick start

```bash
npm install
npm start          # → http://localhost:3000
```

Open it on two phones (or two browser tabs), create a kitchen on one, join with the code on the other.

To play with people outside your network you need a public URL — see deployment below, or for a quick test session use a tunnel:

```bash
npx localtunnel --port 3000   # or: cloudflared tunnel --url http://localhost:3000
```

## 🕹 How to play

1. **Host:** pick your chef → *Start a Kitchen* → share the invite link (📤).
2. **Everyone else:** open the link → pick a chef → you're in the lobby.
3. Host taps a level. Orders appear at the top; the team divides the work:
   - Tap an **ingredient crate** to grab.
   - Tap a **cutting board** to place + chop — your chef has to stand there while chopping.
   - Tap the **stove/pot/oven** to cook. Cooking continues on its own… and **burns** if you forget it. 🔥
   - Tap the **plate stack** for a plate, tap counters/appliances to assemble.
   - Tap the **green serving window** to deliver. On-time = points + tip + combo.
4. Beat the score thresholds for ⭐⭐⭐ and unlock the next level.

## 🏗 Architecture

```
server/
  index.js    Express + Socket.IO entry point
  rooms.js    Live rooms: lobby membership, game lifecycle, host logic
  game.js     The kitchen simulation (12Hz tick): pathfinding, chopping,
              cooking/burning, plating, orders, scoring, stars
  levels.js   Levels, layouts, recipes, cook combos, star thresholds
  store.js    JSON persistence (crews.json, players.json) — atomic, debounced
public/
  index.html  Single-page app: home / join / lobby / game / results
  js/app.js   Screens, profile, socket flow, HUD, order tickets
  js/render.js  Canvas renderer: interpolated chefs, stations, effects
  js/sound.js   WebAudio synth SFX
  sw.js, manifest.webmanifest, icons/   PWA shell
scripts/gen-icons.js   Dependency-free PNG icon generator
test/       Engine unit tests + 2-client end-to-end test
```

**Design decisions**

- *Server-authoritative*: phones only send taps; the server simulates everything. No cheating, no desync, and a dropped player's chef just idles until they reconnect (rejoin is automatic, even mid-round).
- *Tap-to-act, not joystick*: virtual joysticks are miserable on phones. Tapping a station pathfinds (BFS) and auto-interacts on arrival — intuitive enough that nobody reads instructions.
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

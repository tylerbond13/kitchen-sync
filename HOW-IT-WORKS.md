# Kitchen Sync — How It Works (Under the Hood)

A from-scratch tour of how this game is actually built. It assumes you can read
a little JavaScript but have **never built a game or a multiplayer app before**.
The goal is that by the end you can explain — to yourself or anyone else — what
every part does and how the pieces talk to each other.

Read it top to bottom the first time. After that it works as a reference: each
section is self-contained and links to the real files.

**Table of contents**

1. [The 60-second mental model](#1-the-60-second-mental-model)
2. [The one big idea: server-authoritative multiplayer](#2-the-one-big-idea-server-authoritative-multiplayer)
3. [The tech stack (and why each piece is here)](#3-the-tech-stack-and-why-each-piece-is-here)
4. [The folder map](#4-the-folder-map)
5. [A whole session, start to finish](#5-a-whole-session-start-to-finish)
6. [The game loop — the heart of any game](#6-the-game-loop--the-heart-of-any-game)
7. [The data model: what state lives where](#7-the-data-model-what-state-lives-where)
8. [Storage & persistence](#8-storage--persistence)
9. [How the client and server talk (the message catalog)](#9-how-the-client-and-server-talk-the-message-catalog)
10. [Rendering: turning a grid of letters into a kitchen](#10-rendering-turning-a-grid-of-letters-into-a-kitchen)
11. [Core game mechanics, one at a time](#11-core-game-mechanics-one-at-a-time)
12. [Audio: sound effects, music, and the crew radio](#12-audio-sound-effects-music-and-the-crew-radio)
13. [How it's deployed (code → your family's phones)](#13-how-its-deployed-code--your-familys-phones)
14. ["I want to change X" — where to look](#14-i-want-to-change-x--where-to-look)
15. [Glossary](#15-glossary)

---

## 1. The 60-second mental model

Kitchen Sync is **two programs that talk over the internet**:

- A **server** (runs on one computer in the cloud) that holds the *one true copy*
  of the game and does all the thinking.
- A **client** (the web page that runs in each player's phone browser) that draws
  the kitchen and sends the player's taps to the server.

Everyone's phone is connected to the same server. When you tap, your phone tells
the server "I tapped tile (4,2)." The server figures out what that means (walk
there, pick up the lettuce), updates the game, and then **tells every phone in
your kitchen the new state of the world** ~12 times a second. Each phone just
draws whatever the server last told it.

That's the whole thing. The rest of this document is detail on each of those
moving parts.

```
   YOUR PHONE                    THE SERVER                  SIBLING'S PHONE
 ┌────────────┐   "I tapped    ┌──────────────┐   "here's   ┌────────────┐
 │  draws the │── tile 4,2" ──▶│  the ONE real │── the new ─▶│  draws the │
 │  kitchen   │◀── new state ──│  game lives   │── state" ──▶│  kitchen   │
 └────────────┘                │  here         │            └────────────┘
                               └──────────────┘
```

---

## 2. The one big idea: server-authoritative multiplayer

This is the most important concept in the codebase. Understand it and everything
else clicks into place.

**The problem:** five people in five states each have a phone. They all need to
see the *same* kitchen at the *same* time — the same chef positions, the same
orders, the same score. If each phone ran its own copy of the game, they'd
immediately disagree (different timing, dropped messages, cheating), and the
kitchens would "desync."

**The solution Kitchen Sync uses — "server-authoritative":** there is exactly
**one** real game, and it lives on the server. Phones are not allowed to change
the game directly. A phone can only do two things:

1. **Send an *intent*** — "the player tapped here." (Not "move my chef to here";
   just the raw tap.)
2. **Receive and draw state** — the server periodically sends a snapshot of the
   whole game, and the phone renders it.

The server is the single referee. It decides what every tap means, runs the
clock, moves the chefs, burns the food. Because there's only one referee:

- **No desync** — everyone is drawing the same snapshot.
- **No cheating** — your phone can't lie about the score; it doesn't own the score.
- **Disconnects are graceful** — if your phone drops, the game keeps running on
  the server; when you reconnect, you just start receiving snapshots again.

The trade-off is **latency**: there's a round trip (tap → server → snapshot)
before you see the result. Kitchen Sync hides this two ways: actions are designed
to be "tap and the chef walks over" (a little travel time masks the lag), and the
client **interpolates** movement between snapshots so chefs glide smoothly
instead of teleporting (more in [§10](#10-rendering-turning-a-grid-of-letters-into-a-kitchen)).

> **Where this lives in code:** the server simulation is [server/game.js](server/game.js);
> the network glue that ferries intents and snapshots is [server/rooms.js](server/rooms.js);
> the client side that sends taps and draws snapshots is [public/js/app.js](public/js/app.js)
> and [public/js/isoRender.js](public/js/isoRender.js).

---

## 3. The tech stack (and why each piece is here)

Every choice here optimizes for the same goal: **a family member opens a link and
is playing in seconds, with nothing to install and nothing to build.**

| Layer | Technology | What it does | Why this choice |
|---|---|---|---|
| Runtime | **Node.js** | Runs the server-side JavaScript | One language (JS) for both server and client |
| Web server | **Express** | Serves the HTML/JS/images, plus a tiny search API | The standard, minimal Node web framework |
| Real-time link | **Socket.IO** (WebSockets) | The live two-way pipe between phone and server | Push updates to phones instantly; survives flaky mobile networks (auto-reconnect, fallbacks) |
| Client app | **Vanilla JavaScript** (no framework) | All the screens and game logic in the browser | No React/build step = no compile, no toolchain, just files |
| Graphics | **HTML5 Canvas 2D** | Draws the kitchen every frame | Fast enough for 2D, built into every browser |
| Persistence | **JSON files on disk** | Remembers crews, progress, profiles | Right-sized for a family game; no database to run |
| Packaging | **PWA** (manifest + service worker) | "Add to Home Screen," full-screen, offline shell | Feels like a native app without an app store |
| Hosting | **Render** (free tier) | Runs the server on a public URL | Free, supports long-lived WebSocket connections |
| CI/CD | **GitHub Actions** | Runs tests, then deploys on every push to `main` | Tests gate the deploy so a broken build can't ship |

Two phrases you'll see a lot:

- **"No build step."** Many web apps must be *compiled* (TypeScript → JS, JSX →
  JS, bundling) before they run. This game doesn't. The files you edit are the
  exact files the browser runs. `npm start` and you're live. That's a deliberate
  simplicity choice.
- **"Server-authoritative"** — see [§2](#2-the-one-big-idea-server-authoritative-multiplayer).

---

## 4. The folder map

```
kitchen-sync/
├── package.json            Project metadata + the `npm start` / `npm test` commands
├── render.yaml             Tells Render how to build & run the server
├── .github/workflows/      GitHub Actions: run tests, then trigger a deploy
│
├── server/                 ───────────  THE BACKEND (Node)  ───────────
│   ├── index.js              Entry point: starts Express + Socket.IO, serves /public
│   ├── rooms.js              Live rooms: who's connected, the game loop, all socket events
│   ├── game.js               THE SIMULATION: movement, chopping, cooking, scoring, orders
│   ├── levels.js             Static game data: level layouts, recipes, cook combos, upgrades
│   ├── store.js              Persistence: read/write crews.json & players.json
│   └── youtube.js            Tiny helper: search YouTube for the crew radio
│
├── public/                 ───────────  THE FRONTEND (browser)  ───────────
│   ├── index.html            The single page: all five screens + all the CSS
│   ├── manifest.webmanifest  PWA settings (name, icons, landscape lock)
│   ├── sw.js                 Service worker (caches the app shell for offline/instant load)
│   ├── icons/                App icons
│   ├── assets/images/        The art (chefs, customers, stations, food) + audio/
│   └── js/                   ── the client code ──
│       ├── app.js              Screens, profile, the socket connection, the HUD, ties it together
│       ├── isoRender.js        The renderer: draws the kitchen onto the canvas every frame
│       ├── gfx.js              Sprite loader: loads images, cleans them up, caches them
│       ├── assetManifest.js    The list of every art file + the playable chef roster (KS_CHEFS)
│       ├── art.js              Emoji/vector fallbacks used before art loads
│       ├── sound.js            Synthesized sound effects (no audio files)
│       ├── music.js            Background music (menu vs. in-round tracks)
│       └── radio.js            The crew radio: synced YouTube playback
│
├── data/                   Created at runtime: crews.json, players.json, song-history.jsonl
├── test/                   Automated tests (engine unit tests + a 2-player integration test)
└── scripts/                Dev tooling (icon generator, asset downscaler)
```

A useful way to hold it in your head:

- **`server/levels.js`** = the *rules and content* (what a burger needs, what level
  3 looks like). Pure data, never changes while playing.
- **`server/game.js`** = the *engine* that runs those rules for one round.
- **`server/rooms.js`** = the *switchboard* connecting phones to engines.
- **`server/store.js`** = the *filing cabinet* (long-term memory).
- **`public/js/*`** = the *phone app* (draw, tap, talk to the server).

---

## 5. A whole session, start to finish

Let's follow the data from "tap the link" to "cooking," naming the real
functions and messages. (The message names in `quotes` are Socket.IO events;
see the full catalog in [§9](#9-how-the-client-and-server-talk-the-message-catalog).)

**1. The page loads.** The phone downloads `index.html` and all the `js/` files
from the server (plain static files served by Express in
[server/index.js](server/index.js)). The browser now has the whole client app.

**2. Identity.** On first run the client makes a random `id` and stores a
**profile** (`{ id, name, chef }`) in the browser's `localStorage`
([public/js/app.js](public/js/app.js) `loadProfile`). This `id` is "who you are"
forever on this device — there are no passwords. (Open the site with `?guest` and
it uses per-tab identity instead, so you can test multiplayer in two windows.)

**3. Connect.** The client opens a Socket.IO connection to the server
(`const socket = io(...)`). On connect it sends `hello` with your profile so the
server can record/refresh your player record.

**4. Start or join a kitchen.**
- *Start:* client sends `create_crew`; the server makes a new **crew** with a
  random 4-letter code (e.g. `TACO`) and saves it ([server/store.js](server/store.js)
  `createCrew`), then the client immediately `join`s that code.
- *Join:* you type a code (or open a `?join=TACO` link); client sends `join`.

**5. The server puts you in a room.** On `join` ([server/rooms.js](server/rooms.js)),
the server:
   - finds the crew on disk (or restores it from your phone's backup — see [§8](#8-storage--persistence)),
   - creates an in-memory **room** for that crew if one doesn't exist,
   - records your socket and marks you "connected,"
   - subscribes your socket to the room's broadcast channel (`socket.join("room:TACO")`),
   - replies with the **lobby state** (crew code, members, the level map, the
     shop, the music queue), which your phone draws as the lobby screen.
   It also broadcasts `lobby` to everyone so they see you arrive.

**6. The host starts a level.** Only the **host** (crew creator, or the
longest-connected member if they've left) can do this. The host taps a level →
client sends `start_game(levelId)`. The server:
   - builds a fresh `Game` object for that level and that roster of players
     ([server/rooms.js](server/rooms.js) `startGame`),
   - broadcasts `game_start` with the **static state** (the grid, theme, star
     goals — the stuff that doesn't change during the round),
   - starts the **game loop** (a `setInterval` firing ~12×/second).

**7. The round runs.** Every tick the loop calls `game.tick(dt)` and broadcasts a
`state` snapshot to every phone (see [§6](#6-the-game-loop--the-heart-of-any-game)).
Each phone:
   - feeds the snapshot to the renderer, which draws it,
   - updates the HUD (timer, score, plates, orders),
   - plays any one-shot sounds the snapshot reported (a chop, a serve).
   When you tap a tile, the client sends `tap({x,y})` and… that's it. The next
   snapshot will show your chef reacting.

**8. The round ends.** When the timer hits zero, `game.tick` flips the phase to
`over`. The loop notices, calls `finishGame`: it **saves** the result to disk
(stars, best score, coins earned, lifetime stats), then broadcasts `game_over`
(results) and `lobby` (back to the lobby with progress updated).

**9. Come back next week.** Your stars, coins, and unlocked levels are in
`crews.json` on the server (and mirrored on every member's phone as a backup).
Type the same code and it's all there.

---

## 6. The game loop — the heart of any game

Every video game has a **loop**: "update the world a tiny bit, show it, repeat,
forever." Kitchen Sync has *two* loops working together.

### 6a. The server's simulation loop (the source of truth)

Lives in [server/rooms.js](server/rooms.js) `startGame`:

```js
const TICK_MS = 1000 / 12;          // ≈ 83 ms  → ~12 ticks per second
let last = Date.now();
room.loop = setInterval(() => {
  const now = Date.now();
  const dt = Math.min((now - last) / 1000, 0.25);   // seconds since last tick
  last = now;
  const events = room.game.tick(dt);                // advance the world by dt
  roomBroadcast(io, room, 'state', room.game.dynamicState(events));  // tell phones
  if (room.game.phase === 'over') finishGame(io, room);
}, TICK_MS);
```

Two beginner-critical ideas here:

- **`dt` ("delta time")** is *how much real time passed since the last tick*, in
  seconds. The simulation moves things by `speed * dt` instead of a fixed amount,
  so the game runs at the same real-world speed even if a tick is slightly late.
  It's clamped to `0.25` so that if the server hiccups for a second, chefs don't
  teleport across the kitchen in one giant step.
- **A "tick"** is one step of the simulation. 12 ticks/second is plenty for a
  cooking game (it's not a shooter), and it keeps network traffic light — each
  tick sends one snapshot to each phone.

What happens inside `game.tick(dt)` ([server/game.js](server/game.js)), in order,
every tick:

1. Count down the round timer; open/close **lunch-rush** windows.
2. **Move** every chef along its path a little (`speed * dt`); if a chef arrives
   at the tile it was sent to, run the **interaction** there.
3. Advance **chopping** on every board that has raw food on it.
4. Return **dirty plates** to the sink after their delay; advance **washing**.
5. Advance **cooking**; turn finished food to "done," and "done" food to "burned"
   if it sat too long.
6. Spawn new **orders** on schedule; tick down each order's timer; penalize
   expired ones.
7. If the timer hit zero, set `phase = 'over'`.
8. Run any **queued taps** that are now ready.
9. Return the list of **events** that happened this tick (a chop, a serve, a
   burn) so the client can play sounds/animations.

Notice the tick **collects events** (`this.emit('serve', …)`) and returns them.
The snapshot carries those events to the phones so they can react with sound and
particles — the simulation itself never makes a sound.

### 6b. The client's render loop (draw smoothly)

The phone draws using `requestAnimationFrame` — the browser's "call me before
every screen refresh," typically **~60 times per second**
([public/js/isoRender.js](public/js/isoRender.js) `frame()`).

So the phone draws ~60fps but only hears from the server ~12fps. If it just
snapped chefs to the latest server position, movement would look choppy (12
discrete jumps a second). Instead the client keeps the **last two** snapshots and
**interpolates** — it draws each chef partway between its previous and current
position based on how much time has passed (`lerpPlayers()`). The result is buttery
movement built from coarse updates. This is a standard multiplayer-game technique.

```
server snapshots:   ●           ●           ●         (12/sec, the truth)
client frames:      ● · · · · · ● · · · · · ●         (60/sec, interpolated between)
```

---

## 7. The data model: what state lives where

A big source of confusion in any app is "where does this piece of information
live?" Kitchen Sync has **three tiers**, by lifetime:

### Tier 1 — Persistent (on the server's disk, survives restarts)

Stored as JSON files by [server/store.js](server/store.js):

**`crews.json`** — one entry per kitchen, keyed by the 4-letter code:
```jsonc
"TACO": {
  "code": "TACO",
  "hostId": "<player id of the creator>",
  "members": { "<playerId>": { "name", "avatar", "chef", "joinedAt" } },
  "progress": { "salad-days": { "stars": 3, "bestScore": 820, "plays": 4 } },
  "wallet":   { "coins": 1500, "upgrades": { "auto_chopper": true } },
  "settings": { "autoChop": true },
  "stats":    { "meals": 120, "rounds": 18, "earned": 9400 }
}
```

**`players.json`** — one entry per device, keyed by the player's `id`:
```jsonc
"<playerId>": {
  "id", "name", "avatar", "chef",
  "stats": { "levelsPlayed": 18, "mealsDelivered": 60, "starsEarned": 22 }
}
```

**`song-history.jsonl`** — an append-only log of every song anyone queued (one
JSON object per line; it only ever grows).

### Tier 2 — Live session (in the server's memory, gone on restart)

The `rooms` Map ([server/rooms.js](server/rooms.js)) — one **room** per active
kitchen:
```js
room = {
  code, crew,                 // crew is the persistent record above
  sockets: Map,               // socket.id -> { socket, playerId }   (the live connections)
  players: Map,               // playerId -> { name, chef, connected }
  game,                       // the live Game instance, or null in the lobby
  loop,                       // the setInterval handle for the game loop
  hostId, exited,             // host + who has bailed out of the round
  radio, radioQueue,          // the crew's shared music
}
```

The **`game`** object (a `Game` from [server/game.js](server/game.js)) holds the
moment-to-moment round state: the parsed grid, every station's contents, each
chef's position/path/carried item, the open orders, the timer, the score. This is
the "world" the loop advances each tick. It's intentionally *not* saved — only the
**result** (stars, score) is persisted when the round ends.

### Tier 3 — The wire snapshots (what actually travels to phones)

The `Game` knows how to serialize itself into three shapes
([server/game.js](server/game.js)):

- **`staticState()`** — sent once at `game_start`: `levelId, theme, w, h, grid,
  crates, duration, starThresholds, seed`. The stuff that's fixed for the round.
- **`dynamicState(events)`** — sent every tick as `state`: the timer `t`, `score`,
  `combo`, `plates`, `rush`, `phase`, `paused`, the `players[]` (positions, what
  they carry), the non-empty `stations{}`, the open `orders[]`, and this tick's
  `events[]`. This is the snapshot the renderer draws.
- **`results()`** — sent at `game_over`: final `score`, `stars`, `delivered`,
  `missed`, and per-player stats.

> **The `seed`** is a clever detail. The customer line-up art is shuffled randomly,
> but every phone must show the *same* customers in the same order. So the server
> picks one random number (`seed`) and sends it in `staticState`; each phone runs
> the *same* shuffle from that seed, so they all agree without the server having to
> send the whole cast list.

### Tier 4 (bonus) — The browser's own memory

Each phone keeps a little state in `localStorage`/`sessionStorage`
([public/js/app.js](public/js/app.js)): your **profile**, a **backup** of your
crew's progress and your stats (for disaster recovery — [§8](#8-storage--persistence)),
the current crew code (for auto-rejoin), and your mute/volume preferences.

---

## 8. Storage & persistence

The filing cabinet is [server/store.js](server/store.js). It's deliberately tiny —
no database — because a family game's data is small and a database would be one
more thing to run and pay for.

**How writes work (and why it's safe):**
- Writes are **debounced**: after a change, `save()` waits 250ms before writing,
  so a burst of changes becomes one disk write instead of dozens.
- Writes are **atomic**: it writes to a temporary file, then *renames* it over the
  real file (`flush()`). A rename is instantaneous at the OS level, so the file is
  never caught half-written even if the server crashes mid-save.

**The ephemeral-disk problem (and the clever fix):** Render's free tier gives the
server a disk that is **wiped on every restart/redeploy**. So `crews.json` can
vanish. Losing the family's stars would be sad. The fix:

> **Every phone carries a backup.** When the server sends you the lobby, it
> includes your crew's full record and your player record. Your phone saves those
> to `localStorage`. The next time *anyone* `join`s, their phone sends its backup
> along. If the server's data is gone, the server **restores the crew from the
> phone's backup** (`restoreCrew`); if it still has data, it **merges**, always
> keeping the *best* values (`mergeCrew` — highest stars, highest score, most
> coins). So the family's progress lives redundantly across everyone's phones and
> heals itself.

This is why you'll see `crewBackup` and `playerBackup` in the `join` message.

---

## 9. How the client and server talk (the message catalog)

The pipe is **Socket.IO**. Think of it as a phone line where either side can shout
named messages with a blob of data attached. Two patterns are used:

- **Request/response (with an "ack"):** the client sends a message *and a callback*;
  the server calls the callback with a reply. Used for things that need an answer
  ("did my join work? what's the lobby?").
- **Broadcast:** the server pushes a message to *everyone in a room* at once
  (`io.to("room:TACO").emit(...)`). Used for live updates (state snapshots, lobby
  changes). Rooms are Socket.IO "channels" — joining `room:TACO` means you receive
  that kitchen's broadcasts and no one else's.

### Client → Server

| Message | Payload | Reply (ack) | Meaning |
|---|---|---|---|
| `hello` | profile | `{ player }` | "Here's who I am" — refresh my player record |
| `create_crew` | profile | `{ code }` | Make a new kitchen |
| `join` | `{ code, profile, crewBackup, playerBackup }` | `{ lobby, crew, player, game }` | Enter a kitchen (and offer my backups) |
| `start_game` | `levelId` | `{ ok }` / `{ error }` | Host starts a level |
| `tap` | `{ x, y }` | — | "I tapped this tile" (the only in-game input!) |
| `pause` | `on` | — | Pause/resume (anyone can) |
| `restart_level` | — | `{ ok }` | Restart the current round |
| `exit_round` | — | — | I'm bailing to the lobby |
| `autochop` | `on` | — | *Legacy/unused* — the Auto-Chopper is always on once the crew owns it, so no client emits this |
| `buy_upgrade` | `id` | `{ ok }` / `{ error }` | Spend crew coins in the shop |
| `emote` | index | — | *Legacy/unused* — the emote bar was removed, so the client no longer sends this |
| `radio` | `{ action, … }` | — | Queue/skip/remove a song |
| `leave` | — | — | Leave the kitchen |

### Server → Client (broadcast to the room)

| Message | Payload | Meaning |
|---|---|---|
| `lobby` | lobby state | The lobby changed (someone joined, a level was beaten, a song queued) |
| `game_start` | static state | A round just began — set up the renderer |
| `state` | dynamic snapshot | The per-tick world snapshot (~12×/sec) — **the main one** |
| `game_over` | results + crew | The round ended; here are the stars and saved progress |
| `radio` | radio payload | The shared music now-playing/queue changed |
| `emote` | `{ playerId, emoji }` | Someone sent a reaction — *the relay is still wired up, but nothing triggers it now* |

The thing to internalize: **the only gameplay input is `tap`.** Walking, chopping,
plating, serving — all of it is "tap a tile, let the server decide." That one
decision is what keeps the game simple to control on a phone and impossible to
desync.

---

## 10. Rendering: turning a grid of letters into a kitchen

The server thinks of the kitchen as a plain 2D grid of characters
([server/levels.js](server/levels.js)). Level 1 literally looks like this:

```
.1B2B3.#.#.
#.........#
P...#.#...P
#...#.#...#
#.........#
.T..W#W..P.
```

Legend: `.` floor · `#` counter · `B` cutting board · `S` pan · `O` pot · `V`
oven · `P` plate stack · `W` serving window · `T` trash · `K` sink · `1`–`9`
ingredient crates. A chef at grid position (2,3) is simply at (2,3). **The grid is
the truth; it's never rotated or distorted in the game logic.**

The renderer ([public/js/isoRender.js](public/js/isoRender.js)) turns that grid
into the pretty ¾-view ("PlateUp-style") kitchen you see. Key concepts:

**World space vs. screen space.** The renderer first lays the grid out in a fixed
imaginary coordinate system ("world space") where every tile is 64×48 units. Then
it applies **one uniform scale + shift** to map world space onto the actual canvas
pixels, sized to whatever phone you're on (`resize()`). So the math is done once in
clean fixed units, and scaling to the screen is a single transform.
- `project(gx, gy)` = grid coordinate → screen point (where to draw it).
- `unproject` / `toWorld` = the reverse, used for taps.

**The render queue + depth sorting.** Every visible thing (walls, counters, chefs,
customers, food) is pushed into one list with its on-screen Y, then the list is
**sorted top-to-bottom and drawn back-to-front** (`draw()`). That's why a chef
standing in front of a counter correctly overlaps it: lower on screen = drawn
later = on top. This is the 2D version of "depth."

**Sprites (the art).** Drawing is done by [public/js/gfx.js](public/js/gfx.js),
which is a small but important pipeline. For each art file it:
1. **loads** the image once,
2. **keys out the background** — the AI-generated art arrives on a flat white/beige
   card, so it flood-fills the background to transparent,
3. **trims** to the tight bounding box so proportions are exact,
4. **caches** the cleaned-up result as an off-screen canvas.

Crucially this prep is **done once per image, spread across frames** (a budgeted
queue), not every frame — so the game doesn't stutter while art loads. After prep,
drawing a sprite is just a fast copy. If an image is missing, it falls back to an
emoji ([public/js/art.js](public/js/art.js)) so the game is never blank.

**Clicking/tapping ("picking").** When you tap, the renderer must answer "which
tile did they mean?" It records the exact drawn rectangle of every station each
frame, then walks them **front-to-back** and returns the first one your tap lands
on (with a per-pixel transparency check so you can tap "through" the see-through
corner of a sprite). If you didn't hit any object, it falls back to the plain grid
math to pick a floor tile (for walking). That tile coordinate is what gets sent to
the server as `tap`.

**Interpolation.** As covered in [§6b](#6b-the-clients-render-loop-draw-smoothly),
chefs are drawn partway between their last two server positions so 12fps updates
look like 60fps motion.

So the full path of a tap is:

```
finger → pointer event → toWorld() → pick() → tile (4,2)
       → socket.emit('tap', {x:4,y:2}) → server game.tap() → simulation changes
       → next 'state' snapshot → renderer draws the result
```

---

## 11. Core game mechanics, one at a time

All of this is in [server/game.js](server/game.js) (the engine) using data from
[server/levels.js](server/levels.js) (the rules). Remember: it all runs on the
server.

### Walking & pathfinding
When you tap a far tile, the server finds a walking route with **BFS
(breadth-first search)** over the floor tiles (`findPath`). BFS is the classic
"shortest path on a grid" algorithm: explore outward ring by ring from the chef
until you reach the target, then trace the route back. The chef then follows that
list of waypoints, moving `speed * dt` each tick (`SPEED = 4.08` tiles/second). If
you tap a *station*, it routes you to an adjacent floor tile and remembers your
**intent**, so it auto-interacts the moment you arrive.

### Tapping & the action queue
`tap()` is the front door. If your chef is busy (walking or working), the tap is
**queued** (up to 8) instead of dropped — so you can pre-plan "chop, then plate,
then serve" with three quick taps. If you're free and standing next to the tapped
station, it interacts immediately; otherwise it walks you there first.

### Interactions (the `interact` switch)
Standing next to a station and acting runs a big `switch` on the station type:
- **crate** → take a raw ingredient (or add it to a plate/stack you're holding).
- **board** → put food down to chop; pick it back up; or rest a plate on it.
- **cook** (pan/pot/oven) → add an ingredient; when the right combo is complete it
  starts cooking; later, grab the finished food.
- **plates** → take a clean plate (if any are left).
- **sink** → stand here to scrub dirty plates back into the stack.
- **serve** → hand a finished dish to the window to fill an order.
- **trash** → dump whatever you're holding.
- **counter** → put anything down / pick anything up / combine.

### Chopping
Boards chop **hands-free**: once raw choppable food is on a board, a progress
value on the *item* fills up over `CHOP_TIME` seconds (`tick`) — a chef doesn't
have to stand there and babysit it (an adjacent idle chef just gets the chopping
animation and the stat credit). Because progress lives on the item, you can even
carry a half-chopped thing away. The Auto-Chopper upgrade makes boards chop
faster, and it's **always on once the crew owns it** — there's no in-game toggle.

### Cooking & burning
A pan/pot/oven holds a list of ingredients. The list is checked against
**`COOK_COMBOS`** (e.g. `3 chopped onions → onion soup`). When the exact set is
present it enters `cooking`; after the combo's `time`, it becomes `done`; if left
`done` too long (`burnAfter` seconds) it becomes `burned` — a useless lump you must
trash. This is the time-pressure tension of the genre.

### Recipes & plating (multiset matching)
Each dish is defined by what it **needs** — a *multiset* (a bag where duplicates
count) of `"ingredient.state"` tokens, e.g. a salad needs
`["lettuce.chopped", "tomato.chopped"]` (see `RECIPES`). When you put food on a
plate, the engine checks whether the plate's contents are still a subset of *some*
real recipe (`isSubset`) — if not, it rejects the combo (that's the "✕" you get
from putting tuna on a sundae). Serving checks for an **exact** match
(`multisetEqual`) against an open order. "Handheld" recipes (burgers, tacos) skip
the plate — the bun/tortilla *is* the plate.

### Orders, scoring, combos
Orders spawn on a schedule (`level.orders.every`, faster during a rush), each with
a countdown (`ttl`). Serving in time pays the recipe's **base points + a tip** that
shrinks as the timer runs down, and bumps a **combo multiplier** (consecutive
serves, up to ×4) for bonus points. Letting an order **expire** costs points and
resets your combo. Final score is compared to three **star thresholds**; smaller
crews get gentler pacing and lower goals so solo/duo play is fair.

### Lunch rush & VIPs
Twice per round (`rushMarks`) the kitchen enters a timed **rush**: orders come
faster and **tips double**. Some orders are **VIP** (gold) — triple points but a
tighter timer.

### Dishwashing & finite plates
On levels that have a sink, plates are **limited**. When you serve on a plate, that
plate comes back **dirty** at the sink after a short delay (`pendingDirty`).
Someone has to stand at the sink to wash it back into the clean stack, or you run
out of plates and can't serve. (Handheld dishes don't dirty a plate.) The Dish-Bot
upgrade slowly washes on its own.

### The Kitchen Shop (upgrades)
Coins earned each round bank into the crew's shared **wallet**
([server/store.js](server/store.js)). In the lobby, the host buys crew-wide
upgrades (`buy_upgrade`) defined in `UPGRADES` — faster chefs, longer burn time,
an extra plate, self-washing sink, faster cooking, the Auto-Chopper. The purchase
is checked and applied server-side (you can't buy what you can't afford), and the
next round's `Game` reads those upgrades to tweak its constants.

---

## 12. Audio: sound effects, music, and the crew radio

Three independent audio systems:

- **Sound effects** ([public/js/sound.js](public/js/sound.js)) are **synthesized
  live** with the Web Audio API — there are *no* sound files. A "ding" is literally
  "play a 1175Hz triangle wave for 0.4s." The server's tick reports events (`chop`,
  `serve`, `burn`); the client maps each to a synth function and plays it
  ([public/js/app.js](public/js/app.js) `playEventSound`). Personal sounds
  (pickup/place) only play for the chef who did them.
- **Background music** ([public/js/music.js](public/js/music.js)) plays one looping
  track on the menus ("Acrostics") and another in live rounds ("Caketown"),
  cross-fading when you switch screens. (Browsers block audio until your first tap,
  so it installs a one-time "unlock" listener.)
- **The crew radio** ([public/js/radio.js](public/js/radio.js) +
  [server/rooms.js](server/rooms.js)) is the fancy one: anyone can search YouTube
  and **queue songs that play in sync on every phone**. The server holds the shared
  queue and the "now playing" with a start timestamp; each phone runs a hidden
  YouTube player and seeks to the right spot so everyone hears the same thing at the
  same time. While a radio track plays, the built-in music politely "suspends."

**Where players control all this:** the in-round audio controls all live in the
**pause menu**, which doubles as the settings menu. Three toggles: **Music** is a
master on/off that silences *both* the built-in game soundtrack and the crew radio
at once; **Music source** flips between the **game soundtrack** and the **crew
radio** (this is also the per-phone radio mute — switch it to *Game* and your phone
falls back to the soundtrack); and **Sound effects** is the separate SFX on/off.
(The home screen keeps its own quick music/SFX icons for the menus.)

---

## 13. How it's deployed (code → your family's phones)

The live game runs on **Render** (a cloud host) at a public URL. Here's the full
pipeline from "you push code" to "your sister sees the change":

**1. You push to GitHub `main`.**

**2. GitHub Actions runs** ([.github/workflows/ci-deploy.yml](.github/workflows/ci-deploy.yml)):
   - **`test` job:** checks out the code, installs dependencies, runs `npm test`
     (the engine unit tests + the 2-player integration test). It has a 10-minute
     timeout so a hung test can't block forever.
   - **`deploy` job:** runs **only if the tests passed** and only on `main`. It
     calls Render's API to trigger a new deploy. **Tests gate the deploy** — a
     red build never ships.

**3. Render builds and runs the server** ([render.yaml](render.yaml)):
   - build: `npm install --omit=dev`
   - start: `npm start` (which runs `node server/index.js`)
   - health check: Render pings `/healthz`; the server replies `{ ok: true }`
     ([server/index.js](server/index.js)) so Render knows it's alive.

**4. Phones reconnect.** Because the client auto-reconnects (Socket.IO) and
auto-rejoins the saved crew code, players are back in within seconds of the new
server coming up.

**Two free-tier realities to know:**
- **It sleeps when idle.** After ~15 idle minutes Render parks the server; the
  first person to open the link waits ~30–60s while it wakes. (That's the
  "Preheating the kitchen…" screen.)
- **The disk is ephemeral.** Every deploy wipes `data/`. That's exactly why the
  device-backup system in [§8](#8-storage--persistence) exists — progress is
  restored from a family member's phone on the next join.

**PWA delivery.** The `manifest.webmanifest` + `sw.js` (service worker) let iOS
"Add to Home Screen" so it launches full-screen and landscape-locked like a real
app. The service worker caches the app shell so it opens instantly, but it's
careful **never to cache the audio or the live socket traffic**.

---

## 14. "I want to change X" — where to look

A practical index for learning by poking at it:

| I want to… | Edit… |
|---|---|
| Add/edit a level (layout, recipes, timing) | [server/levels.js](server/levels.js) → `LEVELS` |
| Add a new recipe or cookable combo | [server/levels.js](server/levels.js) → `RECIPES` / `COOK_COMBOS` |
| Change scoring, tips, combos, rush, burning | [server/game.js](server/game.js) (constants up top + `tick`) |
| Change how taps/interactions behave | [server/game.js](server/game.js) → `tap` / `interact` |
| Add/curate a shop upgrade | [server/levels.js](server/levels.js) → `UPGRADES`, applied in `game.js` |
| Add a playable chef or art asset | [public/js/assetManifest.js](public/js/assetManifest.js) (`KS_CHEFS` / `ASSETS`) + the PNG |
| Change how the kitchen is drawn | [public/js/isoRender.js](public/js/isoRender.js) |
| Change a sound effect | [public/js/sound.js](public/js/sound.js) |
| Change screens, HUD, lobby, the socket wiring | [public/js/app.js](public/js/app.js) |
| Change what's saved / persistence rules | [server/store.js](server/store.js) |
| Add a new client↔server message | both [server/rooms.js](server/rooms.js) (`socket.on`) and [public/js/app.js](public/js/app.js) (`socket.on`/`emit`) |
| Change layout/colors/CSS | [public/index.html](public/index.html) (styles are inline) |

To run it locally: `npm install`, then `npm start`, then open
`http://localhost:3000`. Open a second window at `http://localhost:3000/?guest`
to play multiplayer with yourself. `npm test` runs the test suite.

---

## 15. Glossary

- **Client** — the program running in each player's browser (the web page).
- **Server** — the single program in the cloud that runs the real game.
- **Server-authoritative** — design where the server owns the one true game state;
  clients only send inputs and draw what they're told. Prevents cheating/desync.
- **Socket / WebSocket** — a persistent two-way connection so the server can *push*
  data to a phone instantly (unlike a normal web request, which the phone must
  initiate). Socket.IO is the library on top of it.
- **Broadcast / room** — sending one message to every connection subscribed to a
  named channel (here, one channel per kitchen).
- **Ack (acknowledgement)** — a reply callback for a specific message, used for
  request/response interactions.
- **Tick** — one step of the simulation. Kitchen Sync ticks ~12×/second.
- **`dt` (delta time)** — real seconds elapsed since the last tick; movement is
  scaled by it so the game runs at a consistent speed.
- **Game loop** — the "update, then show, repeat" cycle every game runs on.
- **Interpolation** — drawing something partway between two known positions to
  smooth out coarse updates.
- **BFS (breadth-first search)** — a grid algorithm that finds the shortest path by
  exploring outward evenly; used for chef walking.
- **Multiset** — a collection where duplicates count (so "3 onions" ≠ "1 onion");
  recipes are matched as multisets of ingredient tokens.
- **Sprite** — a 2D image drawn into the scene (a chef, a counter, a tomato).
- **Canvas** — the HTML element the renderer paints pixels onto each frame.
- **World space vs. screen space** — the fixed coordinate system the game reasons
  in, vs. the actual pixels on a given phone; one transform maps between them.
- **Persistence** — saving data so it survives a restart (here, JSON files on disk).
- **Debounce** — waiting for a quiet moment before acting (here, before writing to
  disk) so bursts collapse into one action.
- **Atomic write** — writing in a way that can't leave a half-written file (write a
  temp file, then rename it into place).
- **PWA (Progressive Web App)** — a website that can be installed to the home
  screen and launched full-screen like a native app.
- **CI/CD** — Continuous Integration / Deployment: automatically test every change
  and (if green) ship it.
- **Ephemeral disk** — storage that's wiped on restart; the reason for the
  phone-backup safety net.

---

*This document describes the live (landscape) build. If you change how something
works, update the relevant section so the next person — or future you — can still
trust it.*

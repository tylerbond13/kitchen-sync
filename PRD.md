# Kitchen Sync — Product Requirements Document

**Tagline:** Cook together, apart.
**Status:** Live — expanded edition (the original 6-level v1 is preserved at git tag `v1.0-classic`)
**Owner:** Tyler Bond
**Last updated:** 2026-06-13

---

## 1. Overview

Kitchen Sync is a real-time cooperative cooking game inspired by *Overcooked: All You Can Eat*, built for mobile web. Players join a shared kitchen from their own phones — like a Jackbox game — by visiting a link and entering a 4-letter crew code. Together they fetch ingredients, chop, cook, plate, and deliver meals against the clock across a **14-level campaign spanning three themed worlds**, earning 1–3 stars per level and banking coins toward shared kitchen upgrades.

### Why
The owner has 5 siblings spread across multiple states. Existing co-op cooking games require consoles, purchases, and being on the same couch or platform. Kitchen Sync needs nothing but a phone browser and a shared link.

### Goals
1. **Zero-friction join:** open a link → pick a chef → you're cooking, in under 30 seconds.
2. **Genuinely fun co-op:** the chaos and coordination of Overcooked — shared orders, divided labor, time pressure, shouting at your sister to plate the soup.
3. **Mobile-first:** designed for iPhone play held in **landscape** (the kitchen is a wide room). Tap-to-act controls; no virtual joysticks.
4. **Persistent progression:** crews keep their campaign progress (stars per level), a shared coin wallet, and purchased upgrades forever; players keep profiles (name, chef, lifetime stats).
5. **Installable:** PWA that can be added to the iOS home screen and launched full-screen like a native app.

### Non-goals (current)
- Native iOS/Android apps, App Store distribution
- Competitive/versus modes
- Voice chat (players use FaceTime/phone alongside)
- Physics-based movement, throwing items, moving floors/conveyors
- Accounts with passwords (device-based identity is enough for a family game)

---

## 2. Players & Use Case

- **Primary:** a family group of 2–8 adults, each on their own iPhone, in different states, on a call together.
- **Session shape:** 15–45 minutes; a few levels per session; return weekly and resume the campaign.
- **Secondary:** any friend group wanting a quick co-op game with no install.

---

## 3. Core Experience

### 3.1 Joining (Jackbox model)
- Landing page shows the game logo, the player's chef profile, and two actions: **Start a Kitchen** and **Join a Kitchen**.
- Starting a kitchen creates a persistent **crew** with a 4-letter code (e.g. `TACO`). The host shares a link (`https://<host>/?join=TACO`) via iMessage using the native share sheet.
- Opening a join link pre-fills the code; the player picks a name + chef once (remembered on the device) and lands in the lobby.
- Crews are **persistent**: re-entering the same code later restores the crew's campaign progress, coin wallet, upgrades, and member list.

### 3.2 Profiles
- Identity is per-device: a generated player ID stored in `localStorage`.
- Profile = display name + chef. The roster is large (~70 playable chefs — a mix of original characters and celebrity/pop-culture homages), rendered from generated HD image sprites.
- Server-side profile record stores lifetime stats: levels played, meals delivered, stars earned, crews joined.
- Profile is editable any time from the home screen.

### 3.3 Lobby
- Shows crew code (large, shareable), connected members with their chefs, the **level map**, the **Kitchen Shop**, and the **crew radio**.
- Level map: campaign levels as cards grouped by world, showing locked/unlocked state, earned stars, and best score. Level N+1 unlocks when level N has ≥1 star.
- Any member can browse the map; the **host** (crew creator, or oldest connected member) selects a level and starts the game. Minimum 1 player (solo practice allowed), designed for 2–8.

### 3.4 Gameplay
- Top-down shared kitchen on a tile grid, rendered identically for all players in real time with a straight-on ¾ orthographic ("PlateUp-style") view.
- **Controls (mobile-first):** tap a tile to walk there; tap a station to walk to it and automatically interact (pick up / place / chop / cook / plate / wash / serve / trash). One interaction model, no buttons to learn. Taps queue up, so you can line up several actions in a row.
- **Stations:** ingredient crates, cutting boards, stoves (pan/pot), ovens, counters, plate stacks, the **sink**, serving window, and trash.
- **Work loop:** grab ingredient → chop on board (auto-chops while your chef stands at the board) → cook in pan/pot/oven where required (cooking continues unattended; food **burns** if left too long) → assemble on a plate (or directly on a bun/tortilla for handheld dishes) → deliver to the serving window to fill an order.
- **Dishwashing:** from level 2 on, plates are finite. Served plates come back **dirty** at the sink after a short delay; someone has to stand at the sink and scrub them back into the stack. No clean plates, no serving. Handheld dishes (burgers, fish tacos) skip the plate entirely.
- **Orders:** up to 4 visible tickets with countdown bars; each ticket shows its prep chain (e.g. 🥩 › 🔪 › 🍳). Delivering on time scores base points + a tip proportional to remaining time, and builds a **combo multiplier** (up to ×4). Expired tickets cost points and reset the combo.
- **Lunch rushes & VIP orders:** twice a round the kitchen goes into a timed **rush** — orders spawn faster and tips double. **VIP** tickets (gold 👑) pay triple on a tighter timer.
- Round timer per level (~2.5–3 minutes). Final score maps to **1–3 stars** via per-level thresholds. Solo/duo crews get gentler pacing and scaled star goals.
- Live presence: each chef shows its player's name; chefs never block each other.
- Disconnect handling: a dropped player's chef idles; they rejoin into the running game automatically on reconnect. Anyone can pause/resume.

### 3.5 Campaign (14 levels across 3 worlds)

**🍳 The Family Diner**
| # | Level | New / featured mechanic | Recipes |
|---|-------|--------------|---------|
| 1 | Salad Days | fetch, chop, plate, serve | garden salad, chef salad |
| 2 | Burger Bay | pan cooking, burning, finite plates + sink, handheld buns | burger, cheeseburger |
| 3 | Soup's On | pot with 3 chopped ingredients | onion soup, tomato soup |
| 4 | Sushi Squad | parallel prep (rice pot + fish board) | sushi |
| 5 | Pizza Panic | oven assembly (dough + sauce + cheese) | pizza |
| 6 | The Grand Feast | everything at once, bigger kitchen | full diner menu |

**❄️ Winter Wonderland**
| # | Level | New / featured mechanic | Recipes |
|---|-------|--------------|---------|
| 7 | Cocoa Cabin | milk + chopped chocolate in the pot | hot cocoa |
| 8 | Stew Season | three-veg stew (potato, carrot, onion) | hearty stew |
| 9 | Frostbite Feast | juggling multiple dishes | stew, cocoa, onion soup |
| 10 | Whiteout Rush | full winter menu, faster | winter mix |

**🏖️ Beach Club**
| # | Level | New / featured mechanic | Recipes |
|---|-------|--------------|---------|
| 11 | Smoothie Shack | three-fruit blender | smoothie |
| 12 | Taco Tide | handheld only — the tortilla is the plate | fish taco |
| 13 | Poke Point | rice + fish + cucumber bowls | poke bowl |
| 14 | Heatwave | full beach menu, endurance | tacos + poke |

### 3.6 The Kitchen Shop
- Rounds bank coins into a **persistent crew wallet** (shared across the crew, kept forever).
- Coins buy crew-wide upgrades that change how the kitchen plays: 🤖 Auto-Chopper (toggle hands-free, faster boards), 👟 Speedy Sneakers (faster chefs), 🍳 Non-Stick Pans (longer before burning), 🍽️ Bonus Plate (+1 plate), 🫧 Dish-Bot (the sink slowly washes itself), 🔥 Turbo Burners (everything cooks faster).

### 3.7 Crew Radio (shared music)
- The lobby and in-game HUD include a **crew radio**: any member can search YouTube and queue songs; playback is synced across every phone in the kitchen with a shared now-playing and skip control. Each phone has its own local volume/mute.
- Independent of this, the game has built-in synthesized/ambient music for menus vs. live rounds, with a separate music mute toggle.

### 3.8 Results
- End-of-round screen: animated stars, score vs. thresholds, meals delivered/missed, per-player delivery count, and **recap awards** (🏆 MVP, 🔪 Prep Master, 🫧 Dish Hero). Tap-to-send **emotes** (🔥 😱 🙏 🎉) let the crew react across states. Then back to the lobby with progress, coins, and stats saved.

---

## 4. Design Requirements

- **Look & feel:** warm, playful, premium. Soft, rounded geometry; juicy micro-animations (star pops, ticket slide-ins, chef bounce, coin bursts on serve). The kitchen is rendered from **generated HD image sprites** (chefs, customers, stations, ingredients, dishes, themed rooms) with emoji as a graceful fallback while art loads.
- **Landscape-first** layout; safe-area aware (notch/home indicator). A "rotate your phone" nudge covers the kitchen if held portrait during a round. Tap targets ≥ 44px.
- **Feedback:** synthesized sound effects (chop, sizzle, ding, serve, fail) with a mute toggle; haptic-feel animations on every interaction.
- **Performance:** smooth rendering on iPhone 11+, state updates ≥ 10Hz, playable on LTE.

---

## 5. Technical Requirements

- **Stack:** Node.js + Express + Socket.IO server (authoritative game simulation, 12Hz tick); vanilla JS + Canvas 2D client; no build step.
- **Architecture:** server-authoritative — clients send intents (taps), server simulates and broadcasts state; clients interpolate movement for smoothness. A cosmetic seed is sent with the round so every phone shuffles the customer cast identically.
- **Rendering:** straight-on orthographic ¾ view over a flat 2D grid (`isoRender.js`), drawing cached image sprites prepared by a background-keying/trimming loader (`gfx.js` + `assetManifest.js`); the projection lives only in drawing code — the simulation stays a plain grid.
- **Crew radio:** synced YouTube playback via the YouTube IFrame API on the client; the server holds the shared queue + now-playing and relays a lightweight search endpoint (`server/youtube.js`).
- **Persistence:** JSON file store on the server (`data/`): `crews.json` (code → campaign progress, coin wallet, upgrades, members) and `players.json` (playerId → profile + lifetime stats). Atomic, debounced writes. (Interface is swappable for a DB later.)
- **PWA:** web app manifest (locked to landscape), service worker (cache-first for static assets; never caches `/assets/audio/`), `apple-mobile-web-app-capable` for full-screen home-screen launch on iOS.
- **Sessions:** crew codes are 4 uppercase letters, collision-checked, permanent. Game rooms are in-memory; crews and profiles are on disk, and each phone mirrors its crew/profile state in `localStorage` so a member's device can restore the server's memory after a restart (Render's free tier has an ephemeral disk).
- **Quality bar:** unit tests for the game engine (recipes, cooking, scoring, stars, layout reachability) and an integration test driving two simulated socket clients through a full round. README with setup + deploy instructions (Render/Railway/Fly). MIT license.

---

## 6. Success Criteria

1. Multiple players in 3+ states complete a level together with no install, in the same evening they receive the link.
2. A crew returning a week later sees its stars, unlocked levels, coins, and upgrades intact.
3. Lighthouse PWA installability passes; game is added to an iPhone home screen and launches full-screen in landscape.
4. All tests green; `npm start` is the only command needed to run it.

## 7. Future ideas
- **PlateUp-style restaurant mode** (customers seated at tables, multi-day runs with an upgrade draft) behind a home-screen mode toggle.
- Cross-crew level leaderboards and a family hall of fame; seasonal events; more worlds and characters; optional WebRTC voice.

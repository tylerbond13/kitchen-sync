# Kitchen Sync — Product Requirements Document

**Tagline:** Cook together, apart.
**Status:** v1.0 (shipped)
**Owner:** Tyler Bond
**Last updated:** 2026-06-10

---

## 1. Overview

Kitchen Sync is a real-time cooperative cooking game inspired by *Overcooked: All You Can Eat*, built for mobile web. Players join a shared kitchen from their own phones — like a Jackbox game — by visiting a link and entering a 4-letter crew code. Together they fetch ingredients, chop, cook, plate, and deliver meals against the clock across a campaign of levels, earning 1–3 stars per level.

### Why
The owner has 5 siblings spread across multiple states. Existing co-op cooking games require consoles, purchases, and being on the same couch or platform. Kitchen Sync needs nothing but a phone browser and a shared link.

### Goals
1. **Zero-friction join:** open a link → pick a chef → you're cooking, in under 30 seconds.
2. **Genuinely fun co-op:** the chaos and coordination of Overcooked — shared orders, divided labor, time pressure, shouting at your sister to plate the soup.
3. **Mobile-first:** designed for one-handed iPhone play in portrait. Tap-to-act controls; no virtual joysticks.
4. **Persistent progression:** crews keep their campaign progress (stars per level) forever; players keep profiles (name, avatar, lifetime stats).
5. **Installable:** PWA that can be added to the iOS home screen and launched full-screen like a native app.

### Non-goals (v1)
- Native iOS/Android apps, App Store distribution
- Competitive/versus modes
- Voice chat (players use FaceTime/phone alongside)
- Physics-based movement, throwing items, moving floors/conveyors
- Accounts with passwords (device-based identity is enough for a family game)

---

## 2. Players & Use Case

- **Primary:** a family group of 2–6 adults, each on their own iPhone, in different states, on a call together.
- **Session shape:** 15–45 minutes; a few levels per session; return weekly and resume the campaign.
- **Secondary:** any friend group wanting a quick co-op game with no install.

---

## 3. Core Experience

### 3.1 Joining (Jackbox model)
- Landing page shows the game logo, the player's chef profile, and two actions: **Start a Kitchen** and **Join a Kitchen**.
- Starting a kitchen creates a persistent **crew** with a 4-letter code (e.g. `TACO`). The host shares a link (`https://<host>/?join=TACO`) via iMessage using the native share sheet.
- Opening a join link pre-fills the code; the player picks a name + avatar once (remembered on the device) and lands in the lobby.
- Crews are **persistent**: re-entering the same code later restores the crew's campaign progress and member list.

### 3.2 Profiles
- Identity is per-device: a generated player ID stored in `localStorage`.
- Profile = display name + avatar (12 choices: chefs and animal chefs).
- Server-side profile record stores lifetime stats: levels played, meals delivered, stars earned, crews joined.
- Profile is editable any time from the home screen.

### 3.3 Lobby
- Shows crew code (large, shareable), connected members with avatars, and the **level map**.
- Level map: campaign levels as cards showing locked/unlocked state, earned stars, and best score. Level N+1 unlocks when level N has ≥1 star.
- Any member can browse the map; the **host** (crew creator, or oldest connected member) selects a level and starts the game. Minimum 1 player (solo practice allowed), designed for 2–6.

### 3.4 Gameplay
- Top-down shared kitchen on a tile grid, rendered identically for all players in real time.
- **Controls (mobile-first):** tap a tile to walk there; tap a station to walk to it and automatically interact (pick up / place / chop / cook / plate / serve / trash). One interaction model, no buttons to learn.
- **Stations:** ingredient crates, cutting boards, stoves (pan/pot), ovens, counters, plate stacks, serving window, trash.
- **Work loop:** grab ingredient → chop on board (auto-chops while your chef stands at the board) → cook in pan/pot/oven where required (cooking continues unattended; food **burns** if left too long) → assemble on plate → deliver to the serving window to fill an order.
- **Orders:** up to 4 visible tickets with countdown bars. Delivering on time scores base points + a tip proportional to remaining time, and builds a combo multiplier. Expired tickets cost points and reset the combo.
- Round timer per level (2–3 minutes). Final score maps to **1–3 stars** via per-level thresholds.
- Live presence: each chef shows its player's avatar and name; chefs never block each other.
- Disconnect handling: a dropped player's chef idles; they rejoin into the running game automatically on reconnect. Host can pause/resume.

### 3.5 Campaign (v1: 6 levels)
| # | Level | New mechanic | Recipes |
|---|-------|--------------|---------|
| 1 | Salad Days | fetch, chop, plate, serve | garden salad |
| 2 | Burger Bay | pan cooking, burning | burger, cheeseburger |
| 3 | Soup's On | pot with 3 ingredients | onion soup, tomato soup |
| 4 | Sushi Squad | parallel prep (rice pot + fish board) | sushi |
| 5 | Pizza Panic | oven assembly (dough+sauce+cheese) | pizza |
| 6 | The Grand Feast | everything at once, bigger kitchen | mixed menu |

### 3.6 Results
- End-of-round screen: animated stars, score vs. thresholds, meals delivered/missed, per-player delivery count, then back to lobby with progress saved.

---

## 4. Design Requirements

- **Look & feel:** warm, playful, premium. Cream/charcoal palette with tomato-red and golden accents; rounded geometry; soft shadows; juicy micro-animations (star pops, ticket slide-ins, chef bounce). Emoji-based food art keeps it crisp on retina at zero asset cost.
- **Portrait-first** layout; safe-area aware (notch/home indicator). Tap targets ≥ 44px.
- **Feedback:** subtle synthesized sound effects (chop, sizzle, ding, serve, fail) with a mute toggle; haptic-feel animations on every interaction.
- **Performance:** 60fps rendering on iPhone 11+, state updates ≥ 10Hz, playable on LTE.

---

## 5. Technical Requirements

- **Stack:** Node.js + Express + Socket.IO server (authoritative game simulation, 12Hz tick); vanilla JS + Canvas 2D client; no build step.
- **Architecture:** server-authoritative — clients send intents (taps), server simulates and broadcasts state; clients interpolate movement for smoothness.
- **Persistence:** JSON file store on the server (`data/`): `crews.json` (code → campaign progress, members) and `players.json` (playerId → profile + lifetime stats). Atomic, debounced writes. (Interface is swappable for a DB later.)
- **PWA:** web app manifest, service worker (cache-first for static assets), `apple-mobile-web-app-capable` for full-screen home-screen launch on iOS.
- **Sessions:** crew codes are 4 uppercase letters, collision-checked, permanent. Game rooms are in-memory; crews and profiles are on disk.
- **Quality bar:** unit tests for the game engine (recipes, cooking, scoring, stars) and an integration test driving two simulated socket clients through a full round. README with setup + deploy instructions (Render/Railway/Fly). MIT license.

---

## 6. Success Criteria

1. 6 players in 3+ states complete a level together with no install, in the same evening they receive the link.
2. A crew returning a week later sees its stars and unlocked levels intact.
3. Lighthouse PWA installability passes; game is added to an iPhone home screen and launches full-screen.
4. All tests green; `npm start` is the only command needed to run it.

## 7. Future ideas (post-v1)
- More levels, dish-washing, conveyor kitchens, level leaderboards across crews, spectator mode, seasonal events, optional WebRTC voice.

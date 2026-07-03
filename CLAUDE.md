# Kitchen Sync — guide for Claude

Overcooked-style real-time co-op cooking game for mobile web. Node/Express +
socket.io server (authoritative simulation), vanilla-JS client (no build step).

## Architecture
- **Server is authoritative.** `server/game.js` is the simulation engine (grid,
  movement, stations, orders, scoring). Clients send taps/keys; server ticks
  (~12 Hz) and broadcasts state.
- **Client renders only.** `public/js/isoRender.js` draws a flat 2D grid in an
  orthographic ¾ view (`screenX = gridX*TILE_WIDTH`, etc.). It never owns game
  state. `faceKey()` picks directional station sprites by wall side / explicit
  facing.
- Key files: `server/rooms.js` (lobby + socket wiring + custom-level builder),
  `server/levels.js` (levels, recipes, ingredients, cook combos), `server/store.js`
  (per-crew JSON persistence incl. saved boards), `server/index.js` (Express +
  `/api/version`, `/api/catalog`), `public/js/app.js` (client controller + Level
  Builder), `public/js/assetManifest.js` (art keys → image paths).

## Run / test
- `npm install && npm start` → http://localhost:3000
- `npm test` → `node --test test/` (46 tests). For previews use the launch.json
  config + preview tools, not raw `node`.

## Deploy & git — read carefully
- Live on **Render**; deploys on push to `main` via `.github/workflows/ci-deploy.yml`
  (runs `npm test`, then triggers Render). Repo: github.com/tylerbond13/kitchen-sync
  (`gh` authed as **tylerbond13**).
- ⚠️ **This working folder is a stale fork with UNRELATED git history — never push
  it.** Do all work in a throwaway worktree off `origin/main`:
  ```
  git worktree add /tmp/ks-x -b claude/<branch> origin/main
  # edit, then push with gh credentials:
  GIT_TERMINAL_PROMPT=0 git -c credential.helper="!gh auth git-credential" push -u origin claude/<branch>
  gh pr create --base main ... && gh pr merge <N> --merge   # merge → auto-deploy
  git worktree remove --force /tmp/ks-x
  ```
- **Bump `package.json` version per release** (semver). The in-game footer shows
  `v{version} · {commit}` from `/api/version` (commit = `RENDER_GIT_COMMIT`), so you
  can confirm which build is live.

## Game state (as of v1.3.1)
- **Diner is the main progression** (The Family Diner → Winter → Beach): Salad
  Days, Burger Bay, Sushi Squad, etc. with diner ingredients (lettuce, tomato,
  patty…). **Cake World** is a side section + level 15.
- **Art split (v1.39.0):** main-campaign stations use the **Beaux-Arts bakery set**
  (`ks-cw-*` in cake-world/stations — cream/honey/brass, full left/right facings and
  state variants: stove fire, pot full/active, sink dirty 0-3, plate-rack count 0-4);
  ingredient sprites remain diner art. Cake World keeps its own themed stations
  (mixer is the shared v2).
- **Level Builder** (lobby "Build / Test a Level" + per-level ✏️ edit): board-design
  presets, tap-to-place + drag-to-move + drag-to-paint, per-asset facing
  (Front/Left/Right), tuning sliders, grouped customer picker (mirrors menu groups),
  and **saved boards persisted to the kitchen code** (`crew.boards`).
- Desktop: arrow keys steer, space interacts (alongside tap). Base chef speed 2.5×.

## Working style
Iterate fast and **ship to live** (build → PR → merge → deploy is the default).
Rough-but-working beats slow; but verify before claiming something doesn't exist or
can't be done, and don't break things or guess on destructive ops (force-push,
dropping content). Keep diner content diner — don't reintroduce cake ingredients/
names/mixer art.

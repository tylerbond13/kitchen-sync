// Server-authoritative kitchen simulation.
// Clients send taps (tile coordinates); the server pathfinds, performs
// interactions, simulates chopping/cooking/orders, and broadcasts state.
const { ING, DISHES, RECIPES, COOK_COMBOS, CHOPPABLE } = require('./levels');

const SPEED = 4.08;       // tiles per second
const CHOP_TIME = 2.2;    // seconds of standing at a board
const AUTO_CHOP_RATE = 0.45; // unmanned boards chop at this fraction of full speed
const CHOP_SOUND_EVERY = 0.55;
const WASH_TIME = 2.5;    // seconds of standing at the sink, per plate
const DISH_BOT_RATE = WASH_TIME / 9; // upgrade: ~1 plate every 9s, unmanned
const DIRTY_RETURN_DELAY = 7; // seconds after serving until the dirty plate hits the sink
const EXPIRE_PENALTY = 20;
const RUSH_DURATION = 18; // seconds of lunch rush
const VIP_CHANCE = 0.15;

const TILE = { FLOOR: '.', COUNTER: '#', BOARD: 'B', PAN: 'S', POT: 'O', OVEN: 'V', PLATES: 'P', SERVE: 'W', TRASH: 'T', SINK: 'K' };
const TOOL_FOR = { S: 'pan', O: 'pot', V: 'oven' };

function itemToken(item) {
  if (!item) return null;
  if (item.kind === 'plate' || item.kind === 'stack') return null;
  if (item.kind === 'dish') return `${item.id}.dish`;
  return `${item.id}.${item.state}`;
}

// a plain item is its own contents; plates/stacks carry theirs
function contentsOf(item) {
  return item.kind === 'plate' || item.kind === 'stack' ? item.contents : [item];
}

function multisetEqual(a, b) {
  if (a.length !== b.length) return false;
  const sa = [...a].sort(), sb = [...b].sort();
  return sa.every((v, i) => v === sb[i]);
}

// is `a` a sub-multiset of `b`?
function isSubset(a, b) {
  const counts = {};
  for (const t of b) counts[t] = (counts[t] || 0) + 1;
  for (const t of a) {
    if (!counts[t]) return false;
    counts[t]--;
  }
  return true;
}

class Game {
  constructor(level, roster, opts = {}) {
    this.level = level;
    this.rng = opts.rng || Math.random;
    this.w = level.layout[0].length;
    this.h = level.layout.length;
    this.grid = level.layout.map((row) => row.split(''));
    this.stations = {}; // "x,y" -> station state
    this.spawnTiles = [];
    this.parseLayout();

    // crew upgrades (Kitchen Shop)
    const u = opts.upgrades || {};
    this.speed = SPEED * (u.fast_shoes ? 1.12 : 1);
    this.burnBonus = u.nonstick ? 3 : 0;
    this.cookMult = u.turbo_stove ? 0.85 : 1;
    this.dishBot = !!u.dish_bot;
    this.autoChopAllowed = !!u.auto_chopper;
    this.autoChop = this.autoChopAllowed && !!opts.autoChop;

    this.players = {};
    let i = 0;
    for (const p of roster) {
      const spawn = this.spawnTiles[i % this.spawnTiles.length];
      this.players[p.id] = {
        id: p.id, name: p.name, avatar: p.avatar,
        x: spawn.x + 0.5, y: spawn.y + 0.5,
        path: [], intent: null, carry: null, working: false,
        delivered: 0, chops: 0, washed: 0,
      };
      i++;
    }

    // smaller crews get gentler pacing and scaled star goals
    const n = roster.length;
    this.pace = n === 1 ? { every: 1.6, ttl: 1.35, stars: 0.7 }
      : n === 2 ? { every: 1.25, ttl: 1.15, stars: 0.85 }
      : { every: 1, ttl: 1, stars: 1 };
    this.starGoals = level.stars.map((s) => Math.max(50, Math.round((s * this.pace.stars) / 10) * 10));

    // plates are finite when the level has a sink: served plates come back
    // dirty and must be washed to rejoin the stack
    const hasSink = Object.values(this.stations).some((s) => s.type === 'sink');
    this.plateSupply = hasSink && level.plates
      ? level.plates + (u.extra_plate ? 1 : 0)
      : null; // null = infinite
    this.pendingDirty = []; // seconds until each served plate lands in the sink

    this.timeLeft = level.duration;
    this.score = 0;
    this.combo = 0;
    this.deliveredCount = 0;
    this.missedCount = 0;
    this.orders = [];
    this.nextOrderId = 1;
    this.orderClock = 0; // spawn first order immediately
    this.phase = 'playing';
    this.paused = false;
    this.pausedBy = null;
    // cosmetic seed: clients shuffle the customer cast with it, so every
    // phone in the crew sees the same characters in the same order
    this.seed = Math.floor(this.rng() * 0xFFFFFFFF) >>> 0;
    // two lunch-rush windows per round, at ~60% and ~28% time remaining
    this.rushMarks = [Math.round(level.duration * 0.6), Math.round(level.duration * 0.28)];
    this.rush = 0;
    this.events = [];
  }

  parseLayout() {
    for (let y = 0; y < this.h; y++) {
      for (let x = 0; x < this.w; x++) {
        const c = this.grid[y][x];
        const key = `${x},${y}`;
        if (c === TILE.FLOOR) {
          this.spawnTiles.push({ x, y });
        } else if (c === TILE.COUNTER) {
          this.stations[key] = { type: 'counter', item: null };
        } else if (c === TILE.BOARD) {
          this.stations[key] = { type: 'board', item: null, soundAcc: 0 };
        } else if (TOOL_FOR[c]) {
          this.stations[key] = { type: 'cook', tool: TOOL_FOR[c], contents: [], combo: null, progress: 0, state: 'idle' };
        } else if (c === TILE.PLATES) {
          this.stations[key] = { type: 'plates' };
        } else if (c === TILE.SERVE) {
          this.stations[key] = { type: 'serve' };
        } else if (c === TILE.TRASH) {
          this.stations[key] = { type: 'trash' };
        } else if (c === TILE.SINK) {
          this.stations[key] = { type: 'sink', dirty: 0, progress: 0 };
        } else if (/[1-9]/.test(c)) {
          this.stations[key] = { type: 'crate', ing: this.level.crates[c] };
        }
      }
    }
    // prefer central spawn tiles
    this.spawnTiles.sort((a, b) =>
      Math.hypot(a.x - this.w / 2, a.y - this.h / 2) - Math.hypot(b.x - this.w / 2, b.y - this.h / 2));
  }

  isFloor(x, y) {
    return x >= 0 && y >= 0 && x < this.w && y < this.h && this.grid[y][x] === TILE.FLOOR;
  }

  // BFS path from tile to tile across floor. Returns array of waypoints or null.
  findPath(fromX, fromY, toX, toY) {
    if (fromX === toX && fromY === toY) return [];
    const key = (x, y) => y * this.w + x;
    const prev = new Map([[key(fromX, fromY), null]]);
    const q = [[fromX, fromY]];
    while (q.length) {
      const [cx, cy] = q.shift();
      if (cx === toX && cy === toY) {
        const path = [];
        let k = key(cx, cy);
        let cur = [cx, cy];
        while (k !== null && prev.get(k) !== null) {
          path.unshift({ x: cur[0], y: cur[1] });
          cur = prev.get(k);
          k = key(cur[0], cur[1]);
        }
        return path;
      }
      for (const [dx, dy] of [[1, 0], [-1, 0], [0, 1], [0, -1]]) {
        const nx = cx + dx, ny = cy + dy;
        if (!this.isFloor(nx, ny)) continue;
        const nk = key(nx, ny);
        if (prev.has(nk)) continue;
        prev.set(nk, [cx, cy]);
        q.push([nx, ny]);
      }
    }
    return null;
  }

  adjacentFloors(x, y) {
    const out = [];
    for (const [dx, dy] of [[1, 0], [-1, 0], [0, 1], [0, -1]]) {
      if (this.isFloor(x + dx, y + dy)) out.push({ x: x + dx, y: y + dy });
    }
    return out;
  }

  emit(type, data = {}) {
    this.events.push({ type, ...data });
  }

  // ---- player input -------------------------------------------------------

  tap(playerId, tx, ty) {
    const p = this.players[playerId];
    if (!p || this.phase !== 'playing' || this.paused) return;
    tx = Math.floor(tx); ty = Math.floor(ty);
    if (tx < 0 || ty < 0 || tx >= this.w || ty >= this.h) return;

    const px = Math.floor(p.x), py = Math.floor(p.y);
    const stationKey = `${tx},${ty}`;

    if (this.stations[stationKey]) {
      if (Math.abs(px - tx) + Math.abs(py - ty) === 1) {
        p.path = [];
        p.intent = null;
        this.interact(p, stationKey);
        return;
      }
      let best = null;
      for (const f of this.adjacentFloors(tx, ty)) {
        const path = this.findPath(px, py, f.x, f.y);
        if (path && (!best || path.length < best.length)) best = path;
      }
      if (best) {
        p.path = best;
        p.intent = stationKey;
        this.emit('go', { playerId });
      }
      return;
    }

    if (this.isFloor(tx, ty)) {
      // forgiving taps: tapping your own tile (often hidden under your chef
      // and the item floating above their head) tries the adjacent station
      // instead of doing nothing — preferring the tile above, where the
      // carried item visually sits
      if (tx === px && ty === py && p.carry) {
        for (const [dx, dy] of [[0, -1], [1, 0], [-1, 0], [0, 1]]) {
          const k = `${tx + dx},${ty + dy}`;
          if (this.stations[k]) {
            this.interact(p, k);
            return;
          }
        }
      }
      const path = this.findPath(px, py, tx, ty);
      if (path) {
        p.path = path;
        p.intent = null;
        this.emit('go', { playerId });
      }
    }
  }

  // ---- combining helpers --------------------------------------------------

  // combine two non-plate items into a handheld stack (e.g. patty onto bun)
  tryStack(a, b) {
    if (!a || !b || a.kind === 'plate' || b.kind === 'plate') return null;
    const contents = [...contentsOf(a), ...contentsOf(b)];
    const tokens = contents.map(itemToken);
    if (tokens.some((t) => t === null)) return null;
    const fits = Object.values(RECIPES).some((r) => r.handheld && isSubset(tokens, r.needs));
    if (!fits) return null;
    return { kind: 'stack', contents };
  }

  addToPlate(plate, item, at) {
    if (item.kind === 'plate') return false;
    const incoming = contentsOf(item);
    const tokens = plate.contents.map(itemToken).concat(incoming.map(itemToken));
    if (tokens.some((t) => t === null)) return false;
    const fitsAny = Object.values(RECIPES).some((r) => isSubset(tokens, r.needs));
    if (!fitsAny) {
      this.emit('reject', at);
      return false;
    }
    plate.contents.push(...incoming);
    this.emit('plate', at);
    return true;
  }

  // merge a produced item (e.g. cooked patty from the pan) into whatever the
  // player is holding: empty hand, plate, or a handheld stack-in-progress
  mergeIntoCarry(p, out, at) {
    if (!p.carry) {
      p.carry = out;
      this.emit('pickup', at);
      return true;
    }
    if (p.carry.kind === 'plate') return this.addToPlate(p.carry, out, at);
    const stack = this.tryStack(p.carry, out);
    if (stack) {
      p.carry = stack;
      this.emit('plate', at);
      return true;
    }
    this.emit('reject', at);
    return false;
  }

  // ---- interactions -------------------------------------------------------

  interact(p, stationKey) {
    const s = this.stations[stationKey];
    if (!s) return;
    const [sx, sy] = stationKey.split(',').map(Number);
    const at = { x: sx, y: sy, playerId: p.id };

    switch (s.type) {
      case 'crate': {
        const fresh = { id: s.ing, state: 'raw' };
        if (!p.carry) {
          p.carry = fresh;
          this.emit('pickup', at);
        } else if (p.carry.kind === 'plate') {
          this.addToPlate(p.carry, fresh, at);
        } else {
          // holding food and grabbing a base from the crate (e.g. bun under a patty)
          const stack = this.tryStack(p.carry, fresh);
          if (stack) { p.carry = stack; this.emit('plate', at); }
          else this.emit('reject', at);
        }
        break;
      }
      case 'counter': {
        if (!p.carry && s.item) {
          p.carry = s.item; s.item = null;
          this.emit('pickup', at);
        } else if (p.carry && !s.item) {
          s.item = p.carry; p.carry = null;
          this.emit('place', at);
        } else if (p.carry && s.item) {
          if (p.carry.kind === 'plate' && s.item.kind === 'plate') {
            // merge plates: pour the held plate onto the seated one,
            // walk away with the empty plate still in hand
            const tokens = s.item.contents.map(itemToken).concat(p.carry.contents.map(itemToken));
            const fitsAny = Object.values(RECIPES).some((r) => isSubset(tokens, r.needs));
            if (fitsAny && p.carry.contents.length) {
              s.item.contents.push(...p.carry.contents);
              p.carry.contents = [];
              this.emit('plate', at);
            } else {
              this.emit('reject', at);
            }
          } else if (p.carry.kind === 'plate' && s.item.kind !== 'plate') {
            if (this.addToPlate(p.carry, s.item, at)) s.item = null;
          } else if (s.item.kind === 'plate' && p.carry.kind !== 'plate') {
            if (this.addToPlate(s.item, p.carry, at)) p.carry = null;
          } else if (p.carry.kind !== 'plate' && s.item.kind !== 'plate') {
            const stack = this.tryStack(p.carry, s.item);
            if (stack) {
              p.carry = stack; s.item = null;
              this.emit('plate', at);
            } else {
              // swap hands with the counter — no more dead taps
              [p.carry, s.item] = [s.item, p.carry];
              this.emit('pickup', at);
            }
          }
        }
        break;
      }
      case 'board': {
        if (p.carry && !s.item && p.carry.kind !== 'plate') {
          // anything non-plate can rest on a board; only raw choppables chop.
          // chop progress lives ON the item, so it always survives moves.
          s.item = p.carry; p.carry = null;
          this.emit('place', at);
        } else if (!p.carry && s.item) {
          p.carry = s.item; s.item = null;
          this.emit('pickup', at);
        } else if (p.carry && s.item) {
          if (p.carry.kind === 'plate') {
            if (this.addToPlate(p.carry, s.item, at)) s.item = null;
          } else {
            const stack = this.tryStack(p.carry, s.item);
            if (stack) {
              p.carry = stack; s.item = null;
              this.emit('plate', at);
            } else {
              [p.carry, s.item] = [s.item, p.carry];
              this.emit('pickup', at);
            }
          }
        }
        break;
      }
      case 'cook': {
        this.interactCook(p, s, at);
        break;
      }
      case 'plates': {
        if (this.plateSupply !== null && this.plateSupply <= 0) {
          this.emit('reject', at); // stack is empty — wash some dishes!
          break;
        }
        if (!p.carry) {
          p.carry = { kind: 'plate', contents: [] };
          if (this.plateSupply !== null) this.plateSupply--;
          this.emit('pickup', at);
        } else if (p.carry.kind !== 'plate') {
          // ingredient-first: grab a plate under what you're holding
          const plate = { kind: 'plate', contents: [] };
          if (this.addToPlate(plate, p.carry, at)) {
            p.carry = plate;
            if (this.plateSupply !== null) this.plateSupply--;
          }
        }
        break;
      }
      case 'sink': {
        this.emit(s.dirty > 0 ? 'go' : 'reject', at); // washing happens by standing here
        break;
      }
      case 'serve': {
        if (p.carry && (p.carry.kind === 'plate' || p.carry.kind === 'stack') && p.carry.contents.length) {
          this.tryServe(p, at);
        } else {
          this.emit('reject', at);
        }
        break;
      }
      case 'trash': {
        if (p.carry) {
          if (p.carry.kind === 'plate') p.carry.contents = [];
          else p.carry = null;
          this.emit('trash', at);
        }
        break;
      }
    }
  }

  interactCook(p, s, at) {
    if (s.state === 'done') {
      const out = s.contents[0];
      if (this.mergeIntoCarry(p, out, at)) this.resetCooker(s);
      return;
    }
    if (s.state === 'burned') {
      if (!p.carry) {
        p.carry = { kind: 'dish', id: 'burned' };
        this.resetCooker(s);
        this.emit('pickup', at);
      }
      return;
    }
    // idle / filling / cooking: try to add an ingredient
    if (p.carry && p.carry.kind !== 'plate' && p.carry.kind !== 'dish' && p.carry.kind !== 'stack') {
      const token = itemToken(p.carry);
      const tokens = s.contents.map(itemToken).concat(token);
      const candidates = COOK_COMBOS.filter((c) => c.tool === s.tool && isSubset(tokens, c.inputs));
      if (!candidates.length) {
        this.emit('reject', at);
        return;
      }
      s.contents.push(p.carry);
      p.carry = null;
      this.emit('place', at);
      const full = candidates.find((c) => multisetEqual(tokens, c.inputs));
      if (full) {
        s.combo = full;
        s.state = 'cooking';
        s.progress = 0;
        this.emit('sizzle', at);
      }
    } else if (!p.carry && s.contents.length && s.state !== 'cooking') {
      // take back the last ingredient before cooking starts
      p.carry = s.contents.pop();
      this.emit('pickup', at);
    }
  }

  resetCooker(s) {
    s.contents = []; s.combo = null; s.progress = 0; s.state = 'idle';
  }

  tryServe(p, at) {
    const tokens = p.carry.contents.map(itemToken);
    const idx = this.orders.findIndex((o) => multisetEqual(tokens, RECIPES[o.recipe].needs));
    if (idx === -1) {
      this.emit('reject', at);
      return;
    }
    const order = this.orders[idx];
    this.orders.splice(idx, 1);
    const recipe = RECIPES[order.recipe];
    const base = recipe.points * (order.vip ? 3 : 1);
    let tip = Math.round(base * 0.5 * (order.ttl / order.ttlMax));
    if (this.rush > 0) tip *= 2; // rush hour: double tips
    this.combo = Math.min(this.combo + 1, 4);
    const comboBonus = (this.combo - 1) * 10;
    this.score += base + tip + comboBonus;
    this.deliveredCount++;
    p.delivered++;
    const wasPlate = p.carry.kind === 'plate';
    p.carry = null;
    // plates come back dirty at the sink; handheld stacks don't dirty a dish
    if (wasPlate && this.plateSupply !== null) this.pendingDirty.push(DIRTY_RETURN_DELAY);
    this.emit('serve', { ...at, points: base + tip + comboBonus, recipe: order.recipe, vip: !!order.vip });
  }

  // ---- simulation ---------------------------------------------------------

  tick(dt) {
    if (this.phase !== 'playing' || this.paused) {
      const ev = this.events; this.events = [];
      return ev;
    }

    this.timeLeft -= dt;

    // lunch rush windows
    if (this.rushMarks.length && this.timeLeft <= this.rushMarks[0]) {
      this.rushMarks.shift();
      this.rush = RUSH_DURATION;
      this.emit('rush_start', {});
    }
    if (this.rush > 0) {
      this.rush -= dt;
      if (this.rush <= 0) {
        this.rush = 0;
        this.emit('rush_end', {});
      }
    }

    // movement + arrival interactions
    for (const p of Object.values(this.players)) {
      if (p.path.length) {
        const wp = p.path[0];
        const tx = wp.x + 0.5, ty = wp.y + 0.5;
        const dx = tx - p.x, dy = ty - p.y;
        const dist = Math.hypot(dx, dy);
        const step = this.speed * dt;
        if (dist <= step) {
          p.x = tx; p.y = ty;
          p.path.shift();
          if (!p.path.length && p.intent) {
            const intent = p.intent; p.intent = null;
            this.interact(p, intent);
          }
        } else {
          p.x += (dx / dist) * step;
          p.y += (dy / dist) * step;
        }
      }
    }

    // chopping: a chef standing at the board works at full speed;
    // with the Auto-Chopper enabled, unmanned boards work slowly by themselves
    for (const [key, s] of Object.entries(this.stations)) {
      if (s.type !== 'board') continue;
      if (!s.item || s.item.state !== 'raw' || !CHOPPABLE.has(s.item.id)) continue;
      const [sx, sy] = key.split(',').map(Number);
      const worker = Object.values(this.players).find((p) =>
        !p.path.length && Math.abs(Math.floor(p.x) - sx) + Math.abs(Math.floor(p.y) - sy) === 1);
      let rate = 0;
      if (worker) {
        worker.working = true;
        rate = 1;
      } else if (this.autoChop) {
        rate = AUTO_CHOP_RATE;
      }
      if (rate > 0) {
        s.item.prog = (s.item.prog || 0) + (dt * rate) / CHOP_TIME;
        s.soundAcc = (s.soundAcc || 0) + dt * rate;
        if (s.soundAcc >= CHOP_SOUND_EVERY) {
          s.soundAcc = 0;
          this.emit('chop', { x: sx, y: sy });
        }
        if (s.item.prog >= 1) {
          s.item.state = 'chopped';
          delete s.item.prog;
          s.soundAcc = 0;
          if (worker) worker.chops++;
          this.emit('chopped', { x: sx, y: sy });
        }
      }
    }

    // dirty plates arriving at the sink
    if (this.pendingDirty.length) {
      this.pendingDirty = this.pendingDirty.map((t) => t - dt);
      const arrived = this.pendingDirty.filter((t) => t <= 0).length;
      if (arrived) {
        this.pendingDirty = this.pendingDirty.filter((t) => t > 0);
        const sink = Object.values(this.stations).find((s) => s.type === 'sink');
        if (sink) sink.dirty += arrived;
        else this.plateSupply += arrived; // no sink: plates come back clean
      }
    }

    // washing: a chef at the sink scrubs at full speed; the Dish-Bot upgrade
    // washes slowly on its own
    for (const [key, s] of Object.entries(this.stations)) {
      if (s.type !== 'sink' || s.dirty <= 0) continue;
      const [sx, sy] = key.split(',').map(Number);
      const worker = Object.values(this.players).find((p) =>
        !p.path.length && Math.abs(Math.floor(p.x) - sx) + Math.abs(Math.floor(p.y) - sy) === 1);
      let rate = 0;
      if (worker) {
        worker.working = true;
        rate = 1;
      } else if (this.dishBot) {
        rate = DISH_BOT_RATE;
      }
      if (rate > 0) {
        s.progress += (dt * rate) / WASH_TIME;
        if (s.progress >= 1) {
          s.dirty--;
          s.progress = 0;
          if (this.plateSupply !== null) this.plateSupply++;
          if (worker) worker.washed++;
          this.emit('washed', { x: sx, y: sy });
        }
      }
    }

    // clear working flags for players not actually chopping or washing
    for (const p of Object.values(this.players)) {
      if (p.working) {
        const px = Math.floor(p.x), py = Math.floor(p.y);
        const stillWorking = Object.entries(this.stations).some(([key, s]) => {
          const busyBoard = s.type === 'board' && s.item && s.item.state === 'raw' && CHOPPABLE.has(s.item.id);
          const busySink = s.type === 'sink' && s.dirty > 0;
          if (!busyBoard && !busySink) return false;
          const [sx, sy] = key.split(',').map(Number);
          return !p.path.length && Math.abs(px - sx) + Math.abs(py - sy) === 1;
        });
        if (!stillWorking) p.working = false;
      }
    }

    // cooking
    for (const [key, s] of Object.entries(this.stations)) {
      if (s.type !== 'cook' || s.state === 'idle' || s.state === 'burned') continue;
      if (s.state === 'cooking') {
        s.progress += dt;
        if (s.progress >= s.combo.time * this.cookMult) {
          const out = s.combo.out.kind === 'dish'
            ? { kind: 'dish', id: s.combo.out.id }
            : { id: s.combo.out.id, state: s.combo.out.state };
          s.contents = [out];
          s.state = 'done';
          s.progress = 0;
          const [sx, sy] = key.split(',').map(Number);
          this.emit('ding', { x: sx, y: sy });
        }
      } else if (s.state === 'done') {
        s.progress += dt;
        if (s.progress >= s.combo.burnAfter + this.burnBonus) {
          s.contents = [{ kind: 'dish', id: 'burned' }];
          s.state = 'burned';
          const [sx, sy] = key.split(',').map(Number);
          this.emit('burn', { x: sx, y: sy });
        }
      }
    }

    // orders
    this.orderClock -= dt;
    const cfg = this.level.orders;
    const spawnEvery = cfg.every * this.pace.every * (this.rush > 0 ? 0.55 : 1);
    if (this.orderClock <= 0 && this.orders.length < cfg.maxOpen && this.timeLeft > 15) {
      const first = this.orders.length === 0 && this.nextOrderId === 1;
      const recipe = first ? cfg.recipes[0] : cfg.recipes[Math.floor(this.rng() * cfg.recipes.length)];
      const vip = !first && this.rng() < VIP_CHANCE;
      const ttl = cfg.ttl * this.pace.ttl * (vip ? 0.75 : 1);
      this.orders.push({ id: this.nextOrderId++, recipe, vip, ttl, ttlMax: ttl });
      this.orderClock = spawnEvery;
      this.emit('order', { recipe, vip });
    }
    for (const o of this.orders) o.ttl -= dt;
    const expired = this.orders.filter((o) => o.ttl <= 0);
    if (expired.length) {
      this.orders = this.orders.filter((o) => o.ttl > 0);
      for (const o of expired) {
        this.score = Math.max(0, this.score - EXPIRE_PENALTY);
        this.missedCount++;
        this.combo = 0;
        this.emit('expire', { recipe: o.recipe });
      }
    }

    if (this.timeLeft <= 0) {
      this.timeLeft = 0;
      this.phase = 'over';
      this.emit('over', {});
    }

    const ev = this.events; this.events = [];
    return ev;
  }

  starsEarned() {
    const [s1, s2, s3] = this.starGoals;
    if (this.score >= s3) return 3;
    if (this.score >= s2) return 2;
    if (this.score >= s1) return 1;
    return 0;
  }

  // ---- serialization ------------------------------------------------------

  staticState() {
    return {
      levelId: this.level.id,
      name: this.level.name,
      theme: this.level.theme || 'diner',
      w: this.w,
      h: this.h,
      grid: this.level.layout,
      crates: this.level.crates,
      duration: this.level.duration,
      starThresholds: this.starGoals,
      autoChopAllowed: this.autoChopAllowed,
      seed: this.seed,
    };
  }

  dynamicState(events) {
    const stations = {};
    for (const [key, s] of Object.entries(this.stations)) {
      if (s.type === 'counter' && s.item) stations[key] = { item: s.item };
      else if (s.type === 'board' && s.item) {
        stations[key] = { item: s.item, progress: s.item.prog || 0 };
      }
      else if (s.type === 'sink' && (s.dirty > 0 || s.progress > 0)) {
        stations[key] = { dirty: s.dirty, progress: s.progress };
      }
      else if (s.type === 'cook' && (s.contents.length || s.state !== 'idle')) {
        stations[key] = {
          contents: s.contents,
          state: s.state,
          progress: s.state === 'cooking' ? s.progress / (s.combo.time * this.cookMult)
            : s.state === 'done' ? s.progress / (s.combo.burnAfter + this.burnBonus) : 0,
        };
      }
    }
    return {
      t: Math.ceil(this.timeLeft),
      plates: this.plateSupply,
      incomingDirty: this.pendingDirty.length,
      score: this.score,
      combo: this.combo,
      rush: this.rush > 0 ? Math.ceil(this.rush) : 0,
      autoChop: this.autoChop,
      phase: this.phase,
      paused: this.paused,
      pausedBy: this.pausedBy,
      players: Object.values(this.players).map((p) => ({
        id: p.id, name: p.name, avatar: p.avatar,
        x: Math.round(p.x * 100) / 100, y: Math.round(p.y * 100) / 100,
        carry: p.carry, working: p.working, moving: p.path.length > 0,
        delivered: p.delivered,
      })),
      stations,
      orders: this.orders.map((o) => ({
        id: o.id, recipe: o.recipe, vip: !!o.vip,
        name: RECIPES[o.recipe].name, emoji: RECIPES[o.recipe].emoji,
        needs: RECIPES[o.recipe].needs,
        ttl: Math.max(0, o.ttl), ttlMax: o.ttlMax,
      })),
      events,
    };
  }

  results() {
    return {
      levelId: this.level.id,
      score: this.score,
      stars: this.starsEarned(),
      starThresholds: this.starGoals,
      delivered: this.deliveredCount,
      missed: this.missedCount,
      players: Object.values(this.players).map((p) => ({
        id: p.id, name: p.name, avatar: p.avatar,
        delivered: p.delivered, chops: p.chops, washed: p.washed,
      })),
    };
  }
}

module.exports = { Game, itemToken, multisetEqual, isSubset, contentsOf };

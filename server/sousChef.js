// Sous-Chef — a server-side AI teammate that plays a chef alongside the crew.
//
// v1 "prep mode": the bot does the grunt work a human hates, reliably and
// without ever fighting you for plates or the serving window:
//   • keeps the cutting boards stocked with the CHOPPED ingredients the active
//     orders need (chopping is hands-free once food is on a board, so the bot
//     just shuttles raws from crates to boards and moves on), and
//   • washes dirty dishes when the plate stack runs low.
//
// It drives its chef through the exact same public methods a socket client
// uses (game.tap), so the authoritative sim treats it like any other player.
// A smarter/learned policy can slot in behind the same `decide()` seam later.
const { RECIPES, COOK_COMBOS, CHOPPABLE } = require('./levels');

function comboOutToken(out) {
  return out.kind === 'dish' ? `${out.id}.dish` : `${out.id}.${out.state}`;
}

// The choppable ingredient ids a single need-token ultimately requires — a
// `X.chopped` need is one chop; a cooked/dish need is expanded through its cook
// combo to the chops feeding it (patty.cooked → patty.chopped, soup → 3 onions,
// pizza → tomato + cheese, …). Raws need no chop; iced/garnished cakes (tokens
// with a `#` tag) are left to the human for now.
function chopsForToken(token, depth = 0) {
  if (!token || depth > 4 || token.includes('#')) return [];
  const dot = token.lastIndexOf('.');
  const id = token.slice(0, dot);
  const state = token.slice(dot + 1);
  if (state === 'chopped') return CHOPPABLE.has(id) ? [id] : [];
  if (state === 'raw') return [];
  if (state === 'cooked' || state === 'dish') {
    const combo = COOK_COMBOS.find((c) => comboOutToken(c.out) === token);
    if (!combo) return [];
    const out = [];
    for (const inp of combo.inputs) out.push(...chopsForToken(inp, depth + 1));
    return out;
  }
  return [];
}

function chopsForRecipe(recipeId) {
  const r = RECIPES[recipeId];
  if (!r) return [];
  const out = [];
  for (const t of r.needs) out.push(...chopsForToken(t));
  return out; // ingredient ids, with multiplicity
}

class SousChef {
  constructor(game, botId) {
    this.game = game;
    this.botId = botId;
    this.acc = 0;        // decision throttle accumulator
    this._idx = null;    // cached static station index (positions never move)
  }

  index() {
    if (this._idx) return this._idx;
    const crates = {}, boards = [], counters = [], sinks = [];
    for (const [key, s] of Object.entries(this.game.stations)) {
      const [x, y] = key.split(',').map(Number);
      if (s.type === 'crate') (crates[s.ing] || (crates[s.ing] = [])).push({ key, x, y });
      else if (s.type === 'board') boards.push({ key, x, y });
      else if (s.type === 'counter') counters.push({ key, x, y });
      else if (s.type === 'sink') sinks.push({ key, x, y });
    }
    this._idx = { crates, boards, counters, sinks };
    return this._idx;
  }

  // Called each server tick before the sim ticks. Decides at most a few times a
  // second, and only when the bot is idle (not walking / mid-scrub).
  think(dt) {
    const g = this.game;
    const p = g.players[this.botId];
    if (!p || g.phase !== 'playing' || g.paused) return;
    if (p.path.length || (p.queue && p.queue.length) || g.isPlayerDoingStationWork(p)) return;
    this.acc += dt;
    if (this.acc < 0.18) return;
    this.acc = 0;
    const target = this.decide(p);
    if (target) g.tap(this.botId, target.x, target.y);
  }

  freeBoard() {
    return this.index().boards.find((b) => !this.game.stations[b.key].item) || null;
  }
  freeCounter() {
    return this.index().counters.find((c) => !this.game.stations[c.key].item) || null;
  }
  dirtyCount() {
    return this.index().sinks.reduce((n, s) => n + (this.game.stations[s.key].dirty || 0), 0);
  }

  // How many of `ing` are already chopped or staged/chopping across the kitchen
  // (plus one if the bot is carrying it) — so the bot never over-produces.
  supply(ing) {
    let n = 0;
    for (const s of Object.values(this.game.stations)) {
      const it = s.item;
      if (it && it.id === ing && (it.state === 'chopped' || it.state === 'raw') && CHOPPABLE.has(ing)) n++;
    }
    const c = this.game.players[this.botId].carry;
    if (c && c.id === ing && !c.kind) n++;
    return n;
  }

  // Chopped-ingredient demand across the currently-open orders.
  demand() {
    const need = {};
    for (const o of this.game.orders) {
      for (const ing of chopsForRecipe(o.recipe)) need[ing] = (need[ing] || 0) + 1;
    }
    return need;
  }

  decide(p) {
    const carry = p.carry;

    // Carrying a raw choppable → drop it on a free board to chop (or a counter
    // if every board is busy — rare race).
    if (carry && !carry.kind && carry.state === 'raw' && CHOPPABLE.has(carry.id)) {
      return this.freeBoard() || this.freeCounter() || null;
    }
    // Carrying anything else (shouldn't usually happen) → set it down.
    if (carry) return this.freeCounter() || null;

    // Hands free.
    const plates = this.game.plateSupply;   // null = infinite (no sink level)
    const dirty = this.dirtyCount();
    const idx = this.index();

    // Plate stack empty with dishes waiting → wash right now.
    if (plates !== null && plates <= 0 && dirty > 0 && idx.sinks[0]) return idx.sinks[0];

    // Prep: grab a raw for the most-needed, under-supplied chopped ingredient
    // that this kitchen actually stocks and has a board free for.
    if (this.freeBoard()) {
      const need = this.demand();
      let bestIng = null, best = 0;
      for (const ing of Object.keys(need)) {
        if (!(idx.crates[ing] || []).length) continue; // not stocked here
        const deficit = need[ing] - this.supply(ing);
        if (deficit > best) { best = deficit; bestIng = ing; }
      }
      if (bestIng) return idx.crates[bestIng][0];
    }

    // Otherwise keep the plates clean.
    if (plates !== null && dirty > 0 && idx.sinks[0]) return idx.sinks[0];

    return null; // nothing useful to do — idle
  }
}

module.exports = { SousChef, chopsForRecipe, chopsForToken };

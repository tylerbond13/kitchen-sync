// Sous-Chef — a server-side AI teammate that plays a chef alongside the crew.
//
// Two modes:
//   • 'prep'  — the grunt-work assistant: keeps the boards stocked with the
//               chopped ingredients orders need, rescues finished dishes off the
//               stove, washes dishes, and clears finished chops onto counters so
//               it never stands idle in front of full boards.
//   • 'expo'  — the expediter: assembles orders on plates from whatever's ready
//               (chopped/cooked/raw components + rescued dishes) and SERVES them.
//               For chop-only recipes (salads) it's fully autonomous; for cooked
//               dishes it plates + serves what the crew (or its own rescue) stages.
//
// It drives its chef through the exact same public methods a socket client uses
// (game.tap), so the authoritative sim treats it like any other player.
const { RECIPES, COOK_COMBOS, CHOPPABLE } = require('./levels');
const { itemToken, multisetEqual, isSubset } = require('./game');

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

// tokens in `need` that `have` doesn't cover (multiset difference)
function multisetDiff(need, have) {
  const counts = {};
  for (const t of have) counts[t] = (counts[t] || 0) + 1;
  const missing = [];
  for (const t of need) {
    if (counts[t] > 0) counts[t]--;
    else missing.push(t);
  }
  return missing;
}

class SousChef {
  constructor(game, botId, mode = 'prep') {
    this.game = game;
    this.botId = botId;
    this.mode = mode === 'expo' ? 'expo' : 'prep';
    this.acc = 0;        // decision throttle accumulator
    this._idx = null;    // cached static station index (positions never move)
  }

  index() {
    if (this._idx) return this._idx;
    const crates = {}, boards = [], counters = [], sinks = [], serves = [], plates = [], trash = [];
    for (const [key, s] of Object.entries(this.game.stations)) {
      const [x, y] = key.split(',').map(Number);
      const at = { key, x, y };
      if (s.type === 'crate') (crates[s.ing] || (crates[s.ing] = [])).push(at);
      else if (s.type === 'board') boards.push(at);
      else if (s.type === 'counter') counters.push(at);
      else if (s.type === 'sink') sinks.push(at);
      else if (s.type === 'serve') serves.push(at);
      else if (s.type === 'plates') plates.push(at);
      else if (s.type === 'trash') trash.push(at);
    }
    this._idx = { crates, boards, counters, sinks, serves, plates, trash };
    return this._idx;
  }

  // Called each server tick before the sim ticks. Decides a few times a second,
  // and only when the bot is idle (not walking / mid-scrub).
  think(dt) {
    const g = this.game;
    const p = g.players[this.botId];
    if (!p || g.phase !== 'playing' || g.paused) return;
    if (p.path.length || (p.queue && p.queue.length) || g.isPlayerDoingStationWork(p)) return;
    this.acc += dt;
    if (this.acc < 0.18) return;
    this.acc = 0;
    const target = this.mode === 'expo' ? this.decideExpo(p) : this.decidePrep(p);
    if (target) g.tap(this.botId, target.x, target.y);
  }

  // ---- shared helpers -------------------------------------------------------
  freeBoard() { return this.index().boards.find((b) => !this.game.stations[b.key].item) || null; }
  freeCounter() { return this.index().counters.find((c) => !this.game.stations[c.key].item) || null; }
  dirtyCount() { return this.index().sinks.reduce((n, s) => n + (this.game.stations[s.key].dirty || 0), 0); }
  doneCooker() {
    return Object.entries(this.game.stations).find(([, s]) => s.type === 'cook' && s.state === 'done') || null;
  }

  // A board holding a FINISHED chopped item (grabbable), if any.
  finishedChopBoard() {
    return this.index().boards.find((b) => {
      const it = this.game.stations[b.key].item;
      return it && !it.kind && it.state === 'chopped';
    }) || null;
  }

  // How many of `ing` are chopped/staged/chopping across the kitchen (+ carried,
  // + already committed into a cooker), so the bot never over-produces.
  supply(ing) {
    let n = 0;
    for (const s of Object.values(this.game.stations)) {
      const it = s.item;
      if (it && it.id === ing && (it.state === 'chopped' || it.state === 'raw') && CHOPPABLE.has(ing)) n++;
      if (s.contents) for (const ci of s.contents) if (ci.id === ing && CHOPPABLE.has(ing)) n++;
    }
    const c = this.game.players[this.botId].carry;
    if (c && c.id === ing && !c.kind) n++;
    return n;
  }

  demand() {
    const need = {};
    for (const o of this.game.orders) {
      for (const ing of chopsForRecipe(o.recipe)) need[ing] = (need[ing] || 0) + 1;
    }
    return need;
  }

  // Grab a raw for the most-needed, under-supplied chopped ingredient this
  // kitchen stocks and has a free board for. Returns the crate tile or null.
  grabForChop() {
    if (!this.freeBoard()) return null;
    const idx = this.index();
    const need = this.demand();
    let bestIng = null, best = 0;
    for (const ing of Object.keys(need)) {
      if (!(idx.crates[ing] || []).length) continue;
      const deficit = need[ing] - this.supply(ing);
      if (deficit > best) { best = deficit; bestIng = ing; }
    }
    return bestIng ? idx.crates[bestIng][0] : null;
  }

  // A tile to grab a component matching `token` from: a raw crate, a loose item
  // on a board/counter, or a finished cook station.
  sourceFor(token) {
    const g = this.game, idx = this.index();
    const dot = token.lastIndexOf('.');
    const id = token.slice(0, dot), state = token.slice(dot + 1);
    if (state === 'raw') {
      const cr = (idx.crates[id] || [])[0];
      if (cr) return cr;
    }
    for (const [key, s] of Object.entries(g.stations)) {
      if ((s.type === 'board' || s.type === 'counter') && s.item && itemToken(s.item) === token) {
        const [x, y] = key.split(',').map(Number); return { x, y };
      }
    }
    if (state === 'dish' || state === 'cooked') {
      for (const [key, s] of Object.entries(g.stations)) {
        if (s.type === 'cook' && s.state === 'done' && s.contents[0] && itemToken(s.contents[0]) === token) {
          const [x, y] = key.split(',').map(Number); return { x, y };
        }
      }
    }
    return null;
  }

  hasCompletableOrder() {
    return this.game.orders.some((o) => RECIPES[o.recipe].needs.every((tok) => this.sourceFor(tok)));
  }

  // Given a plate/stack, the next tile to grab a still-missing component from,
  // for whichever open order the plate is closest to finishing.
  nextPlateAdd(plate) {
    const have = plate.contents.map(itemToken);
    let bestMissing = null, bestLen = Infinity;
    for (const o of this.game.orders) {
      const needs = RECIPES[o.recipe].needs;
      if (!isSubset(have, needs)) continue;
      const missing = multisetDiff(needs, have);
      if (missing.length < bestLen) { bestLen = missing.length; bestMissing = missing; }
    }
    if (!bestMissing) return null;
    for (const tok of bestMissing) {
      const src = this.sourceFor(tok);
      if (src) return src;
    }
    return null;
  }

  // ---- cook-loading (expo): start the cooks orders need ---------------------
  // Cook combos whose output is (transitively) needed by an open order.
  neededCombos() {
    const out = [], seen = new Set();
    const add = (token, depth) => {
      if (depth > 4 || !token || token.includes('#') || seen.has(token)) return;
      const combo = COOK_COMBOS.find((c) => comboOutToken(c.out) === token);
      if (!combo) return;
      seen.add(token);
      out.push(combo);
      for (const inp of combo.inputs) add(inp, depth + 1);
    };
    for (const o of this.game.orders) for (const t of RECIPES[o.recipe].needs) add(t, 0);
    return out;
  }

  dishNeed(dishToken) {
    return this.game.orders.filter((o) => RECIPES[o.recipe].needs.includes(dishToken)).length;
  }

  // How many of a combo's dish are already loose, cooking/done, or filling.
  dishComing(combo) {
    const dishToken = comboOutToken(combo.out);
    let n = 0;
    for (const s of Object.values(this.game.stations)) {
      if (s.type !== 'cook') { if (s.item && itemToken(s.item) === dishToken) n++; continue; }
      if ((s.state === 'cooking' || s.state === 'done') && s.contents[0] && itemToken(s.contents[0]) === dishToken) n++;
      else if (s.state === 'idle' && s.contents.length && s.tool === combo.tool && isSubset(s.contents.map(itemToken), combo.inputs)) n++;
    }
    return n;
  }

  // Where to grab a cook input from: a raw crate, or a loose item on a board/counter.
  cookSourceFor(token) {
    const dot = token.lastIndexOf('.'); const id = token.slice(0, dot), state = token.slice(dot + 1);
    if (state === 'raw') { const cr = (this.index().crates[id] || [])[0]; if (cr) return cr; }
    for (const [key, s] of Object.entries(this.game.stations)) {
      if ((s.type === 'board' || s.type === 'counter') && s.item && itemToken(s.item) === token) {
        const [x, y] = key.split(',').map(Number); return { x, y };
      }
    }
    return null;
  }

  // The next input to grab for an under-supplied, needed cook — the tile to grab it from.
  loadInput() {
    for (const combo of this.neededCombos()) {
      if (this.dishNeed(comboOutToken(combo.out)) <= this.dishComing(combo)) continue;
      let cooker = null, best = -1;
      for (const [key, s] of Object.entries(this.game.stations)) {
        if (s.type !== 'cook' || s.tool !== combo.tool || s.state !== 'idle') continue;
        if (!isSubset(s.contents.map(itemToken), combo.inputs)) continue;
        if (s.contents.length > best) { best = s.contents.length; cooker = key; }
      }
      if (!cooker) continue;
      const remaining = multisetDiff(combo.inputs, this.game.stations[cooker].contents.map(itemToken));
      for (const tok of remaining) {
        const src = this.cookSourceFor(tok);
        if (src) return src;
      }
    }
    return null;
  }

  // An idle cooker that would accept a carried `token` toward a needed combo.
  cookerWanting(token) {
    for (const [key, s] of Object.entries(this.game.stations)) {
      if (s.type !== 'cook' || s.state !== 'idle') continue;
      const have = s.contents.map(itemToken);
      if (this.neededCombos().some((c) => c.tool === s.tool && isSubset(have.concat(token), c.inputs))) {
        const [x, y] = key.split(',').map(Number); return { x, y };
      }
    }
    return null;
  }

  // ---- PREP mode: chop / rescue / wash / clear boards -----------------------
  decidePrep(p) {
    const carry = p.carry;
    if (carry && !carry.kind && carry.state === 'raw' && CHOPPABLE.has(carry.id))
      return this.freeBoard() || this.freeCounter() || null;
    if (carry) return this.freeCounter() || null; // carrying something else → set it down

    const idx = this.index();
    const plates = this.game.plateSupply;
    const dirty = this.dirtyCount();

    // Rescue a finished dish before it burns (staged on a counter next tick).
    if (this.freeCounter()) {
      const done = this.doneCooker();
      if (done) { const [x, y] = done[0].split(',').map(Number); return { x, y }; }
    }
    // Plate stack empty with dishes waiting → wash now.
    if (plates !== null && plates <= 0 && dirty > 0 && idx.sinks[0]) return idx.sinks[0];
    // Prep: chop what the orders need.
    const chop = this.grabForChop();
    if (chop) return chop;
    // Keep plates clean.
    if (plates !== null && dirty > 0 && idx.sinks[0]) return idx.sinks[0];
    // Nothing to chop/wash but boards are full of finished chops → clear one onto
    // a counter so a board frees up (and the prepped food is easy to grab).
    if (this.freeCounter()) {
      const b = this.finishedChopBoard();
      if (b) return b;
    }
    return null;
  }

  // ---- EXPO mode: assemble on plates and serve ------------------------------
  decideExpo(p) {
    const g = this.game, idx = this.index();
    const carry = p.carry;

    if (carry && (carry.kind === 'plate' || carry.kind === 'stack')) {
      const tokens = carry.contents.map(itemToken);
      if (idx.serves[0] && g.orders.some((o) => multisetEqual(tokens, RECIPES[o.recipe].needs)))
        return idx.serves[0];                       // complete → serve
      const add = this.nextPlateAdd(carry);
      if (add) return add;                           // add a still-missing component
      // Stuck: on-track for no order (e.g. its order expired) → trash & restart.
      const onTrack = g.orders.some((o) => isSubset(tokens, RECIPES[o.recipe].needs));
      if (!onTrack && carry.kind === 'plate' && idx.trash[0]) return idx.trash[0];
      return null;                                   // components not ready yet — wait
    }
    // Carrying a loose ingredient: drop it into a cooker that wants it (start a
    // cook), else chop it, else set it down.
    if (carry && !carry.kind) {
      const cooker = this.cookerWanting(itemToken(carry));
      if (cooker) return cooker;
      if (carry.state === 'raw' && CHOPPABLE.has(carry.id)) return this.freeBoard() || this.freeCounter() || null;
      return this.freeCounter() || null;
    }
    if (carry) return this.freeCounter() || null;    // a dish/other → set down; we plate via a plate

    // Hands free.
    if (this.freeCounter()) {                        // rescue a finishing dish
      const done = this.doneCooker();
      if (done) { const [x, y] = done[0].split(',').map(Number); return { x, y }; }
    }
    const load = this.loadInput();                   // start/continue a cook the orders need
    if (load) return load;
    if (idx.plates[0] && this.hasCompletableOrder()) return idx.plates[0]; // grab a plate to build
    const chop = this.grabForChop();                 // else produce a missing component
    if (chop) return chop;
    if (this.freeCounter()) {                         // clear a full board onto a counter
      const b = this.finishedChopBoard();
      if (b) return b;
    }
    if (g.plateSupply !== null && this.dirtyCount() > 0 && idx.sinks[0]) return idx.sinks[0];
    return null;
  }
}

module.exports = { SousChef, chopsForRecipe, chopsForToken };

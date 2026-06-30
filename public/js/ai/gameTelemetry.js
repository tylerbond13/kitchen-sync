// ============================================================================
//  KS gameTelemetry — turn the LIVE kitchen state into Director telemetry.
//  ---------------------------------------------------------------------------
//  The AI Lab's Director was trained on KitchenSim, a generative model that
//  emits an 18-number telemetry vector per moment (see director.js FEATURES).
//  To run that same brain on a *real* game we have to measure those same 18
//  numbers from the real `state` the server streams to the client.
//
//  buildLiveTelemetry(state, renderer, myId, rolling) → a plain object with the
//  18 FEATURES keys (raw, un-normalised). Director.assess() normalises it.
//
//  Everything here is read-only and defensive: any missing field falls back to
//  a benign default so the HUD can never throw inside the game loop.
//
//  Dual export: window.KSTelemetry (browser) + module.exports (Node tests).
// ============================================================================
(function (root, factory) {
  const lib = factory();
  if (typeof module !== 'undefined' && module.exports) module.exports = lib;
  else root.KSTelemetry = lib;
})(typeof self !== 'undefined' ? self : this, function () {
  'use strict';

  // ── token logic (a faithful client port of server/game.js) ───────────────
  // The server matches an order's `needs` against a multiset of "id.state"
  // tokens. We reproduce that exactly so "how much of this recipe is ready"
  // (ingredientsPrepped) lines up with what the engine would actually accept.
  function itemToken(item) {
    if (!item) return null;
    if (item.kind === 'plate' || item.kind === 'stack') return null;
    if (item.kind === 'dish') {
      let t = `${item.id}.dish`;
      if (item.icing) t += `#${item.icing}`;
      if (item.topper) t += `+${item.topper}`;
      return t;
    }
    return `${item.id}.${item.state}`;
  }
  // a plain item is its own contents; plates/stacks carry theirs
  function contentsOf(item) {
    if (!item) return [];
    return item.kind === 'plate' || item.kind === 'stack' ? (item.contents || []) : [item];
  }
  // every non-null token reachable from an item (loose item, or plate contents)
  function tokensOf(item) {
    return contentsOf(item).map(itemToken).filter((t) => t != null);
  }
  // how many of `needs` are covered by the multiset of available `tokens`
  function multisetCovered(needs, tokens) {
    const counts = Object.create(null);
    for (const t of tokens) counts[t] = (counts[t] || 0) + 1;
    let covered = 0;
    for (const n of needs) {
      if (counts[n] > 0) { counts[n]--; covered++; }
    }
    return covered;
  }

  const clamp = (v, a, b) => (v < a ? a : v > b ? b : v);
  const isCookState = (st) => st && st.contents !== undefined; // cook stations carry `contents`/`state`

  // The station tile chars that count as a "next step" work station: crates
  // (fetch, 1-9), cutting board (B), cookers (S/O/V/M) and sink (K). Passive
  // buffers — plain counters '#' and the plate stack 'P' — are excluded so the
  // distance tracks *where the next action happens*, not the nearest ledge.
  // Serving window 'W' is measured separately as distToServe.
  function isWorkStationChar(ch) {
    return ch === 'B' || ch === 'S' || ch === 'O' || ch === 'V' ||
           ch === 'M' || ch === 'K' || (ch >= '1' && ch <= '9');
  }

  // Manhattan distance from (mx,my) to the nearest grid tile matching `pred`.
  // Walls are ignored (advisory HUD); returns `fallback` if no tile matches.
  function nearestTileDist(grid, mx, my, pred, fallback) {
    if (!grid || !grid.length) return fallback;
    let best = Infinity;
    for (let y = 0; y < grid.length; y++) {
      const row = grid[y];
      if (!row) continue;
      for (let x = 0; x < row.length; x++) {
        if (pred(row[x])) {
          const d = Math.abs(x - mx) + Math.abs(y - my);
          if (d < best) best = d;
        }
      }
    }
    return best === Infinity ? fallback : best;
  }

  // Pick the "focus" order — the active order most in danger (lowest ttl/ttlMax).
  function focusOrder(orders) {
    if (!orders || !orders.length) return null;
    let best = orders[0], bestRatio = Infinity;
    for (const o of orders) {
      const ratio = (o.ttlMax > 0 ? o.ttl / o.ttlMax : o.ttl);
      if (ratio < bestRatio) { bestRatio = ratio; best = o; }
    }
    return best;
  }

  // ── the main builder ──────────────────────────────────────────────────────
  function buildLiveTelemetry(state, renderer, myId, rolling) {
    rolling = rolling || {};
    const orders = (state && state.orders) || [];
    const players = (state && state.players) || [];
    const stations = (state && state.stations) || {};
    const me = players.find((p) => p && p.id === myId) || players[0] || null;

    const order = focusOrder(orders);
    const needs = (order && order.needs) || [];
    const recipeComplexity = needs.length || 1;
    const ingredientsNeeded = needs.length || 1;

    // tokens already present anywhere we can reach: my carry + every station item.
    const present = [];
    if (me && me.carry) present.push(...tokensOf(me.carry));
    let dirtyDishes = 0, cleanFromRack = 0, stoveOccupied = 0, boardOccupied = 0, burning = 0;
    for (const k in stations) {
      const s = stations[k];
      if (!s) continue;
      if (s.item) present.push(...tokensOf(s.item));
      if (s.contents) present.push(...s.contents.map(itemToken).filter((t) => t != null));
      if (typeof s.dirty === 'number') dirtyDishes += s.dirty;        // sink
      if (isCookState(s)) {
        if (s.contents && s.contents.length) stoveOccupied = 1;
        if (s.state && s.state !== 'idle') stoveOccupied = 1;
        // a 'done' dish sitting on heat with high progress is about to burn
        if (s.state === 'done' && (s.progress || 0) > 0.5) burning++;
        if (s.state === 'burned') burning++;
      } else if (s.item && s.progress !== undefined) {
        boardOccupied = 1;                                            // board with item
      }
    }

    const ingredientsPrepped = clamp(multisetCovered(needs, present), 0, ingredientsNeeded);
    const stepsRemaining = clamp(ingredientsNeeded - ingredientsPrepped, 0, ingredientsNeeded);

    // distances over the level grid from my (rounded) tile
    const grid = (renderer && renderer.lvl && renderer.lvl.grid) || null;
    const mx = me ? Math.round(me.x) : 0;
    const my = me ? Math.round(me.y) : 0;
    const distToServe = clamp(nearestTileDist(grid, mx, my, (ch) => ch === 'W', 9), 0.5, 9);
    const distToStation = clamp(nearestTileDist(grid, mx, my, isWorkStationChar, 9), 0.5, 9);

    // plate supply: null/undefined = infinite stack → read as "plenty" (low risk)
    const rawPlates = state ? state.plates : null;
    const cleanPlates = (rawPlates === null || rawPlates === undefined) ? 4 : clamp(rawPlates, 0, 4);

    return {
      timeRemaining: order ? clamp(order.ttl, 0, 30) : 30,
      activeOrders: clamp(orders.length, 0, 6),
      ingredientsNeeded: clamp(ingredientsNeeded, 1, 5),
      ingredientsPrepped: clamp(ingredientsPrepped, 0, 5),
      stepsRemaining: clamp(stepsRemaining, 0, 5),
      distToStation,
      distToServe,
      dirtyDishes: clamp(dirtyDishes, 0, 6),
      cleanPlates,
      burning: clamp(burning, 0, 2),
      stoveOccupied,
      boardOccupied,
      avgSpeed: clamp(rolling.avgSpeed != null ? rolling.avgSpeed : 2.5, 0, 3.5),
      mistakes30s: clamp(rolling.mistakes != null ? rolling.mistakes : 0, 0, 5),
      comboStreak: clamp(state ? (state.combo || 0) : 0, 0, 8),
      playerSkill: clamp(rolling.skill != null ? rolling.skill : 0.6, 0, 1),
      recipeComplexity: clamp(recipeComplexity, 1, 5),
      handsFree: me && me.carry ? 0 : 1,
    };
  }

  return {
    buildLiveTelemetry,
    // exposed for tests / reuse
    itemToken, contentsOf, tokensOf, multisetCovered, focusOrder, nearestTileDist,
  };
});

'use strict';
// Phase 1 — the in-game AI Director HUD. Two things must hold headlessly:
//   1. gameTelemetry.buildLiveTelemetry maps a real `state` (the shape app.js's
//      socket.on('state') receives) into finite, sensibly-normalised features.
//   2. The shipped director-weights.json loads and still ranks failures on a
//      fresh KitchenSim hold-out (AUC > 0.8) — the brain the live HUD uses.
const test = require('node:test');
const assert = require('node:assert');
const fs = require('fs');
const path = require('path');
const D = require('../public/js/ai/director.js');
const T = require('../public/js/ai/gameTelemetry.js');

// A realistic Burger-Bay-ish moment, mirroring server/game.js dynamicState().
function synthState() {
  return {
    t: 42, plates: 2, incomingDirty: 1, score: 320, combo: 3, rush: 0,
    phase: 'playing', paused: false,
    players: [
      { id: 'me', name: 'You', x: 3, y: 1, delivered: 2,
        carry: { kind: 'item', id: 'lettuce', state: 'chopped' } },
      { id: 'p2', name: 'Pal', x: 1, y: 1, delivered: 1, carry: null },
    ],
    stations: {
      '1,0': { item: { kind: 'item', id: 'tomato', state: 'chopped' }, progress: 0 }, // board
      '4,0': { contents: [{ kind: 'item', id: 'patty', state: 'cooked' }], state: 'done', progress: 0.85 }, // cook, about to burn
      '0,2': { dirty: 3, progress: 0 }, // sink
    },
    orders: [
      { id: 1, recipe: 'burger', needs: ['bun.raw', 'patty.cooked'], ttl: 18, ttlMax: 30, vip: false },
      { id: 2, recipe: 'salad', needs: ['lettuce.chopped', 'tomato.chopped'], ttl: 5, ttlMax: 25, vip: false },
    ],
    events: [],
  };
}

// Minimal renderer stub: only `.lvl.grid` (+ w/h) is read for distances.
function stubRenderer() {
  const grid = [
    'WB..S',
    '..1..',
    'K....',
  ];
  return { lvl: { grid, w: 5, h: 3 } };
}

test('buildLiveTelemetry maps the live state to the 18 Director features', () => {
  const tel = T.buildLiveTelemetry(synthState(), stubRenderer(), 'me', { avgSpeed: 2.4, mistakes: 1, skill: 0.7 });

  // every feature present + finite
  for (const f of D.FEATURES) {
    assert.ok(Number.isFinite(tel[f.key]), `${f.key} should be finite, got ${tel[f.key]}`);
  }

  // focus order = the most-in-danger one (salad, ttl/ttlMax = 0.2 < 0.6)
  assert.equal(tel.timeRemaining, 5, 'focus order is the salad with 5s left');
  assert.equal(tel.activeOrders, 2);
  assert.equal(tel.ingredientsNeeded, 2);
  // carry (lettuce.chopped) + board (tomato.chopped) cover both salad steps
  assert.equal(tel.ingredientsPrepped, 2);
  assert.equal(tel.stepsRemaining, 0);
  assert.equal(tel.dirtyDishes, 3);
  assert.equal(tel.burning, 1, 'the done patty at 0.85 progress is about to burn');
  assert.equal(tel.stoveOccupied, 1);
  assert.equal(tel.boardOccupied, 1);
  assert.equal(tel.cleanPlates, 2);
  assert.equal(tel.comboStreak, 3);
  assert.equal(tel.handsFree, 0, 'I am carrying lettuce');
  // distances over the grid from my tile (3,1): nearest W at (0,0)=4, nearest crate at (2,1)=1
  assert.equal(tel.distToServe, 4);
  assert.equal(tel.distToStation, 1);
});

test('buildLiveTelemetry features normalise into a sane range', () => {
  const tel = T.buildLiveTelemetry(synthState(), stubRenderer(), 'me', {});
  const f = D.buildFeatures(tel);
  assert.equal(f.length, D.NUM_FEATURES);
  for (let i = 0; i < f.length; i++) {
    assert.ok(Number.isFinite(f[i]) && f[i] >= 0 && f[i] <= 1.5,
      `feature ${D.FEATURES[i].key}=${f[i]} should be a sane normalised value`);
  }
});

test('buildLiveTelemetry is defensive: empty/garbage state never throws', () => {
  assert.doesNotThrow(() => T.buildLiveTelemetry({}, {}, 'nobody', undefined));
  assert.doesNotThrow(() => T.buildLiveTelemetry({ orders: [], players: [], stations: {} }, null, 'x'));
  const tel = T.buildLiveTelemetry({ orders: [], players: [], stations: {}, plates: null }, null, 'x');
  for (const ff of D.FEATURES) assert.ok(Number.isFinite(tel[ff.key]), `${ff.key} finite on empty state`);
  assert.equal(tel.cleanPlates, 4, 'null plates (infinite stack) reads as plenty');
  assert.equal(tel.handsFree, 1, 'no player → hands considered free');
});

test('focusOrder picks the order with the lowest ttl ratio', () => {
  const o = T.focusOrder([
    { id: 1, ttl: 20, ttlMax: 30 }, // .67
    { id: 2, ttl: 4, ttlMax: 25 },  // .16  ← most in danger
    { id: 3, ttl: 10, ttlMax: 12 }, // .83
  ]);
  assert.equal(o.id, 2);
});

test('shipped director-weights.json loads and ranks failures (hold-out AUC > 0.8)', () => {
  const file = path.join(__dirname, '..', 'public', 'assets', 'ai', 'director-weights.json');
  const w = JSON.parse(fs.readFileSync(file, 'utf8'));

  // schema sanity: weights were trained on the current feature/action vocab
  assert.deepEqual(w.meta.featureKeys, D.FEATURES.map((f) => f.key), 'feature schema drift');
  assert.deepEqual(w.meta.actions, D.ACTIONS, 'action schema drift');

  const fm = new D.FailureModel(); fm.loadJSON(w.fm);
  const am = new D.ActionModel(); am.loadJSON(w.am);

  const holdout = new D.KitchenSim(2024).dataset(2000); // unseen seed
  const scores = holdout.X.map((x) => fm.predict(x));
  const auc = D.metrics.auc(scores, holdout.yFail);
  assert.ok(auc > 0.8, `shipped FailureModel hold-out AUC should be > 0.8, got ${auc.toFixed(3)}`);

  // the ActionModel produces a valid action for every sample
  for (let i = 0; i < 50; i++) {
    const best = am.best(holdout.X[i]).action;
    assert.ok(best >= 0 && best < D.ACTIONS.length, 'action index in range');
  }
});

test('Director.assess on live telemetry returns a usable HUD payload', () => {
  const file = path.join(__dirname, '..', 'public', 'assets', 'ai', 'director-weights.json');
  const w = JSON.parse(fs.readFileSync(file, 'utf8'));
  const fm = new D.FailureModel(); fm.loadJSON(w.fm);
  const am = new D.ActionModel(); am.loadJSON(w.am);
  const dir = new D.Director(fm, am);

  const tel = T.buildLiveTelemetry(synthState(), stubRenderer(), 'me', { avgSpeed: 2.4, mistakes: 1, skill: 0.7 });
  const a = dir.assess(tel);
  assert.ok(a.risk >= 0 && a.risk <= 1);
  assert.ok(a.riskPct >= 0 && a.riskPct <= 100);
  assert.ok(D.ACTIONS.includes(a.nextBestAction));
  assert.ok(typeof a.nextBestActionLabel === 'string' && a.nextBestActionLabel.length);
  assert.ok(typeof a.hint === 'string' && a.hint.length);
  assert.ok(['ease', 'hold', 'press'].includes(a.difficulty.mode));
});

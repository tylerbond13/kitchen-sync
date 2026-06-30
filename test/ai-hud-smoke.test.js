'use strict';
// Headless boot test for the in-game Director HUD glue (director-hud.js). We
// can't run a real browser, so we evaluate the page scripts in a vm sandbox
// with DOM/canvas/fetch/localStorage stubs, enable the HUD, feed it the REAL
// shipped weights, and drive update() across several ticks — asserting nothing
// throws. This is the safety net behind the "can never break the game" promise.
const test = require('node:test');
const assert = require('node:assert');
const fs = require('fs');
const path = require('path');
const vm = require('vm');

function makeCtx() {
  const noop = () => {};
  return {
    setTransform: noop, clearRect: noop, fillRect: noop, fillText: noop,
    beginPath: noop, arc: noop, fill: noop, stroke: noop, moveTo: noop, lineTo: noop,
    arcTo: noop, closePath: noop, save: noop, restore: noop, translate: noop, rotate: noop,
    setLineDash: noop, measureText: () => ({ width: 10 }),
    fillStyle: '#000', strokeStyle: '#000', lineWidth: 1, font: '', textAlign: '', textBaseline: '', lineCap: '',
  };
}
function makeEl(id) {
  return {
    id, style: {}, dataset: {}, textContent: '', innerHTML: '', hidden: true,
    width: 86, height: 86, clientWidth: 320, clientHeight: 220,
    classList: { toggle: () => {}, add: () => {}, remove: () => {}, contains: () => false },
    addEventListener: () => {}, removeEventListener: () => {},
    getContext: () => makeCtx(),
  };
}

function synthState(events) {
  return {
    t: 42, plates: 2, incomingDirty: 1, score: 320, combo: 3, rush: 0,
    phase: 'playing', paused: false,
    players: [{ id: 'me', name: 'You', x: 3, y: 1, delivered: 2, carry: { kind: 'item', id: 'lettuce', state: 'chopped' } }],
    stations: {
      '1,0': { item: { kind: 'item', id: 'tomato', state: 'chopped' }, progress: 0 },
      '4,0': { contents: [{ kind: 'item', id: 'patty', state: 'cooked' }], state: 'done', progress: 0.85 },
      '0,2': { dirty: 3, progress: 0 },
    },
    orders: [{ id: 2, recipe: 'salad', needs: ['lettuce.chopped', 'tomato.chopped'], ttl: 5, ttlMax: 25 }],
    events: events || [],
  };
}
const stubRenderer = () => ({ lvl: { grid: ['WB..S', '..1..', 'K....'], w: 5, h: 3 } });

test('Director HUD boots, loads shipped weights and renders across ticks without throwing', async () => {
  const els = new Map();
  const getEl = (id) => { if (!els.has(id)) els.set(id, makeEl(id)); return els.get(id); };
  const weights = fs.readFileSync(path.join(__dirname, '..', 'public', 'assets', 'ai', 'director-weights.json'), 'utf8');

  let clock = 0;
  const sandbox = {
    console, Math, Date, JSON, Float64Array, Array, Object,
    parseFloat, parseInt, isNaN, isFinite,
    setTimeout: (fn) => { fn(); return 0; }, clearTimeout: () => {},
    performance: { now: () => clock },
    localStorage: { _d: {}, getItem(k) { return this._d[k] || null; }, setItem(k, v) { this._d[k] = v; }, removeItem(k) { delete this._d[k]; } },
    fetch: () => Promise.resolve({ ok: true, status: 200, json: () => Promise.resolve(JSON.parse(weights)) }),
  };
  sandbox.self = sandbox; sandbox.window = sandbox; sandbox.globalThis = sandbox;
  sandbox.window.devicePixelRatio = 2;
  sandbox.document = {
    readyState: 'complete',
    getElementById: getEl,
    createElement: () => makeEl('dyn'),
    addEventListener: () => {},
  };

  vm.createContext(sandbox);
  for (const f of ['nn', 'director', 'gameTelemetry', 'director-hud']) {
    const code = fs.readFileSync(path.join(__dirname, '..', 'public', 'js', 'ai', f + '.js'), 'utf8');
    vm.runInContext(code, sandbox, { filename: f + '.js' });
  }

  assert.ok(sandbox.KSNN && sandbox.KSDirector && sandbox.KSTelemetry, 'AI modules attached to window');
  const HUD = sandbox.DirectorHUD;
  assert.ok(HUD && typeof HUD.update === 'function' && typeof HUD.toggle === 'function', 'DirectorHUD wired');
  assert.equal(HUD.enabled, false, 'off by default');

  // update() while disabled must be a no-op (this is the guarded path app.js hits)
  assert.doesNotThrow(() => HUD.update(synthState(), stubRenderer(), 'me', {}));

  // enable → triggers the weights fetch; flush microtasks so it resolves
  HUD.toggle();
  assert.equal(HUD.enabled, true);
  for (let i = 0; i < 5; i++) await new Promise((r) => setImmediate(r));

  // drive several ticks with a clock that advances past the render throttle,
  // including a 'burn' event (exercises mistake counting + skill decay)
  for (let i = 0; i < 12; i++) {
    clock += 300;
    const evs = i === 3 ? [{ type: 'burn', x: 4, y: 0 }] : i === 6 ? [{ type: 'expire', recipe: 'salad' }] : [];
    assert.doesNotThrow(() => HUD.update(synthState(evs), stubRenderer(), 'me', {}), `tick ${i} threw`);
  }

  // a fresh round (clock jumps, time resets) and an empty/garbage tick
  assert.doesNotThrow(() => HUD.update({ players: [], orders: [], stations: {}, t: 999, events: [] }, null, 'me', {}));
  assert.doesNotThrow(() => HUD.update({}, {}, 'me', undefined));

  // toggling back off persists and stops rendering
  HUD.toggle();
  assert.equal(HUD.enabled, false);
  assert.equal(sandbox.localStorage.getItem('ks-director-hud'), '0');
});

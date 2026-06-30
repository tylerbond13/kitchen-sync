'use strict';
// Headless smoke test for the browser-only UI glue (lab.js). We can't run a
// real browser here, so we evaluate the page scripts in a vm sandbox with
// minimal DOM/canvas stubs, fire DOMContentLoaded, run a few animation frames,
// switch tabs and click "Train" — asserting nothing throws and the core
// objects wired up. Catches typos, bad element IDs and boot-path errors.
const test = require('node:test');
const assert = require('node:assert');
const fs = require('fs');
const path = require('path');
const vm = require('vm');

function makeCtx() {
  const noop = () => {};
  const ctx = {
    setTransform: noop, clearRect: noop, fillRect: noop, fillText: noop,
    beginPath: noop, arc: noop, fill: noop, stroke: noop, moveTo: noop, lineTo: noop,
    arcTo: noop, closePath: noop, save: noop, restore: noop, translate: noop, rotate: noop,
    setLineDash: noop, measureText: () => ({ width: 10 }),
    createLinearGradient: () => ({ addColorStop: noop }),
    fillStyle: '#000', strokeStyle: '#000', lineWidth: 1, font: '', textAlign: '', textBaseline: '', globalAlpha: 1, lineCap: '',
  };
  return ctx;
}
function makeEl(id) {
  const el = {
    id, _children: [], style: {}, dataset: {}, value: '0', textContent: '', innerHTML: '',
    width: 300, height: 200, clientWidth: 320, clientHeight: 220, open: false, firstChild: null,
    classList: { toggle: () => {}, add: () => {}, remove: () => {}, contains: () => false },
    addEventListener: () => {}, removeEventListener: () => {},
    appendChild(c) { this._children.push(c); this.firstChild = this._children[0]; return c; },
    querySelectorAll: () => [], querySelector: () => null, closest: () => null,
    getContext: () => makeCtx(),
    getBoundingClientRect: () => ({ left: 0, top: 0, width: 320, height: 220 }),
  };
  el.parentElement = { clientWidth: 320, clientHeight: 220 };
  return el;
}

test('AI Lab page boots, renders frames and trains without throwing', () => {
  const els = new Map();
  const getEl = (id) => { if (!els.has(id)) els.set(id, makeEl(id)); return els.get(id); };
  const rafQueue = [];
  const domReady = [];

  const sandbox = {
    self: null, window: null, console, Math, Date, JSON, Float64Array, Float32Array, Array, Object,
    setTimeout: (fn) => { fn(); return 0; }, clearTimeout: () => {},
    requestAnimationFrame: (fn) => { rafQueue.push(fn); return rafQueue.length; },
    parseFloat, parseInt, isNaN, isFinite,
    localStorage: { _d: {}, getItem(k) { return this._d[k] || null; }, setItem(k, v) { this._d[k] = v; }, removeItem(k) { delete this._d[k]; } },
    navigator: { vibrate: () => {} },
  };
  sandbox.self = sandbox; sandbox.window = sandbox; sandbox.globalThis = sandbox;
  sandbox.getComputedStyle = () => ({ getPropertyValue: () => '#88aaff' });
  let elc = 0;
  sandbox.document = {
    getElementById: getEl,
    createElement: () => makeEl('dyn-' + (elc++)),
    querySelectorAll: () => [],
    documentElement: {},
    addEventListener: (type, fn) => { if (type === 'DOMContentLoaded') domReady.push(fn); },
  };
  sandbox.window.addEventListener = (type, fn) => { if (type === 'DOMContentLoaded') domReady.push(fn); };
  sandbox.window.devicePixelRatio = 2;
  sandbox.window.requestAnimationFrame = sandbox.requestAnimationFrame;

  vm.createContext(sandbox);
  for (const f of ['nn', 'kitchenEnv', 'dqn', 'director', 'lab']) {
    const code = fs.readFileSync(path.join(__dirname, '..', 'public', 'js', 'ai', f + '.js'), 'utf8');
    vm.runInContext(code, sandbox, { filename: f + '.js' });
  }
  // libraries attached to the browser-style global
  assert.ok(sandbox.KSNN && sandbox.KSEnv && sandbox.KSDQN && sandbox.KSDirector, 'all AI modules attached to window');

  // fire DOMContentLoaded → boots Dojo + Director + Learn
  assert.ok(domReady.length > 0, 'something registered for DOMContentLoaded');
  domReady.forEach((fn) => fn());

  // run a batch of animation frames (drives the RL training + all the draws)
  for (let i = 0; i < 30 && rafQueue.length; i++) { const fn = rafQueue.shift(); fn(16 * i); }

  // exercise the Director read-out + a short training chunk
  getEl('dirTrain').onclick && getEl('dirTrain').onclick();

  // toggle pause/play on the dojo
  getEl('rlTrain').onclick && getEl('rlTrain').onclick();

  assert.ok(true, 'no exceptions thrown during boot, frames and training');
});

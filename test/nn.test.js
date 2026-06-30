'use strict';
const test = require('node:test');
const assert = require('node:assert');
const { MLP } = require('../public/js/ai/nn.js');

// MSE loss helpers (0.5·Σ(out-target)²) so dL/dOut = out - target.
function mse(out, target) { let s = 0; for (let i = 0; i < out.length; i++) { const d = out[i] - target[i]; s += 0.5 * d * d; } return s; }
function dMse(out, target) { const d = new Float64Array(out.length); for (let i = 0; i < out.length; i++) d[i] = out[i] - target[i]; return d; }

test('backprop matches a numerical gradient (the maths is correct)', () => {
  const net = new MLP([4, 6, 5, 3], ['relu', 'tanh', 'linear'], { seed: 7 });
  const x = Float64Array.from([0.3, -0.7, 0.5, 0.1]);
  const target = Float64Array.from([0.2, -0.4, 0.9]);

  // analytical gradient for one sample
  net.zeroGrads();
  const out = net.forward(x).slice();
  net.backward(dMse(out, target));

  const h = 1e-5;
  let maxRelErr = 0;
  for (let li = 0; li < net.layers.length; li++) {
    const L = net.layers[li];
    for (let wi = 0; wi < L.W.length; wi += Math.max(1, (L.W.length / 13) | 0)) {
      const orig = L.W[wi];
      L.W[wi] = orig + h; const lp = mse(net.forward(x), target);
      L.W[wi] = orig - h; const lm = mse(net.forward(x), target);
      L.W[wi] = orig;
      const numerical = (lp - lm) / (2 * h);
      const analytical = L.gW[wi];
      const denom = Math.max(1e-6, Math.abs(numerical) + Math.abs(analytical));
      maxRelErr = Math.max(maxRelErr, Math.abs(numerical - analytical) / denom);
    }
  }
  assert.ok(maxRelErr < 1e-4, `gradient check failed, max rel err ${maxRelErr}`);
});

test('the network actually learns — it solves XOR from scratch', () => {
  const net = new MLP([2, 10, 10, 1], ['tanh', 'tanh', 'linear'], { seed: 3 });
  const data = [
    { x: [0, 0], y: [0] }, { x: [0, 1], y: [1] },
    { x: [1, 0], y: [1] }, { x: [1, 1], y: [0] },
  ];
  for (let epoch = 0; epoch < 4000; epoch++) {
    net.zeroGrads();
    for (const d of data) {
      const out = net.forward(Float64Array.from(d.x));
      net.backward(dMse(out, Float64Array.from(d.y)));
    }
    net.step(0.02, data.length);
  }
  for (const d of data) {
    const p = net.forward(Float64Array.from(d.x))[0];
    assert.ok(Math.abs(p - d.y[0]) < 0.15, `XOR ${d.x} → ${p.toFixed(3)} (want ${d.y[0]})`);
  }
});

test('a trained brain round-trips through JSON (save/load)', () => {
  const net = new MLP([3, 5, 2], ['relu', 'linear'], { seed: 9 });
  const x = Float64Array.from([0.1, 0.2, 0.3]);
  const before = net.forward(x).slice();
  const clone = MLP.fromJSON(JSON.parse(JSON.stringify(net.toJSON())));
  const after = clone.forward(x);
  for (let i = 0; i < before.length; i++) assert.ok(Math.abs(before[i] - after[i]) < 1e-12);
});

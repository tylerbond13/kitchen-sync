// ============================================================================
//  KS-NN — a tiny neural-network library, written from scratch (no deps).
//  ---------------------------------------------------------------------------
//  This is the "brain" behind the AI Lab. It's a plain multi-layer perceptron
//  (a stack of fully-connected layers) with:
//    • forward pass            — turn an input vector into outputs
//    • backpropagation         — work out how every weight should change
//    • the Adam optimizer      — actually nudge the weights to reduce error
//
//  Everything is hand-rolled so it can be read top-to-bottom and unit-tested
//  with a numerical gradient check (see test/nn.test.js). The same file runs
//  in the browser (window.KSNN) and in Node (module.exports) so the maths is
//  verified in CI before it ever ships.
// ============================================================================
(function (root, factory) {
  const lib = factory();
  if (typeof module !== 'undefined' && module.exports) module.exports = lib;
  else root.KSNN = lib;
})(typeof self !== 'undefined' ? self : this, function () {
  'use strict';

  // ---- deterministic-ish RNG so training runs are reproducible if desired ---
  function makeRng(seed) {
    let s = seed >>> 0 || 1;
    return () => { // mulberry32
      s |= 0; s = (s + 0x6D2B79F5) | 0;
      let t = Math.imul(s ^ (s >>> 15), 1 | s);
      t = (t + Math.imul(t ^ (t >>> 7), 61 | t)) ^ t;
      return ((t ^ (t >>> 14)) >>> 0) / 4294967296;
    };
  }
  // standard normal via Box–Muller
  function randn(rng) {
    let u = 0, v = 0;
    while (u === 0) u = rng();
    while (v === 0) v = rng();
    return Math.sqrt(-2 * Math.log(u)) * Math.cos(2 * Math.PI * v);
  }

  // ---- activations + their derivatives (derivative expressed w.r.t. pre-act z)
  const ACT = {
    relu: { f: (z) => (z > 0 ? z : 0), df: (z) => (z > 0 ? 1 : 0) },
    tanh: { f: (z) => Math.tanh(z), df: (z) => { const t = Math.tanh(z); return 1 - t * t; } },
    linear: { f: (z) => z, df: () => 1 },
  };

  // ---- a single fully-connected layer: a = act(W·x + b) --------------------
  class Dense {
    constructor(nIn, nOut, act, rng) {
      this.nIn = nIn; this.nOut = nOut;
      this.act = ACT[act] ? act : 'linear';
      // He/Xavier-ish init keeps signal variance sane through the depth.
      const scale = this.act === 'relu' ? Math.sqrt(2 / nIn) : Math.sqrt(1 / nIn);
      this.W = new Float64Array(nOut * nIn);
      this.b = new Float64Array(nOut);
      for (let i = 0; i < this.W.length; i++) this.W[i] = randn(rng) * scale;
      // gradient accumulators (summed over a minibatch)
      this.gW = new Float64Array(nOut * nIn);
      this.gb = new Float64Array(nOut);
      // Adam moments
      this.mW = new Float64Array(nOut * nIn); this.vW = new Float64Array(nOut * nIn);
      this.mb = new Float64Array(nOut); this.vb = new Float64Array(nOut);
      // caches for backprop
      this.x = null; this.z = new Float64Array(nOut); this.a = new Float64Array(nOut);
    }

    forward(x) {
      this.x = x;
      const { W, b, nIn, nOut, z, a } = this;
      const fn = ACT[this.act].f;
      for (let o = 0; o < nOut; o++) {
        let s = b[o];
        const base = o * nIn;
        for (let i = 0; i < nIn; i++) s += W[base + i] * x[i];
        z[o] = s; a[o] = fn(s);
      }
      return a;
    }

    // dA = dLoss/dActivation (length nOut). Returns dLoss/dInput (length nIn),
    // and accumulates weight/bias gradients for the current minibatch.
    backward(dA) {
      const { W, gW, gb, nIn, nOut, x, z } = this;
      const dfn = ACT[this.act].df;
      const dX = new Float64Array(nIn);
      for (let o = 0; o < nOut; o++) {
        const dZ = dA[o] * dfn(z[o]);   // chain through the activation
        gb[o] += dZ;
        const base = o * nIn;
        for (let i = 0; i < nIn; i++) {
          gW[base + i] += dZ * x[i];     // dL/dW = dZ · input
          dX[i] += W[base + i] * dZ;      // dL/dInput = Wᵀ · dZ
        }
      }
      return dX;
    }

    // Adam update using the accumulated gradients (averaged over batchSize).
    applyGrads(lr, batchSize, t, opt) {
      const { W, b, gW, gb, mW, vW, mb, vb } = this;
      const b1 = opt.b1, b2 = opt.b2, eps = opt.eps;
      const bc1 = 1 - Math.pow(b1, t), bc2 = 1 - Math.pow(b2, t);
      for (let i = 0; i < W.length; i++) {
        let g = gW[i] / batchSize;
        if (opt.clip) g = Math.max(-opt.clip, Math.min(opt.clip, g));
        mW[i] = b1 * mW[i] + (1 - b1) * g;
        vW[i] = b2 * vW[i] + (1 - b2) * g * g;
        W[i] -= lr * (mW[i] / bc1) / (Math.sqrt(vW[i] / bc2) + eps);
        gW[i] = 0;
      }
      for (let o = 0; o < b.length; o++) {
        let g = gb[o] / batchSize;
        if (opt.clip) g = Math.max(-opt.clip, Math.min(opt.clip, g));
        mb[o] = b1 * mb[o] + (1 - b1) * g;
        vb[o] = b2 * vb[o] + (1 - b2) * g * g;
        b[o] -= lr * (mb[o] / bc1) / (Math.sqrt(vb[o] / bc2) + eps);
        gb[o] = 0;
      }
    }

    zeroGrads() { this.gW.fill(0); this.gb.fill(0); }
  }

  // ---- the network: a stack of Dense layers --------------------------------
  class MLP {
    // sizes e.g. [16, 64, 64, 5]; acts e.g. ['relu','relu','linear']
    constructor(sizes, acts, opts = {}) {
      this.rng = makeRng(opts.seed || 12345);
      this.layers = [];
      for (let i = 0; i < sizes.length - 1; i++) {
        this.layers.push(new Dense(sizes[i], sizes[i + 1], acts[i] || 'linear', this.rng));
      }
      this.sizes = sizes.slice();
      this.acts = acts.slice();
      this.t = 0; // Adam timestep
      this.opt = { b1: 0.9, b2: 0.999, eps: 1e-8, clip: opts.clip || 0 };
    }

    forward(x) {
      let a = x;
      for (const L of this.layers) a = L.forward(a);
      return a;
    }

    // Record the layer activations for visualisation (the "brain lighting up").
    activations() {
      const acts = [Array.from(this.layers[0].x || [])];
      for (const L of this.layers) acts.push(Array.from(L.a));
      return acts;
    }

    zeroGrads() { for (const L of this.layers) L.zeroGrads(); }

    // Backprop a single sample given dLoss/dOutput at the final layer.
    backward(dOut) {
      let d = dOut;
      for (let i = this.layers.length - 1; i >= 0; i--) d = this.layers[i].backward(d);
      return d;
    }

    step(lr, batchSize) {
      this.t += 1;
      for (const L of this.layers) L.applyGrads(lr, batchSize, this.t, this.opt);
    }

    // (de)serialise for localStorage so a trained brain survives a refresh.
    toJSON() {
      return {
        sizes: this.sizes, acts: this.acts, t: this.t,
        layers: this.layers.map((L) => ({ W: Array.from(L.W), b: Array.from(L.b) })),
      };
    }
    static fromJSON(o) {
      const net = new MLP(o.sizes, o.acts);
      net.t = o.t || 0;
      o.layers.forEach((ld, i) => {
        net.layers[i].W.set(ld.W); net.layers[i].b.set(ld.b);
      });
      return net;
    }
  }

  return { MLP, Dense, ACT, makeRng, randn };
});

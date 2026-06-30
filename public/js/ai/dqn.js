// ============================================================================
//  DQN — a Deep Q-Network agent (reinforcement learning), from scratch.
//  ---------------------------------------------------------------------------
//  The chef has no idea what to do. It tries actions, gets rewards, and slowly
//  learns a "Q-value" for every (situation, action): how much total future
//  reward to expect if it takes that action now. The neural network (KSNN) is
//  the thing that estimates those Q-values. Three classic tricks make it work:
//
//    • ε-greedy exploration — early on it acts randomly (ε≈1) to discover the
//      kitchen; ε decays so it increasingly trusts what it has learned.
//    • experience replay    — it remembers past transitions and re-learns from
//      random minibatches, which breaks correlations and stabilises training.
//    • a target network     — a slow-moving copy used to compute learning
//      targets, so the net isn't chasing its own constantly-moving tail.
//
//  Loss is the Huber loss on the Bellman error  q(s,a) − [r + γ·max q_target(s')].
//  Dual export: window.KSDQN in the browser, module.exports in Node tests.
// ============================================================================
(function (root, factory) {
  const lib = factory(typeof require === 'function' ? require('./nn.js') : root.KSNN);
  if (typeof module !== 'undefined' && module.exports) module.exports = lib;
  else root.KSDQN = lib;
})(typeof self !== 'undefined' ? self : this, function (NN) {
  'use strict';
  const { MLP } = NN;

  class ReplayBuffer {
    constructor(cap) { this.cap = cap; this.buf = []; this.i = 0; }
    push(t) { if (this.buf.length < this.cap) this.buf.push(t); else this.buf[this.i] = t; this.i = (this.i + 1) % this.cap; }
    get size() { return this.buf.length; }
    sample(n, rng) {
      const out = [];
      for (let k = 0; k < n; k++) out.push(this.buf[(rng() * this.buf.length) | 0]);
      return out;
    }
  }

  class DQNAgent {
    constructor(obsSize, numActions, opts = {}) {
      this.obsSize = obsSize; this.numActions = numActions;
      const hidden = opts.hidden || [64, 64];
      const sizes = [obsSize, ...hidden, numActions];
      const acts = hidden.map(() => 'relu').concat(['linear']);
      this.policy = new MLP(sizes, acts, { seed: opts.seed || 1, clip: 1 });
      this.target = MLP.fromJSON(this.policy.toJSON());
      this.buffer = new ReplayBuffer(opts.bufferCap || 8000);
      this.gamma = opts.gamma ?? 0.97;
      this.lr = opts.lr ?? 1e-3;
      this.batch = opts.batch || 32;
      this.epsStart = opts.epsStart ?? 1.0;
      this.epsEnd = opts.epsEnd ?? 0.05;
      this.epsDecaySteps = opts.epsDecaySteps || 6000;
      this.targetSync = opts.targetSync || 250;
      this.warmup = opts.warmup || 200;
      this.steps = 0;
      this.trainCount = 0;
      this.lastLoss = 0;
      this.rng = NN.makeRng(opts.seed || 1);
      this.sizes = sizes; this.acts = acts;
    }

    get epsilon() {
      const f = Math.min(1, this.steps / this.epsDecaySteps);
      return this.epsStart + (this.epsEnd - this.epsStart) * f;
    }

    qValues(state) { return Array.from(this.policy.forward(state)); }

    act(state, greedy = false) {
      const eps = greedy ? 0 : this.epsilon;
      if (this.rng() < eps) {
        const a = (this.rng() * this.numActions) | 0;
        return { action: a, q: null, explored: true };
      }
      const q = this.policy.forward(state);
      let best = 0; for (let i = 1; i < q.length; i++) if (q[i] > q[best]) best = i;
      return { action: best, q: Array.from(q), explored: false };
    }

    remember(s, a, r, s2, done) { this.buffer.push({ s, a, r, s2, done }); this.steps += 1; }

    // One gradient update on a random minibatch from replay.
    train() {
      if (this.buffer.size < Math.max(this.warmup, this.batch)) return null;
      const batch = this.buffer.sample(this.batch, this.rng);
      this.policy.zeroGrads();
      let lossSum = 0;
      for (const tr of batch) {
        const q = this.policy.forward(tr.s);          // sets policy caches for backprop
        let target = tr.r;
        if (!tr.done) {
          const q2 = this.target.forward(tr.s2);       // target net (separate caches)
          let m = q2[0]; for (let i = 1; i < q2.length; i++) if (q2[i] > m) m = q2[i];
          target += this.gamma * m;
        }
        let err = q[tr.a] - target;                    // Bellman error on the taken action
        lossSum += (Math.abs(err) <= 1) ? 0.5 * err * err : Math.abs(err) - 0.5; // Huber
        const dOut = new Float64Array(this.numActions);
        dOut[tr.a] = Math.max(-1, Math.min(1, err));   // Huber gradient (clipped)
        this.policy.backward(dOut);
      }
      this.policy.step(this.lr, this.batch);
      this.trainCount += 1;
      this.lastLoss = lossSum / batch.length;
      if (this.trainCount % this.targetSync === 0) this.syncTarget();
      return this.lastLoss;
    }

    syncTarget() { this.target = MLP.fromJSON(this.policy.toJSON()); }

    toJSON() { return { policy: this.policy.toJSON(), steps: this.steps, trainCount: this.trainCount }; }
    loadJSON(o) {
      this.policy = MLP.fromJSON(o.policy); this.syncTarget();
      this.steps = o.steps || 0; this.trainCount = o.trainCount || 0;
    }
  }

  return { DQNAgent, ReplayBuffer };
});

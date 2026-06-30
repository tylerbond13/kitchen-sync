// ============================================================================
//  KS Director — the AI Kitchen Director (supervised neural networks).
//  ---------------------------------------------------------------------------
//  Two neural networks read the live kitchen as a vector of telemetry numbers
//  ("variables for everything happening") and output:
//
//    1. FAILURE RISK   — FailureModel: features → sigmoid → P(order fails)  0..1
//    2. NEXT BEST MOVE — ActionModel:  features → softmax → action probabilities
//
//  A thin rule layer (Director) turns those into the things your design doc
//  asked for: a failure %, the recommended next action, a dynamic-difficulty
//  decision (ease / hold / press), a contextual hint, and an AI sous-chef task.
//
//  Training data comes from KitchenSim — a generative model of a kitchen with a
//  believable "physics" of time, distance, skill and congestion. The networks
//  learn that physics from examples (no hand-coded thresholds), exactly like a
//  real telemetry pipeline would, but self-contained so it trains in-browser.
//
//  Dual export: window.KSDirector (browser) + module.exports (Node tests).
// ============================================================================
(function (root, factory) {
  const lib = factory(typeof require === 'function' ? require('./nn.js') : root.KSNN);
  if (typeof module !== 'undefined' && module.exports) module.exports = lib;
  else root.KSDirector = lib;
})(typeof self !== 'undefined' ? self : this, function (NN) {
  'use strict';
  const { MLP, makeRng, randn } = NN;

  // ── The telemetry schema: every variable the Director watches ─────────────
  // name, a human label, and the value we divide by to land roughly in [0,1].
  const FEATURES = [
    { key: 'timeRemaining',     label: 'Time left on order (s)', norm: 30 },
    { key: 'activeOrders',      label: 'Active orders',          norm: 6 },
    { key: 'ingredientsNeeded', label: 'Steps in recipe',        norm: 5 },
    { key: 'ingredientsPrepped',label: 'Steps already done',     norm: 5 },
    { key: 'stepsRemaining',    label: 'Steps still to do',      norm: 5 },
    { key: 'distToStation',     label: 'Dist → next station',    norm: 9 },
    { key: 'distToServe',       label: 'Dist → serving window',  norm: 9 },
    { key: 'dirtyDishes',       label: 'Dirty dishes',           norm: 6 },
    { key: 'cleanPlates',       label: 'Clean plates',           norm: 4 },
    { key: 'burning',           label: 'Items about to burn',    norm: 2 },
    { key: 'stoveOccupied',     label: 'Stove busy?',            norm: 1 },
    { key: 'boardOccupied',     label: 'Board busy?',            norm: 1 },
    { key: 'avgSpeed',          label: 'Avg speed (tiles/s)',    norm: 3.5 },
    { key: 'mistakes30s',       label: 'Mistakes (30s)',         norm: 5 },
    { key: 'comboStreak',       label: 'Combo streak',           norm: 8 },
    { key: 'playerSkill',       label: 'Player skill',           norm: 1 },
    { key: 'recipeComplexity',  label: 'Recipe complexity',      norm: 5 },
    { key: 'handsFree',         label: 'Hands free?',            norm: 1 },
  ];
  const FEATURE_INDEX = Object.fromEntries(FEATURES.map((f, i) => [f.key, i]));
  const NUM_FEATURES = FEATURES.length;

  // The AI sous-chef / next-best-action vocabulary.
  const ACTIONS = ['fetch', 'chop', 'cook', 'serve', 'wash', 'tend_stove', 'idle'];
  const ACTION_LABEL = {
    fetch: 'Grab an ingredient', chop: 'Chop / prep', cook: 'Start cooking',
    serve: 'Serve the dish', wash: 'Wash dishes', tend_stove: 'Tend the stove (burning!)', idle: 'Hold position',
  };
  const NUM_ACTIONS = ACTIONS.length;

  // Turn a raw telemetry object into the normalised feature vector the nets eat.
  function buildFeatures(t) {
    const v = new Float64Array(NUM_FEATURES);
    for (let i = 0; i < FEATURES.length; i++) {
      const f = FEATURES[i];
      let x = t[f.key]; if (x == null) x = 0;
      v[i] = x / f.norm;
    }
    return v;
  }

  // ── KitchenSim — generates realistic (telemetry, failed?, bestAction) data ─
  class KitchenSim {
    constructor(seed = 42) { this.rng = makeRng(seed); }
    _u(a, b) { return a + (b - a) * this.rng(); }
    _i(a, b) { return a + Math.floor((b - a + 1) * this.rng()); }

    sample() {
      const rng = this.rng;
      const playerSkill = this._u(0.4, 1.0);
      const recipeComplexity = this._i(1, 5);
      const ingredientsNeeded = recipeComplexity;
      const ingredientsPrepped = this._i(0, ingredientsNeeded);
      const stepsRemaining = ingredientsNeeded - ingredientsPrepped;
      const activeOrders = this._i(1, 6);
      const dirtyDishes = this._i(0, 6);
      const cleanPlates = this._i(0, 4);
      const burning = this._i(0, 2);
      const stoveOccupied = rng() < 0.6 ? 1 : 0;
      const boardOccupied = rng() < 0.5 ? 1 : 0;
      const distToStation = this._u(0.5, 8);
      const distToServe = this._u(0.5, 9);
      const avgSpeed = this._u(1.5, 3.5);
      const mistakes30s = this._i(0, 5);
      const comboStreak = this._i(0, 8);
      const timeRemaining = this._u(3, 30);
      const handsFree = rng() < 0.6 ? 1 : 0;

      const t = {
        timeRemaining, activeOrders, ingredientsNeeded, ingredientsPrepped, stepsRemaining,
        distToStation, distToServe, dirtyDishes, cleanPlates, burning, stoveOccupied,
        boardOccupied, avgSpeed, mistakes30s, comboStreak, playerSkill, recipeComplexity, handsFree,
      };

      // ground-truth "physics": estimate how long the work really takes, with
      // nonlinear interactions (skill, congestion, distance, plate shortage).
      const congestion = 1 + 0.12 * activeOrders + 0.18 * burning + 0.07 * dirtyDishes
        + 0.10 * (stoveOccupied && stepsRemaining > 0 ? 1 : 0)
        + 0.10 * (boardOccupied && stepsRemaining > 0 ? 1 : 0);
      const timePerStep = (1.25 / playerSkill) * congestion;
      const travel = (distToStation + distToServe) / Math.max(0.6, avgSpeed);
      const plateBlock = (cleanPlates === 0 && stepsRemaining === 0) ? dirtyDishes * 0.8 : 0; // can't plate
      const needTime = stepsRemaining * timePerStep + travel + 0.6 + plateBlock;
      const focusLoss = 0.4 * mistakes30s - 0.25 * comboStreak; // panic vs flow
      const noise = randn(rng) * 1.6;
      const failed = (needTime + focusLoss + noise) > timeRemaining ? 1 : 0;

      // expert "next best action" (what a strong player does now) — the labels
      // the ActionModel learns to imitate (behaviour cloning).
      let best;
      if (burning > 0 && stoveOccupied) best = 'tend_stove';
      else if (cleanPlates === 0 && dirtyDishes > 0 && stepsRemaining === 0) best = 'wash';
      else if (stepsRemaining === 0) best = 'serve';
      else if (handsFree) best = (stoveOccupied && recipeComplexity >= 4) ? 'cook' : 'fetch';
      else best = 'chop';

      return { t, features: buildFeatures(t), failed, bestAction: ACTIONS.indexOf(best) };
    }

    dataset(n) {
      const X = [], yFail = [], yAct = [];
      for (let k = 0; k < n; k++) { const s = this.sample(); X.push(s.features); yFail.push(s.failed); yAct.push(s.bestAction); }
      return { X, yFail, yAct };
    }
  }

  // ── FailureModel — predicts P(order fails). features → … → sigmoid ─────────
  function sigmoid(z) { return 1 / (1 + Math.exp(-z)); }
  class FailureModel {
    constructor(opts = {}) {
      this.net = new MLP([NUM_FEATURES, 24, 16, 1], ['relu', 'relu', 'linear'], { seed: opts.seed || 5, clip: 5 });
      this.lr = opts.lr ?? 5e-3;
    }
    predict(features) { return sigmoid(this.net.forward(features)[0]); }
    // one epoch of minibatch SGD with binary cross-entropy
    trainEpoch(X, y, batch = 32) {
      const n = X.length; let loss = 0;
      for (let start = 0; start < n; start += batch) {
        const end = Math.min(n, start + batch);
        this.net.zeroGrads();
        for (let i = start; i < end; i++) {
          const z = this.net.forward(X[i])[0];
          const p = sigmoid(z);
          const yi = y[i];
          loss += -(yi * Math.log(p + 1e-9) + (1 - yi) * Math.log(1 - p + 1e-9));
          // d(BCE)/dz for sigmoid output = p - y  (clean, numerically stable)
          this.net.backward(Float64Array.of(p - yi));
        }
        this.net.step(this.lr, end - start);
      }
      return loss / n;
    }
    toJSON() { return this.net.toJSON(); }
    loadJSON(o) { this.net = MLP.fromJSON(o); }
  }

  // ── ActionModel — predicts the next best action. features → softmax ───────
  function softmax(z) {
    let m = z[0]; for (let i = 1; i < z.length; i++) if (z[i] > m) m = z[i];
    const e = new Float64Array(z.length); let s = 0;
    for (let i = 0; i < z.length; i++) { e[i] = Math.exp(z[i] - m); s += e[i]; }
    for (let i = 0; i < z.length; i++) e[i] /= s;
    return e;
  }
  class ActionModel {
    constructor(opts = {}) {
      this.net = new MLP([NUM_FEATURES, 32, 24, NUM_ACTIONS], ['relu', 'relu', 'linear'], { seed: opts.seed || 11, clip: 5 });
      this.lr = opts.lr ?? 5e-3;
    }
    probs(features) { return Array.from(softmax(this.net.forward(features))); }
    best(features) { const p = this.probs(features); let b = 0; for (let i = 1; i < p.length; i++) if (p[i] > p[b]) b = i; return { action: b, probs: p }; }
    trainEpoch(X, y, batch = 32) {
      const n = X.length; let loss = 0;
      for (let start = 0; start < n; start += batch) {
        const end = Math.min(n, start + batch);
        this.net.zeroGrads();
        for (let i = start; i < end; i++) {
          const p = softmax(this.net.forward(X[i]));
          loss += -Math.log(p[y[i]] + 1e-9);
          // d(cross-entropy)/dlogits for softmax = p - onehot(y)
          const d = Float64Array.from(p); d[y[i]] -= 1;
          this.net.backward(d);
        }
        this.net.step(this.lr, end - start);
      }
      return loss / n;
    }
    toJSON() { return this.net.toJSON(); }
    loadJSON(o) { this.net = MLP.fromJSON(o); }
  }

  // ── Metrics ───────────────────────────────────────────────────────────────
  // AUC via the Mann–Whitney U statistic (prob a random failure outranks a
  // random success). 0.5 = coin flip, 1.0 = perfect ranking.
  function auc(scores, labels) {
    const idx = scores.map((s, i) => i).sort((a, b) => scores[a] - scores[b]);
    let rankSum = 0, nPos = 0, nNeg = 0;
    for (let r = 0; r < idx.length; r++) { if (labels[idx[r]] === 1) { rankSum += r + 1; nPos++; } else nNeg++; }
    if (!nPos || !nNeg) return 0.5;
    return (rankSum - (nPos * (nPos + 1)) / 2) / (nPos * nNeg);
  }
  function accuracy(scores, labels, thr = 0.5) {
    let c = 0; for (let i = 0; i < scores.length; i++) if ((scores[i] >= thr ? 1 : 0) === labels[i]) c++;
    return c / scores.length;
  }
  function brier(scores, labels) { let s = 0; for (let i = 0; i < scores.length; i++) { const d = scores[i] - labels[i]; s += d * d; } return s / scores.length; }
  function calibration(scores, labels, bins = 10) {
    const out = Array.from({ length: bins }, () => ({ sum: 0, n: 0, pos: 0 }));
    for (let i = 0; i < scores.length; i++) {
      let b = Math.min(bins - 1, Math.floor(scores[i] * bins));
      out[b].sum += scores[i]; out[b].n++; out[b].pos += labels[i];
    }
    return out.map((b) => ({ pred: b.n ? b.sum / b.n : 0, actual: b.n ? b.pos / b.n : 0, n: b.n }));
  }

  // ── Director — the rule layer that turns predictions into decisions ───────
  class Director {
    constructor(failureModel, actionModel) {
      this.failure = failureModel; this.action = actionModel;
      this.recentRisk = []; // rolling window for difficulty decisions
    }
    assess(telemetry) {
      const f = telemetry instanceof Float64Array ? telemetry : buildFeatures(telemetry);
      const risk = this.failure.predict(f);
      const { action, probs } = this.action.best(f);
      this.recentRisk.push(risk); if (this.recentRisk.length > 20) this.recentRisk.shift();
      const avgRisk = this.recentRisk.reduce((a, b) => a + b, 0) / this.recentRisk.length;

      // dynamic difficulty (the "AI Director" decision)
      let difficulty;
      if (avgRisk > 0.7) difficulty = { mode: 'ease', spawnRateMult: 1.5, timeBonus: 1.2, hazardMult: 0.6, note: 'Player is overwhelmed — back off.' };
      else if (avgRisk < 0.3) difficulty = { mode: 'press', spawnRateMult: 0.8, timeBonus: 0.92, hazardMult: 1.25, note: 'Player is cruising — turn up the heat.' };
      else difficulty = { mode: 'hold', spawnRateMult: 1, timeBonus: 1, hazardMult: 1, note: 'Nicely balanced — hold steady.' };

      const actName = ACTIONS[action];
      const hint = this._hint(actName, risk);
      return {
        riskPct: Math.round(risk * 100),
        risk, avgRisk,
        nextBestAction: actName,
        nextBestActionLabel: ACTION_LABEL[actName],
        actionProbs: probs,
        sousChefTask: actName, // an AI helper would take exactly this action
        difficulty,
        hint,
      };
    }
    _hint(action, risk) {
      const urgent = risk > 0.7;
      const map = {
        fetch: 'Grab the next ingredient.',
        chop: 'Chop what you’re holding.',
        cook: 'Get it on the stove.',
        serve: urgent ? 'Serve it NOW — time’s almost up!' : 'Serve the finished dish.',
        wash: 'Wash a plate — you’re out of clean ones.',
        tend_stove: 'Something’s about to burn — get to the stove!',
        idle: 'Hold steady.',
      };
      return map[action] || 'Keep cooking.';
    }
  }

  return {
    FEATURES, FEATURE_INDEX, NUM_FEATURES, ACTIONS, ACTION_LABEL, NUM_ACTIONS,
    buildFeatures, KitchenSim, FailureModel, ActionModel, Director,
    metrics: { auc, accuracy, brier, calibration }, sigmoid, softmax,
  };
});

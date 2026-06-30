// ============================================================================
//  KitchenEnv — a small Markov Decision Process modelled on Kitchen Sync.
//  ---------------------------------------------------------------------------
//  The agent is a chef on a grid. The job mirrors the real game's core loop:
//      grab raw  →  chop it  →  serve it  →  (a dirty plate appears)  →  wash
//  Every tick the agent picks ONE action (move N/S/E/W or interact). It only
//  ever sees a flat vector of numbers (its "observation") and a scalar reward;
//  it is never told the rules — it has to *discover* the loop from reward alone.
//
//  Rewards are weighted by knobs the AI-Lab sliders control, so you can shape
//  what the chef cares about (e.g. crank "wash" up and it learns to prioritise
//  dishes; drop it and it ignores the sink and just serves). That is exactly
//  how you'd give a future AI teammate a "role".
//
//  Runs in the browser (window.KSEnv) and Node (module.exports) so the dynamics
//  are unit-tested headlessly.
// ============================================================================
(function (root, factory) {
  const lib = factory();
  if (typeof module !== 'undefined' && module.exports) module.exports = lib;
  else root.KSEnv = lib;
})(typeof self !== 'undefined' ? self : this, function () {
  'use strict';

  // carry states
  const EMPTY = 0, RAW = 1, CHOPPED = 2;
  // actions
  const UP = 0, DOWN = 1, LEFT = 2, RIGHT = 3, INTERACT = 4;
  const NUM_ACTIONS = 5;

  // A handful of "levels" — different kitchens the agent can learn. Same loop,
  // different geography, so the optimal route (and the learned brain) differ.
  const LAYOUTS = {
    cozy: {
      name: 'Cozy Corner', w: 5, h: 5, maxSteps: 90,
      crate: [0, 0], board: [4, 0], serve: [4, 4], sink: [0, 4], start: [2, 2],
    },
    galley: {
      name: 'Galley', w: 7, h: 3, maxSteps: 100,
      crate: [0, 0], board: [0, 2], serve: [6, 0], sink: [6, 2], start: [3, 1],
    },
    island: {
      name: 'Island', w: 6, h: 6, maxSteps: 120,
      crate: [0, 2], board: [5, 2], serve: [2, 5], sink: [3, 0], start: [2, 2],
    },
  };

  const DEFAULT_WEIGHTS = {
    serve: 10,     // the payoff for delivering a finished dish (the real goal)
    chop: 1,       // shaping nudge: a little reward for chopping
    pickup: 0.5,   // shaping nudge: a little reward for grabbing an ingredient
    wash: 2,       // optional bonus for washing a dirty plate
    stepCost: 0.05,// small tax per tick → learn to be quick, no dawdling
    invalid: 0.1,  // small slap for a useless interaction
  };

  const MAX_DIRTY = 4;

  class KitchenEnv {
    constructor(opts = {}) {
      this.layoutKey = opts.layout && LAYOUTS[opts.layout] ? opts.layout : 'cozy';
      this.L = LAYOUTS[this.layoutKey];
      this.weights = Object.assign({}, DEFAULT_WEIGHTS, opts.weights || {});
      this.obsSize = this.L.w * this.L.h + 3 /*carry*/ + 1 /*dirty*/ + 1 /*time*/;
      this.numActions = NUM_ACTIONS;
      this.reset();
    }

    setLayout(key) {
      if (!LAYOUTS[key]) return;
      this.layoutKey = key; this.L = LAYOUTS[key];
      this.obsSize = this.L.w * this.L.h + 5;
      this.reset();
    }
    setWeights(w) { this.weights = Object.assign({}, this.weights, w); }

    reset() {
      this.x = this.L.start[0]; this.y = this.L.start[1];
      this.carry = EMPTY;
      this.dirty = 0;
      this.steps = 0;
      this.served = 0;
      this.washed = 0;
      this.lastReward = 0;
      this.lastEvent = null; // 'pickup'|'chop'|'serve'|'wash'|'invalid'|'bump'|null
      return this.obs();
    }

    _at(station) { return this.x === station[0] && this.y === station[1]; }

    // The observation: a one-hot of WHERE the chef is (its view of the kitchen)
    // + what it's holding + how many plates are dirty + how much time is left.
    obs() {
      const { w, h } = this.L;
      const o = new Float64Array(this.obsSize);
      o[this.y * w + this.x] = 1;                 // one-hot position
      const base = w * h;
      o[base + this.carry] = 1;                   // carry one-hot (empty/raw/chopped)
      o[base + 3] = this.dirty / MAX_DIRTY;       // dirty plates, scaled
      o[base + 4] = 1 - this.steps / this.L.maxSteps; // time remaining, scaled
      return o;
    }

    step(action) {
      const W = this.weights;
      let r = -W.stepCost;
      this.lastEvent = null;
      this.steps += 1;

      if (action === INTERACT) {
        if (this._at(this.L.crate) && this.carry === EMPTY) {
          this.carry = RAW; r += W.pickup; this.lastEvent = 'pickup';
        } else if (this._at(this.L.board) && this.carry === RAW) {
          this.carry = CHOPPED; r += W.chop; this.lastEvent = 'chop';
        } else if (this._at(this.L.serve) && this.carry === CHOPPED) {
          this.carry = EMPTY; this.served += 1; r += W.serve; this.lastEvent = 'serve';
          this.dirty = Math.min(MAX_DIRTY, this.dirty + 1); // a used plate comes back dirty
        } else if (this._at(this.L.sink) && this.dirty > 0) {
          this.dirty -= 1; this.washed += 1; r += W.wash; this.lastEvent = 'wash';
        } else {
          r -= W.invalid; this.lastEvent = 'invalid';
        }
      } else {
        let nx = this.x, ny = this.y;
        if (action === UP) ny -= 1; else if (action === DOWN) ny += 1;
        else if (action === LEFT) nx -= 1; else if (action === RIGHT) nx += 1;
        if (nx < 0 || ny < 0 || nx >= this.L.w || ny >= this.L.h) {
          this.lastEvent = 'bump';                 // walked into a wall — no move
        } else { this.x = nx; this.y = ny; }
      }

      this.lastReward = r;
      const done = this.steps >= this.L.maxSteps;
      return { obs: this.obs(), reward: r, done, info: { event: this.lastEvent, served: this.served } };
    }

    // A hand-written "expert" — greedy toward the next subgoal. Used as a
    // sanity baseline in tests (a good learner should approach its score).
    expertAction() {
      let target, want;
      if (this.carry === EMPTY) {
        // if plates are piling up and washing is valued, go wash; else fetch
        if (this.dirty >= MAX_DIRTY && this.weights.wash > 0) { target = this.L.sink; want = 'sink'; }
        else { target = this.L.crate; want = 'crate'; }
      } else if (this.carry === RAW) { target = this.L.board; want = 'board'; }
      else { target = this.L.serve; want = 'serve'; }
      if (this.x === target[0] && this.y === target[1]) return INTERACT;
      // step greedily toward target (x first, then y)
      if (this.x < target[0]) return RIGHT;
      if (this.x > target[0]) return LEFT;
      if (this.y < target[1]) return DOWN;
      if (this.y > target[1]) return UP;
      return INTERACT;
    }

    snapshot() {
      return {
        x: this.x, y: this.y, carry: this.carry, dirty: this.dirty,
        steps: this.steps, maxSteps: this.L.maxSteps, served: this.served,
        washed: this.washed, lastEvent: this.lastEvent, lastReward: this.lastReward,
        layout: this.L,
      };
    }
  }

  return { KitchenEnv, LAYOUTS, DEFAULT_WEIGHTS, NUM_ACTIONS, EMPTY, RAW, CHOPPED, MAX_DIRTY,
    ACTIONS: { UP, DOWN, LEFT, RIGHT, INTERACT } };
});

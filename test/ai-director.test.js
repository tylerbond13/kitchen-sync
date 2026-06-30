'use strict';
const test = require('node:test');
const assert = require('node:assert');
const D = require('../public/js/ai/director.js');

test('feature builder produces the right shape and normalisation', () => {
  const f = D.buildFeatures({ timeRemaining: 15, activeOrders: 3, dirtyDishes: 6 });
  assert.equal(f.length, D.NUM_FEATURES);
  assert.ok(Math.abs(f[D.FEATURE_INDEX.timeRemaining] - 0.5) < 1e-9);
  assert.ok(Math.abs(f[D.FEATURE_INDEX.dirtyDishes] - 1.0) < 1e-9);
});

test('KitchenSim yields a learnable, roughly balanced failure signal', () => {
  const sim = new D.KitchenSim(1);
  const { yFail } = sim.dataset(2000);
  const rate = yFail.reduce((a, b) => a + b, 0) / yFail.length;
  assert.ok(rate > 0.2 && rate < 0.8, `failure rate should be balanced-ish, got ${rate.toFixed(2)}`);
});

test('FailureModel learns to predict order failure (held-out AUC ≫ 0.5)', () => {
  const sim = new D.KitchenSim(7);
  const train = sim.dataset(4000);
  const testset = sim.dataset(1500);
  const model = new D.FailureModel({ seed: 2, lr: 6e-3 });
  for (let e = 0; e < 25; e++) model.trainEpoch(train.X, train.yFail, 32);
  const scores = testset.X.map((x) => model.predict(x));
  const auc = D.metrics.auc(scores, testset.yFail);
  const acc = D.metrics.accuracy(scores, testset.yFail);
  assert.ok(auc > 0.8, `held-out AUC should be strong, got ${auc.toFixed(3)}`);
  assert.ok(acc > 0.72, `held-out accuracy should be good, got ${acc.toFixed(3)}`);
});

test('ActionModel imitates the expert next-best-action well', () => {
  const sim = new D.KitchenSim(9);
  const train = sim.dataset(4000);
  const testset = sim.dataset(1500);
  const model = new D.ActionModel({ seed: 4, lr: 6e-3 });
  for (let e = 0; e < 25; e++) model.trainEpoch(train.X, train.yAct, 32);
  let correct = 0;
  for (let i = 0; i < testset.X.length; i++) if (model.best(testset.X[i]).action === testset.yAct[i]) correct++;
  const acc = correct / testset.X.length;
  assert.ok(acc > 0.85, `behaviour-cloning accuracy should be high, got ${acc.toFixed(3)}`);
});

test('Director turns predictions into a failure %, next action and difficulty call', () => {
  const sim = new D.KitchenSim(3);
  const data = sim.dataset(2500);
  const fm = new D.FailureModel({ seed: 1 }); const am = new D.ActionModel({ seed: 1 });
  for (let e = 0; e < 12; e++) { fm.trainEpoch(data.X, data.yFail); am.trainEpoch(data.X, data.yAct); }
  const dir = new D.Director(fm, am);

  // a clearly doomed order: 5 steps left, 4 seconds, slow skill, lots going on
  const doomed = dir.assess({ timeRemaining: 4, stepsRemaining: 5, ingredientsNeeded: 5, ingredientsPrepped: 0,
    activeOrders: 6, dirtyDishes: 5, burning: 2, stoveOccupied: 1, playerSkill: 0.45, avgSpeed: 1.6,
    distToStation: 7, distToServe: 8, recipeComplexity: 5, handsFree: 1, mistakes30s: 4 });
  assert.ok(doomed.riskPct >= 0 && doomed.riskPct <= 100);
  assert.ok(D.ACTIONS.includes(doomed.nextBestAction));
  assert.ok(typeof doomed.hint === 'string' && doomed.hint.length);
  assert.ok(['ease', 'hold', 'press'].includes(doomed.difficulty.mode));

  // a comfy order should read as lower risk than the doomed one
  const comfy = dir.assess({ timeRemaining: 28, stepsRemaining: 1, ingredientsNeeded: 2, ingredientsPrepped: 1,
    activeOrders: 1, dirtyDishes: 0, burning: 0, stoveOccupied: 0, playerSkill: 0.95, avgSpeed: 3.2,
    distToStation: 1, distToServe: 1, recipeComplexity: 2, handsFree: 0, mistakes30s: 0, comboStreak: 5 });
  assert.ok(comfy.risk < doomed.risk, `comfy (${comfy.risk.toFixed(2)}) should be less risky than doomed (${doomed.risk.toFixed(2)})`);
});

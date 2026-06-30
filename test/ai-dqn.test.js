'use strict';
const test = require('node:test');
const assert = require('node:assert');
const { KitchenEnv } = require('../public/js/ai/kitchenEnv.js');
const { DQNAgent } = require('../public/js/ai/dqn.js');

function evalAgent(env, pick, episodes) {
  let served = 0, reward = 0;
  for (let e = 0; e < episodes; e++) {
    let s = env.reset(); let done = false;
    while (!done) { const a = pick(s); const r = env.step(a); reward += r.reward; s = r.obs; done = r.done; }
    served += env.served;
  }
  return { served: served / episodes, reward: reward / episodes };
}

test('env: a hand-written expert completes the cook→serve loop repeatedly', () => {
  const env = new KitchenEnv({ layout: 'cozy' });
  const r = evalAgent(env, () => env.expertAction(), 5);
  assert.ok(r.served >= 3, `expert should serve several dishes, got ${r.served}`);
});

test('DQN teaches itself to play — and beats a random baseline', () => {
  const env = new KitchenEnv({ layout: 'cozy' });
  const randomBaseline = evalAgent(env, () => (Math.random() * env.numActions) | 0, 20);

  const agent = new DQNAgent(env.obsSize, env.numActions, {
    hidden: [48, 48], lr: 1e-3, gamma: 0.97, batch: 32,
    epsDecaySteps: 5000, bufferCap: 8000, warmup: 200, targetSync: 200, seed: 7,
  });

  // train
  let s = env.reset();
  const STEPS = 16000;
  for (let i = 0; i < STEPS; i++) {
    const { action } = agent.act(s);
    const { obs: s2, reward, done } = env.step(action);
    agent.remember(s, action, reward, s2, done);
    agent.train();
    s = done ? env.reset() : s2;
  }
  assert.ok(Number.isFinite(agent.lastLoss), 'loss should be finite');

  // evaluate greedily (no exploration)
  const trained = evalAgent(env, (st) => agent.act(st, true).action, 10);

  assert.ok(trained.served >= 2.5,
    `trained agent should serve dishes, got ${trained.served.toFixed(2)}`);
  assert.ok(trained.served > randomBaseline.served + 1.5,
    `trained (${trained.served.toFixed(2)}) should beat random (${randomBaseline.served.toFixed(2)})`);
});

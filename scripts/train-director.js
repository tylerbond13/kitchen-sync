// ============================================================================
//  train-director.js — pre-train the AI Director offline (Node).
//  ---------------------------------------------------------------------------
//  Trains the two Director brains (FailureModel + ActionModel) on KitchenSim —
//  the same generative kitchen model the AI Lab uses — then dumps their weights
//  to public/assets/ai/director-weights.json so the live game can load a ready
//  brain instantly (no in-browser training before the HUD works).
//
//  Deterministic: fixed seeds + no minibatch shuffling → the committed weights
//  reproduce exactly from `npm run train-director`.
//
//  Usage:  npm run train-director        (defaults: 120 epochs)
//          EPOCHS=200 npm run train-director
// ============================================================================
'use strict';
const fs = require('fs');
const path = require('path');
const KSDirector = require('../public/js/ai/director.js');

const EPOCHS = Number(process.env.EPOCHS || 120);
const TRAIN_N = Number(process.env.TRAIN_N || 8000);
const TEST_N = Number(process.env.TEST_N || 2500);
const BATCH = 32;

function evaluate(fm, am, holdout) {
  const scores = holdout.X.map((x) => fm.predict(x));
  const auc = KSDirector.metrics.auc(scores, holdout.yFail);
  const acc = KSDirector.metrics.accuracy(scores, holdout.yFail);
  let correct = 0;
  for (let i = 0; i < holdout.X.length; i++) {
    if (am.best(holdout.X[i]).action === holdout.yAct[i]) correct++;
  }
  return { auc, acc, actAcc: correct / holdout.X.length };
}

function main() {
  console.log(`Training Director: ${EPOCHS} epochs, ${TRAIN_N} train / ${TEST_N} hold-out samples`);
  const train = new KSDirector.KitchenSim(123).dataset(TRAIN_N);
  const holdout = new KSDirector.KitchenSim(999).dataset(TEST_N); // unseen seed = honest test

  const fm = new KSDirector.FailureModel({ seed: 5, lr: 6e-3 });
  const am = new KSDirector.ActionModel({ seed: 11, lr: 6e-3 });

  for (let e = 1; e <= EPOCHS; e++) {
    const fl = fm.trainEpoch(train.X, train.yFail, BATCH);
    const al = am.trainEpoch(train.X, train.yAct, BATCH);
    if (e % 10 === 0 || e === EPOCHS) {
      const m = evaluate(fm, am, holdout);
      console.log(
        `epoch ${String(e).padStart(3)}  fmLoss=${fl.toFixed(4)}  amLoss=${al.toFixed(4)}  ` +
        `AUC=${m.auc.toFixed(3)}  acc=${(m.acc * 100).toFixed(1)}%  nextAct=${(m.actAcc * 100).toFixed(1)}%`
      );
    }
  }

  const m = evaluate(fm, am, holdout);
  const out = {
    meta: {
      generator: 'scripts/train-director.js',
      trainedEpochs: EPOCHS,
      trainSamples: TRAIN_N,
      numFeatures: KSDirector.NUM_FEATURES,
      featureKeys: KSDirector.FEATURES.map((f) => f.key),
      actions: KSDirector.ACTIONS,
      holdoutAUC: Math.round(m.auc * 1e4) / 1e4,
      holdoutAcc: Math.round(m.acc * 1e4) / 1e4,
      holdoutActAcc: Math.round(m.actAcc * 1e4) / 1e4,
    },
    fm: fm.toJSON(),
    am: am.toJSON(),
  };

  const dir = path.join(__dirname, '..', 'public', 'assets', 'ai');
  fs.mkdirSync(dir, { recursive: true });
  const file = path.join(dir, 'director-weights.json');
  const json = JSON.stringify(out);
  fs.writeFileSync(file, json);
  console.log(
    `\nWrote ${path.relative(path.join(__dirname, '..'), file)}  ` +
    `(AUC ${m.auc.toFixed(3)}, nextAct ${(m.actAcc * 100).toFixed(1)}%, ${(json.length / 1024).toFixed(1)} KB)`
  );

  if (m.auc < 0.8) {
    console.error(`\nFAIL: hold-out AUC ${m.auc.toFixed(3)} < 0.80 — not shipping these weights.`);
    process.exit(1);
  }
}

main();

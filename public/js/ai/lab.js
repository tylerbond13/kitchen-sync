// ============================================================================
//  AI Lab — the interactive front-end that ties it all together.
//  Drives two live demos on the from-scratch neural net (KSNN):
//    • RL Dojo   — a DQN chef that teaches itself to cook (KSEnv + KSDQN)
//    • Director  — failure-risk + next-best-action nets (KSDirector)
//  Pure DOM + canvas, no frameworks. Heavy loops are budgeted per animation
//  frame so the page stays buttery.
// ============================================================================
(function () {
  'use strict';
  const $ = (id) => document.getElementById(id);
  const clamp = (v, a, b) => Math.max(a, Math.min(b, v));
  const lerp = (a, b, t) => a + (b - a) * t;

  // crisp canvas sizing for retina
  function fit(canvas, h) {
    const dpr = Math.min(2, window.devicePixelRatio || 1);
    const w = canvas.clientWidth || canvas.parentElement.clientWidth;
    canvas.width = Math.round(w * dpr); canvas.height = Math.round((h || canvas.height) * dpr);
    const ctx = canvas.getContext('2d'); ctx.setTransform(dpr, 0, 0, dpr, 0, 0);
    return { ctx, w, h: h || canvas.clientHeight };
  }
  const css = (name) => getComputedStyle(document.documentElement).getPropertyValue(name).trim();

  // ---- tabs -----------------------------------------------------------------
  $('tabs').addEventListener('click', (e) => {
    const t = e.target.closest('.tab'); if (!t) return;
    document.querySelectorAll('.tab').forEach((x) => x.classList.toggle('active', x === t));
    document.querySelectorAll('.view').forEach((v) => v.classList.toggle('active', v.id === 'view-' + t.dataset.view));
    if (t.dataset.view === 'director') Director.ensureWarm();
  });

  // ===========================================================================
  //  PILLAR 1 — RL DOJO
  // ===========================================================================
  const Dojo = (function () {
    let env, agent, layout = 'cozy', running = false, stepsPerFrame = 1;
    let cur = null, epReward = 0, epReturns = [], served = 0, episodes = 0;
    let lastQ = null, lastAct = 0, animX = 2, animY = 2;
    const weights = Object.assign({}, KSEnv.DEFAULT_WEIGHTS);

    const SLIDERS = [
      { key: 'serve', label: '🍽️ Serve a dish', min: 0, max: 20, step: 1 },
      { key: 'chop', label: '🔪 Chop (prep)', min: 0, max: 6, step: 0.5 },
      { key: 'pickup', label: '🧺 Grab ingredient', min: 0, max: 4, step: 0.5 },
      { key: 'wash', label: '🫧 Wash a plate', min: 0, max: 8, step: 0.5 },
      { key: 'stepCost', label: '⏱️ Cost per step', min: 0, max: 0.3, step: 0.01 },
    ];

    function build() {
      env = new KSEnv.KitchenEnv({ layout, weights });
      agent = new KSDQN.DQNAgent(env.obsSize, env.numActions, {
        hidden: [24, 16], lr: 1e-3, gamma: 0.97, batch: 32,
        epsDecaySteps: 6000, bufferCap: 8000, warmup: 200, targetSync: 200, seed: 1,
      });
      cur = env.reset(); epReward = 0; epReturns = []; served = 0; episodes = 0;
      animX = env.x; animY = env.y;
    }

    function renderSliders() {
      const wrap = $('rlSliders'); wrap.innerHTML = '';
      for (const s of SLIDERS) {
        const row = document.createElement('div'); row.className = 'slider';
        row.innerHTML = `<label>${s.label}</label><span class="val" id="rlv-${s.key}">${weights[s.key]}</span>
          <input type="range" min="${s.min}" max="${s.max}" step="${s.step}" value="${weights[s.key]}" data-k="${s.key}">`;
        wrap.appendChild(row);
      }
      wrap.addEventListener('input', (e) => {
        const k = e.target.dataset.k; if (!k) return;
        weights[k] = parseFloat(e.target.value); $('rlv-' + k).textContent = weights[k];
      });
    }

    function loop() {
      if (running) {
        for (let i = 0; i < stepsPerFrame; i++) {
          const { action, q } = agent.act(cur);
          if (q) { lastQ = q; lastAct = action; }
          const { obs: s2, reward, done } = env.step(action);
          agent.remember(cur, action, reward, s2, done);
          agent.train();
          epReward += reward; cur = s2;
          if (done) {
            epReturns.push(epReward); if (epReturns.length > 500) epReturns.shift();
            served = env.served; episodes++; epReward = 0; cur = env.reset();
          }
        }
      }
      // smooth the drawn chef toward its true cell
      animX = lerp(animX, env.x, 0.35); animY = lerp(animY, env.y, 0.35);
      drawEnv(); drawReward(); drawQ(); drawBrain(); drawStats();
      requestAnimationFrame(loop);
    }

    function drawStats() {
      $('rlEp').textContent = episodes;
      const last = epReturns.slice(-20);
      $('rlServed').textContent = served.toFixed(0);
      $('rlEps').textContent = agent.epsilon.toFixed(2);
    }

    function drawEnv() {
      const c = $('envCanvas'); const { ctx, w, h } = fit(c, 320);
      ctx.clearRect(0, 0, w, h);
      const L = env.L; const pad = 16;
      const cell = Math.min((w - pad * 2) / L.w, (h - pad * 2) / L.h);
      const ox = (w - cell * L.w) / 2, oy = (h - cell * L.h) / 2;
      // floor
      for (let y = 0; y < L.h; y++) for (let x = 0; x < L.w; x++) {
        ctx.fillStyle = (x + y) % 2 ? '#0c1430' : '#0a1024';
        ctx.fillRect(ox + x * cell, oy + y * cell, cell - 1, cell - 1);
      }
      const station = (pos, color, glyph) => {
        const x = ox + pos[0] * cell, y = oy + pos[1] * cell;
        ctx.fillStyle = color; roundRect(ctx, x + 3, y + 3, cell - 6, cell - 6, 8); ctx.fill();
        ctx.globalAlpha = 1; ctx.font = `${cell * 0.5}px serif`; ctx.textAlign = 'center'; ctx.textBaseline = 'middle';
        ctx.fillText(glyph, x + cell / 2, y + cell / 2 + 1);
      };
      station(L.crate, 'rgba(141,255,158,.22)', '🧺');
      station(L.board, 'rgba(56,225,255,.22)', '🔪');
      station(L.serve, 'rgba(255,209,102,.22)', '🛎️');
      station(L.sink, 'rgba(255,92,200,.20)', '🫧');
      // dirty count over sink
      if (env.dirty > 0) { badge(ctx, ox + L.sink[0] * cell + cell - 8, oy + L.sink[1] * cell + 8, env.dirty, '#ff5cc8'); }
      // chef
      const cxp = ox + animX * cell + cell / 2, cyp = oy + animY * cell + cell / 2;
      ctx.font = `${cell * 0.6}px serif`; ctx.textAlign = 'center'; ctx.textBaseline = 'middle';
      ctx.fillText('🧑‍🍳', cxp, cyp);
      // carry indicator
      const carryGlyph = env.carry === 1 ? '🥬' : env.carry === 2 ? '🥗' : '';
      if (carryGlyph) { ctx.font = `${cell * 0.34}px serif`; ctx.fillText(carryGlyph, cxp + cell * 0.28, cyp - cell * 0.28); }
      // score
      ctx.fillStyle = css('--ink'); ctx.font = '700 13px ui-rounded,system-ui'; ctx.textAlign = 'left'; ctx.textBaseline = 'top';
      ctx.fillText(`Served this episode: ${env.served}`, 10, 8);
      ctx.fillStyle = css('--muted');
      ctx.fillText(`step ${env.steps}/${L.maxSteps}`, 10, 26);
    }

    function drawReward() {
      const c = $('rewardCanvas'); const { ctx, w, h } = fit(c, 150);
      ctx.clearRect(0, 0, w, h);
      if (epReturns.length < 2) { ctx.fillStyle = css('--muted'); ctx.font = '12px ui-rounded'; ctx.fillText('Press Train…', 10, 20); return; }
      // moving average
      const win = 15, ma = [];
      for (let i = 0; i < epReturns.length; i++) { const a = Math.max(0, i - win); let s = 0; for (let j = a; j <= i; j++) s += epReturns[j]; ma.push(s / (i - a + 1)); }
      let lo = Math.min(...ma), hi = Math.max(...ma); if (hi - lo < 1) hi = lo + 1;
      const pad = 8;
      ctx.strokeStyle = css('--cyan'); ctx.lineWidth = 2; ctx.beginPath();
      ma.forEach((v, i) => { const x = pad + (w - pad * 2) * (i / (ma.length - 1)); const y = h - pad - (h - pad * 2) * ((v - lo) / (hi - lo)); i ? ctx.lineTo(x, y) : ctx.moveTo(x, y); });
      ctx.stroke();
      ctx.fillStyle = css('--muted'); ctx.font = '11px ui-rounded'; ctx.textAlign = 'right';
      ctx.fillText(hi.toFixed(1), w - 4, 12); ctx.fillText(lo.toFixed(1), w - 4, h - 4);
    }

    function drawQ() {
      const wrap = $('qbars');
      const q = lastQ || agent.qValues(cur);
      const names = ['↑ up', '↓ down', '← left', '→ right', '✋ interact'];
      let lo = Math.min(...q), hi = Math.max(...q); if (hi - lo < 1e-3) hi = lo + 1;
      let best = 0; for (let i = 1; i < q.length; i++) if (q[i] > q[best]) best = i;
      wrap.innerHTML = q.map((v, i) => {
        const pct = ((v - lo) / (hi - lo)) * 100;
        const col = i === best ? 'var(--grad)' : 'rgba(150,180,255,.3)';
        return `<div class="bar"><span>${names[i]}</span><div class="track"><div class="fill" style="width:${pct.toFixed(0)}%;background:${col}"></div></div><span class="pct">${v.toFixed(2)}</span></div>`;
      }).join('');
    }

    // Live "brain" — a faithful slice of the real net (first N neurons/layer).
    function drawBrain() {
      const c = $('brainCanvas'); const { ctx, w, h } = fit(c, 260);
      ctx.clearRect(0, 0, w, h);
      const acts = agent.policy.activations(); // [input, h1, h2, out]
      const layers = agent.policy.layers;
      const CAP = [12, 16, 12, 5];
      const cols = acts.length;
      const xs = acts.map((_, i) => 40 + (w - 80) * (cols === 1 ? 0 : i / (cols - 1)));
      const nodePos = acts.map((a, li) => {
        const n = Math.min(CAP[li] ?? 12, a.length);
        const arr = [];
        for (let k = 0; k < n; k++) { const y = 24 + (h - 48) * (n === 1 ? 0.5 : k / (n - 1)); arr.push({ y, a: a[k] }); }
        return arr;
      });
      // edges (sampled): layer li weights connect acts[li] -> acts[li+1]
      for (let li = 0; li < layers.length; li++) {
        const A = nodePos[li], B = nodePos[li + 1], Wl = layers[li];
        for (let bi = 0; bi < B.length; bi++) for (let ai = 0; ai < A.length; ai++) {
          const wgt = Wl.W[bi * Wl.nIn + ai] || 0;
          const mag = Math.min(1, Math.abs(wgt) * 0.9);
          if (mag < 0.12) continue;
          ctx.strokeStyle = (wgt >= 0 ? 'rgba(56,225,255,' : 'rgba(255,92,200,') + (mag * 0.5).toFixed(2) + ')';
          ctx.lineWidth = mag * 1.6; ctx.beginPath(); ctx.moveTo(xs[li], A[ai].y); ctx.lineTo(xs[li + 1], B[bi].y); ctx.stroke();
        }
      }
      // nodes
      const labels = ['senses', 'hidden', 'hidden', 'Q-values'];
      nodePos.forEach((col2, li) => {
        col2.forEach((nd) => {
          const a = Math.tanh(Math.abs(nd.a)); // brightness
          ctx.beginPath(); ctx.arc(xs[li], nd.y, 6, 0, Math.PI * 2);
          ctx.fillStyle = `rgba(${lerp(60, 255, a) | 0},${lerp(80, 255, a) | 0},255,${(0.35 + a * 0.6).toFixed(2)})`;
          ctx.fill(); ctx.strokeStyle = 'rgba(150,180,255,.25)'; ctx.lineWidth = 1; ctx.stroke();
        });
        ctx.fillStyle = css('--muted'); ctx.font = '10px ui-rounded'; ctx.textAlign = 'center';
        ctx.fillText(labels[li] || '', xs[li], h - 6);
      });
    }

    function setSpeed(s) { stepsPerFrame = s; }
    function start() { running = true; $('rlTrain').textContent = '⏸ Pause'; }
    function pause() { running = false; $('rlTrain').textContent = '▶ Train'; }

    function init() {
      build(); renderSliders();
      tryLoad(true); // silent auto-load if present
      $('rlTrain').onclick = () => (running ? pause() : start());
      $('rlReset').onclick = () => { build(); };
      $('rlApply').onclick = () => { env.setWeights(weights); };
      $('rlSave').onclick = () => save();
      $('rlLoad').onclick = () => tryLoad(false);
      $('rlSpeed').addEventListener('click', (e) => { const b = e.target.closest('button'); if (!b) return; [...$('rlSpeed').children].forEach((x) => x.classList.toggle('on', x === b)); setSpeed(+b.dataset.spd); });
      $('rlLayout').addEventListener('click', (e) => {
        const b = e.target.closest('button'); if (!b) return;
        [...$('rlLayout').children].forEach((x) => x.classList.toggle('on', x === b));
        layout = b.dataset.lay; build(); tryLoad(true);
      });
      requestAnimationFrame(loop);
      start(); // kick off training immediately for instant "wow"
    }
    function save() { try { localStorage.setItem('ks-rl-' + layout, JSON.stringify({ agent: agent.toJSON(), episodes })); flash($('rlSave'), 'Saved ✓'); } catch (e) {} }
    function tryLoad(silent) {
      try { const raw = localStorage.getItem('ks-rl-' + layout); if (!raw) { if (!silent) flash($('rlLoad'), 'Nothing saved'); return; }
        const o = JSON.parse(raw); agent.loadJSON(o.agent); episodes = o.episodes || 0; if (!silent) flash($('rlLoad'), 'Loaded ✓'); } catch (e) {}
    }
    return { init };
  })();

  // ===========================================================================
  //  PILLAR 2 — AI DIRECTOR
  // ===========================================================================
  const Director = (function () {
    let fm, am, dir, sim, lossHist = [], epoch = 0, lastMetrics = null, warm = false, training = false;
    let trainData, testData;

    const GROUPS = [
      { title: 'This order', items: [
        { key: 'timeRemaining', label: 'Time left (s)', min: 0, max: 30, step: 1, def: 11 },
        { key: 'recipeComplexity', label: 'Recipe complexity', min: 1, max: 5, step: 1, def: 4 },
        { key: 'ingredientsPrepped', label: 'Steps done', min: 0, max: 5, step: 1, def: 1 },
        { key: 'distToStation', label: 'Dist → station', min: 0.5, max: 9, step: 0.5, def: 4 },
        { key: 'distToServe', label: 'Dist → serve', min: 0.5, max: 9, step: 0.5, def: 6 },
      ]},
      { title: 'The kitchen', items: [
        { key: 'activeOrders', label: 'Active orders', min: 1, max: 6, step: 1, def: 4 },
        { key: 'dirtyDishes', label: 'Dirty dishes', min: 0, max: 6, step: 1, def: 3 },
        { key: 'cleanPlates', label: 'Clean plates', min: 0, max: 4, step: 1, def: 1 },
        { key: 'burning', label: 'About to burn', min: 0, max: 2, step: 1, def: 1 },
        { key: 'stoveOccupied', label: 'Stove busy', min: 0, max: 1, step: 1, def: 1 },
        { key: 'boardOccupied', label: 'Board busy', min: 0, max: 1, step: 1, def: 0 },
      ]},
      { title: 'The player', items: [
        { key: 'playerSkill', label: 'Skill', min: 0.4, max: 1, step: 0.05, def: 0.7 },
        { key: 'avgSpeed', label: 'Avg speed', min: 1.5, max: 3.5, step: 0.1, def: 2.5 },
        { key: 'mistakes30s', label: 'Mistakes (30s)', min: 0, max: 5, step: 1, def: 2 },
        { key: 'comboStreak', label: 'Combo streak', min: 0, max: 8, step: 1, def: 1 },
        { key: 'handsFree', label: 'Hands free', min: 0, max: 1, step: 1, def: 1 },
      ]},
    ];
    const state = {};

    function telemetry() {
      const t = Object.assign({}, state);
      t.ingredientsNeeded = t.recipeComplexity;
      t.ingredientsPrepped = clamp(t.ingredientsPrepped, 0, t.ingredientsNeeded);
      t.stepsRemaining = Math.max(0, t.ingredientsNeeded - t.ingredientsPrepped);
      return t;
    }

    function renderSliders() {
      const wrap = $('dirSliders'); wrap.innerHTML = '';
      for (const g of GROUPS) {
        const hd = document.createElement('h3'); hd.textContent = g.title; hd.style.marginTop = '10px'; wrap.appendChild(hd);
        for (const s of g.items) {
          if (state[s.key] == null) state[s.key] = s.def;
          const row = document.createElement('div'); row.className = 'slider';
          row.innerHTML = `<label>${s.label}</label><span class="val" id="dv-${s.key}">${state[s.key]}</span>
            <input type="range" min="${s.min}" max="${s.max}" step="${s.step}" value="${state[s.key]}" data-k="${s.key}">`;
          wrap.appendChild(row);
        }
      }
      wrap.addEventListener('input', (e) => {
        const k = e.target.dataset.k; if (!k) return;
        state[k] = parseFloat(e.target.value); $('dv-' + k).textContent = state[k]; refresh();
      });
    }

    function buildModels() {
      fm = new KSDirector.FailureModel({ seed: 5, lr: 6e-3 });
      am = new KSDirector.ActionModel({ seed: 11, lr: 6e-3 });
      dir = new KSDirector.Director(fm, am);
      sim = new KSDirector.KitchenSim(123);
      trainData = sim.dataset(4000); testData = sim.dataset(1500);
      lossHist = []; epoch = 0; lastMetrics = null;
    }

    function trainChunk(epochs, done) {
      training = true; $('dirTrain').textContent = '⏳ Training…';
      let e = 0;
      const tick = () => {
        const l = fm.trainEpoch(trainData.X, trainData.yFail, 32);
        am.trainEpoch(trainData.X, trainData.yAct, 32);
        lossHist.push(l); epoch++;
        if (epoch % 2 === 0 || e === epochs - 1) computeMetrics();
        drawLoss(); drawCalib(); drawStatsD(); refresh();
        if (++e < epochs) setTimeout(tick, 0);
        else { training = false; $('dirTrain').textContent = '▶ Train more'; save(); done && done(); }
      };
      tick();
    }

    function computeMetrics() {
      const scores = testData.X.map((x) => fm.predict(x));
      lastMetrics = {
        auc: KSDirector.metrics.auc(scores, testData.yFail),
        acc: KSDirector.metrics.accuracy(scores, testData.yFail),
        brier: KSDirector.metrics.brier(scores, testData.yFail),
        calib: KSDirector.metrics.calibration(scores, testData.yFail, 10),
      };
    }

    function drawStatsD() {
      $('dEpoch').textContent = epoch;
      if (lastMetrics) { $('dAuc').textContent = lastMetrics.auc.toFixed(3); $('dAcc').textContent = (lastMetrics.acc * 100).toFixed(0) + '%'; $('dBrier').textContent = lastMetrics.brier.toFixed(3); }
    }

    function drawLoss() {
      const c = $('dirLossCanvas'); const { ctx, w, h } = fit(c, 120);
      ctx.clearRect(0, 0, w, h);
      if (lossHist.length < 2) { ctx.fillStyle = css('--muted'); ctx.font = '12px ui-rounded'; ctx.fillText('Press Train Director…', 10, 20); return; }
      const lo = 0, hi = Math.max(...lossHist); const pad = 8;
      ctx.strokeStyle = css('--mag'); ctx.lineWidth = 2; ctx.beginPath();
      lossHist.forEach((v, i) => { const x = pad + (w - pad * 2) * (i / (lossHist.length - 1)); const y = h - pad - (h - pad * 2) * ((v - lo) / (hi - lo || 1)); i ? ctx.lineTo(x, y) : ctx.moveTo(x, y); });
      ctx.stroke();
      ctx.fillStyle = css('--muted'); ctx.font = '11px ui-rounded'; ctx.textAlign = 'left'; ctx.fillText('BCE loss', 6, 12);
    }

    function drawCalib() {
      const c = $('calibCanvas'); const { ctx, w, h } = fit(c, 200);
      ctx.clearRect(0, 0, w, h); const pad = 26; const X = (v) => pad + (w - pad * 1.4) * v; const Y = (v) => h - pad - (h - pad * 1.4) * v;
      ctx.strokeStyle = 'rgba(150,180,255,.25)'; ctx.lineWidth = 1; // axes
      ctx.beginPath(); ctx.moveTo(pad, h - pad); ctx.lineTo(w - 6, h - pad); ctx.moveTo(pad, h - pad); ctx.lineTo(pad, 6); ctx.stroke();
      ctx.setLineDash([4, 4]); ctx.strokeStyle = 'rgba(141,255,158,.5)'; ctx.beginPath(); ctx.moveTo(X(0), Y(0)); ctx.lineTo(X(1), Y(1)); ctx.stroke(); ctx.setLineDash([]);
      ctx.fillStyle = css('--muted'); ctx.font = '10px ui-rounded'; ctx.textAlign = 'center';
      ctx.fillText('predicted', (w) / 2, h - 6); ctx.save(); ctx.translate(10, h / 2); ctx.rotate(-Math.PI / 2); ctx.fillText('actual', 0, 0); ctx.restore();
      if (!lastMetrics) return;
      ctx.fillStyle = css('--cyan');
      for (const b of lastMetrics.calib) { if (!b.n) continue; const r = clamp(Math.sqrt(b.n) * 0.6, 2.5, 8); ctx.beginPath(); ctx.arc(X(b.pred), Y(b.actual), r, 0, Math.PI * 2); ctx.fill(); }
    }

    function drawGauge(risk) {
      const c = $('gaugeCanvas'); const ctx = c.getContext('2d'); const W = 170, H = 170;
      const dpr = Math.min(2, window.devicePixelRatio || 1);
      c.width = W * dpr; c.height = H * dpr; ctx.setTransform(dpr, 0, 0, dpr, 0, 0); ctx.clearRect(0, 0, W, H);
      const cx = W / 2, cy = H / 2, r = 64; const a0 = Math.PI * 0.75, a1 = Math.PI * 2.25;
      ctx.lineWidth = 14; ctx.lineCap = 'round';
      ctx.strokeStyle = 'rgba(150,180,255,.15)'; ctx.beginPath(); ctx.arc(cx, cy, r, a0, a1); ctx.stroke();
      const col = risk < 0.35 ? css('--lime') : risk < 0.7 ? css('--amber') : css('--red');
      ctx.strokeStyle = col; ctx.beginPath(); ctx.arc(cx, cy, r, a0, a0 + (a1 - a0) * risk); ctx.stroke();
      $('riskNum').textContent = Math.round(risk * 100) + '%'; $('riskNum').style.color = col;
    }

    function refresh() {
      if (!dir) return;
      const a = dir.assess(telemetry());
      drawGauge(a.risk);
      $('nextAct').textContent = a.nextBestActionLabel;
      $('dirHint').textContent = a.hint;
      const pill = $('diffPill'); pill.className = 'pill ' + a.difficulty.mode;
      pill.textContent = a.difficulty.mode === 'ease' ? '🟢 Ease off' : a.difficulty.mode === 'press' ? '🔴 Press harder' : '🟡 Hold steady';
      $('diffNote').textContent = a.difficulty.note + `  ·  spawn ×${a.difficulty.spawnRateMult}, time ×${a.difficulty.timeBonus}`;
      // action probability bars
      $('actBars').innerHTML = KSDirector.ACTIONS.map((name, i) => {
        const p = a.actionProbs[i]; const best = i === KSDirector.ACTIONS.indexOf(a.nextBestAction);
        return `<div class="bar"><span>${KSDirector.ACTION_LABEL[name]}</span><div class="track"><div class="fill" style="width:${(p * 100).toFixed(0)}%;background:${best ? 'var(--grad)' : 'rgba(150,180,255,.3)'}"></div></div><span class="pct">${(p * 100).toFixed(0)}%</span></div>`;
      }).join('');
      drawImportance();
    }

    // sensitivity analysis: perturb each feature, measure |Δrisk|
    function drawImportance() {
      const base = telemetry(); const f0 = KSDirector.buildFeatures(base); const r0 = fm.predict(f0);
      const imp = [];
      for (const F of KSDirector.FEATURES) {
        const f = Float64Array.from(f0); const d = 0.2; // +20% of the normalised range
        f[KSDirector.FEATURE_INDEX[F.key]] = clamp(f[KSDirector.FEATURE_INDEX[F.key]] + d, 0, 1.2);
        imp.push({ label: F.label, v: Math.abs(fm.predict(f) - r0) });
      }
      imp.sort((a, b) => b.v - a.v); const top = imp.slice(0, 8); const max = top[0].v || 1;
      $('importBars').innerHTML = top.map((x) => `<div class="bar"><span style="font-size:12px">${x.label}</span><div class="track"><div class="fill" style="width:${(x.v / max * 100).toFixed(0)}%"></div></div><span class="pct">${(x.v * 100).toFixed(0)}</span></div>`).join('');
    }

    function save() { try { localStorage.setItem('ks-director', JSON.stringify({ fm: fm.toJSON(), am: am.toJSON(), epoch })); } catch (e) {} }
    function tryLoad() {
      try { const raw = localStorage.getItem('ks-director'); if (!raw) return false; const o = JSON.parse(raw);
        fm.loadJSON(o.fm); am.loadJSON(o.am); epoch = o.epoch || 0; computeMetrics(); return true; } catch (e) { return false; }
    }

    function ensureWarm() {
      if (warm) return; warm = true;
      if (!tryLoad()) trainChunk(14); else { drawLoss(); drawCalib(); drawStatsD(); refresh(); }
      refresh();
    }

    function init() {
      buildModels(); renderSliders();
      $('dirTrain').onclick = () => { if (!training) trainChunk(14); };
      $('dirReset').onclick = () => { buildModels(); warm = false; lossHist = []; drawLoss(); drawCalib(); drawStatsD(); ensureWarm(); };
      refresh();
    }
    return { init, ensureWarm };
  })();

  // ===========================================================================
  //  LEARN tab content
  // ===========================================================================
  function buildLearn() {
    const items = [
      ['What even is a neural network?',
        `A neural network is just a big function full of tunable numbers ("weights"). You feed in numbers (here: where the chef is, what's on the stove…), they flow through layers of simple math, and out come more numbers (a Q-value per move, or a risk score). <b>Training</b> means: make a prediction, measure how wrong it was, and nudge every weight a hair in the direction that would've been less wrong. Do that millions of times and the function gets good. The brain on the Dojo tab is exactly this — <code>30→24→16→5</code> numbers, hand-written in <code>nn.js</code>, no libraries.`],
      ['Backpropagation & gradient descent (how it actually learns)',
        `To nudge each weight the right way you need its <b>gradient</b> — how much the error changes if you wiggle that weight. <b>Backpropagation</b> is the chain rule run backwards through the layers to get every gradient at once. Then <b>Adam</b> (the optimizer) takes a smart step downhill. We prove our backprop is correct with a <b>numerical gradient check</b> in the tests — comparing the formula to wiggling each weight by hand.`],
      ['Reinforcement learning — learning from reward, not answers',
        `In supervised learning you show the network the right answer. In <b>reinforcement learning</b> there is no answer key — only <b>reward</b>. The chef tries things and discovers that "serve a dish" eventually pays off. The trick is <b>credit assignment</b>: the reward comes many steps after the good decision. The agent learns a <b>Q-value</b> Q(state, action) = "total future reward I expect if I do this now," using the <b>Bellman equation</b> Q(s,a) ← r + γ·max Q(s',·).`],
      ['DQN — the three tricks that make deep RL work',
        `<b>1. ε-greedy:</b> early on it acts randomly (explore), then trusts its brain more over time (exploit) — watch ε fall on the Dojo tab. <b>2. Experience replay:</b> it stores past moments and re-learns from random batches, so training isn't dominated by whatever just happened. <b>3. Target network:</b> a slow-moving copy provides stable learning targets so the net isn't chasing its own tail. All three are in <code>dqn.js</code>.`],
      ['Reward shaping = giving an AI a personality / role',
        `The "Shape your chef" sliders change <b>what the agent is rewarded for</b>. Crank 🫧 wash up and it learns to babysit the sink; drop it and it ignores dishes and just serves. This is the seed of the <b>AI teammate</b> idea: before a level you'd set a partner's reward weights to give them a role ("you do dishes, I'll cook").`],
      ['The AI Director — predicting failure before it happens',
        `The Director is <b>supervised</b> learning. From telemetry (time left, distances, dirty dishes, mistakes…) one net predicts <b>P(this order fails)</b> and another predicts the <b>next best action</b> (trained by copying a strong player — "behaviour cloning"). A rule layer turns the risk into decisions: high average risk → <b>ease off</b> (dynamic difficulty); a specific risk → a <b>hint</b> or an <b>AI sous-chef</b> task.`],
      ['Is the AI honest? AUC, calibration & Brier',
        `<b>AUC</b> asks "can it rank a doomed order above a safe one?" (0.5 = coin flip, 1.0 = perfect). <b>Calibration</b> asks "when it says 70%, do ~70% actually fail?" — dots on the diagonal = honest. <b>Brier score</b> is the average squared error of the probabilities (lower is better). Good ML isn't just accurate, it's <i>trustworthy</i> — which is what lets the game act on it.`],
      ['Where this goes next (the roadmap)',
        `This Lab is the foundation. Next: lift the Director into live play as a risk HUD + sous-chef; train the RL chef on the real game's levels; add a real telemetry pipeline so it learns from <i>your</i> games; and a true multi-agent AI partner with role sliders. The full plan lives in <code>docs/ai-lab/README.md</code>.`],
    ];
    $('learnAccordion').innerHTML = items.map(([q, a]) => `<details class="learn"><summary>${q}</summary><div class="body">${a}</div></details>`).join('');
    if ($('learnAccordion').firstChild) $('learnAccordion').firstChild.open = true;
  }

  // ---- tiny canvas helpers --------------------------------------------------
  function roundRect(ctx, x, y, w, h, r) { ctx.beginPath(); ctx.moveTo(x + r, y); ctx.arcTo(x + w, y, x + w, y + h, r); ctx.arcTo(x + w, y + h, x, y + h, r); ctx.arcTo(x, y + h, x, y, r); ctx.arcTo(x, y, x + w, y, r); ctx.closePath(); }
  function badge(ctx, x, y, n, col) { ctx.fillStyle = col; ctx.beginPath(); ctx.arc(x, y, 9, 0, Math.PI * 2); ctx.fill(); ctx.fillStyle = '#06121f'; ctx.font = '700 11px ui-rounded'; ctx.textAlign = 'center'; ctx.textBaseline = 'middle'; ctx.fillText(n, x, y + 0.5); }
  function flash(btn, msg) { const t = btn.textContent; btn.textContent = msg; setTimeout(() => (btn.textContent = t), 900); }

  // ---- boot -----------------------------------------------------------------
  window.addEventListener('DOMContentLoaded', () => {
    buildLearn();
    Dojo.init();
    Director.init();
  });
})();

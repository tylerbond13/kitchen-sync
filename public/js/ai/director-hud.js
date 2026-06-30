// ============================================================================
//  KS DirectorHUD — the in-game AI Director overlay (read-only).
//  ---------------------------------------------------------------------------
//  Loads the pre-trained Director brains (public/assets/ai/director-weights.json),
//  reads the LIVE kitchen state each tick, and renders a compact panel over the
//  game canvas: a failure-risk gauge, the next best action, and a hint.
//
//  Hard rule: this module is purely advisory and must NEVER affect gameplay.
//  app.js calls it inside a try/catch behind `DirectorHUD.enabled`, and every
//  method here is defensive. Off by default; the toggle persists in localStorage.
//
//  Depends on (loaded before app.js): nn.js, director.js, gameTelemetry.js.
// ============================================================================
(function () {
  'use strict';

  const LS_KEY = 'ks-director-hud';
  const WEIGHTS_URL = '/assets/ai/director-weights.json';
  const ACTION_EMOJI = {
    fetch: '🧺', chop: '🔪', cook: '🍳', serve: '🛎️',
    wash: '🫧', tend_stove: '🔥', idle: '✋',
  };
  const RISK_COL = (r) => (r < 0.35 ? '#39B870' : r < 0.7 ? '#F2A93B' : '#E8503A');
  const clamp = (v, a, b) => (v < a ? a : v > b ? b : v);
  const $ = (id) => document.getElementById(id);
  const now = () => (typeof performance !== 'undefined' ? performance.now() : Date.now());

  const HUD = {
    enabled: false,
    _dir: null,          // KSDirector.Director once weights load
    _loading: false,
    _failed: false,
    _rolling: { avgSpeed: 2.5, mistakes: 0, skill: 0.6 },
    _mistakeTimes: [],   // wall-clock ms of recent reject/expire/burn events
    _last: null,         // { t, x, y, delivered, ts }
    _lastRender: 0,
    _inited: false,
  };

  // ── weight loading ────────────────────────────────────────────────────────
  function ensureLoaded() {
    if (HUD._dir || HUD._loading || HUD._failed) return;
    if (typeof window.KSDirector === 'undefined' || typeof fetch === 'undefined') { HUD._failed = true; return; }
    HUD._loading = true;
    fetch(WEIGHTS_URL, { cache: 'force-cache' })
      .then((r) => { if (!r.ok) throw new Error('weights ' + r.status); return r.json(); })
      .then((o) => {
        const fm = new KSDirector.FailureModel();
        const am = new KSDirector.ActionModel();
        fm.loadJSON(o.fm); am.loadJSON(o.am);
        HUD._dir = new KSDirector.Director(fm, am);
        HUD._loading = false;
      })
      .catch(() => { HUD._loading = false; HUD._failed = true; setHint('AI Director unavailable.'); });
  }

  // ── rolling client-side counters (avgSpeed / mistakes30s / skill) ─────────
  function resetRolling() {
    HUD._rolling = { avgSpeed: 2.5, mistakes: 0, skill: 0.6 };
    HUD._mistakeTimes = [];
    HUD._last = null;
  }

  function updateRolling(state, me) {
    const ts = now();
    // count crew mistakes from this tick's events, prune to a 30s window
    if (state.events && state.events.length) {
      for (const ev of state.events) {
        if (ev && (ev.type === 'reject' || ev.type === 'expire' || ev.type === 'burn')) {
          HUD._mistakeTimes.push(ts);
        }
      }
    }
    HUD._mistakeTimes = HUD._mistakeTimes.filter((t) => ts - t < 30000);
    HUD._rolling.mistakes = HUD._mistakeTimes.length;

    if (!me) return;
    const last = HUD._last;
    // a fresh round (clock jumped back up, or first tick) → re-baseline
    if (!last || state.t > last.t + 2) {
      HUD._last = { t: state.t, x: me.x, y: me.y, delivered: me.delivered || 0, ts };
      return;
    }
    if (!state.paused && state.phase === 'playing') {
      const dtSec = (ts - last.ts) / 1000;
      if (dtSec > 0.05) {
        const dist = Math.abs(me.x - last.x) + Math.abs(me.y - last.y); // tiles
        const speed = clamp(dist / dtSec, 0, 6);
        HUD._rolling.avgSpeed = clamp(HUD._rolling.avgSpeed * 0.75 + speed * 0.25, 0, 3.5);
      }
      // skill: nudges up on a serve, down on a mistake, bounded to sim's range
      const served = (me.delivered || 0) - last.delivered;
      if (served > 0) HUD._rolling.skill = clamp(HUD._rolling.skill + 0.06 * served, 0.4, 1);
    }
    HUD._last = { t: state.t, x: me.x, y: me.y, delivered: me.delivered || 0, ts };
  }
  // skill erodes a touch whenever fresh mistakes land
  function decaySkillOnMistake(prevCount) {
    if (HUD._rolling.mistakes > prevCount) {
      HUD._rolling.skill = clamp(HUD._rolling.skill - 0.05 * (HUD._rolling.mistakes - prevCount), 0.4, 1);
    }
  }

  // ── the per-tick entry point (called from app.js, guarded) ────────────────
  function update(state, renderer, myId, curStatic) {
    if (!HUD.enabled || !state) return;
    ensureLoaded();
    const me = (state.players || []).find((p) => p && p.id === myId) || null;

    const prevMistakes = HUD._rolling.mistakes;
    updateRolling(state, me);
    decaySkillOnMistake(prevMistakes);

    if (!HUD._dir) return; // weights still loading — keep collecting rolling data

    // assess + render at ~4 Hz to stay buttery (rolling counters still tick fully)
    const ts = now();
    if (ts - HUD._lastRender < 240) return;
    HUD._lastRender = ts;

    const tel = KSTelemetry.buildLiveTelemetry(state, renderer, myId, HUD._rolling);
    const a = HUD._dir.assess(tel);
    render(a, state);
  }

  // ── rendering ─────────────────────────────────────────────────────────────
  function setHint(text) { const el = $('dh-hint'); if (el) el.textContent = text; }

  function drawGauge(risk) {
    const c = $('dh-gauge'); if (!c) return;
    const ctx = c.getContext('2d'); const W = 86, H = 86;
    const dpr = Math.min(2, (window.devicePixelRatio || 1));
    if (c.width !== W * dpr) { c.width = W * dpr; c.height = H * dpr; }
    ctx.setTransform(dpr, 0, 0, dpr, 0, 0); ctx.clearRect(0, 0, W, H);
    const cx = W / 2, cy = H / 2, r = 32, a0 = Math.PI * 0.75, a1 = Math.PI * 2.25;
    ctx.lineWidth = 9; ctx.lineCap = 'round';
    ctx.strokeStyle = 'rgba(120,120,160,.22)';
    ctx.beginPath(); ctx.arc(cx, cy, r, a0, a1); ctx.stroke();
    const col = RISK_COL(risk);
    ctx.strokeStyle = col;
    ctx.beginPath(); ctx.arc(cx, cy, r, a0, a0 + (a1 - a0) * clamp(risk, 0, 1)); ctx.stroke();
    ctx.fillStyle = col; ctx.font = '700 20px ui-rounded,system-ui,sans-serif';
    ctx.textAlign = 'center'; ctx.textBaseline = 'middle';
    ctx.fillText(Math.round(risk * 100) + '%', cx, cy + 1);
  }

  function render(a, state) {
    const panel = $('director-hud'); if (!panel) return;
    drawGauge(a.risk);
    const actEl = $('dh-action');
    if (actEl) actEl.textContent = (ACTION_EMOJI[a.nextBestAction] || '🤖') + ' ' + a.nextBestActionLabel;
    setHint(a.hint);
    const diff = $('dh-diff');
    if (diff) {
      const m = a.difficulty.mode;
      diff.textContent = m === 'ease' ? '🟢 You’re slammed — ease incoming'
        : m === 'press' ? '🔴 Cruising — pressure rising'
        : '🟡 Balanced';
      diff.className = 'dh-diff ' + m;
    }
  }

  // ── toggle + wiring ───────────────────────────────────────────────────────
  function applyEnabled(on, persist) {
    HUD.enabled = !!on;
    const panel = $('director-hud'); if (panel) panel.hidden = !on;
    const btn = $('btn-director'); if (btn) btn.classList.toggle('active', !!on);
    if (persist) { try { localStorage.setItem(LS_KEY, on ? '1' : '0'); } catch (e) {} }
    if (on) { ensureLoaded(); setHint('Reading the kitchen…'); }
  }
  function toggle() { applyEnabled(!HUD.enabled, true); }

  function init() {
    if (HUD._inited) return; HUD._inited = true;
    let saved = '0';
    try { saved = localStorage.getItem(LS_KEY) || '0'; } catch (e) {}
    const btn = $('btn-director');
    if (btn) btn.addEventListener('click', toggle);
    applyEnabled(saved === '1', false);
  }

  HUD.update = update;
  HUD.toggle = toggle;
  HUD.init = init;
  HUD.resetRolling = resetRolling;
  window.DirectorHUD = HUD;

  if (document.readyState === 'loading') document.addEventListener('DOMContentLoaded', init);
  else init();
})();

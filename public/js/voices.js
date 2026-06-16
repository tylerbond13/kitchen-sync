// Soundboard clips: plays a random clip on character select and on every meal
// delivery. Clips live in public/assets/audio/soundboard-clips/ and are listed
// (flat) in that folder's manifest.json (regenerate with `npm run voices`).
// No clips? Every call below is a graceful no-op, so nothing breaks.
(function () {
  const BASE = 'assets/audio/soundboard-clips/';
  let pool = [];           // array of filenames
  let unlocked = false;
  let el = null;           // single shared channel (a new clip cuts the last)
  let lastAt = 0;

  fetch('/' + BASE + 'manifest.json')
    .then((r) => (r.ok ? r.json() : []))
    .then((list) => { pool = Array.isArray(list) ? list : []; })
    .catch(() => { /* no manifest yet — stay silent */ });

  // Clips are sound-effects: honour the SFX mute toggle, and wait for the first
  // user gesture (browser autoplay policy) before any clip can play.
  function audible() {
    if (!unlocked) return false;
    if (window.SFX && SFX.isMuted && SFX.isMuted()) return false;
    return true;
  }
  function channel() {
    if (!el) { el = new Audio(); el.preload = 'auto'; }
    return el;
  }
  function playRandom() {
    if (!audible() || !pool.length) return;
    const now = Date.now();
    if (now - lastAt < 120) return;   // de-dupe rapid-fire triggers
    lastAt = now;
    const name = pool[(Math.random() * pool.length) | 0];
    try {
      const a = channel();
      a.pause();
      a.src = '/' + BASE + encodeURIComponent(name);   // names may have spaces/()
      a.currentTime = 0;
      a.volume = 0.95;
      a.play().catch(() => {});
    } catch (_) { /* best-effort */ }
  }

  const unlock = () => { unlocked = true; };
  document.addEventListener('pointerdown', unlock, { once: true });
  document.addEventListener('touchstart', unlock, { once: true });

  // A random clip plays on character select AND on every delivery. The chefKey
  // arg is ignored (the pool is global) but kept so existing call sites work.
  window.KSVoices = {
    has() { return pool.length > 0; },
    playSelect() { playRandom(); },
    playDelivery() { playRandom(); },
    play() { playRandom(); },
  };
})();

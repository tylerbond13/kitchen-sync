// Character voice clips: plays a per-character sound on selection and a random
// one when that chef delivers a meal. Clips live in
//   public/assets/audio/voices/<charKey>/[<category>/]*.{mp3,m4a,ogg,wav}
// and are indexed by scripts/gen-voices.js into voices/manifest.json. No files
// yet? Every call below is a graceful no-op, so nothing breaks.
(function () {
  const BASE = 'assets/audio/voices/';
  let manifest = {};
  let unlocked = false;
  let el = null;           // single shared voice channel (a new clip cuts the last)
  let lastAt = 0;

  fetch('/' + BASE + 'manifest.json')
    .then((r) => (r.ok ? r.json() : {}))
    .then((m) => { manifest = m || {}; })
    .catch(() => { /* no manifest yet — stay silent */ });

  // Voices are sound-effects: honour the SFX mute toggle, and wait for the
  // first user gesture (autoplay policy) before any clip can play.
  function audible() {
    if (!unlocked) return false;
    if (window.SFX && SFX.isMuted && SFX.isMuted()) return false;
    return true;
  }
  function channel() {
    if (!el) { el = new Audio(); el.preload = 'auto'; }
    return el;
  }
  function pick(list) {
    return list && list.length ? list[(Math.random() * list.length) | 0] : null;
  }
  // Prefer a named category if the soundboard is organised (e.g. a "greeting"
  // clip on select, a "catchphrase" on delivery); otherwise pull from `all`.
  function clipFor(charKey, prefer) {
    const entry = manifest[charKey];
    if (!entry) return null;
    if (prefer && entry.categories) {
      for (const name of prefer) {
        const c = pick(entry.categories[name]);
        if (c) return c;
      }
    }
    return pick(entry.all);
  }
  function play(charKey, prefer) {
    if (!audible()) return;
    const rel = clipFor(charKey, prefer);
    if (!rel) return;
    const now = Date.now();
    if (now - lastAt < 120) return;   // de-dupe rapid-fire deliveries
    lastAt = now;
    try {
      const a = channel();
      a.pause();
      a.src = '/' + BASE + rel;
      a.currentTime = 0;
      a.volume = 0.9;
      a.play().catch(() => {});
    } catch (_) { /* best-effort */ }
  }

  const unlock = () => { unlocked = true; };
  document.addEventListener('pointerdown', unlock, { once: true });
  document.addEventListener('touchstart', unlock, { once: true });

  window.KSVoices = {
    // Does this character have any clips loaded?
    has(charKey) { const e = manifest[charKey]; return !!(e && e.all && e.all.length); },
    // Played when a player picks this chef in the lobby.
    playSelect(charKey) { play(charKey, ['greeting', 'hello', 'select', 'intro']); },
    // Played when this chef delivers a meal at the window.
    playDelivery(charKey) { play(charKey, ['delivery', 'serve', 'happy', 'catchphrase']); },
    // Generic random clip.
    play(charKey) { play(charKey, null); },
  };
})();

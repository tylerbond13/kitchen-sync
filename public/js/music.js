// Background music — menu and game tracks, independent of the SFX synth.
// Autoplay rules mean nothing plays until the first user gesture; we install
// one-time unlock listeners and replay whatever track was requested.
(function () {
  const TRACKS = {
    menu: 'assets/audio/acrostics.m4a',   // "Acrostics"
    game: 'assets/audio/caketown.mp3',    // "Caketown"
  };
  const VOLUME = 0.5;
  const FADE_MS = 600;

  let muted = JSON.parse(localStorage.getItem('ks-music-muted') || 'false');
  let unlocked = false;
  let suspended = false;                   // a crew-radio track owns the speakers
  let want = 'menu';                       // track that should be playing
  const els = {};                          // name → HTMLAudioElement

  function el(name) {
    if (!els[name]) {
      const a = new Audio('/' + TRACKS[name]);
      a.loop = true;
      a.preload = 'auto';
      a.volume = 0;
      els[name] = a;
    }
    return els[name];
  }

  // Each element owns its fade so a cross-fade's in and out don't cancel.
  function fadeTo(audio, target, then) {
    clearInterval(audio._fade);
    const STEPS = 12;
    const start = audio.volume;
    let i = 0;
    audio._fade = setInterval(() => {
      i++;
      audio.volume = Math.max(0, Math.min(1, start + (target - start) * (i / STEPS)));
      if (i >= STEPS) { clearInterval(audio._fade); if (then) then(); }
    }, FADE_MS / STEPS);
  }

  function apply() {
    if (!unlocked) return;
    for (const [name, a] of Object.entries(els)) {
      if (name !== want && !a.paused) fadeTo(a, 0, () => a.pause());
    }
    if (muted || suspended) {
      const a = els[want];
      if (a && !a.paused) { a.pause(); }
      return;
    }
    const a = el(want);
    if (a.paused) {
      a.volume = 0;
      // play() can still reject (e.g. iOS low-power quirks) — stay graceful
      a.play().then(() => fadeTo(a, VOLUME)).catch(() => {});
    } else {
      fadeTo(a, VOLUME);
    }
  }

  function unlock() {
    if (unlocked) return;
    unlocked = true;
    apply();
  }
  document.addEventListener('pointerdown', unlock, { once: true });
  document.addEventListener('touchstart', unlock, { once: true });

  window.KSMusic = {
    // Switch the active track ('menu' | 'game'). Safe to call repeatedly.
    play(name) {
      if (!TRACKS[name]) return;
      want = name;
      apply();
    },
    isMuted: () => muted,
    // While the crew radio plays a YouTube track the local soundtrack stays
    // silent; releasing resumes whatever screen music was due.
    suspend(on) {
      if (suspended === !!on) return;
      suspended = !!on;
      apply();
    },
    toggleMute() {
      muted = !muted;
      localStorage.setItem('ks-music-muted', JSON.stringify(muted));
      apply();
      return muted;
    },
  };
})();

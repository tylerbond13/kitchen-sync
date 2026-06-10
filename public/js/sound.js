// Tiny WebAudio synth — no audio assets needed.
(function () {
  let ctx = null;
  let muted = JSON.parse(localStorage.getItem('ks-muted') || 'false');

  function ac() {
    if (!ctx) ctx = new (window.AudioContext || window.webkitAudioContext)();
    if (ctx.state === 'suspended') ctx.resume();
    return ctx;
  }

  function tone({ freq = 440, type = 'sine', dur = 0.12, vol = 0.18, slide = 0, delay = 0 }) {
    if (muted) return;
    try {
      const a = ac();
      const t0 = a.currentTime + delay;
      const osc = a.createOscillator();
      const gain = a.createGain();
      osc.type = type;
      osc.frequency.setValueAtTime(freq, t0);
      if (slide) osc.frequency.exponentialRampToValueAtTime(Math.max(40, freq + slide), t0 + dur);
      gain.gain.setValueAtTime(vol, t0);
      gain.gain.exponentialRampToValueAtTime(0.001, t0 + dur);
      osc.connect(gain).connect(a.destination);
      osc.start(t0);
      osc.stop(t0 + dur + 0.02);
    } catch { /* audio is best-effort */ }
  }

  function noise({ dur = 0.08, vol = 0.1, delay = 0 }) {
    if (muted) return;
    try {
      const a = ac();
      const t0 = a.currentTime + delay;
      const buf = a.createBuffer(1, a.sampleRate * dur, a.sampleRate);
      const d = buf.getChannelData(0);
      for (let i = 0; i < d.length; i++) d[i] = (Math.random() * 2 - 1) * (1 - i / d.length);
      const src = a.createBufferSource();
      src.buffer = buf;
      const gain = a.createGain();
      gain.gain.setValueAtTime(vol, t0);
      src.connect(gain).connect(a.destination);
      src.start(t0);
    } catch { /* ignore */ }
  }

  window.SFX = {
    unlock() { try { ac(); } catch {} },
    isMuted: () => muted,
    toggleMute() {
      muted = !muted;
      localStorage.setItem('ks-muted', JSON.stringify(muted));
      return muted;
    },
    tap()    { tone({ freq: 660, dur: 0.05, vol: 0.08, type: 'triangle' }); },
    pickup() { tone({ freq: 520, dur: 0.08, vol: 0.12, type: 'triangle', slide: 240 }); },
    place()  { tone({ freq: 380, dur: 0.07, vol: 0.12, type: 'triangle', slide: -120 }); },
    chop()   { noise({ dur: 0.05, vol: 0.14 }); tone({ freq: 220, dur: 0.04, vol: 0.1, type: 'square' }); },
    chopped(){ tone({ freq: 740, dur: 0.1, vol: 0.12, type: 'triangle', slide: 200 }); },
    plate()  { tone({ freq: 600, dur: 0.07, vol: 0.1 }); tone({ freq: 900, dur: 0.08, vol: 0.1, delay: 0.06 }); },
    sizzle() { noise({ dur: 0.3, vol: 0.06 }); },
    ding()   { tone({ freq: 1175, dur: 0.4, vol: 0.16 }); tone({ freq: 1568, dur: 0.5, vol: 0.1, delay: 0.08 }); },
    serve()  { [523, 659, 784, 1047].forEach((f, i) => tone({ freq: f, dur: 0.14, vol: 0.14, type: 'triangle', delay: i * 0.07 })); },
    reject() { tone({ freq: 180, dur: 0.15, vol: 0.14, type: 'square', slide: -60 }); },
    burn()   { noise({ dur: 0.4, vol: 0.14 }); tone({ freq: 140, dur: 0.4, vol: 0.16, type: 'sawtooth', slide: -70 }); },
    expire() { tone({ freq: 330, dur: 0.18, vol: 0.14, type: 'square', slide: -160 }); tone({ freq: 220, dur: 0.25, vol: 0.12, type: 'square', slide: -100, delay: 0.15 }); },
    order()  { tone({ freq: 880, dur: 0.09, vol: 0.1 }); tone({ freq: 1108, dur: 0.12, vol: 0.1, delay: 0.09 }); },
    trash()  { noise({ dur: 0.12, vol: 0.12 }); },
    star(i)  { tone({ freq: 784 + i * 196, dur: 0.35, vol: 0.16, type: 'triangle' }); },
    over()   { [784, 659, 523, 392].forEach((f, i) => tone({ freq: f, dur: 0.2, vol: 0.12, type: 'triangle', delay: i * 0.12 })); },
  };
})();

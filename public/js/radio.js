// Crew Radio — one shared YouTube jukebox per kitchen.
// The server owns {videoId, startedAt, paused}; every phone plays the same
// thing, seeked to the same position. Anyone can DJ; changes hit everyone.
(function () {
  const PRESETS = [
    { id: 'jfKfPfyJRdk', title: 'Lofi Beats 📻', live: true },
    { id: '4xDzrJKXOOY', title: 'Synthwave 🌆', live: true },
    { id: 'Dx5qFachd3A', title: 'Jazz Café ☕', live: true },
  ];

  let player = null;
  let apiReady = false;
  let unlocked = false;     // user gesture given (autoplay rules)
  let current = null;       // latest radio state from server
  let clockOffset = 0;      // serverNow - clientNow
  let sendCmd = () => {};
  let onStateChange = () => {};
  let pendingSync = false;
  let volume = Number(localStorage.getItem('ks-radio-vol') || 60);

  function loadApi() {
    if (window.YT && window.YT.Player) { apiReady = true; return; }
    if (document.getElementById('yt-api')) return;
    const tag = document.createElement('script');
    tag.id = 'yt-api';
    tag.src = 'https://www.youtube.com/iframe_api';
    document.head.appendChild(tag);
    window.onYouTubeIframeAPIReady = () => {
      apiReady = true;
      if (pendingSync) sync();
    };
  }

  function ensurePlayer(cb) {
    if (player) return cb();
    if (!apiReady) { pendingSync = true; loadApi(); return; }
    player = new YT.Player('radio-frame', {
      width: '120', height: '68',
      playerVars: { playsinline: 1, controls: 0, disablekb: 1, rel: 0 },
      events: {
        onReady() {
          player.setVolume(volume);
          cb();
        },
        onStateChange(e) {
          // surface title once the video loads
          if (e.data === YT.PlayerState.PLAYING && current && !current.title) {
            const d = player.getVideoData && player.getVideoData();
            if (d && d.title) onStateChange({ type: 'title', title: d.title });
          }
        },
      },
    });
  }

  function targetPosition() {
    if (!current) return 0;
    if (current.paused) return Math.max(0, (current.pausedAt - current.startedAt) / 1000);
    return Math.max(0, (Date.now() + clockOffset - current.startedAt) / 1000);
  }

  function sync() {
    if (!current || !unlocked) return;
    pendingSync = false;
    ensurePlayer(() => {
      const d = player.getVideoData && player.getVideoData();
      const pos = targetPosition();
      if (!d || d.video_id !== current.videoId) {
        player.loadVideoById(current.videoId, pos);
      } else {
        const drift = Math.abs((player.getCurrentTime() || 0) - pos);
        if (drift > 2.5) player.seekTo(pos, true);
      }
      if (current.paused) player.pauseVideo();
      else player.playVideo();
    });
  }

  // gentle drift correction for non-live videos
  setInterval(() => {
    if (current && !current.paused && unlocked && player && player.getPlayerState
        && player.getPlayerState() === 1) {
      const drift = Math.abs(player.getCurrentTime() - targetPosition());
      if (drift > 3) player.seekTo(targetPosition(), true);
    }
  }, 7000);

  function parseYouTube(input) {
    const s = String(input || '').trim();
    const m = s.match(/(?:youtu\.be\/|v=|\/shorts\/|\/live\/|^)([\w-]{11})(?:[?&#]|$)/);
    return m ? m[1] : null;
  }

  window.KSRadio = {
    PRESETS,
    init(opts) {
      sendCmd = opts.send;
      onStateChange = opts.onChange || (() => {});
      loadApi();
    },
    // server state arrived (join ack or broadcast)
    update(payload) {
      if (!payload) return;
      clockOffset = payload.now ? payload.now - Date.now() : 0;
      current = payload.radio;
      if (!current && player) player.stopVideo();
      if (current) sync();
      onStateChange({ type: 'state', radio: current, unlocked });
    },
    // the one-time tap that satisfies autoplay policies
    unlock() {
      unlocked = true;
      sync();
      onStateChange({ type: 'state', radio: current, unlocked });
    },
    isUnlocked: () => unlocked,
    state: () => current,
    play(input, title) {
      const id = parseYouTube(input);
      if (!id) return false;
      sendCmd({ action: 'play', videoId: id, title: title || '' });
      return true;
    },
    pause() { sendCmd({ action: 'pause' }); },
    resume() { sendCmd({ action: 'resume' }); },
    stop() { sendCmd({ action: 'stop' }); },
    setVolume(v) {
      volume = Math.max(0, Math.min(100, v));
      localStorage.setItem('ks-radio-vol', String(volume));
      if (player) player.setVolume(volume);
    },
    volume: () => volume,
  };
})();

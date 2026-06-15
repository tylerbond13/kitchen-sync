// Crew Radio: shared YouTube playback for one kitchen.
(function () {
  let player = null;
  let apiReady = false;
  let playerReady = false;
  let unlocked = false;
  let current = null;
  let queue = [];
  let clockOffset = 0;
  let sendCmd = () => {};
  let onStateChange = () => {};
  let pendingSync = false;
  let readyCallbacks = [];
  let volume = Number(localStorage.getItem('ks-radio-vol') || 60);
  let muted = JSON.parse(localStorage.getItem('ks-radio-muted') || 'false');

  function loadApi() {
    if (window.YT && window.YT.Player) {
      apiReady = true;
      return;
    }
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
    if (!document.getElementById('radio-frame')) {
      const shell = document.createElement('div');
      shell.id = 'radio-frame';
      shell.style.cssText = 'position:fixed;left:-220px;top:-140px;width:160px;height:90px;overflow:hidden;opacity:.01;pointer-events:none;';
      document.body.appendChild(shell);
    }
    if (player && playerReady) return cb();
    if (player) {
      readyCallbacks.push(cb);
      return;
    }
    if (!apiReady) {
      pendingSync = true;
      loadApi();
      return;
    }
    readyCallbacks.push(cb);
    player = new YT.Player('radio-frame', {
      width: '160',
      height: '90',
      playerVars: { playsinline: 1, controls: 0, disablekb: 1, rel: 0, origin: location.origin },
      events: {
        onReady() {
          playerReady = true;
          player.setVolume(volume);
          if (muted) player.mute();
          const callbacks = readyCallbacks.splice(0);
          callbacks.forEach((fn) => fn());
        },
        onStateChange(e) {
          if (e.data === YT.PlayerState.ENDED && current) {
            sendCmd({ action: 'ended', videoId: current.videoId });
          }
          if (e.data === YT.PlayerState.PLAYING && current && !current.title) {
            const data = player.getVideoData && player.getVideoData();
            if (data && data.title) onStateChange({ type: 'title', title: data.title });
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
      const data = player.getVideoData && player.getVideoData();
      const pos = targetPosition();
      if (!data || data.video_id !== current.videoId) {
        player.loadVideoById(current.videoId, pos);
      } else {
        const drift = Math.abs((player.getCurrentTime() || 0) - pos);
        if (drift > 2.5) player.seekTo(pos, true);
      }
      if (current.paused) player.pauseVideo();
      else { player.playVideo(); nudgePlay(current.videoId); }
    });
  }

  // First-track autoplay nudge: when a round promotes the first queued song,
  // loadVideoById + playVideo sometimes leaves the player CUED/UNSTARTED (a
  // YouTube autoplay quirk when playback isn't tied to a fresh tap) — the song
  // would only start once you hit Next. Re-issue playVideo a few times until it
  // actually reaches PLAYING, so the first queued song starts on its own.
  function nudgePlay(videoId, tries) {
    tries = tries || 0;
    if (tries >= 5) return;
    setTimeout(() => {
      if (!current || current.videoId !== videoId || current.paused || !unlocked) return;
      if (!player || !player.getPlayerState) return;
      const st = player.getPlayerState();           // 1 = PLAYING, 3 = BUFFERING
      if (st === 1 || st === 3) return;
      player.playVideo();
      nudgePlay(videoId, tries + 1);
    }, 600);
  }

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
    init(opts) {
      sendCmd = opts.send;
      onStateChange = opts.onChange || (() => {});
      loadApi();
    },
    update(payload) {
      if (!payload) return;
      clockOffset = payload.now ? payload.now - Date.now() : 0;
      current = payload.radio;
      queue = payload.queue || [];
      if (!current && player && player.stopVideo) player.stopVideo();
      if (current) sync();
      onStateChange({ type: 'state', radio: current, queue, unlocked });
    },
    unlock() {
      unlocked = true;
      ensurePlayer(() => {});
      sync();
      onStateChange({ type: 'state', radio: current, queue, unlocked });
    },
    isUnlocked: () => unlocked,
    state: () => current,
    queue: () => queue.slice(),
    play(input, title) {
      const id = parseYouTube(input);
      if (!id) return false;
      sendCmd({ action: 'play', videoId: id, title: title || '' });
      return true;
    },
    enqueue(track) { sendCmd({ action: 'enqueue', track }); },
    remove(id) { sendCmd({ action: 'remove', id }); },
    clear() { sendCmd({ action: 'clear' }); },
    skip() { sendCmd({ action: 'skip' }); },
    pause() { sendCmd({ action: 'pause' }); },
    resume() { sendCmd({ action: 'resume' }); },
    stop() { sendCmd({ action: 'stop' }); },
    setVolume(v) {
      volume = Math.max(0, Math.min(100, v));
      localStorage.setItem('ks-radio-vol', String(volume));
      if (player && player.setVolume) player.setVolume(volume);
    },
    volume: () => volume,
    // local mute: this phone opts out of the crew radio without affecting
    // anyone else (the track keeps advancing for the room)
    isMuted: () => muted,
    toggleMute() {
      muted = !muted;
      localStorage.setItem('ks-radio-muted', JSON.stringify(muted));
      if (player && playerReady) {
        if (muted) player.mute();
        else player.unMute();
      }
      onStateChange({ type: 'state', radio: current, queue, unlocked });
      return muted;
    },
  };
})();

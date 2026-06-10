// Kitchen Sync app: profile, screens, socket flow, game wiring.
(function () {
  const AVATARS = ['🧑‍🍳', '👩‍🍳', '👨‍🍳', '🦊', '🐱', '🐼', '🐸', '🦁', '🐙', '🤖', '🦄', '🐻'];
  const $ = (id) => document.getElementById(id);

  // ---------- profile (device identity) ----------
  // ?guest makes the identity per-tab instead of per-device, so you can test
  // multiplayer with extra windows on one machine (each tab = its own chef).
  const IS_GUEST = new URLSearchParams(location.search).has('guest');
  const profileStore = IS_GUEST ? sessionStorage : localStorage;
  function loadProfile() {
    let p = null;
    try { p = JSON.parse(profileStore.getItem('ks-profile')); } catch {}
    if (!p || !p.id) {
      p = {
        id: (crypto.randomUUID ? crypto.randomUUID() : 'p-' + Math.random().toString(36).slice(2) + Date.now()),
        name: '',
        avatar: AVATARS[Math.floor(Math.random() * AVATARS.length)],
      };
    }
    return p;
  }
  const profile = loadProfile();
  function saveProfile() {
    profileStore.setItem('ks-profile', JSON.stringify(profile));
  }
  saveProfile();

  // ---------- screens ----------
  function show(name) {
    document.querySelectorAll('.screen').forEach((s) => s.classList.remove('active'));
    $(`screen-${name}`).classList.add('active');
  }

  let toastTimer = null;
  function toast(msg, ms = 2600) {
    const el = $('toast');
    el.textContent = msg;
    el.hidden = false;
    clearTimeout(toastTimer);
    toastTimer = setTimeout(() => { el.hidden = true; }, ms);
  }

  // ---------- quick picks (the Bond crew) ----------
  const FAMILY = [
    { name: 'Eric', avatar: '🦁' },
    { name: 'Stephanie', avatar: '🦊' },
    { name: 'Tyler', avatar: '🐻' },
    { name: 'Logan', avatar: '🐸' },
    { name: 'Natalie', avatar: '🦄' },
    { name: 'Nathan', avatar: '🤖' },
  ];
  const picksEl = $('quick-picks');
  FAMILY.forEach((f) => {
    const chip = document.createElement('button');
    chip.className = 'quick-pick';
    chip.innerHTML = `<span class="qp-face">${f.avatar}</span>${f.name}`;
    chip.onclick = () => {
      profile.name = f.name;
      profile.avatar = f.avatar;
      $('name-input').value = f.name;
      saveProfile();
      refreshPicker();
      SFX.unlock(); SFX.tap();
      sendHello();
    };
    picksEl.appendChild(chip);
  });

  // ---------- avatar picker ----------
  const grid = $('avatar-grid');
  AVATARS.forEach((a) => {
    const cell = document.createElement('button');
    cell.className = 'avatar-cell';
    cell.textContent = a;
    cell.onclick = () => {
      profile.avatar = a;
      saveProfile();
      refreshPicker();
      SFX.unlock(); SFX.tap();
      sendHello();
    };
    grid.appendChild(cell);
  });
  $('name-input').value = profile.name;
  $('name-input').addEventListener('change', () => {
    profile.name = $('name-input').value.trim().slice(0, 14);
    saveProfile();
    refreshPicker();
    sendHello();
  });

  function refreshPicker() {
    grid.querySelectorAll('.avatar-cell').forEach((c) =>
      c.classList.toggle('sel', c.textContent === profile.avatar));
    picksEl.querySelectorAll('.quick-pick').forEach((c, i) =>
      c.classList.toggle('sel', FAMILY[i].name === profile.name && FAMILY[i].avatar === profile.avatar));
  }
  refreshPicker();

  function requireName() {
    profile.name = $('name-input').value.trim().slice(0, 14);
    saveProfile();
    if (!profile.name) {
      toast('Pick a name first, chef! 👆');
      $('name-input').focus();
      return false;
    }
    return true;
  }

  // ---------- socket ----------
  const socket = io({ transports: ['websocket', 'polling'] });
  let myCode = sessionStorage.getItem('ks-code') || null;
  let lobby = null;
  let renderer = null;
  let iAmHost = false;

  socket.on('connect', () => {
    $('connection-banner').hidden = true;
    sendHello();
    if (myCode) joinCrew(myCode, true); // auto-rejoin after reconnect
  });
  socket.on('disconnect', () => {
    $('connection-banner').hidden = false;
  });

  function sendHello() {
    if (!socket.connected) return;
    socket.emit('hello', profile, (res) => {
      if (res && res.ok) {
        savePlayerBackup(res.player);
        renderProfileStats(res.player);
      }
    });
  }

  function renderProfileStats(player) {
    const s = player && player.stats;
    if (!s || !s.levelsPlayed) {
      $('profile-stats').textContent = 'New chef — no service record yet.';
      return;
    }
    $('profile-stats').textContent =
      `🍽️ ${s.mealsDelivered} meals served · ⭐ ${s.starsEarned} stars · 🎮 ${s.levelsPlayed} rounds`;
  }

  // ---------- create / join ----------
  $('btn-create').onclick = () => {
    if (!requireName()) return;
    SFX.unlock(); SFX.tap();
    socket.emit('create_crew', profile, (res) => {
      if (res.error) return toast(res.error);
      joinCrew(res.code);
    });
  };

  $('btn-show-join').onclick = () => {
    SFX.unlock(); SFX.tap();
    show('join');
    setTimeout(() => $('code-input').focus(), 50);
  };

  $('btn-join').onclick = () => {
    if (!requireName()) { show('home'); return; }
    const code = $('code-input').value.trim().toUpperCase();
    if (code.length !== 4) return toast('Codes are 4 letters.');
    SFX.tap();
    joinCrew(code);
  };
  $('code-input').addEventListener('keydown', (e) => {
    if (e.key === 'Enter') $('btn-join').click();
  });

  document.querySelectorAll('[data-back]').forEach((b) => {
    b.onclick = () => show(b.dataset.back);
  });

  // ---------- tutorial ----------
  let tutReturn = 'home';
  function openTutorial(from) {
    tutReturn = from;
    SFX.unlock(); SFX.tap();
    show('tutorial');
  }
  $('btn-how-home').onclick = () => openTutorial('home');
  $('btn-how-lobby').onclick = () => openTutorial('lobby');
  document.querySelectorAll('.tut-back').forEach((b) => {
    b.onclick = () => { SFX.tap(); show(tutReturn); };
  });

  // device backups: every phone carries the crew's progress + own stats, so a
  // fresh server (free hosting restarts) can be restored by any member.
  function readBackup(key) {
    try { return JSON.parse(localStorage.getItem(key)); } catch { return null; }
  }
  function saveCrewBackup(crew) {
    if (crew && crew.code) {
      try { localStorage.setItem(`ks-crew-${crew.code}`, JSON.stringify(crew)); } catch {}
    }
  }
  function savePlayerBackup(player) {
    if (player && player.stats) {
      try { localStorage.setItem('ks-player-backup', JSON.stringify(player)); } catch {}
    }
  }

  function joinCrew(code, silent = false) {
    socket.emit('join', {
      code,
      profile,
      crewBackup: readBackup(`ks-crew-${(code || '').toUpperCase().trim()}`),
      playerBackup: readBackup('ks-player-backup'),
    }, (res) => {
      if (res.error) {
        if (!silent) toast(res.error);
        if (silent) { myCode = null; sessionStorage.removeItem('ks-code'); }
        return;
      }
      myCode = res.code;
      sessionStorage.setItem('ks-code', myCode);
      saveCrewBackup(res.crew);
      savePlayerBackup(res.player);
      renderLobby(res.lobby);
      if (res.game) {
        // a round is already running — jump in
        startRound(res.game);
      } else {
        // no live round: if we were stuck on a dead game screen (round ended
        // or server restarted while we were disconnected), return to lobby
        if (document.getElementById('screen-game').classList.contains('active')) {
          if (renderer) { renderer.destroy(); renderer = null; }
          clearInterval(hintTimer);
          ticketEls.clear();
          toast('That round wrapped up — back to the kitchen!');
        }
        show('lobby');
      }
    });
  }

  $('btn-leave').onclick = () => {
    socket.emit('leave');
    myCode = null;
    sessionStorage.removeItem('ks-code');
    show('home');
    sendHello();
  };

  $('btn-share').onclick = async () => {
    const url = `${location.origin}/?join=${myCode}`;
    const text = `Join my kitchen in Kitchen Sync! Code: ${myCode}`;
    if (navigator.share) {
      try { await navigator.share({ title: 'Kitchen Sync', text, url }); } catch {}
    } else {
      try {
        await navigator.clipboard.writeText(`${text} ${url}`);
        toast('Invite link copied! 📋');
      } catch {
        toast(url, 5000);
      }
    }
  };

  // ---------- lobby ----------
  socket.on('lobby', (state) => {
    if (state.code !== myCode) return;
    renderLobby(state);
  });

  function renderLobby(state) {
    lobby = state;
    iAmHost = state.hostId === profile.id;
    $('lobby-code').textContent = state.code;

    const online = state.players.filter((p) => p.connected);
    $('crew-count').textContent = `· ${online.length} cooking`;
    $('member-row').innerHTML = '';
    for (const p of state.players) {
      const el = document.createElement('div');
      el.className = 'member' + (p.connected ? '' : ' offline');
      el.innerHTML = `<div class="member-face">${p.avatar}${p.id === state.hostId ? '<span class="host-badge">👑</span>' : ''}</div>
        <div class="member-name">${escapeHtml(p.id === profile.id ? 'You' : p.name)}</div>`;
      $('member-row').appendChild(el);
    }

    $('level-list').innerHTML = '';
    for (const lvl of state.levels) {
      const row = document.createElement('div');
      row.className = 'level-row' + (lvl.unlocked ? '' : ' locked');
      const stars = [1, 2, 3].map((i) => `<span class="${lvl.stars >= i ? '' : 'off'}">★</span>`).join('');
      row.innerHTML = `
        <div class="level-emoji">${lvl.unlocked ? lvl.emoji : '🔒'}</div>
        <div class="level-info">
          <div class="level-name">${lvl.n}. ${lvl.name}</div>
          <div class="level-blurb">${lvl.blurb}</div>
          <div class="level-stars">${stars}${lvl.bestScore ? ` <span class="muted small">best ${lvl.bestScore}</span>` : ''}</div>
        </div>
        ${iAmHost && lvl.unlocked ? '<div class="level-play">Play</div>' : ''}`;
      if (iAmHost && lvl.unlocked) {
        row.onclick = () => {
          SFX.tap();
          socket.emit('start_game', lvl.id, (res) => {
            if (res && res.error) toast(res.error);
          });
        };
      }
      $('level-list').appendChild(row);
    }

    $('lobby-hint').textContent = !iAmHost
      ? `Waiting for ${nameOf(state.hostId)} to pick a level…`
      : online.length === 1
        ? 'Cook solo, or share the code 📤 to add chefs — tap a level to start!'
        : 'You’re the host — tap a level to start cooking!';
  }

  function nameOf(id) {
    const p = lobby && lobby.players.find((x) => x.id === id);
    return p ? p.name : 'the host';
  }

  function escapeHtml(s) {
    return String(s).replace(/[&<>"']/g, (c) => ({ '&': '&amp;', '<': '&lt;', '>': '&gt;', '"': '&quot;', "'": '&#39;' }[c]));
  }

  // ---------- game ----------
  const HINTS = [
    'Tap a crate to grab an ingredient',
    'Tap a cutting board to chop — stay close while you work!',
    'Tap the stove to cook. Don’t let it burn! 🔥',
    'Grab a plate, tap counters to combine, then tap the green window to serve',
  ];
  let hintIdx = 0;
  let hintTimer = null;

  socket.on('game_start', (staticState) => {
    startRound(staticState);
  });

  function startRound(staticState) {
    if (renderer) renderer.destroy();
    show('game');
    $('pause-overlay').hidden = true;
    $('orders-strip').innerHTML = '';
    renderer = new KSRender.Renderer($('game-canvas'), staticState, profile.id, (x, y) => {
      SFX.tap();
      socket.emit('tap', { x, y });
    });
    // canvas wrap is now visible & sized
    requestAnimationFrame(() => renderer.resize());
    hintIdx = 0;
    $('game-hint').textContent = HINTS[0];
    clearInterval(hintTimer);
    hintTimer = setInterval(() => {
      hintIdx = (hintIdx + 1) % HINTS.length;
      $('game-hint').textContent = HINTS[hintIdx];
    }, 7000);
    updateMuteBtn();
    $('btn-pause').style.display = '';
  }

  const SOUND_FOR = {
    pickup: 'pickup', place: 'place', plate: 'plate', chopped: 'chopped',
    sizzle: 'sizzle', ding: 'ding', serve: 'serve', reject: 'reject',
    burn: 'burn', expire: 'expire', order: 'order', trash: 'trash',
  };

  socket.on('state', (state) => {
    if (!renderer) return;
    renderer.update(state);

    // HUD
    const m = Math.floor(state.t / 60), s = state.t % 60;
    const timerEl = $('hud-timer');
    timerEl.textContent = `⏱ ${m}:${String(s).padStart(2, '0')}`;
    timerEl.classList.toggle('low', state.t <= 20 && state.phase === 'playing');
    $('hud-score').textContent = `🪙 ${state.score}`;
    const comboEl = $('hud-combo');
    comboEl.hidden = state.combo < 2;
    comboEl.textContent = `🔥 x${state.combo}`;
    $('pause-overlay').hidden = !state.paused;
    if (state.paused) {
      $('pause-byline').textContent = state.pausedBy
        ? `${state.pausedBy} paused the game — anyone can resume.`
        : 'Anyone can resume.';
    }

    renderOrders(state.orders);

    for (const ev of state.events) {
      const fn = SOUND_FOR[ev.type];
      if (fn && SFX[fn]) {
        // only play personal feedback sounds for my own actions
        const personal = ['pickup', 'place', 'plate', 'reject', 'trash'];
        if (personal.includes(ev.type) && ev.playerId !== profile.id) continue;
        SFX[fn]();
      }
      if (ev.type === 'reject' && ev.playerId === profile.id) {
        if (navigator.vibrate) navigator.vibrate(60);
      }
    }
  });

  const ticketEls = new Map();
  function renderOrders(orders) {
    const strip = $('orders-strip');
    const seen = new Set();
    for (const o of orders) {
      seen.add(o.id);
      let el = ticketEls.get(o.id);
      if (!el) {
        el = document.createElement('div');
        el.className = 'ticket';
        el.innerHTML = `
          <div class="ticket-head"><span class="t-emoji">${o.emoji}</span><span>${o.name}</span></div>
          <div class="ticket-needs">${o.needs.map(KSRender.tokenHtml).join(' ')}</div>
          <div class="ticket-bar"><i></i></div>`;
        strip.appendChild(el);
        ticketEls.set(o.id, el);
      }
      const frac = o.ttl / o.ttlMax;
      el.querySelector('.ticket-bar i').style.width = `${Math.max(frac * 100, 2)}%`;
      el.classList.toggle('warn', frac < 0.5 && frac >= 0.25);
      el.classList.toggle('urgent', frac < 0.25);
    }
    for (const [id, el] of ticketEls) {
      if (!seen.has(id)) {
        el.remove();
        ticketEls.delete(id);
      }
    }
  }

  $('btn-pause').onclick = () => socket.emit('pause', true);
  $('btn-resume').onclick = () => socket.emit('pause', false);

  $('btn-mute').onclick = () => {
    SFX.toggleMute();
    updateMuteBtn();
  };
  function updateMuteBtn() {
    $('btn-mute').textContent = SFX.isMuted() ? '🔇' : '🔊';
  }

  // ---------- results ----------
  socket.on('game_over', (results) => {
    saveCrewBackup(results.crew);
    clearInterval(hintTimer);
    if (renderer) { renderer.destroy(); renderer = null; }
    ticketEls.clear();
    show('results');
    SFX.over();

    $('results-title').textContent = results.stars === 3 ? 'Perfection! 👑'
      : results.stars === 2 ? 'Great service!'
      : results.stars === 1 ? 'Order up!'
      : 'Kitchen nightmare… 😅';
    $('results-score').textContent = '0';
    $('results-stats').innerHTML =
      `<span>🍽️ ${results.delivered} served</span><span>💨 ${results.missed} missed</span>`;

    const rp = $('results-players');
    rp.innerHTML = '';
    for (const p of results.players.sort((a, b) => b.delivered - a.delivered)) {
      const el = document.createElement('div');
      el.className = 'rp';
      el.innerHTML = `<span class="face">${p.avatar}</span><span>${escapeHtml(p.name)}</span><span class="muted">${p.delivered} 🍽️</span>`;
      rp.appendChild(el);
    }

    // animate score count-up then star pops
    document.querySelectorAll('.stars-row .star').forEach((s) => s.classList.remove('lit'));
    const target = results.score;
    const t0 = performance.now();
    function count(now) {
      const f = Math.min((now - t0) / 900, 1);
      $('results-score').textContent = Math.round(target * (1 - Math.pow(1 - f, 3)));
      if (f < 1) requestAnimationFrame(count);
      else {
        for (let i = 0; i < results.stars; i++) {
          setTimeout(() => {
            const star = document.querySelector(`.stars-row .star[data-i="${i}"]`);
            if (star) star.classList.add('lit');
            SFX.star(i);
            if (navigator.vibrate) navigator.vibrate(40);
          }, 250 + i * 450);
        }
      }
    }
    requestAnimationFrame(count);
    sendHello(); // refresh lifetime stats
  });

  $('btn-results-done').onclick = () => {
    SFX.tap();
    show('lobby');
  };

  // ---------- deep link & boot ----------
  const params = new URLSearchParams(location.search);
  const joinParam = (params.get('join') || '').toUpperCase();
  if (joinParam && /^[A-Z]{4}$/.test(joinParam)) {
    $('code-input').value = joinParam;
    if (profile.name) {
      // returning player with a profile: join straight away once connected
      socket.on('connect', function autoJoin() {
        socket.off('connect', autoJoin);
        joinCrew(joinParam);
      });
    } else {
      show('home');
      toast(`Pick your chef, then you’ll join kitchen ${joinParam}!`, 4000);
      $('btn-create').style.display = 'none';
      $('btn-show-join').textContent = `Join Kitchen ${joinParam}`;
      $('btn-show-join').classList.remove('btn-secondary');
      $('btn-show-join').classList.add('btn-primary');
      $('btn-show-join').onclick = () => {
        if (requireName()) joinCrew(joinParam);
      };
    }
  }

  // PWA service worker
  if ('serviceWorker' in navigator) {
    navigator.serviceWorker.register('/sw.js').catch(() => {});
  }

  document.addEventListener('touchstart', () => SFX.unlock(), { once: true });
})();

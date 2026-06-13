// Kitchen Sync app: profile, screens, socket flow, game wiring.
(function () {
  const $ = (id) => document.getElementById(id);
  const CHEFS = (window.KS_CHEFS || []).filter((c) => c && c.key && hasAsset(c.key));
  if (!CHEFS.length) CHEFS.push({ key: 'chef', name: 'Chef' });

  function hasAsset(key) {
    const ent = window.ASSETS && window.ASSETS[key];
    return typeof ent === 'string' || !!(ent && ent.path);
  }

  function chefChoice(key) {
    return CHEFS.find((c) => c.key === key) || CHEFS[0];
  }

  function chefPath(key) {
    const ent = window.ASSETS && window.ASSETS[chefChoice(key).key];
    return typeof ent === 'string' ? ent : ent && ent.path;
  }

  // Sheet-cropped chefs (obama/britney) must show the game's prepared frame,
  // not the raw 16-pose sheet. GFX crops/keys/trims asynchronously, so serve
  // a blank until the canvas is ready, then fill every pending <img>.
  const SPRITE_BLANK = 'data:image/gif;base64,R0lGODlhAQABAIAAAAAAAP///yH5BAEAAAAALAAAAAABAAEAAAIBRAA7';
  const chefSpriteCache = {};
  let chefSpriteTimer = null;
  function chefSpriteSrc(key) {
    if (chefSpriteCache[key]) return chefSpriteCache[key];
    const sprite = window.GFX && window.GFX.img(key);
    if (sprite && sprite.width) {
      chefSpriteCache[key] = sprite.toDataURL();
      return chefSpriteCache[key];
    }
    if (!chefSpriteTimer) {
      chefSpriteTimer = setTimeout(() => {
        chefSpriteTimer = null;
        document.querySelectorAll('img[data-chef-sprite]').forEach((el) => {
          const src = chefSpriteSrc(el.dataset.chefSprite);
          if (src !== SPRITE_BLANK) {
            el.src = src;
            el.removeAttribute('data-chef-sprite');
          }
        });
      }, 200);
    }
    return SPRITE_BLANK;
  }

  function chefImgHtml(key, cls = 'chef-face-img') {
    const choice = chefChoice(key);
    const path = chefPath(choice.key);
    if (!path) return '';
    const ent = window.ASSETS && window.ASSETS[choice.key];
    if (ent && typeof ent === 'object' && ent.crop) {
      const src = chefSpriteSrc(choice.key);
      const pending = src === SPRITE_BLANK ? ` data-chef-sprite="${choice.key}"` : '';
      return `<img class="${cls}" src="${src}"${pending} alt="${escapeHtml(choice.name)}" draggable="false">`;
    }
    return `<img class="${cls}" src="/${path}" alt="${escapeHtml(choice.name)}" draggable="false">`;
  }

  function playerFaceHtml(player, cls = 'chef-face-img') {
    return chefImgHtml(player && player.chef, cls) || chefImgHtml('chef', cls);
  }

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
        chef: 'chef',
      };
    }
    p.chef = chefChoice(p.chef).key;
    p.avatar = p.avatar || '';
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
    // Acrostics everywhere except live rounds; Caketown while cooking.
    if (window.KSMusic) KSMusic.play(name === 'game' ? 'game' : 'menu');
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
  const FAMILY = ['Eric', 'Stephanie', 'Tyler', 'Logan', 'Natalie', 'Nathan'];
  const picksEl = $('quick-picks');
  FAMILY.forEach((f) => {
    const chip = document.createElement('button');
    chip.className = 'quick-pick';
    chip.textContent = f;
    chip.onclick = () => {
      profile.name = f;
      $('name-input').value = f;
      saveProfile();
      refreshPicker();
      SFX.unlock(); SFX.tap();
      sendHello();
    };
    picksEl.appendChild(chip);
  });

  // ---------- chef + avatar picker ----------
  const chefGrid = $('chef-grid');
  CHEFS.forEach((chef) => {
    const cell = document.createElement('button');
    cell.className = 'chef-cell';
    cell.type = 'button';
    cell.dataset.chef = chef.key;
    cell.innerHTML = `${chefImgHtml(chef.key, 'chef-picker-img')}<span>${escapeHtml(chef.name)}</span>`;
    cell.onclick = () => {
      profile.chef = chef.key;
      saveProfile();
      refreshPicker();
      SFX.unlock(); SFX.tap();
      sendHello();
    };
    chefGrid.appendChild(cell);
  });

  $('name-input').value = profile.name;
  $('name-input').addEventListener('change', () => {
    profile.name = $('name-input').value.trim().slice(0, 14);
    saveProfile();
    refreshPicker();
    sendHello();
  });

  function refreshPicker() {
    profile.chef = chefChoice(profile.chef).key;
    chefGrid.querySelectorAll('.chef-cell').forEach((c) =>
      c.classList.toggle('sel', c.dataset.chef === profile.chef));
    picksEl.querySelectorAll('.quick-pick').forEach((c, i) =>
      c.classList.toggle('sel', FAMILY[i] === profile.name));
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
  let exitedRound = false; // player bailed to the lobby mid-round
  let iAmHost = false;
  let curStatic = null; // current round's static state (theme, star goals, ...)
  let musicState = { radio: null, queue: [], now: Date.now() };
  let musicSearchSeq = 0;

  if (window.KSRadio) {
    KSRadio.init({
      send: (cmd) => socket.emit('radio', cmd),
      onChange: handleRadioChange,
    });
  }

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
      syncUrl(myCode); // address bar always matches the kitchen you're in
      saveCrewBackup(res.crew);
      savePlayerBackup(res.player);
      renderLobby(res.lobby);
      updateMusic(res.radio || (res.lobby && res.lobby.music));
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
    syncUrl(null);
    show('home');
    sendHello();
  };

  // keep the address bar in sync with the kitchen shown on screen
  function syncUrl(code) {
    try {
      const q = new URLSearchParams(location.search);
      if (code) q.set('join', code);
      else q.delete('join');
      const qs = q.toString();
      history.replaceState(null, '', location.pathname + (qs ? `?${qs}` : ''));
    } catch { /* older browsers: cosmetic only */ }
  }

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

  // ---------- level music (crew radio queue) ----------
  socket.on('radio', (payload) => updateMusic(payload));

  function handleRadioChange(evt) {
    if (!evt) return;
    if (evt.type === 'state') {
      musicState = {
        radio: evt.radio || null,
        queue: evt.queue || musicState.queue || [],
        now: Date.now(),
      };
      renderMusic();
    } else if (evt.type === 'title' && musicState.radio) {
      musicState.radio.title = evt.title;
      renderMusic();
    }
  }

  function updateMusic(payload) {
    if (!payload) return;
    musicState = {
      radio: payload.radio || null,
      queue: payload.queue || [],
      now: payload.now || Date.now(),
    };
    if (window.KSRadio) KSRadio.update(payload);
    // the local soundtrack yields to whatever the crew queued
    if (window.KSMusic) KSMusic.suspend(!!musicState.radio);
    renderMusic();
  }

  function safeThumb(src) {
    try {
      const url = new URL(src);
      return url.protocol === 'https:' ? url.href : '';
    } catch {
      return '';
    }
  }

  function trackSubtitle(track) {
    return [track.channel, track.duration, track.requestedBy ? `by ${track.requestedBy}` : '']
      .filter(Boolean)
      .join(' · ');
  }

  function musicRow(track, label, opts = {}) {
    const row = document.createElement('div');
    row.className = 'music-row' + (opts.current ? ' current' : '');

    const thumb = document.createElement('div');
    thumb.className = 'music-thumb';
    const thumbSrc = safeThumb(track.thumbnail);
    if (thumbSrc) {
      const img = document.createElement('img');
      img.src = thumbSrc;
      img.alt = '';
      thumb.appendChild(img);
    } else {
      thumb.textContent = '♪';
    }
    row.appendChild(thumb);

    const info = document.createElement('div');
    info.className = 'music-info';
    const title = document.createElement('div');
    title.className = 'music-name';
    title.textContent = track.title || 'YouTube song';
    const meta = document.createElement('div');
    meta.className = 'music-meta';
    const subtitle = trackSubtitle(track);
    meta.textContent = label ? `${label}${subtitle ? ` · ${subtitle}` : ''}` : subtitle;
    info.append(title, meta);
    row.appendChild(info);

    if (opts.removeId) {
      const remove = document.createElement('button');
      remove.className = 'music-action';
      remove.type = 'button';
      remove.title = 'Remove';
      remove.textContent = '×';
      remove.onclick = () => {
        SFX.tap();
        socket.emit('radio', { action: 'remove', id: opts.removeId });
      };
      row.appendChild(remove);
    }
    if (opts.addTrack) {
      const add = document.createElement('button');
      add.className = 'music-action add';
      add.type = 'button';
      add.title = 'Add to queue';
      add.textContent = '+';
      add.onclick = () => {
        SFX.tap();
        if (window.KSRadio) KSRadio.unlock();
        if ((musicState.queue || []).length >= 12) {
          toast('The music queue is full.');
          return;
        }
        socket.emit('radio', { action: 'enqueue', track: opts.addTrack });
        toast(`Queued ${opts.addTrack.title || 'song'}`);
      };
      row.appendChild(add);
    }
    return row;
  }

  function renderMusic(payload = musicState) {
    const titleEl = $('music-now');
    const queueEl = $('music-queue');
    if (!titleEl || !queueEl) return;

    const current = payload.radio || null;
    const queue = payload.queue || [];
    titleEl.textContent = current ? 'Now playing' : queue.length ? `${queue.length} queued` : 'Queue empty';
    queueEl.innerHTML = '';

    if (current) queueEl.appendChild(musicRow(current, 'Now', { current: true }));
    if (!current && !queue.length) {
      const empty = document.createElement('div');
      empty.className = 'music-empty';
      empty.textContent = 'Queue empty';
      queueEl.appendChild(empty);
      return;
    }
    queue.forEach((track, idx) => {
      queueEl.appendChild(musicRow(track, idx === 0 ? 'Next level' : `${idx + 1}`, { removeId: track.id }));
    });
  }

  async function searchMusic() {
    const input = $('music-search-input');
    const resultsEl = $('music-results');
    const btn = $('music-search-btn');
    if (!input || !resultsEl || !btn) return;
    const q = input.value.trim();
    if (q.length < 2) {
      toast('Search needs at least 2 letters.');
      return;
    }
    const seq = ++musicSearchSeq;
    btn.disabled = true;
    resultsEl.hidden = false;
    resultsEl.innerHTML = '<div class="music-empty">Searching...</div>';
    try {
      const res = await fetch(`/api/youtube/search?q=${encodeURIComponent(q)}`);
      const data = await res.json().catch(() => ({}));
      if (!res.ok) throw new Error(data.error || 'Search failed');
      if (seq !== musicSearchSeq) return;
      const results = data.results || [];
      resultsEl.innerHTML = '';
      if (!results.length) {
        resultsEl.innerHTML = '<div class="music-empty">No results</div>';
        return;
      }
      for (const track of results) resultsEl.appendChild(musicRow(track, '', { addTrack: track }));
    } catch (err) {
      if (seq === musicSearchSeq) resultsEl.innerHTML = `<div class="music-empty">${escapeHtml(err.message || 'Search failed')}</div>`;
    } finally {
      if (seq === musicSearchSeq) btn.disabled = false;
    }
  }

  const musicSearchForm = $('music-search');
  if (musicSearchForm) {
    musicSearchForm.addEventListener('submit', (e) => {
      e.preventDefault();
      SFX.tap();
      if (window.KSRadio) KSRadio.unlock();
      searchMusic();
    });
  }

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
      el.innerHTML = `<div class="member-face">${playerFaceHtml(p, 'member-face-img')}${p.id === state.hostId ? '<span class="host-badge">👑</span>' : ''}</div>
        <div class="member-name">${escapeHtml(p.id === profile.id ? 'You' : p.name)}</div>`;
      $('member-row').appendChild(el);
    }

    $('level-list').innerHTML = '';
    let lastSection = null;
    for (const lvl of state.levels) {
      if (lvl.section !== lastSection) {
        lastSection = lvl.section;
        const sec = (state.sections || []).find((s) => s.id === lvl.section);
        if (sec) {
          const head = document.createElement('div');
          head.className = 'section-head';
          const secLevels = state.levels.filter((l) => l.section === sec.id);
          const earned = secLevels.reduce((n, l) => n + l.stars, 0);
          head.innerHTML = `<span class="sec-emoji">${sec.emoji}</span>
            <span class="sec-name">${sec.name}</span>
            <span class="sec-stars">★ ${earned}/${secLevels.length * 3}</span>`;
          $('level-list').appendChild(head);
        }
      }
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

    renderShop(state);
    renderCrewStats(state);
    renderMusic(state.music || musicState);

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

  // ---------- kitchen shop ----------
  function renderShop(state) {
    const card = $('shop-card');
    if (!state.wallet || !state.upgrades) { card.hidden = true; return; }
    card.hidden = false;
    $('shop-coins').textContent = `🪙 ${state.wallet.coins.toLocaleString()}`;
    const list = $('shop-list');
    list.innerHTML = '';
    for (const [id, up] of Object.entries(state.upgrades)) {
      const owned = !!state.wallet.upgrades[id];
      const affordable = state.wallet.coins >= up.cost;
      const row = document.createElement('div');
      row.className = 'shop-row' + (owned ? ' owned' : '');
      row.innerHTML = `
        <div class="shop-emoji">${up.emoji}</div>
        <div class="shop-info">
          <div class="shop-name">${up.name}</div>
          <div class="shop-desc">${up.desc}</div>
        </div>
        <button class="shop-buy" ${owned || !affordable ? 'disabled' : ''}>
          ${owned ? '✓ Owned' : `🪙 ${up.cost.toLocaleString()}`}
        </button>`;
      if (!owned) {
        row.querySelector('.shop-buy').onclick = () => {
          SFX.tap();
          socket.emit('buy_upgrade', id, (res) => {
            if (res && res.error) toast(res.error);
            else { SFX.serve(); toast(`${up.emoji} ${up.name} unlocked for the crew!`); }
          });
        };
      }
      list.appendChild(row);
    }
  }

  function renderCrewStats(state) {
    const el = $('crew-stats');
    if (!state.crewStats) { el.textContent = ''; return; }
    const s = state.crewStats;
    el.textContent = `🍽️ ${s.meals.toLocaleString()} meals served · 🎮 ${s.rounds} rounds · 🪙 ${s.earned.toLocaleString()} earned all-time`;
  }

  function escapeHtml(s) {
    return String(s).replace(/[&<>"']/g, (c) => ({ '&': '&amp;', '<': '&lt;', '>': '&gt;', '"': '&quot;', "'": '&#39;' }[c]));
  }

  // ---------- game ----------
  const HINTS = [
    'Tap a crate to grab an ingredient',
    'Tap a cutting board to start chopping — boards finish on their own',
    'Tap the stove to cook. Don’t let it burn! 🔥',
    'Grab a plate, tap counters to combine, then tap the green window to serve',
    'Dirty dishes pile up at the sink 🫧 — stand there to scrub them clean',
  ];
  let hintIdx = 0;
  let hintTimer = null;

  socket.on('game_start', (staticState) => {
    startRound(staticState);
  });

  function startRound(staticState) {
    if (renderer) renderer.destroy();
    exitedRound = false;
    curStatic = staticState;
    show('game');
    $('pause-overlay').hidden = true;
    $('orders-strip').innerHTML = '';
    ticketEls.clear();
    $('rush-banner').hidden = true;
    $('game-players').innerHTML = '';
    gpEls.clear();
    const acBtn = $('btn-autochop');
    acBtn.hidden = false; // always visible — locked until the crew buys it
    acBtn.textContent = staticState.autoChopAllowed ? '🔪' : '🔒';
    acBtn.classList.toggle('locked', !staticState.autoChopAllowed);
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
    ding: 'ding', serve: 'serve', reject: 'reject',
    burn: 'burn', expire: 'expire', order: 'order', trash: 'trash',
    washed: 'washed', chop: 'chop',
    burn_warning: 'burnWarning',
    rush_start: 'rushStart', rush_end: 'rushEnd',
  };

  function playEventSound(ev) {
    const fn = ev.type === 'sizzle'
      ? (ev.tool === 'pot' ? 'boil' : 'sizzle')
      : SOUND_FOR[ev.type];
    if (!fn || !SFX[fn]) return;
    const personal = ['pickup', 'place', 'plate', 'reject', 'trash'];
    if (personal.includes(ev.type) && ev.playerId !== profile.id) return;
    SFX[fn]();
  }

  socket.on('state', (state) => {
    if (!renderer) return;
    renderer.update(state);

    // HUD
    const m = Math.floor(state.t / 60), s = state.t % 60;
    const timerEl = $('hud-timer');
    timerEl.textContent = `⏱ ${m}:${String(s).padStart(2, '0')}`;
    timerEl.classList.toggle('low', state.t <= 20 && state.phase === 'playing');
    $('hud-score').textContent = `🪙 ${state.score}`;
    const platesEl = $('hud-plates');
    const cleanPlates = state.plates === null || state.plates === undefined ? '∞' : state.plates;
    platesEl.textContent = `🍽️ ${cleanPlates}`;
    platesEl.classList.toggle('empty', state.plates === 0);
    platesEl.title = state.incomingDirty
      ? `${cleanPlates} clean plates · ${state.incomingDirty} dirty returning`
      : `${cleanPlates} clean plates`;
    const comboEl = $('hud-combo');
    comboEl.hidden = state.combo < 2;
    comboEl.textContent = `🔥 x${state.combo}`;
    $('pause-overlay').hidden = !state.paused;
    if (state.paused) {
      $('pause-byline').textContent = state.pausedBy
        ? `${state.pausedBy} paused the game — anyone can resume.`
        : 'Anyone can resume.';
    }

    // lunch rush banner
    const banner = $('rush-banner');
    banner.hidden = !state.rush;
    if (state.rush) banner.textContent = `🔥 BONUS TIME! Double tips — ${state.rush}s`;

    // auto-chop toggle state (locked button keeps its 🔒)
    if (curStatic && curStatic.autoChopAllowed) {
      $('btn-autochop').textContent = state.autoChop ? '🤖' : '🔪';
      $('btn-autochop').classList.toggle('active', !!state.autoChop);
    }

    // star goal progress
    if (curStatic && curStatic.starThresholds) {
      const [g1, g2, g3] = curStatic.starThresholds;
      const frac = Math.min(state.score / g3, 1);
      $('star-fill').style.width = `${frac * 100}%`;
      const marks = document.querySelectorAll('#star-progress .star-mark');
      [g1, g2, g3].forEach((g, i) => {
        const m = marks[i];
        if (m) {
          m.style.left = `${(g / g3) * 100}%`;
          m.classList.toggle('hit', state.score >= g);
          m.title = String(g);
        }
      });
      $('star-progress').title = `⭐${g1} ⭐⭐${g2} ⭐⭐⭐${g3}`;
    }

    // live crew strip
    renderGamePlayers(state.players);

    renderOrders(state.orders);

    for (const ev of state.events) {
      playEventSound(ev);
      if (ev.type === 'reject' && ev.playerId === profile.id) {
        if (navigator.vibrate) navigator.vibrate(60);
      }
      if (ev.type === 'serve') {
        renderer.spawnServeJuice(ev.x, ev.y, ev.points, ev.vip);
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
        el.className = 'ticket' + (o.vip ? ' vip' : '');
        el.innerHTML = `
          ${KSRender.ticketRecipeHtml(o, renderer && renderer.customerKeyForOrder(o))}
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
  // Exit to the lobby without leaving the crew. The round keeps running on
  // the server (other chefs are unaffected); results are recorded silently.
  $('btn-exit-lobby').onclick = () => {
    exitedRound = true;
    socket.emit('pause', false);          // don't leave others stuck paused
    socket.emit('exit_round');            // if nobody's left playing, the round ends
    if (renderer) { renderer.destroy(); renderer = null; }
    clearInterval(hintTimer);
    $('pause-overlay').hidden = true;
    show('lobby');
  };
  $('btn-autochop').onclick = () => {
    SFX.tap();
    if (curStatic && !curStatic.autoChopAllowed) {
      toast('🤖 Auto-Chopper is a Kitchen Shop upgrade — grab it in the lobby! (800 🪙)');
      return;
    }
    socket.emit('autochop', $('btn-autochop').textContent !== '🤖');
  };

  // ---------- live crew strip ----------
  const gpEls = new Map();
  function renderGamePlayers(players) {
    const wrap = $('game-players');
    for (const p of players) {
      let el = gpEls.get(p.id);
      if (!el) {
        el = document.createElement('div');
        el.className = 'gp';
        el.innerHTML = `<span class="gp-face"></span><span class="gp-count"></span>`;
        wrap.appendChild(el);
        gpEls.set(p.id, el);
      }
      el.querySelector('.gp-face').innerHTML = playerFaceHtml(p, 'gp-face-img');
      el.querySelector('.gp-count').textContent = `${p.delivered}🍽`;
      el.classList.toggle('me', p.id === profile.id);
    }
  }

  // ---------- emotes ----------
  const EMOTES = ['🔥', '😱', '🙏', '🎉', '🍽️', '❤️'];
  const emoteBar = $('emote-bar');
  EMOTES.forEach((e, i) => {
    const b = document.createElement('button');
    b.textContent = e;
    b.onclick = () => { SFX.tap(); socket.emit('emote', i); };
    emoteBar.appendChild(b);
  });
  socket.on('emote', ({ playerId, emoji }) => {
    if (renderer) renderer.addEmote(playerId, emoji);
    SFX.order();
  });

  // ---------- audio toggles (music & SFX are independent, home + game) ----------
  function updateMuteBtn() {
    const sfxOff = SFX.isMuted(), musOff = KSMusic.isMuted();
    for (const id of ['btn-mute', 'btn-sfx-home']) {
      $(id).textContent = sfxOff ? '🔇' : '🔊';
      $(id).classList.toggle('off', sfxOff);
    }
    for (const id of ['btn-music-game', 'btn-music-home']) {
      $(id).classList.toggle('off', musOff);
    }
  }
  for (const id of ['btn-mute', 'btn-sfx-home']) {
    $(id).onclick = () => {
      SFX.toggleMute();
      SFX.unlock(); SFX.tap();
      updateMuteBtn();
    };
  }
  for (const id of ['btn-music-game', 'btn-music-home']) {
    $(id).onclick = () => {
      KSMusic.toggleMute();
      SFX.tap();
      updateMuteBtn();
    };
  }
  updateMuteBtn();

  // ---------- results ----------
  socket.on('game_over', (results) => {
    saveCrewBackup(results.crew);
    clearInterval(hintTimer);
    if (exitedRound) { exitedRound = false; return; }  // stayed in the lobby
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

    // recap awards: only meaningful with real numbers behind them
    const awards = [];
    const top = (key) => [...results.players].sort((a, b) => (b[key] || 0) - (a[key] || 0))[0];
    const mvp = top('delivered');
    if (mvp && mvp.delivered > 0) awards.push({ emoji: '🏆', title: 'MVP', name: mvp.name, detail: `${mvp.delivered} served` });
    const prep = top('chops');
    if (prep && prep.chops > 0 && results.players.length > 1) awards.push({ emoji: '🔪', title: 'Prep Master', name: prep.name, detail: `${prep.chops} chopped` });
    const dish = top('washed');
    if (dish && dish.washed > 0) awards.push({ emoji: '🫧', title: 'Dish Hero', name: dish.name, detail: `${dish.washed} washed` });
    const aw = $('results-awards');
    aw.innerHTML = awards.map((a) =>
      `<div class="award"><span class="aw-emoji">${a.emoji}</span><div><b>${a.title}</b><br>${escapeHtml(a.name)} · <span class="muted">${a.detail}</span></div></div>`
    ).join('');

    const rp = $('results-players');
    rp.innerHTML = '';
    for (const p of results.players.sort((a, b) => b.delivered - a.delivered)) {
      const el = document.createElement('div');
      el.className = 'rp';
      el.innerHTML = `<span class="face">${playerFaceHtml(p, 'result-face-img')}</span><span>${escapeHtml(p.name)}</span><span class="muted">${p.delivered} 🍽️</span>`;
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
      // the link's code wins over any previous kitchen this tab was in —
      // otherwise two joins race and the page can show a different code
      // than the URL
      myCode = joinParam;
      sessionStorage.setItem('ks-code', joinParam);
      // (the connect handler's auto-rejoin performs the single join)
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

  // Warm the sprite cache while the player is still on the menus, so the
  // first round doesn't watch assets pop in one by one. Slightly deferred
  // to keep the home screen's first paint snappy.
  setTimeout(() => { if (window.GFX) GFX.preload(); }, 600);

  // one shared gesture unlock: SFX synth + the YouTube radio player
  // (music.js installs its own identical listeners)
  let audioUnlocked = false;
  function unlockAudio() {
    if (audioUnlocked) return;
    audioUnlocked = true;
    SFX.unlock();
    if (window.KSRadio) KSRadio.unlock();
  }
  document.addEventListener('pointerdown', unlockAudio, { once: true });
  document.addEventListener('touchstart', unlockAudio, { once: true });
})();

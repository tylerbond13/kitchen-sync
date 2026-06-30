// Kitchen Sync app: profile, screens, socket flow, game wiring.
(function () {
  const $ = (id) => document.getElementById(id);
  const CHEFS = (window.KS_CHEFS || []).filter((c) => c && c.key && hasAsset(c.key));
  if (!CHEFS.length) CHEFS.push({ key: 'chef', name: 'Chef' });

  function hasAsset(key) {
    const ent = window.ASSETS && window.ASSETS[key];
    return typeof ent === 'string' || !!(ent && ent.path);
  }

  function assetPath(key) {
    const ent = window.ASSETS && window.ASSETS[key];
    return typeof ent === 'string' ? ent : ent && ent.path;
  }

  function uiIcon(key, fallback) {
    const path = assetPath(key);
    return path ? `<img class="hud-icon" src="/${path}" alt="" draggable="false">` : fallback;
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
    // Sound is on by default: the kitchen plays its own "Caketown" track, every
    // other screen plays the menu theme ("Acrostics"). A queued crew-radio
    // (YouTube) track still suspends whichever soundtrack is due (see below).
    if (window.KSMusic) KSMusic.play(name === 'game' ? 'game' : 'menu');
    lockLandscape();
  }

  // The kitchen is a landscape-only experience. Where the platform allows it
  // (installed PWA / Android Chrome in fullscreen) we hard-lock the screen to
  // landscape; iOS Safari ignores this, so the CSS rotate-nudge overlay on the
  // game screen is the real cross-platform guarantee (see #rotate-nudge).
  function lockLandscape() {
    try { screen.orientation && screen.orientation.lock && screen.orientation.lock('landscape').catch(() => {}); }
    catch (_) { /* unsupported (iOS Safari) — handled by the rotate-nudge overlay */ }
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
  // Natural groupings so the long roster reads as labelled sections instead of
  // one giant blob. Anyone not listed falls into "More Stars" at the end, so
  // new chefs never silently vanish.
  const CHEF_SECTIONS = [
    { name: 'Sitcom Stars',          emoji: '📺', keys: ['jerry_seinfeld','elaine_benes','cosmo_kramer','george_costanza','betty_white','blanche_devereaux','dorothy_zbornak','lorelai_gilmore','rory_gilmore','lucy_ricardo','ricky_ricardo','carrie_bradshaw','angela_lansbury','barney'] },
    { name: 'Daytime TV',            emoji: '⚖️', keys: ['judge_judy','oprah_winfrey','dr_phil'] },
    { name: 'Music Legends',         emoji: '🎤', keys: ['sinatra','elvis_presley','john_lennon','dolly','cher','celine_dion','elton_john','bono','shania_twain'] },
    { name: 'Pop & Hitmakers',       emoji: '🎸', keys: ['taylor_swift','britney','lady_gaga','katy_perry','kanye_west','drake','justin_bieber','robyn'] },
    { name: 'The Eagles',            emoji: '🦅', keys: ['joe_walsh','don_henley','glenn_frey'] },
    { name: 'Movie Icons',           emoji: '🎬', keys: ['marilyn_monroe','tom_cruise','brad_pitt','bill_murray','julie_andrews','judy','the_dude','walter_sobchak','buddy_the_elf','wadsworth'] },
    { name: 'Politics & Royals',     emoji: '🏛️', keys: ['obama','joe_biden','kamala_harris','donald_trump','george_washington','princess_diana','queen_elizabeth_ii'] },
    { name: 'Trailblazers',          emoji: '🔬', keys: ['stephen_hawking','greta_thunberg'] },
    { name: 'Sports Legends',        emoji: '🏀', keys: ['michael_jordan','shaquille_oneal'] },
    { name: 'Reality & Pop Culture', emoji: '📱', keys: ['kim_kardashian','kris_jenner','snooki'] },
    { name: 'Cartoons & Games',      emoji: '🎮', keys: ['bart_simpson','marge_simpson','sonic_hedgehog'] },
    // House Specials live at the bottom — the celebrity chefs lead the roster.
    { name: 'House Specials',        emoji: '🏠', keys: ['chef','grandma_rose','workhorse','kid','camp_counselor','influencer','socialite'] },
  ];

  const chefGrid = $('chef-grid');
  const chefByKey = new Map(CHEFS.map((c) => [c.key, c]));

  function makeChefCell(chef) {
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
      if (window.KSVoices) KSVoices.playSelect(chef.key);   // character's voice clip, if any
      sendHello();
      // Picking a chef sits deep in a long grid — bring the action buttons up
      // so you don't have to scroll to the very bottom to start a kitchen.
      const actions = document.querySelector('#screen-home .home-actions');
      if (actions) actions.scrollIntoView({ behavior: 'smooth', block: 'center' });
    };
    return cell;
  }

  function addChefSectionHead(section) {
    const h = document.createElement('div');
    h.className = 'chef-section-head';
    h.innerHTML = `<span class="chef-section-emoji">${section.emoji}</span>${escapeHtml(section.name)}`;
    chefGrid.appendChild(h);
  }

  (function renderChefSections() {
    const placed = new Set();
    for (const section of CHEF_SECTIONS) {
      const members = section.keys.map((k) => chefByKey.get(k)).filter(Boolean);
      if (!members.length) continue;
      addChefSectionHead(section);
      for (const chef of members) { chefGrid.appendChild(makeChefCell(chef)); placed.add(chef.key); }
    }
    const leftovers = CHEFS.filter((c) => !placed.has(c.key));
    if (leftovers.length) {
      addChefSectionHead({ name: 'More Stars', emoji: '⭐' });
      for (const chef of leftovers) chefGrid.appendChild(makeChefCell(chef));
    }
  })();

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
  let bootToBuilder = false; // sandbox default: the bare URL opens the BOND builder
  let lobby = null;
  let renderer = null;
  let exitedRound = false; // player bailed to the lobby mid-round
  let iAmHost = false;
  let curStatic = null; // current round's static state (theme, star goals, ...)
  let musicState = { radio: null, queue: [], now: Date.now() };

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
        bootToBuilder = false;
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
        if (bootToBuilder) {
          // sandbox default: drop straight into the BOND level builder
          bootToBuilder = false;
          openBuilder({ from: 'lobby' });
        } else {
          show('lobby');
        }
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

  // Change your chef WITHOUT leaving the kitchen. "Leave" drops you from the
  // room (and a fresh start makes a new code); this just reopens the chef
  // picker, then re-registers with the same code so you land back in the
  // kitchen you were already in — with your new chef applied to the roster.
  function setChefEditMode(on) {
    $('btn-chef-done').hidden = !on;
    $('btn-create').hidden = on;
    $('btn-show-join').hidden = on;
    $('btn-how-home').hidden = on;
  }
  $('btn-edit-chef').onclick = () => {
    if (!myCode) return;            // only meaningful from inside a kitchen
    SFX.tap();
    setChefEditMode(true);
    show('home');
    const grid = document.getElementById('chef-grid');
    if (grid) grid.scrollIntoView({ behavior: 'smooth', block: 'start' });
  };
  $('btn-chef-done').onclick = () => {
    SFX.tap();
    setChefEditMode(false);
    bootToBuilder = false;
    if (myCode) joinCrew(myCode, true); // re-register new chef, same kitchen → lobby
    else show('home');
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
      applyRadioDucking();
      renderMusic();
    } else if (evt.type === 'title' && musicState.radio) {
      musicState.radio.title = evt.title;
      renderMusic();
    }
  }

  // the local soundtrack yields to the crew radio — unless this phone has
  // muted the radio, in which case its own game music comes back
  function applyRadioDucking() {
    if (!window.KSMusic) return;
    const radioAudible = !!musicState.radio && !(window.KSRadio && KSRadio.isMuted());
    KSMusic.suspend(radioAudible);
  }

  function updateMusic(payload) {
    if (!payload) return;
    musicState = {
      radio: payload.radio || null,
      queue: payload.queue || [],
      now: payload.now || Date.now(),
    };
    if (window.KSRadio) KSRadio.update(payload);
    applyRadioDucking();
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

  // compact in-game strip: now playing + what's next, skip + local mute
  function renderRadioBar() {
    const bar = $('radio-bar');
    if (!bar) return;
    const current = musicState.radio;
    const queue = musicState.queue || [];
    bar.hidden = !current && !queue.length;
    if (bar.hidden) return;
    $('radio-bar-title').textContent = current
      ? (current.title || 'YouTube song') + (current.by ? ` · by ${current.by}` : '')
      : `${queue.length} queued for this round`;
    const next = queue[0];
    $('radio-bar-next').textContent = next
      ? `Next: ${next.title}${queue.length > 1 ? ` · +${queue.length - 1} more` : ''}`
      : (current ? 'Last song in the queue' : '');
    $('btn-radio-skip').disabled = !current;
    $('btn-radio-mute').textContent = (window.KSRadio && KSRadio.isMuted()) ? '🔇' : '🔊';
  }

  $('btn-radio-skip').onclick = () => {
    SFX.tap();
    socket.emit('radio', { action: 'skip' });
  };
  $('btn-radio-mute').onclick = () => {
    SFX.tap();
    if (window.KSRadio) KSRadio.toggleMute(); // onChange re-renders the bar
  };

  // The same crew-radio console renders in two places: the lobby card and the
  // in-game pause menu (`gm-` ids). Each searches independently (its own seq).
  const MUSIC_PANELS = [
    { form: 'music-search', input: 'music-search-input', btn: 'music-search-btn',
      results: 'music-results', queue: 'music-queue', now: 'music-now', seq: 0 },
    { form: 'gm-search', input: 'gm-input', btn: 'gm-btn',
      results: 'gm-results', queue: 'gm-queue', now: 'gm-now', seq: 0 },
  ];

  function renderMusicPanel(p, current, queue) {
    const titleEl = $(p.now);
    const queueEl = $(p.queue);
    if (!titleEl || !queueEl) return;
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

  function renderMusic(payload = musicState) {
    renderRadioBar();
    const current = payload.radio || null;
    const queue = payload.queue || [];
    for (const p of MUSIC_PANELS) renderMusicPanel(p, current, queue);
  }

  async function searchMusic(p) {
    const input = $(p.input);
    const resultsEl = $(p.results);
    const btn = $(p.btn);
    if (!input || !resultsEl || !btn) return;
    const q = input.value.trim();
    if (q.length < 2) {
      toast('Search needs at least 2 letters.');
      return;
    }
    const seq = ++p.seq;
    btn.disabled = true;
    resultsEl.hidden = false;
    resultsEl.innerHTML = '<div class="music-empty">Searching...</div>';
    try {
      const res = await fetch(`/api/youtube/search?q=${encodeURIComponent(q)}`);
      const data = await res.json().catch(() => ({}));
      if (!res.ok) throw new Error(data.error || 'Search failed');
      if (seq !== p.seq) return;
      const results = data.results || [];
      resultsEl.innerHTML = '';
      if (!results.length) {
        resultsEl.innerHTML = '<div class="music-empty">No results</div>';
        return;
      }
      for (const track of results) resultsEl.appendChild(musicRow(track, '', { addTrack: track }));
    } catch (err) {
      if (seq === p.seq) resultsEl.innerHTML = `<div class="music-empty">${escapeHtml(err.message || 'Search failed')}</div>`;
    } finally {
      if (seq === p.seq) btn.disabled = false;
    }
  }

  for (const p of MUSIC_PANELS) {
    const form = $(p.form);
    if (!form) continue;
    form.addEventListener('submit', (e) => {
      e.preventDefault();
      SFX.tap();
      if (window.KSRadio) KSRadio.unlock();
      searchMusic(p);
    });
  }

  // Sidebar "🎶" opens the pause menu (where the music console lives) and drops
  // focus on its search box — reachable mid-round even with nothing playing.
  const btnOpenMusic = $('btn-open-music');
  if (btnOpenMusic) {
    btnOpenMusic.onclick = () => {
      SFX.tap();
      if (window.KSRadio) KSRadio.unlock();
      socket.emit('pause', true);
      setTimeout(() => { const i = $('gm-input'); if (i) i.focus(); }, 60);
    };
  }

  // ---------- lobby ----------
  socket.on('lobby', (state) => {
    if (state.code !== myCode) return;
    renderLobby(state);
  });

  function renderLobby(state) {
    lobby = state;
    iAmHost = state.hostId === profile.id;
    // keep the builder's saved-board list fresh when a board is saved/deleted
    if (typeof renderPresets === 'function' && $('screen-builder').classList.contains('active')) renderPresets();
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
        const edit = document.createElement('button');
        edit.className = 'level-edit';
        edit.textContent = '✏️';
        edit.title = lvl.custom ? 'Edit this kitchen' : 'Rearrange this board for your crew';
        edit.onclick = (e) => {
          e.stopPropagation();
          openBuilder({ from: 'lobby', levelId: lvl.id, custom: !!lvl.custom, title: `✏️ ${lvl.name}` });
        };
        row.appendChild(edit);
        // A crew can delete its own custom kitchens, or revert an edited
        // built-in board to the original.
        if (lvl.custom) {
          const del = document.createElement('button');
          del.className = 'level-edit level-del';
          del.textContent = '🗑️';
          del.title = 'Delete this kitchen';
          del.onclick = (e) => {
            e.stopPropagation();
            if (!confirm(`Delete "${lvl.name}"? Its stars go too.`)) return;
            SFX.tap();
            socket.emit('delete_board', lvl.id.slice('custom:'.length), () => {});
          };
          row.appendChild(del);
        } else if (lvl.edited) {
          const reset = document.createElement('button');
          reset.className = 'level-edit level-reset';
          reset.textContent = '↺';
          reset.title = 'Reset to the original board';
          reset.onclick = (e) => {
            e.stopPropagation();
            SFX.tap();
            socket.emit('save_override', { levelId: lvl.id, cfg: null }, () => {});
          };
          row.appendChild(reset);
        }
      }
      $('level-list').appendChild(row);
    }

    $('btn-open-builder').hidden = !iAmHost;
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
    'Dirty dishes pile up at the sink 🫧 — tap it to wash one dish at a time',
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
    // Auto-Chopper is always-on when the crew owns it — no in-game toggle.
    $('btn-autochop').hidden = true;
    // The level's chosen backdrop (or the default wood board).
    applyWallpaper($('canvas-wrap'), staticState.wallpaper);
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
    renderRadioBar();
    maybeShowTutorial(staticState);
  }

  // ── First-time, per-level tutorial pop-up ─────────────────────────────────
  // Shown once per level per device (localStorage). Pages through the level's
  // dish menu — each card reuses the in-game order ticket (so players learn to
  // read tickets too) plus a numbered "how to make it" step list.
  const TUT_KEY = (id) => `ks-tut-v1-${id}`;
  let tutPages = [];
  let tutIdx = 0;

  function stepLabel(token) {
    const [id, state] = token.split('.');
    const nice = id.replace(/_/g, ' ');
    if (state === 'chopped') return `Chop the ${nice}`;
    if (state === 'cooked')  return `Cook the ${nice}`;
    if (state === 'dish') {
      // Cake World: cakes are mixed then baked, not simmered on the stove.
      if (/_cake$/.test(id)) return `Mix & bake the ${nice.replace(/ cake$/, '')} cake`;
      return `Cook ${nice.replace(/^soup /, '')} on the stove`;
    }
    return `Grab the ${nice}`;
  }

  function recipeCardHtml(r) {
    const order = { recipe: r.recipe, needs: r.needs, name: r.name, emoji: r.emoji, id: r.recipe, vip: false };
    const ticket = (window.KSRender && KSRender.ticketRecipeHtml)
      ? KSRender.ticketRecipeHtml(order, null)
      : `<div class="ticket-name">${escapeHtml(r.name)}</div>`;
    const chain = (window.KSRender && KSRender.prepChainHtml) || (() => '');
    let n = 0;
    const steps = r.needs.map((tok) => {
      n++;
      return `<div class="tutorial-step"><span class="step-n">${n}</span>${chain(tok)}<span>${escapeHtml(stepLabel(tok))}</span></div>`;
    });
    n++;
    const finale = r.handheld
      ? 'Build it in your hands & serve at the window 🪟'
      : 'Plate it 🍽️ & serve at the window 🪟';
    steps.push(`<div class="tutorial-step"><span class="step-n">${n}</span><span class="chain">🪟</span><span>${finale}</span></div>`);
    return `<div class="tutorial-card">
      <div class="ticket">${ticket}</div>
      <div class="tutorial-steps">${steps.join('')}</div>
    </div>`;
  }

  function renderTutorialPage() {
    const r = tutPages[tutIdx];
    if (!r) return;
    $('tutorial-body').innerHTML = recipeCardHtml(r);
    $('tutorial-dots').innerHTML = tutPages.length > 1
      ? tutPages.map((_, i) => `<span class="${i === tutIdx ? 'on' : ''}"></span>`).join('')
      : '';
    const last = tutIdx >= tutPages.length - 1;
    $('btn-tutorial-next').textContent = last ? "Let's cook! 🍳" : 'Next →';
  }

  function closeTutorial(levelId) {
    $('tutorial-overlay').hidden = true;
    if (levelId) { try { localStorage.setItem(TUT_KEY(levelId), '1'); } catch (_) {} }
  }

  function maybeShowTutorial(staticState) {
    const recipes = staticState && staticState.recipes;
    if (!recipes || !recipes.length) return;
    let seen = false;
    try { seen = !!localStorage.getItem(TUT_KEY(staticState.levelId)); } catch (_) {}
    if (seen) return;
    tutPages = recipes;
    tutIdx = 0;
    $('tutorial-title').textContent = `🍳 ${staticState.name || 'New Kitchen'}`;
    $('tutorial-sub').textContent = recipes.length > 1
      ? `${recipes.length} dishes to learn — here's how:`
      : "Here's how to make it:";
    renderTutorialPage();
    $('tutorial-overlay').hidden = false;
  }

  $('btn-tutorial-skip').onclick = () => {
    SFX.tap();
    closeTutorial(curStatic && curStatic.levelId);
  };
  $('btn-tutorial-next').onclick = () => {
    SFX.tap();
    if (tutIdx < tutPages.length - 1) { tutIdx++; renderTutorialPage(); }
    else closeTutorial(curStatic && curStatic.levelId);
  };

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
    timerEl.innerHTML = `${uiIcon('ui_timer', '⏱')}<span>${m}:${String(s).padStart(2, '0')}</span>`;
    timerEl.classList.toggle('low', state.t <= 20 && state.phase === 'playing');
    $('hud-score').innerHTML = `${uiIcon('ui_coin', '🪙')}<span>${state.score}</span>`;
    const platesEl = $('hud-plates');
    const cleanPlates = state.plates === null || state.plates === undefined ? '∞' : state.plates;
    platesEl.innerHTML = `${uiIcon('plate', '🍽️')}<span>${cleanPlates}</span>`;
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

    // AI Director HUD (advisory overlay, off by default). Guarded so it can
    // never affect the game loop — see public/js/ai/director-hud.js.
    if (window.DirectorHUD && window.DirectorHUD.enabled) {
      try { window.DirectorHUD.update(state, renderer, profile.id, curStatic); } catch (e) {}
    }

    for (const ev of state.events) {
      playEventSound(ev);
      if (ev.type === 'reject' && ev.playerId === profile.id) {
        if (navigator.vibrate) navigator.vibrate(60);
        if (window.KSVoices) KSVoices.playFail();   // bad hand-off → someone yells
      }
      // Screw-ups earn an exasperated clip: a burned dish or an order that
      // timed out. (burn/expire are crew-wide, so everyone hears the heckle.)
      if ((ev.type === 'burn' || ev.type === 'expire') && window.KSVoices) {
        KSVoices.playFail();
      }
      if (ev.type === 'serve') {
        renderer.spawnServeJuice(ev.x, ev.y, ev.points, ev.vip);
        // The chef who delivered shouts a random clip from their soundboard.
        if (window.KSVoices) {
          const server = state.players.find((p) => p.id === ev.playerId);
          if (server) KSVoices.playDelivery(server.chef || 'chef');
        }
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
  // Any chef can restart the level for the whole crew — the server replies
  // with a fresh game_start, and startRound resets this client's round state.
  $('btn-restart').onclick = () => {
    SFX.tap();
    socket.emit('restart_level', null, (res) => {
      if (res && res.error) toast(res.error);
    });
  };
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
    // A spoken sign-off: a pleased line for a decent service, a heckle for a
    // flop. Delayed a touch so it lands after the round-over sting.
    if (window.KSVoices) {
      setTimeout(() => { results.stars >= 2 ? KSVoices.playDelivery() : KSVoices.playFail(); }, 450);
    }

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

  // ---------- desktop keyboard controls ----------
  // Arrow keys steer your chef; Space interacts with the station you face.
  // These ride alongside tap/click — both are equally first-class. The grid is
  // axis-aligned (despite the iso art), so the key→direction mapping is direct.
  const KEY_VEC = {
    ArrowUp: [0, -1], ArrowDown: [0, 1], ArrowLeft: [-1, 0], ArrowRight: [1, 0],
  };
  const heldDirs = new Set();
  function typingInField() {
    const el = document.activeElement;
    return !!el && (el.tagName === 'INPUT' || el.tagName === 'TEXTAREA' || el.isContentEditable);
  }
  function gameKeysActive() {
    return $('screen-game').classList.contains('active') && !typingInField();
  }
  function emitSteer() {
    let dx = 0, dy = 0;
    for (const code of heldDirs) { dx += KEY_VEC[code][0]; dy += KEY_VEC[code][1]; }
    socket.emit('steer', { dx: Math.sign(dx), dy: Math.sign(dy) });
  }
  window.addEventListener('keydown', (e) => {
    if (e.code === 'Space') {
      if (!gameKeysActive()) return;
      e.preventDefault();
      if (!e.repeat) { SFX.tap(); socket.emit('interact'); }
      return;
    }
    if (!KEY_VEC[e.code]) return;
    if (!gameKeysActive()) return;
    e.preventDefault();
    if (e.repeat || heldDirs.has(e.code)) return;
    heldDirs.add(e.code);
    emitSteer();
  });
  window.addEventListener('keyup', (e) => {
    if (!KEY_VEC[e.code] || !heldDirs.has(e.code)) return;
    heldDirs.delete(e.code);
    emitSteer();
  });
  window.addEventListener('blur', () => {
    if (!heldDirs.size) return;
    heldDirs.clear();
    socket.emit('steer', { dx: 0, dy: 0 });
  });

  // ---------- Background wallpaper (board backdrop) ----------
  // The play area's backdrop is a CSS background on .canvas-wrap. A level can
  // pick which image that is; the builder previews the choice live, and the
  // real game applies it on start. `null` / unknown → DEFAULT_WALLPAPER.
  const WALLPAPERS = [
    { id: 'wood',    name: '🍪 Wood Board',   url: 'assets/images/cake-world/backgrounds/ks-game-board-wood-v2.png' },
    { id: 'wood1',   name: '🪵 Classic Wood', url: 'assets/images/cake-world/backgrounds/ks-game-board-wood-v1.png' },
    { id: 'cake',    name: '🎂 Cake Shop',    url: 'assets/images/cake-world/backgrounds/ks-cake-background1.png' },
    { id: 'diner',   name: '🍔 Diner',        url: 'assets/images/hd/ks-wall-diner.png' },
    { id: 'winter',  name: '❄️ Winter',       url: 'assets/images/hd/ks-wall-winter.png' },
    { id: 'beach',   name: '🏖️ Beach',        url: 'assets/images/hd/ks-wall-beach.png' },
    { id: 'bakery',  name: '🧁 Bakery',       url: 'assets/images/hd/ks-wall-bakery-back.png' },
    // TV-kitchen & themed scenes — full-room backdrops (3048×1408, wall + floor)
    { id: 'brady',         name: '📺 Brady Bunch',    url: 'assets/images/hd/ks-wall-diner-brady-bunch-kitchen-floor70-v1.png' },
    { id: 'cheers',        name: '🍺 Cheers Bar',     url: 'assets/images/hd/ks-wall-diner-cheers-bar-floor70-v1.png' },
    { id: 'goldengirls',   name: '🌴 Golden Girls',   url: 'assets/images/hd/ks-wall-diner-golden-girls-kitchen-floor70-v1.png' },
    { id: 'lucy',          name: '❤️ I Love Lucy',    url: 'assets/images/hd/ks-wall-diner-i-love-lucy-kitchen-floor70-v1.png' },
    { id: 'seinfeld',      name: '🗽 Seinfeld',       url: 'assets/images/hd/ks-wall-diner-seinfeld-apartment-floor70-v1.png' },
    { id: 'wonka',         name: '🍫 Willy Wonka',    url: 'assets/images/hd/ks-wall-diner-willy-wonka-chocolate-room-floor70-v1.png' },
    { id: 'oz',            name: '🌈 Oz Technicolor', url: 'assets/images/hd/ks-wall-diner-oz-technicolor-floor70-v1.png' },
    { id: 'mediterranean', name: '🏺 Mediterranean',  url: 'assets/images/hd/ks-wall-diner-mediterranean-market-floor70-v1.png' },
    { id: 'sage',          name: '🌿 Warm Sage',      url: 'assets/images/hd/ks-wall-diner-warm-sage-v1.png' },
  ];
  const DEFAULT_WALLPAPER = 'wood';
  const WALLPAPER_BY_ID = Object.fromEntries(WALLPAPERS.map((w) => [w.id, w]));
  function wallpaperUrl(id) {
    return (WALLPAPER_BY_ID[id] || WALLPAPER_BY_ID[DEFAULT_WALLPAPER]).url;
  }
  function applyWallpaper(el, id) {
    if (!el) return;
    el.style.background = `#E8D3BF url('${wallpaperUrl(id)}') center center / cover no-repeat`;
  }

  // ---------- Level Builder (admin / pre-level board editing) ----------
  let catalog = null;
  let builderReturn = 'lobby';
  // target tracks what a Save writes to: a named custom level, an edit-override
  // of a built-in level, or a brand-new build (named on save).
  const editor = {
    grid: [], brush: '#', ing: 'lettuce', dir: 'straight',
    recipes: new Set(), avatars: new Set(),
    charScale: 2, wallpaper: DEFAULT_WALLPAPER,
    target: { kind: 'new' },
  };

  const PALETTE = [
    { t: '.', emoji: '⬜', label: 'Floor',   cls: 'floor' },
    { t: '#', emoji: '🟫', label: 'Counter', cls: 'counter' },
    { t: 'B', emoji: '🔪', label: 'Board',   cls: 'station' },
    { t: 'S', emoji: '🍳', label: 'Pan',     cls: 'station' },
    { t: 'O', emoji: '🥘', label: 'Pot',     cls: 'station' },
    { t: 'V', emoji: '🔥', label: 'Oven',    cls: 'station' },
    { t: 'P', emoji: '🍽️', label: 'Plates',  cls: 'station' },
    { t: 'W', emoji: '🟩', label: 'Serve',   cls: 'serve' },
    { t: 'K', emoji: '🚰', label: 'Sink',    cls: 'station' },
    { t: 'T', emoji: '🗑️', label: 'Trash',   cls: 'station' },
    { t: 'C', emoji: '📦', label: 'Crate',   cls: 'crate' },
  ];
  const PAL_BY_T = Object.fromEntries(PALETTE.map((p) => [p.t, p]));
  const DEFAULT_LAYOUT = ['.1B2B3.', '#.....#', '#..#..P', 'P..#..#', '#.....#', '.T.W#W.'];
  const DEFAULT_CRATES = { 1: 'lettuce', 2: 'tomato', 3: 'cucumber' };

  async function ensureCatalog() {
    if (catalog) return catalog;
    try { catalog = await (await fetch('/api/catalog')).json(); }
    catch { catalog = { recipes: [], ingredients: [], presets: [] }; }
    return catalog;
  }
  function ingEmoji(id) {
    const i = (catalog.ingredients || []).find((x) => x.id === id);
    return i ? i.emoji : '📦';
  }
  function loadBoard(layoutRows, cratesMap) {
    cratesMap = cratesMap || {};
    editor.grid = (layoutRows || DEFAULT_LAYOUT).map((row) =>
      [...String(row)].map((ch) => {
        if (/[1-9]/.test(ch)) return { t: 'C', ing: cratesMap[ch] || 'lettuce', dir: 'straight' };
        if ('.#BSOVPWTK'.includes(ch)) return { t: ch, ing: null, dir: 'straight' };
        return { t: '.', ing: null, dir: 'straight' };
      }));
  }
  function cellLabel(cell) {
    if (cell.t === 'C') return ingEmoji(cell.ing);
    if (cell.t === '.') return '';
    return PAL_BY_T[cell.t] ? PAL_BY_T[cell.t].emoji : '';
  }
  function cellCls(cell) { return 'cell ' + (PAL_BY_T[cell.t] ? PAL_BY_T[cell.t].cls : 'floor'); }

  function renderPresets() {
    const wrap = $('builder-presets'); wrap.innerHTML = '';
    const mk = (label, fn) => { const b = document.createElement('button'); b.className = 'preset-btn'; b.textContent = label; b.onclick = fn; wrap.appendChild(b); };
    mk('⬜ Empty 7×6', () => { loadBoard(['.......', '.......', '.......', '.......', '.......', '...W...'], {}); editor.target = { kind: 'new' }; renderGrid(); SFX.tap(); });
    for (const p of (catalog.presets || [])) {
      mk(`${p.emoji || '🍳'} ${p.name}`, () => {
        loadBoard(p.layout, p.crates);
        editor.target = { kind: 'new' }; // a preset is a starting point for a new build
        editor.recipes = new Set(p.recipes || []);
        if (p.duration) $('sl-duration').value = p.duration;
        if (Array.isArray(p.stars)) { $('st-1').value = p.stars[0]; $('st-2').value = p.stars[1]; $('st-3').value = p.stars[2]; }
        renderGrid(); renderRecipes(); syncOutputs(); SFX.tap();
      });
    }
    // Your crew's saved boards (persisted to the kitchen code, across sessions).
    const saved = (lobby && lobby.boards) || {};
    const names = Object.keys(saved);
    if (names.length) {
      const sep = document.createElement('div');
      sep.className = 'preset-sep';
      sep.textContent = '💾 Saved boards';
      wrap.appendChild(sep);
      for (const name of names) {
        const b = document.createElement('button');
        b.className = 'preset-btn saved';
        b.innerHTML = `${escapeHtml(name)} <span class="preset-del" title="Delete">×</span>`;
        b.onclick = (e) => {
          if (e.target.classList.contains('preset-del')) { socket.emit('delete_board', name, () => {}); return; }
          loadConfig(saved[name]);
          editor.target = { kind: 'custom', name }; // saving overwrites this board
          $('board-name').value = name;
          SFX.tap();
        };
        wrap.appendChild(b);
      }
    }
  }
  function renderPalette() {
    const wrap = $('builder-palette'); wrap.innerHTML = '';
    for (const p of PALETTE) {
      const b = document.createElement('button');
      b.className = 'pal-btn' + (editor.brush === p.t ? ' sel' : '');
      b.innerHTML = `<span class="pal-emoji">${p.emoji}</span>${p.label}`;
      b.onclick = () => { editor.brush = p.t; $('builder-cratepick').hidden = p.t !== 'C'; renderPalette(); SFX.tap(); };
      wrap.appendChild(b);
    }
  }
  function renderCratePick() {
    const sel = $('builder-ingredient'); sel.innerHTML = '';
    for (const i of (catalog.ingredients || [])) {
      const o = document.createElement('option'); o.value = i.id; o.textContent = `${i.emoji} ${i.name}`; sel.appendChild(o);
    }
    sel.value = editor.ing;
    sel.onchange = () => { editor.ing = sel.value; };
  }
  // Facing brush: every piece you place takes this direction. straight/front
  // overrides the wall-based default; left/right pick a directional sprite.
  function renderFacing() {
    const wrap = $('builder-facing'); if (!wrap) return;
    wrap.innerHTML = '<span class="small muted">Facing:</span>';
    [['straight', '⬆ Front'], ['right', '➡ Right'], ['left', '⬅ Left']].forEach(([d, label]) => {
      const b = document.createElement('button');
      b.type = 'button';
      b.className = 'face-btn' + (editor.dir === d ? ' sel' : '');
      b.textContent = label;
      b.onclick = () => { editor.dir = d; renderFacing(); SFX.tap(); };
      wrap.appendChild(b);
    });
  }
  // Apply the current brush (and facing) to a cell.
  function setCellAt(x, y) {
    if (editor.brush === '.') editor.grid[y][x] = { t: '.', ing: null, dir: 'straight' };
    else if (editor.brush === 'C') editor.grid[y][x] = { t: 'C', ing: editor.ing, dir: editor.dir };
    else editor.grid[y][x] = { t: editor.brush, ing: null, dir: editor.dir };
  }
  function renderGrid() {
    const g = $('builder-grid');
    const cols = editor.grid[0] ? editor.grid[0].length : 0;
    g.style.gridTemplateColumns = `repeat(${cols}, 30px)`;
    g.innerHTML = '';
    editor.grid.forEach((row, y) => row.forEach((cell, x) => {
      const b = document.createElement('button');
      b.type = 'button';
      b.className = cellCls(cell)
        + (cell.t !== '.' && cell.dir === 'left' ? ' face-left' : '')
        + (cell.t !== '.' && cell.dir === 'right' ? ' face-right' : '');
      b.dataset.x = x; b.dataset.y = y;
      b.textContent = cellLabel(cell);
      g.appendChild(b);
    }));
    setupGridDrag();
    schedulePreview();
  }
  // Tap a cell to place the brush; drag a placed piece to MOVE it; drag across
  // empty floor to paint. Pointer events cover both mouse and touch.
  function setupGridDrag() {
    const g = $('builder-grid');
    if (g.__dragSetup) return;
    g.__dragSetup = true;
    const cellAt = (cx, cy) => {
      const el = document.elementFromPoint(cx, cy);
      const c = el && el.closest && el.closest('.cell');
      return (c && c.dataset.x !== undefined) ? { x: +c.dataset.x, y: +c.dataset.y } : null;
    };
    let drag = null;
    g.addEventListener('pointerdown', (e) => {
      const c = e.target.closest && e.target.closest('.cell');
      if (!c) return;
      const x = +c.dataset.x, y = +c.dataset.y;
      drag = { sx: x, sy: y, moved: false, src: editor.grid[y][x] };
      try { g.setPointerCapture(e.pointerId); } catch {}
      e.preventDefault();
    });
    g.addEventListener('pointermove', (e) => {
      if (!drag) return;
      const c = cellAt(e.clientX, e.clientY);
      if (!c || (c.x === drag.sx && c.y === drag.sy)) return;
      drag.moved = true;
      if (drag.src.t === '.') { setCellAt(c.x, c.y); renderGrid(); } // paint-drag on floor
    });
    g.addEventListener('pointerup', (e) => {
      if (!drag) return;
      const end = cellAt(e.clientX, e.clientY);
      if (!drag.moved) {
        setCellAt(drag.sx, drag.sy); renderGrid(); SFX.tap();        // tap = place brush
      } else if (drag.src.t !== '.' && end && (end.x !== drag.sx || end.y !== drag.sy)) {
        editor.grid[drag.sy][drag.sx] = { t: '.', ing: null, dir: 'straight' };
        editor.grid[end.y][end.x] = drag.src;                       // drag a piece = move it
        renderGrid(); SFX.tap();
      }
      drag = null;
    });
  }
  function resizeBoard(kind) {
    const rows = editor.grid.length, cols = editor.grid[0] ? editor.grid[0].length : 0;
    const blank = () => ({ t: '.', ing: null, dir: 'straight' });
    if (kind === 'colplus' && cols < 12) editor.grid.forEach((r) => r.push(blank()));
    if (kind === 'colminus' && cols > 3) editor.grid.forEach((r) => r.pop());
    if (kind === 'rowplus' && rows < 12) editor.grid.push(Array.from({ length: cols }, blank));
    if (kind === 'rowminus' && rows > 3) editor.grid.pop();
    renderGrid();
  }
  function renderRecipes() {
    const wrap = $('builder-recipes'); wrap.innerHTML = '';
    for (const r of (catalog.recipes || [])) {
      const b = document.createElement('button');
      b.className = 'chip' + (editor.recipes.has(r.id) ? ' sel' : '');
      b.innerHTML = `${r.emoji} ${r.name}`;
      b.onclick = () => { editor.recipes.has(r.id) ? editor.recipes.delete(r.id) : editor.recipes.add(r.id); renderRecipes(); SFX.tap(); };
      wrap.appendChild(b);
    }
  }
  function avatarThumbHtml(key) {
    const ent = window.ASSETS && window.ASSETS[key];
    const path = typeof ent === 'string' ? ent : (ent && ent.path);
    return path ? `<img src="/${path}" alt="">` : '';
  }
  function renderAvatars() {
    const wrap = $('builder-avatars'); wrap.innerHTML = '';
    // Mirror the main menu's organized groups; each group can be added/removed
    // as a whole (e.g. drop all "Politics & Royals" at once) or per-character.
    const groups = CHEF_SECTIONS.map((s) => ({
      name: s.name, emoji: s.emoji,
      members: s.keys.map((k) => chefByKey.get(k)).filter((c) => c && avatarThumbHtml(c.key)),
    }));
    const leftovers = CHEFS.filter((c) => c.key !== 'chef'
      && !CHEF_SECTIONS.some((s) => s.keys.includes(c.key)) && avatarThumbHtml(c.key));
    if (leftovers.length) groups.push({ name: 'More Stars', emoji: '⭐', members: leftovers });

    for (const g of groups) {
      if (!g.members.length) continue;
      const keys = g.members.map((c) => c.key);
      const allSel = keys.every((k) => editor.avatars.has(k));
      const head = document.createElement('div');
      head.className = 'avatar-group-head';
      head.innerHTML = `<span class="agh-name">${g.emoji} ${escapeHtml(g.name)}</span>`;
      const toggle = document.createElement('button');
      toggle.type = 'button';
      toggle.className = 'group-toggle' + (allSel ? ' on' : '');
      toggle.textContent = allSel ? '✓ All' : '+ Add all';
      toggle.onclick = () => {
        if (allSel) keys.forEach((k) => editor.avatars.delete(k));
        else keys.forEach((k) => editor.avatars.add(k));
        renderAvatars(); schedulePreview(); SFX.tap();
      };
      head.appendChild(toggle);
      wrap.appendChild(head);

      const row = document.createElement('div');
      row.className = 'avatar-group-row';
      for (const c of g.members) {
        const b = document.createElement('button');
        b.className = 'chip' + (editor.avatars.has(c.key) ? ' sel' : '');
        b.innerHTML = `${avatarThumbHtml(c.key)}${escapeHtml(c.name)}`;
        b.onclick = () => { editor.avatars.has(c.key) ? editor.avatars.delete(c.key) : editor.avatars.add(c.key); renderAvatars(); schedulePreview(); SFX.tap(); };
        row.appendChild(b);
      }
      wrap.appendChild(row);
    }
  }
  function syncOutputs() {
    $('out-speed').textContent = (+$('sl-speed').value) + '×';
    $('out-every').textContent = $('sl-every').value + 's';
    $('out-ttl').textContent = $('sl-ttl').value + 's';
    $('out-maxopen').textContent = $('sl-maxopen').value;
    $('out-duration').textContent = $('sl-duration').value + 's';
    const cs = $('out-charsize'); if (cs) cs.textContent = (+editor.charScale).toFixed(2).replace(/\.?0+$/, '') + '×';
  }

  // ── Look & feel: character size slider + wallpaper picker ──────────────────
  function renderLookFeel() {
    const slider = $('sl-charsize');
    if (slider) slider.value = editor.charScale;
    const wrap = $('builder-wallpapers');
    if (wrap) {
      wrap.innerHTML = '';
      for (const w of WALLPAPERS) {
        const b = document.createElement('button');
        b.type = 'button';
        b.className = 'wp-btn' + (editor.wallpaper === w.id ? ' sel' : '');
        b.style.backgroundImage = `url('${w.url}')`;
        b.title = w.name;
        b.innerHTML = `<span class="wp-name">${w.name}</span>`;
        b.onclick = () => { editor.wallpaper = w.id; renderLookFeel(); schedulePreview(); SFX.tap(); };
        wrap.appendChild(b);
      }
    }
    syncOutputs();
  }

  // ── Live miniature preview — the board exactly as it'll play ───────────────
  // Reuses the real renderer (real sprites, real spacing, the chosen wallpaper
  // & character size) on a small canvas. Non-interactive: no game, no
  // cutting — just a faithful picture of the level you're building.
  let previewRenderer = null;
  let previewTimer = null;
  function destroyPreview() {
    if (previewRenderer) { previewRenderer.destroy(); previewRenderer = null; }
  }
  function schedulePreview() {
    clearTimeout(previewTimer);
    previewTimer = setTimeout(refreshPreview, 120);
  }
  function refreshPreview() {
    const wrap = $('builder-preview-wrap');
    const canvas = $('builder-preview-canvas');
    if (!wrap || !canvas || !window.KSRender) return;
    if (!$('screen-builder').classList.contains('active')) return;
    if (!wrap.clientWidth || !wrap.clientHeight) return; // not laid out yet
    const cfg = boardConfig();
    applyWallpaper(wrap, cfg.wallpaper);
    const ss = {
      levelId: 'preview', name: cfg.name, theme: 'diner',
      w: cfg.layout[0] ? cfg.layout[0].length : 0, h: cfg.layout.length,
      grid: cfg.layout, crates: cfg.crates, facings: cfg.facings,
      customers: cfg.customers, charScale: cfg.charScale, wallpaper: cfg.wallpaper,
      seed: 1, decor: null, recipes: [],
    };
    destroyPreview();
    previewRenderer = new KSRender.Renderer(canvas, ss, profile.id, () => {}, { preview: true });
    previewRenderer.setPreviewScene([profile.chef || 'chef']);
    requestAnimationFrame(() => previewRenderer && previewRenderer.resize());
  }
  async function openBuilder(opts = {}) {
    await ensureCatalog();
    builderReturn = opts.from || 'lobby';
    editor.brush = '#';
    editor.dir = 'straight';
    editor.ing = ((catalog.ingredients || [])[0] || { id: 'lettuce' }).id;

    // Figure out what we're editing and grab any previously-saved config for it.
    let savedCfg = null;
    if (opts.levelId && opts.custom) {                       // a saved custom level
      const name = opts.levelId.slice('custom:'.length);
      editor.target = { kind: 'custom', name };
      savedCfg = lobby && lobby.boards && lobby.boards[name];
      $('board-name').value = name;
    } else if (opts.levelId) {                               // a built-in level
      editor.target = { kind: 'override', levelId: opts.levelId };
      savedCfg = lobby && lobby.overrides && lobby.overrides[opts.levelId];
      $('board-name').value = '';
    } else {                                                 // a brand-new build
      editor.target = { kind: 'new' };
      $('board-name').value = '';
    }

    if (savedCfg) {
      loadConfig(savedCfg); // crew's saved board + tuning (restores charScale + wallpaper)
    } else {
      // start from the built-in board (preset) or the default starter board
      let preset = opts.preset;
      if (!preset && opts.levelId) preset = (catalog.presets || []).find((p) => p.id === opts.levelId);
      loadBoard(preset ? preset.layout : DEFAULT_LAYOUT, preset ? preset.crates : DEFAULT_CRATES);
      editor.recipes = new Set(preset ? (preset.recipes || ['salad']) : ['salad', 'big_salad']);
      editor.avatars = new Set((window.KSRender && KSRender.CUSTOMER_KEYS) || []);
      if (preset && preset.duration) $('sl-duration').value = preset.duration;
      if (preset && Array.isArray(preset.stars)) { $('st-1').value = preset.stars[0]; $('st-2').value = preset.stars[1]; $('st-3').value = preset.stars[2]; }
      editor.charScale = (preset && preset.charScale) || 2;
      editor.wallpaper = (preset && preset.wallpaper) || DEFAULT_WALLPAPER;
    }

    $('builder-cratepick').hidden = true;
    $('builder-title').textContent = opts.title || '🛠️ Level Builder';
    renderPresets(); renderPalette(); renderCratePick(); renderFacing(); renderGrid(); renderRecipes(); renderAvatars(); renderLookFeel(); syncOutputs();
    show('builder');
    requestAnimationFrame(refreshPreview);
  }
  // Serialize the editor into the level config used to play AND to save.
  function boardConfig() {
    let d = 1; const crates = {}; const facings = {};
    const layout = editor.grid.map((row, y) => row.map((cell, x) => {
      let ch;
      if (cell.t === 'C') { if (d > 9) ch = '.'; else { ch = String(d++); crates[ch] = cell.ing || 'lettuce'; } }
      else ch = cell.t;
      if (ch !== '.' && (cell.dir === 'left' || cell.dir === 'right')) facings[`${x},${y}`] = cell.dir;
      return ch;
    }).join(''));
    return {
      name: 'Custom Kitchen', layout, crates, facings,
      recipes: [...editor.recipes],
      speedMult: +$('sl-speed').value, every: +$('sl-every').value, ttl: +$('sl-ttl').value,
      maxOpen: +$('sl-maxopen').value, duration: +$('sl-duration').value,
      stars: [+$('st-1').value, +$('st-2').value, +$('st-3').value],
      plates: 4, customers: [...editor.avatars],
      charScale: +editor.charScale, wallpaper: editor.wallpaper,
    };
  }
  function loadConfig(cfg) {
    loadBoard(cfg.layout, cfg.crates);
    if (cfg.facings) for (const [k, v] of Object.entries(cfg.facings)) {
      const [fx, fy] = k.split(',').map(Number);
      if (editor.grid[fy] && editor.grid[fy][fx]) editor.grid[fy][fx].dir = v;
    }
    editor.recipes = new Set(cfg.recipes || []);
    editor.avatars = new Set((cfg.customers && cfg.customers.length) ? cfg.customers : ((window.KSRender && KSRender.CUSTOMER_KEYS) || []));
    if (cfg.speedMult) $('sl-speed').value = cfg.speedMult;
    if (cfg.every) $('sl-every').value = cfg.every;
    if (cfg.ttl) $('sl-ttl').value = cfg.ttl;
    if (cfg.maxOpen) $('sl-maxopen').value = cfg.maxOpen;
    if (cfg.duration) $('sl-duration').value = cfg.duration;
    if (Array.isArray(cfg.stars)) { $('st-1').value = cfg.stars[0]; $('st-2').value = cfg.stars[1]; $('st-3').value = cfg.stars[2]; }
    if (cfg.charScale) editor.charScale = cfg.charScale;
    editor.wallpaper = cfg.wallpaper || DEFAULT_WALLPAPER;
    renderGrid(); renderRecipes(); renderAvatars(); renderLookFeel(); syncOutputs();
  }
  function playCustom() {
    if (!editor.recipes.size) return toast('Pick at least one recipe.');
    SFX.tap();
    socket.emit('start_custom', boardConfig(), (res) => { if (res && res.error) toast(res.error); });
  }
  function saveCurrentBoard() {
    if (!editor.recipes.size) return toast('Pick at least one recipe.');
    const target = editor.target || { kind: 'new' };
    // Editing a built-in level writes a per-crew override — no name needed; the
    // level keeps its own slot and star record but uses your board from now on.
    if (target.kind === 'override') {
      SFX.tap();
      socket.emit('save_override', { levelId: target.levelId, cfg: boardConfig() }, (res) => {
        if (res && res.error) return toast(res.error);
        toast('Saved — this level now uses your layout 💾');
        show(builderReturn);
      });
      return;
    }
    // New build or editing a custom level: save under a name. It appears (or
    // updates) at the bottom of the level selector.
    const name = ($('board-name').value || '').trim();
    if (!name) return toast('Name your kitchen first.');
    SFX.tap();
    socket.emit('save_board', { name, cfg: boardConfig() }, (res) => {
      if (res && res.error) return toast(res.error);
      toast(`Saved "${name}" 💾`);
      editor.target = { kind: 'custom', name }; // further saves overwrite it
    });
  }
  if ($('builder-back')) {
    $('builder-back').onclick = () => { SFX.tap(); destroyPreview(); show(builderReturn); };
    $('builder-play').onclick = () => { destroyPreview(); playCustom(); };
    $('board-save').onclick = saveCurrentBoard;
    $('btn-open-builder').onclick = () => openBuilder({ from: 'lobby' });
    document.querySelectorAll('.builder-size .btn-mini').forEach((b) => {
      b.onclick = () => { resizeBoard(b.dataset.size); SFX.tap(); };
    });
    ['sl-speed', 'sl-every', 'sl-ttl', 'sl-maxopen', 'sl-duration'].forEach((id) => {
      const el = $(id); if (el) el.addEventListener('input', syncOutputs);
    });
    const csEl = $('sl-charsize');
    if (csEl) csEl.addEventListener('input', () => {
      editor.charScale = +csEl.value; syncOutputs(); schedulePreview();
    });
  }

  // ---------- version tag (aligns with GitHub release + deployed commit) ----------
  fetch('/api/version').then((r) => r.json()).then((v) => {
    const el = document.getElementById('version-tag');
    if (el) el.textContent = `v${v.version}` + (v.commit && v.commit !== 'local' ? ` · ${v.commit}` : '');
  }).catch(() => {});

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
      // Entering the BOND admin kitchen (the sandbox) opens its level builder
      // by default — even via ?join=BOND, which is what syncUrl writes once
      // you're in. (Skipped over a live round; see joinCrew.)
      if (joinParam === 'BOND') bootToBuilder = true;
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
  } else if (!myCode || myCode === 'BOND') {
    // Sandbox default: the bare URL (no ?join) drops you straight into the BOND
    // admin kitchen's level builder — that's where the levels are being designed
    // right now. Fires for a fresh visit AND for reloads of the BOND kitchen,
    // but not if you've joined some other kitchen this session (that's
    // remembered) and not over a live round (joinCrew jumps into the game).
    myCode = 'BOND';
    sessionStorage.setItem('ks-code', 'BOND');
    bootToBuilder = true;
    if (!profile.name) { profile.name = 'Chef'; saveProfile(); }
    // (the connect handler's auto-rejoin performs the single join → builder)
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

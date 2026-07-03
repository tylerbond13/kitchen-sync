// Live room management: lobby membership, game lifecycle, socket wiring.
// A "crew" is the persistent record (store.js); a "room" is its live session.
const { Game } = require('./game');
const { LEVELS, RECIPES, ING, SECTIONS, UPGRADES } = require('./levels');
const { SousChef } = require('./sousChef');
const store = require('./store');

const TICK_MS = 1000 / 12;
// The AI teammate plays as a reserved, socket-less "player".
const BOT_ID = 'bot:sous-chef';
function botProfile() {
  return { id: BOT_ID, name: 'Sous-Chef', avatar: '🤖', chef: 'chef', connected: true, bot: true };
}
// The Sous-Chef is earned in the shop: hire it, then teach it each skill.
const BOT_SKILLS = { sous_chop: 'chop', sous_wash: 'wash', sous_cook: 'cook', sous_plate: 'plate', sous_serve: 'serve' };
function isBotHired(crew) {
  if (crew.code === store.ADMIN_CODE) return true;
  return !!(crew.wallet && crew.wallet.upgrades && crew.wallet.upgrades.sous_chef);
}
function botCaps(crew) {
  if (crew.code === store.ADMIN_CODE) return new Set(Object.values(BOT_SKILLS));
  const u = (crew.wallet && crew.wallet.upgrades) || {};
  const caps = new Set();
  for (const [id, skill] of Object.entries(BOT_SKILLS)) if (u[id]) caps.add(skill);
  return caps;
}
const MAX_PLAYERS = 8;
const MAX_RADIO_QUEUE = 12;

// ── Milestone payouts — design-roadmap #11 ──────────────────────────────────
// Ids/targets mirror the client's milestoneList (app.js). Rewards are sized so
// 2-3 claims ≈ one 600-1,800 coin upgrade — they bridge new crews across the
// gap to their first purchase. Checks validate against crew data; the two
// character milestones are device-personal (unlocks live in each player's
// lifetime stars), so the server accepts the client's count for those two.
const MILESTONES = {
  first_service:  { reward: 100,  check: (crew) => crew.stats.rounds >= 1 },
  rising_star:    { reward: 150,  check: (crew, lv) => lv.some((l) => l.section !== 'custom' && l.stars === 3) },
  hire_help:      { reward: 150,  check: (crew) => isBotHired(crew) },
  master_teacher: { reward: 500,  check: (crew) => botCaps(crew).size >= 5 },
  seasoned_crew:  { reward: 300,  check: (crew) => crew.stats.rounds >= 25 },
  growing_cast:   { reward: 250,  check: (c, lv, x) => Number(x && x.chars) >= 10 },
  trailblazer:    { reward: 500,  check: (crew, lv) => lv.filter((l) => l.section !== 'custom').every((l) => l.unlocked) },
  line_cook:      { reward: 250,  check: (crew) => crew.stats.meals >= 100 },
  big_earner:     { reward: 750,  check: (crew) => crew.stats.earned >= 10000 },
  perfectionist:  { reward: 2000, check: (crew, lv) => { const camp = lv.filter((l) => l.section !== 'custom'); return camp.length > 0 && camp.every((l) => l.stars === 3); } },
  head_chef:      { reward: 750,  check: (crew) => crew.stats.meals >= 500 },
  full_ensemble:  { reward: 1000, check: (c, lv, x) => Number(x && x.chars) >= Math.max(1, Number((x && x.total) || 70)) },
};
const VIDEO_ID_RE = /^[\w-]{11}$/;

const rooms = new Map(); // code -> room

function levelList(crew) {
  store.ensureCrewExtras(crew);
  const adminCrew = crew.code === store.ADMIN_CODE; // BOND: everything unlocked
  const list = LEVELS.map((lvl, i) => {
    const prog = crew.progress[lvl.id] || { stars: 0, bestScore: 0 };
    const prevId = i > 0 ? LEVELS[i - 1].id : null;
    // beta levels (e.g. Cake World) are always open so they're easy to try.
    const unlocked = adminCrew || lvl.beta || lvl.bonus || i === 0 || (crew.progress[prevId] || {}).stars >= 1;
    return {
      id: lvl.id, n: lvl.n, name: lvl.name, blurb: lvl.blurb, emoji: lvl.emoji,
      section: lvl.section || 'diner', beta: !!lvl.beta, bonus: !!lvl.bonus,
      stars: prog.stars, bestScore: prog.bestScore, unlocked,
      thresholds: lvl.stars,
      edited: !!crew.overrides[lvl.id], // this crew rearranged the stock board
    };
  });
  // Saved custom boards become their own playable levels at the bottom of the
  // selector, each with an independent star record (keyed "custom:<name>").
  let n = LEVELS.length;
  for (const [name, cfg] of Object.entries(crew.boards || {})) {
    const id = `custom:${name}`;
    const prog = crew.progress[id] || { stars: 0, bestScore: 0 };
    const recipes = Array.isArray(cfg.recipes) ? cfg.recipes.length : 0;
    list.push({
      id, n: ++n, name, emoji: '🛠️',
      blurb: recipes ? `Your build · ${recipes} recipe${recipes > 1 ? 's' : ''}` : 'Your custom kitchen',
      section: 'custom', beta: false, custom: true,
      stars: prog.stars, bestScore: prog.bestScore, unlocked: true,
      thresholds: Array.isArray(cfg.stars) ? cfg.stars : undefined,
    });
  }
  return list;
}

// The "Your Kitchens" section only exists when a crew has saved a board, so it
// never shows an empty header.
function sectionList(crew) {
  store.ensureCrewExtras(crew);
  if (Object.keys(crew.boards || {}).length) {
    return [...SECTIONS, { id: 'custom', name: 'Your Kitchens', emoji: '🛠️', blurb: 'Boards your crew built.' }];
  }
  return SECTIONS;
}

function getRoom(code) {
  return rooms.get(code) || null;
}

function ensureRoom(crew) {
  let room = rooms.get(crew.code);
  if (!room) {
    room = {
      code: crew.code,
      crew,
      sockets: new Map(), // socket.id -> { socket, playerId }
      players: new Map(), // playerId -> { id, name, avatar, chef, connected }
      game: null,
      loop: null,
      hostId: crew.hostId,
      exited: new Set(), // players who backed out of the current round
      radio: null,       // currently playing YouTube track
      radioQueue: [],    // tracks queued for upcoming rounds
    };
    rooms.set(crew.code, room);
  }
  return room;
}

function roomBroadcast(io, room, event, data) {
  io.to(`room:${room.code}`).emit(event, data);
}

function publicTrack(track) {
  if (!track) return null;
  return {
    id: track.id,
    videoId: track.videoId,
    title: track.title,
    channel: track.channel,
    duration: track.duration,
    thumbnail: track.thumbnail,
    requestedBy: track.requestedBy,
  };
}

function radioPayload(room) {
  return {
    radio: room.radio ? { ...room.radio } : null,
    queue: (room.radioQueue || []).map(publicTrack),
    now: Date.now(),
  };
}

function makeTrack(cmd, by) {
  const src = cmd.track && typeof cmd.track === 'object' ? cmd.track : cmd;
  const videoId = String(src.videoId || '').trim();
  if (!VIDEO_ID_RE.test(videoId)) return null;
  return {
    id: `q-${Date.now().toString(36)}-${Math.random().toString(36).slice(2, 7)}`,
    videoId,
    title: String(src.title || '').trim().slice(0, 120) || 'YouTube song',
    channel: String(src.channel || '').trim().slice(0, 80),
    duration: String(src.duration || '').trim().slice(0, 16),
    thumbnail: String(src.thumbnail || '').trim().slice(0, 300),
    requestedBy: by,
  };
}

function playNextRadio(io, room) {
  const queue = room.radioQueue || [];
  const track = queue.shift();
  if (!track) {
    room.radio = null;
    roomBroadcast(io, room, 'radio', radioPayload(room));
    return null;
  }
  room.radio = {
    ...publicTrack(track),
    startedAt: Date.now(),
    paused: false,
    by: track.requestedBy,
  };
  roomBroadcast(io, room, 'radio', radioPayload(room));
  return room.radio;
}

function stopRadio(io, room) {
  if (!room.radio) return;
  room.radio = null;
  roomBroadcast(io, room, 'radio', radioPayload(room));
}

function lobbyState(room) {
  store.ensureCrewExtras(room.crew);
  return {
    code: room.code,
    hostId: effectiveHost(room),
    players: [...room.players.values()],
    levels: levelList(room.crew),
    sections: sectionList(room.crew),
    wallet: room.crew.wallet,
    crewStats: room.crew.stats,
    upgrades: UPGRADES,
    music: radioPayload(room),
    boards: room.crew.boards || {},
    overrides: room.crew.overrides || {},
    inGame: !!room.game && room.game.phase === 'playing',
    bot: !!room.wantBot,                       // is the Sous-Chef toggled on for next round
    botHired: isBotHired(room.crew),           // owns 'Hire a Sous-Chef'
    botCaps: [...botCaps(room.crew)],          // skills taught: chop/wash/cook/plate/serve
    claimedMilestones: room.crew.claimedMilestones || {},
    milestoneRewards: Object.fromEntries(Object.entries(MILESTONES).map(([id, m]) => [id, m.reward])),
  };
}

function effectiveHost(room) {
  // crew creator if connected, else longest-connected player
  if (room.players.get(room.hostId)?.connected) return room.hostId;
  for (const [id, p] of room.players) {
    if (p.connected) return id;
  }
  return room.hostId;
}

function clampNum(v, lo, hi, def) {
  v = Number(v);
  if (!Number.isFinite(v)) return def;
  return Math.max(lo, Math.min(hi, v));
}

// Turn a client builder config into a level object the Game understands.
function buildCustomLevel(c) {
  c = c || {};
  let layout = Array.isArray(c.layout) ? c.layout.map((r) => String(r)) : null;
  if (!layout || !layout.length) return { error: 'Board has no layout' };
  const w = Math.max(...layout.map((r) => r.length), 1);
  layout = layout.slice(0, 14).map((r) => r.padEnd(w, '.'));
  if (!layout.some((r) => r.includes('.'))) return { error: 'Board needs an open floor tile' };
  const recipes = (Array.isArray(c.recipes) ? c.recipes : []).filter((id) => RECIPES[id]);
  if (!recipes.length) return { error: 'Pick at least one recipe' };
  const stars = Array.isArray(c.stars) && c.stars.length === 3
    ? c.stars.map((s) => clampNum(s, 10, 100000, 300))
    : [300, 540, 780];
  return {
    id: 'custom', n: 0, section: 'diner', theme: c.theme || 'diner',
    name: String(c.name || 'Custom Kitchen').slice(0, 40), emoji: '🛠️',
    duration: clampNum(c.duration, 30, 600, 150),
    stars, exactStars: true,
    plates: c.plates ? clampNum(c.plates, 1, 12, 4) : undefined,
    crates: (c.crates && typeof c.crates === 'object') ? c.crates : {},
    layout,
    // cosmetic, builder-tunable: character (chef + customer) sprite size and the
    // board's background wallpaper.
    charScale: clampNum(c.charScale, 0.4, 4, 2),
    wallpaper: (typeof c.wallpaper === 'string' && c.wallpaper) ? c.wallpaper.slice(0, 24) : null,
    speedMult: clampNum(c.speedMult, 0.25, 5, 1),
    customers: (Array.isArray(c.customers) && c.customers.length) ? c.customers.map(String) : null,
    facings: (c.facings && typeof c.facings === 'object')
      ? Object.fromEntries(Object.entries(c.facings).filter(([, v]) => v === 'left' || v === 'right'))
      : null,
    orders: {
      recipes,
      every: clampNum(c.every, 3, 60, 6),
      ttl: clampNum(c.ttl, 15, 240, 60),
      maxOpen: clampNum(c.maxOpen, 1, 8, 4),
    },
  };
}

// Resolve a level id to the config the Game runs. Handles three cases:
//   • "custom:<name>" — a saved board, played under its own star-tracked id
//   • a built-in id the crew has edited — the stock level wearing its override
//     (board + tuning) while keeping the level's identity (id/name/theme/stars)
//   • a plain built-in id — the stock level
function resolveLevel(crew, levelId) {
  store.ensureCrewExtras(crew);
  if (typeof levelId === 'string' && levelId.startsWith('custom:')) {
    const name = levelId.slice('custom:'.length);
    const cfg = crew.boards[name];
    if (!cfg) return { error: 'That custom kitchen is gone.' };
    const level = buildCustomLevel(cfg);
    if (level.error) return level;
    level.id = levelId;
    level.name = name;
    return level;
  }
  const base = LEVELS.find((l) => l.id === levelId);
  if (!base) return { error: 'Unknown level' };
  const override = crew.overrides[levelId];
  if (!override) return base;
  const level = buildCustomLevel(override);
  if (level.error) return base; // a broken edit shouldn't lock you out — play stock
  // Keep the level's identity (placement, art theme, star record) but use the
  // crew's rearranged board + tuning.
  return {
    ...level,
    id: base.id, n: base.n, name: base.name, emoji: base.emoji,
    section: base.section, theme: base.theme, decor: base.decor, beta: base.beta,
  };
}

function startGame(io, room, levelId, custom) {
  let level;
  if (custom) {
    level = buildCustomLevel(custom);
    if (level.error) return { error: level.error };
  } else {
    const list = levelList(room.crew);
    const entry = list.find((l) => l.id === levelId);
    if (!entry) return { error: 'Unknown level' };
    if (!entry.unlocked) return { error: 'Level locked' };
    level = resolveLevel(room.crew, levelId);
    if (level.error) return { error: level.error };
  }
  if (room.game && room.game.phase === 'playing') return { error: 'Game in progress' };

  const roster = [...room.players.values()].filter((p) => p.connected);
  if (!roster.length) return { error: 'No players' };
  // The AI teammate joins the round as an extra chef when it's toggled on AND hired.
  const useBot = room.wantBot && isBotHired(room.crew);
  if (useBot) roster.push(botProfile());

  store.ensureCrewExtras(room.crew);
  room.exited = new Set();
  room.game = new Game(level, roster, {
    upgrades: room.crew.wallet.upgrades,
    autoChop: room.crew.settings.autoChop,
  });
  room.sousChef = useBot ? new SousChef(room.game, BOT_ID, botCaps(room.crew)) : null;
  roomBroadcast(io, room, 'game_start', room.game.staticState());
  // rounds own the speakers: drop whatever was playing, then start the queue
  if (room.radio) stopRadio(io, room);
  if ((room.radioQueue || []).length) playNextRadio(io, room);

  let last = Date.now();
  room.loop = setInterval(() => {
    const now = Date.now();
    const dt = Math.min((now - last) / 1000, 0.25);
    last = now;
    if (room.sousChef) { try { room.sousChef.think(dt); } catch (e) { /* a bot hiccup must never crash the round */ } }
    const events = room.game.tick(dt);
    roomBroadcast(io, room, 'state', room.game.dynamicState(events));
    if (room.game.phase === 'over') {
      finishGame(io, room);
    }
  }, TICK_MS);
  return { ok: true };
}

// A round nobody is playing anymore (everyone exited to the lobby or
// disconnected) must not keep running — it blocks every new start with
// "Game in progress" until its timer runs out.
function endIfAbandoned(io, room) {
  if (!room.game || room.game.phase !== 'playing') return;
  const active = [...room.players.values()]
    .filter((p) => p.connected && !room.exited.has(p.id));
  if (!active.length) finishGame(io, room);
}

function finishGame(io, room) {
  clearInterval(room.loop);
  room.loop = null;
  room.sousChef = null;
  const results = room.game.results();
  const record = store.recordLevelResult(room.crew, results.levelId, results.score, results.stars, results.delivered);
  for (const p of results.players) {
    store.recordPlayerResult(p.id, { delivered: p.delivered, stars: results.stars });
  }
  room.game = null;
  roomBroadcast(io, room, 'game_over', { ...results, record, crew: room.crew });
  stopRadio(io, room);
  roomBroadcast(io, room, 'lobby', lobbyState(room));
}

function attach(io) {
  io.on('connection', (socket) => {
    let joined = null; // { room, playerId }

    socket.on('hello', (profile, ack) => {
      if (typeof ack !== 'function') return;
      if (!profile || !profile.id) return ack({ error: 'No profile' });
      const player = store.upsertPlayer(profile);
      ack({ ok: true, player });
    });

    socket.on('create_crew', (profile, ack) => {
      if (typeof ack !== 'function') return;
      if (!profile || !profile.id) return ack({ error: 'No profile' });
      store.upsertPlayer(profile);
      const crew = store.createCrew(profile.id);
      ack({ ok: true, code: crew.code });
    });

    socket.on('join', ({ code, profile, crewBackup, playerBackup }, ack) => {
      if (typeof ack !== 'function') return;
      if (!profile || !profile.id) return ack({ error: 'No profile' });
      let crew = store.getCrew(code);
      if (!crew && String(code || '').toUpperCase().trim() === store.ADMIN_CODE) {
        crew = store.ensureAdminCrew(); // the admin kitchen always exists
      }
      if (!crew && crewBackup) {
        // server lost its data (ephemeral disk) — restore from this phone's backup
        crew = store.restoreCrew(crewBackup);
      }
      if (!crew) return ack({ error: 'No kitchen with that code. Check the letters?' });
      if (crewBackup && crewBackup.code === crew.code) store.mergeCrew(crew, crewBackup);

      const room = ensureRoom(crew);
      const connectedCount = [...room.players.values()].filter((p) => p.connected).length;
      if (!room.players.has(profile.id) && connectedCount >= MAX_PLAYERS) {
        return ack({ error: 'Kitchen is full (8 chefs max).' });
      }

      store.upsertPlayer(profile);
      if (playerBackup) store.mergePlayerStats(profile.id, playerBackup);
      store.touchCrewMember(crew, { id: profile.id, name: profile.name, avatar: profile.avatar, chef: profile.chef });

      // replace any stale socket for this player
      for (const [sid, entry] of room.sockets) {
        if (entry.playerId === profile.id && sid !== socket.id) {
          entry.socket.disconnect(true);
          room.sockets.delete(sid);
        }
      }
      room.sockets.set(socket.id, { socket, playerId: profile.id });
      room.players.set(profile.id, {
        id: profile.id, name: profile.name, avatar: profile.avatar, chef: profile.chef || 'chef', connected: true,
      });
      joined = { room, playerId: profile.id };
      room.exited.delete(profile.id); // (re)joining puts you back in the round
      socket.join(`room:${room.code}`);

      ack({
        ok: true,
        code: room.code,
        lobby: lobbyState(room),
        crew,                                  // device backup of campaign progress
        player: store.getPlayer(profile.id),   // device backup of lifetime stats
        radio: radioPayload(room),
        // mid-game rejoin support
        game: room.game ? room.game.staticState() : null,
      });
      roomBroadcast(io, room, 'lobby', lobbyState(room));

      // late joiner enters a running game as a new chef
      if (room.game && room.game.phase === 'playing' && !room.game.players[profile.id]) {
        const spawn = room.game.spawnTiles[0];
        room.game.players[profile.id] = {
          id: profile.id, name: profile.name, avatar: profile.avatar, chef: profile.chef || 'chef',
          x: spawn.x + 0.5, y: spawn.y + 0.5,
          path: [], intent: null, queue: [], carry: null, working: false, delivered: 0,
        };
      }
    });

    socket.on('start_game', (levelId, ack) => {
      if (typeof ack !== 'function') ack = () => {};
      if (!joined) return ack({ error: 'Not in a kitchen' });
      // Any crew member can start a level — no host gate.
      ack(startGame(io, joined.room, levelId));
    });

    // Admin/test mode + pre-level board editing: start a round from a fully
    // custom level config (board layout, crates, orders, tuning, customers).
    socket.on('start_custom', (cfg, ack) => {
      if (typeof ack !== 'function') ack = () => {};
      if (!joined) return ack({ error: 'Not in a kitchen' });
      // Any crew member can start a custom/test round — no host gate.
      ack(startGame(io, joined.room, null, cfg));
    });

    // Toggle the AI teammate (Sous-Chef) on/off for the next round. It must be
    // hired in the Kitchen Shop first; once in the round it uses whatever skills
    // the crew has taught it. Pass true/false, or omit to toggle.
    socket.on('toggle_bot', (on, ack) => {
      if (typeof ack !== 'function') ack = () => {};
      if (!joined) return ack({ error: 'Not in a kitchen' });
      const room = joined.room;
      if (!isBotHired(room.crew)) {
        room.wantBot = false;
        roomBroadcast(io, room, 'lobby', lobbyState(room));
        return ack({ error: 'Hire a Sous-Chef in the Kitchen Shop first!' });
      }
      room.wantBot = on === undefined ? !room.wantBot : !!on;
      roomBroadcast(io, room, 'lobby', lobbyState(room));
      ack({ ok: true, bot: !!room.wantBot });
    });

    // Change your character from the lobby — updates the live crew so everyone
    // sees your pick, and persists it on the crew member record.
    socket.on('set_chef', (chef, ack) => {
      if (typeof ack !== 'function') ack = () => {};
      if (!joined) return ack({ error: 'Not in a kitchen' });
      const room = joined.room, pid = joined.playerId;
      const key = String(chef || 'chef').slice(0, 64);
      const rp = room.players.get(pid);
      if (rp) {
        rp.chef = key;
        store.touchCrewMember(room.crew, { id: pid, name: rp.name, avatar: rp.avatar, chef: key });
      }
      roomBroadcast(io, room, 'lobby', lobbyState(room));
      ack({ ok: true });
    });

    socket.on('tap', ({ x, y }) => {
      if (!joined || !joined.room.game) return;
      joined.room.game.tap(joined.playerId, x, y);
    });

    // desktop keyboard controls — arrow keys steer, space interacts
    socket.on('steer', ({ dx, dy } = {}) => {
      if (!joined || !joined.room.game) return;
      joined.room.game.steer(joined.playerId, dx, dy);
    });

    socket.on('interact', () => {
      if (!joined || !joined.room.game) return;
      joined.room.game.interactFacing(joined.playerId);
    });

    socket.on('autochop', (on) => {
      if (!joined) return;
      const crew = joined.room.crew;
      store.ensureCrewExtras(crew);
      if (!crew.wallet.upgrades.auto_chopper) return; // shop upgrade required
      crew.settings.autoChop = !!on;
      if (joined.room.game) joined.room.game.autoChop = !!on;
    });

    // crew radio: one shared YouTube jukebox per kitchen — anyone can DJ.
    // The lobby builds a queue; each round plays it in order.
    socket.on('radio', (cmd) => {
      if (!joined || !cmd || typeof cmd !== 'object') return;
      const room = joined.room;
      const by = (room.players.get(joined.playerId) || {}).name || 'someone';
      const r = room.radio;
      if (cmd.action === 'enqueue') {
        const queue = room.radioQueue || (room.radioQueue = []);
        if (queue.length >= MAX_RADIO_QUEUE) return;
        const track = makeTrack(cmd, by);
        if (!track) return;
        queue.push(track);
        store.logSongRequest({
          at: new Date().toISOString(),
          crew: room.code,
          playerId: joined.playerId,
          player: by,
          videoId: track.videoId,
          title: track.title,
          channel: track.channel,
          duration: track.duration,
        });
        roomBroadcast(io, room, 'radio', radioPayload(room));
        if (room.game && room.game.phase === 'playing' && !room.radio) playNextRadio(io, room);
        return;
      }
      if (cmd.action === 'remove' && typeof cmd.id === 'string') {
        const queue = room.radioQueue || (room.radioQueue = []);
        const idx = queue.findIndex((track) => track.id === cmd.id);
        if (idx === -1) return;
        queue.splice(idx, 1);
        roomBroadcast(io, room, 'radio', radioPayload(room));
        return;
      }
      if (cmd.action === 'clear') {
        room.radioQueue = [];
        roomBroadcast(io, room, 'radio', radioPayload(room));
        return;
      }
      if (cmd.action === 'skip' && r && room.game && room.game.phase === 'playing') {
        playNextRadio(io, room);
        return;
      }
      if (cmd.action === 'ended' && r && cmd.videoId === r.videoId) {
        if (room.game && room.game.phase === 'playing') playNextRadio(io, room);
        else stopRadio(io, room);
        return;
      }
      if (cmd.action === 'play' && typeof cmd.videoId === 'string' && VIDEO_ID_RE.test(cmd.videoId)) {
        room.radio = {
          videoId: cmd.videoId,
          title: String(cmd.title || '').slice(0, 100),
          startedAt: Date.now(),
          paused: false,
          by,
        };
      } else if (cmd.action === 'pause' && r && !r.paused) {
        r.paused = true;
        r.pausedAt = Date.now();
        r.by = by;
      } else if (cmd.action === 'resume' && r && r.paused) {
        r.startedAt += Date.now() - r.pausedAt;
        r.paused = false;
        r.by = by;
      } else if (cmd.action === 'stop' && r) {
        room.radio = null;
      } else {
        return;
      }
      roomBroadcast(io, room, 'radio', radioPayload(room));
    });

    socket.on('buy_upgrade', (id, ack) => {
      if (typeof ack !== 'function') ack = () => {};
      if (!joined) return ack({ error: 'Not in a kitchen' });
      const up = UPGRADES[id];
      if (!up) return ack({ error: 'Unknown upgrade' });
      const crew = joined.room.crew;
      store.ensureCrewExtras(crew);
      if (up.needs && !crew.wallet.upgrades[up.needs]) {
        return ack({ error: `Unlock "${UPGRADES[up.needs].name}" first` });
      }
      if (!store.buyUpgrade(crew, id, up.cost)) {
        return ack({ error: 'Not enough coins yet — keep cooking!' });
      }
      ack({ ok: true });
      roomBroadcast(io, joined.room, 'lobby', lobbyState(joined.room));
    });

    // Milestone claims: validated server-side against crew data, paid once.
    socket.on('claim_milestone', ({ id, chars, totalChars } = {}, ack) => {
      if (typeof ack !== 'function') ack = () => {};
      if (!joined) return ack({ error: 'Not in a kitchen' });
      const ms = MILESTONES[id];
      if (!ms) return ack({ error: 'Unknown milestone' });
      const crew = joined.room.crew;
      store.ensureCrewExtras(crew);
      if (crew.claimedMilestones[id]) return ack({ error: 'Already claimed' });
      if (!ms.check(crew, levelList(crew), { chars, total: totalChars })) {
        return ack({ error: 'Not done yet — keep cooking!' });
      }
      store.claimMilestone(crew, id, ms.reward);
      ack({ ok: true, reward: ms.reward });
      roomBroadcast(io, joined.room, 'lobby', lobbyState(joined.room));
    });

    // Saved custom boards persist under the crew codename across sessions.
    socket.on('save_board', ({ name, cfg } = {}, ack) => {
      if (typeof ack !== 'function') ack = () => {};
      if (!joined) return ack({ error: 'Not in a kitchen' });
      const built = buildCustomLevel(cfg);
      if (built.error) return ack({ error: built.error });
      if (!store.saveBoard(joined.room.crew, name, cfg)) return ack({ error: 'Could not save (name empty or too many boards)' });
      ack({ ok: true });
      roomBroadcast(io, joined.room, 'lobby', lobbyState(joined.room));
    });

    socket.on('delete_board', (name, ack) => {
      if (typeof ack !== 'function') ack = () => {};
      if (!joined) return ack({ error: 'Not in a kitchen' });
      store.deleteBoard(joined.room.crew, name);
      ack({ ok: true });
      roomBroadcast(io, joined.room, 'lobby', lobbyState(joined.room));
    });

    // Editing a built-in level: persist the rearranged board + tuning for THIS
    // codename so every future play of that level uses it. cfg:null reverts.
    socket.on('save_override', ({ levelId, cfg } = {}, ack) => {
      if (typeof ack !== 'function') ack = () => {};
      if (!joined) return ack({ error: 'Not in a kitchen' });
      if (!LEVELS.find((l) => l.id === levelId)) return ack({ error: 'Unknown level' });
      if (cfg) {
        const built = buildCustomLevel(cfg);
        if (built.error) return ack({ error: built.error });
      }
      store.saveOverride(joined.room.crew, levelId, cfg || null);
      ack({ ok: true });
      roomBroadcast(io, joined.room, 'lobby', lobbyState(joined.room));
    });

    socket.on('pause', (on) => {
      if (!joined || !joined.room.game) return;
      // any chef can pause or resume — it's a family kitchen
      const game = joined.room.game;
      game.paused = !!on;
      const p = joined.room.players.get(joined.playerId);
      game.pausedBy = on ? (p ? p.name : 'someone') : null;
    });

    // any chef can restart the active level from the pause menu — the
    // abandoned round is a do-over, so it records no progress
    socket.on('restart_level', (payload, ack) => {
      if (typeof ack !== 'function') ack = typeof payload === 'function' ? payload : () => {};
      if (!joined) return ack({ error: 'Not in a kitchen' });
      const room = joined.room;
      if (!room.game || room.game.phase !== 'playing') return ack({ error: 'No round to restart' });
      const levelId = room.game.level.id;
      clearInterval(room.loop);
      room.loop = null;
      room.game = null;
      ack(startGame(io, room, levelId));
    });

    // player backed out to the lobby; the round keeps running for the rest
    // of the crew, but if NOBODY is left playing it wraps up immediately
    socket.on('exit_round', () => {
      if (!joined) return;
      joined.room.exited.add(joined.playerId);
      // dissolve any wait-for-station intent — an absent chef must never
      // auto-grab finished food into hands nobody controls
      const gp = joined.room.game && joined.room.game.players[joined.playerId];
      if (gp) gp.await = null;
      endIfAbandoned(io, joined.room);
    });

    socket.on('leave', () => {
      detach();
    });

    socket.on('disconnect', () => {
      detach();
    });

    function detach() {
      if (!joined) return;
      const { room, playerId } = joined;
      room.sockets.delete(socket.id);
      const stillConnected = [...room.sockets.values()].some((e) => e.playerId === playerId);
      if (!stillConnected && room.players.has(playerId)) {
        room.players.get(playerId).connected = false;
        // dissolve any wait-for-station intent (see exit_round): a chef with
        // no socket must never auto-grab finished food out of the kitchen
        const gp = room.game && room.game.players[playerId];
        if (gp) gp.await = null;
      }
      roomBroadcast(io, room, 'lobby', lobbyState(room));
      endIfAbandoned(io, room);
      // tear down empty idle rooms
      const anyConnected = [...room.players.values()].some((p) => p.connected);
      if (!anyConnected) {
        if (room.loop) {
          clearInterval(room.loop);
          room.loop = null;
        }
        if (room.game && room.game.phase === 'playing') room.game = null;
        rooms.delete(room.code);
      }
      joined = null;
      socket.leave(`room:${room.code}`);
    }
  });
}

module.exports = { attach, getRoom, levelList, RECIPES };

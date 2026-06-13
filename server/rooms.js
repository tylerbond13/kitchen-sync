// Live room management: lobby membership, game lifecycle, socket wiring.
// A "crew" is the persistent record (store.js); a "room" is its live session.
const { Game } = require('./game');
const { LEVELS, RECIPES, SECTIONS, UPGRADES } = require('./levels');
const store = require('./store');

const EMOTES = ['🔥', '😱', '🙏', '🎉', '🍽️', '❤️'];

const TICK_MS = 1000 / 12;
const MAX_PLAYERS = 8;
const MAX_RADIO_QUEUE = 12;
const VIDEO_ID_RE = /^[\w-]{11}$/;

const rooms = new Map(); // code -> room

function levelList(crew) {
  const adminCrew = crew.code === store.ADMIN_CODE; // BOND: everything unlocked
  return LEVELS.map((lvl, i) => {
    const prog = crew.progress[lvl.id] || { stars: 0, bestScore: 0 };
    const prevId = i > 0 ? LEVELS[i - 1].id : null;
    const unlocked = adminCrew || i === 0 || (crew.progress[prevId] || {}).stars >= 1;
    return {
      id: lvl.id, n: lvl.n, name: lvl.name, blurb: lvl.blurb, emoji: lvl.emoji,
      section: lvl.section || 'diner',
      stars: prog.stars, bestScore: prog.bestScore, unlocked,
      thresholds: lvl.stars,
    };
  });
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
    sections: SECTIONS,
    wallet: room.crew.wallet,
    crewStats: room.crew.stats,
    upgrades: UPGRADES,
    music: radioPayload(room),
    inGame: !!room.game && room.game.phase === 'playing',
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

function startGame(io, room, levelId) {
  const level = LEVELS.find((l) => l.id === levelId);
  if (!level) return { error: 'Unknown level' };
  const list = levelList(room.crew);
  if (!list.find((l) => l.id === levelId)?.unlocked) return { error: 'Level locked' };
  if (room.game && room.game.phase === 'playing') return { error: 'Game in progress' };

  const roster = [...room.players.values()].filter((p) => p.connected);
  if (!roster.length) return { error: 'No players' };

  store.ensureCrewExtras(room.crew);
  room.exited = new Set();
  room.game = new Game(level, roster, {
    upgrades: room.crew.wallet.upgrades,
    autoChop: room.crew.settings.autoChop,
  });
  roomBroadcast(io, room, 'game_start', room.game.staticState());
  // rounds own the speakers: drop whatever was playing, then start the queue
  if (room.radio) stopRadio(io, room);
  if ((room.radioQueue || []).length) playNextRadio(io, room);

  let last = Date.now();
  room.loop = setInterval(() => {
    const now = Date.now();
    const dt = Math.min((now - last) / 1000, 0.25);
    last = now;
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
  const results = room.game.results();
  store.recordLevelResult(room.crew, results.levelId, results.score, results.stars, results.delivered);
  for (const p of results.players) {
    store.recordPlayerResult(p.id, { delivered: p.delivered, stars: results.stars });
  }
  room.game = null;
  roomBroadcast(io, room, 'game_over', { ...results, crew: room.crew });
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
      if (joined.playerId !== effectiveHost(joined.room)) return ack({ error: 'Only the host can start' });
      ack(startGame(io, joined.room, levelId));
    });

    socket.on('tap', ({ x, y }) => {
      if (!joined || !joined.room.game) return;
      joined.room.game.tap(joined.playerId, x, y);
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

    socket.on('emote', (idx) => {
      if (!joined) return;
      const emoji = EMOTES[idx];
      if (!emoji) return;
      const now = Date.now();
      if (socket._lastEmote && now - socket._lastEmote < 900) return; // gentle rate limit
      socket._lastEmote = now;
      roomBroadcast(io, joined.room, 'emote', { playerId: joined.playerId, emoji });
    });

    socket.on('buy_upgrade', (id, ack) => {
      if (typeof ack !== 'function') ack = () => {};
      if (!joined) return ack({ error: 'Not in a kitchen' });
      const up = UPGRADES[id];
      if (!up) return ack({ error: 'Unknown upgrade' });
      const crew = joined.room.crew;
      if (!store.buyUpgrade(crew, id, up.cost)) {
        return ack({ error: 'Not enough coins yet — keep cooking!' });
      }
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

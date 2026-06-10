// Live room management: lobby membership, game lifecycle, socket wiring.
// A "crew" is the persistent record (store.js); a "room" is its live session.
const { Game } = require('./game');
const { LEVELS, RECIPES } = require('./levels');
const store = require('./store');

const TICK_MS = 1000 / 12;
const MAX_PLAYERS = 8;

const rooms = new Map(); // code -> room

function levelList(crew) {
  return LEVELS.map((lvl, i) => {
    const prog = crew.progress[lvl.id] || { stars: 0, bestScore: 0 };
    const prevId = i > 0 ? LEVELS[i - 1].id : null;
    const unlocked = i === 0 || (crew.progress[prevId] || {}).stars >= 1;
    return {
      id: lvl.id, n: lvl.n, name: lvl.name, blurb: lvl.blurb, emoji: lvl.emoji,
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
      players: new Map(), // playerId -> { id, name, avatar, connected }
      game: null,
      loop: null,
      hostId: crew.hostId,
    };
    rooms.set(crew.code, room);
  }
  return room;
}

function roomBroadcast(io, room, event, data) {
  io.to(`room:${room.code}`).emit(event, data);
}

function lobbyState(room) {
  return {
    code: room.code,
    hostId: effectiveHost(room),
    players: [...room.players.values()],
    levels: levelList(room.crew),
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

  room.game = new Game(level, roster);
  roomBroadcast(io, room, 'game_start', room.game.staticState());

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

function finishGame(io, room) {
  clearInterval(room.loop);
  room.loop = null;
  const results = room.game.results();
  store.recordLevelResult(room.crew, results.levelId, results.score, results.stars);
  for (const p of results.players) {
    store.recordPlayerResult(p.id, { delivered: p.delivered, stars: results.stars });
  }
  room.game = null;
  roomBroadcast(io, room, 'game_over', { ...results, crew: room.crew });
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
      store.touchCrewMember(crew, { id: profile.id, name: profile.name, avatar: profile.avatar });

      // replace any stale socket for this player
      for (const [sid, entry] of room.sockets) {
        if (entry.playerId === profile.id && sid !== socket.id) {
          entry.socket.disconnect(true);
          room.sockets.delete(sid);
        }
      }
      room.sockets.set(socket.id, { socket, playerId: profile.id });
      room.players.set(profile.id, {
        id: profile.id, name: profile.name, avatar: profile.avatar, connected: true,
      });
      joined = { room, playerId: profile.id };
      socket.join(`room:${room.code}`);

      ack({
        ok: true,
        code: room.code,
        lobby: lobbyState(room),
        crew,                                  // device backup of campaign progress
        player: store.getPlayer(profile.id),   // device backup of lifetime stats
        // mid-game rejoin support
        game: room.game ? room.game.staticState() : null,
      });
      roomBroadcast(io, room, 'lobby', lobbyState(room));

      // late joiner enters a running game as a new chef
      if (room.game && room.game.phase === 'playing' && !room.game.players[profile.id]) {
        const spawn = room.game.spawnTiles[0];
        room.game.players[profile.id] = {
          id: profile.id, name: profile.name, avatar: profile.avatar,
          x: spawn.x + 0.5, y: spawn.y + 0.5,
          path: [], intent: null, carry: null, working: false, delivered: 0,
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

    socket.on('pause', (on) => {
      if (!joined || !joined.room.game) return;
      // any chef can pause or resume — it's a family kitchen
      const game = joined.room.game;
      game.paused = !!on;
      const p = joined.room.players.get(joined.playerId);
      game.pausedBy = on ? (p ? p.name : 'someone') : null;
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

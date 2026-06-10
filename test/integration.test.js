// End-to-end: two simulated phones create/join a crew, play a round,
// and the crew + profiles persist.
const test = require('node:test');
const assert = require('node:assert/strict');
const fs = require('fs');
const os = require('os');
const path = require('path');

process.env.DATA_DIR = fs.mkdtempSync(path.join(os.tmpdir(), 'ks-itest-'));

const { io: Client } = require('socket.io-client');
const { server, io } = require('../server/index');
const store = require('../server/store');

function connect(port) {
  return new Promise((resolve, reject) => {
    const sock = Client(`http://127.0.0.1:${port}`, { transports: ['websocket'] });
    sock.on('connect', () => resolve(sock));
    sock.on('connect_error', reject);
  });
}

function emitAck(sock, event, payload) {
  return new Promise((resolve) => sock.emit(event, payload, resolve));
}

function waitFor(sock, event, timeoutMs = 8000) {
  return new Promise((resolve, reject) => {
    const t = setTimeout(() => reject(new Error(`timeout waiting for ${event}`)), timeoutMs);
    sock.once(event, (data) => { clearTimeout(t); resolve(data); });
  });
}

test('two players: create, join, play a round, progress persists', async () => {
  await new Promise((res) => server.listen(0, res));
  const port = server.address().port;

  const tyler = await connect(port);
  const sib = await connect(port);
  const pTyler = { id: 'u-tyler', name: 'Tyler', avatar: '🧑‍🍳' };
  const pSib = { id: 'u-sib', name: 'Megan', avatar: '🦊' };

  // profiles register
  const hello = await emitAck(tyler, 'hello', pTyler);
  assert.ok(hello.ok);
  assert.equal(hello.player.name, 'Tyler');

  // host creates a crew
  const created = await emitAck(tyler, 'create_crew', pTyler);
  assert.ok(created.ok);
  assert.match(created.code, /^[A-Z]{4}$/);
  const code = created.code;

  // both join
  const j1 = await emitAck(tyler, 'join', { code, profile: pTyler });
  assert.ok(j1.ok);
  assert.equal(j1.lobby.hostId, 'u-tyler');
  assert.equal(j1.lobby.levels.filter((l) => l.unlocked).length, 1, 'only level 1 unlocked');

  const lobbyUpdate = waitFor(tyler, 'lobby');
  const j2 = await emitAck(sib, 'join', { code: code.toLowerCase(), profile: pSib });
  assert.ok(j2.ok, 'codes are case-insensitive');
  const lob = await lobbyUpdate;
  assert.equal(lob.players.length, 2);

  // bad code is rejected
  const bad = await emitAck(sib, 'join', { code: 'ZZZZ', profile: pSib });
  assert.ok(bad.error);
  // (that join attempt didn't kick them; rejoin to be safe)
  await emitAck(sib, 'join', { code, profile: pSib });

  // non-host cannot start
  const denied = await emitAck(sib, 'start_game', 'salad-days');
  assert.ok(denied.error);

  // host starts; both receive game_start and state ticks
  const gs1 = waitFor(tyler, 'game_start');
  const gs2 = waitFor(sib, 'game_start');
  const started = await emitAck(tyler, 'start_game', 'salad-days');
  assert.ok(started.ok, JSON.stringify(started));
  const stat = await gs1;
  await gs2;
  assert.equal(stat.levelId, 'salad-days');
  assert.ok(stat.grid.length > 0);

  const state = await waitFor(sib, 'state');
  assert.equal(state.players.length, 2);
  assert.ok(state.t > 0);

  // a tap moves the chef
  const me = state.players.find((p) => p.id === 'u-sib');
  tyler.emit('tap', { x: 1, y: 1 });
  sib.emit('tap', { x: 3, y: 2 });
  await new Promise((r) => setTimeout(r, 600));
  const later = await waitFor(sib, 'state');
  const meLater = later.players.find((p) => p.id === 'u-sib');
  assert.ok(Math.abs(meLater.x - me.x) > 0.01 || Math.abs(meLater.y - me.y) > 0.01, 'chef moved');

  // fast-forward to the end of the round (register listeners first —
  // game_over and the post-game lobby broadcast arrive back-to-back)
  const rooms = require('../server/rooms');
  const room = rooms.getRoom(code);
  const overP = waitFor(sib, 'game_over');
  const postLobbyP = waitFor(tyler, 'lobby');
  room.game.score = 999; // enough for 3 stars on level 1
  room.game.timeLeft = 0.2;
  const over = await overP;
  assert.equal(over.stars, 3);
  assert.equal(over.levelId, 'salad-days');

  // persistence: crew progress + unlocks + player stats
  const crew = store.getCrew(code);
  assert.equal(crew.progress['salad-days'].stars, 3);
  assert.ok(crew.members['u-sib']);

  const postLobby = await postLobbyP;
  const unlocked = postLobby.levels.filter((l) => l.unlocked).map((l) => l.id);
  assert.ok(unlocked.includes('burger-bay'), 'level 2 unlocked after starring level 1');

  const prof = store.getPlayer('u-tyler');
  assert.equal(prof.stats.levelsPlayed, 1);
  assert.equal(prof.stats.starsEarned, 3);

  // reconnect memory: drop and rejoin, progress still there
  sib.disconnect();
  const sib2 = await connect(port);
  const j3 = await emitAck(sib2, 'join', { code, profile: pSib });
  assert.ok(j3.ok);
  assert.equal(j3.lobby.levels.find((l) => l.id === 'salad-days').stars, 3);

  tyler.disconnect();
  sib2.disconnect();
  await new Promise((res) => io.close(res));
  store.flushAll();
});

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
const rooms = require('../server/rooms');

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

function waitForWhere(sock, event, predicate, timeoutMs = 8000) {
  return new Promise((resolve, reject) => {
    const t = setTimeout(() => {
      sock.off(event, onEvent);
      reject(new Error(`timeout waiting for ${event}`));
    }, timeoutMs);
    function onEvent(data) {
      if (!predicate(data)) return;
      clearTimeout(t);
      sock.off(event, onEvent);
      resolve(data);
    }
    sock.on(event, onEvent);
  });
}

test('two players: create, join, play a round, progress persists', async () => {
  await new Promise((res) => server.listen(0, res));
  const port = server.address().port;

  const tyler = await connect(port);
  const sib = await connect(port);
  const pTyler = { id: 'u-tyler', name: 'Tyler', avatar: '🧑‍🍳', chef: 'dolly' };
  const pSib = { id: 'u-sib', name: 'Megan', avatar: '🦊', chef: 'kid' };

  // profiles register
  const hello = await emitAck(tyler, 'hello', pTyler);
  assert.ok(hello.ok);
  assert.equal(hello.player.name, 'Tyler');
  assert.equal(hello.player.chef, 'dolly');

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

  const lobbyUpdate = waitForWhere(tyler, 'lobby', (state) => state.players.length === 2);
  const j2 = await emitAck(sib, 'join', { code: code.toLowerCase(), profile: pSib });
  assert.ok(j2.ok, 'codes are case-insensitive');
  const lob = await lobbyUpdate;
  assert.equal(lob.players.length, 2);
  assert.equal(lob.players.find((p) => p.id === 'u-sib').chef, 'kid');

  // bad code is rejected
  const bad = await emitAck(sib, 'join', { code: 'ZZZZ', profile: pSib });
  assert.ok(bad.error);
  // (that join attempt didn't kick them; rejoin to be safe)
  await emitAck(sib, 'join', { code, profile: pSib });

  // non-host cannot start
  const denied = await emitAck(sib, 'start_game', 'salad-days');
  assert.ok(denied.error);

  // anyone can queue music for the next level
  const firstQueuedP = waitFor(sib, 'radio');
  tyler.emit('radio', {
    action: 'enqueue',
    track: { videoId: 'dQw4w9WgXcQ', title: 'Song A', channel: 'DJ Test', duration: '3:33' },
  });
  const firstQueued = await firstQueuedP;
  assert.equal(firstQueued.queue.length, 1);
  assert.equal(firstQueued.queue[0].requestedBy, 'Tyler');

  const secondQueuedP = waitFor(tyler, 'radio');
  sib.emit('radio', {
    action: 'enqueue',
    track: { videoId: '9bZkp7q19f0', title: 'Song B', channel: 'DJ Test', duration: '4:12' },
  });
  const secondQueued = await secondQueuedP;
  assert.equal(secondQueued.queue.length, 2);
  assert.equal(secondQueued.queue[1].requestedBy, 'Megan');

  // host starts; both receive game_start and state ticks
  const gs1 = waitFor(tyler, 'game_start');
  const gs2 = waitFor(sib, 'game_start');
  const musicStartP = waitForWhere(tyler, 'radio', (p) => !!p.radio);
  const started = await emitAck(tyler, 'start_game', 'salad-days');
  assert.ok(started.ok, JSON.stringify(started));
  const stat = await gs1;
  await gs2;
  assert.equal(stat.levelId, 'salad-days');
  assert.ok(stat.grid.length > 0);

  // the round kicks off the music queue in order
  const musicStart = await musicStartP;
  assert.equal(musicStart.radio.videoId, 'dQw4w9WgXcQ');
  assert.equal(musicStart.queue.length, 1);

  const state = await waitFor(sib, 'state');
  assert.equal(state.players.length, 2);
  assert.equal(state.players.find((p) => p.id === 'u-tyler').chef, 'dolly');
  assert.ok(state.t > 0);

  // when the current track ends, the room advances to the next queued song
  const musicNextP = waitForWhere(tyler, 'radio', (p) => !!p.radio);
  sib.emit('radio', { action: 'ended', videoId: 'dQw4w9WgXcQ' });
  const musicNext = await musicNextP;
  assert.equal(musicNext.radio.videoId, '9bZkp7q19f0');
  assert.equal(musicNext.queue.length, 0);

  // a tap moves the chef
  const me = state.players.find((p) => p.id === 'u-sib');
  tyler.emit('tap', { x: 1, y: 1 });
  sib.emit('tap', { x: 3, y: 2 });
  await new Promise((r) => setTimeout(r, 600));
  const later = await waitFor(sib, 'state');
  const meLater = later.players.find((p) => p.id === 'u-sib');
  assert.ok(Math.abs(meLater.x - me.x) > 0.01 || Math.abs(meLater.y - me.y) > 0.01, 'chef moved');

  // any chef can pause and resume, with attribution
  sib.emit('pause', true);
  let st = await waitFor(sib, 'state');
  for (let i = 0; i < 30 && !st.paused; i++) st = await waitFor(sib, 'state');
  assert.ok(st.paused, 'non-host can pause');
  assert.equal(st.pausedBy, 'Megan');
  tyler.emit('pause', false);
  let st2 = await waitFor(tyler, 'state');
  for (let i = 0; i < 30 && st2.paused; i++) st2 = await waitFor(tyler, 'state');
  assert.ok(!st2.paused, 'anyone can resume');

  // any chef can restart the active level from the pause menu
  const room = rooms.getRoom(code);
  room.game.score = 321;
  sib.emit('pause', true);
  let paused = await waitFor(sib, 'state');
  for (let i = 0; i < 30 && !paused.paused; i++) paused = await waitFor(sib, 'state');
  const restartTyler = waitFor(tyler, 'game_start');
  const restartSib = waitFor(sib, 'game_start');
  const radioResetP = waitForWhere(tyler, 'radio', (p) => p.radio === null);
  const restart = await emitAck(sib, 'restart_level');
  assert.ok(restart.ok, JSON.stringify(restart));
  const restarted = await restartTyler;
  await restartSib;
  assert.equal(restarted.levelId, 'salad-days');
  // a fresh round with an empty queue silences the radio
  const radioReset = await radioResetP;
  assert.equal(radioReset.radio, null);
  assert.equal(radioReset.queue.length, 0);

  // queueing mid-round with nothing playing starts the song immediately
  const musicMidRoundP = waitForWhere(tyler, 'radio', (p) => !!p.radio);
  sib.emit('radio', {
    action: 'enqueue',
    track: { videoId: 'kJQP7kiw5Fk', title: 'Song C', channel: 'DJ Test', duration: '4:41' },
  });
  const musicMidRound = await musicMidRoundP;
  assert.equal(musicMidRound.radio.videoId, 'kJQP7kiw5Fk');
  let resetState = await waitFor(tyler, 'state');
  for (let i = 0; i < 30 && resetState.score !== 0; i++) resetState = await waitFor(tyler, 'state');
  assert.equal(resetState.score, 0, 'restart clears the old score');
  assert.equal(resetState.paused, false, 'restart starts a fresh unpaused round');
  assert.equal(store.getPlayer('u-tyler').stats.levelsPlayed, 0, 'restart does not record progress');

  // fast-forward to the end of the round (register listeners first —
  // game_over and the post-game lobby broadcast arrive back-to-back)
  const overP = waitFor(sib, 'game_over');
  const postLobbyP = waitFor(tyler, 'lobby');
  const musicStopP = waitForWhere(tyler, 'radio', (p) => p.radio === null);
  room.game.score = 999; // enough for 3 stars on level 1
  room.game.timeLeft = 0.2;
  const over = await overP;
  assert.equal(over.stars, 3);
  assert.equal(over.levelId, 'salad-days');
  // the round ending stops the music
  const musicStop = await musicStopP;
  assert.equal(musicStop.radio, null);

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

  // join ack carries device backups
  assert.equal(j3.crew.code, code);
  assert.equal(j3.crew.progress['salad-days'].stars, 3);
  assert.equal(j3.player.stats.levelsPlayed, 1);

  // server data loss: a device backup restores a crew the server never saw
  const jRestore = await emitAck(sib2, 'join', {
    code: 'JJJJ',
    profile: pSib,
    crewBackup: {
      code: 'JJJJ', hostId: 'u-sib',
      members: { 'u-sib': { name: 'Megan', avatar: '🦊' } },
      progress: { 'salad-days': { stars: 2, bestScore: 500, plays: 4 } },
    },
  });
  assert.ok(jRestore.ok, 'backup restores lost crew');
  assert.equal(jRestore.lobby.levels.find((l) => l.id === 'salad-days').stars, 2);
  assert.ok(jRestore.lobby.levels.find((l) => l.id === 'burger-bay').unlocked);

  tyler.disconnect();
  sib2.disconnect();
  await new Promise((res) => io.close(res));
  store.flushAll();
});

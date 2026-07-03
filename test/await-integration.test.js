// End-to-end over a real socket: tapping a mid-chop board registers a wait
// and the chopped item lands in the player's hands automatically — the full
// client→rooms→game pipeline, exactly as a phone would drive it.
const test = require('node:test');
const assert = require('node:assert/strict');
const fs = require('fs');
const os = require('os');
const path = require('path');

process.env.DATA_DIR = fs.mkdtempSync(path.join(os.tmpdir(), 'ks-await-itest-'));

const { io: Client } = require('socket.io-client');
const { server } = require('../server/index');

function connect(port) {
  return new Promise((resolve, reject) => {
    const sock = Client(`http://127.0.0.1:${port}`, { transports: ['websocket'] });
    sock.on('connect', () => resolve(sock));
    sock.on('connect_error', reject);
  });
}
const emitAck = (sock, event, payload) => new Promise((res) => sock.emit(event, payload, res));

function waitForState(sock, predicate, label, timeoutMs = 15000) {
  return new Promise((resolve, reject) => {
    const t = setTimeout(() => {
      sock.off('state', onState);
      reject(new Error(`timeout waiting for state: ${label}`));
    }, timeoutMs);
    function onState(st) {
      if (!predicate(st)) return;
      clearTimeout(t);
      sock.off('state', onState);
      resolve(st);
    }
    sock.on('state', onState);
  });
}


// Rounds open with the 3·2·1 countdown now — wait for 'playing' before taps.
const awaitPlaying = (sock) => waitForState(sock, (st) => st.phase === 'playing', 'countdown done');

test('socket round-trip: tap mid-chop board → waits → auto-picks the chopped item', async () => {
  await new Promise((res) => server.listen(0, res));
  const port = server.address().port;

  const me = { id: 'u-waiter', name: 'Waiter', avatar: '🧑‍🍳', chef: 'chef' };
  const sock = await connect(port);
  await emitAck(sock, 'hello', me);
  const created = await emitAck(sock, 'create_crew', me);
  assert.ok(created.ok);
  await emitAck(sock, 'join', { code: created.code, profile: me });

  const started = await emitAck(sock, 'start_game', 'salad-days');
  assert.ok(started.ok, JSON.stringify(started));
  await awaitPlaying(sock);

  // salad-days top row: lettuce crate at (1,0), cutting board at (2,0)
  const mine = (st) => st.players.find((p) => p.id === me.id);

  sock.emit('tap', { x: 1, y: 0 });                     // walk to the crate, grab lettuce
  await waitForState(sock, (st) => {
    const c = mine(st).carry;
    return c && c.id === 'lettuce' && c.state === 'raw';
  }, 'carrying raw lettuce');

  sock.emit('tap', { x: 2, y: 0 });                     // place on the board → chop starts
  await waitForState(sock, (st) => {
    const b = st.stations['2,0'];
    return b && b.item && b.item.id === 'lettuce' && !mine(st).carry;
  }, 'lettuce chopping on the board');

  // tap the busy board: must NOT decline — a ⏳ waiting cue fires instead
  sock.emit('tap', { x: 2, y: 0 });
  await waitForState(sock, (st) =>
    (st.events || []).some((e) => e.type === 'waiting' && e.playerId === me.id),
  'waiting cue');

  // ...and the moment chopping completes, the item lands in their hands
  const done = await waitForState(sock, (st) => {
    const c = mine(st).carry;
    return c && c.id === 'lettuce' && c.state === 'chopped';
  }, 'auto-picked the chopped lettuce');
  assert.ok(!done.stations['2,0'] || !done.stations['2,0'].item, 'board is empty again');

  sock.close();
  await new Promise((res) => server.close(res));
});

test('a waiter who exits the round never ghost-grabs — the item stays for the crew', async () => {
  await new Promise((res) => server.listen(0, res));
  const port = server.address().port;

  const pa = { id: 'u-ghost', name: 'Ghost', avatar: '👻', chef: 'chef' };
  const pb = { id: 'u-stay', name: 'Stayer', avatar: '🦊', chef: 'chef' };
  const a = await connect(port);
  const b = await connect(port);
  await emitAck(a, 'hello', pa);
  await emitAck(b, 'hello', pb);
  const created = await emitAck(a, 'create_crew', pa);
  await emitAck(a, 'join', { code: created.code, profile: pa });
  await emitAck(b, 'join', { code: created.code, profile: pb });
  const started = await emitAck(a, 'start_game', 'salad-days');
  assert.ok(started.ok, JSON.stringify(started));
  await awaitPlaying(a);

  const player = (st, id) => st.players.find((p) => p.id === id);

  a.emit('tap', { x: 1, y: 0 });                        // A grabs lettuce
  await waitForState(a, (st) => {
    const c = player(st, pa.id).carry;
    return c && c.id === 'lettuce';
  }, 'A carrying lettuce');
  a.emit('tap', { x: 2, y: 0 });                        // A places on the board
  await waitForState(a, (st) => st.stations['2,0'] && st.stations['2,0'].item && !player(st, pa.id).carry,
    'lettuce chopping');
  a.emit('tap', { x: 2, y: 0 });                        // A registers a wait…
  await waitForState(a, (st) => (st.events || []).some((e) => e.type === 'waiting' && e.playerId === pa.id),
    'A waiting');
  a.emit('exit_round');                                 // …then bails to the lobby

  // chop completes for the remaining crew: the item must stay on the board,
  // NOT vanish into the absent chef's hands
  const done = await waitForState(b, (st) => {
    const bd = st.stations['2,0'];
    return bd && bd.item && bd.item.state === 'chopped';
  }, 'lettuce chopped and still on the board');
  assert.equal(player(done, pa.id).carry, null, 'ghost never received the item');

  // and the stayer can pick it up like normal
  b.emit('tap', { x: 2, y: 0 });
  await waitForState(b, (st) => {
    const c = player(st, pb.id).carry;
    return c && c.id === 'lettuce' && c.state === 'chopped';
  }, 'B picked up the chopped lettuce');

  a.close(); b.close();
  await new Promise((res) => server.close(res));
});

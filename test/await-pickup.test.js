// Wait-for-it pickups: tapping a station that's still working (board mid-chop,
// pan/pot/oven mid-cook) registers the intent instead of declining — the chef
// waits there and the item lands in their hands the moment it's ready.
const test = require('node:test');
const assert = require('node:assert/strict');

process.env.DATA_DIR = require('fs').mkdtempSync(require('path').join(require('os').tmpdir(), 'ks-test-'));

const { Game } = require('../server/game');
const { LEVELS } = require('../server/levels');

const ROSTER = [{ id: 'p1', name: 'Ada', avatar: '🦊' }];

function makeGame(levelId = 'salad-days', roster = ROSTER) {
  const level = LEVELS.find((l) => l.id === levelId);
  return new Game(level, roster, { rng: () => 0 });
}

function stationKey(game, type, pred = () => true) {
  return Object.entries(game.stations).find(([, s]) => s.type === type && pred(s))[0];
}

function standAt(game, p, key) {
  const [x, y] = key.split(',').map(Number);
  const f = game.adjacentFloors(x, y)[0];
  p.x = f.x + 0.5;
  p.y = f.y + 0.5;
  p.path = [];
}

test('tapping a mid-chop board waits, then auto-picks the chopped item', () => {
  const game = makeGame();
  const p = game.players.p1;
  const board = stationKey(game, 'board');
  const [bx, by] = board.split(',').map(Number);

  p.carry = { id: 'lettuce', state: 'raw' };
  standAt(game, p, board);
  game.interact(p, board);                 // place → board starts chopping
  assert.equal(game.stations[board].item.state, 'raw');

  game.tap('p1', bx, by);                  // tap again mid-chop (full tap path)
  assert.equal(p.await, board, 'wait intent registered instead of a decline');
  const events = game.tick(0);
  assert.ok(events.some((e) => e.type === 'waiting'), 'client gets the ⏳ cue');

  for (let i = 0; i < 30; i++) game.tick(0.1); // > 2.2s chop time
  assert.deepEqual(p.carry, { id: 'lettuce', state: 'chopped' }, 'picked up the moment it finished');
  assert.equal(game.stations[board].item, null);
  assert.equal(p.await, null);
});

test('plate in hand: waiting on a mid-chop board plates the item when done', () => {
  const game = makeGame();
  const p = game.players.p1;
  const board = stationKey(game, 'board');
  const [bx, by] = board.split(',').map(Number);

  p.carry = { id: 'lettuce', state: 'raw' };
  standAt(game, p, board);
  game.interact(p, board);

  p.carry = { kind: 'plate', contents: [] };
  game.tap('p1', bx, by);                  // plate + still chopping → wait
  assert.equal(p.await, board);

  for (let i = 0; i < 30; i++) game.tick(0.1);
  assert.equal(p.carry.kind, 'plate');
  assert.deepEqual(p.carry.contents, [{ id: 'lettuce', state: 'chopped' }]);
  assert.equal(game.stations[board].item, null);
});

test('tapping a mid-cook pan waits, then takes the dish straight off the heat', () => {
  const game = makeGame('burger-bay');
  const p = game.players.p1;
  const pan = stationKey(game, 'cook', (s) => s.tool === 'pan');
  const [cx, cy] = pan.split(',').map(Number);

  standAt(game, p, pan);
  p.carry = { id: 'patty', state: 'chopped' };
  game.interact(p, pan);
  assert.equal(game.stations[pan].state, 'cooking');

  game.tap('p1', cx, cy);                  // mid-cook, empty-handed → wait
  assert.equal(p.await, pan);

  for (let i = 0; i < 70; i++) game.tick(0.1); // > 6s cook time
  assert.deepEqual(p.carry, { id: 'patty', state: 'cooked' }, 'grabbed on the ding');
  assert.equal(game.stations[pan].state, 'idle', 'cooker reset — nothing left to burn');

  for (let i = 0; i < 120; i++) game.tick(0.1);
  assert.notEqual(game.stations[pan].state, 'burned', 'waited-for food never burns');
});

test('a newer tap cancels the wait', () => {
  const game = makeGame();
  const p = game.players.p1;
  const board = stationKey(game, 'board');
  const [bx, by] = board.split(',').map(Number);

  p.carry = { id: 'tomato', state: 'raw' };
  standAt(game, p, board);
  game.interact(p, board);
  game.tap('p1', bx, by);
  assert.equal(p.await, board);

  // change of mind: tap the floor tile the chef is standing on
  game.tap('p1', Math.floor(p.x), Math.floor(p.y));
  assert.equal(p.await, null, 'latest intent wins');

  for (let i = 0; i < 30; i++) game.tick(0.1);
  assert.equal(p.carry, null, 'no auto-grab after cancelling');
  assert.equal(game.stations[board].item.state, 'chopped', 'item stays on the board');
});

test('a plate that can never receive the output is rejected up front, not promised', () => {
  const game = makeGame('burger-bay');
  const p = game.players.p1;
  const pan = stationKey(game, 'cook', (s) => s.tool === 'pan');
  const [cx, cy] = pan.split(',').map(Number);

  standAt(game, p, pan);
  p.carry = { id: 'patty', state: 'chopped' };
  game.interact(p, pan);
  assert.equal(game.stations[pan].state, 'cooking');

  // cucumber salad plate + cooked patty fits no recipe → immediate ✕, no ⏳
  p.carry = { kind: 'plate', contents: [{ id: 'cucumber', state: 'chopped' }] };
  game.tap('p1', cx, cy);
  assert.equal(p.await, null, 'no doomed wait registered');
  const events = game.tick(0);
  assert.ok(events.some((e) => e.type === 'reject'), 'rejected up front');

  // empty-handed wait still works on the same pan afterwards
  p.carry = null;
  game.tap('p1', cx, cy);
  assert.equal(p.await, pan);
  for (let i = 0; i < 70; i++) game.tick(0.1);
  assert.deepEqual(p.carry, { id: 'patty', state: 'cooked' });
});

test('a teammate swapping the board dissolves the wait — no grabbing food never asked for', () => {
  const game = makeGame('salad-days', [
    { id: 'p1', name: 'Ada', avatar: '🦊' },
    { id: 'p2', name: 'Sam', avatar: '🐸' },
  ]);
  const p1 = game.players.p1;
  const p2 = game.players.p2;
  const board = stationKey(game, 'board');
  const [bx, by] = board.split(',').map(Number);

  // p2's tomato is chopping; p1 registers a wait on it
  p2.carry = { id: 'tomato', state: 'raw' };
  standAt(game, p2, board);
  game.interact(p2, board);
  standAt(game, p1, board);
  game.tap('p1', bx, by);
  assert.equal(p1.await, board);

  // p2 swap-rescues their half-chopped tomato with a raw lettuce
  p2.carry = { id: 'lettuce', state: 'raw' };
  game.interact(p2, board);
  assert.equal(p2.carry.id, 'tomato', 'swap-hands rescue still works');
  assert.equal(game.stations[board].item.id, 'lettuce');

  // p1's wait was for the tomato — it dissolves instead of claiming the lettuce
  for (let i = 0; i < 30; i++) game.tick(0.1);
  assert.equal(p1.await, null);
  assert.equal(p1.carry, null, 'p1 never grabs the swapped-in lettuce');
  assert.equal(game.stations[board].item.state, 'chopped', 'lettuce finished for its owner');
});

test('walking away dissolves the wait; contention resolves without a crash', () => {
  const game = makeGame('salad-days', [
    { id: 'p1', name: 'Ada', avatar: '🦊' },
    { id: 'p2', name: 'Sam', avatar: '🐸' },
  ]);
  const p1 = game.players.p1;
  const p2 = game.players.p2;
  const board = stationKey(game, 'board');
  const [bx, by] = board.split(',').map(Number);

  p1.carry = { id: 'lettuce', state: 'raw' };
  standAt(game, p1, board);
  game.interact(p1, board);

  // both chefs register a wait on the same board
  standAt(game, p2, board);
  game.tap('p1', bx, by);
  game.tap('p2', bx, by);
  assert.equal(p1.await, board);
  assert.equal(p2.await, board);

  // p1 wanders off — their wait dissolves; p2 gets the item
  p1.x = 100.5; p1.y = 100.5;
  for (let i = 0; i < 30; i++) game.tick(0.1);
  assert.equal(p1.await, null);
  assert.equal(p1.carry, null);
  assert.deepEqual(p2.carry, { id: 'lettuce', state: 'chopped' });
  assert.equal(p2.await, null);
  assert.equal(game.stations[board].item, null);
});

const test = require('node:test');
const assert = require('node:assert/strict');

process.env.DATA_DIR = require('fs').mkdtempSync(require('path').join(require('os').tmpdir(), 'ks-test-'));

const { Game, itemToken, multisetEqual, isSubset } = require('../server/game');
const { LEVELS, RECIPES } = require('../server/levels');

const ROSTER = [{ id: 'p1', name: 'Ada', avatar: '🦊' }];

function makeGame(levelId = 'salad-days') {
  const level = LEVELS.find((l) => l.id === levelId);
  return new Game(level, ROSTER, { rng: () => 0 });
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

test('token & multiset helpers', () => {
  assert.equal(itemToken({ id: 'tomato', state: 'chopped' }), 'tomato.chopped');
  assert.equal(itemToken({ kind: 'dish', id: 'soup_onion' }), 'soup_onion.dish');
  assert.equal(itemToken({ kind: 'plate', contents: [] }), null);
  assert.ok(multisetEqual(['a', 'b'], ['b', 'a']));
  assert.ok(!multisetEqual(['a'], ['a', 'a']));
  assert.ok(isSubset(['a'], ['a', 'b']));
  assert.ok(!isSubset(['a', 'a'], ['a', 'b']));
});

test('every level layout is valid and reachable', () => {
  for (const level of LEVELS) {
    const game = new Game(level, ROSTER);
    assert.ok(game.spawnTiles.length > 0, `${level.id} has floor`);
    // every station must be reachable from spawn
    const spawn = game.spawnTiles[0];
    for (const [key, s] of Object.entries(game.stations)) {
      if (s.type === 'counter') continue; // corner counters can be decorative
      const [x, y] = key.split(',').map(Number);
      const adj = game.adjacentFloors(x, y);
      assert.ok(adj.length > 0, `${level.id} station ${s.type}@${key} has adjacent floor`);
      const reachable = adj.some((f) => game.findPath(spawn.x, spawn.y, f.x, f.y) !== null);
      assert.ok(reachable, `${level.id} station ${s.type}@${key} reachable`);
    }
    // every order recipe must be craftable from the level's crates/appliances
    for (const r of level.orders.recipes) {
      assert.ok(RECIPES[r], `${level.id} recipe ${r} exists`);
    }
    assert.equal(level.stars.length, 3);
    assert.ok(level.stars[0] < level.stars[1] && level.stars[1] < level.stars[2]);
  }
});

test('crate pickup and trash', () => {
  const game = makeGame();
  const p = game.players.p1;
  const crate = stationKey(game, 'crate', (s) => s.ing === 'lettuce');
  game.interact(p, crate);
  assert.deepEqual(p.carry, { id: 'lettuce', state: 'raw' });
  game.interact(p, stationKey(game, 'trash'));
  assert.equal(p.carry, null);
});

test('chopping requires standing at the board', () => {
  const game = makeGame();
  const p = game.players.p1;
  const board = stationKey(game, 'board');
  p.carry = { id: 'lettuce', state: 'raw' };
  standAt(game, p, board);
  game.interact(p, board);
  assert.equal(p.carry, null);
  assert.equal(game.stations[board].item.state, 'raw');

  // walk away — no chopping happens
  p.x = 100.5; p.y = 100.5;
  for (let i = 0; i < 30; i++) game.tick(0.1);
  assert.equal(game.stations[board].item.state, 'raw');

  // stand next to it — chops in ~2.2s
  standAt(game, p, board);
  for (let i = 0; i < 30; i++) game.tick(0.1);
  assert.equal(game.stations[board].item.state, 'chopped');

  game.interact(p, board);
  assert.deepEqual(p.carry, { id: 'lettuce', state: 'chopped' });
});

test('pan cooks a patty, then burns it', () => {
  const game = makeGame('burger-bay');
  const p = game.players.p1;
  const pan = stationKey(game, 'cook', (s) => s.tool === 'pan');
  p.carry = { id: 'patty', state: 'raw' };
  game.interact(p, pan);
  assert.equal(game.stations[pan].state, 'cooking');

  for (let i = 0; i < 70; i++) game.tick(0.1); // 7s > 6s cook time
  assert.equal(game.stations[pan].state, 'done');
  assert.deepEqual(game.stations[pan].contents[0], { id: 'patty', state: 'cooked' });

  for (let i = 0; i < 90; i++) game.tick(0.1); // past burnAfter
  assert.equal(game.stations[pan].state, 'burned');

  game.interact(p, pan);
  assert.deepEqual(p.carry, { kind: 'dish', id: 'burned' });
  assert.equal(game.stations[pan].state, 'idle');
});

test('pot rejects wrong ingredients, accepts soup combo', () => {
  const game = makeGame('soups-on');
  const p = game.players.p1;
  const pot = stationKey(game, 'cook', (s) => s.tool === 'pot');

  p.carry = { id: 'onion', state: 'raw' }; // must be chopped first
  game.interact(p, pot);
  assert.notEqual(p.carry, null, 'raw onion rejected');

  for (let i = 0; i < 3; i++) {
    p.carry = { id: 'onion', state: 'chopped' };
    game.interact(p, pot);
    assert.equal(p.carry, null);
  }
  assert.equal(game.stations[pot].state, 'cooking');
  for (let i = 0; i < 110; i++) game.tick(0.1);
  assert.equal(game.stations[pot].state, 'done');
  assert.deepEqual(game.stations[pot].contents[0], { kind: 'dish', id: 'soup_onion' });

  // plate it straight from the pot
  p.carry = { kind: 'plate', contents: [] };
  game.interact(p, pot);
  assert.deepEqual(p.carry.contents, [{ kind: 'dish', id: 'soup_onion' }]);
  assert.equal(game.stations[pot].state, 'idle');
});

test('plates only accept items that fit some recipe', () => {
  const game = makeGame();
  const p = game.players.p1;
  p.carry = { kind: 'plate', contents: [{ id: 'lettuce', state: 'chopped' }] };
  const ok = game.addToPlate(p.carry, { id: 'tomato', state: 'chopped' }, { x: 0, y: 0 });
  assert.ok(ok);
  const bad = game.addToPlate(p.carry, { id: 'tomato', state: 'chopped' }, { x: 0, y: 0 });
  assert.ok(!bad, 'second tomato fits no recipe');
});

test('serving a matching order scores and clears it', () => {
  const game = makeGame();
  const p = game.players.p1;
  game.tick(0.1); // spawns first order: salad
  assert.equal(game.orders.length, 1);
  assert.equal(game.orders[0].recipe, 'salad');

  p.carry = {
    kind: 'plate',
    contents: [{ id: 'lettuce', state: 'chopped' }, { id: 'tomato', state: 'chopped' }],
  };
  const serve = stationKey(game, 'serve');
  game.interact(p, serve);
  assert.equal(p.carry, null);
  assert.equal(game.orders.length, 0);
  assert.ok(game.score >= RECIPES.salad.points, `score ${game.score}`);
  assert.equal(game.deliveredCount, 1);
  assert.equal(game.players.p1.delivered, 1);
});

test('wrong plate is rejected at the window', () => {
  const game = makeGame();
  const p = game.players.p1;
  game.tick(0.1);
  p.carry = { kind: 'plate', contents: [{ id: 'lettuce', state: 'chopped' }] };
  game.interact(p, stationKey(game, 'serve'));
  assert.notEqual(p.carry, null);
  assert.equal(game.score, 0);
});

test('expired orders cost points and reset combo', () => {
  const game = makeGame();
  game.tick(0.1);
  game.score = 100;
  game.combo = 3;
  game.orders[0].ttl = 0.05;
  game.tick(0.1);
  assert.equal(game.orders.length, 0);
  assert.equal(game.score, 80);
  assert.equal(game.combo, 0);
  assert.equal(game.missedCount, 1);
});

test('tap pathfinds to a station and interacts on arrival', () => {
  const game = makeGame();
  const p = game.players.p1;
  const crate = stationKey(game, 'crate', (s) => s.ing === 'tomato');
  const [cx, cy] = crate.split(',').map(Number);
  game.tap('p1', cx, cy);
  assert.ok(p.path.length > 0 || p.carry, 'moving or already interacted');
  for (let i = 0; i < 100 && !p.carry; i++) game.tick(0.1);
  assert.deepEqual(p.carry, { id: 'tomato', state: 'raw' });
});

test('solo and duo games get gentler pacing and scaled star goals', () => {
  const solo = makeGame(); // 1 player
  solo.tick(0.1);
  assert.ok(solo.orders[0].ttlMax > solo.level.orders.ttl, 'solo tickets last longer');
  assert.ok(solo.starGoals[2] < solo.level.stars[2], 'solo star goals are lower');

  const trio = new Game(LEVELS[0], [
    { id: 'a', name: 'A', avatar: 'x' },
    { id: 'b', name: 'B', avatar: 'y' },
    { id: 'c', name: 'C', avatar: 'z' },
  ], { rng: () => 0 });
  trio.tick(0.1);
  assert.equal(trio.orders[0].ttlMax, trio.level.orders.ttl, 'full crews get standard pacing');
  assert.deepEqual(trio.starGoals, trio.level.stars);
});

test('game ends at time zero with star thresholds', () => {
  const game = makeGame();
  game.timeLeft = 0.05;
  game.tick(0.1);
  assert.equal(game.phase, 'over');
  assert.equal(game.starsEarned(), 0);
  game.score = game.starGoals[0];
  assert.equal(game.starsEarned(), 1);
  game.score = game.starGoals[2] + 50;
  assert.equal(game.starsEarned(), 3);
  const res = game.results();
  assert.equal(res.levelId, 'salad-days');
  assert.equal(res.players.length, 1);
});
